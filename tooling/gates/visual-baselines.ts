import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium, type Browser } from '@playwright/test';

export type ViewportClass = 'desktop' | 'tablet' | 'mobile';

export type Rectangle = Readonly<{
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type VisualCapture = Readonly<{
  id: string;
  file: string;
  sha256: string;
  route: string;
  state: string;
  viewport: Readonly<{ width: number; height: number; class: ViewportClass }>;
  tile: Readonly<{ x: number; y: number; width: number; height: number }>;
  masks: readonly Rectangle[];
  regions: readonly Rectangle[];
  intentionalCorrectionIds: readonly string[];
}>;

export type VisualBaselineManifest = Readonly<{
  schemaVersion: 1;
  source: Readonly<{ projectUrl: string; frozenAt: string }>;
  policy: Readonly<{
    similarityThreshold: number;
    desktopGeometryTolerancePx: number;
    mobileGeometryTolerancePx: number;
  }>;
  intentionalCorrections: readonly Readonly<{ id: string; description: string }>[];
  captures: readonly VisualCapture[];
}>;

export type RegionComparison = Readonly<{
  regionId: string;
  similarity: number;
  comparedPixels: number;
}>;

export type PixelDecoder = Readonly<{
  dimensions(file: string): Promise<Readonly<{ width: number; height: number }>>;
  compare(
    baselineFile: string,
    actualFile: string,
    regions: readonly Rectangle[],
    masks: readonly Rectangle[],
  ): Promise<readonly RegionComparison[]>;
  close?(): Promise<void>;
}>;

export type BaselineVerificationReport = Readonly<{
  verifiedCaptures: number;
  errors: readonly string[];
}>;

export type CaptureComparison = Readonly<{
  id: string;
  file: string;
  expectedDimensions: Readonly<{ width: number; height: number }>;
  actualDimensions?: Readonly<{ width: number; height: number }>;
  geometryTolerancePx: number;
  regions: readonly RegionComparison[];
  failures: readonly string[];
}>;

export type VisualComparisonReport = Readonly<{
  passed: boolean;
  similarityThreshold: number;
  captures: readonly CaptureComparison[];
}>;

export type CandidateCaptureReport = Readonly<{
  baseUrl: string;
  outputRoot: string;
  captures: readonly Readonly<{
    id: string;
    file: string;
    documentDimensions: Readonly<{ width: number; height: number }>;
    capturedDimensions: Readonly<{ width: number; height: number }>;
  }>[];
}>;

const JPEG_START = 0xffd8;
const JPEG_END = 0xffd9;
const START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

export async function loadVisualBaselineManifest(
  baselineRoot: string,
): Promise<VisualBaselineManifest> {
  const parsed: unknown = JSON.parse(
    await readFile(path.join(baselineRoot, 'manifest.json'), 'utf8'),
  );
  return parseManifest(parsed);
}

export function selectVisualBaselineCaptures(
  manifest: VisualBaselineManifest,
  route: string,
): VisualBaselineManifest {
  const captures = manifest.captures.filter((capture) => capture.route === route);
  if (captures.length === 0) throw new Error(`No frozen captures exist for route ${route}`);
  return { ...manifest, captures };
}

export function visualBaselineRootForRoute(repositoryRoot: string, route: string): string {
  const directory =
    route === '/property-management' ? '2026-09-11-property-management' : '2026-09-10';
  return path.join(repositoryRoot, 'frontend/visual-baselines', directory);
}

function selectVisualBaselinePageCaptures(
  manifest: VisualBaselineManifest,
  route: string,
): VisualBaselineManifest {
  const selected = selectVisualBaselineCaptures(manifest, route);
  return { ...selected, captures: selected.captures.filter(({ state }) => state === 'page') };
}

export async function captureVisualCandidates(
  baseUrl: string,
  outputRoot: string,
  manifest: VisualBaselineManifest,
  options: Readonly<{ storageState?: string }> = {},
): Promise<CandidateCaptureReport> {
  const normalizedBaseUrl = new URL(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'trico-visual-candidate-'));
  const results: CandidateCaptureReport['captures'][number][] = [];
  try {
    const pageCaptures = manifest.captures.filter(({ state }) => state === 'page');
    const groups = new Map<string, VisualCapture[]>();
    for (const capture of pageCaptures) {
      const key = `${capture.route}:${String(capture.viewport.width)}:${String(capture.viewport.height)}`;
      const group = groups.get(key) ?? [];
      group.push(capture);
      groups.set(key, group);
    }
    for (const captures of groups.values()) {
      const first = captures[0];
      if (first === undefined) continue;
      const context = await browser.newContext({
        viewport: { width: first.viewport.width, height: first.viewport.height },
        reducedMotion: 'reduce',
        ...(options.storageState === undefined ? {} : { storageState: options.storageState }),
      });
      const page = await context.newPage();
      try {
        await page.goto(new URL(first.route, normalizedBaseUrl).href, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          const step = Math.max(window.innerHeight, 1);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          }
          window.scrollTo(0, 0);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          await Promise.all(
            [...document.images].map(async (image) => {
              if (image.complete) return;
              await new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
              });
            }),
          );
        });
        const documentDimensions = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        }));
        const fullPageFile = path.join(
          temporaryRoot,
          `${createHash('sha256').update(first.id).digest('hex')}.png`,
        );
        await page.screenshot({ path: fullPageFile, fullPage: true, animations: 'disabled' });
        const cropPage = await context.newPage();
        try {
          await cropPage.goto(pathToFileURL(fullPageFile).href);
          const finalTileY = Math.max(...captures.map(({ tile }) => tile.y));
          for (const capture of captures) {
            const availableWidth = Math.max(
              1,
              Math.min(capture.tile.width, documentDimensions.width - capture.tile.x),
            );
            const remainingHeight = documentDimensions.height - capture.tile.y;
            const availableHeight = Math.max(
              1,
              capture.tile.y === finalTileY
                ? remainingHeight
                : Math.min(capture.tile.height, remainingHeight),
            );
            const jpeg = await cropPage.evaluate(
              ({ x, y, width, height }) => {
                const source = document.querySelector('img');
                if (!(source instanceof HTMLImageElement))
                  throw new Error('Candidate image is unavailable');
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                if (context === null) throw new Error('Canvas 2D context is unavailable');
                context.drawImage(source, x, y, width, height, 0, 0, width, height);
                return canvas.toDataURL('image/jpeg', 0.92).split(',')[1] ?? '';
              },
              {
                x: capture.tile.x,
                y: capture.tile.y,
                width: availableWidth,
                height: availableHeight,
              },
            );
            if (jpeg.length === 0) throw new Error(`Candidate encoding failed for ${capture.id}`);
            const outputFile = path.join(outputRoot, capture.file);
            await mkdir(path.dirname(outputFile), { recursive: true });
            await writeFile(outputFile, Buffer.from(jpeg, 'base64'));
            results.push({
              id: capture.id,
              file: capture.file,
              documentDimensions,
              capturedDimensions: { width: availableWidth, height: availableHeight },
            });
          }
        } finally {
          await cropPage.close();
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  const report = {
    baseUrl: normalizedBaseUrl.href,
    outputRoot: path.resolve(outputRoot),
    captures: results,
  };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    path.join(outputRoot, 'candidate-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

export async function verifyVisualBaseline(
  baselineRoot: string,
  manifest: VisualBaselineManifest,
): Promise<BaselineVerificationReport> {
  const errors: string[] = [];
  const knownCorrections = new Set(manifest.intentionalCorrections.map(({ id }) => id));
  const ids = new Set<string>();
  const files = new Set<string>();

  for (const capture of manifest.captures) {
    if (ids.has(capture.id)) errors.push(`Duplicate manifest capture ID: ${capture.id}`);
    ids.add(capture.id);
    if (files.has(capture.file)) errors.push(`Duplicate manifest file: ${capture.file}`);
    files.add(capture.file);
    if (!isSafeJpegPath(capture.file))
      errors.push(`Unsafe or non-JPEG capture path: ${capture.file}`);
    for (const correctionId of capture.intentionalCorrectionIds) {
      if (!knownCorrections.has(correctionId)) {
        errors.push(`Capture ${capture.id} references unknown correction ${correctionId}`);
      }
    }

    const file = path.join(baselineRoot, capture.file);
    try {
      const bytes = await readFile(file);
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (digest !== capture.sha256) errors.push(`Checksum mismatch for ${capture.file}`);
      const dimensions = jpegDimensions(bytes);
      if (dimensions.width !== capture.tile.width || dimensions.height !== capture.tile.height) {
        errors.push(
          `Image dimensions for ${capture.file} are ${String(dimensions.width)}x${String(dimensions.height)}, expected ${String(capture.tile.width)}x${String(capture.tile.height)}`,
        );
      }
      for (const rectangle of [...capture.masks, ...capture.regions]) {
        if (!rectangleFits(rectangle, dimensions)) {
          errors.push(`Rectangle ${rectangle.id} falls outside ${capture.file}`);
        }
      }
    } catch (error: unknown) {
      errors.push(`Cannot verify ${capture.file}: ${errorMessage(error)}`);
    }
  }

  const diskCaptures = await listJpegs(baselineRoot);
  for (const file of diskCaptures) {
    if (!files.has(file)) errors.push(`Unrecorded capture: ${file}`);
  }
  for (const file of files) {
    if (!diskCaptures.includes(file)) errors.push(`Missing capture: ${file}`);
  }

  return { verifiedCaptures: manifest.captures.length, errors: errors.sort() };
}

export async function compareCaptureSets(
  baselineRoot: string,
  actualRoot: string,
  manifest: VisualBaselineManifest,
  decoder?: PixelDecoder,
): Promise<VisualComparisonReport> {
  const selectedDecoder = decoder ?? createChromiumPixelDecoder();
  const captures: CaptureComparison[] = [];
  try {
    for (const capture of manifest.captures) {
      const baselineFile = path.join(baselineRoot, capture.file);
      const actualFile = path.join(actualRoot, capture.file);
      const failures: string[] = [];
      const tolerance =
        capture.viewport.class === 'mobile'
          ? manifest.policy.mobileGeometryTolerancePx
          : manifest.policy.desktopGeometryTolerancePx;
      let actualDimensions: Readonly<{ width: number; height: number }> | undefined;
      let regions: readonly RegionComparison[] = [];
      try {
        actualDimensions = await selectedDecoder.dimensions(actualFile);
        const widthDelta = Math.abs(actualDimensions.width - capture.tile.width);
        const heightDelta = Math.abs(actualDimensions.height - capture.tile.height);
        if (widthDelta > tolerance || heightDelta > tolerance) {
          failures.push(
            `Geometry differs by ${String(widthDelta)}x${String(heightDelta)} pixels; tolerance is ${String(tolerance)} pixels`,
          );
        }
        regions = await selectedDecoder.compare(
          baselineFile,
          actualFile,
          capture.regions,
          capture.masks,
        );
        const reportedRegionIds = new Set(regions.map(({ regionId }) => regionId));
        for (const expected of capture.regions) {
          if (!reportedRegionIds.has(expected.id))
            failures.push(`Missing similarity result for ${expected.id}`);
        }
        for (const region of regions) {
          if (region.comparedPixels === 0)
            failures.push(`Region ${region.regionId} has no unmasked pixels`);
          if (region.similarity < manifest.policy.similarityThreshold) {
            failures.push(
              `Region ${region.regionId} similarity ${region.similarity.toFixed(6)} is below ${manifest.policy.similarityThreshold.toFixed(6)}`,
            );
          }
        }
      } catch (error: unknown) {
        failures.push(`Comparison failed: ${errorMessage(error)}`);
      }
      const result: CaptureComparison = {
        id: capture.id,
        file: capture.file,
        expectedDimensions: { width: capture.tile.width, height: capture.tile.height },
        geometryTolerancePx: tolerance,
        regions,
        failures,
        ...(actualDimensions === undefined ? {} : { actualDimensions }),
      };
      captures.push(result);
    }
  } finally {
    await selectedDecoder.close?.();
  }
  return {
    passed: captures.every(({ failures }) => failures.length === 0),
    similarityThreshold: manifest.policy.similarityThreshold,
    captures,
  };
}

export function createChromiumPixelDecoder(): PixelDecoder {
  let browserPromise: Promise<Browser> | undefined;
  const browser = (): Promise<Browser> => {
    browserPromise ??= chromium.launch({
      headless: true,
      args: ['--allow-file-access-from-files'],
    });
    return browserPromise;
  };
  return {
    dimensions: async (file) => jpegDimensions(await readFile(file)),
    compare: async (baselineFile, actualFile, regions, masks) => {
      const instance = await browser();
      const page = await instance.newPage();
      try {
        const baselineUrl = pathToFileURL(baselineFile).href;
        const actualUrl = pathToFileURL(actualFile).href;
        await page.goto(baselineUrl);
        await page.evaluate('globalThis.__name = (target) => target');
        return await page.evaluate(
          async ({
            baselineUrl: referenceUrl,
            actualUrl: candidateUrl,
            regions: areas,
            masks: exclusions,
          }) => {
            const load = async (source: string): Promise<HTMLImageElement> => {
              const image = new Image();
              const loaded = new Promise<void>((resolve, reject) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener(
                  'error',
                  () => reject(new Error(`Unable to decode ${source}`)),
                  {
                    once: true,
                  },
                );
              });
              image.src = source;
              await loaded;
              return image;
            };
            const [reference, candidate] = await Promise.all([
              load(referenceUrl),
              load(candidateUrl),
            ]);
            const pixels = (image: HTMLImageElement): Uint8ClampedArray => {
              const canvas = document.createElement('canvas');
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              const context = canvas.getContext('2d', { willReadFrequently: true });
              if (context === null) throw new Error('Canvas 2D context is unavailable');
              context.drawImage(image, 0, 0);
              return context.getImageData(0, 0, canvas.width, canvas.height).data;
            };
            const referencePixels = pixels(reference);
            const candidatePixels = pixels(candidate);
            const width = Math.min(reference.naturalWidth, candidate.naturalWidth);
            const height = Math.min(reference.naturalHeight, candidate.naturalHeight);
            const excluded = (x: number, y: number): boolean =>
              exclusions.some(
                (mask) =>
                  x >= mask.x && y >= mask.y && x < mask.x + mask.width && y < mask.y + mask.height,
              );
            const luminance = (data: Uint8ClampedArray, offset: number): number =>
              0.2126 * (data[offset] ?? 0) +
              0.7152 * (data[offset + 1] ?? 0) +
              0.0722 * (data[offset + 2] ?? 0);
            const c1 = (0.01 * 255) ** 2;
            const c2 = (0.03 * 255) ** 2;

            return areas.map((area) => {
              let structuralSimilarity = 0;
              let comparedBlocks = 0;
              let comparedPixels = 0;
              const maxX = Math.min(area.x + area.width, width);
              const maxY = Math.min(area.y + area.height, height);
              for (let blockY = area.y; blockY < maxY; blockY += 8) {
                for (let blockX = area.x; blockX < maxX; blockX += 8) {
                  const referenceValues: number[] = [];
                  const candidateValues: number[] = [];
                  for (let y = blockY; y < Math.min(blockY + 8, maxY); y += 1) {
                    for (let x = blockX; x < Math.min(blockX + 8, maxX); x += 1) {
                      if (excluded(x, y)) continue;
                      referenceValues.push(
                        luminance(referencePixels, (y * reference.naturalWidth + x) * 4),
                      );
                      candidateValues.push(
                        luminance(candidatePixels, (y * candidate.naturalWidth + x) * 4),
                      );
                    }
                  }
                  if (referenceValues.length === 0) continue;
                  const count = referenceValues.length;
                  const referenceMean =
                    referenceValues.reduce((sum, value) => sum + value, 0) / count;
                  const candidateMean =
                    candidateValues.reduce((sum, value) => sum + value, 0) / count;
                  let referenceVariance = 0;
                  let candidateVariance = 0;
                  let covariance = 0;
                  for (let index = 0; index < count; index += 1) {
                    const referenceDelta = (referenceValues[index] ?? 0) - referenceMean;
                    const candidateDelta = (candidateValues[index] ?? 0) - candidateMean;
                    referenceVariance += referenceDelta * referenceDelta;
                    candidateVariance += candidateDelta * candidateDelta;
                    covariance += referenceDelta * candidateDelta;
                  }
                  referenceVariance /= count;
                  candidateVariance /= count;
                  covariance /= count;
                  structuralSimilarity +=
                    ((2 * referenceMean * candidateMean + c1) * (2 * covariance + c2)) /
                    ((referenceMean ** 2 + candidateMean ** 2 + c1) *
                      (referenceVariance + candidateVariance + c2));
                  comparedBlocks += 1;
                  comparedPixels += count;
                }
              }
              return {
                regionId: area.id,
                similarity: comparedBlocks === 0 ? 0 : structuralSimilarity / comparedBlocks,
                comparedPixels,
              };
            });
          },
          { baselineUrl, actualUrl, regions, masks },
        );
      } finally {
        await page.close();
      }
    },
    close: async () => {
      const instance = await browserPromise;
      browserPromise = undefined;
      await instance?.close();
    },
  };
}

export async function buildFrozenManifest(baselineRoot: string): Promise<VisualBaselineManifest> {
  const files = await listJpegs(baselineRoot);
  const corrections = [
    {
      id: 'accessible-responsive-repair',
      description:
        'Preserve intended appearance while correcting keyboard, reduced-motion, contrast, naming, and responsive-navigation defects.',
    },
    {
      id: 'unavailable-image-placeholders',
      description:
        'Thirteen unavailable Lovable images may use neutral managed placeholders with identical layout geometry.',
    },
    {
      id: 'approved-content-exclusions',
      description:
        'Exclude Property 7-10, unmounted Real Estate category/Land Experts content, and fabricated construction project cards.',
    },
  ] as const;
  const captures: VisualCapture[] = [];
  for (const file of files) {
    const bytes = await readFile(path.join(baselineRoot, file));
    const dimensions = jpegDimensions(bytes);
    const descriptor = captureDescriptor(file, dimensions);
    captures.push({
      ...descriptor,
      file,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      masks: [],
      regions: [
        {
          id: descriptor.state === 'page' ? descriptor.id : descriptor.state,
          x: 0,
          y: 0,
          ...dimensions,
        },
      ],
      intentionalCorrectionIds: correctionIdsFor(descriptor.route),
    });
  }
  return {
    schemaVersion: 1,
    source: {
      projectUrl: 'https://lovable.dev/projects/070a6314-6df5-4464-9eb5-be7e80bc91c8',
      frozenAt: freezeDateFromRoot(baselineRoot),
    },
    policy: {
      similarityThreshold: 0.98,
      desktopGeometryTolerancePx: 2,
      mobileGeometryTolerancePx: 3,
    },
    intentionalCorrections: corrections,
    captures,
  };
}

function freezeDateFromRoot(baselineRoot: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|-)/.exec(path.basename(path.resolve(baselineRoot)));
  if (match?.[1] === undefined) {
    throw new Error('Visual baseline directory must begin with an ISO freeze date');
  }
  return match[1];
}

