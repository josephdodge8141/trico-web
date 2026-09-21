import type { Page } from '@playwright/test';

export type AuditEngineName = 'csstruth' | 'native';
export type VisualSite = 'reference' | 'candidate';
export type VisualNodeStatus =
  'matched' | 'reference-only' | 'candidate-only' | 'ignored' | 'ambiguous';
export type VisualPropertyCategory = 'geometry' | 'typography' | 'paint' | 'content' | 'asset';

export type VisualRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type VisualNodeSnapshot = Readonly<{
  id: string;
  site: VisualSite;
  order: number;
  tag: string;
  pseudo?: '::before' | '::after';
  selector: string;
  ancestry: string;
  role: string;
  accessibleName: string;
  ownText: string;
  href: string;
  assetSource: string;
  assetWidth?: number;
  assetHeight?: number;
  rect: VisualRect;
  matchKey: string;
  structureKey: string;
  properties: Readonly<Record<string, string>>;
}>;

export type VisualNodeMatch = Readonly<{
  status: VisualNodeStatus;
  evidence: string;
  reference?: VisualNodeSnapshot;
  candidate?: VisualNodeSnapshot;
}>;

export type VisualPropertyDifference = Readonly<{
  matchKey: string;
  category: VisualPropertyCategory;
  property: string;
  referenceValue: string;
  candidateValue: string;
  tag: string;
  pseudo?: '::before' | '::after';
  selector?: string;
  token?: string;
  stylesheet?: string;
  sourceLine?: number;
  ambiguity?: string;
}>;

export type VisualElementAccounting = Readonly<{
  total: number;
  accounted: number;
  matched: number;
  referenceOnly: number;
  candidateOnly: number;
  ignored: number;
  ambiguous: number;
}>;

export type VisualSnapshotComparison = Readonly<{
  matches: readonly VisualNodeMatch[];
  differences: readonly VisualPropertyDifference[];
  accounting: VisualElementAccounting;
}>;

export type EngineBenchmarkResult = Readonly<{
  engine: AuditEngineName;
  plantedDifferences: number;
  detectedPlantedDifferences: number;
  reportedDifferences: number;
  truePositiveDifferences: number;
  totalNodes: number;
  accountedNodes: number;
  attributableDifferences: number;
  correctlyAttributedDifferences: number;
  deterministic: boolean;
  runtimeMs: number;
  ownedLines: number;
  unsupportedProperties: readonly string[];
  hardFailures: readonly string[];
}>;

export type EngineScore = Readonly<{
  engine: AuditEngineName;
  hardPass: boolean;
  score: number;
  detectionAccuracy: number;
  elementAccounting: number;
  attributionAccuracy: number;
  determinism: number;
  runtime: number;
  maintenance: number;
  failures: readonly string[];
}>;

export type EngineSelection = Readonly<{
  winner?: AuditEngineName;
  productionReady: boolean;
  scores: readonly EngineScore[];
  reason: string;
}>;

const propertyGroups = {
  geometry: [
    'display',
    'position',
    'box-sizing',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'gap',
    'row-gap',
    'column-gap',
    'grid-template-columns',
    'grid-template-rows',
    'grid-column',
    'grid-row',
    'flex-direction',
    'flex-basis',
    'flex-grow',
    'flex-shrink',
    'justify-content',
    'align-items',
    'align-content',
    'align-self',
    'overflow-x',
    'overflow-y',
    'top',
    'right',
    'bottom',
    'left',
    'z-index',
    'aspect-ratio',
    'object-fit',
    'object-position',
    'transform',
  ],
  typography: [
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'word-spacing',
    'text-align',
    'text-transform',
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-thickness',
    'white-space',
    'word-break',
  ],
  paint: [
    'color',
    'background-color',
    'background-image',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-right-radius',
    'border-bottom-left-radius',
    'box-shadow',
    'text-shadow',
    'opacity',
    'filter',
    'outline-width',
    'outline-style',
    'outline-color',
    'fill',
    'stroke',
    'stroke-width',
  ],
} as const;

export const auditedVisualProperties = Object.freeze([
  ...propertyGroups.geometry,
  ...propertyGroups.typography,
  ...propertyGroups.paint,
]);

const propertyCategory = new Map<string, VisualPropertyCategory>([
  ...propertyGroups.geometry.map((property) => [property, 'geometry'] as const),
  ...propertyGroups.typography.map((property) => [property, 'typography'] as const),
  ...propertyGroups.paint.map((property) => [property, 'paint'] as const),
  ['box-x', 'geometry'],
  ['box-y', 'geometry'],
  ['box-width', 'geometry'],
  ['box-height', 'geometry'],
  ['own-text', 'content'],
  ['asset-source', 'asset'],
  ['asset-width', 'asset'],
  ['asset-height', 'asset'],
]);

