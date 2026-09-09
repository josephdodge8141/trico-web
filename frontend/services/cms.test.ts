import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCsrfToken, requestMediaUpload, saveEntityChange } from './cms.js';

const jsonResponse = (value: unknown): Response =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

test('reads the canonical CSRF token property', async () => {
  const token = await fetchCsrfToken({
    fetchImpl: async () => jsonResponse({ token: 'x'.repeat(32) }),
  });
  assert.equal(token, 'x'.repeat(32));
});

test('sends a complete replacement with the expected revision', async () => {
  let requestBody = '';
  const fetchImpl: typeof fetch = async (_input, init) => {
    requestBody = typeof init?.body === 'string' ? init.body : '';
    return jsonResponse({
      entityId: 'home.hero',
      pageId: 'home',
      authorId: '11111111-1111-4111-8111-111111111111',
      baseEntityVersion: 1,
      revision: 3,
      beforeValue: { title: 'Old' },
      replacementValue: { title: 'New' },
      createdAt: '2026-09-08T12:00:00.000Z',
      updatedAt: '2026-09-08T12:00:00.000Z',
    });
  };
  await saveEntityChange('home.hero', { title: 'New' }, 2, {
    fetchImpl,
    csrfToken: 'x'.repeat(32),
  });
  assert.deepEqual(JSON.parse(requestBody), {
    replacementValue: { title: 'New' },
    expectedRevision: 2,
  });
});

test('uses contentLength and reads nested media reference', async () => {
  let requestBody = '';
  const result = await requestMediaUpload(new File(['image'], 'photo.png', { type: 'image/png' }), {
    fetchImpl: async (_input, init) => {
      requestBody = typeof init?.body === 'string' ? init.body : '';
      return jsonResponse({
        uploadUrl: 'https://upload.example.test/media',
        expiresAt: '2026-09-08T12:05:00.000Z',
        reference: {
          bucket: 'media',
          key: 'key/photo.png',
          publicUrl: 'https://cdn.example.test/key/photo.png',
        },
      });
    },
  });
  assert.equal(JSON.parse(requestBody).contentLength, 5);
  assert.equal(result.reference.publicUrl, 'https://cdn.example.test/key/photo.png');
});
