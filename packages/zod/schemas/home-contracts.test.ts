import assert from 'node:assert/strict';
import test from 'node:test';

import homeMigrationLedger from '../seeds/home-v2-migration-ledger.json' with { type: 'json' };

import {
  HOME_CONTENT_SCHEMA_VERSION,
  entityDefinitions,
  homeEntityModule,
  homeV2SeedData,
  planHomeContentMigration,
  semanticRegistryStatus,
  validateEntityViewCatalog,
} from '../index.js';

test('Home owns 18 strict semantic entity contracts and visual slots', () => {
  assert.equal(homeEntityModule.entities.length, 18);
  assert.equal(homeEntityModule.viewCatalog.length, 18);
  assert.equal(new Set(homeEntityModule.entities.map(({ id }) => id)).size, 18);

  for (const definition of homeEntityModule.entities) {
    const seed = homeV2SeedData[definition.id as keyof typeof homeV2SeedData];
    assert.equal(definition.pageId, 'home');
    assert.equal(definition.id.startsWith('home.'), true);
    assert.equal(definition.editor.version, HOME_CONTENT_SCHEMA_VERSION);
    assert.equal(JSON.stringify(definition.editor).includes('"type":"json"'), false);
    assert.equal(definition.schema.safeParse(seed).success, true);
    assert.equal(definition.schema.safeParse({ ...seed, unexpected: true }).success, false);
    if (definition.editor.kind === 'list') {
      assert.notEqual(definition.listItemSchema, undefined);
      assert.equal(definition.listItemSchema?.safeParse(definition.editor.blankItem).success, true);
    }
  }

  assert.doesNotThrow(() =>
    validateEntityViewCatalog(homeEntityModule.entities, homeEntityModule.viewCatalog, 'complete'),
  );
  const status = semanticRegistryStatus(entityDefinitions, homeEntityModule.viewCatalog);
  assert.equal(status.migratedEntityIds.length, 18);
  assert.equal(status.missingEditorEntityIds.length, 177);
  assert.equal(status.missingViewEntityIds.length, 177);
  assert.equal(homeMigrationLedger.entityCount, 18);
  assert.deepEqual(
    [...homeMigrationLedger.entities].sort(),
    homeEntityModule.entities.map(({ id }) => id).sort(),
  );
  const serializedSeeds = JSON.stringify(homeV2SeedData);
  for (const legacyWrapper of ['"content"', '"media"', '"externalUrls"', '"href"', '"color"']) {
    assert.equal(serializedSeeds.includes(legacyWrapper), false);
  }
});

test('Home migration planning is deterministic, dry-runnable, and preserves non-Home content', () => {
  const currentContent = {
    'home.hero': { content: ['legacy generated extraction wrapper'] },
    'storage.hero': { heading: 'Leave this value alone' },
  };
  const input = {
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'dry-run' as const,
    currentContent,
    pendingChanges: [],
  };
  const first = planHomeContentMigration(input);
  const second = planHomeContentMigration(input);

  assert.deepEqual(first, second);
  assert.equal(first.dryRun, true);
  assert.equal(first.fromVersion, 1);
  assert.equal(first.toVersion, 2);
  assert.equal(first.entries.length, 18);
  assert.equal(first.entries.filter(({ action }) => action === 'replace').length, 18);
  assert.deepEqual(first.nextContent['storage.hero'], currentContent['storage.hero']);
  assert.deepEqual(first.nextContent['home.hero'], homeV2SeedData['home.hero']);
  assert.deepEqual(currentContent['home.hero'], {
    content: ['legacy generated extraction wrapper'],
  });
});

test('Home migration refuses v1 pending changes except for an explicit disposable local reset', () => {
  const blockedInput = {
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'dry-run' as const,
    currentContent: {},
    pendingChanges: [{ entityId: 'home.hero', schemaVersion: 1 as const }],
  };
  assert.throws(
    () => planHomeContentMigration(blockedInput),
    /unresolved version 1 pending change/i,
  );

  const reset = planHomeContentMigration({
    ...blockedInput,
    mode: 'reset-disposable-local',
  });
  assert.equal(reset.discardedPendingEntityIds[0], 'home.hero');
  assert.equal(reset.dryRun, false);

  assert.throws(
    () =>
      planHomeContentMigration({
        ...blockedInput,
        environment: 'preview',
        mode: 'reset-disposable-local',
      }),
    /only allowed in the local environment/i,
  );
});
