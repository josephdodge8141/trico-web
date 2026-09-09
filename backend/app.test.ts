import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import { mediaPresignRequestSchema, tricoEmailSchema } from '@app/schemas';

import { createApp } from './app.js';
import { createConnections, type Connections } from './config/connections.js';
import { sessionCookieOptions } from './middleware/session.js';
import { assertPublicationFits, estimatePublishActions } from './services/content.js';
import { ServiceError } from './services/errors.js';

const listenForTest = async (
  connections: Connections = createConnections(),
): Promise<{ baseUrl: string; close: () => Promise<void> }> => {
  const server = createApp({ connections }).listen(0);
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  return {
    baseUrl: `http://127.0.0.1:${String((address as AddressInfo).port)}`,
    close: async () => {
      server.close();
      await once(server, 'close');
      await connections.close();
    },
  };
};

test('public health returns the exact shared response shape', async () => {
  const app = await listenForTest();
  try {
    const response = await fetch(`${app.baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await app.close();
  }
});

test('unknown routes return a safe typed error response', async () => {
  const app = await listenForTest();
  try {
    const response = await fetch(`${app.baseUrl}/api/v1/missing`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  } finally {
    await app.close();
  }
});

test('health is constructed from the config-owned outbound connection', async () => {
  let calls = 0;
  const connections = createConnections();
  const wrapped: Connections = {
    ...connections,
    health: {
      getHealth: () => {
        calls += 1;
        return { status: 'ok' };
      },
    },
  };
  const app = await listenForTest(wrapped);
  try {
    assert.equal((await fetch(`${app.baseUrl}/api/v1/health`)).status, 200);
    assert.equal(calls, 1);
  } finally {
    await app.close();
  }
});

test('TriCo registration contracts reject outside email domains', () => {
  assert.equal(tricoEmailSchema.safeParse('editor@tricoinc.com').success, true);
  assert.equal(tricoEmailSchema.safeParse('editor@example.com').success, false);
});

test('media contracts reject disallowed MIME types and payloads over 20 MiB', () => {
  assert.equal(
    mediaPresignRequestSchema.safeParse({
      fileName: 'photo.svg',
      contentType: 'image/svg+xml',
      contentLength: 1_024,
    }).success,
    false,
  );
  assert.equal(
    mediaPresignRequestSchema.safeParse({
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      contentLength: 20 * 1_024 * 1_024 + 1,
    }).success,
    false,
  );
});

test('session cookies remain strict and fixed at 30 days', () => {
  const options = sessionCookieOptions({
    appEnvironment: 'test',
    host: '127.0.0.1',
    port: 3000,
    shutdownTimeoutMs: 100,
    publicOrigin: 'http://127.0.0.1',
    awsRegion: 'us-west-2',
    dynamoTable: 'trico-web-test',
    s3Bucket: 'trico-web-test',
    s3ForcePathStyle: true,
    mailTransport: 'smtp',
    smtpHost: '127.0.0.1',
    smtpPort: 1025,
    emailFrom: 'website@tricoinc.com',
    bedrockMode: 'fixture',
    sessionCookieName: 'trico_session',
    cookieSecure: true,
  });
  assert.deepEqual(options, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1_000,
  });
});

test('publication action accounting identifies the first oversized simple selection', () => {
  assert.equal(estimatePublishActions(48, 1), 99);
  assert.equal(estimatePublishActions(49, 1), 101);
});

test('publication snapshots enforce the conservative DynamoDB item ceiling', () => {
  assert.doesNotThrow(() =>
    assertPublicationFits([{ entityId: 'home.hero', entityVersion: 1, value: 'small' }]),
  );
  assert.throws(
    () =>
      assertPublicationFits([
        { entityId: 'home.hero', entityVersion: 1, value: 'x'.repeat(360 * 1_024) },
      ]),
    (error: unknown) => error instanceof ServiceError && error.code === 'PAGE_SNAPSHOT_TOO_LARGE',
  );
});
