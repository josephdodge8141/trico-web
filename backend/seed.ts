import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { hash } from '@node-rs/argon2';
import {
  pageIdSchema,
  externalSourceSchema,
  registrySeedData,
  requireEntityDefinition,
  type ContentManifest,
  type EntityId,
  type PageId,
} from '@app/schemas';

import { loadEnvironment } from './config/environment.js';

const dynamoCredentials = { accessKeyId: 'localaccesskey', secretAccessKey: 'localsecretkey' };
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null)
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  return JSON.stringify(value);
};
const checksum = (value: unknown): string =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');
const contentType = (name: string): string =>
  ({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  })[extname(name).toLowerCase()] ?? 'application/octet-stream';

async function ensureTable(client: DynamoDBClient, tableName: string): Promise<void> {
  const exists = await client
    .send(new DescribeTableCommand({ TableName: tableName }))
    .then(() => true)
    .catch(() => false);
  if (exists) return;
  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'pk', AttributeType: 'S' },
        { AttributeName: 'sk', AttributeType: 'S' },
        { AttributeName: 'gsi1pk', AttributeType: 'S' },
        { AttributeName: 'gsi1sk', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'pk', KeyType: 'HASH' },
        { AttributeName: 'sk', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'gsi1',
          KeySchema: [
            { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
    }),
  );
  await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: tableName });
}

async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  const exists = await client
    .send(new HeadBucketCommand({ Bucket: bucket }))
    .then(() => true)
    .catch(() => false);
  if (!exists) await client.send(new CreateBucketCommand({ Bucket: bucket }));
}

