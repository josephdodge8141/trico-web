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
