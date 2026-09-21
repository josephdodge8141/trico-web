import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { chromium } from '@playwright/test';

import {
  analyzePixelBuffers,
  applyState,
  groupVisualFindings,
  inspectVisualRegion,
  isReportableSubstitution,
  rgbToHex,
  semanticColorRole,
  type PixelAuditInput,
  type VisualFinding,
} from './visual-audit.js';

const fixtureCapture = {
  id: 'fixture',
  file: 'fixture.jpg',
  sha256: '0'.repeat(64),
  route: '/',
  state: 'page',
  viewport: { width: 100, height: 100, class: 'desktop' as const },
  tile: { x: 0, y: 0, width: 100, height: 100 },
  masks: [],
  regions: [],
  intentionalCorrectionIds: [],
};

function pixels(
  width: number,
  height: number,
  color: readonly [number, number, number],
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < result.length; offset += 4) {
    result[offset] = color[0];
    result[offset + 1] = color[1];
    result[offset + 2] = color[2];
    result[offset + 3] = 255;
  }
  return result;
}

function input(
  reference: Uint8ClampedArray,
  candidate: Uint8ClampedArray,
  width: number,
  height: number,
  overrides: Partial<PixelAuditInput> = {},
): PixelAuditInput {
  return {
    width,
    height,
    reference,
    candidate,
    offsetY: 0,
    masks: [],
    deltaThreshold: 4,
    geometryRadius: 2,
    cellSize: 2,
    ...overrides,
  };
}

test('reports a broad gold to blue substitution as color evidence', () => {
  const reference = pixels(8, 8, [0, 18, 138]);
  const candidate = pixels(8, 8, [134, 98, 45]);
  const result = analyzePixelBuffers(input(reference, candidate, 8, 8));

  assert.equal(result.comparedPixels, 64);
  assert.equal(result.changedPixels, 64);
  assert.equal(result.geometryPixels, 0);
  assert.equal(result.regions[0]?.type, 'color');
  assert.equal(result.substitutions[0]?.reference, '#00128a');
  assert.equal(result.substitutions[0]?.candidate, '#86622d');
  assert.equal(result.substitutions[0]?.pixels, 64);
});

test('uses the dominant changed color pair instead of the region center pixel', () => {
  const reference = pixels(8, 8, [0, 18, 138]);
  const candidate = pixels(8, 8, [134, 98, 45]);
  for (let y = 3; y < 5; y += 1)
    for (let x = 3; x < 5; x += 1) candidate.set([21, 128, 61, 255], (y * 8 + x) * 4);

  const result = analyzePixelBuffers(
    input(reference, candidate, 8, 8, { cellSize: 8, geometryRadius: 0 }),
  );

  assert.equal(result.regions[0]?.referenceColor, '#001090');
  assert.equal(result.regions[0]?.candidateColor, '#806030');
  assert.equal(result.regions[0]?.candidateRole, 'gold');
});

test('preserves exact colors while suppressing same-role substitutions from reports', () => {
  const substitution = {
    reference: '#00128a',
    candidate: '#061892',
    referenceRole: 'brand-blue',
    candidateRole: 'brand-blue',
    pixels: 20,
    deltaE: 5,
  } as const;

  assert.equal(substitution.referenceRole, 'brand-blue');
  assert.equal(substitution.candidateRole, 'brand-blue');
  assert.equal(semanticColorRole([0, 18, 138]), 'brand-blue');
  assert.equal(semanticColorRole([6, 24, 146]), 'brand-blue');
  assert.equal(isReportableSubstitution(substitution), false);
  assert.notEqual(substitution.reference, substitution.candidate);
});