function normalized(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 100;
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
}

export async function captureVisualNodes(
  page: Page,
  site: VisualSite,
): Promise<readonly VisualNodeSnapshot[]> {
  await page.evaluate('globalThis.__name = (target) => target');
  const raw = await page.evaluate(
    ({ auditedProperties, capturedSite }) => {
      type RawNode = Omit<VisualNodeSnapshot, 'site'>;
      const text = (value: string | null | undefined): string =>
        (value ?? '').replace(/\s+/gu, ' ').trim();
      const ownText = (element: Element): string =>
        text(
          [...element.childNodes]
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent ?? '')
            .join(' '),
        );
      const implicitRole = (element: Element): string => {
        const tag = element.tagName.toLowerCase();
        if (/^h[1-6]$/u.test(tag)) return 'heading';
        if (tag === 'a' && element.hasAttribute('href')) return 'link';
        if (tag === 'button') return 'button';
        if (tag === 'img') return 'img';
        if (tag === 'nav') return 'navigation';
        if (tag === 'main') return 'main';
        if (tag === 'form') return 'form';
        if (tag === 'ul' || tag === 'ol') return 'list';
        if (tag === 'li') return 'listitem';
        if (tag === 'input') return 'textbox';
        return '';
      };
      const accessibleName = (element: Element, directText: string): string =>
        text(
          element.getAttribute('aria-label') ??
            element.getAttribute('alt') ??
            element.getAttribute('title') ??
            element.getAttribute('placeholder') ??
            directText,
        );
      const nthOfType = (element: Element): number => {
        const parent = element.parentElement;
        if (parent === null) return 1;
        return (
          [...parent.children]
            .filter((sibling) => sibling.tagName === element.tagName)
            .indexOf(element) + 1
        );
      };
      const ancestryFor = (element: Element): string => {
        const parts: string[] = [];
        let current: Element | null = element;
        while (current !== null && parts.length < 7) {
          const directText = ownText(current).slice(0, 80);
          const name = accessibleName(current, directText).slice(0, 80);
          const role = current.getAttribute('role') ?? implicitRole(current);
          const stable =
            name !== ''
              ? `${current.tagName.toLowerCase()}[${role}:${name}]`
              : `${current.tagName.toLowerCase()}:nth-of-type(${String(nthOfType(current))})`;
          parts.unshift(stable);
          current = current.parentElement;
        }
        return parts.join('>');
      };
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
      const sourceFor = (element: Element): string => {
        if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement)
          return element.currentSrc || element.src;
        if (element instanceof HTMLSourceElement) return element.src;
        return '';
      };
      const assetSize = (element: Element): readonly [number | undefined, number | undefined] => {
        if (element instanceof HTMLImageElement)
          return [element.naturalWidth || undefined, element.naturalHeight || undefined];
        if (element instanceof HTMLVideoElement)
          return [element.videoWidth || undefined, element.videoHeight || undefined];
        return [undefined, undefined];
      };
      const nodes: RawNode[] = [];
      let order = 0;
      const add = (
        element: Element,
        style: CSSStyleDeclaration,
        selector: string,
        pseudo?: '::before' | '::after',
      ): void => {
        const rect = element.getBoundingClientRect();
        const directText =
          pseudo === undefined
            ? ownText(element)
            : text(style.content).replace(/^['"]|['"]$/gu, '');
        const role = element.getAttribute('role') ?? implicitRole(element);
        const name = accessibleName(element, directText);
        const href = element instanceof HTMLAnchorElement ? element.href : '';
        const assetSource = sourceFor(element);
        const [assetWidth, assetHeight] = assetSize(element);
        const ancestry = ancestryFor(element);
        const properties: Record<string, string> = Object.fromEntries(
          auditedProperties.map((property) => [property, style.getPropertyValue(property)]),
        );
        properties['box-x'] = String(Number((rect.x + window.scrollX).toFixed(2)));
        properties['box-y'] = String(Number((rect.y + window.scrollY).toFixed(2)));
        properties['box-width'] = String(Number(rect.width.toFixed(2)));
        properties['box-height'] = String(Number(rect.height.toFixed(2)));
        properties['own-text'] = directText;
        properties['asset-source'] = assetSource;
        properties['asset-width'] = assetWidth === undefined ? '' : String(assetWidth);
        properties['asset-height'] = assetHeight === undefined ? '' : String(assetHeight);
        const semantic = [
          element.tagName.toLowerCase(),
          pseudo ?? '',
          role,
          name,
          directText,
          href,
          assetSource,
        ].join('|');
        const structure = [element.tagName.toLowerCase(), pseudo ?? '', ancestry].join('|');
        nodes.push({
          id: `${capturedSite}-${String(order)}`,
          order,
          tag: element.tagName.toLowerCase(),
          ...(pseudo === undefined ? {} : { pseudo }),
          selector,
          ancestry,
          role,
          accessibleName: name,
          ownText: directText,
          href,
          assetSource,
          ...(assetWidth === undefined ? {} : { assetWidth }),
          ...(assetHeight === undefined ? {} : { assetHeight }),
          rect: {
            x: Number((rect.x + window.scrollX).toFixed(2)),
            y: Number((rect.y + window.scrollY).toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
          },
          matchKey: semantic,
          structureKey: structure,
          properties,
        });
        order += 1;
      };
      let elementNumber = 0;
      for (const element of document.querySelectorAll('*')) {
        const style = getComputedStyle(element);
        if (!visible(element, style)) continue;
        const selector = `[data-visual-parity-node="${String(elementNumber)}"]`;
        element.setAttribute('data-visual-parity-node', String(elementNumber));
        elementNumber += 1;
        add(element, style, selector);
        for (const pseudo of ['::before', '::after'] as const) {
          const pseudoStyle = getComputedStyle(element, pseudo);
          const painted =
            pseudoStyle.content !== 'none' ||
            pseudoStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
            pseudoStyle.backgroundImage !== 'none' ||
            pseudoStyle.borderTopWidth !== '0px';
          if (painted) add(element, pseudoStyle, selector, pseudo);
        }
      }
      return nodes;
    },
    { auditedProperties: auditedVisualProperties, capturedSite: site },
  );
  return raw.map((entry) => ({ ...entry, site }));
}

function pairByKey(
  references: readonly VisualNodeSnapshot[],
  candidates: readonly VisualNodeSnapshot[],
  key: (node: VisualNodeSnapshot) => string,
  evidence: string,
): Readonly<{
  matches: VisualNodeMatch[];
  remainingReferences: VisualNodeSnapshot[];
  remainingCandidates: VisualNodeSnapshot[];
}> {
  const right = new Map<string, VisualNodeSnapshot[]>();
  for (const candidate of candidates) {
    const group = right.get(key(candidate)) ?? [];
    group.push(candidate);
    right.set(key(candidate), group);
  }
  const used = new Set<string>();
  const matches: VisualNodeMatch[] = [];
  const remainingReferences: VisualNodeSnapshot[] = [];
  for (const reference of references) {
    const available = (right.get(key(reference)) ?? []).filter(({ id }) => !used.has(id));
    const candidate = available[0];
    if (candidate === undefined) remainingReferences.push(reference);
    else {
      used.add(candidate.id);
      matches.push({ status: 'matched', reference, candidate, evidence });
    }
  }
  return {
    matches,
    remainingReferences,
    remainingCandidates: candidates.filter(({ id }) => !used.has(id)),
  };
}

export function matchVisualNodes(
  references: readonly VisualNodeSnapshot[],
  candidates: readonly VisualNodeSnapshot[],
): readonly VisualNodeMatch[] {
  const semantic = pairByKey(
    references,
    candidates,
    ({ matchKey }) => matchKey,
    'semantic identity',
  );
  const structural = pairByKey(
    semantic.remainingReferences,
    semantic.remainingCandidates,
    ({ structureKey }) => structureKey,
    'structural ancestry',
  );
  return [
    ...semantic.matches,
    ...structural.matches,
    ...structural.remainingReferences.map((reference): VisualNodeMatch => ({
      status: 'reference-only',
      reference,
      evidence: 'No unused candidate shared semantic identity or structural ancestry.',
    })),
    ...structural.remainingCandidates.map((candidate): VisualNodeMatch => ({
      status: 'candidate-only',
      candidate,
      evidence: 'No unused reference shared semantic identity or structural ancestry.',
    })),
  ].sort(
    (left, rightMatch) =>
      (left.reference?.order ?? left.candidate?.order ?? 0) -
      (rightMatch.reference?.order ?? rightMatch.candidate?.order ?? 0),
  );
}

function differencesFor(match: VisualNodeMatch): VisualPropertyDifference[] {
  if (match.status !== 'matched' || match.reference === undefined || match.candidate === undefined)
    return [];
  const output: VisualPropertyDifference[] = [];
  const properties = new Set([
    ...Object.keys(match.reference.properties),
    ...Object.keys(match.candidate.properties),
  ]);
  for (const property of [...properties].sort()) {
    const referenceValue = normalized(match.reference.properties[property] ?? '');
    const candidateValue = normalized(match.candidate.properties[property] ?? '');
    if (referenceValue === candidateValue) continue;
    output.push({
      matchKey: match.reference.matchKey,
      category: propertyCategory.get(property) ?? 'paint',
      property,
      referenceValue,
      candidateValue,
      tag: match.candidate.tag,
      ...(match.candidate.pseudo === undefined ? {} : { pseudo: match.candidate.pseudo }),
    });
  }
  return output;
}

export function compareVisualSnapshots(
  references: readonly VisualNodeSnapshot[],
  candidates: readonly VisualNodeSnapshot[],
): VisualSnapshotComparison {
  const matches = matchVisualNodes(references, candidates);
  const matched = matches.filter(({ status }) => status === 'matched').length;
  const referenceOnly = matches.filter(({ status }) => status === 'reference-only').length;
  const candidateOnly = matches.filter(({ status }) => status === 'candidate-only').length;
  const ignored = matches.filter(({ status }) => status === 'ignored').length;
  const ambiguous = matches.filter(({ status }) => status === 'ambiguous').length;
  const total = references.length + candidates.length;
  const accounted = matched * 2 + referenceOnly + candidateOnly + ignored + ambiguous;
  return {
    matches,
    differences: matches.flatMap(differencesFor),
    accounting: {
      total,
      accounted,
      matched,
      referenceOnly,
      candidateOnly,
      ignored,
      ambiguous,
    },
  };
}

export function scoreAuditEngine(result: EngineBenchmarkResult): EngineScore {
  const failures = [...result.hardFailures];
  if (result.detectedPlantedDifferences !== result.plantedDifferences)
    failures.push('planted recall is below 100%');
  if (result.accountedNodes !== result.totalNodes)
    failures.push('visible-node accounting is incomplete');
  if (!result.deterministic) failures.push('machine-readable output is not deterministic');
  if (result.correctlyAttributedDifferences !== result.attributableDifferences)
    failures.push('candidate author-declaration attribution is incomplete');
  const detectionRecall = percentage(result.detectedPlantedDifferences, result.plantedDifferences);
  const detectionPrecision = percentage(result.truePositiveDifferences, result.reportedDifferences);
  const detectionAccuracy = (detectionRecall + detectionPrecision) / 2;
  const elementAccounting = percentage(result.accountedNodes, result.totalNodes);
  const attributionAccuracy = percentage(
    result.correctlyAttributedDifferences,
    result.attributableDifferences,
  );
  const determinism = result.deterministic ? 100 : 0;
  const runtime = Math.max(0, 100 - result.runtimeMs / 600);
  const maintenance = Math.max(0, 100 - result.ownedLines / 20);
  const score =
    detectionAccuracy * 0.35 +
    elementAccounting * 0.25 +
    attributionAccuracy * 0.2 +
    determinism * 0.1 +
    runtime * 0.05 +
    maintenance * 0.05;
  return {
    engine: result.engine,
    hardPass: failures.length === 0,
    score: Number(score.toFixed(2)),
    detectionAccuracy: Number(detectionAccuracy.toFixed(2)),
    elementAccounting: Number(elementAccounting.toFixed(2)),
    attributionAccuracy: Number(attributionAccuracy.toFixed(2)),
    determinism,
    runtime: Number(runtime.toFixed(2)),
    maintenance: Number(maintenance.toFixed(2)),
    failures: [...new Set(failures)].sort(),
  };
}

export function selectAuditWinner(results: readonly EngineBenchmarkResult[]): EngineSelection {
  const scores = results.map(scoreAuditEngine).sort((left, right) => {
    if (left.hardPass !== right.hardPass) return left.hardPass ? -1 : 1;
    return right.score - left.score || left.engine.localeCompare(right.engine);
  });
  const passing = scores.filter(({ hardPass }) => hardPass);
  if (passing.length === 0)
    return {
      productionReady: false,
      scores,
      reason:
        'No engine passed every hard requirement; the existing report-only auditor remains available.',
    };
  const first = passing[0];
  if (first === undefined)
    return { productionReady: false, scores, reason: 'No benchmark result was available.' };
  return {
    winner: first.engine,
    productionReady: true,
    scores,
    reason: `${first.engine} passed every hard requirement and received the highest mechanical score.`,
  };
}
