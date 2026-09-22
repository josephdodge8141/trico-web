import assert from 'node:assert/strict';
import test from 'node:test';

import { assertReceiptOwnership } from './aws-preview.js';

const receipt = {
  recordType: 'generation' as const,
  repositoryId: '123',
  pullRequestNumber: 7,
  generation: 'preview-123-7-1',
  taskArn: 'task',
  taskDefinitionArn: 'definition',
  recordName: 'pr-7.preview.example.com',
  publicIp: '192.0.2.1',
  status: 'healthy' as const,
  expiresAt: 2_000_000_000,
};

test('factory.lifecycle.provider-ownership rejects every mismatched ownership dimension', () => {
  assert.doesNotThrow(() =>
    assertReceiptOwnership(receipt, {
      repositoryId: '123',
      pullRequestNumber: 7,
      generation: 'preview-123-7-1',
    }),
  );
  for (const ownership of [
    { repositoryId: 'other', pullRequestNumber: 7, generation: 'preview-123-7-1' },
    { repositoryId: '123', pullRequestNumber: 8, generation: 'preview-123-7-1' },
    { repositoryId: '123', pullRequestNumber: 7, generation: 'preview-123-7-2' },
  ]) {
    assert.throws(() => assertReceiptOwnership(receipt, ownership), /ownership/);
  }
});