async function allowLocalPublicReads(client: S3Client, bucket: string): Promise<void> {
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'LocalPreviewPublicReads',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${bucket}/*`,
          },
        ],
      }),
    }),
  );
}

async function seedEntities(database: DynamoDBDocumentClient, tableName: string): Promise<void> {
  const entries = Object.entries(registrySeedData) as [
    EntityId,
    (typeof registrySeedData)[EntityId],
  ][];
  for (let offset = 0; offset < entries.length; offset += 25) {
    const writes = [];
    for (const [id, value] of entries.slice(offset, offset + 25)) {
      const existing = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: `ENTITY#${id}`, sk: 'CURRENT' },
          ConsistentRead: true,
        }),
      );
      if (existing.Item !== undefined) {
        if (checksum(existing.Item['value']) !== checksum(value))
          throw new Error(`Seed mismatch for ${id}; refusing to overwrite`);
        continue;
      }
      writes.push({
        PutRequest: {
          Item: {
            pk: `ENTITY#${id}`,
            sk: 'CURRENT',
            id,
            pageId: requireEntityDefinition(id).pageId,
            version: 1,
            value,
            updatedAt: new Date(0).toISOString(),
            seedChecksum: checksum(value),
          },
        },
      });
    }
    if (writes.length > 0)
      await database.send(new BatchWriteCommand({ RequestItems: { [tableName]: writes } }));
  }
}

async function uploadMedia(objects: S3Client, bucket: string): Promise<void> {
  const directory = resolve(process.cwd(), 'packages/zod/seeds/media');
  for (const name of await readdir(directory)) {
    if (name.endsWith('.json')) continue;
    await objects.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `media/seed/${name}`,
        Body: await readFile(join(directory, name)),
        ContentType: contentType(name),
        CacheControl: 'public,max-age=31536000,immutable',
      }),
    );
  }
}

async function seedExternalSources(
  database: DynamoDBDocumentClient,
  tableName: string,
): Promise<void> {
  const sourcePath = resolve(process.cwd(), 'packages/zod/seeds/external-sources.json');
  const sources = externalSourceSchema
    .array()
    .parse(JSON.parse(await readFile(sourcePath, 'utf8')));
  for (const source of sources) {
    const key = { pk: `SOURCE#${source.entityId}`, sk: `ITEM#${source.itemId}` };
    const existing = await database.send(
      new GetCommand({ TableName: tableName, Key: key, ConsistentRead: true }),
    );
    if (existing.Item !== undefined) {
      const existingSource = externalSourceSchema.parse(
        Object.fromEntries(
          Object.entries(existing.Item).filter(
            ([field]) => !['pk', 'sk', 'gsi1pk', 'gsi1sk'].includes(field),
          ),
        ),
      );
      if (checksum(existingSource) !== checksum(source))
        throw new Error(`External source mismatch for ${source.id}; refusing to overwrite`);
      continue;
    }
    await database.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          ...key,
          ...source,
          gsi1pk: `SOURCEID#${source.id}`,
          gsi1sk: 'SOURCE',
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
  }
}

async function publishInitial(
  database: DynamoDBDocumentClient,
  tableName: string,
  objects: S3Client,
  bucket: string,
): Promise<void> {
  const manifestExists = await objects
    .send(new HeadObjectCommand({ Bucket: bucket, Key: 'content/manifest.json' }))
    .then(() => true)
    .catch(() => false);
  const state = await database.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: 'SITE', sk: 'STATE' },
      ConsistentRead: true,
    }),
  );
  const existingOperationId = state.Item?.['liveOperationId'];
  if (manifestExists && typeof existingOperationId === 'string') return;
  if (manifestExists)
    throw new Error(
      'Public manifest exists without matching DynamoDB site state; refusing to overwrite',
    );
  const operationId = typeof existingOperationId === 'string' ? existingOperationId : randomUUID();
  const pages = {} as Record<PageId, { url: string; etag: string }>;
  const publicationRecords = [];
  const publishedAt = new Date(0).toISOString();
  for (const pageId of pageIdSchema.options) {
    const entities = Object.fromEntries(
      Object.entries(registrySeedData).filter(
        ([id]) => requireEntityDefinition(id).pageId === pageId,
      ),
    );
    const body = JSON.stringify({ pageId, entities });
    const key = `content/releases/${operationId}/${pageId}.json`;
    await objects.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        CacheControl: 'public,max-age=31536000,immutable',
      }),
    );
    pages[pageId] = {
      url: `/${key}`,
      etag: `"${createHash('sha256').update(body).digest('hex')}"`,
    };
    publicationRecords.push({
      id: randomUUID(),
      pageId,
      authors: [],
      publishedBy: 'system',
      publishedAt,
      source: 'AUTO_SYNC',
      snapshot: Object.entries(entities).map(([entityId, value]) => ({
        entityId,
        entityVersion: 1,
        value,
      })),
    });
  }
  if (typeof existingOperationId !== 'string') {
    await database.send(
      new TransactWriteCommand({
        TransactItems: [
          ...publicationRecords.map((publication) => ({
            Put: {
              TableName: tableName,
              Item: {
                pk: `PUBLICATION#${publication.pageId}`,
                sk: `PUB#${publication.publishedAt}#${publication.id}`,
                ...publication,
                gsi1pk: `PUBLICATION#${publication.id}`,
                gsi1sk: 'META',
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          })),
          {
            Put: {
              TableName: tableName,
              Item: {
                pk: `OPERATION#${operationId}`,
                sk: 'META',
                id: operationId,
                publicationIds: publicationRecords.map((publication) => publication.id),
                affectedPageIds: [...pageIdSchema.options],
                requestedBy: 'system',
                status: 'LIVE',
                createdAt: publishedAt,
                completedAt: publishedAt,
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: tableName,
              Item: { pk: 'SITE', sk: 'STATE', liveOperationId: operationId },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
        ],
      }),
    );
  }
  const manifest: ContentManifest = { version: 1, currentOperationId: operationId, pages };
  await objects.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: 'content/manifest.json',
      Body: JSON.stringify(manifest),
      ContentType: 'application/json',
      CacheControl: 'no-cache',
    }),
  );
}

async function seedPreviewEditor(
  database: DynamoDBDocumentClient,
  tableName: string,
): Promise<void> {
  const email = validateSeedEditorEmail(
    process.env.PREVIEW_EDITOR_EMAIL,
    process.env.EXTERNAL_SEED_EDITOR_EMAIL,
  );
  const password = process.env.PREVIEW_EDITOR_PASSWORD;
  if (email === undefined || email === '' || password === undefined || password === '') return;
  const existing = await database.send(
    new GetCommand({ TableName: tableName, Key: { pk: `EMAIL#${email}`, sk: 'USER' } }),
  );
  if (existing.Item !== undefined) return;
  const userId = randomUUID();
  const passwordHash = await hash(password, {
    algorithm: 2,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });
  await database.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: [
          { PutRequest: { Item: { pk: `EMAIL#${email}`, sk: 'USER', userId } } },
          {
            PutRequest: {
              Item: {
                pk: `USER#${userId}`,
                sk: 'PROFILE',
                userId,
                email,
                passwordHash,
                emailVerified: true,
              },
            },
          },
        ],
      },
    }),
  );
}

export function validateSeedEditorEmail(
  value: string | undefined,
  externalAllowedValue: string | undefined,
): string | undefined {
  const email = value?.trim().toLowerCase();
  if (email === undefined || email === '') return undefined;
  if (email.endsWith('@tricoinc.com')) return email;
  const externalAllowed = externalAllowedValue?.trim().toLowerCase();
  if (externalAllowed === email) return email;
  throw new Error(
    'PREVIEW_EDITOR_EMAIL must use @tricoinc.com or match EXTERNAL_SEED_EDITOR_EMAIL',
  );
}

async function main(): Promise<void> {
  const environment = loadEnvironment();
  const dynamoClient = new DynamoDBClient({
    region: environment.awsRegion,
    ...(environment.dynamoEndpoint === undefined
      ? {}
      : { endpoint: environment.dynamoEndpoint, credentials: dynamoCredentials }),
  });
  const database = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const objects = new S3Client({
    region: environment.awsRegion,
    forcePathStyle: environment.s3ForcePathStyle,
    ...(environment.s3Endpoint === undefined ? {} : { endpoint: environment.s3Endpoint }),
  });
  try {
    await ensureTable(dynamoClient, environment.dynamoTable);
    await ensureBucket(objects, environment.s3Bucket);
    if (environment.s3Endpoint !== undefined)
      await allowLocalPublicReads(objects, environment.s3Bucket);
    await seedEntities(database, environment.dynamoTable);
    await seedExternalSources(database, environment.dynamoTable);
    await seedPreviewEditor(database, environment.dynamoTable);
    await uploadMedia(objects, environment.s3Bucket);
    await publishInitial(database, environment.dynamoTable, objects, environment.s3Bucket);
  } finally {
    dynamoClient.destroy();
    objects.destroy();
  }
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) void main();