test('classifies a small translated feature as geometry rather than a replacement color', () => {
  const reference = pixels(10, 6, [255, 255, 255]);
  const candidate = pixels(10, 6, [255, 255, 255]);
  for (let y = 1; y < 5; y += 1) {
    for (let x = 2; x < 5; x += 1) {
      const referenceOffset = (y * 10 + x) * 4;
      const candidateOffset = (y * 10 + x + 1) * 4;
      reference.set([0, 18, 138, 255], referenceOffset);
      candidate.set([0, 18, 138, 255], candidateOffset);
    }
  }
  const result = analyzePixelBuffers(input(reference, candidate, 10, 6));

  assert.ok(result.geometryPixels > 0);
  assert.equal(
    result.regions.some(({ type }) => type === 'geometry'),
    true,
  );
});

test('pairs nearby inverse color regions as a displaced feature', () => {
  const reference = pixels(24, 8, [255, 255, 255]);
  const candidate = pixels(24, 8, [255, 255, 255]);
  for (let y = 2; y < 6; y += 1) {
    for (let x = 2; x < 6; x += 1) reference.set([0, 18, 138, 255], (y * 24 + x) * 4);
    for (let x = 14; x < 18; x += 1) candidate.set([0, 18, 138, 255], (y * 24 + x) * 4);
  }

  const result = analyzePixelBuffers(
    input(reference, candidate, 24, 8, { geometryRadius: 2, cellSize: 2 }),
  );

  assert.equal(result.regions.length, 2);
  assert.equal(
    result.regions.every(({ type }) => type === 'geometry'),
    true,
  );
});

test('suppresses imperceptible noise and honors explicit masks without losing thin strokes', () => {
  const reference = pixels(12, 8, [255, 255, 255]);
  const candidate = pixels(12, 8, [253, 253, 253]);
  for (let y = 0; y < 8; y += 1) {
    candidate.set([134, 98, 45, 255], (y * 12 + 7) * 4);
    candidate.set([0, 0, 0, 255], (y * 12 + 2) * 4);
  }
  const result = analyzePixelBuffers(
    input(reference, candidate, 12, 8, {
      masks: [{ id: 'approved', x: 2, y: 0, width: 1, height: 8 }],
    }),
  );

  assert.equal(result.maskedPixels, 8);
  assert.equal(result.changedPixels, 8);
  assert.equal(
    result.regions.some(({ x, width }) => x <= 7 && x + width > 7),
    true,
  );
});

test('groups repeated declarations into a deterministic shared root cause', () => {
  const findings: VisualFinding[] = [
    {
      id: 'later',
      severity: 'P1',
      route: '/storage',
      viewport: 'desktop',
      state: 'page',
      type: 'color',
      region: { x: 4, y: 8, width: 10, height: 5 },
      changedPixels: 40,
      verifiedPixels: 40,
      referenceColor: '#00128a',
      candidateColor: '#86622d',
      deltaE: 40,
      evidenceAvailable: true,
      element: {
        tag: 'a',
        text: 'Email',
        selector: '.footer a',
        rect: { x: 4, y: 8, width: 10, height: 5 },
      },
      attribution: {
        property: 'color',
        computedValue: 'rgb(134, 98, 45)',
        selector: '.ui-link',
        stylesheet: 'styles.css',
        sourceLine: 40,
        value: 'var(--trico-color-gold)',
        token: '--trico-color-gold',
        confidence: 'high',
        reason: 'Synthetic verified declaration.',
      },
    },
    {
      id: 'earlier',
      severity: 'P1',
      route: '/real-estate',
      viewport: 'desktop',
      state: 'page',
      type: 'color',
      region: { x: 1, y: 2, width: 10, height: 5 },
      changedPixels: 30,
      verifiedPixels: 30,
      referenceColor: '#00128a',
      candidateColor: '#86622d',
      deltaE: 40,
      evidenceAvailable: true,
      element: {
        tag: 'a',
        text: 'Email',
        selector: '.footer a',
        rect: { x: 1, y: 2, width: 10, height: 5 },
      },
      attribution: {
        property: 'color',
        computedValue: 'rgb(134, 98, 45)',
        selector: '.ui-link',
        stylesheet: 'styles.css',
        sourceLine: 40,
        value: 'var(--trico-color-gold)',
        token: '--trico-color-gold',
        confidence: 'high',
        reason: 'Synthetic verified declaration.',
      },
    },
  ];

  const groups = groupVisualFindings(findings);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0]?.routes, ['/real-estate', '/storage']);
  assert.deepEqual(groups[0]?.findingIds, ['earlier', 'later']);
  assert.equal(groups[0]?.changedPixels, 70);
  assert.equal(rgbToHex(0, 18, 138), '#00128a');
});

