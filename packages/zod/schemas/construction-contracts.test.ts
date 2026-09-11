import assert from 'node:assert/strict';
import test from 'node:test';

import { constructionV2SeedData } from '../seeds/construction.js';
import {
  constructionEntityDefinitions,
  constructionEntityViewCatalog,
  constructionMainRouteEntityIds,
} from './construction.js';
import { validateEditorDefinition } from './editor-contracts.js';

test('Construction defines all 65 stable semantic entities', () => {
  assert.equal(constructionEntityDefinitions.length, 65);
  assert.equal(new Set(constructionEntityDefinitions.map(({ id }) => id)).size, 65);
  assert.equal(constructionMainRouteEntityIds.length, 49);
  assert.equal(
    constructionEntityDefinitions.filter(({ id }) => id.includes('.projects.')).length,
    16,
  );
  assert.equal(Object.keys(constructionV2SeedData).length, 65);
});

test('Construction seeds and novice editor definitions are valid', () => {
  for (const definition of constructionEntityDefinitions) {
    const seed = constructionV2SeedData[definition.id];
    assert.notEqual(seed, undefined, `${definition.id} has a semantic seed`);
    definition.schema.parse(seed);
    assert.doesNotThrow(() => validateEditorDefinition(definition));
    if (definition.editor.kind === 'list') {
      definition.listItemSchema?.parse(definition.editor.blankItem);
    }
  }
});

test('Construction view catalog covers every entity and category list has an editable empty state', () => {
  assert.deepEqual(
    new Set(constructionEntityViewCatalog.map(({ entityId }) => entityId)),
    new Set(constructionEntityDefinitions.map(({ id }) => id)),
  );
  for (const entry of constructionEntityViewCatalog.filter(({ entityId }) =>
    entityId.includes('.projects.'),
  )) {
    assert.equal(entry.primary.routes.length, 1);
    assert.equal(entry.emptyState.kind, 'editable-empty-state');
    assert.deepEqual(constructionV2SeedData[entry.entityId], []);
  }
});

test('Construction catalog accounts for shared chrome and category metadata on category routes', () => {
  const header = constructionEntityViewCatalog.find(
    ({ entityId }) => entityId === 'construction.header',
  );
  const currentCategory = constructionEntityViewCatalog.find(
    ({ entityId }) => entityId === 'construction.current-projects.category.multi-family',
  );
  const currentHeader = constructionEntityViewCatalog.find(
    ({ entityId }) => entityId === 'construction.current-projects.header',
  );
  assert.equal(header?.secondary[0]?.routes.length, 16);
  assert.equal(currentCategory?.secondary[0]?.routes.length, 8);
  assert.equal(currentHeader?.secondary[0]?.routes.length, 8);
  assert(currentCategory?.secondary[0]?.routes.includes('/construction/current/underground'));
});

test('Construction business labels and every project detail have novice editor fields', () => {
  const fieldPaths = (entityId: string): Set<string> => {
    const entity = constructionEntityDefinitions.find(({ id }) => id === entityId);
    assert(entity !== undefined);
    return new Set(
      entity.editor.groups.flatMap(({ fields }) => fields.map(({ path }) => path.join('.'))),
    );
  };
  assert.deepEqual(
    fieldPaths('construction.current-projects.header'),
    new Set(['eyebrow', 'heading', 'description', 'cardActionLabel']),
  );
  assert.deepEqual(
    fieldPaths('construction.plan-room.header'),
    new Set([
      'eyebrow',
      'heading',
      'description',
      'planListHeading',
      'viewPlansLabel',
      'specificationsLabel',
    ]),
  );
  assert.deepEqual(
    fieldPaths('construction.current-projects.projects.multi-family'),
    new Set([
      'id',
      'name',
      'description',
      'address',
      'owner',
      'architect',
      'engineer',
      'squareFeet',
      'dateLabel',
      'photo',
      'photoAltText',
    ]),
  );
});

test('Construction strict schemas reject undeclared fields', () => {
  const hero = constructionEntityDefinitions.find(({ id }) => id === 'construction.hero');
  assert(hero !== undefined);
  const value = hero.schema.parse(constructionV2SeedData['construction.hero']);
  assert.equal(typeof value, 'object');
  assert(value !== null);
  assert(!Array.isArray(value));
  assert.throws(() =>
    hero.schema.parse({
      ...value,
      internalStoragePath: 'never-visible',
    }),
  );
});