export function jpegDimensions(bytes: Uint8Array): Readonly<{ width: number; height: number }> {
  if (bytes.length < 4 || readUint16(bytes, 0) !== JPEG_START) throw new Error('Not a JPEG image');
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0x00) continue;
    if (marker === JPEG_END || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    const segmentLength = readUint16(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length)
      throw new Error('Malformed JPEG segment');
    if (START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) throw new Error('Malformed JPEG frame');
      return { height: readUint16(bytes, offset + 3), width: readUint16(bytes, offset + 5) };
    }
    offset += segmentLength;
  }
  throw new Error('JPEG dimensions are unavailable');
}

function captureDescriptor(
  file: string,
  dimensions: Readonly<{ width: number; height: number }>,
): Pick<VisualCapture, 'id' | 'route' | 'state' | 'viewport' | 'tile'> {
  const stem = path.basename(file, '.jpg');
  const parts = stem.split('.');
  const pageName = parts[0] ?? '';
  const route = pageName === 'home' ? '/' : `/${pageName}`;
  if (file.startsWith('states/')) {
    const state = parts.slice(1).join('-');
    const mobile = state.includes('mobile-menu');
    return {
      id: `state.${stem}`,
      route,
      state,
      viewport: {
        width: dimensions.width,
        height: dimensions.height,
        class: mobile ? 'mobile' : 'desktop',
      },
      tile: { x: 0, y: 0, ...dimensions },
    };
  }
  const viewportClass = parts[1];
  if (viewportClass !== 'desktop' && viewportClass !== 'tablet' && viewportClass !== 'mobile') {
    throw new Error(`Cannot derive viewport from ${file}`);
  }
  const part = parts[2]?.startsWith('part-') ? Number(parts[2].slice(5)) : 1;
  if (!Number.isInteger(part) || part < 1) throw new Error(`Cannot derive tile from ${file}`);
  const viewport: VisualCapture['viewport'] =
    viewportClass === 'desktop'
      ? { width: 1440, height: 1100, class: viewportClass }
      : viewportClass === 'tablet'
        ? { width: 1024, height: 1366, class: viewportClass }
        : { width: 390, height: 844, class: viewportClass };
  return {
    id: `page.${stem}`,
    route,
    state: 'page',
    viewport,
    tile: { x: 0, y: (part - 1) * 6000, ...dimensions },
  };
}

