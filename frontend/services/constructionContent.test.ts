import assert from 'node:assert/strict';
import test from 'node:test';

import {
  constructionHeroSchema,
  constructionEntityDefinitions,
  constructionProjectSchema,
  constructionProjectsSchema,
  constructionServicesItemsSchema,
  constructionV2SeedData,
} from '@app/schemas';

import { parseConstructionValue } from '../pages/constructionContent.js';

test('Construction content prefers a valid semantic page-document value', () => {
  const original = constructionHeroSchema.parse(constructionV2SeedData['construction.hero']);
  const changed = { ...original, heading: 'Building with care' };
  assert.deepEqual(
    parseConstructionValue(
      { 'construction.hero': changed },
      'construction.hero',
      constructionHeroSchema,
    ),
    changed,
  );
});

test('Construction content replaces legacy wrappers and primitive lists with semantic seeds', () => {
  assert.deepEqual(
    parseConstructionValue(
      { 'construction.hero': { content: ['legacy'], media: [], externalUrls: [] } },
      'construction.hero',
      constructionHeroSchema,
    ),
    constructionV2SeedData['construction.hero'],
  );
  assert.deepEqual(
    parseConstructionValue(
      { 'construction.services.items': ['Concrete'] },
      'construction.services.items',
      constructionServicesItemsSchema,
    ),
    constructionV2SeedData['construction.services.items'],
  );
  const projectEntityId = 'construction.current-projects.projects.multi-family';
  const projectDefinition = constructionEntityDefinitions.find(({ id }) => id === projectEntityId);
  assert(projectDefinition?.editor.kind === 'list');
  const starter = constructionProjectSchema.parse(projectDefinition.editor.blankItem);
  const incompletePublished = { ...starter, publicVisibility: 'approved' };
  assert.deepEqual(
    parseConstructionValue(
      { [projectEntityId]: [incompletePublished] },
      projectEntityId,
      constructionProjectsSchema,
    ),
    [incompletePublished],
  );
});
