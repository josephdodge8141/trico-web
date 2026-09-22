import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { z } from 'zod';

import externalSourceSeeds from '../seeds/external-sources.json' with { type: 'json' };
import mediaInventory from '../seeds/media-inventory.json' with { type: 'json' };

import {
  contentManifestSchema,
  deterministicListItemId,
  editableListItemSchema,
  entityDefinitions,
  entityViewCatalog,
  legacyEntityDefinitions,
  externalSourceSchema,
  mediaPresignRequestSchema,
  pageDefinitions,
  pageIdSchema,
  pendingChangeSchema,
  publishRequestSchema,
  registrySeedData,
  retiredEntityIds,
  scheduledSyncEventSchema,
  validateRegistry,
  type EditableValue,
  type EntityId,
} from '../index.js';
import { iconNameSchema } from './registry.js';
import {
  aggregateEntityModules,
  defineEntityModule,
  editorControlSchema,
  mergeEntityModules,
  semanticRegistryStatus,
  validateEntityViewCatalog,
  type SemanticEntityDefinition,
} from './editor-contracts.js';

const expectedPageCounts = {
  home: 18,
  'property-management': 35,
  'real-estate': 31,
  construction: 65,
  storage: 18,
  development: 28,
} as const;

const excludedForms = [
  'construction.bid.form',
  'construction.contact.form',
  'development.contact.form',
  'home.careers.resume-form',
  'property-management.contact.form',
  'property-management.new-client-form',
  'real-estate.contact.form',
  'real-estate.new-client-form',
  'storage.contact.form',
] as const;

function requireListSeed(id: EntityId): readonly EditableValue[] {
  const value = registrySeedData[id];
  if (!Array.isArray(value)) throw new Error(`${id} seed is not a list`);
  return value;
}

test('the canonical registry contains exactly the reissued 195-entity inventory', () => {
  validateRegistry();
  assert.equal(entityDefinitions.length, 195);
  assert.equal(new Set(entityDefinitions.map(({ id }) => id)).size, 195);
  assert.equal(pageDefinitions.length, pageIdSchema.options.length);

  for (const page of pageDefinitions) {
    assert.equal(page.entities.length, expectedPageCounts[page.id]);
    for (const definition of page.entities) {
      assert.equal(definition.id.split('.')[0], page.id);
      assert.deepEqual(definition.publicPath, definition.id.split('.'));
      assert.ok(definition.label.length > 0);
      const seed = registrySeedData[definition.id];
      assert.equal(definition.schema.safeParse(seed).success, true);
      assert.equal(definition.kind === 'list', definition.listItemSchema !== undefined);
    }
  }

  for (const formId of excludedForms) {
    assert.equal(
      entityDefinitions.some(({ id }) => id === formId),
      false,
    );
  }
  assert.equal(
    entityDefinitions.some(({ id }) => id.startsWith('landing.')),
    false,
  );
});

test('five legacy careers entities are explicitly retired while 190 entities remain visible', () => {
  assert.deepEqual([...retiredEntityIds].sort(), [
    'construction.careers.benefits',
    'construction.careers.header',
    'construction.careers.open-positions',
    'property-management.careers',
    'real-estate.careers',
  ]);
  assert.equal(entityDefinitions.filter(({ id }) => !retiredEntityIds.has(id)).length, 190);
  for (const entityId of retiredEntityIds) {
    assert.equal(
      entityDefinitions.some(({ id }) => id === entityId),
      true,
      `${entityId} must remain registered for history and audit`,
    );
  }
});

test('all 195 entities have strict novice editor contracts and primary visual slots', () => {
  const status = semanticRegistryStatus(entityDefinitions, entityViewCatalog);
  assert.equal(status.migratedEntityIds.length, 195);
  assert.deepEqual(status.missingEditorEntityIds, []);
  assert.deepEqual(status.missingViewEntityIds, []);
  assert.doesNotThrow(() =>
    validateEntityViewCatalog(entityDefinitions, entityViewCatalog, 'complete'),
  );
  for (const definition of entityDefinitions) {
    assert.ok(definition.editor);
    assert.equal(JSON.stringify(definition.editor).includes('json'), false);
  }
});

