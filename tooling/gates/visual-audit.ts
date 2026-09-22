import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pathToFileURL } from 'node:url';

import { chromium, type Browser, type CDPSession, type Locator, type Page } from '@playwright/test';

import {
  captureVisualCandidates,
  jpegDimensions,
  loadVisualBaselineManifest,
  visualBaselineRootForRoute,
  type Rectangle,
  type VisualBaselineManifest,
  type VisualCapture,
} from './visual-baselines.js';
import {
  compareNativeVisualPages,
  type AttributedVisualDifference,
} from './visual-audit-native.js';
import type { VisualElementAccounting, VisualNodeMatch } from './visual-audit-contract.js';

export type AuditViewport = 'desktop' | 'tablet' | 'mobile';
export type DifferenceType = 'color' | 'geometry' | 'typography' | 'asset' | 'content';
export type FindingSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type PixelAuditInput = Readonly<{
  width: number;
  height: number;
  reference: Uint8ClampedArray;
  candidate: Uint8ClampedArray;
  offsetY: number;
  masks: readonly Rectangle[];
  deltaThreshold: number;
  geometryRadius: number;
  cellSize: number;
}>;

export type PixelRegion = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  changedPixels: number;
  colorPixels: number;
  geometryPixels: number;
  type: 'color' | 'geometry';
  referenceColor: string;
  candidateColor: string;
  referenceRole?: SemanticColorRole;
  candidateRole?: SemanticColorRole;
  deltaE: number;
}>;

export type ColorSubstitution = Readonly<{
  reference: string;
  candidate: string;
  referenceRole?: SemanticColorRole;
  candidateRole?: SemanticColorRole;
  pixels: number;
  deltaE: number;
}>;

export type PixelAuditResult = Readonly<{
  comparedPixels: number;
  maskedPixels: number;
  changedPixels: number;
  geometryPixels: number;
  colorPixels: number;
  regions: readonly PixelRegion[];
  substitutions: readonly ColorSubstitution[];
}>;

type ElementEvidence = Readonly<{
  tag: string;
  text: string;
  selector: string;
  rect: Readonly<{ x: number; y: number; width: number; height: number }>;
}>;

type CssAttribution = Readonly<{
  property: string;
  computedValue: string;
  selector?: string;
  stylesheet?: string;
  sourceLine?: number;
  value?: string;
  token?: string;
  pseudo?: '::before' | '::after';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  ambiguity?: string;
}>;

export type VisualFinding = Readonly<{
  id: string;
  severity: FindingSeverity;
  route: string;
  viewport: AuditViewport;
  state: string;
  type: DifferenceType;
  region: Readonly<{ x: number; y: number; width: number; height: number }>;
  changedPixels: number;
  colorPixels?: number;
  verifiedPixels: number;
  referenceColor: string;
  candidateColor: string;
  deltaE: number;
  evidenceAvailable: boolean;
  element?: ElementEvidence;
  attribution?: CssAttribution;
}>;

export type RenderedStyleOccurrence = Readonly<{
  route: string;
  viewport: AuditViewport;
  state: string;
  tag: string;
  text: string;
  selector: string;
  rect: Readonly<{ x: number; y: number; width: number; height: number }>;
  property: string;
  computedValue: string;
  resolvedColor: string;
  semanticRole: SemanticColorRole;
  pseudo?: '::before' | '::after';
  declarationSelector?: string;
  sourceLine?: number;
  value?: string;
  token?: string;
  attributionConfidence?: 'high' | 'medium' | 'low';
  attributionReason?: string;
}>;

export type PixelAccounting = Readonly<{
  changedPixels: number;
  attributedStylePixels: number;
  geometryPixels: number;
  assetContentPixels: number;
  noisePixels: number;
  unresolvedPixels: number;
}>;

export type FindingGroup = Readonly<{
  id: string;
  property: string;
  candidateValue: string;
  selector: string;
  token?: string;
  routes: readonly string[];
  findingIds: readonly string[];
  changedPixels: number;
  verifiedPixels: number;
  severity: FindingSeverity;
}>;

type AuditCapture = Readonly<{ capture: VisualCapture; baselineRoot: string }>;

type ElementAuditCapture = Readonly<{
  route: string;
  viewport: AuditViewport;
  state: string;
  accounting: VisualElementAccounting;
  matches: readonly VisualNodeMatch[];
  differences: readonly AttributedVisualDifference[];
}>;

type VisualAuditReport = Readonly<{
  schemaVersion: 4;
  engine: 'native-element-cdp';
  mode: 'frozen' | 'live';
  reference: string;
  candidate: string;
  thresholds: Readonly<{ deltaE: number; geometryRadius: number; cellSize: number }>;
  totals: Readonly<{
    captures: number;
    comparedPixels: number;
    changedPixels: number;
    geometryPixels: number;
    colorPixels: number;
  }>;
  findings: readonly VisualFinding[];
  groups: readonly FindingGroup[];
  unattributedFindings: readonly VisualFinding[];
  substitutions: readonly (ColorSubstitution & Readonly<{ routes: readonly string[] }>)[];
  interactions: readonly InteractiveDifference[];
  renderedStyles: readonly RenderedStyleOccurrence[];
  elementAudits: readonly ElementAuditCapture[];
  accounting: PixelAccounting;
}>;

type InteractiveDifference = Readonly<{
  route: string;
  viewport: AuditViewport;
  key: string;
  state: 'default' | 'hover' | 'focus';
  property: string;
  reference: string;
  candidate: string;
}>;

type Rgb = readonly [number, number, number];
const cdpDocumentRoots = new WeakMap<CDPSession, number>();
const cdpAttributionCache = new WeakMap<CDPSession, Map<string, Partial<CssAttribution> | null>>();
export type SemanticColorRole =
  | 'brand-blue'
  | 'deep-blue'
  | 'light-blue'
  | 'gold'
  | 'ink'
  | 'muted'
  | 'surface'
  | 'muted-surface';

const semanticColors: ReadonlyArray<Readonly<{ role: SemanticColorRole; color: Rgb }>> = [
  { role: 'brand-blue', color: [0, 18, 138] },
  { role: 'deep-blue', color: [0, 10, 77] },
  { role: 'light-blue', color: [94, 133, 186] },
  { role: 'gold', color: [134, 98, 45] },
  { role: 'ink', color: [15, 23, 41] },
  { role: 'muted', color: [107, 114, 128] },
  { role: 'surface', color: [255, 255, 255] },
  { role: 'muted-surface', color: [243, 244, 246] },
];

