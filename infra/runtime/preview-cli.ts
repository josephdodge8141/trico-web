import {
  AwsPreviewEffectProvider,
  createAwsPreviewClients,
  DynamoLifecycleStateStore,
  type AwsPreviewConfig,
} from './aws-preview.js';
import { dispatchLifecycle, dueDeadlineCommand } from './controller.js';
import {
  commandEventSequence,
  type LifecycleCommand,
  type LifecycleEffect,
  type LifecycleState,
} from './protocol.js';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') throw new Error(`${name} is required`);
  return value.trim();
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === '' ? undefined : value;
}

function positiveInteger(name: string): number {
  const value = Number(required(name));
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${name} must be a positive integer`);
  return value;
}

function config(): AwsPreviewConfig {
  const backendImage = optional('PREVIEW_BACKEND_IMAGE');
  const frontendImage = optional('PREVIEW_FRONTEND_IMAGE');
  const dynamodbImage = optional('PREVIEW_DYNAMODB_IMAGE');
  const minioImage = optional('PREVIEW_MINIO_IMAGE');
  const mailpitImage = optional('PREVIEW_MAILPIT_IMAGE');
  return {
    region: required('AWS_REGION'),
    clusterArn: required('PREVIEW_CLUSTER_ARN'),
    subnetIds: required('PREVIEW_SUBNET_IDS').split(','),
    securityGroupId: required('PREVIEW_SECURITY_GROUP_ID'),
    taskExecutionRoleArn: required('PREVIEW_TASK_EXECUTION_ROLE_ARN'),
    taskRoleArn: required('PREVIEW_TASK_ROLE_ARN'),
    logGroupName: required('PREVIEW_LOG_GROUP_NAME'),
    stateTableName: required('PREVIEW_STATE_TABLE_NAME'),
    previewZoneId: required('PREVIEW_ZONE_ID'),
    previewZoneName: required('PREVIEW_ZONE_NAME'),
    editorSecretArn: required('PREVIEW_EDITOR_SECRET_ARN'),
    ...(backendImage === undefined ? {} : { backendImage }),
    ...(frontendImage === undefined ? {} : { frontendImage }),
    ...(dynamodbImage === undefined ? {} : { dynamodbImage }),
    ...(minioImage === undefined ? {} : { minioImage }),
    ...(mailpitImage === undefined ? {} : { mailpitImage }),
  };
}

async function finalizeEffects(
  effects: readonly LifecycleEffect[],
  stateStore: DynamoLifecycleStateStore,
  provider: AwsPreviewEffectProvider,
  commandId: string,
): Promise<void> {
  let offset = 1;
  for (const effect of effects) {
    const state = await stateStore.load(
      effect.ownership.repositoryId,
      effect.ownership.pullRequestNumber,
    );
    if (state === null) throw new Error('lifecycle state disappeared after provider effect');
    const command: LifecycleCommand =
      effect.type === 'ensure-preview'
        ? {
            protocolVersion: 1,
            type: 'healthy',
            commandId: `${commandId}-healthy-${effect.ownership.generation}`,
            eventSequence: state.lastEventSequence + offset,
            expectedStateRevision: state.stateRevision,
            identity: state.identity,
            generation: effect.ownership.generation,
          }
        : {
            protocolVersion: 1,
            type: 'cleanup-complete',
            commandId: `${commandId}-cleanup-${effect.ownership.generation}`,
            eventSequence: state.lastEventSequence + offset,
            expectedStateRevision: state.stateRevision,
            identity: state.identity,
            generation: effect.ownership.generation,
          };
    const result = await dispatchLifecycle(command, new Date().toISOString(), stateStore, provider);
    if (result.decision === 'rejected' || result.decision === 'conflict') {
      throw new Error(`provider completion was not accepted: ${result.reason}`);
    }
    offset += 1;
  }
}

async function dispatch(
  command: LifecycleCommand,
  stateStore: DynamoLifecycleStateStore,
  provider: AwsPreviewEffectProvider,
): Promise<LifecycleState | null> {
  const result = await dispatchLifecycle(command, new Date().toISOString(), stateStore, provider);
  if (result.decision === 'rejected' || result.decision === 'conflict') {
    throw new Error(`lifecycle command was not accepted: ${result.reason}`);
  }
  await finalizeEffects(result.effects, stateStore, provider, command.commandId);
  return stateStore.load(command.identity.repositoryId, command.identity.pullRequestNumber);
}

async function main(): Promise<void> {
  const operation = process.argv[2];
  if (!['admit', 'close', 'reconcile', 'sweep'].includes(operation ?? '')) {
    throw new Error('usage: preview-cli.ts <admit|close|reconcile|sweep>');
  }
  const previewConfig = config();
  const clients = createAwsPreviewClients(previewConfig.region);
  const stateStore = new DynamoLifecycleStateStore(clients.database, previewConfig.stateTableName);
  const provider = new AwsPreviewEffectProvider(clients, previewConfig);

  if (operation === 'sweep') {
    for await (const state of stateStore.list()) {
      const now = new Date().toISOString();
      const due = dueDeadlineCommand(state, now);
      const command: LifecycleCommand = due ?? {
        protocolVersion: 1,
        type: 'reconcile',
        commandId: `reconcile-${required('COMMAND_ID')}-${state.identity.repositoryId}-${String(state.identity.pullRequestNumber)}`,
        eventSequence: commandEventSequence(
          'reconcile',
          positiveInteger('EVENT_SEQUENCE'),
          state.lastEventSequence,
        ),
        expectedStateRevision: state.stateRevision,
        identity: state.identity,
      };
      await dispatch(command, stateStore, provider);
    }
    process.stdout.write(`${JSON.stringify({ decision: 'swept' })}\n`);
    return;
  }

  const identity = {
    repositoryId: required('REPOSITORY_ID'),
    pullRequestNumber: positiveInteger('PULL_REQUEST_NUMBER'),
  };
  const previous = await stateStore.load(identity.repositoryId, identity.pullRequestNumber);
  if (operation === 'close' && previous === null) {
    process.stdout.write(`${JSON.stringify({ decision: 'absent' })}\n`);
    return;
  }
  const commandType =
    operation === 'admit' ? 'admit' : operation === 'close' ? 'close' : 'reconcile';
  const common = {
    protocolVersion: 1 as const,
    commandId: required('COMMAND_ID'),
    eventSequence: commandEventSequence(
      commandType,
      positiveInteger('EVENT_SEQUENCE'),
      previous?.lastEventSequence ?? 0,
    ),
    expectedStateRevision: previous?.stateRevision ?? null,
    identity,
  };
  const command: LifecycleCommand =
    operation === 'admit'
      ? { ...common, type: 'admit', revision: required('CANDIDATE_SHA') }
      : operation === 'close'
        ? { ...common, type: 'close' }
        : { ...common, type: 'reconcile' };
  const state = await dispatch(command, stateStore, provider);
  const active = state?.active;
  const previewUrl =
    state === null || active === undefined || active === null
      ? null
      : await provider.getPreviewUrl({ ...state.identity, generation: active.id });
  process.stdout.write(
    `${JSON.stringify({ decision: 'accepted', previewUrl, generation: active?.id ?? null })}\n`,
  );
}

await main();