test('does not promote low-confidence findings into shared root causes', () => {
  const finding: VisualFinding = {
    id: 'low-confidence',
    severity: 'P0',
    route: '/',
    viewport: 'desktop',
    state: 'page',
    type: 'color',
    region: { x: 0, y: 0, width: 100, height: 100 },
    changedPixels: 10_000,
    verifiedPixels: 0,
    referenceColor: '#00128a',
    candidateColor: '#86622d',
    deltaE: 100,
    evidenceAvailable: false,
    attribution: {
      property: 'color',
      computedValue: 'rgb(134, 98, 45)',
      confidence: 'low',
      reason: 'No rendered property matched.',
    },
  };

  assert.deepEqual(groupVisualFindings([finding]), []);
});

test('does not promote displacement evidence into a color root cause', () => {
  const finding: VisualFinding = {
    id: 'displaced-text',
    severity: 'P1',
    route: '/construction',
    viewport: 'desktop',
    state: 'page',
    type: 'geometry',
    region: { x: 0, y: 0, width: 100, height: 30 },
    changedPixels: 3_000,
    verifiedPixels: 3_000,
    referenceColor: '#00128a',
    candidateColor: '#ffffff',
    deltaE: 100,
    evidenceAvailable: true,
    attribution: {
      property: 'color',
      computedValue: 'rgb(255, 255, 255)',
      confidence: 'high',
      reason: 'The candidate text color is real but the pixels moved.',
    },
  };

  assert.deepEqual(groupVisualFindings([finding]), []);
});

test('attributes a pseudo-element color to its variable-backed CSS rule', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<style>:root{--accent:#86622d}.target{position:relative;width:80px;height:80px}.target::before{content:"";position:absolute;inset:0;background-color:var(--accent)}</style><div class="target" aria-label="Accent tile"></div>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Fixture server has no port');
    const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
    await page.goto(`http://127.0.0.1:${String(address.port)}`);
    await page.evaluate('globalThis.__name = (target) => target');
    const result = await inspectVisualRegion(
      page,
      {
        x: 4,
        y: 4,
        width: 60,
        height: 60,
        changedPixels: 3_600,
        colorPixels: 3_600,
        geometryPixels: 0,
        type: 'color',
        referenceColor: '#00128a',
        candidateColor: '#86622d',
        deltaE: 40,
      },
      fixtureCapture,
    );

    assert.equal(result.element?.text, 'Accent tile');
    assert.equal(result.attribution?.property, 'background-color');
    assert.equal(result.attribution?.pseudo, '::before');
    assert.equal(result.attribution?.selector, '.target::before');
    assert.equal(result.attribution?.token, '--accent');
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
});

test('classifies image evidence without inherited CSS attribution', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<style>body{margin:0;color:#86622d}</style><img aria-label="Example image" width="80" height="80" alt="Example">',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Fixture server has no port');
    const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
    await page.goto(`http://127.0.0.1:${String(address.port)}`);
    await page.evaluate('globalThis.__name = (target) => target');
    const result = await inspectVisualRegion(
      page,
      {
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        changedPixels: 6_400,
        colorPixels: 6_400,
        geometryPixels: 0,
        type: 'color',
        referenceColor: '#00128a',
        candidateColor: '#86622d',
        deltaE: 100,
      },
      fixtureCapture,
    );

    assert.equal(result.element?.tag, 'img');
    assert.equal(result.attribution, undefined);
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
});