export function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((value) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function rgbToLab(rgb: Rgb): readonly [number, number, number] {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const red = linear[0] ?? 0;
  const green = linear[1] ?? 0;
  const blue = linear[2] ?? 0;
  const x = (red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047;
  const y = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const z = (red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883;
  const convert = (value: number): number =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const fx = convert(x);
  const fy = convert(y);
  const fz = convert(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function perceptualDelta(left: Rgb, right: Rgb): number {
  const a = rgbToLab(left);
  const b = rgbToLab(right);
  return Math.hypot(
    (a[0] ?? 0) - (b[0] ?? 0),
    (a[1] ?? 0) - (b[1] ?? 0),
    (a[2] ?? 0) - (b[2] ?? 0),
  );
}

function colorAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const offset = (y * width + x) * 4;
  return [pixels[offset] ?? 0, pixels[offset + 1] ?? 0, pixels[offset + 2] ?? 0];
}

function quantizedHex(color: Rgb): string {
  return rgbToHex(
    ...(color.map((channel) => Math.round(channel / 16) * 16) as [number, number, number]),
  );
}

function parseHex(value: string): Rgb {
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function parseComputedColors(value: string): readonly Rgb[] {
  const colors: Rgb[] = [];
  for (const match of value.matchAll(
    /rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/gu,
  )) {
    if (Number(match[4] ?? '1') === 0) continue;
    const red = Number(match[1]);
    const green = Number(match[2]);
    const blue = Number(match[3]);
    if ([red, green, blue].every(Number.isFinite)) colors.push([red, green, blue]);
  }
  return colors;
}

export function semanticColorRole(color: Rgb): SemanticColorRole | undefined {
  const semantic = semanticColors
    .map((candidate) => ({ ...candidate, delta: perceptualDelta(color, candidate.color) }))
    .sort((left, right) => left.delta - right.delta)[0];
  return semantic !== undefined && semantic.delta < 8 ? semantic.role : undefined;
}

export function reconcileChangedPixels(
  input: Readonly<{
    changedPixels: number;
    attributedStylePixels: number;
    geometryPixels: number;
    assetContentPixels: number;
    noisePixels: number;
  }>,
): PixelAccounting {
  const classified =
    input.attributedStylePixels +
    input.geometryPixels +
    input.assetContentPixels +
    input.noisePixels;
  if (classified > input.changedPixels)
    throw new Error(
      `Visual pixel accounting exceeds changed pixels: ${String(classified)} > ${String(input.changedPixels)}`,
    );
  return { ...input, unresolvedPixels: input.changedPixels - classified };
}

export async function collectRenderedStyleInventory(
  page: Page,
  capture: VisualCapture,
  cdp?: CDPSession,
): Promise<readonly RenderedStyleOccurrence[]> {
  await page.evaluate('globalThis.__name = (target) => target');
  const raw = await page.evaluate(() => {
    type RawOccurrence = Readonly<{
      tag: string;
      text: string;
      selector: string;
      rect: { x: number; y: number; width: number; height: number };
      property: string;
      computedValue: string;
      pseudo?: '::before' | '::after';
    }>;
    const selectorFor = (element: Element): string => {
      const auditNode = element.getAttribute('data-visual-audit-node');
      if (auditNode !== null) return `[data-visual-audit-node=${JSON.stringify(auditNode)}]`;
      const parts: string[] = [];
      let current: Element | null = element;
      while (current !== null && parts.length < 5) {
        if (current.id !== '') {
          parts.unshift(`#${CSS.escape(current.id)}`);
          break;
        }
        const tag = current.tagName.toLowerCase();
        const parentElement: Element | null = current.parentElement;
        const siblings: Element[] =
          parentElement === null
            ? []
            : [...parentElement.children].filter(
                (candidate) => candidate.tagName === current?.tagName,
              );
        const position = siblings.indexOf(current);
        parts.unshift(`${tag}:nth-of-type(${String(position + 1)})`);
        current = parentElement;
      }
      return parts.join(' > ');
    };
    const hasOwnText = (element: Element): boolean =>
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0,
      ) || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'].includes(element.tagName);
    const visible = (element: Element, style: CSSStyleDeclaration): boolean => {
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0 &&
        element.getClientRects().length > 0
      );
    };
    const isPaintedColor = (value: string): boolean =>
      value !== '' &&
      value !== 'none' &&
      value !== 'transparent' &&
      !/rgba\([^)]*,\s*0\s*\)$/u.test(value);
    const entries: RawOccurrence[] = [];
    const inspect = (
      element: Element,
      style: CSSStyleDeclaration,
      pseudo?: '::before' | '::after',
    ): void => {
      const rect = element.getBoundingClientRect();
      const base = {
        tag: element.tagName.toLowerCase(),
        text:
          element.getAttribute('aria-label') ??
          element.getAttribute('alt') ??
          (element.textContent ?? '').trim().replace(/\s+/gu, ' ').slice(0, 120),
        selector: selectorFor(element),
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y + window.scrollY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        ...(pseudo === undefined ? {} : { pseudo }),
      };
      const add = (property: string, computedValue: string): void => {
        if (isPaintedColor(computedValue)) entries.push({ ...base, property, computedValue });
      };
      if (
        (pseudo === undefined && hasOwnText(element)) ||
        (pseudo !== undefined && style.content !== 'none')
      )
        add('color', style.color);
      add('background-color', style.backgroundColor);
      if (style.backgroundImage !== 'none') add('background-image', style.backgroundImage);
      if (style.boxShadow !== 'none') add('box-shadow', style.boxShadow);
      if (style.textShadow !== 'none') add('text-shadow', style.textShadow);
      if (style.borderTopStyle !== 'none' && Number.parseFloat(style.borderTopWidth) > 0)
        add('border-top-color', style.borderTopColor);
      if (style.borderRightStyle !== 'none' && Number.parseFloat(style.borderRightWidth) > 0)
        add('border-right-color', style.borderRightColor);
      if (style.borderBottomStyle !== 'none' && Number.parseFloat(style.borderBottomWidth) > 0)
        add('border-bottom-color', style.borderBottomColor);
      if (style.borderLeftStyle !== 'none' && Number.parseFloat(style.borderLeftWidth) > 0)
        add('border-left-color', style.borderLeftColor);
      if (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0)
        add('outline-color', style.outlineColor);
      if (style.textDecorationLine !== 'none')
        add('text-decoration-color', style.textDecorationColor);
      if (element instanceof SVGElement) {
        add('fill', style.fill);
        if (style.stroke !== 'none' && Number.parseFloat(style.strokeWidth) > 0)
          add('stroke', style.stroke);
      }
    };
    let auditNode = 0;
    for (const element of document.querySelectorAll('*')) {
      element.setAttribute('data-visual-audit-node', String(auditNode));
      auditNode += 1;
      const style = getComputedStyle(element);
      if (!visible(element, style)) continue;
      inspect(element, style);
      for (const pseudo of ['::before', '::after'] as const) {
        const pseudoStyle = getComputedStyle(element, pseudo);
        if (pseudoStyle.content !== 'none' || isPaintedColor(pseudoStyle.backgroundColor))
          inspect(element, pseudoStyle, pseudo);
      }
    }
    return entries;
  });
  const occurrences = raw
    .flatMap((entry): readonly RenderedStyleOccurrence[] => {
      const seen = new Set<string>();
      return parseComputedColors(entry.computedValue).flatMap((color) => {
        const semanticRole = semanticColorRole(color);
        const resolvedColor = rgbToHex(...color);
        if (semanticRole === undefined || seen.has(`${semanticRole}:${resolvedColor}`)) return [];
        seen.add(`${semanticRole}:${resolvedColor}`);
        return [
          {
            route: capture.route,
            viewport: capture.viewport.class,
            state: capture.state,
            ...entry,
            resolvedColor,
            semanticRole,
          },
        ];
      });
    })
    .sort(
      (left, right) =>
        left.route.localeCompare(right.route) ||
        left.viewport.localeCompare(right.viewport) ||
        left.state.localeCompare(right.state) ||
        left.selector.localeCompare(right.selector) ||
        (left.pseudo ?? '').localeCompare(right.pseudo ?? '') ||
        left.property.localeCompare(right.property),
    );
  if (cdp === undefined) return occurrences;
  const enriched: RenderedStyleOccurrence[] = [];
  for (const occurrence of occurrences) {
    if (occurrence.semanticRole !== 'gold') {
      enriched.push(occurrence);
      continue;
    }
    const attribution = await inspectCdpAttribution(
      cdp,
      {
        tag: occurrence.tag,
        text: occurrence.text,
        selector: occurrence.selector,
        rect: occurrence.rect,
      },
      {
        property: occurrence.property,
        computedValue: occurrence.computedValue,
        ...(occurrence.pseudo === undefined ? {} : { pseudo: occurrence.pseudo }),
        confidence: 'high',
        reason: 'Rendered-style inventory matched a visible semantic color.',
      },
    ).catch(() => undefined);
    enriched.push({
      ...occurrence,
      ...(attribution?.selector === undefined ? {} : { declarationSelector: attribution.selector }),
      ...(attribution?.sourceLine === undefined ? {} : { sourceLine: attribution.sourceLine }),
      ...(attribution?.value === undefined ? {} : { value: attribution.value }),
      ...(attribution?.token === undefined ? {} : { token: attribution.token }),
      ...(attribution?.confidence === undefined
        ? {}
        : { attributionConfidence: attribution.confidence }),
      ...(attribution?.reason === undefined ? {} : { attributionReason: attribution.reason }),
    });
  }
  return enriched;
}

function substitutionKey(reference: string, candidate: string): string {
  return `${reference}>${candidate}`;
}

export function isReportableSubstitution(substitution: ColorSubstitution): boolean {
  return substitution.reference !== substitution.candidate;
}

function isMasked(x: number, y: number, masks: readonly Rectangle[]): boolean {
  return masks.some(
    (mask) => x >= mask.x && y >= mask.y && x < mask.x + mask.width && y < mask.y + mask.height,
  );
}

function nearbyColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  target: Rgb,
  radius: number,
  threshold: number,
): boolean {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nextX = x + dx;
      const nextY = y + dy;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      if (perceptualDelta(colorAt(pixels, width, nextX, nextY), target) < threshold) return true;
    }
  }
  return false;
}