test('semantic editor modules are explicit, browser-safe, and incrementally honest', () => {
  const heroSchema = z.strictObject({
    eyebrow: z.string().trim().min(1),
    title: z.string().trim().min(1),
  });
  const hero = {
    id: 'home.hero',
    pageId: 'home',
    kind: 'object',
    label: 'Hero',
    publicPath: ['home', 'hero'],
    schema: heroSchema,
    editor: {
      version: 2,
      kind: 'object',
      label: 'Hero',
      helpText: 'Update the introductory message.',
      groups: [
        {
          id: 'copy',
          label: 'Words',
          order: 0,
          fields: [
            {
              path: ['eyebrow'],
              label: 'Introductory label',
              required: true,
              order: 0,
              validationMessages: {
                required: 'Enter the introductory label.',
                invalid: 'Use a short introductory label.',
              },
              control: { type: 'short-text', maxLength: 80 },
            },
            {
              path: ['title'],
              label: 'Main heading',
              required: true,
              order: 1,
              validationMessages: {
                required: 'Enter the main heading.',
                invalid: 'Use a shorter main heading.',
              },
              control: { type: 'multiline-text', rows: 3, maxLength: 160 },
            },
          ],
        },
      ],
    },
  } as const satisfies SemanticEntityDefinition;
  const module = defineEntityModule({
    pageId: 'home',
    entities: [hero],
    viewCatalog: [
      {
        entityId: 'home.hero',
        pageId: 'home',
        legacyComponent: 'HomeHero',
        primary: { slotId: 'home.hero.primary', routes: ['/'] },
        secondary: [],
        emptyState: { kind: 'not-applicable' },
      },
    ],
  });

  const partial = aggregateEntityModules([module], { coverage: 'partial' });
  assert.deepEqual(partial.entities, [hero]);
  assert.doesNotThrow(() => JSON.stringify(hero.editor));
  assert.doesNotThrow(() => validateEntityViewCatalog([hero], module.viewCatalog, 'complete'));

  const merged = mergeEntityModules(legacyEntityDefinitions, [module]);
  assert.equal(merged.length, 195);
  assert.equal(merged.find(({ id }) => id === 'home.hero')?.editor?.version, 2);

  const incrementallyMigratedDefinitions = legacyEntityDefinitions.map((definition) =>
    definition.id === hero.id ? hero : definition,
  );
  const status = semanticRegistryStatus(incrementallyMigratedDefinitions, module.viewCatalog);
  assert.deepEqual(status.migratedEntityIds, ['home.hero']);
  assert.equal(status.missingEditorEntityIds.length, 194);
  assert.equal(status.missingViewEntityIds.length, 194);
  assert.throws(
    () =>
      validateEntityViewCatalog(incrementallyMigratedDefinitions, module.viewCatalog, 'complete'),
    /Semantic registry is incomplete/,
  );
});

test('the browser-safe editor union enumerates novice controls and rejects raw JSON controls', () => {
  const validationMessages = { invalid: 'Check this value and try again.' } as const;
  const controls = [
    { type: 'short-text' },
    { type: 'multiline-text', rows: 4 },
    { type: 'number', display: 'statistic' },
    { type: 'boolean', display: 'switch' },
    { type: 'date' },
    { type: 'email' },
    { type: 'phone', country: 'US' },
    {
      type: 'enum',
      display: 'select',
      choices: [{ value: 'active', label: 'Active' }],
    },
    { type: 'icon-picker', choices: [{ value: 'Building', label: 'Building' }] },
    { type: 'media-picker', mediaKind: 'image', supportsFocalPoint: true },
    { type: 'link-builder', allowedDestinations: ['page', 'external-site'] },
    { type: 'system', immutable: true },
    {
      type: 'nested-collection',
      itemLabel: 'Link',
      addLabel: 'Add link',
      itemLabelPath: ['label'],
      reorderable: true,
      blankItem: { label: '', destination: '' },
      itemFields: [
        {
          path: ['label'],
          label: 'Link label',
          required: false,
          order: 0,
          validationMessages,
          control: { type: 'short-text' },
        },
      ],
    },
  ] as const;

  assert.deepEqual(
    controls.map((control) => editorControlSchema.parse(control).type),
    [
      'short-text',
      'multiline-text',
      'number',
      'boolean',
      'date',
      'email',
      'phone',
      'enum',
      'icon-picker',
      'media-picker',
      'link-builder',
      'system',
      'nested-collection',
    ],
  );
  assert.equal(editorControlSchema.safeParse({ type: 'json' }).success, false);
  assert.equal(
    editorControlSchema.safeParse({ type: 'short-text', exposeObjectKeys: true }).success,
    false,
  );
});

