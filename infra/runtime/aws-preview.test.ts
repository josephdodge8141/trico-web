import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DescribeTasksCommand,
  DeregisterTaskDefinitionCommand,
  RegisterTaskDefinitionCommand,
  RunTaskCommand,
} from '@aws-sdk/client-ecs';
import { ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import {
  assertReceiptOwnership,
  AwsPreviewEffectProvider,
  isObsoleteDnsDelete,
  type AwsPreviewConfig,
} from './aws-preview.js';
import type { LifecycleEffect, PreviewOwnership } from './protocol.js';

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

test('generation cleanup leaves a replacement DNS value untouched', () => {
  for (const message of [
    'record set was not found',
    'the values provided do not match the current values',
  ]) {
    assert.equal(
      isObsoleteDnsDelete(Object.assign(new Error(message), { name: 'InvalidChangeBatch' })),
      true,
    );
  }
  assert.equal(
    isObsoleteDnsDelete(Object.assign(new Error('access denied'), { name: 'AccessDenied' })),
    false,
  );
});

const config: AwsPreviewConfig = {
  region: 'us-east-1',
  clusterArn: 'cluster',
  subnetIds: ['subnet'],
  securityGroupId: 'security-group',
  taskExecutionRoleArn: 'execution-role',
  taskRoleArn: 'task-role',
  logGroupName: '/preview',
  stateTableName: 'preview-state',
  previewZoneId: 'Z0123456789EXAMPLE',
  previewZoneName: 'preview.example.com',
  editorSecretArn: 'secret',
};

const ownership: PreviewOwnership = {
  repositoryId: '123',
  pullRequestNumber: 7,
  generation: 'preview-123-7-1',
};

function providerFor(
  databaseSend: (command: unknown) => Promise<unknown>,
  ecsSend: (command: unknown) => Promise<unknown>,
  route53Send: (command: unknown) => Promise<unknown>,
): AwsPreviewEffectProvider {
  const clients = {
    database: { send: databaseSend },
    ecs: { send: ecsSend },
    ec2: { send: async () => ({}) },
    route53: { send: route53Send },
  } as unknown as ConstructorParameters<typeof AwsPreviewEffectProvider>[0];
  return new AwsPreviewEffectProvider(clients, config);
}

test('factory.lifecycle.cleanup-terminal-receipt retains a terminal receipt after cleanup', async () => {
  const commands: unknown[] = [];
  let storedReceipt: Record<string, unknown> | null = { ...receipt };
  const provider = providerFor(
    async (command) => {
      commands.push(command);
      if (command instanceof GetCommand) {
        return storedReceipt === null ? {} : { Item: { previewKey: 'receipt', ...storedReceipt } };
      }
      if (command instanceof PutCommand) {
        storedReceipt = { ...command.input.Item };
        return {};
      }
      if (command instanceof UpdateCommand) {
        storedReceipt = { ...(storedReceipt ?? {}), status: 'cleaned' };
        return {};
      }
      if (command instanceof DeleteCommand) storedReceipt = null;
      return {};
    },
    async (command) => {
      commands.push(command);
      if (command instanceof DescribeTasksCommand) return { tasks: [] };
      return {};
    },
    async (command) => {
      commands.push(command);
      return {};
    },
  );
  const effect: Extract<LifecycleEffect, { type: 'cleanup-preview' }> = {
    type: 'cleanup-preview',
    ownership,
    reason: 'closed',
  };

  await provider.cleanupPreview(effect);
  const firstPassResourceMutationCount = commands.filter(
    (command) =>
      command instanceof ChangeResourceRecordSetsCommand ||
      command instanceof DescribeTasksCommand ||
      command instanceof DeregisterTaskDefinitionCommand,
  ).length;
  await provider.cleanupPreview(effect);
  assert.equal(
    commands.filter(
      (command) =>
        command instanceof ChangeResourceRecordSetsCommand ||
        command instanceof DescribeTasksCommand ||
        command instanceof DeregisterTaskDefinitionCommand,
    ).length,
    firstPassResourceMutationCount,
    'cleanup replay must not repeat provider resource mutations',
  );
  assert.equal(await provider.getPreviewUrl(ownership), null);

  const terminalWrite = commands.find(
    (command): command is InstanceType<typeof PutCommand> | InstanceType<typeof UpdateCommand> =>
      command instanceof PutCommand ||
      (command instanceof UpdateCommand &&
        Object.values(command.input.ExpressionAttributeValues ?? {}).includes('cleaned')),
  );
  if (terminalWrite === undefined) assert.fail('cleanup must persist a terminal cleaned receipt');
  const nowSeconds = Math.floor(Date.now() / 1_000);
  const expiryValues =
    terminalWrite instanceof PutCommand
      ? [terminalWrite.input.Item?.expiresAt]
      : Object.values(terminalWrite.input.ExpressionAttributeValues ?? {});
  const retainedExpiry = Math.max(
    ...expiryValues.filter((value): value is number => typeof value === 'number'),
  );
  assert.ok(retainedExpiry >= nowSeconds + 6 * 24 * 60 * 60, 'cleanup should refresh receipt TTL');
  assert.equal(
    commands.some((command) => command instanceof DeleteCommand),
    false,
  );
});

test('factory.lifecycle.cleaned-generation-replay rejects ensure for a terminal receipt', async () => {
  let taskDefinitionRegistrations = 0;
  let taskLaunches = 0;
  let dnsMutations = 0;
  const cleanedReceipt = { ...receipt, status: 'cleaned' };
  const provider = providerFor(
    async (command) => {
      if (command instanceof GetCommand) {
        return { Item: { previewKey: 'receipt', ...cleanedReceipt } };
      }
      return {};
    },
    async (command) => {
      if (command instanceof RegisterTaskDefinitionCommand) taskDefinitionRegistrations += 1;
      if (command instanceof RunTaskCommand) taskLaunches += 1;
      return {};
    },
    async (command) => {
      if (command instanceof ChangeResourceRecordSetsCommand) dnsMutations += 1;
      return {};
    },
  );
  const effect: Extract<LifecycleEffect, { type: 'ensure-preview' }> = {
    type: 'ensure-preview',
    ownership,
    generation: {
      id: ownership.generation,
      ordinal: 1,
      revision: 'sha-1',
      admittedAt: '2026-09-23T00:00:00.000Z',
      startupDeadline: '2026-09-23T00:30:00.000Z',
      healthyAt: null,
      expiresAt: null,
      phase: 'launching',
      cleanupReason: null,
    },
  };

  await assert.rejects(provider.ensurePreview(effect), /cleaned generation/);
  assert.equal(taskDefinitionRegistrations, 0);
  assert.equal(taskLaunches, 0);
  assert.equal(dnsMutations, 0);
});
