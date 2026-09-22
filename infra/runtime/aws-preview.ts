import { DescribeNetworkInterfacesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeregisterTaskDefinitionCommand,
  DescribeTasksCommand,
  ECSClient,
  ListTagsForResourceCommand,
  RegisterTaskDefinitionCommand,
  RunTaskCommand,
  StopTaskCommand,
  waitUntilTasksRunning,
  waitUntilTasksStopped,
  type ContainerDefinition,
} from '@aws-sdk/client-ecs';
import { ChangeResourceRecordSetsCommand, Route53Client } from '@aws-sdk/client-route-53';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';

import type { LifecycleStateStore, PreviewEffectProvider } from './controller.js';
import {
  lifecycleStateSchema,
  type LifecycleEffect,
  type LifecycleState,
  type PreviewOwnership,
} from './protocol.js';

const receiptSchema = z
  .object({
    recordType: z.literal('generation'),
    repositoryId: z.string().min(1),
    pullRequestNumber: z.number().int().positive(),
    generation: z.string().min(1),
    taskArn: z.string().min(1),
    taskDefinitionArn: z.string().min(1),
    recordName: z.string().min(1),
    publicIp: z.string().min(1),
    status: z.enum(['launching', 'healthy']),
    expiresAt: z.number().int().positive(),
  })
  .strict();

type GenerationReceipt = z.infer<typeof receiptSchema>;

export interface AwsPreviewConfig {
  readonly region: string;
  readonly clusterArn: string;
  readonly subnetIds: readonly string[];
  readonly securityGroupId: string;
  readonly taskExecutionRoleArn: string;
  readonly taskRoleArn: string;
  readonly logGroupName: string;
  readonly stateTableName: string;
  readonly previewZoneId: string;
  readonly previewZoneName: string;
  readonly editorSecretArn: string;
  readonly backendImage?: string;
  readonly frontendImage?: string;
  readonly dynamodbImage?: string;
  readonly minioImage?: string;
  readonly mailpitImage?: string;
}

interface AwsPreviewClients {
  readonly database: DynamoDBDocumentClient;
  readonly ecs: ECSClient;
  readonly ec2: EC2Client;
  readonly route53: Route53Client;
}

function stateKey(repositoryId: string, pullRequestNumber: number): string {
  return `state#${repositoryId}#${String(pullRequestNumber)}`;
}

function receiptKey(ownership: PreviewOwnership): string {
  return `generation#${ownership.repositoryId}#${String(ownership.pullRequestNumber)}#${ownership.generation}`;
}

function empty(value: string | undefined, name: string): string {
  if (value === undefined || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

export function assertReceiptOwnership(
  receipt: GenerationReceipt,
  ownership: PreviewOwnership,
): void {
  if (
    receipt.repositoryId !== ownership.repositoryId ||
    receipt.pullRequestNumber !== ownership.pullRequestNumber ||
    receipt.generation !== ownership.generation
  ) {
    throw new Error('preview resource ownership does not match the requested generation');
  }
}

export function isObsoleteDnsDelete(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'InvalidChangeBatch' &&
    'message' in error &&
    typeof error.message === 'string' &&
    (error.message.includes('not found') ||
      error.message.includes('values provided do not match the current values'))
  );
}

export class DynamoLifecycleStateStore implements LifecycleStateStore {
  public constructor(
    private readonly database: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  public async load(
    repositoryId: string,
    pullRequestNumber: number,
  ): Promise<LifecycleState | null> {
    const response = await this.database.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { previewKey: stateKey(repositoryId, pullRequestNumber) },
        ConsistentRead: true,
      }),
    );
    if (response.Item === undefined) return null;
    return lifecycleStateSchema.parse(JSON.parse(String(response.Item.stateJson)));
  }

  public async compareAndSwap(
    next: LifecycleState,
    expectedStateRevision: number | null,
  ): Promise<'stored' | 'conflict'> {
    const item: Record<string, unknown> = {
      previewKey: stateKey(next.identity.repositoryId, next.identity.pullRequestNumber),
      recordType: 'state',
      repositoryId: next.identity.repositoryId,
      pullRequestNumber: next.identity.pullRequestNumber,
      stateRevision: next.stateRevision,
      stateJson: JSON.stringify(next),
    };
    if (next.closed && next.active === null && next.retiring === null) {
      item.expiresAt = Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60;
    }
    try {
      await this.database.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression:
            expectedStateRevision === null
              ? 'attribute_not_exists(previewKey)'
              : 'stateRevision = :expected',
          ...(expectedStateRevision === null
            ? {}
            : { ExpressionAttributeValues: { ':expected': expectedStateRevision } }),
        }),
      );
      return 'stored';
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        return 'conflict';
      }
      throw error;
    }
  }

  public async *list(): AsyncIterable<LifecycleState> {
    let startKey: Record<string, unknown> | undefined;
    do {
      const response = await this.database.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'recordType = :state',
          ExpressionAttributeValues: { ':state': 'state' },
          ...(startKey === undefined ? {} : { ExclusiveStartKey: startKey }),
        }),
      );
      for (const item of response.Items ?? []) {
        yield lifecycleStateSchema.parse(JSON.parse(String(item.stateJson)));
      }
      startKey = response.LastEvaluatedKey;
    } while (startKey !== undefined);
  }
}