test('deterministic migrated list item IDs are stable, positional, and UUID-shaped', () => {
  const first = deterministicListItemId('real-estate.listings.items', 0);
  assert.equal(first, deterministicListItemId('real-estate.listings.items', 0));
  assert.notEqual(first, deterministicListItemId('real-estate.listings.items', 1));
  assert.equal(editableListItemSchema.safeParse({ id: first, title: 'Listing' }).success, true);
});

test('the extracted seed preserves source cardinality and approved cleanup', () => {
  assert.equal(Object.keys(registrySeedData).length, 195);
  assert.equal(requireListSeed('home.divisions.items').length, 5);
  assert.equal(requireListSeed('real-estate.listings.items').length, 10);
  assert.equal(requireListSeed('property-management.portfolio.managed.items').length, 7);
  assert.equal(
    JSON.stringify(registrySeedData['property-management.portfolio.managed.items']).includes(
      'Property 7',
    ),
    false,
  );

  for (const definition of entityDefinitions.filter(
    ({ id }) =>
      id.startsWith('construction.current-projects.projects.') ||
      id.startsWith('construction.completed-projects.projects.'),
  )) {
    assert.deepEqual(registrySeedData[definition.id], []);
  }

  for (const definition of entityDefinitions.filter(({ kind }) => kind === 'list')) {
    const value = requireListSeed(definition.id);
    for (const [position, item] of value.entries()) {
      const parsedItem = editableListItemSchema.parse(item);
      assert.equal(parsedItem.id, deterministicListItemId(definition.id, position));
      if (typeof parsedItem.icon === 'string') {
        assert.equal(iconNameSchema.safeParse(parsedItem.icon).success, true);
      }
    }
  }
});

test('every semantic icon field uses the complete strict public icon catalog', () => {
  assert.equal(iconNameSchema.safeParse('Tractor').success, true);
  assert.equal(iconNameSchema.safeParse('NotARealLucideIcon').success, false);

  const iconControls = entityDefinitions.flatMap(({ editor }) =>
    editor === undefined
      ? []
      : editor.groups.flatMap(({ fields }) =>
          fields.flatMap(({ control }) => [
            ...(control.type === 'icon-picker' ? [control] : []),
            ...(control.type === 'nested-collection'
              ? control.itemFields
                  .filter(({ control: itemControl }) => itemControl.type === 'icon-picker')
                  .map(({ control: itemControl }) => itemControl)
              : []),
          ]),
        ),
  );
  assert.ok(iconControls.length > 0);
  for (const control of iconControls) {
    assert.equal(control.type, 'icon-picker');
    if (control.type !== 'icon-picker') continue;
    assert.ok(control.choices.length > 1_500);
    assert.ok(control.choices.some(({ value }) => value === 'Tractor'));
  }
});

test('seed pages fit the conservative publication ceiling and omit migration metadata', () => {
  for (const page of pageDefinitions) {
    const pageSeed = Object.fromEntries(
      page.entities.map(({ id }) => [id, registrySeedData[id]] as const),
    );
    assert.ok(Buffer.byteLength(JSON.stringify(pageSeed)) < 350_000);
  }
  const serialized = JSON.stringify(registrySeedData);
  for (const forbiddenKey of ['sourceComponent', 'sourcePosition', 'assetId', 'originalFilename']) {
    assert.equal(serialized.includes(`"${forbiddenKey}"`), false);
  }
});

test('media and source seed inventories account for supplied runtime inputs', () => {
  assert.equal(mediaInventory.filter(({ disposition }) => disposition === 'upload').length, 64);
  assert.equal(mediaInventory.filter((item) => 'sourceAssetId' in item).length, 13);
  const placeholders = mediaInventory.filter(({ disposition }) => disposition === 'placeholder');
  assert.equal(placeholders.length, 0);
  assert.equal(externalSourceSeeds.length, 5);
  for (const source of externalSourceSeeds) {
    assert.equal(externalSourceSchema.safeParse(source).success, true);
  }
});

