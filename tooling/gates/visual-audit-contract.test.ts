import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { chromium } from '@playwright/test';

import {
  captureVisualNodes,
  compareVisualSnapshots,
  scoreAuditEngine,
  selectAuditWinner,
  type EngineBenchmarkResult,
} from './visual-audit-contract.js';
import { compareNativeVisualPages } from './visual-audit-native.js';

async function withFixture(html: string, run: (url: string) => Promise<void>): Promise<void> {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('Fixture has no port');
    await run(`http://127.0.0.1:${String(address.port)}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    );
  }
}

test('accounts for every visual node and detects direct computed differences', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const reference = await browser.newPage({ viewport: { width: 800, height: 600 } });
    const candidate = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await withFixture(
      `<style>
        body { margin: 0; font-family: sans-serif; }
        .card { color: #00128a; border: 2px solid #00128a; padding: 12px; }
        .card::before { content: "New"; color: #00128a; }
        svg path { fill: #00128a; }
      </style>
      <main><article class="card"><h2>Property Management</h2><svg aria-label="Building"><path d="M0 0h10v10H0z"/></svg></article></main>`,
      async (referenceUrl) => {
        await withFixture(
          `<style>
            body { margin: 0; font-family: sans-serif; }
            .card { color: #86622d; border: 2px solid #86622d; padding: 20px; transform: translateX(8px); }
            .card::before { content: "New"; color: #86622d; }
            svg path { fill: #86622d; }
          </style>
          <main><article class="card"><h2>Property Management</h2><svg aria-label="Building"><path d="M0 0h10v10H0z"/></svg></article></main>`,
          async (candidateUrl) => {
            await Promise.all([reference.goto(referenceUrl), candidate.goto(candidateUrl)]);
            const [left, right] = await Promise.all([
              captureVisualNodes(reference, 'reference'),
              captureVisualNodes(candidate, 'candidate'),
            ]);
            const comparison = compareVisualSnapshots(left, right);

            assert.equal(comparison.accounting.total, comparison.accounting.accounted);
            assert.equal(comparison.accounting.ambiguous, 0);
            assert.equal(
              comparison.differences.some(
                ({ property, referenceValue, candidateValue }) =>
                  property === 'color' &&
                  referenceValue === 'rgb(0, 18, 138)' &&
                  candidateValue === 'rgb(134, 98, 45)',
              ),
              true,
            );
            assert.equal(
              comparison.differences.some(
                ({ category, property }) => category === 'geometry' && property === 'padding-top',
              ),
              true,
            );
            assert.equal(
              comparison.differences.some(
                ({ pseudo, property }) => pseudo === '::before' && property === 'color',
              ),
              true,
            );
            assert.equal(
              comparison.differences.some(
                ({ tag, property }) => tag === 'path' && property === 'fill',
              ),
              true,
            );
          },
        );
      },
    );
  } finally {
    await browser.close();
  }
});

test('matches reordered repeated items semantically instead of by geometry', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const reference = await browser.newPage();
    const candidate = await browser.newPage();
    await reference.setContent('<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>');
    await candidate.setContent('<ul><li>Gamma</li><li>Alpha</li><li>Beta</li></ul>');
    const comparison = compareVisualSnapshots(
      await captureVisualNodes(reference, 'reference'),
      await captureVisualNodes(candidate, 'candidate'),
    );
    for (const label of ['Alpha', 'Beta', 'Gamma']) {
      assert.equal(
        comparison.matches.some(
          ({ status, reference, candidate: matched }) =>
            status === 'matched' && reference?.ownText === label && matched?.ownText === label,
        ),
        true,
      );
    }
    assert.equal(comparison.accounting.total, comparison.accounting.accounted);
  } finally {
    await browser.close();
  }
});

test('never suppresses exact colors merely because they share a semantic role', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const reference = await browser.newPage();
    const candidate = await browser.newPage();
    await reference.setContent('<p style="color:#00128a">Exact color</p>');
    await candidate.setContent('<p style="color:#061892">Exact color</p>');
    const comparison = compareVisualSnapshots(
      await captureVisualNodes(reference, 'reference'),
      await captureVisualNodes(candidate, 'candidate'),
    );
    assert.equal(
      comparison.differences.some(
        ({ property, referenceValue, candidateValue }) =>
          property === 'color' &&
          referenceValue === 'rgb(0, 18, 138)' &&
          candidateValue === 'rgb(6, 24, 146)',
      ),
      true,
    );
  } finally {
    await browser.close();
  }
});

test('native comparison traces direct, variable-backed, shorthand, important, pseudo, and SVG differences', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const reference = await browser.newPage();
    const candidateContext = await browser.newContext();
    const candidate = await candidateContext.newPage();
    await reference.setContent(`
      <style>.card { color:#00128a; border:2px solid #00128a; } .card::before { content:'X'; color:#00128a } path { fill:#00128a }</style>
      <article class="card">Card<svg><path d="M0 0h10v10H0z"/></svg></article>
    `);
    await candidate.setContent(`
      <style>:root { --wrong:#86622d } .card { color:var(--wrong) !important; border:2px solid var(--wrong); } .card::before { content:'X'; color:var(--wrong) } path { fill:var(--wrong) }</style>
      <article class="card">Card<svg><path d="M0 0h10v10H0z"/></svg></article>
    `);
    const comparison = await compareNativeVisualPages(
      reference,
      candidate,
      await candidateContext.newCDPSession(candidate),
    );
    const color = comparison.differences.find(
      ({ property, tag }) => property === 'color' && tag === 'article',
    );
    assert.equal(color?.selector, '.card');
    assert.equal(color?.token, '--wrong');
    assert.equal(typeof color?.sourceLine, 'number');
    assert.equal(
      comparison.differences.some(
        ({ pseudo, property, selector }) =>
          pseudo === '::before' && property === 'color' && selector === '.card::before',
      ),
      true,
    );
    assert.equal(
      comparison.differences.some(
        ({ tag, property, selector }) =>
          tag === 'path' && property === 'fill' && selector === 'path',
      ),
      true,
    );
    await candidateContext.close();
  } finally {
    await browser.close();
  }
});

const result = (overrides: Partial<EngineBenchmarkResult>): EngineBenchmarkResult => ({
  engine: 'native',
  plantedDifferences: 20,
  detectedPlantedDifferences: 20,
  reportedDifferences: 20,
  truePositiveDifferences: 20,
  totalNodes: 40,
  accountedNodes: 40,
  attributableDifferences: 10,
  correctlyAttributedDifferences: 10,
  deterministic: true,
  runtimeMs: 1_000,
  ownedLines: 500,
  unsupportedProperties: [],
  hardFailures: [],
  ...overrides,
});

test('selects only an engine that passes every hard requirement', () => {
  const native = result({ engine: 'native' });
  const csstruth = result({
    engine: 'csstruth',
    detectedPlantedDifferences: 12,
    unsupportedProperties: ['color', 'font-weight'],
    hardFailures: ['planted recall is below 100%'],
    ownedLines: 100,
  });

  assert.equal(scoreAuditEngine(native).hardPass, true);
  assert.equal(scoreAuditEngine(csstruth).hardPass, false);
  assert.equal(selectAuditWinner([csstruth, native]).winner, 'native');
});

test('declares no production winner when every engine misses a hard requirement', () => {
  const selection = selectAuditWinner([
    result({ engine: 'native', hardFailures: ['ambiguous nodes remain'] }),
    result({ engine: 'csstruth', hardFailures: ['unsupported paint properties remain'] }),
  ]);
  assert.equal(selection.winner, undefined);
  assert.equal(selection.productionReady, false);
});
