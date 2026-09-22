import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { developmentHeroSchema, developmentV2SeedData } from '@app/schemas';

import { parseDevelopmentValue } from '../pages/developmentContent.js';

test('Development content prefers a valid semantic page-document value', () => {
  const changed = { ...developmentV2SeedData['development.hero'], heading: 'A better future' };
  assert.deepEqual(
    parseDevelopmentValue(
      { 'development.hero': changed },
      'development.hero',
      developmentHeroSchema,
    ),
    changed,
  );
});

test('Development content replaces legacy extraction wrappers with its semantic seed', () => {
  assert.deepEqual(
    parseDevelopmentValue(
      { 'development.hero': { content: ['#projects'], media: [], externalUrls: [] } },
      'development.hero',
      developmentHeroSchema,
    ),
    developmentV2SeedData['development.hero'],
  );
});

test('Development page uses semantic labels and valid editable highlight markup', () => {
  const source = readFileSync(new URL('../pages/DevelopmentSitePage.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('>Our Projects<'), false);
  assert.equal(source.includes('>Featured Developments<'), false);
  assert.equal(source.includes('<strong>Office Location</strong>'), false);
  assert.equal(source.includes('<h3>Quick Links</h3>'), false);
  assert.equal(source.includes('<ul className="dev-highlights">'), false);
  assert.match(source, /className="dev-highlights ui-highlights"\s+role="list"/);
  assert.match(source, /<div role="listitem">/);
});

test('Development seeds preserve the complete extracted legacy copy and footer inventory', () => {
  assert.deepEqual(
    developmentV2SeedData['development.land-experts.services'].map(
      ({ description }) => description,
    ),
    [
      'Expert guidance in identifying and acquiring prime land opportunities across Utah. We help you find the perfect property for your vision.',
      'Strategic marketing and comprehensive listing services to maximize the value and exposure of your land investment.',
      'Full-service development expertise from concept to completion. We transform raw land into thriving residential and commercial communities.',
    ],
  );
  assert.deepEqual(
    developmentV2SeedData['development.about.values'].map(({ description }) => description),
    [
      'We see potential where others see raw land, transforming vision into thriving communities.',
      'Every project is built on a foundation of honesty, transparency, and ethical practices.',
      'We develop with the future in mind, creating lasting value for communities and investors.',
    ],
  );
  assert.deepEqual(
    developmentV2SeedData['development.footer.links'].map(({ label }) => label),
    [
      'Land Acquisition',
      'Residential Development',
      'Commercial Development',
      'Current Projects',
      'Our Team',
      'About Us',
      'Contact',
    ],
  );
});