export function analyzePixelBuffers(input: PixelAuditInput): PixelAuditResult {
  const { width, height, reference, candidate } = input;
  if (reference.length !== width * height * 4 || candidate.length !== reference.length) {
    throw new Error('Pixel buffers do not match the declared dimensions');
  }
  const gridWidth = Math.ceil(width / input.cellSize);
  const gridHeight = Math.ceil(height / input.cellSize);
  const changedCells = new Uint8Array(gridWidth * gridHeight);
  const colorCells = new Uint32Array(gridWidth * gridHeight);
  const geometryCells = new Uint32Array(gridWidth * gridHeight);
  const cellPairCandidates: string[] = [];
  const cellPairVotes = new Int16Array(gridWidth * gridHeight);
  const substitutions = new Map<
    string,
    {
      referenceTotals: [number, number, number];
      candidateTotals: [number, number, number];
      pixels: number;
      delta: number;
    }
  >();
  let comparedPixels = 0;
  let maskedPixels = 0;
  let changedPixels = 0;
  let geometryPixels = 0;
  let colorPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const globalY = y + input.offsetY;
      if (isMasked(x, globalY, input.masks)) {
        maskedPixels += 1;
        continue;
      }
      comparedPixels += 1;
      const referenceColor = colorAt(reference, width, x, y);
      const candidateColor = colorAt(candidate, width, x, y);
      const delta = perceptualDelta(referenceColor, candidateColor);
      if (delta < input.deltaThreshold) continue;
      changedPixels += 1;
      const displaced =
        nearbyColor(
          candidate,
          width,
          height,
          x,
          y,
          referenceColor,
          input.geometryRadius,
          input.deltaThreshold,
        ) &&
        nearbyColor(
          reference,
          width,
          height,
          x,
          y,
          candidateColor,
          input.geometryRadius,
          input.deltaThreshold,
        );
      const cell = Math.floor(y / input.cellSize) * gridWidth + Math.floor(x / input.cellSize);
      changedCells[cell] = 1;
      if (displaced) {
        geometryPixels += 1;
        geometryCells[cell] = (geometryCells[cell] ?? 0) + 1;
      } else {
        colorPixels += 1;
        colorCells[cell] = (colorCells[cell] ?? 0) + 1;
        const referenceHex = quantizedHex(referenceColor);
        const candidateHex = quantizedHex(candidateColor);
        const key = `${referenceHex}>${candidateHex}`;
        const currentCellPair = cellPairCandidates[cell];
        if (currentCellPair === undefined || cellPairVotes[cell] === 0) {
          cellPairCandidates[cell] = key;
          cellPairVotes[cell] = 1;
        } else if (currentCellPair === key) {
          cellPairVotes[cell] = (cellPairVotes[cell] ?? 0) + 1;
        } else {
          cellPairVotes[cell] = (cellPairVotes[cell] ?? 0) - 1;
        }
        const current = substitutions.get(key) ?? {
          referenceTotals: [0, 0, 0],
          candidateTotals: [0, 0, 0],
          pixels: 0,
          delta: 0,
        };
        current.referenceTotals[0] += referenceColor[0];
        current.referenceTotals[1] += referenceColor[1];
        current.referenceTotals[2] += referenceColor[2];
        current.candidateTotals[0] += candidateColor[0];
        current.candidateTotals[1] += candidateColor[1];
        current.candidateTotals[2] += candidateColor[2];
        current.pixels += 1;
        current.delta += delta;
        substitutions.set(key, current);
      }
    }
  }

  const visited = new Uint8Array(changedCells.length);
  const regions: PixelRegion[] = [];
  for (let index = 0; index < changedCells.length; index += 1) {
    if (changedCells[index] !== 1 || visited[index] === 1) continue;
    const queue = [index];
    visited[index] = 1;
    let cursor = 0;
    let minX = gridWidth;
    let maxX = 0;
    let minY = gridHeight;
    let maxY = 0;
    let regionColor = 0;
    let regionGeometry = 0;
    const regionPairs = new Map<string, number>();
    const seedIsGeometry = (geometryCells[index] ?? 0) > (colorCells[index] ?? 0);
    const seedPair = cellPairCandidates[index];
    while (cursor < queue.length) {
      const cell = queue[cursor];
      cursor += 1;
      if (cell === undefined) continue;
      const cellX = cell % gridWidth;
      const cellY = Math.floor(cell / gridWidth);
      minX = Math.min(minX, cellX);
      maxX = Math.max(maxX, cellX);
      minY = Math.min(minY, cellY);
      maxY = Math.max(maxY, cellY);
      regionColor += colorCells[cell] ?? 0;
      regionGeometry += geometryCells[cell] ?? 0;
      const pair = cellPairCandidates[cell];
      if (pair !== undefined)
        regionPairs.set(pair, (regionPairs.get(pair) ?? 0) + (colorCells[cell] ?? 0));
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nextX = cellX + dx;
          const nextY = cellY + dy;
          if (nextX < 0 || nextY < 0 || nextX >= gridWidth || nextY >= gridHeight) continue;
          const next = nextY * gridWidth + nextX;
          const nextIsGeometry = (geometryCells[next] ?? 0) > (colorCells[next] ?? 0);
          const compatible = seedIsGeometry
            ? nextIsGeometry
            : !nextIsGeometry && cellPairCandidates[next] === seedPair;
          if (changedCells[next] === 1 && visited[next] === 0 && compatible) {
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
    }
    const total = regionColor + regionGeometry;
    if (total === 0) continue;
    const x = minX * input.cellSize;
    const y = minY * input.cellSize + input.offsetY;
    const regionWidth = Math.min(width - x, (maxX - minX + 1) * input.cellSize);
    const localY = minY * input.cellSize;
    const regionHeight = Math.min(height - localY, (maxY - minY + 1) * input.cellSize);
    const dominantPair = [...regionPairs.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0]?.[0];
    const [referenceHex = '#000000', candidateHex = '#000000'] = dominantPair?.split('>') ?? [];
    const referenceColor = parseHex(referenceHex);
    const candidateColor = parseHex(candidateHex);
    const referenceRole = semanticColorRole(referenceColor);
    const candidateRole = semanticColorRole(candidateColor);
    regions.push({
      x,
      y,
      width: regionWidth,
      height: regionHeight,
      changedPixels: total,
      colorPixels: regionColor,
      geometryPixels: regionGeometry,
      type: regionColor >= regionGeometry ? 'color' : 'geometry',
      referenceColor: referenceHex,
      candidateColor: candidateHex,
      ...(referenceRole === undefined ? {} : { referenceRole }),
      ...(candidateRole === undefined ? {} : { candidateRole }),
      deltaE: Number(perceptualDelta(referenceColor, candidateColor).toFixed(2)),
    });
  }

  const regionsByPair = new Map<string, PixelRegion[]>();
  for (const region of regions) {
    const key = `${region.referenceColor}>${region.candidateColor}`;
    const entries = regionsByPair.get(key) ?? [];
    entries.push(region);
    regionsByPair.set(key, entries);
  }
  const boxGap = (left: PixelRegion, right: PixelRegion): number => {
    const horizontal = Math.max(
      0,
      left.x - (right.x + right.width),
      right.x - (left.x + left.width),
    );
    const vertical = Math.max(
      0,
      left.y - (right.y + right.height),
      right.y - (left.y + left.height),
    );
    return Math.hypot(horizontal, vertical);
  };
  const classifiedRegions = regions.map((region) => {
    if (region.type === 'geometry') return region;
    const reversed = regionsByPair.get(`${region.candidateColor}>${region.referenceColor}`) ?? [];
    return reversed.some((candidate) => candidate !== region && boxGap(region, candidate) <= 32)
      ? { ...region, type: 'geometry' as const }
      : region;
  });

  return {
    comparedPixels,
    maskedPixels,
    changedPixels,
    geometryPixels,
    colorPixels,
    regions: classifiedRegions.sort(
      (left, right) =>
        right.changedPixels - left.changedPixels || left.y - right.y || left.x - right.x,
    ),
    substitutions: [...substitutions.values()]
      .map((entry) => ({
        reference: rgbToHex(
          ...(entry.referenceTotals.map((value) => value / entry.pixels) as [
            number,
            number,
            number,
          ]),
        ),
        candidate: rgbToHex(
          ...(entry.candidateTotals.map((value) => value / entry.pixels) as [
            number,
            number,
            number,
          ]),
        ),
        pixels: entry.pixels,
        deltaE: Number((entry.delta / entry.pixels).toFixed(2)),
      }))
      .map((entry) => {
        const referenceRole = semanticColorRole(parseHex(entry.reference));
        const candidateRole = semanticColorRole(parseHex(entry.candidate));
        return {
          ...entry,
          ...(referenceRole === undefined ? {} : { referenceRole }),
          ...(candidateRole === undefined ? {} : { candidateRole }),
        };
      })
      .filter(({ pixels }) => pixels >= 4)
      .sort(
        (left, right) =>
          right.pixels - left.pixels ||
          left.reference.localeCompare(right.reference) ||
          left.candidate.localeCompare(right.candidate),
      ),
  };
}

function severityFor(pixels: number, routes = 1): FindingSeverity {
  if (pixels >= 10_000 || routes >= 5) return 'P0';
  if (pixels >= 2_000 || routes >= 3) return 'P1';
  if (pixels >= 200) return 'P2';
  return 'P3';
}

function findingRootKey(finding: VisualFinding): string {
  const attribution = finding.attribution;
  return [
    attribution?.property ?? finding.type,
    attribution?.computedValue ?? finding.candidateColor,
    attribution?.selector ?? finding.element?.selector ?? 'unattributed',
    attribution?.token ?? '',
  ].join('|');
}

export function groupVisualFindings(findings: readonly VisualFinding[]): FindingGroup[] {
  const grouped = new Map<string, VisualFinding[]>();
  for (const finding of findings) {
    if (
      finding.type !== 'color' ||
      finding.attribution === undefined ||
      finding.attribution.confidence === 'low'
    )
      continue;
    const key = findingRootKey(finding);
    const values = grouped.get(key) ?? [];
    values.push(finding);
    grouped.set(key, values);
  }
  return [...grouped.entries()]
    .map(([key, values]) => {
      const first = values[0];
      if (first === undefined) throw new Error('Visual group cannot be empty');
      const routes = [...new Set(values.map(({ route }) => route))].sort();
      const pixels = values.reduce((sum, { changedPixels }) => sum + changedPixels, 0);
      const verifiedPixels = values.reduce((sum, { verifiedPixels }) => sum + verifiedPixels, 0);
      const attribution = first.attribution;
      return {
        id: `cause-${createHash('sha256').update(key).digest('hex').slice(0, 12)}`,
        property: attribution?.property ?? first.type,
        candidateValue: attribution?.computedValue ?? first.candidateColor,
        selector: attribution?.selector ?? first.element?.selector ?? 'unattributed',
        ...(attribution?.token === undefined ? {} : { token: attribution.token }),
        routes,
        findingIds: values.map(({ id }) => id).sort(),
        changedPixels: pixels,
        verifiedPixels,
        severity: severityFor(verifiedPixels, routes.length),
      };
    })
    .sort(
      (left, right) =>
        left.severity.localeCompare(right.severity) ||
        right.changedPixels - left.changedPixels ||
        left.id.localeCompare(right.id),
    );
}

function filteredManifest(
  manifest: VisualBaselineManifest,
  captures: readonly VisualCapture[],
): VisualBaselineManifest {
  return { ...manifest, captures };
}

async function auditCaptures(
  repositoryRoot: string,
  filters: Readonly<Record<string, string>>,
): Promise<readonly AuditCapture[]> {
  const defaultRoot = visualBaselineRootForRoute(repositoryRoot, '/');
  const propertyRoot = visualBaselineRootForRoute(repositoryRoot, '/property-management');
  const [defaults, property] = await Promise.all([
    loadVisualBaselineManifest(defaultRoot),
    loadVisualBaselineManifest(propertyRoot),
  ]);
  const combined = [
    ...defaults.captures
      .filter(({ route }) => route !== '/property-management')
      .map((capture) => ({ capture, baselineRoot: defaultRoot })),
    ...property.captures.map((capture) => ({ capture, baselineRoot: propertyRoot })),
  ];
  return combined.filter(({ capture }) => {
    if (filters['route'] !== undefined && capture.route !== filters['route']) return false;
    if (filters['viewport'] !== undefined && capture.viewport.class !== filters['viewport'])
      return false;
    if (filters['state'] !== undefined && capture.state !== filters['state']) return false;
    return true;
  });
}

async function settlePage(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);
  await page.evaluate('globalThis.__name = (target) => target');
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(innerHeight, 1);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    scrollTo(0, 0);
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
}

export async function applyState(page: Page, capture: VisualCapture): Promise<void> {
  if (capture.state === 'page') return;
  let target: Locator | undefined;
  let description: string | undefined;
  if (capture.state.includes('mobile-menu-open')) {
    target = page.getByRole('button', { name: /toggle menu/i }).first();
    description = 'mobile menu toggle button';
  } else if (capture.state.includes('listings-sold')) {
    target = page.getByRole('tab', { name: /sold/i }).first();
    description = 'Sold listings tab';
  } else if (capture.state.includes('listings-active')) {
    target = page.getByRole('tab', { name: /active/i }).first();
    description = 'Active listings tab';
  } else if (capture.state.includes('faq-open')) {
    target = page.locator('details > summary').first();
    description = 'first FAQ summary';
  }
  if (target !== undefined && description !== undefined) {
    if ((await target.count()) === 0)
      throw new Error(
        `State recipe ${capture.state} could not find ${description} on ${capture.route}`,
      );
    await target.click();
  }
  await page.waitForTimeout(150);
}

