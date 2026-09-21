import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { auditedVisualProperties } from './visual-audit-contract.js';

const execute = promisify(execFile);

export type CsstruthLayoutComparison = Readonly<{
  engine: 'csstruth';
  referenceLayout: string;
  candidateLayout: string;
  structuralDiff: string;
  changedEntries: number;
  unsupportedProperties: readonly string[];
}>;

export type CsstruthExplanation = Readonly<{
  selector: string;
  property: string;
  computedValue: string;
  declaredWinner?: string;
  source?: string;
  raw: string;
}>;

export type CsstruthAdapterOptions = Readonly<{
  binary?: string;
  viewport?: Readonly<{ width: number; height: number }>;
  port?: number;
}>;

const nativeSnapshotProperties = new Set([
  'display',
  'position',
  'flex-direction',
  'justify-content',
  'align-items',
  'gap',
  'grid-template-columns',
  'grid-template-rows',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'overflow-x',
  'overflow-y',
  'z-index',
  'opacity',
  'transform',
  'top',
  'right',
  'bottom',
  'left',
]);

export class CsstruthAdapter {
  readonly binary: string;
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly port: number | undefined;

  constructor(options: CsstruthAdapterOptions = {}) {
    this.binary = options.binary ?? path.resolve('node_modules/.bin/csstruth');
    this.viewport = options.viewport ?? { width: 1440, height: 1100 };
    this.port = options.port;
  }

  private async run(args: readonly string[]): Promise<string> {
    const connection = this.port === undefined ? [] : ['--attach', '--port', String(this.port)];
    const result = await execute(this.binary, [...args, ...connection], {
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return result.stdout.trim();
  }

  private viewportArguments(): readonly string[] {
    return ['--viewport', `${String(this.viewport.width)}x${String(this.viewport.height)}`];
  }

  async layout(url: string): Promise<string> {
    return this.run(['layout', url, ...this.viewportArguments(), '--settled']);
  }

  async inspect(url: string, selector: string): Promise<string> {
    return this.run([
      'inspect',
      url,
      '--selector',
      selector,
      ...this.viewportArguments(),
      '--settled',
    ]);
  }

  async explain(url: string, selector: string, property: string): Promise<CsstruthExplanation> {
    const raw = await this.run([
      'explain',
      url,
      '--selector',
      selector,
      '--property',
      property,
      ...this.viewportArguments(),
      '--settled',
    ]);
    const first = raw.split('\n')[0] ?? '';
    const computedValue = first.slice(first.indexOf(' = ') + 3);
    const winner = raw.split('\n').find((line) => line.trimStart().startsWith('✓ '));
    const parsedWinner = winner?.match(/^\s*✓\s+[^:]+:\s+(.+?)\s{3}(.+?)\s+\(/u);
    return {
      selector,
      property,
      computedValue,
      ...(parsedWinner?.[1] === undefined ? {} : { declaredWinner: parsedWinner[1] }),
      ...(parsedWinner?.[2] === undefined ? {} : { source: parsedWinner[2] }),
      raw,
    };
  }

  async compare(referenceUrl: string, candidateUrl: string): Promise<CsstruthLayoutComparison> {
    const directory = await mkdtemp(path.join(tmpdir(), 'trico-csstruth-'));
    try {
      const referenceLayout = await this.layout(referenceUrl);
      const candidateLayout = await this.layout(candidateUrl);
      await this.run([
        'snapshot',
        referenceUrl,
        '--name',
        'reference',
        '--dir',
        directory,
        ...this.viewportArguments(),
        '--settled',
      ]);
      const structuralDiff = await this.run([
        'diff',
        candidateUrl,
        '--name',
        'reference',
        '--dir',
        directory,
        ...this.viewportArguments(),
        '--settled',
      ]);
      return {
        engine: 'csstruth',
        referenceLayout,
        candidateLayout,
        structuralDiff,
        changedEntries:
          structuralDiff === '(no layout changes)'
            ? 0
            : structuralDiff
                .split('\n')
                .filter((line) => /^(appeared|disappeared|moved|resized):/u.test(line)).length,
        unsupportedProperties: auditedVisualProperties.filter(
          (property) => !nativeSnapshotProperties.has(property),
        ),
      };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
