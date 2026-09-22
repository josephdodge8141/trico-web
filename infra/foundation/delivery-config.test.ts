import assert from 'node:assert/strict';
import test from 'node:test';

import { exampleDeliveryConfig, parseDeliveryConfig } from './delivery-config.js';

test('factory.delivery.foundation accepts explicit repository DNS and operator configuration', () => {
  assert.deepEqual(parseDeliveryConfig(exampleDeliveryConfig), exampleDeliveryConfig);
});

test('delivery foundation rejects widened repository or domain configuration', () => {
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, repository: 'other/repository/extra' }),
    /repository/,
  );
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, previewZoneName: 'example.com' }),
    /previewZoneName/,
  );
});
