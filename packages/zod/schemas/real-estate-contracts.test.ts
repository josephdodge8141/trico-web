import assert from 'node:assert/strict';
import test from 'node:test';

import { editableValueSchema } from './content.js';
import { validateEditorDefinition, validateEntityViewCatalog } from './editor-contracts.js';
import {
  realEstateEntityDefinitions,
  realEstateEntityViewCatalog,
  realEstateHeroSchema,
} from './real-estate.js';
import { realEstateV2SeedData } from '../seeds/real-estate.js';

test('Real Estate defines and seeds all 31 novice-editable entities', () => {
  assert.equal(realEstateEntityDefinitions.length, 31);
  assert.equal(realEstateEntityViewCatalog.length, 31);
  assert.equal(new Set(realEstateEntityDefinitions.map(({ id }) => id)).size, 31);
  for (const definition of realEstateEntityDefinitions) {
    const seed = realEstateV2SeedData[definition.id as keyof typeof realEstateV2SeedData];
    assert.notEqual(seed, undefined, `${definition.id} needs a semantic seed`);
    definition.schema.parse(seed);
    validateEditorDefinition(definition);
    if (definition.editor.kind === 'list') {
      editableValueSchema.parse(definition.editor.blankItem);
      definition.listItemSchema?.parse(definition.editor.blankItem);
    }
  }
  validateEntityViewCatalog(realEstateEntityDefinitions, realEstateEntityViewCatalog);
});

test('Real Estate object contracts reject arbitrary fields', () => {
  assert.throws(() =>
    realEstateHeroSchema.parse({
      ...realEstateV2SeedData['real-estate.hero'],
      technicalMetadata: 'must never reach the public document',
    }),
  );
});

test('Real Estate editor copy does not expose technical identifiers', () => {
  const visibleCopy = JSON.stringify(
    realEstateEntityDefinitions.map(({ editor }) => ({
      label: editor.label,
      helpText: editor.helpText,
      groups: editor.groups,
    })),
  );
  for (const forbidden of ['JSON', 'UUID', 'revision', 'storage path', 'entity ID']) {
    assert.equal(visibleCopy.includes(forbidden), false);
  }
});

test('Real Estate listings retain galleries and real external destinations', () => {
  const listings = realEstateV2SeedData['real-estate.listings.items'];
  assert.equal(
    listings.slice(0, 5).every(({ externalUrl }) => externalUrl.startsWith('https://')),
    true,
  );
  assert.equal(listings.find(({ address }) => address.startsWith('LOT 110'))?.gallery.length, 6);
  assert.equal(listings.find(({ address }) => address.startsWith('LOT 109'))?.gallery.length, 10);
  const listingDefinition = realEstateEntityDefinitions.find(
    ({ id }) => id === 'real-estate.listings.items',
  );
  const reviewDefinition = realEstateEntityDefinitions.find(
    ({ id }) => id === 'real-estate.reviews.platforms',
  );
  assert.equal(
    listingDefinition?.editor.groups[0]?.fields.find(({ path }) => path[0] === 'externalUrl')
      ?.control.type,
    'link-builder',
  );
  assert.equal(
    reviewDefinition?.editor.groups[0]?.fields.find(({ path }) => path[0] === 'externalUrl')
      ?.control.type,
    'link-builder',
  );
});

test('Real Estate listing actions retain the directory and contact calls to action', () => {
  const actions = realEstateV2SeedData['real-estate.listings.actions'];
  assert.deepEqual(
    actions.directoryLinks.map(({ label, externalUrl }) => ({ label, externalUrl })),
    [
      { label: 'Browse on MLS', externalUrl: 'https://www.utahrealestate.com/' },
      { label: 'Browse on LoopNet', externalUrl: 'https://www.loopnet.com/' },
    ],
  );
  assert.equal(actions.contactActionLabel, 'Looking for something specific? Contact us');
  const definition = realEstateEntityDefinitions.find(
    ({ id }) => id === 'real-estate.listings.actions',
  );
  const directoryField = definition?.editor.groups[0]?.fields.find(
    ({ path }) => path[0] === 'directoryLinks',
  );
  assert.equal(directoryField?.control.type, 'nested-collection');
  if (directoryField?.control.type !== 'nested-collection') return;
  assert.equal(
    directoryField.control.itemFields.find(({ path }) => path[0] === 'externalUrl')?.control.type,
    'link-builder',
  );
});

test('Real Estate catalog records truthful multi-surface coverage', () => {
  const listings = realEstateEntityViewCatalog.find(
    ({ entityId }) => entityId === 'real-estate.listings.items',
  );
  const header = realEstateEntityViewCatalog.find(
    ({ entityId }) => entityId === 'real-estate.header',
  );
  const actions = realEstateEntityViewCatalog.find(
    ({ entityId }) => entityId === 'real-estate.listings.actions',
  );
  assert.equal(listings?.legacyComponent.includes('Active and sold listing cards'), true);
  assert.equal(
    listings?.secondary.some(({ regionLabel }) => regionLabel === 'Sold listing tab'),
    true,
  );
  assert.equal(
    header?.secondary.some(({ regionLabel }) => regionLabel === 'Mobile navigation'),
    true,
  );
  assert.equal(
    actions?.secondary.some(
      ({ regionLabel }) => regionLabel === 'Listing directory and contact actions',
    ),
    true,
  );
});
