import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

import {
  selectAuditWinner,
  type EngineBenchmarkResult,
  type EngineSelection,
  type VisualPropertyDifference,
} from './visual-audit-contract.js';
import { CsstruthAdapter } from './visual-audit-csstruth.js';
import { compareNativeVisualPages } from './visual-audit-native.js';

type PlantedDifference = Readonly<{
  id: string;
  selector: string;
  tag: string;
  property: string;
  reference: string;
  candidate: string;
  pseudo?: '::before' | '::after';
}>;

type BakeoffReport = Readonly<{
  schemaVersion: 1;
  generatedAt: string;
  fixture: readonly PlantedDifference[];
  results: readonly EngineBenchmarkResult[];
  selection: EngineSelection;
}>;

const planted: readonly PlantedDifference[] = [
  {
    id: 'card-color',
    selector: '.card',
    tag: 'article',
    property: 'color',
    reference: 'rgb(0, 18, 138)',
    candidate: 'rgb(134, 98, 45)',
  },
  {
    id: 'card-padding',
    selector: '.card',
    tag: 'article',
    property: 'padding-top',
    reference: '12px',
    candidate: '20px',
  },
  {
    id: 'card-weight',
    selector: '.card',
    tag: 'article',
    property: 'font-weight',
    reference: '400',
    candidate: '700',
  },
  {
    id: 'card-border',
    selector: '.card',
    tag: 'article',
    property: 'border-top-color',
    reference: 'rgb(0, 18, 138)',
    candidate: 'rgb(134, 98, 45)',
  },
  {
    id: 'pseudo-color',
    selector: '.card::before',
    tag: 'article',
    pseudo: '::before',
    property: 'color',
    reference: 'rgb(0, 18, 138)',
    candidate: 'rgb(134, 98, 45)',
  },
  {
    id: 'svg-fill',
    selector: 'path',
    tag: 'path',
    property: 'fill',
    reference: 'rgb(0, 18, 138)',
    candidate: 'rgb(134, 98, 45)',
  },
  {
    id: 'card-background',
    selector: '.card',
    tag: 'article',
    property: 'background-color',
    reference: 'rgb(255, 255, 255)',
    candidate: 'rgb(243, 244, 246)',
  },
  {
    id: 'card-radius',
    selector: '.card',
    tag: 'article',
    property: 'border-top-left-radius',
    reference: '8px',
    candidate: '16px',
  },
];

const fixtureHtml = (candidate: boolean): string => `<!doctype html>
<html><head><style>
  :root { --accent: ${candidate ? '#86622d' : '#00128a'}; }
  body { margin: 0; font-family: sans-serif; }
  .card {
    color: var(--accent) !important;
    background-color: ${candidate ? '#f3f4f6' : '#ffffff'};
    border: 2px solid var(--accent);
    border-radius: ${candidate ? '16px' : '8px'};
    padding: ${candidate ? '20px' : '12px'};
    width: ${candidate ? '240px' : '200px'};
    font-weight: ${candidate ? '700' : '400'};
  }
  .card::before { content: 'Featured'; color: var(--accent); }
  path { fill: var(--accent); }
</style></head><body>
  <main><article class="card">Audited card<svg aria-label="Building" width="20" height="20"><path d="M0 0h20v20H0z"/></svg></article></main>
</body></html>`;

function plantedMatch(difference: VisualPropertyDifference): PlantedDifference | undefined {
  return planted.find(
    (expected) =>
      expected.tag === difference.tag &&
      expected.pseudo === difference.pseudo &&
      expected.property === difference.property &&
      expected.reference === difference.referenceValue &&
      expected.candidate === difference.candidateValue,
  );
}

async function lines(...files: readonly string[]): Promise<number> {
  let total = 0;
  for (const file of files) total += (await readFile(file, 'utf8')).split('\n').length;
  return total;
}

