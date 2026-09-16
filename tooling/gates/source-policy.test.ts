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
    'frontend/pages/home.css contains non-layout declarations: --home-primary, background, border-color, color',
    'frontend/pages/home.css contains page-owned color values or aliases',
    'frontend/pages/home.css contains page-owned typography declarations',
  ]);
});

test('rejects page-owned typography declarations', async () => {
  const root = await fixture({
    'frontend/pages/home.css': '.copy { font-size: 1rem; line-height: 1.5; }\n',
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'frontend/pages/home.css contains non-layout declarations: font-size, line-height',
    'frontend/pages/home.css contains page-owned typography declarations',
  ]);
});

test('rejects page-prefixed selectors in the shared stylesheet', async () => {
  const root = await fixture({
    'frontend/styles.css': '.ui-card { display: block; }\n.pm-card { color: var(--ink); }\n',
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'frontend/styles.css contains page-prefixed selectors: .pm-card',
  ]);
});

test('rejects non-layout declarations in page stylesheets', async () => {
  const root = await fixture({
    'frontend/pages/home.css': [
      '.home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }',
      '.home-card { border-radius: 8px; box-shadow: 0 2px 4px var(--shadow); }',
      '.home-link:hover { transition: color 180ms ease; transform: translateY(-1px); }',
    ].join('\n'),
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'frontend/pages/home.css contains non-layout declarations: border-radius, box-shadow, transform, transition',
  ]);
});

test('requires Open Sans body and Lato heading faces with visual-parity weights only', async () => {
  const root = await fixture({
    'frontend/main.tsx': [
      "import '@fontsource/roboto/latin-400.css';",
      "import '@fontsource/open-sans/latin-300.css';",
      "import '@fontsource/open-sans/latin-400.css';",
      "import '@fontsource/open-sans/latin-600.css';",
      "import '@fontsource/open-sans/latin-700.css';",
    ].join('\n'),
  });
  assert.deepEqual(await checkSourcePolicy(root), [
    'frontend/main.tsx must load Lato weights 400 and 700 exactly',
    'frontend/main.tsx must load Open Sans weights 400, 500, 600, and 700 exactly',
    'frontend/main.tsx must not load typefaces other than Open Sans and Lato',
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
    'frontend/playwright.config.ts': 'export {};\n',
    'frontend/playwright.compose.config.ts': 'export {};\n',
    'frontend/vite.config.ts': 'export {};\n',
    'frontend/styles.css': ':root { font-family: Open Sans, sans-serif; }\n',
    'frontend/main.tsx': [
      "import '@fontsource/lato/latin-400.css';",
      "import '@fontsource/lato/latin-700.css';",
      "import '@fontsource/open-sans/latin-400.css';",
      "import '@fontsource/open-sans/latin-500.css';",
      "import '@fontsource/open-sans/latin-600.css';",
      "import '@fontsource/open-sans/latin-700.css';",
    ].join('\n'),
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
