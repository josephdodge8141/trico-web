import assert from 'node:assert/strict';
import test from 'node:test';

import {
  propertyManagementHeroSchema,
  propertyManagementPortfolioItemsSchema,
  propertyManagementV2SeedData,
} from '@app/schemas';

import { parsePropertyManagementValue } from '../pages/propertyManagementContent.js';

test('Property Management semantic values use the checked-in seed when absent', () => {
  const hero = parsePropertyManagementValue(
    {},
    'property-management.hero',
    propertyManagementHeroSchema,
  );
  assert.deepEqual(hero, propertyManagementV2SeedData['property-management.hero']);
});

test('Property Management preserves a strict version 2 preview replacement', () => {
  const hero = parsePropertyManagementValue(
    {
      'property-management.hero': {
        ...propertyManagementV2SeedData['property-management.hero'],
        heading: 'A private preview heading',
      },
    },
    'property-management.hero',
    propertyManagementHeroSchema,
  );
  assert.equal(hero.heading, 'A private preview heading');
});

test('Property Management recognizes retained version 1 wrappers during local transition', () => {
  const hero = parsePropertyManagementValue(
    { 'property-management.hero': { content: ['legacy'], media: [], externalUrls: [] } },
    'property-management.hero',
    propertyManagementHeroSchema,
  );
  assert.equal(hero.heading, 'What to Expect with TriCo');
  const portfolio = parsePropertyManagementValue(
    {
      'property-management.portfolio.managed.items': [
        {
          id: '123e4567-e89b-5000-8000-000000000001',
          name: 'Legacy property',
          description: 'Legacy address',
          photo: { kind: 'managed', key: 'media/seed/placeholder-neutral.svg' },
        },
      ],
    },
    'property-management.portfolio.managed.items',
    propertyManagementPortfolioItemsSchema,
  );
  assert.equal(portfolio.length, 7);
});

test('Property Management rejects malformed version 2 semantic values', () => {
  assert.throws(() =>
    parsePropertyManagementValue(
      {
        'property-management.hero': {
          ...propertyManagementV2SeedData['property-management.hero'],
          heading: '',
        },
      },
      'property-management.hero',
      propertyManagementHeroSchema,
    ),
  );
});