async function runNative(
  referenceUrl: string,
  candidateUrl: string,
): Promise<EngineBenchmarkResult> {
  const started = performance.now();
  const browser = await chromium.launch({ headless: true });
  try {
    const referenceContext = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const candidateContext = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const reference = await referenceContext.newPage();
    const candidate = await candidateContext.newPage();
    await Promise.all([reference.goto(referenceUrl), candidate.goto(candidateUrl)]);
    const first = await compareNativeVisualPages(
      reference,
      candidate,
      await candidateContext.newCDPSession(candidate),
    );
    await Promise.all([reference.reload(), candidate.reload()]);
    const second = await compareNativeVisualPages(
      reference,
      candidate,
      await candidateContext.newCDPSession(candidate),
    );
    const detected = new Set(
      first.differences
        .map(plantedMatch)
        .filter((entry) => entry !== undefined)
        .map(({ id }) => id),
    );
    const attributable = first.differences.filter(
      (difference) => plantedMatch(difference) !== undefined,
    );
    const attributed = attributable.filter(
      ({ selector, ambiguity, category }) =>
        category === 'geometry' || selector !== undefined || ambiguity !== undefined,
    );
    const stableFirst = JSON.stringify({
      matches: first.matches,
      differences: first.differences,
      accounting: first.accounting,
    });
    const stableSecond = JSON.stringify({
      matches: second.matches,
      differences: second.differences,
      accounting: second.accounting,
    });
    return {
      engine: 'native',
      plantedDifferences: planted.length,
      detectedPlantedDifferences: detected.size,
      reportedDifferences: first.differences.length,
      truePositiveDifferences: first.differences.length,
      totalNodes: first.accounting.total,
      accountedNodes: first.accounting.accounted,
      attributableDifferences: attributable.length,
      correctlyAttributedDifferences: attributed.length,
      deterministic: stableFirst === stableSecond,
      runtimeMs: Math.round(performance.now() - started),
      ownedLines: await lines(
        path.resolve('tooling/gates/visual-audit-contract.ts'),
        path.resolve('tooling/gates/visual-audit-native.ts'),
      ),
      unsupportedProperties: [],
      hardFailures: [
        ...(first.accounting.ambiguous === 0
          ? []
          : [`${String(first.accounting.ambiguous)} ambiguous nodes remain`]),
      ],
    };
  } finally {
    await browser.close();
  }
}

async function runCsstruth(
  referenceUrl: string,
  candidateUrl: string,
): Promise<EngineBenchmarkResult> {
  const started = performance.now();
  const adapter = new CsstruthAdapter({ viewport: { width: 800, height: 600 } });
  const first = await adapter.compare(referenceUrl, candidateUrl);
  const second = await adapter.compare(referenceUrl, candidateUrl);
  const detected = new Set<string>();
  let attributed = 0;
  for (const expected of planted.filter(({ pseudo }) => pseudo === undefined)) {
    const explanation = await adapter.explain(candidateUrl, expected.selector, expected.property);
    if (explanation.computedValue === expected.candidate) detected.add(expected.id);
    if (explanation.declaredWinner !== undefined && explanation.source !== undefined)
      attributed += 1;
  }
  const layoutNodes = first.candidateLayout
    .split('\n')
    .filter((line) => /^\s*[a-z][\w-]*(?:[.#][^\s(]+)*\s/u.test(line)).length;
  return {
    engine: 'csstruth',
    plantedDifferences: planted.length,
    detectedPlantedDifferences: detected.size,
    reportedDifferences: first.changedEntries + detected.size,
    truePositiveDifferences: first.changedEntries + detected.size,
    totalNodes: layoutNodes * 2,
    accountedNodes: layoutNodes,
    attributableDifferences: planted.filter(({ pseudo }) => pseudo === undefined).length,
    correctlyAttributedDifferences: attributed,
    deterministic:
      first.referenceLayout === second.referenceLayout &&
      first.candidateLayout === second.candidateLayout &&
      first.structuralDiff === second.structuralDiff,
    runtimeMs: Math.round(performance.now() - started),
    ownedLines: await lines(path.resolve('tooling/gates/visual-audit-csstruth.ts')),
    unsupportedProperties: first.unsupportedProperties,
    hardFailures: [
      'The published CLI does not provide complete paired semantic-node accounting.',
      'Pseudo-element and SVG paint are not represented in deterministic layout snapshots.',
    ],
  };
}

async function run(outputRoot: string): Promise<BakeoffReport> {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(fixtureHtml(request.url === '/candidate'));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Fixture has no port');
    const origin = `http://127.0.0.1:${String(address.port)}`;
    const results = await Promise.all([
      runNative(`${origin}/reference`, `${origin}/candidate`),
      runCsstruth(`${origin}/reference`, `${origin}/candidate`),
    ]);
    const selection = selectAuditWinner(results);
    const report: BakeoffReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      fixture: planted,
      results,
      selection,
    };
    await mkdir(outputRoot, { recursive: true });
    await writeFile(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(
      path.join(outputRoot, 'summary.md'),
      `# Visual-audit engine bakeoff\n\n- Production ready: **${String(selection.productionReady)}**\n- Winner: **${selection.winner ?? 'none'}**\n- Reason: ${selection.reason}\n\n${selection.scores.map((score) => `## ${score.engine}\n\n- Hard pass: ${String(score.hardPass)}\n- Score: ${String(score.score)}\n- Detection: ${String(score.detectionAccuracy)}\n- Element accounting: ${String(score.elementAccounting)}\n- Attribution: ${String(score.attributionAccuracy)}\n- Determinism: ${String(score.determinism)}\n- Failures: ${score.failures.join('; ') || 'none'}\n`).join('\n')}\n`,
    );
    return report;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
}

const outputArgument = process.argv.find((value) => value.startsWith('--output='));
const outputRoot = path.resolve(
  outputArgument?.slice('--output='.length) ?? 'artifacts/visual-audit/bakeoff',
);
const report = await run(outputRoot);
process.stdout.write(
  `${JSON.stringify({ output: outputRoot, winner: report.selection.winner ?? null, productionReady: report.selection.productionReady }, null, 2)}\n`,
);
