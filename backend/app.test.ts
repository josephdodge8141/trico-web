import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import {
  mediaPresignRequestSchema,
  registrySeedData,
  tricoEmailSchema,
  type EditableValue,
  type EntityId,
} from '@app/schemas';

import { createApp } from './app.js';
import { createConnections, type Connections } from './config/connections.js';
import { sessionCookieOptions } from './middleware/session.js';
import {
  assertPublicationFits,
  createContentService,
  estimatePublishActions,
} from './services/content.js';
import { ServiceError } from './services/errors.js';
import { createMediaService } from './services/media.js';
import { MemoryDynamo, MemoryS3 } from './steps/memory.js';

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

test('media confirmation rejects an object that does not match its constrained reservation', async () => {
  const database = new MemoryDynamo();
  const objects = new MemoryS3();
  const uploadId = '50000000-0000-4000-8000-000000000001';
  database.items.set(`MEDIA#UPLOAD|UPLOAD#${uploadId}`, {
    pk: 'MEDIA#UPLOAD',
    sk: `UPLOAD#${uploadId}`,
    uploadId,
    userId: '00000000-0000-4000-8000-000000000101',
    bucket: 'media-test',
    objectKey: `media/${uploadId}.png`,
    publicUrl: `/media/${uploadId}.png`,
    contentType: 'image/png',
    contentLength: 4,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    ttl: Math.floor(Date.now() / 1_000) + 300,
  });
  objects.objects.set(`media/${uploadId}.png`, 'different bytes');
  const media = createMediaService(
    objects.asClient(),
    'media-test',
    database.asClient(),
    'media-test',
  );
  await assert.rejects(
    media.confirm(
      { uploadId, name: 'Office', altText: 'Office exterior' },
      '00000000-0000-4000-8000-000000000101',
    ),
    (error: unknown) => error instanceof ServiceError && error.code === 'MEDIA_UPLOAD_MISMATCH',
  );
  assert.equal(
    [...database.items.values()].some((item) => item['pk'] === 'MEDIA#LIBRARY'),
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

test('preview consistently renders saved revisions and honors hide/show preferences', async () => {
  const database = new MemoryDynamo();
  const objects = new MemoryS3();
  const databaseClient = {
    send: async (command: unknown): Promise<unknown> => {
      const candidate = command as {
        readonly constructor: { readonly name: string };
        readonly input: { readonly ExpressionAttributeValues?: Record<string, unknown> };
      };
      if (
        candidate.constructor.name === 'QueryCommand' &&
        candidate.input.ExpressionAttributeValues?.[':page'] !== undefined
      ) {
        return { Items: [] };
      }
      return database.send(command);
    },
  } as ReturnType<MemoryDynamo['asClient']>;
  const content = createContentService(
    databaseClient,
    objects.asClient(),
    'preview-test',
    'preview-test',
  );
  const entityId = 'home.hero' as EntityId;
  const userId = '00000000-0000-4000-8000-000000000101';
  const published = registrySeedData[entityId];
  assert.ok(published !== undefined && typeof published === 'object' && !Array.isArray(published));
  const first = { ...published, heading: 'First preview revision' } as EditableValue;
  const second = { ...published, heading: 'Second preview revision' } as EditableValue;

  const created = await content.createChange(entityId, userId, first);
  assert.deepEqual(pageEntity(await content.preview('home', userId), entityId), first);

  const updated = await content.updateChange(entityId, userId, created.revision, second);
  assert.deepEqual(pageEntity(await content.preview('home', userId), entityId), second);

  await content.togglePreview(userId, entityId, true);
  assert.deepEqual(await content.previewDisabled(userId), [entityId]);
  assert.deepEqual(pageEntity(await content.preview('home', userId), entityId), published);
  await content.togglePreview(userId, entityId, false);
  assert.deepEqual(await content.previewDisabled(userId), []);
  assert.deepEqual(pageEntity(await content.preview('home', userId), entityId), second);
  assert.equal(updated.revision, 2);
});

const pageEntity = (
  page: Readonly<Record<string, EditableValue>>,
  entityId: EntityId,
): EditableValue | undefined => page[entityId];
