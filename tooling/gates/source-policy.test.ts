import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkSourcePolicy } from './source-policy.js';

test('accepts the ordinary known directories, root allowlists, and project coverage', async () => {
  const root = await fixture();
  assert.deepEqual(await checkSourcePolicy(root), []);
});

test('rejects an unallowlisted backend root file', async () => {
  const root = await fixture({ 'backend/worker.ts': 'export const worker = 1;\n' });
  assert.deepEqual(await checkSourcePolicy(root), [
    'backend/worker.ts is outside a known source directory',
  ]);
});

test('rejects unknown placement and obvious backend direction inversions', async () => {
  const root = await fixture({
    'backend/unknown/worker.ts': 'export const worker = 1;\n',
    'backend/services/bad.ts': "import '../controllers/health.js';\n",
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'backend/services/bad.ts imports a higher backend layer: ../controllers/health.js',
    'backend/unknown/worker.ts is outside a known source directory',
  ]);
});

test('rejects frontend transport outside services and source suppressions', async () => {
  const root = await fixture({
    'frontend/pages/bad.ts': "fetch('/api/v1/health');\n",
    'infra/runtime/bad.ts': '// @ts-' + 'ignore\nexport const value = 1;\n',
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'frontend/pages/bad.ts uses frontend transport outside frontend/services',
    'infra/runtime/bad.ts contains a TypeScript or ESLint suppression directive',
  ]);
});

test('rejects incomplete TypeScript project coverage', async () => {
  const root = await fixture({
    'tsconfig.tooling.json': JSON.stringify({ include: ['tooling/**/*.ts'] }),
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'eslint.config.ts is not covered by tsconfig.tooling.json',
  ]);
});

test('rejects page-owned color values and aliases', async () => {
  const root = await fixture({
    'frontend/pages/home.css': [
      '.literal { color: #00128a; }',
      '.function { background: rgb(0 18 138 / 10%); }',
      '.named { border-color: transparent; }',
      ':root { --home-primary: var(--trico-color-dark); }',
    ].join('\n'),
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'frontend/pages/home.css contains page-owned color values or aliases',
  ]);
});

async function fixture(files: Readonly<Record<string, string>> = {}): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'source-policy-'));
  const baseline: Record<string, string> = {
    'tsconfig.json': JSON.stringify({
      references: ['backend', 'frontend', 'infra', 'packages/zod', 'packages/cucumber'],
    }),
    'tsconfig.tooling.json': JSON.stringify({ include: ['tooling/**/*.ts', 'eslint.config.ts'] }),
    'backend/tsconfig.json': JSON.stringify({ include: ['**/*.ts'] }),
    'frontend/tsconfig.json': JSON.stringify({ include: ['**/*.ts', '**/*.tsx'] }),
    'infra/tsconfig.json': JSON.stringify({ include: ['**/*.ts', '**/*.tsx'] }),
    'packages/zod/tsconfig.json': JSON.stringify({ include: ['**/*.ts'] }),
    'packages/cucumber/tsconfig.json': JSON.stringify({ include: ['**/*.ts'] }),
    'eslint.config.ts': 'export default [];\n',
    'backend/app.test.ts': 'export {};\n',
    'backend/app.ts': 'export {};\n',
    'backend/index.test.ts': 'export {};\n',
    'backend/index.ts': 'export {};\n',
    'backend/shutdown-abort-failure-child.ts': 'export {};\n',
    'backend/shutdown-child.ts': 'export {};\n',
    'backend/config/environment.ts': 'export const environment = {};\n',
    'backend/models/health.ts': 'export const health = {};\n',
    'backend/services/health.ts': "import '../models/health.js';\n",
    'backend/steps/application.steps.ts': 'export {};\n',
    'backend/controllers/health.ts': "import '../services/health.js';\n",
    'backend/routes/health.ts': "import '../controllers/health.js';\n",
    'frontend/services/health.ts': "fetch('/api/v1/health');\n",
    'frontend/steps/application.steps.ts': "fetch('/api/v1/health');\n",
    'frontend/App.tsx': 'export {};\n',
    'frontend/main.tsx': 'export {};\n',
    'frontend/playwright.config.ts': 'export {};\n',
    'frontend/playwright.compose.config.ts': 'export {};\n',
    'frontend/vite.config.ts': 'export {};\n',
    'frontend/pages/home.tsx': 'export const Home = null;\n',
    'infra/runtime/protocol.ts': 'export const protocol = 1;\n',
    'packages/zod/index.ts': 'export {};\n',
    'packages/zod/server.ts': 'export {};\n',
    'packages/zod/seeds/home.ts': 'export const home = {};\n',
    'packages/cucumber/index.ts': 'export {};\n',
    'tooling/gates/example.ts': 'export {};\n',
  };
  for (const [file, content] of Object.entries({ ...baseline, ...files })) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), content);
  }
  return root;
}
