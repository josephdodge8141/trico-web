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
  entitySchema,
  pageIdSchema,
  externalSourceSchema,
  requireEntityDefinition,
  type ContentManifest,
  type EntityId,
  type PageId,
} from '@app/schemas';
import { registrySeedData } from '@app/schemas/server';

import { loadEnvironment } from './config/environment.js';

const dynamoCredentials = { accessKeyId: 'localaccesskey', secretAccessKey: 'localsecretkey' };
const initialSeedTimestamp = new Date(0).toISOString();
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
// Recognized pristine values from the preceding TriCo seed. Keep them intact:
// changed clean-install defaults must not silently publish over an existing site.
const previousSeedChecksums: Readonly<Partial<Record<EntityId, readonly string[]>>> = {
  'home.careers.open-positions': [
    '51fc0d0cf2f42913e89f71c889619695c75be1e79a4f46a2d82a34a81a43e226',
  ],
  'property-management.hero': ['065b76688c2cb7b8e0d2634769900f24bee93e02477248e1076c9d7b312ea963'],
  'property-management.portfolio.hoas.items': [
    '1313c2435895dc7967e091b86f9457147704515916f7adfd7f44b606cd54b4a2',
  ],
  'property-management.team.members': [
    '1d4bdd25c3fcdef2a8164fec0ee5688e7d4776ab1ca704823c799d6218b14e39',
  ],
  'property-management.reviews.platforms': [
    '7b059921fc2064869a19cdc7145c56ba294fb7682ba956cd9c1942daf0995f99',
  ],
  'property-management.footer.social': [
    '727d19c589dd5882d9dcf7712676d518b1e72e8ff599c291b04640233af0b345',
  ],
  'real-estate.reviews.platforms': [
    'f3791e6fb4249b1e67ffbe3f2675ca53e043157ac91b8fb54e3c75d864979ed2',
  ],
  'construction.current-projects.header': [
    'eeb60f87a85180341f2f0557e7a127cc693a5a1e1471411d6359df77d3284e43',
  ],
  'construction.completed-projects.header': [
    '7a922a5793183c1db680479d14dfef56c016e24a4775a5c07d36a6443aa8b401',
  ],
  'construction.plan-room.header': [
    'f31df0d6876e72139d945ee6bd9128fbd1b21adefe24e3e35e236a2647bd3abe',
  ],
  'construction.plan-room.access-notice': [
    'aa2bfe46144bf926c6656df9c140cad2d10a5d480826f4f8b3ea36c666d9547e',
  ],
  'construction.plan-room.request-access': [
    'b7497c59332d098700e195dc5729f47104d1e3274cd8705fe211ee5e4a046f09',
  ],
  'construction.reviews.platforms': [
    'a2ffc40799d3fe568110ae8bd6ce081e9218be2b925eb6d6f57fef2e1ea8590e',
  ],
  'storage.team.members': ['9b3cba95a14f24cdfcafdcb84e0d08a3d5775f61cd7715b33d4a5f588d0da4e9'],
  'storage.reviews.platforms': ['f1fbf465fc46e5ce7e4af171737a8a47f0dfa480ab3ef3c44868cb894aa36a32'],
  'development.partners.items': [
    '98b9b5d7d3b7119994f4618f50d209b314a70f3da484f5a953a5a87e5880eade',
  ],
  'development.reviews.platforms': [
    'ece4d4624fb88f5c1729471c473c02c55b03316168b363277881b609f208b9eb',
  ],
};
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

export async function seedEntities(
  database: DynamoDBDocumentClient,
  tableName: string,
): Promise<void> {
  const entries = Object.entries(registrySeedData) as [
    EntityId,
    (typeof registrySeedData)[EntityId],
  ][];
  for (const [id, value] of entries) {
    const existing = await database.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `ENTITY#${id}`, sk: 'CURRENT' },
        ConsistentRead: true,
      }),
    );
    const definition = requireEntityDefinition(id);
    const expectedSeedChecksum = checksum(value);
    if (existing.Item !== undefined) {
      const existingEntity = entitySchema.safeParse({
        id: existing.Item['id'],
        pageId: existing.Item['pageId'],
        version: existing.Item['version'],
        value: existing.Item['value'],
        updatedAt: existing.Item['updatedAt'],
      });
      const isPristineBaseline =
        existingEntity.success &&
        existingEntity.data.version === 1 &&
        existingEntity.data.updatedAt === initialSeedTimestamp;
      const existingValueChecksum = existingEntity.success
        ? checksum(existingEntity.data.value)
        : undefined;
      const matchesPristineBaseline =
        (existingValueChecksum === expectedSeedChecksum &&
          (existing.Item['seedChecksum'] === undefined ||
            existing.Item['seedChecksum'] === expectedSeedChecksum)) ||
        (existingValueChecksum !== undefined &&
          previousSeedChecksums[id]?.includes(existingValueChecksum) === true &&
          existing.Item['seedChecksum'] === existingValueChecksum);
      const isSafeExistingEntity =
        existing.Item['pk'] === `ENTITY#${id}` &&
        existing.Item['sk'] === 'CURRENT' &&
        existing.Item['id'] === id &&
        existingEntity.success &&
        existingEntity.data.id === id &&
        existingEntity.data.pageId === definition.pageId &&
        definition.schema.safeParse(existingEntity.data.value).success &&
        (!isPristineBaseline || matchesPristineBaseline);
      if (!isSafeExistingEntity)
        throw new Error(`Unsafe existing CURRENT entity row for ${id}; refusing to seed`);
      continue;
    }
    await database.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `ENTITY#${id}`,
          sk: 'CURRENT',
          id,
          pageId: definition.pageId,
          version: 1,
          value,
          updatedAt: initialSeedTimestamp,
          seedChecksum: expectedSeedChecksum,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
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
    await ensureBucket(objects, environment.resumeBucket);
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
