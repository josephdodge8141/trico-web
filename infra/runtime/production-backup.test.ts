import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAwsProductionBackupClient,
  ensureProductionBackup,
  type ProductionBackupClient,
} from './production-backup.js';

function client(overrides: Partial<ProductionBackupClient> = {}): ProductionBackupClient {
  return {
    describeProductionStack: async () => ({ kind: 'exists', tableName: 'application-table' }),
    createBackup: async () => 'backup-arn',
    waitForAvailable: async () => undefined,
    ...overrides,
  };
}

test('factory.delivery.prod-backup-ready waits for AVAILABLE before returning', async () => {
  const events: string[] = [];
  const result = await ensureProductionBackup(
    client({
      describeProductionStack: async () => {
        events.push('lookup');
        return { kind: 'exists', tableName: 'application-table' };
      },
      createBackup: async () => {
        events.push('create');
        return 'backup-arn';
      },
      waitForAvailable: async (backupArn) => {
        events.push(`available:${backupArn}`);
      },
    }),
    '0123456789abcdef0123456789abcdef01234567',
  );

  assert.equal(result, 'backup-ready');
  assert.deepEqual(events, ['lookup', 'create', 'available:backup-arn']);
});

test('factory.delivery.prod-first-deploy continues only when the stack is confirmed absent', async () => {
  const result = await ensureProductionBackup(
    client({ describeProductionStack: async () => ({ kind: 'not-found' }) }),
    '0123456789abcdef0123456789abcdef01234567',
  );

  assert.equal(result, 'first-deploy');
});

test('factory.delivery.prod-backup-lookup-failure propagates lookup errors', async () => {
  await assert.rejects(
    ensureProductionBackup(
      client({
        describeProductionStack: async () => {
          throw new Error('CloudFormation access denied');
        },
      }),
      '0123456789abcdef0123456789abcdef01234567',
    ),
    /CloudFormation access denied/,
  );
});

test('factory.delivery.prod-backup-create-failure stops when creation or readiness fails', async () => {
  await assert.rejects(
    ensureProductionBackup(
      client({
        createBackup: async () => {
          throw new Error('backup request rejected');
        },
      }),
      '0123456789abcdef0123456789abcdef01234567',
    ),
    /backup request rejected/,
  );
  await assert.rejects(
    ensureProductionBackup(
      client({
        waitForAvailable: async () => {
          throw new Error('backup did not become AVAILABLE');
        },
      }),
      '0123456789abcdef0123456789abcdef01234567',
    ),
    /backup did not become AVAILABLE/,
  );
});

test('the AWS adapter treats only the explicit missing-stack response as a first deployment', async () => {
  const missingStackClient = createAwsProductionBackupClient(async () => {
    throw {
      stderr:
        'An error occurred (ValidationError) when calling the DescribeStacks operation: Stack with id TricoWeb-prod does not exist.',
    };
  });
  assert.deepEqual(await missingStackClient.describeProductionStack(), { kind: 'not-found' });

  const apiFailureClient = createAwsProductionBackupClient(async () => {
    throw Object.assign(new Error('AccessDenied'), {
      stderr: 'AccessDenied: cloudformation:DescribeStacks is not authorized',
    });
  });
  await assert.rejects(apiFailureClient.describeProductionStack(), /AccessDenied/);
});

test('the AWS adapter polls CREATING until DynamoDB reports AVAILABLE', async () => {
  const commands: string[][] = [];
  let backupReadCount = 0;
  const client = createAwsProductionBackupClient(
    async (args) => {
      commands.push([...args]);
      if (args[0] === 'cloudformation') {
        return JSON.stringify({
          Stacks: [{ Outputs: [{ OutputKey: 'TableName', OutputValue: 'application-table' }] }],
        });
      }
      if (args[0] === 'dynamodb' && args[1] === 'create-backup') {
        return JSON.stringify({ BackupDetails: { BackupArn: 'backup-arn' } });
      }
      if (args[0] === 'dynamodb' && args[1] === 'describe-backup') {
        backupReadCount += 1;
        return JSON.stringify({
          BackupDescription: {
            BackupDetails: { BackupStatus: backupReadCount === 1 ? 'CREATING' : 'AVAILABLE' },
          },
        });
      }
      return '';
    },
    async () => undefined,
  );

  const result = await ensureProductionBackup(client, '0123456789abcdef0123456789abcdef01234567');
  assert.equal(result, 'backup-ready');
  assert.deepEqual(
    commands.map((args) => args.slice(0, 3)),
    [
      ['cloudformation', 'describe-stacks', '--stack-name'],
      ['dynamodb', 'create-backup', '--table-name'],
      ['dynamodb', 'describe-backup', '--backup-arn'],
      ['dynamodb', 'describe-backup', '--backup-arn'],
    ],
  );

  const notAvailableClient = createAwsProductionBackupClient(
    async (args) => {
      if (args[0] === 'cloudformation') {
        return JSON.stringify({
          Stacks: [{ Outputs: [{ OutputKey: 'TableName', OutputValue: 'application-table' }] }],
        });
      }
      if (args[1] === 'create-backup') {
        return JSON.stringify({ BackupDetails: { BackupArn: 'backup-arn' } });
      }
      if (args[1] === 'describe-backup') {
        return JSON.stringify({
          BackupDescription: { BackupDetails: { BackupStatus: 'DELETED' } },
        });
      }
      return '';
    },
    async () => undefined,
  );
  await assert.rejects(
    ensureProductionBackup(notAvailableClient, '0123456789abcdef0123456789abcdef01234567'),
    /readiness check returned DELETED/,
  );
});
