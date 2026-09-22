import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { exportFactory, validateExportManifest } from './package.js';

const execFileAsync = promisify(execFile);

test('public factory rejects non-public artifacts', () => {
  assert.throws(
    () => validateExportManifest(['README.md', '.env', 'backend/dist/index.js']),
    /non-public export artifact/,
  );
});

test('public factory exports sorted tracked source without build artifacts', async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'factory-test-'));
  const source = path.join(temporaryRoot, 'source');
  const destination = path.join(temporaryRoot, 'clone');
  try {
    await mkdir(path.join(source, 'backend'), { recursive: true });
    await writeFile(path.join(source, 'README.md'), '# fixture\n');
    await writeFile(
      path.join(source, 'backend', 'index.ts'),
      "export const previewPath = '/api/v1/pages/home/preview';\n",
    );
    await execFileAsync('git', ['init', '--quiet'], { cwd: source });
    await execFileAsync('git', ['add', 'README.md', 'backend/index.ts'], { cwd: source });
    await execFileAsync(
      'git',
      [
        '-c',
        'user.name=Factory Test',
        '-c',
        'user.email=factory@example.test',
        'commit',
        '--quiet',
        '-m',
        'fixture',
      ],
      { cwd: source },
    );
    const files = await exportFactory(source, destination);
    assert.deepEqual(
      files,
      [...files].sort((left, right) => left.localeCompare(right)),
    );
    assert.equal(await readFile(path.join(destination, 'README.md'), 'utf8'), '# fixture\n');
    assert.deepEqual(files, ['backend/index.ts', 'README.md']);
    assert.equal(files.includes('.env'), false);

    await writeFile(path.join(source, 'README.md'), '# changed\n');
    await assert.rejects(
      exportFactory(source, path.join(temporaryRoot, 'dirty-clone')),
      /requires a committed tracked tree/,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
