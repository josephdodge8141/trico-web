import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CmsRequestError,
  confirmMediaUpload,
  fetchCsrfToken,
  fetchMediaLibrary,
  fetchPreviewDisabled,
  requestMediaUpload,
  saveEntityChange,
  updateExternalSource,
} from './cms.js';

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

test('preserves an unauthorized response status for authentication routing', async () => {
  await assert.rejects(
    fetchCsrfToken({
      fetchImpl: async () => new Response(null, { status: 401 }),
    }),
    (error: unknown) => error instanceof CmsRequestError && error.status === 401,
  );
});

test('loads persisted preview visibility without exposing preference metadata', async () => {
  const result = await fetchPreviewDisabled({
    fetchImpl: async (input) => {
      assert.equal(String(input), '/api/v1/preview/preferences');
      return jsonResponse({ disabledEntityIds: ['home.hero'] });
    },
  });
  assert.deepEqual(result, ['home.hero']);
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

test('uses contentLength and receives an opaque media upload reservation', async () => {
  let requestBody = '';
  const result = await requestMediaUpload(new File(['image'], 'photo.png', { type: 'image/png' }), {
    fetchImpl: async (_input, init) => {
      requestBody = typeof init?.body === 'string' ? init.body : '';
      return jsonResponse({
        uploadUrl: 'https://upload.example.test/media',
        expiresAt: '2026-09-08T12:05:00.000Z',
        uploadId: '50000000-0000-4000-8000-000000000001',
        publicUrl: 'https://cdn.example.test/photo.png',
      });
    },
  });
  assert.equal(JSON.parse(requestBody).contentLength, 5);
  assert.equal(result.publicUrl, 'https://cdn.example.test/photo.png');
  assert.equal(JSON.stringify(result).includes('key'), false);
});

test('confirms uploads and validates paged library responses without storage details', async () => {
  const asset = {
    id: '50000000-0000-4000-8000-000000000002',
    name: 'Main office',
    altText: 'Main office exterior',
    contentType: 'image/webp',
    contentLength: 42,
    publicUrl: '/media/main-office.webp',
    createdAt: '2026-09-08T12:00:00.000Z',
  } as const;
  let confirmBody = '';
  const confirmed = await confirmMediaUpload(
    '50000000-0000-4000-8000-000000000001',
    'Main office',
    'Main office exterior',
    {
      csrfToken: 'x'.repeat(32),
      fetchImpl: async (_input, init) => {
        confirmBody = typeof init?.body === 'string' ? init.body : '';
        return jsonResponse(asset);
      },
    },
  );
  assert.equal(JSON.stringify(confirmBody).includes('key'), false);
  assert.deepEqual(confirmed, asset);
  const page = await fetchMediaLibrary(undefined, 12, {
    fetchImpl: async (input) => {
      assert.match(String(input), /limit=12/);
      return jsonResponse({ assets: [asset], nextCursor: null });
    },
  });
  assert.deepEqual(page.assets, [asset]);
});

test('sends the explicit overridden field selection when resuming synchronization', async () => {
  let requestBody = '';
  await updateExternalSource(
    '50000000-0000-4000-8000-000000000003',
    { overriddenFields: ['status'] },
    {
      csrfToken: 'x'.repeat(32),
      fetchImpl: async (_input, init) => {
        requestBody = typeof init?.body === 'string' ? init.body : '';
        return jsonResponse({
          id: '50000000-0000-4000-8000-000000000003',
          entityId: 'real-estate.listings.items',
          itemId: '50000000-0000-4000-8000-000000000004',
          type: 'MLS',
          url: 'https://listings.example/item',
          validationFields: ['price'],
          overriddenFields: ['status'],
          enabled: true,
          createdAt: '2026-09-08T12:00:00.000Z',
          updatedAt: '2026-09-08T12:01:00.000Z',
        });
      },
    },
  );
  assert.deepEqual(JSON.parse(requestBody), { overriddenFields: ['status'] });
});