test('does not attribute a blank container pixel to inherited foreground text color', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<style>body{margin:0}.target{position:relative;width:100px;height:100px;color:#fff;background:transparent}.target span{position:absolute;inset:40px auto auto 40px}</style><section class="target"><span>Copy</span></section>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Fixture server has no port');
    const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
    await page.goto(`http://127.0.0.1:${String(address.port)}`);
    await page.evaluate('globalThis.__name = (target) => target');
    const result = await inspectVisualRegion(
      page,
      {
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        changedPixels: 400,
        colorPixels: 400,
        geometryPixels: 0,
        type: 'color',
        referenceColor: '#d0e0e0',
        candidateColor: '#ffffff',
        deltaE: 20,
      },
      fixtureCapture,
    );

    assert.equal(result.element?.tag, 'section');
    assert.equal(result.attribution?.property, 'background-color');
    assert.equal(result.attribution?.confidence, 'low');
    assert.match(result.attribution?.reason ?? '', /No rendered presentation property matched/);
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
});

test('state recipes target listing tabs by their accessible tab role', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<button role="tab" onclick="document.body.dataset.selected=\'active\'">Active (3)</button><button role="tab">Sold (2)</button>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Fixture server has no port');
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${String(address.port)}`);
    await applyState(page, { ...fixtureCapture, state: 'listings-active-desktop' });
    assert.equal(await page.locator('body').getAttribute('data-selected'), 'active');
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
});

test('uses the Chromium CSS domain to resolve the winning cascade declaration', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<style>.target{color:#00128a}.target{color:#86622d!important}</style><div class="target">Winning declaration</div>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Fixture server has no port');
    const context = await browser.newContext({ viewport: { width: 200, height: 100 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${String(address.port)}`);
    await page.evaluate('globalThis.__name = (target) => target');
    const result = await inspectVisualRegion(
      page,
      {
        x: 0,
        y: 0,
        width: 180,
        height: 30,
        changedPixels: 200,
        colorPixels: 200,
        geometryPixels: 0,
        type: 'color',
        referenceColor: '#00128a',
        candidateColor: '#86622d',
        deltaE: 100,
      },
      { ...fixtureCapture, viewport: { width: 200, height: 100, class: 'desktop' } },
      await context.newCDPSession(page),
    );

    assert.equal(result.attribution?.selector, '.target');
    assert.match(result.attribution?.value ?? '', /134, 98, 45/);
    assert.equal(result.attribution?.confidence, 'high');
    assert.match(result.attribution?.reason ?? '', /Chromium CSS domain/);
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
});

test('attributes SVG presentation to fill rather than inherited text color', async () => {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<style>:root{--icon:#86622d}.shape{fill:var(--icon)}</style><svg width="100" height="100" aria-label="Icon"><rect class="shape" width="100" height="100"/></svg>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Fixture server has no port');
    const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
    await page.goto(`http://127.0.0.1:${String(address.port)}`);
    await page.evaluate('globalThis.__name = (target) => target');
    const result = await inspectVisualRegion(
      page,
      {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        changedPixels: 10_000,
        colorPixels: 10_000,
        geometryPixels: 0,
        type: 'color',
        referenceColor: '#00128a',
        candidateColor: '#86622d',
        deltaE: 100,
      },
      fixtureCapture,
    );

    assert.equal(result.element?.tag, 'rect');
    assert.equal(result.attribution?.property, 'fill');
    assert.equal(result.attribution?.token, '--icon');
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
});

test('state recipes fail with the named missing target', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<main>No listing tabs</main>');
    await assert.rejects(
      applyState(page, {
        ...fixtureCapture,
        route: '/real-estate',
        state: 'listings-sold-desktop',
      }),
      /State recipe listings-sold-desktop could not find Sold listings tab on \/real-estate/,
    );
  } finally {
    await browser.close();
  }
});
