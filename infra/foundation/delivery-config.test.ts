import assert from 'node:assert/strict';
import test from 'node:test';

import { exampleDeliveryConfig, parseDeliveryConfig } from './delivery-config.js';

test('factory.delivery.foundation accepts explicit repository DNS and operator configuration', () => {
  assert.deepEqual(parseDeliveryConfig(exampleDeliveryConfig), exampleDeliveryConfig);
  assert.deepEqual(
    parseDeliveryConfig({
      ...exampleDeliveryConfig,
      monthlyBudgetUsd: '50',
      releaseRetentionDays: '35',
    }),
    exampleDeliveryConfig,
  );
});

test('delivery foundation rejects widened repository or domain configuration', () => {
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, repository: 'other/repository/extra' }),
    /repository/,
  );
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, repositoryId: 'R_kgDOUS-quQ' }),
    /repositoryId/,
  );
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, previewZoneName: 'example.com' }),
    /previewZoneName/,
  );
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, monthlyBudgetUsd: '50usd' }),
    /monthlyBudgetUsd/,
  );
  assert.throws(
    () => parseDeliveryConfig({ ...exampleDeliveryConfig, costAnomalyMonitorArn: 'monitor-id' }),
    /costAnomalyMonitorArn/,
  );
});