export class AwsPreviewEffectProvider implements PreviewEffectProvider {
  public constructor(
    private readonly clients: AwsPreviewClients,
    private readonly config: AwsPreviewConfig,
  ) {}

  public async ensurePreview(
    effect: Extract<LifecycleEffect, { type: 'ensure-preview' }>,
  ): Promise<void> {
    const existing = await this.receipt(effect.ownership);
    if (existing !== null) {
      assertReceiptOwnership(existing, effect.ownership);
      await this.waitForHealth(existing.recordName);
      return;
    }
    const backendImage = empty(this.config.backendImage, 'backendImage');
    const frontendImage = empty(this.config.frontendImage, 'frontendImage');
    const containers = this.containers(backendImage, frontendImage, effect.ownership);
    const family =
      `trico-pr-${String(effect.ownership.pullRequestNumber)}-${effect.ownership.generation}`
        .replaceAll(/[^A-Za-z0-9_-]/g, '-')
        .slice(0, 255);
    const definition = await this.clients.ecs.send(
      new RegisterTaskDefinitionCommand({
        family,
        networkMode: 'awsvpc',
        requiresCompatibilities: ['FARGATE'],
        cpu: '2048',
        memory: '4096',
        executionRoleArn: this.config.taskExecutionRoleArn,
        taskRoleArn: this.config.taskRoleArn,
        containerDefinitions: containers,
      }),
    );
    const taskDefinitionArn = empty(
      definition.taskDefinition?.taskDefinitionArn,
      'registered task definition ARN',
    );
    const run = await this.clients.ecs.send(
      new RunTaskCommand({
        cluster: this.config.clusterArn,
        taskDefinition: taskDefinitionArn,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            assignPublicIp: 'ENABLED',
            subnets: [...this.config.subnetIds],
            securityGroups: [this.config.securityGroupId],
          },
        },
        tags: [
          { key: 'trico:repository-id', value: effect.ownership.repositoryId },
          { key: 'trico:pull-request', value: String(effect.ownership.pullRequestNumber) },
          { key: 'trico:generation', value: effect.ownership.generation },
        ],
      }),
    );
    const taskArn = empty(run.tasks?.[0]?.taskArn, 'started task ARN');
    await waitUntilTasksRunning(
      { client: this.clients.ecs, maxWaitTime: 600 },
      { cluster: this.config.clusterArn, tasks: [taskArn] },
    );
    const task = await this.clients.ecs.send(
      new DescribeTasksCommand({ cluster: this.config.clusterArn, tasks: [taskArn] }),
    );
    const networkInterfaceId = task.tasks?.[0]?.attachments
      ?.flatMap((attachment) => attachment.details ?? [])
      .find((detail) => detail.name === 'networkInterfaceId')?.value;
    const eni = await this.clients.ec2.send(
      new DescribeNetworkInterfacesCommand({
        NetworkInterfaceIds: [empty(networkInterfaceId, 'task network interface')],
      }),
    );
    const publicIp = empty(
      eni.NetworkInterfaces?.[0]?.Association?.PublicIp,
      'task public IP address',
    );
    const recordName = `pr-${String(effect.ownership.pullRequestNumber)}.${this.config.previewZoneName}`;
    const receipt: GenerationReceipt = {
      recordType: 'generation',
      ...effect.ownership,
      taskArn,
      taskDefinitionArn,
      recordName,
      publicIp,
      status: 'launching',
      expiresAt: Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60,
    };
    try {
      await this.clients.database.send(
        new PutCommand({
          TableName: this.config.stateTableName,
          Item: { previewKey: receiptKey(effect.ownership), ...receipt },
          ConditionExpression: 'attribute_not_exists(previewKey)',
        }),
      );
    } catch (error) {
      await this.clients.ecs.send(
        new StopTaskCommand({
          cluster: this.config.clusterArn,
          task: taskArn,
          reason: 'generation receipt conflict',
        }),
      );
      await this.clients.ecs.send(
        new DeregisterTaskDefinitionCommand({ taskDefinition: taskDefinitionArn }),
      );
      throw error;
    }
    await this.changeDns('UPSERT', receipt);
    await this.waitForHealth(recordName);
    await this.clients.database.send(
      new PutCommand({
        TableName: this.config.stateTableName,
        Item: { previewKey: receiptKey(effect.ownership), ...receipt, status: 'healthy' },
        ConditionExpression: 'generation = :generation',
        ExpressionAttributeValues: { ':generation': effect.ownership.generation },
      }),
    );
  }

  public async cleanupPreview(
    effect: Extract<LifecycleEffect, { type: 'cleanup-preview' }>,
  ): Promise<void> {
    const receipt = await this.receipt(effect.ownership);
    if (receipt === null) return;
    assertReceiptOwnership(receipt, effect.ownership);
    await this.changeDns('DELETE', receipt);
    const described = await this.clients.ecs.send(
      new DescribeTasksCommand({
        cluster: this.config.clusterArn,
        tasks: [receipt.taskArn],
      }),
    );
    const task = described.tasks?.[0];
    if (task !== undefined) {
      const tags = await this.clients.ecs.send(
        new ListTagsForResourceCommand({ resourceArn: receipt.taskArn }),
      );
      const generation = tags.tags?.find((tag) => tag.key === 'trico:generation')?.value;
      const repositoryId = tags.tags?.find((tag) => tag.key === 'trico:repository-id')?.value;
      const pullRequest = tags.tags?.find((tag) => tag.key === 'trico:pull-request')?.value;
      if (
        generation !== effect.ownership.generation ||
        repositoryId !== effect.ownership.repositoryId ||
        pullRequest !== String(effect.ownership.pullRequestNumber)
      ) {
        throw new Error('ECS task ownership tags do not match cleanup generation');
      }
      if (task.lastStatus !== 'STOPPED') {
        await this.clients.ecs.send(
          new StopTaskCommand({
            cluster: this.config.clusterArn,
            task: receipt.taskArn,
            reason: effect.reason,
          }),
        );
        await waitUntilTasksStopped(
          { client: this.clients.ecs, maxWaitTime: 600 },
          { cluster: this.config.clusterArn, tasks: [receipt.taskArn] },
        );
      }
    }
    await this.clients.ecs.send(
      new DeregisterTaskDefinitionCommand({ taskDefinition: receipt.taskDefinitionArn }),
    );
    await this.clients.database.send(
      new DeleteCommand({
        TableName: this.config.stateTableName,
        Key: { previewKey: receiptKey(effect.ownership) },
        ConditionExpression: 'generation = :generation',
        ExpressionAttributeValues: { ':generation': effect.ownership.generation },
      }),
    );
  }

  public async getPreviewUrl(ownership: PreviewOwnership): Promise<string | null> {
    const receipt = await this.receipt(ownership);
    if (receipt === null) return null;
    assertReceiptOwnership(receipt, ownership);
    return `https://${receipt.recordName}`;
  }

  private async receipt(ownership: PreviewOwnership): Promise<GenerationReceipt | null> {
    const response = await this.clients.database.send(
      new GetCommand({
        TableName: this.config.stateTableName,
        Key: { previewKey: receiptKey(ownership) },
        ConsistentRead: true,
      }),
    );
    if (response.Item === undefined) return null;
    const receipt = { ...response.Item };
    delete receipt.previewKey;
    return receiptSchema.parse(receipt);
  }

  private async changeDns(action: 'UPSERT' | 'DELETE', receipt: GenerationReceipt): Promise<void> {
    try {
      await this.clients.route53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: this.config.previewZoneId,
          ChangeBatch: {
            Comment: `generation-owned preview ${receipt.generation}`,
            Changes: [
              {
                Action: action,
                ResourceRecordSet: {
                  Name: receipt.recordName,
                  Type: 'A',
                  TTL: 60,
                  ResourceRecords: [{ Value: receipt.publicIp }],
                },
              },
            ],
          },
        }),
      );
    } catch (error) {
      if (action !== 'DELETE' || !isObsoleteDnsDelete(error)) throw error;
    }
  }

  private async waitForHealth(recordName: string): Promise<void> {
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      try {
        const response = await fetch(`https://${recordName}/api/v1/health`);
        if (response.ok) {
          const body: unknown = await response.json();
          if (
            typeof body === 'object' &&
            body !== null &&
            'status' in body &&
            body.status === 'ok'
          ) {
            return;
          }
        }
      } catch {
        // The task and certificate may still be starting.
      }
      if (attempt < 40) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
    throw new Error(`preview health did not become ready at ${recordName}`);
  }

  private containers(
    backendImage: string,
    frontendImage: string,
    ownership: PreviewOwnership,
  ): ContainerDefinition[] {
    const host = `pr-${String(ownership.pullRequestNumber)}.${this.config.previewZoneName}`;
    const logConfiguration = {
      logDriver: 'awslogs' as const,
      options: {
        'awslogs-group': this.config.logGroupName,
        'awslogs-region': this.config.region,
        'awslogs-stream-prefix': 'preview',
      },
    };
    const environment = [
      { name: 'APP_ENV', value: 'preview' },
      { name: 'HOST', value: '0.0.0.0' },
      { name: 'PORT', value: '3000' },
      { name: 'PUBLIC_ORIGIN', value: `https://${host}` },
      { name: 'AWS_ACCESS_KEY_ID', value: 'local-minio-user' },
      { name: 'AWS_SECRET_ACCESS_KEY', value: 'local-minio-password' },
      { name: 'AWS_REGION', value: 'us-east-2' },
      { name: 'DYNAMODB_ENDPOINT', value: 'http://127.0.0.1:8000' },
      { name: 'DYNAMODB_TABLE', value: 'trico-web-preview' },
      { name: 'S3_ENDPOINT', value: 'http://127.0.0.1:9000' },
      { name: 'S3_BUCKET', value: 'trico-web-preview' },
      { name: 'S3_FORCE_PATH_STYLE', value: 'true' },
      { name: 'MAIL_TRANSPORT', value: 'smtp' },
      { name: 'SMTP_HOST', value: '127.0.0.1' },
      { name: 'SMTP_PORT', value: '1025' },
      { name: 'EMAIL_FROM', value: 'TriCo Preview <preview@tricoinc.com>' },
      { name: 'SESSION_COOKIE_NAME', value: 'trico_preview_session' },
      { name: 'COOKIE_SECURE', value: 'true' },
      { name: 'BEDROCK_MODE', value: 'fixture' },
    ];
    return [
      {
        name: 'dynamodb',
        image: empty(this.config.dynamodbImage, 'dynamodbImage'),
        essential: true,
        command: ['-jar', 'DynamoDBLocal.jar', '-sharedDb', '-inMemory'],
        logConfiguration,
      },
      {
        name: 'minio',
        image: empty(this.config.minioImage, 'minioImage'),
        essential: true,
        command: ['server', '/data'],
        environment: [
          { name: 'MINIO_ROOT_USER', value: 'local-minio-user' },
          { name: 'MINIO_ROOT_PASSWORD', value: 'local-minio-password' },
        ],
        logConfiguration,
      },
      {
        name: 'mailpit',
        image: empty(this.config.mailpitImage, 'mailpitImage'),
        essential: true,
        environment: [{ name: 'MP_WEBROOT', value: '/__mailpit/' }],
        logConfiguration,
      },
      { name: 'backend', image: backendImage, essential: true, environment, logConfiguration },
      {
        name: 'seed',
        image: backendImage,
        essential: false,
        command: [
          'sh',
          '-c',
          'for attempt in $(seq 1 20); do node backend/dist/seed.js && exit 0; sleep 3; done; exit 1',
        ],
        environment,
        secrets: [
          { name: 'PREVIEW_EDITOR_EMAIL', valueFrom: `${this.config.editorSecretArn}:email::` },
          {
            name: 'PREVIEW_EDITOR_PASSWORD',
            valueFrom: `${this.config.editorSecretArn}:password::`,
          },
        ],
        logConfiguration,
      },
      {
        name: 'frontend',
        image: frontendImage,
        essential: true,
        portMappings: [
          { containerPort: 80, protocol: 'tcp' },
          { containerPort: 443, protocol: 'tcp' },
        ],
        environment: [
          { name: 'SITE_ADDRESS', value: host },
          { name: 'BACKEND_UPSTREAM', value: '127.0.0.1:3000' },
          { name: 'MAILPIT_UPSTREAM', value: '127.0.0.1:8025' },
          { name: 'OBJECT_UPSTREAM', value: '127.0.0.1:9000' },
          { name: 'CONTENT_BUCKET', value: 'trico-web-preview' },
          { name: 'MAILPIT_USERNAME', value: 'reviewer' },
          {
            name: 'MAILPIT_PASSWORD_HASH',
            value: '$2y$12$4NtnM0Krnhgglj4XqsvjReKYGo7BEJZQSt8yy1s.DnavvqR0vDnde',
          },
        ],
        dependsOn: [
          { containerName: 'seed', condition: 'SUCCESS' },
          { containerName: 'backend', condition: 'START' },
        ],
        logConfiguration,
      },
    ];
  }
}

export function createAwsPreviewClients(region: string): AwsPreviewClients {
  return {
    database: DynamoDBDocumentClient.from(new DynamoDBClient({ region })),
    ecs: new ECSClient({ region }),
    ec2: new EC2Client({ region }),
    route53: new Route53Client({ region }),
  };
}
