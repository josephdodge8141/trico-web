import { readFile } from 'node:fs/promises';

import { parseReleaseManifest } from './release.js';

async function main(): Promise<void> {
  const [operation, manifestPath, expectedSha] = process.argv.slice(2);
  if (operation !== 'verify' || manifestPath === undefined || expectedSha === undefined) {
    throw new Error('usage: release-cli.ts verify <manifest-path> <expected-sha>');
  }
  const manifest = parseReleaseManifest(JSON.parse(await readFile(manifestPath, 'utf8')));
  if (manifest.releaseSha !== expectedSha) {
    throw new Error('release manifest SHA does not match the requested release');
  }
  process.stdout.write(`${JSON.stringify(manifest)}\n`);
}

await main();
