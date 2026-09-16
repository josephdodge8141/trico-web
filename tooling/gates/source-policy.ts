import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const SKIPPED_DIRECTORIES = new Set([
  '.agents',
  '.claude',
  '.git',
  'artifacts',
  'dist',
  'node_modules',
]);
const BACKEND_LAYERS: Readonly<Record<string, number>> = {
  config: 0,
  models: 0,
  services: 1,
  controllers: 2,
  middleware: 2,
  routes: 3,
};
const REQUIRED_PROJECTS = ['backend', 'frontend', 'infra', 'packages/zod', 'packages/cucumber'];
const PAGE_STYLES = [
  'construction.css',
  'development.css',
  'home.css',
  'property-management.css',
  'real-estate.css',
  'storage.css',
] as const;
const ROOT_SOURCE_FILES = {
  backend: [
    'app.test.ts',
    'app.ts',
    'index.test.ts',
    'index.ts',
    'lambda.ts',
    'seed.ts',
    'shutdown-abort-failure-child.ts',
    'shutdown-child.ts',
  ],
  frontend: [
    'App.tsx',
    'main.tsx',
    'playwright.config.ts',
    'playwright.compose.config.ts',
    'vite.config.ts',
  ],
  infra: [],
  'packages/zod': ['index.ts', 'server.ts'],
  'packages/cucumber': ['index.ts'],
} as const;
const SUPPRESSION = new RegExp(
  ['@ts-(?:ignore|expect-error|nocheck)', 'eslint' + '-disable'].join('|'),
);
const PAGE_SELECTOR = /\.(?:home|pm|re|co|storage|dev)-[\w-]+/g;
const PAGE_LAYOUT_PROPERTIES = new Set([
  'align-content',
  'align-items',
  'align-self',
  'aspect-ratio',
  'bottom',
  'column-gap',
  'display',
  'flex',
  'flex-basis',
  'flex-direction',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-wrap',
  'gap',
  'grid',
  'grid-area',
  'grid-auto-columns',
  'grid-auto-flow',
  'grid-auto-rows',
  'grid-column',
  'grid-column-end',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-start',
  'grid-template',
  'grid-template-areas',
  'grid-template-columns',
  'grid-template-rows',
  'height',
  'inset',
  'inset-block',
  'inset-block-end',
  'inset-block-start',
  'inset-inline',
  'inset-inline-end',
  'inset-inline-start',
  'justify-content',
  'justify-items',
  'justify-self',
  'left',
  'margin',
  'margin-block',
  'margin-block-end',
  'margin-block-start',
  'margin-bottom',
  'margin-inline',
  'margin-inline-end',
  'margin-inline-start',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'object-fit',
  'object-position',
  'order',
  'overflow',
  'overflow-x',
  'overflow-y',
  'padding',
  'padding-block',
  'padding-block-end',
  'padding-block-start',
  'padding-bottom',
  'padding-inline',
  'padding-inline-end',
  'padding-inline-start',
  'padding-left',
  'padding-right',
  'padding-top',
  'place-content',
  'place-items',
  'place-self',
  'position',
  'right',
  'row-gap',
  'top',
  'width',
  'z-index',
]);

export async function checkSourcePolicy(root: string): Promise<string[]> {
  const files = await sourceFiles(root);
  const sourceText = await Promise.all(
    files.map(async (file) => ({ file, text: await readFile(path.join(root, file), 'utf8') })),
  );
  const errors = sourceText.flatMap((entry) => [
    ...knownDirectoryError(entry.file),
    ...backendImportErrors(entry.file, entry.text),
    ...frontendTransportErrors(entry.file, entry.text),
  ]);
  for (const entry of sourceText) {
    if (SUPPRESSION.test(entry.text)) {
      errors.push(`${entry.file} contains a TypeScript or ESLint suppression directive`);
    }
  }
  errors.push(...(await pageStyleColorErrors(root)));
  errors.push(...(await sharedStyleErrors(root)));
  errors.push(...(await fontContractErrors(root)));
  errors.push(...(await projectCoverageErrors(root, files)));
  return errors.sort((left, right) => left.localeCompare(right));
}

