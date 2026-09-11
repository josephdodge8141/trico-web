import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createServer } from 'node:http';

import {
  buildFrozenManifest,
  captureVisualCandidates,
  compareCaptureSets,
  createChromiumPixelDecoder,
  loadVisualBaselineManifest,
  jpegDimensions,
  selectVisualBaselineCaptures,
  verifyVisualBaseline,
  visualBaselineRootForRoute,
  type PixelDecoder,
} from './visual-baselines.js';

const repositoryRoot = path.resolve('.');
const baselineRoot = path.join(repositoryRoot, 'frontend/visual-baselines/2026-09-10');
const propertyManagementBaselineRoot = path.join(
  repositoryRoot,
  'frontend/visual-baselines/2026-09-11-property-management',
);

test('the frozen manifest records every immutable JPEG exactly once', async () => {
  const manifest = await loadVisualBaselineManifest(baselineRoot);
  const report = await verifyVisualBaseline(baselineRoot, manifest);

  assert.equal(manifest.captures.length, 51);
  assert.deepEqual(report.errors, []);
  assert.equal(report.verifiedCaptures, 51);
});

test('the corrected Property Management baseline is complete and keeps strict policy', async () => {
  const manifest = await loadVisualBaselineManifest(propertyManagementBaselineRoot);
  const report = await verifyVisualBaseline(propertyManagementBaselineRoot, manifest);

  assert.equal(manifest.source.frozenAt, '2026-09-11');
  assert.equal(manifest.policy.similarityThreshold, 0.98);
  assert.equal(manifest.policy.desktopGeometryTolerancePx, 2);
  assert.equal(manifest.policy.mobileGeometryTolerancePx, 3);
  assert.equal(manifest.captures.length, 10);
  assert.equal(
    manifest.captures.every(({ route }) => route === '/property-management'),
    true,
  );
  assert.deepEqual(report.errors, []);
});

test('a route-specific candidate run selects only that route without weakening its policy', async () => {
  const manifest = await loadVisualBaselineManifest(baselineRoot);
  const selected = selectVisualBaselineCaptures(manifest, '/property-management');

  assert.equal(selected.captures.length, 10);
  assert.equal(
    selected.captures.every(({ route }) => route === '/property-management'),
    true,
  );
  assert.deepEqual(selected.policy, manifest.policy);
  assert.deepEqual(selected.intentionalCorrections, manifest.intentionalCorrections);
});

test('Property Management resolves to its independently corrected dated baseline', () => {
  assert.equal(
    visualBaselineRootForRoute(repositoryRoot, '/property-management'),
    propertyManagementBaselineRoot,
  );
  assert.equal(visualBaselineRootForRoute(repositoryRoot, '/real-estate'), baselineRoot);
});

test('candidate capture uses manifest viewports and records unpadded document geometry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'trico-visual-candidate-output-'));
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(
      '<style>html,body{margin:0}main{width:80px;height:70px;background:#00128a}</style><main></main>',
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Test server has no port');
    const manifest = {
      schemaVersion: 1 as const,
      source: { projectUrl: 'https://example.test', frozenAt: '2026-09-10' },
      policy: {
        similarityThreshold: 0.98,
        desktopGeometryTolerancePx: 2,
        mobileGeometryTolerancePx: 3,
      },
      intentionalCorrections: [],
      captures: [
        {
          id: 'candidate-page',
          file: 'pages/candidate.jpg',
          sha256: '0'.repeat(64),
          route: '/',
          state: 'page',
          viewport: { width: 80, height: 50, class: 'desktop' as const },
          tile: { x: 0, y: 0, width: 80, height: 50 },
          masks: [],
          regions: [{ id: 'full', x: 0, y: 0, width: 80, height: 50 }],
          intentionalCorrectionIds: [],
        },
        {
          id: 'candidate-page-tail',
          file: 'pages/candidate-tail.jpg',
          sha256: '0'.repeat(64),
          route: '/',
          state: 'page',
          viewport: { width: 80, height: 50, class: 'desktop' as const },
          tile: { x: 0, y: 50, width: 80, height: 10 },
          masks: [],
          regions: [{ id: 'full', x: 0, y: 0, width: 80, height: 10 }],
          intentionalCorrectionIds: [],
        },
        {
          id: 'candidate-short-page',
          file: 'pages/candidate-short.jpg',
          sha256: '0'.repeat(64),
          route: '/',
          state: 'page',
          viewport: { width: 81, height: 50, class: 'desktop' as const },
          tile: { x: 0, y: 0, width: 81, height: 100 },
          masks: [],
          regions: [{ id: 'full', x: 0, y: 0, width: 81, height: 100 }],
          intentionalCorrectionIds: [],
        },
      ],
    };

    const report = await captureVisualCandidates(
      `http://127.0.0.1:${String(address.port)}`,
      root,
      manifest,
    );
    assert.deepEqual(report.captures[0]?.documentDimensions, { width: 80, height: 70 });
    assert.deepEqual(report.captures[0]?.capturedDimensions, { width: 80, height: 50 });
    assert.deepEqual(report.captures[1]?.capturedDimensions, { width: 80, height: 20 });
    assert.deepEqual(report.captures[2]?.capturedDimensions, { width: 81, height: 70 });
    assert.deepEqual(jpegDimensions(await readFile(path.join(root, 'pages/candidate.jpg'))), {
      width: 80,
      height: 50,
    });
    assert.deepEqual(jpegDimensions(await readFile(path.join(root, 'pages/candidate-tail.jpg'))), {
      width: 80,
      height: 20,
    });
    assert.deepEqual(jpegDimensions(await readFile(path.join(root, 'pages/candidate-short.jpg'))), {
      width: 81,
      height: 70,
    });
    assert.deepEqual(
      JSON.parse(await readFile(path.join(root, 'candidate-report.json'), 'utf8')),
      report,
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
    await rm(root, { recursive: true, force: true });
  }
});

