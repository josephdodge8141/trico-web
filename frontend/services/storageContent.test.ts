import assert from 'node:assert/strict';
import test from 'node:test';

import { storageHeroSchema, storageV2SeedData } from '@app/schemas';

import { parseStorageValue } from '../pages/storageContent.js';

test('Storage semantic content prefers a valid page document value', () => {
  const changed = { ...storageV2SeedData['storage.hero'], heading: 'Owner-first operations' };
  assert.deepEqual(
    parseStorageValue({ 'storage.hero': changed }, 'storage.hero', storageHeroSchema),
    changed,
  );
});

test('Storage semantic content rejects legacy extraction wrappers and uses its v2 seed', () => {
  assert.deepEqual(
    parseStorageValue(
      { 'storage.hero': { content: ['consumer storage'], media: [], externalUrls: [] } },
      'storage.hero',
      storageHeroSchema,
    ),
    storageV2SeedData['storage.hero'],
  );
});