function correctionIdsFor(route: string): readonly string[] {
  const ids = ['accessible-responsive-repair', 'unavailable-image-placeholders'];
  if (route === '/property-management' || route === '/real-estate' || route === '/construction') {
    ids.push('approved-content-exclusions');
  }
  return ids;
}

function parseManifest(value: unknown): VisualBaselineManifest {
  if (!isRecord(value) || value['schemaVersion'] !== 1)
    throw new Error('Unsupported visual baseline manifest');
  const source = value['source'];
  const policy = value['policy'];
  const corrections = value['intentionalCorrections'];
  const captures = value['captures'];
  if (
    !isRecord(source) ||
    typeof source['projectUrl'] !== 'string' ||
    typeof source['frozenAt'] !== 'string'
  ) {
    throw new Error('Visual baseline source is invalid');
  }
  if (!isRecord(policy)) throw new Error('Visual baseline policy is invalid');
  const similarityThreshold = numberField(policy, 'similarityThreshold');
  const desktopGeometryTolerancePx = numberField(policy, 'desktopGeometryTolerancePx');
  const mobileGeometryTolerancePx = numberField(policy, 'mobileGeometryTolerancePx');
  if (!Array.isArray(corrections) || !Array.isArray(captures))
    throw new Error('Visual baseline inventory is invalid');
  const manifest: VisualBaselineManifest = {
    schemaVersion: 1,
    source: { projectUrl: source['projectUrl'], frozenAt: source['frozenAt'] },
    policy: { similarityThreshold, desktopGeometryTolerancePx, mobileGeometryTolerancePx },
    intentionalCorrections: corrections.map((entry) => {
      if (
        !isRecord(entry) ||
        typeof entry['id'] !== 'string' ||
        typeof entry['description'] !== 'string'
      ) {
        throw new Error('Intentional correction is invalid');
      }
      return { id: entry['id'], description: entry['description'] };
    }),
    captures: captures.map(parseCapture),
  };
  if (
    !/^https:\/\//.test(manifest.source.projectUrl) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(manifest.source.frozenAt)
  ) {
    throw new Error('Visual baseline source must contain an HTTPS project URL and ISO freeze date');
  }
  if (similarityThreshold <= 0 || similarityThreshold > 1)
    throw new Error('Similarity threshold is invalid');
  return manifest;
}

