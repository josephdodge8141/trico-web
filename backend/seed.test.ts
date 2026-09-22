import assert from 'node:assert/strict';
import test from 'node:test';

import { validateSeedEditorEmail } from './seed.js';

test('factory.delivery.seeded-operator accepts only the exact configured external seed address', () => {
  assert.equal(
    validateSeedEditorEmail(' Operator@Example.com ', 'operator@example.com'),
    'operator@example.com',
  );
  assert.throws(
    () => validateSeedEditorEmail('other@example.com', 'operator@example.com'),
    /EXTERNAL_SEED_EDITOR_EMAIL/,
  );
  assert.equal(validateSeedEditorEmail('editor@tricoinc.com', undefined), 'editor@tricoinc.com');
});
