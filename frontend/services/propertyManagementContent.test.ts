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

test('Property Management uses the approved neutral managed media for its unavailable hero photo', () => {
  assert.deepEqual(propertyManagementV2SeedData['property-management.hero'].image, {
    kind: 'managed',
    key: 'media/seed/placeholder-neutral.svg',
  });
  assert.equal(
    propertyManagementV2SeedData['property-management.hero'].imageAltText,
    'Property Management hero photo coming soon',
  );
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

test('Property Management maps every supplied portfolio image and keeps only absent HOA photos neutral', () => {
  const managed = propertyManagementV2SeedData['property-management.portfolio.managed.items'];
  const coas = propertyManagementV2SeedData['property-management.portfolio.coas.items'];
  const hoas = propertyManagementV2SeedData['property-management.portfolio.hoas.items'];

  assert.deepEqual(
    managed.map(({ photo }) => photo.key),
    [
      'media/seed/town-square.jpg',
      'media/seed/country-square.jpg',
      'media/seed/alta-medical.jpg',
      'media/seed/american-fork-industrial.jpg',
      'media/seed/bluffdale-industrial.jpg',
      'media/seed/draper-office-218.jpg',
      'media/seed/draper-office-194.jpg',
    ],
  );
  assert.deepEqual(
    coas.map(({ photo }) => photo.key),
    ['media/seed/laurel-square.jpg', 'media/seed/california-crossing.jpg'],
  );
  assert.deepEqual(
    hoas.map(({ photo }) => photo.key),
    [
      'media/seed/arbor-plaza.png',
      'media/seed/placeholder-neutral.svg',
      'media/seed/placeholder-neutral.svg',
    ],
  );
});