async function sharedStyleErrors(root: string): Promise<string[]> {
  const errors: string[] = [];
  const shared = await optionalFile(root, 'frontend/styles.css');
  if (shared !== undefined) {
    const selectors = [...new Set(shared.match(PAGE_SELECTOR) ?? [])].sort();
    if (selectors.length > 0) {
      errors.push(`frontend/styles.css contains page-prefixed selectors: ${selectors.join(', ')}`);
    }
  }
  for (const fileName of PAGE_STYLES) {
    const file = path.posix.join('frontend/pages', fileName);
    const source = await optionalFile(root, file);
    if (source === undefined) continue;
    const properties = cssProperties(source).filter(
      (property) => !PAGE_LAYOUT_PROPERTIES.has(property),
    );
    const unique = [...new Set(properties)].sort();
    if (unique.length > 0) {
      errors.push(`${file} contains non-layout declarations: ${unique.join(', ')}`);
    }
  }
  return errors;
}

async function fontContractErrors(root: string): Promise<string[]> {
  const source = await optionalFile(root, 'frontend/main.tsx');
  if (source === undefined) return [];
  const imports = [...source.matchAll(/@fontsource\/([^/'"]+)\/latin-(\d+)\.css/g)].map(
    (match) => ({ family: match[1] ?? '', weight: match[2] ?? '' }),
  );
  const errors: string[] = [];
  if (imports.some(({ family }) => family !== 'open-sans' && family !== 'lato')) {
    errors.push('frontend/main.tsx must not load typefaces other than Open Sans and Lato');
  }
  const weights = imports
    .filter(({ family }) => family === 'open-sans')
    .map(({ weight }) => weight)
    .sort();
  if (weights.join(',') !== '400,500,600,700') {
    errors.push('frontend/main.tsx must load Open Sans weights 400, 500, 600, and 700 exactly');
  }
  const headingWeights = imports
    .filter(({ family }) => family === 'lato')
    .map(({ weight }) => weight)
    .sort();
  if (headingWeights.join(',') !== '400,700') {
    errors.push('frontend/main.tsx must load Lato weights 400 and 700 exactly');
  }
  return errors;
}

async function optionalFile(root: string, file: string): Promise<string | undefined> {
  try {
    return await readFile(path.join(root, file), 'utf8');
  } catch {
    return undefined;
  }
}

function cssProperties(source: string): string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const properties: string[] = [];
  for (const block of withoutComments.matchAll(/\{([^{}]*)\}/g)) {
    for (const declaration of (block[1] ?? '').matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)) {
      const property = declaration[1];
      if (property !== undefined) properties.push(property);
    }
  }
  return properties;
}

async function pageStyleColorErrors(root: string): Promise<string[]> {
  const errors: string[] = [];
  for (const fileName of PAGE_STYLES) {
    const file = path.posix.join('frontend/pages', fileName);
    let source: string;
    try {
      source = await readFile(path.join(root, file), 'utf8');
    } catch {
      continue;
    }
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const ownsColor =
      /#[\da-f]{3,8}\b/i.test(withoutComments) ||
      /\b(?:rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color)\(/i.test(withoutComments) ||
      /(?<![-\w])(?:white|black|transparent)(?![-\w])/i.test(withoutComments) ||
      /--(?:home|pm|re|co|sp|storage|dev)-(?:primary|navy|gold|blue|muted|tint|border)\b/.test(
        withoutComments,
      );
    if (ownsColor) errors.push(`${file} contains page-owned color values or aliases`);
    const ownsTypography =
      /(?:^|[;{])\s*(?:color|font(?:-[\w-]+)?|line-height|letter-spacing|word-spacing|text-align|text-transform|text-decoration(?:-[\w-]+)?|text-indent|text-shadow|white-space|overflow-wrap|word-break|hyphens)\s*:/m.test(
        withoutComments,
      );
    if (ownsTypography) errors.push(`${file} contains page-owned typography declarations`);
  }
  return errors;
}

async function sourceFiles(root: string, relative = ''): Promise<string[]> {
  const folder = path.join(root, relative);
  const entries = await readdir(folder, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const next = path.posix.join(relative, entry.name);
        if (entry.isDirectory())
          return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(root, next);
        return entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [next] : [];
      }),
  );
  return nested.flat();
}

function knownDirectoryError(file: string): string[] {
  const parts = file.split('/');
  if (file === 'eslint.config.ts') return [];
  if (parts[0] === 'backend')
    return knownChild(file, parts, ROOT_SOURCE_FILES.backend, [
      'config',
      'controllers',
      'middleware',
      'models',
      'routes',
      'services',
      'steps',
    ]);
  if (parts[0] === 'frontend')
    return knownChild(file, parts, ROOT_SOURCE_FILES.frontend, [
      'assets',
      'components',
      'context',
      'e2e',
      'hooks',
      'pages',
      'services',
      'steps',
      'utils',
    ]);
  if (parts[0] === 'infra')
    return knownChild(file, parts, ROOT_SOURCE_FILES.infra, ['foundation', 'runtime']);
  if (parts[0] === 'packages' && parts[1] === 'zod')
    return knownChild(file, parts.slice(1), ROOT_SOURCE_FILES['packages/zod'], [
      'schemas',
      'seeds',
    ]);
  if (parts[0] === 'packages' && parts[1] === 'cucumber')
    return knownChild(file, parts.slice(1), ROOT_SOURCE_FILES['packages/cucumber'], ['catalog']);
  if (parts[0] === 'tooling' && (parts[1] === 'gates' || parts[1] === 'factory')) return [];
  return [`${file} is outside a known source directory`];
}

function knownChild(
  file: string,
  parts: readonly string[],
  rootFiles: readonly string[],
  children: readonly string[],
): string[] {
  if (parts.length === 2 && rootFiles.includes(parts[1] ?? '')) return [];
  if (parts.length > 2 && children.includes(parts[1] ?? '')) return [];
  return [`${file} is outside a known source directory`];
}

function backendImportErrors(file: string, text: string): string[] {
  if (!file.startsWith('backend/') || isTest(file)) return [];
  const ownLayer = backendLayer(file);
  if (ownLayer === undefined) return [];
  const errors: string[] = [];
  for (const specifier of importSpecifiers(text)) {
    if (!specifier.startsWith('.')) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    const targetLayer = backendLayer(target);
    if (targetLayer !== undefined && targetLayer > ownLayer) {
      errors.push(`${file} imports a higher backend layer: ${specifier}`);
    }
  }
  return errors;
}

function backendLayer(file: string): number | undefined {
  const parts = file.split('/');
  if (parts[0] !== 'backend') return undefined;
  return parts.length === 2 ? 4 : BACKEND_LAYERS[parts[1] ?? ''];
}

function frontendTransportErrors(file: string, text: string): string[] {
  if (!file.startsWith('frontend/') || file.startsWith('frontend/services/') || isTest(file))
    return [];
  if (/\bfetch\s*\(|\bnew\s+Request\s*\(|\bXMLHttpRequest\b/.test(text)) {
    return [`${file} uses frontend transport outside frontend/services`];
  }
  return [];
}

function importSpecifiers(text: string): readonly string[] {
  const specifiers: string[] = [];
  for (const match of text.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)) {
    const specifier = match[1] ?? match[2];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return specifiers;
}

function isTest(file: string): boolean {
  return /\.(?:test|steps)\.[cm]?[jt]sx?$/.test(file);
}

async function projectCoverageErrors(root: string, files: readonly string[]): Promise<string[]> {
  const rootConfig = await config(root, 'tsconfig.json');
  const references = rootConfig === undefined ? [] : projectReferences(rootConfig);
  const errors = REQUIRED_PROJECTS.filter((project) => !references.includes(project)).map(
    (project) => `tsconfig.json is missing reference ${project}`,
  );
  const configBySource = new Map<string, string>();
  for (const file of files) {
    const project = projectFor(file);
    if (project !== undefined) configBySource.set(file, project);
  }
  for (const [file, configFile] of configBySource) {
    const project = await config(root, configFile);
    if (project === undefined || !covers(project, file, configFile)) {
      errors.push(`${file} is not covered by ${configFile}`);
    }
  }
  return errors;
}

function projectFor(file: string): string | undefined {
  if (file === 'eslint.config.ts' || file.startsWith('tooling/')) return 'tsconfig.tooling.json';
  for (const project of REQUIRED_PROJECTS) {
    if (file.startsWith(`${project}/`)) return `${project}/tsconfig.json`;
  }
  return undefined;
}

async function config(root: string, file: string): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path.join(root, file), 'utf8'));
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function projectReferences(value: Record<string, unknown>): string[] {
  if (!Array.isArray(value.references)) return [];
  return value.references.flatMap((reference) => {
    if (typeof reference === 'string') return [reference];
    if (isRecord(reference) && typeof reference.path === 'string') return [reference.path];
    return [];
  });
}

function covers(configValue: Record<string, unknown>, file: string, configFile: string): boolean {
  if (!Array.isArray(configValue.include)) return false;
  const include = configValue.include.filter((entry): entry is string => typeof entry === 'string');
  if (configFile === 'tsconfig.tooling.json') {
    return file === 'eslint.config.ts'
      ? include.includes('eslint.config.ts')
      : include.includes('tooling/**/*.ts');
  }
  return include.includes('**/*.ts') || (file.endsWith('.tsx') && include.includes('**/*.tsx'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const errors = await checkSourcePolicy(root);
  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Source policy passed.\n');
  }
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