function parseCapture(value: unknown): VisualCapture {
  if (!isRecord(value)) throw new Error('Visual capture is invalid');
  const viewport = value['viewport'];
  const tile = value['tile'];
  if (!isRecord(viewport) || !isRecord(tile)) throw new Error('Visual capture geometry is invalid');
  const viewportClass = viewport['class'];
  if (viewportClass !== 'desktop' && viewportClass !== 'tablet' && viewportClass !== 'mobile') {
    throw new Error('Visual capture viewport class is invalid');
  }
  const masks = value['masks'];
  const regions = value['regions'];
  const corrections = value['intentionalCorrectionIds'];
  if (!Array.isArray(masks) || !Array.isArray(regions) || !Array.isArray(corrections)) {
    throw new Error('Visual capture comparisons are invalid');
  }
  const capture: VisualCapture = {
    id: stringField(value, 'id'),
    file: stringField(value, 'file'),
    sha256: stringField(value, 'sha256'),
    route: stringField(value, 'route'),
    state: stringField(value, 'state'),
    viewport: {
      width: integerField(viewport, 'width'),
      height: integerField(viewport, 'height'),
      class: viewportClass,
    },
    tile: {
      x: integerField(tile, 'x', true),
      y: integerField(tile, 'y', true),
      width: integerField(tile, 'width'),
      height: integerField(tile, 'height'),
    },
    masks: masks.map(parseRectangle),
    regions: regions.map(parseRectangle),
    intentionalCorrectionIds: corrections.map((entry) => {
      if (typeof entry !== 'string') throw new Error('Correction ID is invalid');
      return entry;
    }),
  };
  if (!/^[a-f0-9]{64}$/.test(capture.sha256))
    throw new Error(`Invalid checksum for ${capture.file}`);
  if (capture.regions.length === 0)
    throw new Error(`Capture ${capture.id} has no comparison regions`);
  return capture;
}

