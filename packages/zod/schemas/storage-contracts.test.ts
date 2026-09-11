import assert from 'node:assert/strict';
import test from 'node:test';

import {
  entityDefinitions,
  semanticRegistryStatus,
  storageEntityModule,
  storageV2SeedData,
  validateEntityViewCatalog,
} from '../index.js';

test('Storage owns 18 strict semantic entities with novice editor and visual contracts', () => {
  assert.equal(storageEntityModule.entities.length, 18);
  assert.equal(storageEntityModule.viewCatalog.length, 18);
  assert.equal(new Set(storageEntityModule.entities.map(({ id }) => id)).size, 18);
  for (const definition of storageEntityModule.entities) {
    const seed = storageV2SeedData[definition.id as keyof typeof storageV2SeedData];
    assert.equal(definition.schema.safeParse(seed).success, true);
    assert.equal(JSON.stringify(definition.editor).includes('"type":"json"'), false);
    if (definition.editor.kind === 'list') {
      assert.equal(definition.listItemSchema?.safeParse(definition.editor.blankItem).success, true);
    }
  }
  assert.doesNotThrow(() =>
    validateEntityViewCatalog(
      storageEntityModule.entities,
      storageEntityModule.viewCatalog,
      'complete',
    ),
  );
  const status = semanticRegistryStatus(entityDefinitions, storageEntityModule.viewCatalog);
  assert.equal(status.migratedEntityIds.length, 71);
  assert.equal(status.missingEditorEntityIds.length, 124);
  assert.equal(status.missingViewEntityIds.length, 177);
});

test('Storage semantic seeds preserve B2B positioning and all mounted service cards', () => {
  assert.equal(storageV2SeedData['storage.services.items'].length, 12);
  assert.equal(storageV2SeedData['storage.team.members'].length, 4);
  assert.match(storageV2SeedData['storage.hero'].heading, /facility profitability/i);
  const serialized = JSON.stringify(storageV2SeedData);
  assert.equal(serialized.includes('unit size'), false);
  assert.equal(serialized.includes('rent a unit'), false);
  assert.equal(serialized.includes('"content"'), false);
  assert.equal(serialized.includes('"externalUrls"'), false);
});