test('recovered Real Estate portrait bytes match their immutable Lovable provenance', async () => {
  const expected = [
    {
      originalFilename: 'shauna-thomas.png',
      sourceAssetId: '53b95017-091d-494c-9a52-72f835e8a19f',
      sha256: '858d36a1c6ce48cae3650581012c8d26d92f9840df974dc858f0b87010b85f71',
      size: 2_315_953,
      width: 1122,
      height: 1402,
    },
    {
      originalFilename: 'robert-ayers.png',
      sourceAssetId: 'b68bcf6b-f860-463c-b1e4-69698067bc30',
      sha256: '7f6760fd9ca96315219b4e1d6334d23b58e38ffa1010977f057ab6a70a46c914',
      size: 2_741_172,
      width: 1122,
      height: 1402,
    },
    {
      originalFilename: 'stacie-papanikolas.jpg',
      sourceAssetId: 'bf1ec498-6451-42bb-a2af-37e8138149f9',
      sha256: '51ffe1a92be2c55e74d0fa3ad48a1006b93257424ea7edfb82bfb7f5b34e0a85',
      size: 444_883,
      width: 1200,
      height: 1500,
    },
  ] as const;
  for (const expectedPortrait of expected) {
    const inventoryItem = mediaInventory.find(
      ({ originalFilename }) => originalFilename === expectedPortrait.originalFilename,
    );
    assert.ok(inventoryItem);
    assert.equal(inventoryItem.disposition, 'upload');
    assert.equal(inventoryItem.sourceAssetId, expectedPortrait.sourceAssetId);
    assert.equal(inventoryItem.size, expectedPortrait.size);
    assert.equal(inventoryItem.width, expectedPortrait.width);
    assert.equal(inventoryItem.height, expectedPortrait.height);
    assert.equal(inventoryItem.sha256, expectedPortrait.sha256);
    const bytes = await readFile(
      new URL(`../seeds/media/${expectedPortrait.originalFilename}`, import.meta.url),
    );
    assert.equal(bytes.length, expectedPortrait.size);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedPortrait.sha256);
  }
});

test('pending changes and publish requests reject partial or stale-shaped transport data', () => {
  const timestamp = '2026-09-08T12:00:00.000Z';
  const validChange = {
    entityId: 'home.hero',
    pageId: 'home',
    authorId: 'b5d93889-b165-4bd6-845a-7fe5d3131f9d',
    baseEntityVersion: 1,
    revision: 1,
    beforeValue: { heading: 'Old' },
    replacementValue: { heading: 'New' },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  assert.equal(pendingChangeSchema.safeParse(validChange).success, true);
  assert.equal(
    pendingChangeSchema.safeParse({ ...validChange, replacementValue: undefined }).success,
    false,
  );
  assert.equal(
    publishRequestSchema.safeParse({
      selections: [{ entityId: 'home.hero', expectedRevision: 1, hiddenRevision: 2 }],
    }).success,
    false,
  );
  assert.equal(publishRequestSchema.safeParse({ selections: [] }).success, false);
});

test('manifest, media, source, and scheduled-event wire contracts are strict', () => {
  const operationId = 'a9692c75-b921-4ad0-9f34-c92fd1429748';
  const pages = Object.fromEntries(
    pageIdSchema.options.map((pageId) => [
      pageId,
      { url: `/content/releases/${operationId}/${pageId}.json`, etag: pageId },
    ]),
  );
  assert.equal(
    contentManifestSchema.safeParse({ version: 1, currentOperationId: operationId, pages }).success,
    true,
  );
  assert.equal(
    contentManifestSchema.safeParse({
      version: 1,
      currentOperationId: operationId,
      pages: { home: pages.home },
    }).success,
    false,
  );
  assert.equal(
    mediaPresignRequestSchema.safeParse({
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      contentLength: 20 * 1024 * 1024,
    }).success,
    true,
  );
  assert.equal(
    mediaPresignRequestSchema.safeParse({
      fileName: 'payload.svg',
      contentType: 'image/svg+xml',
      contentLength: 200,
    }).success,
    false,
  );
  assert.equal(
    externalSourceSchema.safeParse({
      id: '2e8bb94e-aee0-4474-b182-221d7f0ad7a7',
      entityId: 'real-estate.listings.items',
      itemId: '6bb9909e-eae7-4700-8f7a-b7ff3c0fd820',
      type: 'MLS',
      url: 'http://127.0.0.1/internal',
      validationFields: ['price'],
      overriddenFields: [],
      enabled: true,
      createdAt: '2026-09-08T12:00:00.000Z',
      updatedAt: '2026-09-08T12:00:00.000Z',
    }).success,
    false,
  );
  assert.equal(
    scheduledSyncEventSchema.safeParse({
      schemaVersion: 1,
      eventType: 'trico.external-sync.requested',
      requestedAt: '2026-09-08T12:00:00.000Z',
      requestedBy: 'eventbridge',
    }).success,
    true,
  );
});