async function captureStates(
  baseUrl: string,
  outputRoot: string,
  captures: readonly VisualCapture[],
  storageState?: string,
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const capture of captures.filter(({ state }) => state !== 'page')) {
      const context = await browser.newContext({
        viewport: { width: capture.viewport.width, height: capture.viewport.height },
        reducedMotion: 'reduce',
        ...(storageState === undefined ? {} : { storageState }),
      });
      const page = await context.newPage();
      try {
        await page.goto(new URL(capture.route, baseUrl).href, { waitUntil: 'domcontentloaded' });
        await settlePage(page);
        await applyState(page, capture);
        const output = path.join(outputRoot, capture.file);
        await mkdir(path.dirname(output), { recursive: true });
        await page.screenshot({ path: output, type: 'jpeg', quality: 92, animations: 'disabled' });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

async function captureSite(
  baseUrl: string,
  outputRoot: string,
  manifest: VisualBaselineManifest,
  storageState?: string,
): Promise<void> {
  await captureVisualCandidates(
    baseUrl,
    outputRoot,
    manifest,
    storageState === undefined ? {} : { storageState },
  );
  await captureStates(baseUrl, outputRoot, manifest.captures, storageState);
}

class BrowserImageDecoder {
  readonly browser: Promise<Browser>;

  constructor() {
    this.browser = chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
  }

  async dimensions(file: string): Promise<Readonly<{ width: number; height: number }>> {
    return jpegDimensions(await readFile(file));
  }

  async slice(file: string, y: number, height: number): Promise<Uint8ClampedArray> {
    const browser = await this.browser;
    const page = await browser.newPage();
    try {
      await page.goto(pathToFileURL(file).href);
      const encoded = await page.evaluate(
        ({ offsetY, sliceHeight }) => {
          const image = document.querySelector('img');
          if (!(image instanceof HTMLImageElement)) throw new Error('Audit image is unavailable');
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = sliceHeight;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (context === null) throw new Error('Canvas context is unavailable');
          context.drawImage(
            image,
            0,
            offsetY,
            image.naturalWidth,
            sliceHeight,
            0,
            0,
            image.naturalWidth,
            sliceHeight,
          );
          const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let binary = '';
          const chunk = 0x8000;
          for (let index = 0; index < bytes.length; index += chunk) {
            binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
          }
          return btoa(binary);
        },
        { offsetY: y, sliceHeight: height },
      );
      return new Uint8ClampedArray(Buffer.from(encoded, 'base64'));
    } finally {
      await page.close();
    }
  }

  async render(
    sourceFile: string,
    outputFile: string,
    region?: PixelRegion,
    overlays: readonly PixelRegion[] = [],
  ): Promise<void> {
    const browser = await this.browser;
    const page = await browser.newPage();
    try {
      await page.goto(pathToFileURL(sourceFile).href);
      const data = await page.evaluate(
        ({ area, boxes }) => {
          const image = document.querySelector('img');
          if (!(image instanceof HTMLImageElement))
            throw new Error('Evidence image is unavailable');
          const crop = area ?? {
            x: 0,
            y: 0,
            width: image.naturalWidth,
            height: image.naturalHeight,
          };
          const canvas = document.createElement('canvas');
          canvas.width = crop.width;
          canvas.height = crop.height;
          const context = canvas.getContext('2d');
          if (context === null) throw new Error('Canvas context is unavailable');
          context.drawImage(
            image,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height,
          );
          context.lineWidth = area === undefined ? 2 : 3;
          for (const box of boxes) {
            context.fillStyle = box.type === 'color' ? '#ff006e33' : '#ffbe0b33';
            context.strokeStyle = box.type === 'color' ? '#ff006e' : '#ffbe0b';
            const x = box.x - crop.x;
            const y = box.y - crop.y;
            context.fillRect(x, y, box.width, box.height);
            context.strokeRect(
              x + 1,
              y + 1,
              Math.max(1, box.width - 2),
              Math.max(1, box.height - 2),
            );
          }
          return canvas.toDataURL('image/png').split(',')[1] ?? '';
        },
        {
          area:
            region === undefined
              ? undefined
              : {
                  x: Math.max(0, region.x - 12),
                  y: Math.max(0, region.y - 12),
                  width: region.width + 24,
                  height: region.height + 24,
                },
          boxes: region === undefined ? overlays : [region],
        },
      );
      await mkdir(path.dirname(outputFile), { recursive: true });
      await writeFile(outputFile, Buffer.from(data, 'base64'));
    } finally {
      await page.close();
    }
  }

  async renderRegions(
    sourceFile: string,
    entries: readonly Readonly<{
      outputFile: string;
      region: PixelRegion;
      highlight?: boolean;
    }>[],
  ): Promise<void> {
    if (entries.length === 0) return;
    const browser = await this.browser;
    const page = await browser.newPage();
    try {
      await page.goto(pathToFileURL(sourceFile).href);
      for (let offset = 0; offset < entries.length; offset += 40) {
        const batch = entries.slice(offset, offset + 40);
        const encoded = await page.evaluate(
          (regions) => {
            const image = document.querySelector('img');
            if (!(image instanceof HTMLImageElement))
              throw new Error('Evidence image is unavailable');
            return regions.map(({ region, highlight }) => {
              const crop = {
                x: Math.max(0, region.x - 12),
                y: Math.max(0, region.y - 12),
                width: region.width + 24,
                height: region.height + 24,
              };
              const canvas = document.createElement('canvas');
              canvas.width = crop.width;
              canvas.height = crop.height;
              const context = canvas.getContext('2d');
              if (context === null) throw new Error('Canvas context is unavailable');
              context.drawImage(
                image,
                crop.x,
                crop.y,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height,
              );
              if (highlight) {
                context.fillStyle = region.type === 'color' ? '#ff006e33' : '#ffbe0b33';
                context.strokeStyle = region.type === 'color' ? '#ff006e' : '#ffbe0b';
                context.lineWidth = 3;
                context.fillRect(0, 0, crop.width, crop.height);
                context.strokeRect(
                  1.5,
                  1.5,
                  Math.max(1, crop.width - 3),
                  Math.max(1, crop.height - 3),
                );
              }
              return canvas.toDataURL('image/png').split(',')[1] ?? '';
            });
          },
          batch.map(({ region, highlight = true }) => ({ region, highlight })),
        );
        await Promise.all(
          batch.map(async ({ outputFile }, index) => {
            const data = encoded[index];
            if (data === undefined) throw new Error(`Missing rendered evidence for ${outputFile}`);
            await mkdir(path.dirname(outputFile), { recursive: true });
            await writeFile(outputFile, Buffer.from(data, 'base64'));
          }),
        );
      }
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await (await this.browser).close();
  }
}

async function inspectCdpAttribution(
  cdp: CDPSession,
  element: ElementEvidence,
  attribution: CssAttribution,
): Promise<Partial<CssAttribution> | undefined> {
  const cache = cdpAttributionCache.get(cdp) ?? new Map<string, Partial<CssAttribution> | null>();
  cdpAttributionCache.set(cdp, cache);
  const cacheKey = `${element.selector}|${attribution.pseudo ?? ''}|${attribution.property}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? undefined;
  let documentRoot = cdpDocumentRoots.get(cdp);
  if (documentRoot === undefined) {
    await Promise.all([cdp.send('DOM.enable'), cdp.send('CSS.enable')]);
    const document = await cdp.send('DOM.getDocument', { depth: 1, pierce: true });
    documentRoot = document.root.nodeId;
    cdpDocumentRoots.set(cdp, documentRoot);
  }
  const resolved = await cdp.send('DOM.querySelector', {
    nodeId: documentRoot,
    selector: element.selector,
  });
  if (resolved.nodeId === 0) {
    cache.set(cacheKey, null);
    return undefined;
  }
  const styles = await cdp.send('CSS.getMatchedStylesForNode', { nodeId: resolved.nodeId });
  const pseudoType = attribution.pseudo?.slice(2);
  const matches =
    pseudoType === undefined
      ? (styles.matchedCSSRules ?? [])
      : ((styles.pseudoElements ?? []).find(({ pseudoType: candidate }) => candidate === pseudoType)
          ?.matches ?? []);
  for (const match of [...matches].reverse()) {
    const declaration = [...match.rule.style.cssProperties]
      .reverse()
      .find(
        ({ name, disabled }) =>
          disabled !== true &&
          (name === attribution.property ||
            (attribution.property.startsWith('border-') && name === 'border') ||
            (attribution.property.startsWith('background-') && name === 'background')),
      );
    if (declaration === undefined) continue;
    const value = declaration.value;
    const token = /var\((--[\w-]+)/.exec(value)?.[1];
    const range = declaration.range ?? match.rule.style.range;
    const result: Partial<CssAttribution> = {
      selector: match.rule.selectorList.text,
      ...(range === undefined ? {} : { sourceLine: range.startLine + 1 }),
      value,
      ...(token === undefined ? {} : { token }),
      confidence: 'high',
      reason:
        'Chromium CSS domain resolved the rendered property to the winning matched declaration.',
    };
    cache.set(cacheKey, result);
    return result;
  }
  const result: Partial<CssAttribution> = {
    confidence: attribution.confidence === 'high' ? 'medium' : attribution.confidence,
    reason:
      'Chromium CSS domain confirmed the element but could not resolve a winning author declaration.',
    ambiguity:
      attribution.ambiguity ?? 'The property may be inherited, composited, or shorthand-owned.',
  };
  cache.set(cacheKey, result);
  return result;
}

export async function inspectVisualRegion(
  page: Page,
  region: PixelRegion,
  capture: VisualCapture,
  cdp?: CDPSession,
): Promise<Readonly<{ element?: ElementEvidence; attribution?: CssAttribution }>> {
  const fractions = [
    [0.5, 0.5],
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.8, 0.8],
  ] as const;
  const points = fractions.map(([x, y]) => ({
    x: Math.max(0, Math.min(capture.viewport.width - 1, Math.floor(region.x + region.width * x))),
    documentY: capture.tile.y + region.y + region.height * y,
  }));
  const globalY = points[0]?.documentY ?? capture.tile.y + region.y;
  await page.evaluate((targetY) => scrollTo(0, Math.max(0, targetY - innerHeight / 2)), globalY);
  const result = (await page.evaluate(
    ({ points: samplePoints, candidateColor }) => {
      const escape = (value: string): string => CSS.escape(value);
      const selectorFor = (target: Element): string => {
        if (target.id.length > 0) return `#${escape(target.id)}`;
        const parts: string[] = [];
        let current: Element | null = target;
        while (current !== null && parts.length < 5) {
          let part = current.tagName.toLowerCase();
          const classes = [...current.classList].slice(0, 2);
          if (classes.length > 0) part += classes.map((name) => `.${escape(name)}`).join('');
          const parent: Element | null = current.parentElement;
          if (parent !== null) {
            const siblings = [...parent.children].filter(
              (child) => child.tagName === current?.tagName,
            );
            if (siblings.length > 1)
              part += `:nth-of-type(${String(siblings.indexOf(current) + 1)})`;
          }
          parts.unshift(part);
          current = parent;
        }
        return parts.join(' > ');
      };
      const sampled = samplePoints
        .map(({ x, documentY }, index) => {
          const element = document.elementFromPoint(x, documentY - scrollY);
          return element instanceof Element
            ? { element, selector: selectorFor(element), index }
            : undefined;
        })
        .filter((value): value is NonNullable<typeof value> => value !== undefined);
      const occurrences = new Map<string, { count: number; index: number; element: Element }>();
      for (const sample of sampled) {
        const current = occurrences.get(sample.selector);
        occurrences.set(sample.selector, {
          count: (current?.count ?? 0) + 1,
          index: current?.index ?? sample.index,
          element: current?.element ?? sample.element,
        });
      }
      const element = [...occurrences.values()].sort(
        (left, right) => right.count - left.count || left.index - right.index,
      )[0]?.element;
      if (element === undefined) return {};
      const selectedSamples = sampled.filter((sample) => sample.element === element);
      const directTextPaintedAtSample = selectedSamples.some((sample) => {
        const clientY = samplePoints[sample.index]?.documentY ?? 0;
        const pointY = clientY - scrollY;
        return [...element.childNodes].some((node) => {
          if (!(node instanceof Text) || node.data.trim().length === 0) return false;
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...range.getClientRects()].some(
            (textRect) =>
              samplePoints[sample.index] !== undefined &&
              (samplePoints[sample.index]?.x ?? 0) >= textRect.left &&
              (samplePoints[sample.index]?.x ?? 0) <= textRect.right &&
              pointY >= textRect.top &&
              pointY <= textRect.bottom,
          );
        });
      });
      const rect = element.getBoundingClientRect();
      const elementEvidence = {
        tag: element.tagName.toLowerCase(),
        text: (element.getAttribute('aria-label') ?? element.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160),
        selector: selectorFor(element),
        rect: { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height },
      };
      if (['img', 'video', 'canvas'].includes(elementEvidence.tag)) {
        return { element: elementEvidence };
      }
      let computed = getComputedStyle(element);
      const textPaintIsEligible =
        directTextPaintedAtSample ||
        ['input', 'textarea', 'select', 'option'].includes(elementEvidence.tag);
      const svgPaintIsEligible =
        element instanceof SVGElement || element.closest('svg') === element;
      const properties = [
        'background-color',
        ...(svgPaintIsEligible ? ['fill', 'stroke'] : []),
        ...(textPaintIsEligible ? ['color', 'text-decoration-color'] : []),
        ...(computed.borderTopStyle !== 'none' && Number.parseFloat(computed.borderTopWidth) > 0
          ? ['border-top-color']
          : []),
        ...(computed.borderRightStyle !== 'none' && Number.parseFloat(computed.borderRightWidth) > 0
          ? ['border-right-color']
          : []),
        ...(computed.borderBottomStyle !== 'none' &&
        Number.parseFloat(computed.borderBottomWidth) > 0
          ? ['border-bottom-color']
          : []),
        ...(computed.borderLeftStyle !== 'none' && Number.parseFloat(computed.borderLeftWidth) > 0
          ? ['border-left-color']
          : []),
        ...(computed.outlineStyle !== 'none' && Number.parseFloat(computed.outlineWidth) > 0
          ? ['outline-color']
          : []),
        ...(computed.boxShadow === 'none' ? [] : ['box-shadow']),
        ...(computed.backgroundImage === 'none' ? [] : ['background-image']),
        ...(computed.filter === 'none' ? [] : ['filter']),
      ];
      let property = properties[0] ?? 'background-color';
      let computedValue = computed.getPropertyValue(property);
      let pseudo: '::before' | '::after' | undefined;
      let matchedPresentation = false;
      const target = [
        Number.parseInt(candidateColor.slice(1, 3), 16),
        Number.parseInt(candidateColor.slice(3, 5), 16),
        Number.parseInt(candidateColor.slice(5, 7), 16),
      ];
      for (const owner of [undefined, '::before', '::after'] as const) {
        const ownerStyle = owner === undefined ? computed : getComputedStyle(element, owner);
        for (const name of properties) {
          const value = ownerStyle.getPropertyValue(name);
          const match = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?/.exec(value);
          if (match !== null) {
            const alpha = match[4] === undefined ? 1 : Number(match[4]);
            if (alpha <= 0.05) continue;
            const rendered = [Number(match[1]), Number(match[2]), Number(match[3])];
            const distance = Math.hypot(
              (rendered[0] ?? 0) - (target[0] ?? 0),
              (rendered[1] ?? 0) - (target[1] ?? 0),
              (rendered[2] ?? 0) - (target[2] ?? 0),
            );
            if (distance <= 24) {
              property = name;
              computedValue = value;
              computed = ownerStyle;
              pseudo = owner;
              matchedPresentation = true;
              break;
            }
          }
        }
        if (matchedPresentation) break;
      }
      type Rule = {
        selector: string;
        stylesheet: string;
        sourceLine?: number;
        value: string;
        token?: string;
      };
      const matched: Rule[] = [];
      const visit = (rules: CSSRuleList, stylesheet: string, source: string): void => {
        for (const rule of [...rules]) {
          if (rule instanceof CSSStyleRule) {
            if (pseudo !== undefined && !rule.selectorText.includes(pseudo)) continue;
            if (pseudo === undefined && /::(?:before|after)/.test(rule.selectorText)) continue;
            const matchSelector = rule.selectorText.replaceAll(/::(?:before|after)/g, '');
            try {
              if (!element.matches(matchSelector)) continue;
            } catch {
              continue;
            }
            const value = rule.style.getPropertyValue(property);
            if (value.length === 0) continue;
            const token = /var\((--[\w-]+)/.exec(value)?.[1];
            const index = source.indexOf(rule.selectorText);
            matched.push({
              selector: rule.selectorText,
              stylesheet,
              ...(index < 0 ? {} : { sourceLine: source.slice(0, index).split('\n').length }),
              value,
              ...(token === undefined ? {} : { token }),
            });
          } else if (rule instanceof CSSGroupingRule) {
            try {
              visit(rule.cssRules, stylesheet, source);
            } catch {
              /* inaccessible nested rule */
            }
          }
        }
      };
      const auditWindow = window as unknown as {
        __visualAuditStyleSources?: Record<string, string>;
      };
      const styleSources = auditWindow.__visualAuditStyleSources ?? {};
      auditWindow.__visualAuditStyleSources = styleSources;
      return Promise.all(
        [...document.styleSheets].map(async (sheet) => {
          let source = '';
          if (sheet.href !== null) {
            const cached = styleSources[sheet.href];
            source =
              cached ??
              (await fetch(sheet.href)
                .then((response) => response.text())
                .catch(() => ''));
            styleSources[sheet.href] = source;
          }
          try {
            visit(sheet.cssRules, sheet.href ?? '[inline]', source);
          } catch {
            /* inaccessible sheet */
          }
        }),
      ).then(() => {
        const selected = matched.at(-1);
        return {
          element: elementEvidence,
          attribution: {
            property,
            computedValue,
            ...(selected === undefined ? {} : selected),
            ...(pseudo === undefined ? {} : { pseudo }),
            confidence: !matchedPresentation
              ? 'low'
              : matched.length === 1
                ? 'high'
                : selected === undefined
                  ? 'low'
                  : 'medium',
            reason: matchedPresentation
              ? selected === undefined
                ? 'Rendered property matched the candidate color but no author declaration was resolved.'
                : 'Rendered property matched the candidate color and an author declaration participates in the cascade.'
              : 'No rendered presentation property matched the candidate color within tolerance.',
            ...(matched.length <= 1
              ? {}
              : {
                  ambiguity: `${String(matched.length)} matching declarations participate in the cascade`,
                }),
          },
        };
      });
    },
    { points, candidateColor: region.candidateColor },
  )) as Readonly<{ element?: ElementEvidence; attribution?: CssAttribution }>;
  if (
    result.element === undefined ||
    result.attribution === undefined ||
    result.attribution.confidence === 'low' ||
    cdp === undefined
  )
    return result;
  const cdpAttribution = await inspectCdpAttribution(cdp, result.element, result.attribution).catch(
    () => undefined,
  );
  return cdpAttribution === undefined
    ? result
    : { ...result, attribution: { ...result.attribution, ...cdpAttribution } };
}

