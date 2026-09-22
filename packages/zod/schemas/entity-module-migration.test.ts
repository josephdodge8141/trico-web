import assert from 'node:assert/strict';
import test from 'node:test';

import { planEntityModuleContentMigration } from './entity-module-migration.js';
import { storageEntityModule } from './storage.js';
import { storageV2SeedData } from '../seeds/storage.js';

test('the shared entity-module migration is deterministic and preserves valid semantic values', () => {
  const request = {
    pageId: 'storage' as const,
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'dry-run' as const,
    currentContent: {
      'storage.anniversary-banner': storageV2SeedData['storage.anniversary-banner'],
    },
    pendingChanges: [],
  };
  const first = planEntityModuleContentMigration(storageEntityModule, storageV2SeedData, request);
  const second = planEntityModuleContentMigration(storageEntityModule, storageV2SeedData, request);

  assert.deepEqual(first, second);
  assert.equal(first.entries.length, 18);
  assert.equal(first.entries[0]?.action, 'preserve');
  assert.equal(first.dryRun, true);
  for (const definition of storageEntityModule.entities) {
    assert.equal(definition.schema.safeParse(first.nextContent[definition.id]).success, true);
  }
});

test('the shared entity-module migration rejects pending version 1 data outside explicit local reset', () => {
  const request = {
    pageId: 'storage' as const,
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'prepare-apply' as const,
    currentContent: {},
    pendingChanges: [{ entityId: 'storage.hero' as const, schemaVersion: 1 as const }],
  };
  assert.throws(
    () => planEntityModuleContentMigration(storageEntityModule, storageV2SeedData, request),
    /unresolved version 1 pending changes/,
  );
  const reset = planEntityModuleContentMigration(storageEntityModule, storageV2SeedData, {
    ...request,
    mode: 'reset-disposable-local',
  });
  assert.deepEqual(reset.discardedPendingEntityIds, ['storage.hero']);
  assert.throws(
    () =>
      planEntityModuleContentMigration(storageEntityModule, storageV2SeedData, {
        ...request,
        environment: 'production',
        mode: 'reset-disposable-local',
      }),
    /only allowed in the local environment/,
  );
});
