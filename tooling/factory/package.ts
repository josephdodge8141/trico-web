import { execFile, spawn } from 'node:child_process';
import { access, copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const forbiddenPath =
  /(?:^|\/)(?:\.git|node_modules|dist|build|cdk\.out|artifacts|test-results|playwright-report)(?:\/|$)/;
const forbiddenName = /(?:^|\/)\.env(?:$|\.(?!example$))/;
const privateContent = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /BEGIN [A-Z ]+ PRIVATE KEY/,
  /\bAKIA[0-9A-Z]{16}\b/,
];

export function validateExportManifest(files: readonly string[]): void {
  const sorted = [...files].sort((left, right) => left.localeCompare(right));
  const duplicates = sorted.filter((file, index) => file === sorted[index - 1]);
  const invalid = files.filter((file) => forbiddenPath.test(file) || forbiddenName.test(file));
  if (duplicates.length > 0 || invalid.length > 0 || sorted.some((file) => file.startsWith('/'))) {
    const details = [...new Set([...duplicates, ...invalid])].sort((left, right) =>
      left.localeCompare(right),
    );
    throw new Error(
      `non-public export artifact${details.length > 0 ? `: ${details.join(', ')}` : ''}`,
    );
  }
  if (files.some((file, index) => file !== sorted[index])) {
    throw new Error('public factory manifest must be sorted');
  }
}

export async function exportFactory(root: string, destination: string): Promise<readonly string[]> {
  const files = await trackedFiles(root);
  validateExportManifest(files);
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(destination, { recursive: false });
  for (const file of files) {
    const source = path.join(root, file);
    const content = await readFile(source);
    if (privateContent.some((pattern) => pattern.test(content.toString('utf8')))) {
      throw new Error(`private or secret content found in ${file}`);
    }
    const target = path.join(destination, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return files;
}

async function trackedFiles(root: string): Promise<string[]> {
  await requireCommittedTree(root);
  const result = await execFileAsync('git', ['-C', root, 'ls-files', '--cached', '-z'], {
    encoding: 'utf8',
  });
  return result.stdout
    .split('\0')
    .filter((file) => file.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

async function requireCommittedTree(root: string): Promise<void> {
  for (const args of [
    ['-C', root, 'diff', '--quiet', '--'],
    ['-C', root, 'diff', '--cached', '--quiet', '--'],
  ]) {
    try {
      await execFileAsync('git', args);
    } catch (error: unknown) {
      if (isExitCode(error, 1)) {
        throw new Error('public factory export requires a committed tracked tree');
      }
      throw error;
    }
  }
}

function isExitCode(error: unknown, code: number): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

async function run(command: string, args: readonly string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else
        reject(new Error(`${command} exited with ${String(code)}${signal ? ` (${signal})` : ''}`));
    });
  });
}

async function cleanCloneProof(withDocker: boolean): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'fullstack-ts-proof-'));
  const clone = path.join(temporaryRoot, 'clone');
  try {
    await exportFactory(root, clone);
    await run('npm', ['ci'], clone);
    await run('npm', ['run', 'check'], clone);
    if (withDocker) await dockerProof(clone);
    process.stdout.write(`Clean-clone proof passed: ${clone}\n`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function dockerProof(clone: string): Promise<void> {
  const project = `fullstack-ts-proof-${process.pid}`;
  let proofFailure: unknown;
  try {
    await run('docker', ['compose', '--project-name', project, 'up', '--build', '-d'], clone);
    await waitForResponse('http://app.localhost:8088/', (body) =>
      body.includes("<title>TriCo · Building Utah's Future</title>"),
    );
    await waitForResponse('http://app.localhost:8088/api/v1/health', (body) =>
      body.includes('"status":"ok"'),
    );
    await run('npm', ['run', 'test:behaviors:frontend:compose'], clone);
    await run('npm', ['run', 'test:browser:compose', '-w', '@app/frontend'], clone);
  } catch (error: unknown) {
    proofFailure = error;
  }
  try {
    await run(
      'docker',
      ['compose', '--project-name', project, 'down', '--volumes', '--remove-orphans'],
      clone,
    );
  } catch (cleanupFailure: unknown) {
    if (proofFailure !== undefined) {
      throw new AggregateError([proofFailure, cleanupFailure], 'proof and Docker cleanup failed');
    }
    throw cleanupFailure;
  }
  if (proofFailure !== undefined) throw proofFailure;
}

async function waitForResponse(url: string, accepts: (body: string) => boolean): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok && accepts(await response.text())) return;
    } catch {
      // The local stack is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`local stack did not become ready: ${url}`);
}

async function main(): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const proof = process.argv.includes('--proof');
  const withDocker = process.argv.includes('--docker');
  if (proof) {
    await cleanCloneProof(withDocker);
    return;
  }
  const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
  const destination =
    outputArgument?.slice('--output='.length) ?? path.join(root, 'artifacts/factory');
  try {
    await access(destination);
    throw new Error(`output already exists: ${destination}`);
  } catch (error: unknown) {
    if (error instanceof Error && !('code' in error)) throw error;
  }
  const files = await exportFactory(root, path.resolve(destination));
  process.stdout.write(
    `Exported ${String(files.length)} tracked files to ${path.resolve(destination)}\n`,
  );
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