function findingId(capture: VisualCapture, region: PixelRegion): string {
  return `visual-${createHash('sha256')
    .update(
      [
        capture.id,
        region.x,
        region.y,
        region.width,
        region.height,
        region.referenceColor,
        region.candidateColor,
        region.type,
      ].join(':'),
    )
    .digest('hex')
    .slice(0, 14)}`;
}

async function analyzeCapture(
  decoder: BrowserImageDecoder,
  referenceFile: string,
  candidateFile: string,
  capture: VisualCapture,
): Promise<Readonly<{ pixel: PixelAuditResult; regions: readonly PixelRegion[] }>> {
  const [referenceDimensions, candidateDimensions] = await Promise.all([
    decoder.dimensions(referenceFile),
    decoder.dimensions(candidateFile),
  ]);
  const width = Math.min(referenceDimensions.width, candidateDimensions.width);
  const height = Math.min(referenceDimensions.height, candidateDimensions.height);
  const aggregate = {
    comparedPixels: 0,
    maskedPixels: 0,
    changedPixels: 0,
    geometryPixels: 0,
    colorPixels: 0,
  };
  const regions: PixelRegion[] = [];
  const substitutions = new Map<string, ColorSubstitution>();
  for (let y = 0; y < height; y += 768) {
    const sliceHeight = Math.min(768, height - y);
    const [reference, candidate] = await Promise.all([
      decoder.slice(referenceFile, y, sliceHeight),
      decoder.slice(candidateFile, y, sliceHeight),
    ]);
    const result = analyzePixelBuffers({
      width,
      height: sliceHeight,
      reference,
      candidate,
      offsetY: y,
      masks: capture.masks,
      deltaThreshold: 4,
      geometryRadius: 2,
      cellSize: 4,
    });
    aggregate.comparedPixels += result.comparedPixels;
    aggregate.maskedPixels += result.maskedPixels;
    aggregate.changedPixels += result.changedPixels;
    aggregate.geometryPixels += result.geometryPixels;
    aggregate.colorPixels += result.colorPixels;
    regions.push(...result.regions);
    for (const substitution of result.substitutions) {
      const key = substitutionKey(substitution.reference, substitution.candidate);
      const [referenceColor = substitution.reference, candidateColor = substitution.candidate] =
        key.split('>');
      const current = substitutions.get(key);
      substitutions.set(
        key,
        current === undefined
          ? { ...substitution, reference: referenceColor, candidate: candidateColor }
          : {
              ...substitution,
              reference: referenceColor,
              candidate: candidateColor,
              pixels: current.pixels + substitution.pixels,
              deltaE: Number(
                (
                  (current.deltaE * current.pixels + substitution.deltaE * substitution.pixels) /
                  (current.pixels + substitution.pixels)
                ).toFixed(2),
              ),
            },
      );
    }
  }
  return {
    pixel: {
      ...aggregate,
      regions: regions.sort((a, b) => b.changedPixels - a.changedPixels),
      substitutions: [...substitutions.values()].sort((a, b) => b.pixels - a.pixels),
    },
    regions,
  };
}