test('verification fails closed for changed, missing, duplicate, and unrecorded captures', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'trico-visual-baseline-'));
  try {
    await mkdir(path.join(root, 'pages'), { recursive: true });
    await writeFile(path.join(root, 'pages/reference.jpg'), Buffer.from('changed'));
    await writeFile(path.join(root, 'pages/unrecorded.jpg'), Buffer.from('extra'));
    const manifest = {
      schemaVersion: 1 as const,
      source: { projectUrl: 'https://example.test', frozenAt: '2026-09-10' },
      policy: {
        similarityThreshold: 0.98,
        desktopGeometryTolerancePx: 2,
        mobileGeometryTolerancePx: 3,
      },
      intentionalCorrections: [],
      captures: [
        {
          id: 'reference',
          file: 'pages/reference.jpg',
          sha256: '0'.repeat(64),
          route: '/',
          state: 'page',
          viewport: { width: 1440, height: 1100, class: 'desktop' as const },
          tile: { x: 0, y: 0, width: 1, height: 1 },
          masks: [],
          regions: [{ id: 'full', x: 0, y: 0, width: 1, height: 1 }],
          intentionalCorrectionIds: [],
        },
        {
          id: 'duplicate',
          file: 'pages/reference.jpg',
          sha256: '0'.repeat(64),
          route: '/',
          state: 'page',
          viewport: { width: 1440, height: 1100, class: 'desktop' as const },
          tile: { x: 0, y: 0, width: 1, height: 1 },
          masks: [],
          regions: [{ id: 'full', x: 0, y: 0, width: 1, height: 1 }],
          intentionalCorrectionIds: [],
        },
      ],
    };

    const report = await verifyVisualBaseline(root, manifest);
    assert.match(report.errors.join('\n'), /duplicate manifest file/i);
    assert.match(report.errors.join('\n'), /checksum mismatch/i);
    assert.match(report.errors.join('\n'), /unrecorded capture/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('comparison reports geometry and per-region similarity with masks', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'trico-visual-actual-'));
  try {
    await mkdir(path.join(root, 'pages'), { recursive: true });
    await writeFile(path.join(root, 'pages/reference.jpg'), Buffer.from('actual'));
    const manifest = {
      schemaVersion: 1 as const,
      source: { projectUrl: 'https://example.test', frozenAt: '2026-09-10' },
      policy: {
        similarityThreshold: 0.98,
        desktopGeometryTolerancePx: 2,
        mobileGeometryTolerancePx: 3,
      },
      intentionalCorrections: [],
      captures: [
        {
          id: 'reference',
          file: 'pages/reference.jpg',
          sha256: '0'.repeat(64),
          route: '/',
          state: 'page',
          viewport: { width: 1440, height: 1100, class: 'desktop' as const },
          tile: { x: 0, y: 0, width: 100, height: 50 },
          masks: [{ id: 'placeholder', x: 0, y: 0, width: 10, height: 10 }],
          regions: [{ id: 'hero', x: 0, y: 0, width: 100, height: 50 }],
          intentionalCorrectionIds: [],
        },
      ],
    };
    const decoder: PixelDecoder = {
      dimensions: async () => ({ width: 103, height: 50 }),
      compare: async (_baseline, _actual, regions, masks) => {
        assert.equal(regions[0]?.id, 'hero');
        assert.equal(masks[0]?.id, 'placeholder');
        return [{ regionId: 'hero', similarity: 0.97, comparedPixels: 4_900 }];
      },
    };

    const report = await compareCaptureSets('/baseline', root, manifest, decoder);
    assert.equal(report.passed, false);
    assert.match(report.captures[0]?.failures.join('\n') ?? '', /geometry/i);
    assert.match(report.captures[0]?.failures.join('\n') ?? '', /0\.970000.*0\.980000/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('the offline Chromium decoder produces structural similarity without Lovable', async () => {
  const file = path.join(baselineRoot, 'states/construction.mobile-menu-open.jpg');
  const decoder = createChromiumPixelDecoder();
  try {
    const dimensions = await decoder.dimensions(file);
    const results = await decoder.compare(
      file,
      file,
      [{ id: 'menu', x: 0, y: 0, ...dimensions }],
      [],
    );
    assert.equal(results[0]?.similarity, 1);
    assert.equal(results[0]?.comparedPixels, dimensions.width * dimensions.height);
  } finally {
    await decoder.close?.();
  }
});

test('manifest is deterministic JSON with no live-source dependency', async () => {
  const first = await readFile(path.join(baselineRoot, 'manifest.json'), 'utf8');
  const generated = await buildFrozenManifest(baselineRoot);
  assert.deepEqual(JSON.parse(first) as unknown, generated);
  assert.equal(first.includes('app.localhost'), false);
});

test('a dated route baseline derives its freeze date from the directory name', async () => {
  const generated = await buildFrozenManifest(propertyManagementBaselineRoot);
  const frozen: unknown = JSON.parse(
    await readFile(path.join(propertyManagementBaselineRoot, 'manifest.json'), 'utf8'),
  );

  assert.equal(generated.source.frozenAt, '2026-09-11');
  assert.equal(generated.captures.length, 10);
  assert.deepEqual(frozen, generated);
});