function parseRectangle(value: unknown): Rectangle {
  if (!isRecord(value)) throw new Error('Comparison rectangle is invalid');
  return {
    id: stringField(value, 'id'),
    x: integerField(value, 'x', true),
    y: integerField(value, 'y', true),
    width: integerField(value, 'width'),
    height: integerField(value, 'height'),
  };
}

function stringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== 'string' || field.length === 0) throw new Error(`${key} must be a string`);
  return field;
}

function numberField(value: Record<string, unknown>, key: string): number {
  const field = value[key];
  if (typeof field !== 'number' || !Number.isFinite(field))
    throw new Error(`${key} must be a number`);
  return field;
}

function integerField(value: Record<string, unknown>, key: string, allowZero = false): number {
  const field = numberField(value, key);
  if (!Number.isInteger(field) || (allowZero ? field < 0 : field <= 0)) {
    throw new Error(`${key} must be ${allowZero ? 'a nonnegative' : 'a positive'} integer`);
  }
  return field;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readUint16(bytes: Uint8Array, offset: number): number {
  const high = bytes[offset];
  const low = bytes[offset + 1];
  if (high === undefined || low === undefined) throw new Error('Unexpected end of JPEG');
  return high * 256 + low;
}

function rectangleFits(
  rectangle: Rectangle,
  dimensions: Readonly<{ width: number; height: number }>,
): boolean {
  return (
    rectangle.x >= 0 &&
    rectangle.y >= 0 &&
    rectangle.width > 0 &&
    rectangle.height > 0 &&
    rectangle.x + rectangle.width <= dimensions.width &&
    rectangle.y + rectangle.height <= dimensions.height
  );
}

function isSafeJpegPath(file: string): boolean {
  return (
    file === path.posix.normalize(file) &&
    !path.isAbsolute(file) &&
    !file.startsWith('../') &&
    file.endsWith('.jpg')
  );
}

async function listJpegs(root: string, relative = ''): Promise<string[]> {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const next = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) return listJpegs(root, next);
      return entry.isFile() && entry.name.endsWith('.jpg') ? [next] : [];
    }),
  );
  return files.flat().sort();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runCli(): Promise<void> {
  const command = process.argv[2] ?? 'verify';
  const repositoryRoot = path.resolve('.');
  const defaultRoot = visualBaselineRootForRoute(repositoryRoot, '');
  if (command === 'freeze') {
    const baselineRoot = path.resolve(process.argv[3] ?? defaultRoot);
    const manifest = await buildFrozenManifest(baselineRoot);
    await writeFile(
      path.join(baselineRoot, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    process.stdout.write(`${String(manifest.captures.length)} captures frozen\n`);
    return;
  }
  if (command === 'generate') {
    process.stdout.write(
      `${JSON.stringify(await buildFrozenManifest(process.argv[3] ?? defaultRoot), null, 2)}\n`,
    );
    return;
  }
  const baselineArgument =
    command === 'compare'
      ? process.argv[4]
      : command === 'compare-route'
        ? process.argv[5]
        : command === 'capture'
          ? process.argv[6]
          : process.argv[3];
  const route = command === 'compare-route' ? process.argv[4] : process.argv[5];
  const routeDefaultRoot =
    route === undefined ? defaultRoot : visualBaselineRootForRoute(repositoryRoot, route);
  const baselineRoot = path.resolve(baselineArgument ?? routeDefaultRoot);
  const manifest = await loadVisualBaselineManifest(baselineRoot);
  if (command === 'verify') {
    const report = await verifyVisualBaseline(baselineRoot, manifest);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.errors.length > 0) process.exitCode = 1;
    return;
  }
  if (command === 'compare') {
    const actualRoot = process.argv[3];
    if (actualRoot === undefined)
      throw new Error('Usage: visual-baselines compare <actual-root> [baseline-root]');
    const report = await compareCaptureSets(baselineRoot, path.resolve(actualRoot), manifest);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (command === 'capture') {
    const baseUrl = process.argv[3];
    const outputRoot = process.argv[4];
    const route = process.argv[5];
    if (baseUrl === undefined || outputRoot === undefined || route === undefined) {
      throw new Error('Usage: visual-baselines capture <base-url> <output-root> <route>');
    }
    const selected = selectVisualBaselinePageCaptures(manifest, route);
    const report = await captureVisualCandidates(baseUrl, path.resolve(outputRoot), selected);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  if (command === 'compare-route') {
    const actualRoot = process.argv[3];
    const route = process.argv[4];
    if (actualRoot === undefined || route === undefined) {
      throw new Error(
        'Usage: visual-baselines compare-route <actual-root> <route> [baseline-root]',
      );
    }
    const selected = selectVisualBaselinePageCaptures(manifest, route);
    const report = await compareCaptureSets(baselineRoot, path.resolve(actualRoot), selected);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
    return;
  }
  throw new Error('Usage: visual-baselines <freeze|generate|verify|compare|capture|compare-route>');
}

const executable = process.argv[1];
if (
  executable !== undefined &&
  path.resolve(executable) === path.resolve(new URL(import.meta.url).pathname)
) {
  await runCli();
}
