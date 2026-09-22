import assert from 'node:assert/strict';
import test from 'node:test';

import { parseReleaseManifest } from './release.js';

const manifest = {
  version: 1,
  releaseSha: 'a'.repeat(40),
  backendImageUri:
    '111111111111.dkr.ecr.us-east-2.amazonaws.com/trico-web-release-backend@sha256:' +
    'b'.repeat(64),
  frontend: {
    key: `releases/${'a'.repeat(40)}/frontend-dist.tar.gz`,
    sha256: 'c'.repeat(64),
  },
  publishedAt: '2026-09-22T00:00:00.000Z',
};

test('factory.delivery.release-identity accepts one strict SHA-addressed manifest', () => {
  assert.deepEqual(parseReleaseManifest(manifest), manifest);
});

test('factory.delivery.promote-exact rejects substituted or mutable release artifacts', () => {
  assert.throws(() => parseReleaseManifest({ ...manifest, releaseSha: 'not-a-sha' }), /releaseSha/);
  assert.throws(
    () => parseReleaseManifest({ ...manifest, backendImageUri: 'example:latest' }),
    /backendImageUri/,
  );
  assert.throws(
    () =>
      parseReleaseManifest({
        ...manifest,
        frontend: { ...manifest.frontend, key: 'releases/other/frontend-dist.tar.gz' },
      }),
    /frontend.key/,
  );
});
