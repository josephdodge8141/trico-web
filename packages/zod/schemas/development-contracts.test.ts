import assert from 'node:assert/strict';
import test from 'node:test';

import { developmentV2SeedData } from '../seeds/development.js';
import { developmentEntityModule, DEVELOPMENT_CONTENT_SCHEMA_VERSION } from './development.js';
import { validateEntityViewCatalog } from './editor-contracts.js';
import { planEntityModuleContentMigration } from './entity-module-migration.js';

test('Development owns 28 strict semantic entities with novice editor and visual contracts', () => {
  assert.equal(DEVELOPMENT_CONTENT_SCHEMA_VERSION, 2);
  assert.equal(developmentEntityModule.entities.length, 28);
  assert.equal(developmentEntityModule.viewCatalog.length, 28);
  assert.equal(new Set(developmentEntityModule.entities.map(({ id }) => id)).size, 28);
  for (const definition of developmentEntityModule.entities) {
    const seed = (developmentV2SeedData as Readonly<Record<string, unknown>>)[definition.id];
    assert.equal(definition.schema.safeParse(seed).success, true, definition.id);
    assert.equal(JSON.stringify(definition.editor).includes('"type":"json"'), false);
    if (definition.editor.kind === 'list') {
      assert.equal(definition.listItemSchema?.safeParse(definition.editor.blankItem).success, true);
    }
  }
  assert.doesNotThrow(() =>
    validateEntityViewCatalog(
      developmentEntityModule.entities,
      developmentEntityModule.viewCatalog,
      'complete',
    ),
  );
});

test('Development semantic seeds preserve the complete mounted composition', () => {
  assert.equal(developmentV2SeedData['development.land-experts.services'].length, 3);
  assert.equal(developmentV2SeedData['development.land-experts.stats'].length, 4);
  assert.equal(developmentV2SeedData['development.services.items'].length, 5);
  assert.equal(developmentV2SeedData['development.projects.categories'].length, 2);
  assert.equal(developmentV2SeedData['development.projects.featured'].length, 2);
  assert.equal(developmentV2SeedData['development.partners.items'].length, 6);
  assert.equal(developmentV2SeedData['development.team.members'].length, 3);
  const serialized = JSON.stringify(developmentV2SeedData);
  assert.equal(serialized.includes('"content"'), false);
  assert.equal(serialized.includes('"externalUrls"'), false);
  assert.equal(serialized.includes('firstName'), false);
  assert.equal(
    developmentV2SeedData['development.services.header'].projectsHeading,
    'Our Projects',
  );
  assert.equal(
    developmentV2SeedData['development.reviews.header'].unavailableLinkLabel,
    'Review link coming soon',
  );
  assert.equal(
    developmentV2SeedData['development.contact.details'].locationLabel,
    'Office Location',
  );
  assert.equal(developmentV2SeedData['development.footer.brand'].linksHeading, 'Quick Links');
});

test('Development v1 content has a deterministic dry-run migration and protects pending work', () => {
  const request = {
    pageId: 'development' as const,
    schemaVersion: 1 as const,
    environment: 'local' as const,
    mode: 'dry-run' as const,
    currentContent: {},
    pendingChanges: [],
  };
  const first = planEntityModuleContentMigration(
    developmentEntityModule,
    developmentV2SeedData,
    request,
  );
  assert.deepEqual(
    first,
    planEntityModuleContentMigration(developmentEntityModule, developmentV2SeedData, request),
  );
  assert.equal(first.entries.length, 28);
  assert.equal(
    first.entries.every(({ action }) => action === 'replace'),
    true,
  );
  assert.throws(
    () =>
      planEntityModuleContentMigration(developmentEntityModule, developmentV2SeedData, {
        ...request,
        mode: 'prepare-apply',
        pendingChanges: [{ entityId: 'development.hero' as const, schemaVersion: 1 as const }],
      }),
    /unresolved version 1 pending changes/,
  );
});
