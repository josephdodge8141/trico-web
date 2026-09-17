import assert from 'node:assert/strict';
import test from 'node:test';

import { editableValueSchema } from './content.js';
import { validateEditorDefinition, validateEntityViewCatalog } from './editor-contracts.js';
import {
  realEstateEntityDefinitions,
  realEstateEntityViewCatalog,
  realEstateHeroSchema,
  realEstateListingSchema,
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

test('Real Estate listings retain only their approved frozen external image sources', () => {
  const listings = realEstateV2SeedData['real-estate.listings.items'];
  assert.deepEqual(
    listings
      .filter(({ image }) => image.kind === 'external')
      .map(({ address, image }) => ({ address, image })),
    [
      {
        address: '9853 S 700 E',
        image: {
          kind: 'external',
          url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop',
        },
      },
      {
        address: '2560 E 3300 S',
        image: {
          kind: 'external',
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
        },
      },
      {
        address: '2200 State St',
        image: {
          kind: 'external',
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
        },
      },
      {
        address: 'Lot 5–8, Cedar Hills',
        image: {
          kind: 'external',
          url: 'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&h=400&fit=crop',
        },
      },
      {
        address: '750 Technology Way',
        image: {
          kind: 'external',
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop',
        },
      },
    ],
  );
  assert.equal(
    realEstateListingSchema.safeParse({
      ...listings[0],
      image: { kind: 'external', url: 'https://example.com/editor-entered-image.jpg' },
    }).success,
    false,
  );
});

test('Real Estate agents retain every recovered portrait as managed media', () => {
  assert.deepEqual(
    realEstateV2SeedData['real-estate.team.agents'].map(({ name, image }) => ({ name, image })),
    [
      {
        name: 'Michael Thornton',
        image: { kind: 'managed', key: 'media/seed/michael-thornton.jpg' },
      },
      {
        name: 'Ben Beesley',
        image: { kind: 'managed', key: 'media/seed/ben-beesley.jpg' },
      },
      {
        name: 'Shauna Ayers',
        image: { kind: 'managed', key: 'media/seed/shauna-thomas.png' },
      },
      {
        name: 'Robert Ayers',
        image: { kind: 'managed', key: 'media/seed/robert-ayers.png' },
      },
      {
        name: 'Stacie Papanikolas',
        image: { kind: 'managed', key: 'media/seed/stacie-papanikolas.jpg' },
      },
    ],
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
