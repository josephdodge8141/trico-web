import assert from 'node:assert/strict';
import test from 'node:test';

import { exampleApplicationConfig, parseApplicationConfig } from './application/config.js';

test('application config accepts explicit immutable deployment inputs', () => {
  const config = exampleApplicationConfig('dev');
  assert.deepEqual(parseApplicationConfig(config), config);
});

test('application config rejects mutable images and unknown deployment stages', () => {
  const config = exampleApplicationConfig('dev');
  assert.throws(
    () => parseApplicationConfig({ ...config, backendImageUri: 'example:latest' }),
    /backendImageUri/,
  );
  assert.throws(() => parseApplicationConfig({ ...config, stage: 'preview' }), /stage/);
});