async function interactiveSnapshot(
  page: Page,
): Promise<readonly Readonly<{ key: string; styles: Record<string, string> }>[]> {
  return page.evaluate(() => {
    const properties = [
      'color',
      'backgroundColor',
      'borderColor',
      'outlineColor',
      'boxShadow',
      'textDecorationColor',
    ];
    const occurrences = new Map<string, number>();
    return [...document.querySelectorAll('a,button,input,textarea,select,[tabindex]')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const label = (
          element.getAttribute('aria-label') ??
          element.textContent ??
          element.getAttribute('placeholder') ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120);
        const base = `${element.tagName.toLowerCase()}|${label}|${element.getAttribute('href') ?? ''}`;
        const occurrence = occurrences.get(base) ?? 0;
        occurrences.set(base, occurrence + 1);
        element.setAttribute('data-visual-audit-key', `${base}|${String(occurrence)}`);
        const computed = getComputedStyle(element);
        return {
          key: `${base}|${String(occurrence)}`,
          styles: Object.fromEntries(
            properties.map((property) => [
              property,
              computed[property as keyof CSSStyleDeclaration] as string,
            ]),
          ),
        };
      });
  });
}

async function auditInteractions(
  referencePage: Page,
  candidatePage: Page,
  route: string,
  viewport: AuditViewport,
): Promise<InteractiveDifference[]> {
  const output: InteractiveDifference[] = [];
  const [reference, candidate] = await Promise.all([
    interactiveSnapshot(referencePage),
    interactiveSnapshot(candidatePage),
  ]);
  const candidateKeys = new Map(candidate.map((entry) => [entry.key, entry]));
  for (const left of reference) {
    const right = candidateKeys.get(left.key);
    if (right === undefined) continue;
    for (const property of Object.keys(left.styles)) {
      if (left.styles[property] !== right.styles[property])
        output.push({
          route,
          viewport,
          key: left.key,
          state: 'default',
          property,
          reference: left.styles[property] ?? '',
          candidate: right.styles[property] ?? '',
        });
    }
    for (const state of ['hover', 'focus'] as const) {
      const referenceLocator = referencePage.locator(
        `[data-visual-audit-key=${JSON.stringify(left.key)}]`,
      );
      const candidateLocator = candidatePage.locator(
        `[data-visual-audit-key=${JSON.stringify(left.key)}]`,
      );
      if (state === 'hover')
        await Promise.all([referenceLocator.hover(), candidateLocator.hover()]);
      else await Promise.all([referenceLocator.focus(), candidateLocator.focus()]);
      const [leftStyles, rightStyles] = await Promise.all([
        referenceLocator.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            outlineColor: style.outlineColor,
            boxShadow: style.boxShadow,
            textDecorationColor: style.textDecorationColor,
          };
        }),
        candidateLocator.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            outlineColor: style.outlineColor,
            boxShadow: style.boxShadow,
            textDecorationColor: style.textDecorationColor,
          };
        }),
      ]);
      for (const property of Object.keys(leftStyles)) {
        const key = property as keyof typeof leftStyles;
        if (leftStyles[key] !== rightStyles[key])
          output.push({
            route,
            viewport,
            key: left.key,
            state,
            property,
            reference: leftStyles[key],
            candidate: rightStyles[key],
          });
      }
    }
  }
  return output;
}

function csv(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

async function writeReports(outputRoot: string, report: VisualAuditReport): Promise<void> {
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const csvRows: unknown[][] = [
    ['reference', 'candidate', 'referenceRole', 'candidateRole', 'deltaE', 'pixels', 'routes'],
  ];
  for (const substitution of report.substitutions)
    csvRows.push([
      substitution.reference,
      substitution.candidate,
      substitution.referenceRole,
      substitution.candidateRole,
      substitution.deltaE,
      substitution.pixels,
      substitution.routes.join(' '),
    ]);
  await writeFile(
    path.join(outputRoot, 'color-substitutions.csv'),
    `${csvRows.map((row) => row.map(csv).join(',')).join('\n')}\n`,
  );
  const styleRows: unknown[][] = [
    [
      'route',
      'viewport',
      'state',
      'semanticRole',
      'property',
      'computedValue',
      'resolvedColor',
      'tag',
      'text',
      'selector',
      'declarationSelector',
      'sourceLine',
      'value',
      'token',
      'attributionConfidence',
      'pseudo',
      'x',
      'y',
      'width',
      'height',
    ],
  ];
  for (const occurrence of report.renderedStyles)
    styleRows.push([
      occurrence.route,
      occurrence.viewport,
      occurrence.state,
      occurrence.semanticRole,
      occurrence.property,
      occurrence.computedValue,
      occurrence.resolvedColor,
      occurrence.tag,
      occurrence.text,
      occurrence.selector,
      occurrence.declarationSelector,
      occurrence.sourceLine,
      occurrence.value,
      occurrence.token,
      occurrence.attributionConfidence,
      occurrence.pseudo,
      occurrence.rect.x,
      occurrence.rect.y,
      occurrence.rect.width,
      occurrence.rect.height,
    ]);
  await writeFile(
    path.join(outputRoot, 'rendered-style-inventory.csv'),
    `${styleRows.map((row) => row.map(csv).join(',')).join('\n')}\n`,
  );
  const elementAccountingRows: unknown[][] = [
    [
      'route',
      'viewport',
      'state',
      'total',
      'accounted',
      'matched',
      'referenceOnly',
      'candidateOnly',
      'ignored',
      'ambiguous',
    ],
  ];
  const elementLedgerRows: unknown[][] = [
    [
      'route',
      'viewport',
      'state',
      'status',
      'evidence',
      'referenceTag',
      'referenceText',
      'referenceSelector',
      'referenceX',
      'referenceY',
      'referenceWidth',
      'referenceHeight',
      'candidateTag',
      'candidateText',
      'candidateSelector',
      'candidateX',
      'candidateY',
      'candidateWidth',
      'candidateHeight',
    ],
  ];
  const propertyRows: unknown[][] = [
    [
      'route',
      'viewport',
      'state',
      'category',
      'tag',
      'pseudo',
      'property',
      'referenceValue',
      'candidateValue',
      'selector',
      'token',
      'stylesheet',
      'sourceLine',
      'ambiguity',
    ],
  ];
  const sourceRows: unknown[][] = [
    ['route', 'viewport', 'state', 'property', 'selector', 'token', 'stylesheet', 'sourceLine'],
  ];
  for (const audit of report.elementAudits) {
    elementAccountingRows.push([
      audit.route,
      audit.viewport,
      audit.state,
      audit.accounting.total,
      audit.accounting.accounted,
      audit.accounting.matched,
      audit.accounting.referenceOnly,
      audit.accounting.candidateOnly,
      audit.accounting.ignored,
      audit.accounting.ambiguous,
    ]);
    for (const match of audit.matches)
      elementLedgerRows.push([
        audit.route,
        audit.viewport,
        audit.state,
        match.status,
        match.evidence,
        match.reference?.tag,
        match.reference?.ownText || match.reference?.accessibleName,
        match.reference?.selector,
        match.reference?.rect.x,
        match.reference?.rect.y,
        match.reference?.rect.width,
        match.reference?.rect.height,
        match.candidate?.tag,
        match.candidate?.ownText || match.candidate?.accessibleName,
        match.candidate?.selector,
        match.candidate?.rect.x,
        match.candidate?.rect.y,
        match.candidate?.rect.width,
        match.candidate?.rect.height,
      ]);
    for (const difference of audit.differences) {
      propertyRows.push([
        audit.route,
        audit.viewport,
        audit.state,
        difference.category,
        difference.tag,
        difference.pseudo,
        difference.property,
        difference.referenceValue,
        difference.candidateValue,
        difference.selector,
        difference.token,
        difference.stylesheet,
        difference.sourceLine,
        difference.ambiguity,
      ]);
      if (difference.selector !== undefined)
        sourceRows.push([
          audit.route,
          audit.viewport,
          audit.state,
          difference.property,
          difference.selector,
          difference.token,
          difference.stylesheet,
          difference.sourceLine,
        ]);
    }
  }
  await Promise.all([
    writeFile(
      path.join(outputRoot, 'element-accounting.csv'),
      `${elementAccountingRows.map((row) => row.map(csv).join(',')).join('\n')}\n`,
    ),
    writeFile(
      path.join(outputRoot, 'element-ledger.csv'),
      `${elementLedgerRows.map((row) => row.map(csv).join(',')).join('\n')}\n`,
    ),
    writeFile(
      path.join(outputRoot, 'property-differences.csv'),
      `${propertyRows.map((row) => row.map(csv).join(',')).join('\n')}\n`,
    ),
    writeFile(
      path.join(outputRoot, 'css-source-ledger.csv'),
      `${sourceRows.map((row) => row.map(csv).join(',')).join('\n')}\n`,
    ),
  ]);
  const goldOccurrences = report.renderedStyles.filter(
    ({ semanticRole }) => semanticRole === 'gold',
  );
  const totalElementNodes = report.elementAudits.reduce(
    (sum, audit) => sum + audit.accounting.total,
    0,
  );
  const accountedElementNodes = report.elementAudits.reduce(
    (sum, audit) => sum + audit.accounting.accounted,
    0,
  );
  const elementDifferences = report.elementAudits.reduce(
    (sum, audit) => sum + audit.differences.length,
    0,
  );
  const summary = `# Browser visual-difference audit\n\nSchema: **4**  \nEngine: **${report.engine}**  \nMode: **${report.mode}**  \nReference: \`${report.reference}\`  \nCandidate: \`${report.candidate}\`\n\n## Element audit\n\n- ${report.elementAudits.length} live element captures\n- ${accountedElementNodes.toLocaleString()} of ${totalElementNodes.toLocaleString()} visible nodes explicitly accounted for\n- ${elementDifferences.toLocaleString()} direct computed-property differences\n\n## Supporting pixel evidence\n\n- ${report.totals.captures} captures\n- ${report.totals.comparedPixels.toLocaleString()} compared pixels\n- ${report.totals.changedPixels.toLocaleString()} perceptually changed pixels\n- ${report.totals.colorPixels.toLocaleString()} color pixels\n- ${report.totals.geometryPixels.toLocaleString()} likely displacement pixels\n- ${report.findings.length} bounded findings\n- ${report.groups.length} verified grouped root causes\n- ${report.unattributedFindings.length} asset, ambiguous, or low-confidence findings retained outside prioritization\n- ${report.renderedStyles.length.toLocaleString()} rendered semantic style occurrences\n- ${goldOccurrences.length.toLocaleString()} visible gold occurrences independent of pixel alignment\n\n## Changed-pixel accounting\n\n- ${report.accounting.attributedStylePixels.toLocaleString()} attributed style pixels\n- ${report.accounting.geometryPixels.toLocaleString()} geometry pixels\n- ${report.accounting.assetContentPixels.toLocaleString()} asset/content pixels\n- ${report.accounting.noisePixels.toLocaleString()} explicitly classified noise pixels\n- ${report.accounting.unresolvedPixels.toLocaleString()} unresolved pixels\n\n## Visible candidate gold uses\n\n${goldOccurrences
    .slice(0, 100)
    .map(
      (entry) =>
        `- ${entry.route} (${entry.viewport}/${entry.state}) \`${entry.property}\` on \`${entry.selector}${entry.pseudo ?? ''}\`: ${entry.text || '[no label]'}`,
    )
    .join('\n')}\n\n## Highest-impact verified root causes\n\n${report.groups
    .slice(0, 50)
    .map(
      (group) =>
        `- **${group.severity}** \`${group.property}\` = \`${group.candidateValue}\` via \`${group.selector}\`${group.token === undefined ? '' : ` / \`${group.token}\``}: ${group.verifiedPixels.toLocaleString()} verified pixels across ${group.routes.join(', ')}`,
    )
    .join('\n')}\n\n## Dominant color substitutions\n\n${report.substitutions
    .slice(0, 50)
    .map(
      (entry) =>
        `- \`${entry.reference}\` → \`${entry.candidate}\`: ${entry.pixels.toLocaleString()} pixels (${entry.routes.join(', ')})`,
    )
    .join('\n')}\n`;
  await writeFile(path.join(outputRoot, 'summary.md'), summary);
  const payload = JSON.stringify(report).replaceAll('<', '\\u003c');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>TriCo visual audit</title><style>body{font-family:system-ui;margin:2rem;color:#0f1729}table{border-collapse:collapse;width:100%;margin-bottom:3rem}th,td{padding:.5rem;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}code{font-size:.8rem}.P0,.P1{font-weight:700;color:#b42318}input{padding:.6rem;width:24rem}.evidence a{margin-right:.5rem}</style></head><body><h1>TriCo visual audit</h1><p>${report.totals.changedPixels.toLocaleString()} changed pixels · ${report.findings.length} findings · ${report.groups.length} verified root causes · ${report.unattributedFindings.length} unprioritized</p><input id="filter" placeholder="Filter route, selector, token, color"><h2>Verified grouped root causes</h2><table><thead><tr><th>Priority</th><th>Routes</th><th>Property</th><th>Candidate</th><th>Selector/token</th><th>Verified pixels</th></tr></thead><tbody id="groups"></tbody></table><h2>All bounded findings</h2><table><thead><tr><th>Priority</th><th>Route/state</th><th>Colors</th><th>Element/rule</th><th>Confidence</th><th>Pixels</th><th>Evidence</th></tr></thead><tbody id="findings"></tbody></table><script>const report=${payload};const groups=document.querySelector('#groups');const findings=document.querySelector('#findings');const input=document.querySelector('#filter');const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function render(){const q=input.value.toLowerCase();groups.innerHTML=report.groups.filter(g=>JSON.stringify(g).toLowerCase().includes(q)).map(g=>\`<tr><td class="\${g.severity}">\${g.severity}</td><td>\${g.routes.join(', ')}</td><td><code>\${esc(g.property)}</code></td><td><code>\${esc(g.candidateValue)}</code></td><td><code>\${esc(g.selector)}\${g.token?' / '+esc(g.token):''}</code></td><td>\${g.verifiedPixels.toLocaleString()}</td></tr>\`).join('');findings.innerHTML=report.findings.filter(f=>JSON.stringify(f).toLowerCase().includes(q)).map(f=>\`<tr><td class="\${f.severity}">\${f.severity}</td><td>\${esc(f.route)}<br><small>\${esc(f.viewport)} / \${esc(f.state)}</small></td><td><code>\${esc(f.referenceColor)} (\${esc(f.referenceRole||'unclassified')}) → \${esc(f.candidateColor)} (\${esc(f.candidateRole||'unclassified')})</code></td><td>\${esc(f.element?.text||f.element?.selector||'unattributed')}<br><code>\${esc(f.attribution?.selector||'')}</code></td><td>\${esc(f.attribution?.confidence||'unattributed')}<br><small>\${esc(f.attribution?.reason||'')}</small></td><td>\${f.changedPixels.toLocaleString()}</td><td class="evidence">\${f.evidenceAvailable?'<a href="evidence/'+esc(f.id)+'/reference.png">reference</a><a href="evidence/'+esc(f.id)+'/candidate.png">candidate</a><a href="evidence/'+esc(f.id)+'/diff.png">diff</a>':'representative omitted'}</td></tr>\`).join('')}input.addEventListener('input',render);render();</script></body></html>`;
  await writeFile(path.join(outputRoot, 'report.html'), html);
}

