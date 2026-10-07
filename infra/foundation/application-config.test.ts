import assert from 'node:assert/strict';
import test from 'node:test';

import { exampleApplicationConfig, parseApplicationConfig } from './application/config.js';

test('application config accepts explicit immutable deployment inputs', () => {
  const config = exampleApplicationConfig('dev');
  assert.deepEqual(parseApplicationConfig(config), config);
  assert.deepEqual(
    parseApplicationConfig({
      ...config,
      inquiryEmailTo: 'inquiries@example.com',
      careerEmailTo: 'careers@example.com',
    }),
    { ...config, inquiryEmailTo: 'inquiries@example.com', careerEmailTo: 'careers@example.com' },
  );
  assert.equal(
    parseApplicationConfig({ ...config, externalSyncEnabled: 'false' }).externalSyncEnabled,
    false,
  );
  assert.equal(
    parseApplicationConfig({
      ...config,
      bedrockModelId: 'example-model',
      externalSyncEnabled: 'true',
    }).externalSyncEnabled,
    true,
  );
});

test('application config rejects mutable images and unknown deployment stages', () => {
  const config = exampleApplicationConfig('dev');
  assert.throws(
    () => parseApplicationConfig({ ...config, backendImageUri: 'example:latest' }),
    /backendImageUri/,
  );
  assert.throws(() => parseApplicationConfig({ ...config, stage: 'preview' }), /stage/);
  assert.throws(
    () => parseApplicationConfig({ ...config, externalSyncEnabled: 'False' }),
    /externalSyncEnabled/,
  );
  assert.throws(
    () => parseApplicationConfig({ ...config, inquiryEmailTo: 'invalid' }),
    /inquiryEmailTo/,
  );
  assert.throws(
    () => parseApplicationConfig({ ...config, careerEmailTo: 'invalid' }),
    /careerEmailTo/,
  );
});
