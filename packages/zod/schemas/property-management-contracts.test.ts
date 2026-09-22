import assert from 'node:assert/strict';
import test from 'node:test';

import migrationLedger from '../seeds/property-management-v2-migration-ledger.json' with { type: 'json' };
import {
  PROPERTY_MANAGEMENT_CONTENT_SCHEMA_VERSION,
  entityDefinitions,
  planPropertyManagementContentMigration,
  propertyManagementEntityModule,
  propertyManagementV2SeedData,
  semanticRegistryStatus,
  validateEntityViewCatalog,
} from '../index.js';

test('Property Management owns 35 strict semantic entity contracts and visual slots', () => {
  assert.equal(propertyManagementEntityModule.entities.length, 35);
  assert.equal(propertyManagementEntityModule.viewCatalog.length, 35);
  assert.equal(new Set(propertyManagementEntityModule.entities.map(({ id }) => id)).size, 35);

  for (const definition of propertyManagementEntityModule.entities) {
    const seed =
      propertyManagementV2SeedData[definition.id as keyof typeof propertyManagementV2SeedData];
    assert.equal(definition.pageId, 'property-management');
    assert.equal(definition.id.startsWith('property-management.'), true);
    assert.equal(definition.editor.version, PROPERTY_MANAGEMENT_CONTENT_SCHEMA_VERSION);
    assert.equal(JSON.stringify(definition.editor).includes('"type":"json"'), false);
    assert.equal(definition.schema.safeParse(seed).success, true);
    assert.equal(definition.schema.safeParse({ ...seed, unexpected: true }).success, false);
    if (definition.editor.kind === 'list') {
      assert.notEqual(definition.listItemSchema, undefined);
      assert.equal(definition.listItemSchema?.safeParse(definition.editor.blankItem).success, true);
    }
  }

  assert.doesNotThrow(() =>
    validateEntityViewCatalog(
      propertyManagementEntityModule.entities,
      propertyManagementEntityModule.viewCatalog,
      'complete',
    ),
  );
  const status = semanticRegistryStatus(
    entityDefinitions,
    propertyManagementEntityModule.viewCatalog,
  );
  assert.equal(status.migratedEntityIds.length, 195);
  assert.equal(status.missingEditorEntityIds.length, 0);
  assert.equal(status.missingViewEntityIds.length, 160);
  assert.equal(migrationLedger.entityCount, 35);
  assert.deepEqual(
    [...migrationLedger.entities].sort(),
    propertyManagementEntityModule.entities.map(({ id }) => id).sort(),
  );
  const serialized = JSON.stringify(propertyManagementV2SeedData);
  for (const wrapper of ['"content"', '"media"', '"externalUrls"']) {
    assert.equal(serialized.includes(wrapper), false);
  }
  assert.equal(serialized.includes('Property 7'), false);
  assert.equal(serialized.includes('Property 10'), false);
});

test('Property Management migration is deterministic and preserves other pages', () => {
  const input = {
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'dry-run' as const,
    currentContent: {
      'property-management.hero': { content: ['legacy wrapper'] },
      'storage.hero': { heading: 'Leave this value alone' },
    },
    pendingChanges: [],
  };
  const first = planPropertyManagementContentMigration(input);
  const second = planPropertyManagementContentMigration(input);
  assert.deepEqual(first, second);
  assert.equal(first.dryRun, true);
  assert.equal(first.entries.length, 35);
  assert.equal(first.entries.filter(({ action }) => action === 'replace').length, 35);
  assert.deepEqual(first.nextContent['storage.hero'], input.currentContent['storage.hero']);
  assert.deepEqual(
    first.nextContent['property-management.hero'],
    propertyManagementV2SeedData['property-management.hero'],
  );
});

test('Property Management migration refuses unresolved v1 pending changes', () => {
  const blocked = {
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'dry-run' as const,
    currentContent: {},
    pendingChanges: [{ entityId: 'property-management.hero', schemaVersion: 1 as const }],
  };
  assert.throws(
    () => planPropertyManagementContentMigration(blocked),
    /unresolved version 1 pending change/i,
  );
  const reset = planPropertyManagementContentMigration({
    ...blocked,
    mode: 'reset-disposable-local',
  });
  assert.deepEqual(reset.discardedPendingEntityIds, ['property-management.hero']);
  assert.throws(
    () =>
      planPropertyManagementContentMigration({
        ...blocked,
        environment: 'preview',
        mode: 'reset-disposable-local',
      }),
    /only allowed in the local environment/i,
  );
});
