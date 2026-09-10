import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildFrozenManifest,
  compareCaptureSets,
  createChromiumPixelDecoder,
  loadVisualBaselineManifest,
  verifyVisualBaseline,
  type PixelDecoder,
} from './visual-baselines.js';

const repositoryRoot = path.resolve('.');
const baselineRoot = path.join(repositoryRoot, 'frontend/visual-baselines/2026-09-10');

test('the frozen manifest records every immutable JPEG exactly once', async () => {
  const manifest = await loadVisualBaselineManifest(baselineRoot);
  const report = await verifyVisualBaseline(baselineRoot, manifest);

  assert.equal(manifest.captures.length, 51);
  assert.deepEqual(report.errors, []);
  assert.equal(report.verifiedCaptures, 51);
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
