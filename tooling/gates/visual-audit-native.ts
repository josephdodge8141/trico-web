import type { CDPSession, Page } from '@playwright/test';

import {
  captureVisualNodes,
  compareVisualSnapshots,
  type VisualNodeMatch,
  type VisualNodeSnapshot,
  type VisualPropertyDifference,
  type VisualSite,
  type VisualSnapshotComparison,
} from './visual-audit-contract.js';

export type AttributedVisualDifference = VisualPropertyDifference &
  Readonly<{
    selector?: string;
    token?: string;
    stylesheet?: string;
    sourceLine?: number;
    ambiguity?: string;
  }>;

export type NativeVisualComparison = Omit<VisualSnapshotComparison, 'differences'> &
  Readonly<{ differences: readonly AttributedVisualDifference[] }>;

function shorthandCandidates(property: string): readonly string[] {
  if (property.startsWith('border-')) return [property, 'border-color', 'border-width', 'border'];
  if (property.startsWith('background-')) return [property, 'background'];
  if (property.startsWith('font-') || property === 'line-height') return [property, 'font'];
  if (property.startsWith('margin-')) return [property, 'margin'];
  if (property.startsWith('padding-')) return [property, 'padding'];
  if (property.startsWith('outline-')) return [property, 'outline'];
  if (property.startsWith('text-decoration-')) return [property, 'text-decoration'];
  return [property];
}

function matchingNode(
  difference: VisualPropertyDifference,
  matches: readonly VisualNodeMatch[],
): VisualNodeSnapshot | undefined {
  return matches.find(
    ({ status, reference }) => status === 'matched' && reference?.matchKey === difference.matchKey,
  )?.candidate;
}

function getMatchedStyles(cdp: CDPSession, nodeId: number) {
  return cdp.send('CSS.getMatchedStylesForNode', { nodeId });
}

type MatchedStyles = Awaited<ReturnType<typeof getMatchedStyles>>;
type AttributionCache = Readonly<{
  nodeIds: Map<string, Promise<number>>;
  styles: Map<number, Promise<MatchedStyles>>;
}>;

async function attributeDifference(
  cdp: CDPSession,
  rootNodeId: number,
  difference: VisualPropertyDifference,
  node: VisualNodeSnapshot,
  styleSheets: ReadonlyMap<string, string>,
  cache: AttributionCache,
): Promise<AttributedVisualDifference> {
  if (difference.category === 'geometry' && difference.property.startsWith('box-'))
    return {
      ...difference,
      ambiguity: 'Bounding-box values are browser layout results rather than direct declarations.',
    };
  if (difference.category === 'content' || difference.category === 'asset')
    return {
      ...difference,
      ambiguity: 'Content and intrinsic asset values are not CSS declarations.',
    };
  let nodeId = cache.nodeIds.get(node.selector);
  if (nodeId === undefined) {
    nodeId = cdp
      .send('DOM.querySelector', { nodeId: rootNodeId, selector: node.selector })
      .then(({ nodeId: resolved }) => resolved);
    cache.nodeIds.set(node.selector, nodeId);
  }
  const resolvedNodeId = await nodeId;
  if (resolvedNodeId === 0)
    return { ...difference, ambiguity: 'The candidate node could not be resolved through CDP.' };
  let response = cache.styles.get(resolvedNodeId);
  if (response === undefined) {
    response = getMatchedStyles(cdp, resolvedNodeId);
    cache.styles.set(resolvedNodeId, response);
  }
  const matchedStyles = await response;
  const pseudoType = node.pseudo?.slice(2);
  const matches =
    pseudoType === undefined
      ? (matchedStyles.matchedCSSRules ?? [])
      : ((matchedStyles.pseudoElements ?? []).find(({ pseudoType: type }) => type === pseudoType)
          ?.matches ?? []);
  const candidates = shorthandCandidates(difference.property);
  const inline = matchedStyles.inlineStyle?.cssProperties
    .filter(({ disabled, name }) => disabled !== true && candidates.includes(name))
    .at(-1);
  if (inline !== undefined) {
    const token = /var\((--[\w-]+)/u.exec(inline.value)?.[1];
    return {
      ...difference,
      selector: '(inline style)',
      ...(token === undefined ? {} : { token }),
      stylesheet: '(inline)',
      sourceLine: (inline.range?.startLine ?? 0) + 1,
    };
  }
  for (const match of [...matches].reverse()) {
    const declaration = [...match.rule.style.cssProperties]
      .reverse()
      .find(({ disabled, name }) => disabled !== true && candidates.includes(name));
    if (declaration === undefined) continue;
    const token = /var\((--[\w-]+)/u.exec(declaration.value)?.[1];
    const range = declaration.range ?? match.rule.style.range;
    return {
      ...difference,
      selector: match.rule.selectorList.text,
      ...(token === undefined ? {} : { token }),
      stylesheet:
        match.rule.styleSheetId === undefined
          ? '(inline stylesheet)'
          : (styleSheets.get(match.rule.styleSheetId) ?? match.rule.styleSheetId),
      ...(range === undefined ? {} : { sourceLine: range.startLine + 1 }),
    };
  }
  return {
    ...difference,
    ambiguity:
      'No direct candidate author declaration won this property; it is inherited, defaulted, composited, or controlled by an unresolved shorthand.',
  };
}

export async function captureNativeVisualSnapshot(
  page: Page,
  site: VisualSite,
): Promise<readonly VisualNodeSnapshot[]> {
  return captureVisualNodes(page, site);
}

export async function compareNativeVisualPages(
  referencePage: Page,
  candidatePage: Page,
  cdp: CDPSession,
): Promise<NativeVisualComparison> {
  const styleSheets = new Map<string, string>();
  cdp.on('CSS.styleSheetAdded', ({ header }) => {
    styleSheets.set(
      header.styleSheetId,
      header.sourceURL || header.ownerNode?.toString() || '(page)',
    );
  });
  await Promise.all([cdp.send('DOM.enable'), cdp.send('CSS.enable')]);
  const [reference, candidate] = await Promise.all([
    captureNativeVisualSnapshot(referencePage, 'reference'),
    captureNativeVisualSnapshot(candidatePage, 'candidate'),
  ]);
  const comparison = compareVisualSnapshots(reference, candidate);
  const document = await cdp.send('DOM.getDocument', { depth: 1, pierce: true });
  const cache: AttributionCache = { nodeIds: new Map(), styles: new Map() };
  const differences: AttributedVisualDifference[] = [];
  for (const difference of comparison.differences) {
    const node = matchingNode(difference, comparison.matches);
    differences.push(
      node === undefined
        ? { ...difference, ambiguity: 'The matched candidate node was unavailable.' }
        : await attributeDifference(
            cdp,
            document.root.nodeId,
            difference,
            node,
            styleSheets,
            cache,
          ),
    );
  }
  return { ...comparison, differences };
}
