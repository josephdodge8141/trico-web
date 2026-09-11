import assert from 'node:assert/strict';
import test from 'node:test';

import { homeV2SeedData } from '@app/schemas';

import { defaultHomePageDocument, parseHomePageDocument } from '../pages/homeContent.js';

test('assembles all mounted Home sections from the strict semantic document', () => {
  const page = parseHomePageDocument(homeV2SeedData);
  assert.equal(page.anniversaryBanner.message, '40+ Years of Excellence');
  assert.equal(page.divisions.length, 5);
  assert.equal(page.coreValues.length, 4);
  assert.equal(page.timeline.length, 8);
  assert.equal(page.leaders.length, 4);
  assert.equal(page.news.length, 3);
  assert.equal(page.positions.length, 4);
  assert.equal(page.contact.licenses.length, 3);
});

test('uses a checked-in semantic seed for absent entities', () => {
  const page = parseHomePageDocument({
    'home.hero': {
      heading: 'A private preview heading',
      description: 'A complete validated replacement.',
    },
  });
  assert.equal(page.hero.heading, 'A private preview heading');
  assert.deepEqual(page.divisions, defaultHomePageDocument.divisions);
});

test('renders a version 2 pending replacement while unmigrated local values remain version 1', () => {
  const page = parseHomePageDocument({
    'home.anniversary-banner': {
      content: ['40+ Years of Excellence'],
      media: [],
      externalUrls: [],
    },
    'home.hero': {
      heading: 'A private preview heading',
      description: 'A complete validated replacement.',
    },
  });
  assert.equal(page.anniversaryBanner.message, '40+ Years of Excellence');
  assert.equal(page.hero.heading, 'A private preview heading');
});

test('rejects an invalid semantic replacement instead of rendering loose values', () => {
  assert.throws(() =>
    parseHomePageDocument({
      'home.hero': {
        heading: '',
        description: 'The heading is required.',
      },
    }),
  );
});
