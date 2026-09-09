import assert from 'node:assert/strict';
import test from 'node:test';

import { parseContentManifest, parsePageContent } from './content.js';

test('parses the immutable content manifest contract', () => {
  const entry = { url: '/content/releases/operation/home.json', etag: 'home-etag' };
  const manifest = parseContentManifest({
    version: 1,
    currentOperationId: '11111111-1111-4111-8111-111111111111',
    pages: {
      home: entry,
      'property-management': entry,
      'real-estate': entry,
      construction: entry,
      storage: entry,
      development: entry,
    },
  });
  assert.equal(manifest.currentOperationId, '11111111-1111-4111-8111-111111111111');
});

test('rejects an obsolete manifest operationId field', () => {
  assert.throws(() => parseContentManifest({ version: 1, operationId: 'obsolete', pages: {} }));
});

test('overlays canonical entity values on a complete page fallback', () => {
  const page = parsePageContent('home', {
    'home.hero': {
      entityId: 'home.hero',
      eyebrow: 'Updated',
      title: 'A new headline',
      description: 'Published copy',
      primaryAction: 'Begin',
      primaryHref: '#divisions',
    },
  });
  assert.equal(page.hero.title, 'A new headline');
  assert.equal(page.sections[0]?.anchor, 'divisions');
});