function parseArguments(
  values: readonly string[],
): Readonly<{ command: string; flags: Readonly<Record<string, string>> }> {
  const command = values[0] ?? '';
  const flags: Record<string, string> = {};
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined || !value.startsWith('--'))
      throw new Error(`Unexpected argument: ${value ?? ''}`);
    const next = values[index + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`Missing value for ${value}`);
    flags[value.slice(2)] = next;
    index += 1;
  }
  return { command, flags };
}

async function authorize(flags: Readonly<Record<string, string>>): Promise<void> {
  const referenceUrl = flags['reference-url'] ?? 'https://preview--trico-home-harmony.lovable.app/';
  const stateFile = path.resolve(
    flags['storage-state'] ?? 'artifacts/visual-audit/auth/lovable.json',
  );
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    await page.goto(referenceUrl, { waitUntil: 'domcontentloaded' });
    await terminal.question(
      'Complete Lovable login in the opened browser, confirm the preview is visible, then press Enter here. ',
    );
    if (!page.url().startsWith(new URL(referenceUrl).origin))
      throw new Error(`Lovable preview is not open; current URL is ${page.url()}`);
    await mkdir(path.dirname(stateFile), { recursive: true });
    await context.storageState({ path: stateFile });
    await chmod(stateFile, 0o600);
    stdout.write(`Saved Lovable browser state to ${stateFile}\n`);
  } finally {
    terminal.close();
    await context.close();
    await browser.close();
  }
}

