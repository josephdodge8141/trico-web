import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { chromium } from '@playwright/test';

import {
  analyzePixelBuffers,
  groupVisualFindings,
  inspectVisualRegion,
  rgbToHex,
  type PixelAuditInput,
  type VisualFinding,
} from './visual-audit.js';

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
      referenceColor: '#00128a',
      candidateColor: '#86622d',
      deltaE: 40,
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
      referenceColor: '#00128a',
      candidateColor: '#86622d',
      deltaE: 40,
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
      {
        id: 'fixture',
        file: 'fixture.jpg',
        sha256: '0'.repeat(64),
        route: '/',
        state: 'page',
        viewport: { width: 100, height: 100, class: 'desktop' },
        tile: { x: 0, y: 0, width: 100, height: 100 },
        masks: [],
        regions: [],
        intentionalCorrectionIds: [],
      },
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