async function runAudit(
  mode: 'frozen' | 'live',
  flags: Readonly<Record<string, string>>,
): Promise<VisualAuditReport> {
  const repositoryRoot = path.resolve('.');
  const candidateUrl = flags['candidate-url'];
  const outputRoot = path.resolve(flags['output'] ?? 'artifacts/visual-audit/latest');
  if (candidateUrl === undefined) throw new Error(`${mode} audit requires --candidate-url`);
  const captures = await auditCaptures(repositoryRoot, flags);
  if (captures.length === 0) throw new Error('No visual captures match the requested filters');
  const template = await loadVisualBaselineManifest(
    visualBaselineRootForRoute(repositoryRoot, '/'),
  );
  const manifest = filteredManifest(
    template,
    captures.map(({ capture }) => capture),
  );
  const candidateRoot = path.join(outputRoot, 'captures/candidate');
  await captureSite(candidateUrl, candidateRoot, manifest);
  let referenceLabel = 'frozen dated Lovable baselines';
  let referenceRoot: string | undefined;
  const referenceUrl = flags['reference-url'];
  const storageState = path.resolve(
    flags['storage-state'] ?? 'artifacts/visual-audit/auth/lovable.json',
  );
  if (mode === 'live') {
    if (referenceUrl === undefined) throw new Error('live audit requires --reference-url');
    referenceLabel = referenceUrl;
    referenceRoot = path.join(outputRoot, 'captures/reference');
    await captureSite(referenceUrl, referenceRoot, manifest, storageState);
  }
  const decoder = new BrowserImageDecoder();
  const findings: VisualFinding[] = [];
  const renderedStyles: RenderedStyleOccurrence[] = [];
  const elementAudits: ElementAuditCapture[] = [];
  const elementAuditKeys = new Set<string>();
  const substitutions = new Map<
    string,
    {
      reference: string;
      candidate: string;
      referenceRole?: SemanticColorRole;
      candidateRole?: SemanticColorRole;
      pixels: number;
      deltaE: number;
      routes: Set<string>;
    }
  >();
  const totals = {
    captures: 0,
    comparedPixels: 0,
    changedPixels: 0,
    geometryPixels: 0,
    colorPixels: 0,
  };
  const browser = await chromium.launch({ headless: true });
  const evidenceCounts = new Map<string, number>();
  try {
    for (const descriptor of captures) {
      const capture = descriptor.capture;
      const referenceFile = path.join(referenceRoot ?? descriptor.baselineRoot, capture.file);
      const candidateFile = path.join(candidateRoot, capture.file);
      const analyzed = await analyzeCapture(decoder, referenceFile, candidateFile, capture);
      totals.captures += 1;
      totals.comparedPixels += analyzed.pixel.comparedPixels;
      totals.changedPixels += analyzed.pixel.changedPixels;
      totals.geometryPixels += analyzed.pixel.geometryPixels;
      totals.colorPixels += analyzed.pixel.colorPixels;
      for (const substitution of analyzed.pixel.substitutions) {
        const key = substitutionKey(substitution.reference, substitution.candidate);
        const [referenceColor = substitution.reference, candidateColor = substitution.candidate] =
          key.split('>');
        const current = substitutions.get(key) ?? {
          ...substitution,
          reference: referenceColor,
          candidate: candidateColor,
          pixels: 0,
          routes: new Set<string>(),
        };
        const previousPixels = current.pixels;
        current.pixels += substitution.pixels;
        current.deltaE = Number(
          (
            (current.deltaE * previousPixels + substitution.deltaE * substitution.pixels) /
            current.pixels
          ).toFixed(2),
        );
        current.routes.add(capture.route);
        substitutions.set(key, current);
      }
      const context = await browser.newContext({
        viewport: { width: capture.viewport.width, height: capture.viewport.height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      try {
        await page.goto(new URL(capture.route, candidateUrl).href, {
          waitUntil: 'domcontentloaded',
        });
        await settlePage(page);
        await applyState(page, capture);
        const cdp = await context.newCDPSession(page);
        const elementAuditKey = `${capture.route}|${String(capture.viewport.width)}x${String(capture.viewport.height)}|${capture.state}`;
        if (
          mode === 'live' &&
          referenceUrl !== undefined &&
          !elementAuditKeys.has(elementAuditKey)
        ) {
          elementAuditKeys.add(elementAuditKey);
          const referenceContext = await browser.newContext({
            viewport: { width: capture.viewport.width, height: capture.viewport.height },
            storageState,
            reducedMotion: 'reduce',
          });
          try {
            const referencePage = await referenceContext.newPage();
            await referencePage.goto(new URL(capture.route, referenceUrl).href, {
              waitUntil: 'domcontentloaded',
            });
            await settlePage(referencePage);
            await applyState(referencePage, capture);
            const elementComparison = await compareNativeVisualPages(referencePage, page, cdp);
            elementAudits.push({
              route: capture.route,
              viewport: capture.viewport.class,
              state: capture.state,
              accounting: elementComparison.accounting,
              matches: elementComparison.matches,
              differences: elementComparison.differences,
            });
          } finally {
            await referenceContext.close();
          }
        }
        renderedStyles.push(...(await collectRenderedStyleInventory(page, capture, cdp)));
        const evidenceRegions = analyzed.regions
          .filter(({ changedPixels }) => changedPixels >= 8)
          .slice(0, 250);
        const evidenceEntries: { id: string; region: PixelRegion }[] = [];
        for (const region of evidenceRegions) {
          const evidence = await inspectVisualRegion(page, region, capture, cdp);
          const id = findingId(capture, region);
          const type = ['img', 'video', 'canvas'].includes(evidence.element?.tag ?? '')
            ? 'asset'
            : region.type;
          const verifiedPixels =
            type !== 'asset' &&
            evidence.attribution !== undefined &&
            evidence.attribution.confidence !== 'low'
              ? region.changedPixels
              : 0;
          const draft: VisualFinding = {
            id,
            severity: severityFor(region.changedPixels),
            route: capture.route,
            viewport: capture.viewport.class,
            state: capture.state,
            type,
            region: {
              x: region.x,
              y: capture.tile.y + region.y,
              width: region.width,
              height: region.height,
            },
            changedPixels: region.changedPixels,
            colorPixels: region.colorPixels,
            verifiedPixels,
            referenceColor: region.referenceColor,
            candidateColor: region.candidateColor,
            deltaE: region.deltaE,
            evidenceAvailable: false,
            ...evidence,
          };
          const evidenceKey =
            draft.type === 'asset'
              ? `asset|${draft.route}|${draft.element?.tag ?? 'unknown'}`
              : draft.attribution?.confidence === 'low' || draft.attribution === undefined
                ? `unattributed|${draft.route}|${draft.type}`
                : findingRootKey(draft);
          const evidenceCount = evidenceCounts.get(evidenceKey) ?? 0;
          const evidenceAvailable = evidenceCount < 3;
          if (evidenceAvailable) {
            evidenceCounts.set(evidenceKey, evidenceCount + 1);
            evidenceEntries.push({ id, region });
          }
          findings.push({ ...draft, evidenceAvailable });
        }
        await Promise.all([
          decoder.renderRegions(
            referenceFile,
            evidenceEntries.map(({ id, region }) => ({
              outputFile: path.join(outputRoot, 'evidence', id, 'reference.png'),
              region,
              highlight: false,
            })),
          ),
          decoder.renderRegions(
            candidateFile,
            evidenceEntries.map(({ id, region }) => ({
              outputFile: path.join(outputRoot, 'evidence', id, 'candidate.png'),
              region,
              highlight: false,
            })),
          ),
          decoder.renderRegions(
            candidateFile,
            evidenceEntries.map(({ id, region }) => ({
              outputFile: path.join(outputRoot, 'evidence', id, 'diff.png'),
              region,
              highlight: true,
            })),
          ),
        ]);
      } finally {
        await context.close();
      }
      const heatmap = path.join(outputRoot, 'heatmaps', `${capture.id}.png`);
      await decoder.render(candidateFile, heatmap, undefined, analyzed.regions);
    }
  } finally {
    await decoder.close();
    await browser.close();
  }
  const interactions: InteractiveDifference[] = [];
  if (mode === 'live' && referenceUrl !== undefined) {
    const interactionBrowser = await chromium.launch({ headless: true });
    try {
      const interactionTargets = new Map<
        string,
        Readonly<{
          route: string;
          viewport: AuditViewport;
          width: number;
          height: number;
        }>
      >();
      for (const { capture } of captures.filter(({ capture }) => capture.state === 'page')) {
        interactionTargets.set(`${capture.route}:${capture.viewport.class}`, {
          route: capture.route,
          viewport: capture.viewport.class,
          width: capture.viewport.width,
          height: capture.viewport.height,
        });
      }
      for (const target of [...interactionTargets.values()].sort((left, right) =>
        `${left.route}:${left.viewport}`.localeCompare(`${right.route}:${right.viewport}`),
      )) {
        const referenceContext = await interactionBrowser.newContext({
          viewport: { width: target.width, height: target.height },
          storageState,
          reducedMotion: 'reduce',
        });
        const candidateContext = await interactionBrowser.newContext({
          viewport: { width: target.width, height: target.height },
          reducedMotion: 'reduce',
        });
        const [referencePage, candidatePage] = await Promise.all([
          referenceContext.newPage(),
          candidateContext.newPage(),
        ]);
        try {
          await Promise.all([
            referencePage.goto(new URL(target.route, referenceUrl).href),
            candidatePage.goto(new URL(target.route, candidateUrl).href),
          ]);
          await Promise.all([settlePage(referencePage), settlePage(candidatePage)]);
          interactions.push(
            ...(await auditInteractions(
              referencePage,
              candidatePage,
              target.route,
              target.viewport,
            )),
          );
        } finally {
          await referenceContext.close();
          await candidateContext.close();
        }
      }
    } finally {
      await interactionBrowser.close();
    }
  }
  const orderedFindings = findings.sort(
    (a, b) =>
      a.route.localeCompare(b.route) ||
      a.viewport.localeCompare(b.viewport) ||
      a.state.localeCompare(b.state) ||
      b.changedPixels - a.changedPixels ||
      a.id.localeCompare(b.id),
  );
  const attributedStylePixels = orderedFindings.reduce(
    (sum, finding) =>
      sum +
      (finding.type === 'color' &&
      finding.attribution !== undefined &&
      finding.attribution.confidence !== 'low'
        ? (finding.colorPixels ?? 0)
        : 0),
    0,
  );
  const assetContentPixels = orderedFindings.reduce(
    (sum, finding) => sum + (finding.type === 'asset' ? (finding.colorPixels ?? 0) : 0),
    0,
  );
  const report: VisualAuditReport = {
    schemaVersion: 4,
    engine: 'native-element-cdp',
    mode,
    reference: referenceLabel,
    candidate: candidateUrl,
    thresholds: { deltaE: 4, geometryRadius: 2, cellSize: 4 },
    totals,
    findings: orderedFindings,
    groups: groupVisualFindings(orderedFindings),
    unattributedFindings: orderedFindings.filter(
      ({ type, attribution }) =>
        type === 'asset' || attribution === undefined || attribution.confidence === 'low',
    ),
    substitutions: [...substitutions.values()]
      .map(({ routes, ...entry }) => ({ ...entry, routes: [...routes].sort() }))
      .filter(isReportableSubstitution)
      .filter(({ pixels }) => pixels >= 8)
      .sort(
        (a, b) =>
          b.pixels - a.pixels ||
          a.reference.localeCompare(b.reference) ||
          a.candidate.localeCompare(b.candidate),
      ),
    interactions: interactions.sort(
      (a, b) =>
        a.route.localeCompare(b.route) ||
        a.key.localeCompare(b.key) ||
        a.state.localeCompare(b.state) ||
        a.property.localeCompare(b.property),
    ),
    renderedStyles: renderedStyles.sort(
      (left, right) =>
        left.route.localeCompare(right.route) ||
        left.viewport.localeCompare(right.viewport) ||
        left.state.localeCompare(right.state) ||
        left.selector.localeCompare(right.selector) ||
        (left.pseudo ?? '').localeCompare(right.pseudo ?? '') ||
        left.property.localeCompare(right.property),
    ),
    elementAudits: elementAudits.sort(
      (left, right) =>
        left.route.localeCompare(right.route) ||
        left.viewport.localeCompare(right.viewport) ||
        left.state.localeCompare(right.state),
    ),
    accounting: reconcileChangedPixels({
      changedPixels: totals.changedPixels,
      attributedStylePixels,
      geometryPixels: totals.geometryPixels,
      assetContentPixels,
      noisePixels: 0,
    }),
  };
  await writeReports(outputRoot, report);
  return report;
}

async function runCli(): Promise<void> {
  const { command, flags } = parseArguments(process.argv.slice(2));
  if (command === 'authorize') {
    await authorize(flags);
    return;
  }
  if (command !== 'frozen' && command !== 'live') {
    throw new Error(
      'Usage: visual-audit <authorize|frozen|live> [--candidate-url URL] [--reference-url URL] [--output DIR] [--route ROUTE] [--viewport desktop|tablet|mobile] [--state STATE]',
    );
  }
  const report = await runAudit(command, flags);
  stdout.write(
    `${JSON.stringify({ output: path.resolve(flags['output'] ?? 'artifacts/visual-audit/latest'), totals: report.totals, findings: report.findings.length, groups: report.groups.length }, null, 2)}\n`,
  );
}

const executable = process.argv[1];
if (
  executable !== undefined &&
  path.resolve(executable) === path.resolve(new URL(import.meta.url).pathname)
) {
  await runCli();
}
