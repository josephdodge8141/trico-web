import { createHash, randomUUID } from 'node:crypto';

import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import {
  BatchGetCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import {
  contentManifestSchema,
  entitySchema,
  pageIdSchema,
  pendingChangeSchema,
  publicationSchema,
  publishOperationSchema,
  registrySeedData,
  requireEntityDefinition,
  type ContentManifest,
  type EditableValue,
  type Entity,
  type EntityId,
  type PageContent,
  type PageId,
  type PendingChange,
  type Publication,
  type PublishOperation,
} from '@app/schemas';

import { ServiceError } from './errors.js';

const SNAPSHOT_SIZE_CEILING = 350 * 1024;
const TRANSACTION_ACTION_LIMIT = 100;

export interface PublishSelection {
  readonly entityId: EntityId;
  readonly expectedRevision: number;
}

export interface ContentService {
  page(pageId: PageId): Promise<PageContent>;
  preview(pageId: PageId, userId: string): Promise<PageContent>;
  pending(pageId?: PageId): Promise<readonly PendingChange[]>;
  createChange(
    entityId: EntityId,
    userId: string,
    replacementValue: EditableValue,
  ): Promise<PendingChange>;
  updateChange(
    entityId: EntityId,
    userId: string,
    expectedRevision: number,
    replacementValue: EditableValue,
  ): Promise<PendingChange>;
  discardChange(entityId: EntityId, userId: string, expectedRevision: number): Promise<void>;
  setPreviewDisabled(userId: string, disabledEntityIds: readonly EntityId[]): Promise<void>;
  togglePreview(userId: string, entityId: EntityId, disabled: boolean): Promise<void>;
  publish(
    selections: readonly PublishSelection[],
    userId: string,
    source?: 'MANUAL' | 'AUTO_SYNC',
  ): Promise<{ operationId: string; publicationIds: readonly string[] }>;
  history(pageId: PageId): Promise<readonly Publication[]>;
  rollback(
    publicationId: string,
    userId: string,
  ): Promise<{ operationId: string; publicationIds: readonly string[] }>;
  deploymentState(): Promise<{ blocked: boolean; failedOperation: PublishOperation | null }>;
  retry(operationId: string): Promise<void>;
}

const isoNow = (): string => new Date().toISOString();
const projectFields = (value: unknown, fields: readonly string[]): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    fields.flatMap((field) => (field in record ? [[field, record[field]]] : [])),
  );
};
const asEntity = (value: unknown): Entity =>
  entitySchema.parse(projectFields(value, ['id', 'pageId', 'version', 'value', 'updatedAt']));
const asPending = (value: unknown): PendingChange =>
  pendingChangeSchema.parse(
    projectFields(value, [
      'entityId',
      'pageId',
      'authorId',
      'baseEntityVersion',
      'revision',
      'beforeValue',
      'replacementValue',
      'createdAt',
      'updatedAt',
    ]),
  );
const asPublication = (value: unknown): Publication =>
  publicationSchema.parse(
    projectFields(value, [
      'id',
      'pageId',
      'authors',
      'publishedBy',
      'publishedAt',
      'source',
      'snapshot',
    ]),
  );
const asOperation = (value: unknown): PublishOperation =>
  publishOperationSchema.parse(
    projectFields(value, [
      'id',
      'publicationIds',
      'affectedPageIds',
      'requestedBy',
      'status',
      'createdAt',
      'completedAt',
      'failureMessage',
    ]),
  );
const seedFor = (entityId: EntityId): EditableValue => {
  const value = registrySeedData[entityId];
  if (value === undefined) throw new Error(`Missing seed for ${entityId}`);
  return value;
};

const bodyText = async (
  body: { transformToString(): Promise<string> } | undefined,
): Promise<string | undefined> => (body === undefined ? undefined : body.transformToString());

const etagFor = (body: string): string => `"${createHash('sha256').update(body).digest('hex')}"`;

export function estimatePublishActions(
  selectionCount: number,
  pageCount: number,
  sourceDeletes = 0,
): number {
  return selectionCount * 2 + sourceDeletes + pageCount + 2;
}

export function assertPublicationFits(snapshot: Readonly<Publication['snapshot']>): void {
  if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > SNAPSHOT_SIZE_CEILING) {
    throw new ServiceError(
      'PAGE_SNAPSHOT_TOO_LARGE',
      'The page must be split before it can be published',
    );
  }
}

export function createContentService(
  database: DynamoDBDocumentClient,
  objects: S3Client,
  tableName: string,
  bucketName: string,
): ContentService {
  const entityIdsForPage = (pageId: PageId): readonly EntityId[] =>
    Object.keys(registrySeedData).filter(
      (id) => requireEntityDefinition(id).pageId === pageId,
    ) as EntityId[];

  const loadEntity = async (entityId: EntityId): Promise<Entity> => {
    const result = await database.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `ENTITY#${entityId}`, sk: 'CURRENT' },
        ConsistentRead: true,
      }),
    );
    if (result.Item !== undefined) return asEntity(result.Item);
    const definition = requireEntityDefinition(entityId);
    return {
      id: entityId,
      pageId: definition.pageId,
      version: 1,
      value: seedFor(entityId),
      updatedAt: new Date(0).toISOString(),
    };
  };

  const loadEntities = async (pageId: PageId): Promise<readonly Entity[]> => {
    const ids = entityIdsForPage(pageId);
    const response = await database.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: ids.map((id) => ({ pk: `ENTITY#${id}`, sk: 'CURRENT' })),
            ConsistentRead: true,
          },
        },
      }),
    );
    const records = new Map(
      (response.Responses?.[tableName] ?? []).map((record) => {
        const entity = asEntity(record);
        return [entity.id, entity] as const;
      }),
    );
    return ids.map(
      (id) =>
        records.get(id) ?? {
          id,
          pageId,
          version: 1,
          value: seedFor(id),
          updatedAt: new Date(0).toISOString(),
        },
    );
  };

  const loadPendingChanges = async (pageId: PageId): Promise<readonly PendingChange[]> => {
    const response = await database.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: entityIdsForPage(pageId).map((id) => ({
              pk: `CHANGE#${id}`,
              sk: 'PENDING',
            })),
            ConsistentRead: true,
          },
        },
      }),
    );
    return (response.Responses?.[tableName] ?? []).map(asPending);
  };

  const assemble = (
    _pageId: PageId,
    entities: readonly Entity[],
    replacements: ReadonlyMap<EntityId, EditableValue> = new Map(),
  ): PageContent =>
    Object.fromEntries(
      entities.map((entity) => [entity.id, replacements.get(entity.id) ?? entity.value]),
    );

  const currentPending = async (entityId: EntityId): Promise<PendingChange | undefined> => {
    const response = await database.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `CHANGE#${entityId}`, sk: 'PENDING' },
        ConsistentRead: true,
      }),
    );
    return response.Item === undefined ? undefined : asPending(response.Item);
  };

  const removedSourceRecords = async (
    changes: readonly PendingChange[],
  ): Promise<readonly Record<string, unknown>[]> => {
    const records = await Promise.all(
      changes.map(async (change) => {
        if (!Array.isArray(change.beforeValue) || !Array.isArray(change.replacementValue))
          return [];
        const retained = new Set(
          change.replacementValue.flatMap((item) =>
            typeof item === 'object' && item !== null && typeof item['id'] === 'string'
              ? [item['id']]
              : [],
          ),
        );
        const removed = new Set(
          change.beforeValue.flatMap((item) =>
            typeof item === 'object' &&
            item !== null &&
            typeof item['id'] === 'string' &&
            !retained.has(item['id'])
              ? [item['id']]
              : [],
          ),
        );
        if (removed.size === 0) return [];
        const sources = await database.send(
          new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: {
              ':pk': `SOURCE#${change.entityId}`,
              ':prefix': 'ITEM#',
            },
          }),
        );
        return (sources.Items ?? []).filter((source) => removed.has(String(source['itemId'])));
      }),
    );
    return records.flat();
  };

  const deploy = async (operation: PublishOperation): Promise<void> => {
    const priorResult = await objects
      .send(new GetObjectCommand({ Bucket: bucketName, Key: 'content/manifest.json' }))
      .catch(() => undefined);
    const priorText = priorResult === undefined ? undefined : await bodyText(priorResult.Body);
    const prior =
      priorText === undefined ? undefined : contentManifestSchema.safeParse(JSON.parse(priorText));
    const pages: Partial<Record<PageId, { url: string; etag: string }>> = prior?.success
      ? { ...prior.data.pages }
      : {};
    for (const pageId of operation.affectedPageIds) {
      const content = await service.page(pageId);
      const serialized = JSON.stringify(content);
      const key = `content/releases/${operation.id}/${pageId}.json`;
      await objects.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: serialized,
          ContentType: 'application/json',
          CacheControl: 'public,max-age=31536000,immutable',
        }),
      );
      pages[pageId] = { url: `/${key}`, etag: etagFor(serialized) };
    }
    for (const pageId of pageIdSchema.options) {
      pages[pageId] ??= {
        url: `/content/releases/${operation.id}/${pageId}.json`,
        etag: etagFor(JSON.stringify(await service.page(pageId))),
      };
    }
    const manifest: ContentManifest = contentManifestSchema.parse({
      version: (prior?.success ? prior.data.version : 0) + 1,
      currentOperationId: operation.id,
      pages,
    });
    await objects.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: 'content/manifest.json',
        Body: JSON.stringify(manifest),
        ContentType: 'application/json',
        CacheControl: 'no-cache',
      }),
    );
    await database.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: `OPERATION#${operation.id}`, sk: 'META' },
        UpdateExpression: 'SET #status = :live, completedAt = :completed REMOVE failureMessage',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':live': 'LIVE', ':completed': isoNow() },
      }),
    );
    await database.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: 'SITE', sk: 'STATE' },
        UpdateExpression:
          'SET liveOperationId = :operation REMOVE deployingOperationId, blockedOperationId',
        ExpressionAttributeValues: { ':operation': operation.id },
      }),
    );
  };

  const service: ContentService = {
    page: async (pageId) => assemble(pageId, await loadEntities(pageId)),
    preview: async (pageId, userId) => {
      const [entities, changes, preference] = await Promise.all([
        loadEntities(pageId),
        loadPendingChanges(pageId),
        database.send(
          new GetCommand({
            TableName: tableName,
            Key: { pk: `PREF#${userId}`, sk: 'PREVIEW' },
            ConsistentRead: true,
          }),
        ),
      ]);
      const disabled = new Set(
        Array.isArray(preference.Item?.['disabledEntityIds'])
          ? (preference.Item?.['disabledEntityIds'] as EntityId[])
          : [],
      );
      return assemble(
        pageId,
        entities,
        new Map(
          changes
            .filter((change) => !disabled.has(change.entityId))
            .map((change) => [change.entityId, change.replacementValue]),
        ),
      );
    },
    pending: async (pageId) => {
      if (pageId === undefined) {
        const changes = await Promise.all(pageIdSchema.options.map((id) => service.pending(id)));
        return changes.flat();
      }
      const response = await database.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: 'gsi1',
          KeyConditionExpression: 'gsi1pk = :page',
          ExpressionAttributeValues: { ':page': `PAGE#${pageId}` },
        }),
      );
      return (response.Items ?? []).map(asPending);
    },
    createChange: async (entityId, userId, replacementValue) => {
      const definition = requireEntityDefinition(entityId);
      const parsedValue = definition.schema.parse(replacementValue) as EditableValue;
      const entity = await loadEntity(entityId);
      const now = isoNow();
      const change = pendingChangeSchema.parse({
        entityId,
        pageId: definition.pageId,
        authorId: userId,
        baseEntityVersion: entity.version,
        revision: 1,
        beforeValue: entity.value,
        replacementValue: parsedValue,
        createdAt: now,
        updatedAt: now,
      });
      try {
        await database.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              pk: `CHANGE#${entityId}`,
              sk: 'PENDING',
              ...change,
              gsi1pk: `PAGE#${definition.pageId}`,
              gsi1sk: `CHANGE#${entityId}`,
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          }),
        );
      } catch {
        throw new ServiceError('PENDING_CHANGE_EXISTS', 'This entity already has a pending change');
      }
      return change;
    },
    updateChange: async (entityId, userId, expectedRevision, replacementValue) => {
      const definition = requireEntityDefinition(entityId);
      const parsedValue = definition.schema.parse(replacementValue) as EditableValue;
      const current = await currentPending(entityId);
      if (
        current === undefined ||
        current.authorId !== userId ||
        current.revision !== expectedRevision
      ) {
        throw new ServiceError(
          'PENDING_CHANGE_CONFLICT',
          'The pending change is missing, stale, or owned by another editor',
        );
      }
      const next = pendingChangeSchema.parse({
        ...current,
        replacementValue: parsedValue,
        revision: expectedRevision + 1,
        updatedAt: isoNow(),
      });
      try {
        await database.send(
          new PutCommand({
            TableName: tableName,
            Item: {
              pk: `CHANGE#${entityId}`,
              sk: 'PENDING',
              ...next,
              gsi1pk: `PAGE#${definition.pageId}`,
              gsi1sk: `CHANGE#${entityId}`,
            },
            ConditionExpression: 'authorId = :author AND revision = :revision',
            ExpressionAttributeValues: { ':author': userId, ':revision': expectedRevision },
          }),
        );
      } catch {
        throw new ServiceError(
          'PENDING_CHANGE_CONFLICT',
          'The pending change changed before this save',
        );
      }
      return next;
    },
    discardChange: async (entityId, userId, expectedRevision) => {
      try {
        await database.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { pk: `CHANGE#${entityId}`, sk: 'PENDING' },
            ConditionExpression: 'authorId = :author AND revision = :revision',
            ExpressionAttributeValues: { ':author': userId, ':revision': expectedRevision },
          }),
        );
      } catch {
        throw new ServiceError(
          'PENDING_CHANGE_CONFLICT',
          'The pending change is missing, stale, or owned by another editor',
        );
      }
    },
    setPreviewDisabled: async (userId, disabledEntityIds) => {
      await database.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: `PREF#${userId}`,
            sk: 'PREVIEW',
            userId,
            disabledEntityIds,
            updatedAt: isoNow(),
          },
        }),
      );
    },
    togglePreview: async (userId, entityId, disabled) => {
      const preference = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: `PREF#${userId}`, sk: 'PREVIEW' },
          ConsistentRead: true,
        }),
      );
      const current = new Set(
        Array.isArray(preference.Item?.['disabledEntityIds'])
          ? (preference.Item?.['disabledEntityIds'] as EntityId[])
          : [],
      );
      if (disabled) current.add(entityId);
      else current.delete(entityId);
      await service.setPreviewDisabled(userId, [...current]);
    },
    publish: async (selections, userId, source = 'MANUAL') => {
      const selected = await Promise.all(
        selections.map(async (selection) => {
          const change = await currentPending(selection.entityId);
          if (change === undefined || change.revision !== selection.expectedRevision)
            throw new ServiceError('PUBLISH_SELECTION_STALE', 'A selected change is stale');
          return change;
        }),
      );
      const pageIds = [...new Set(selected.map((change) => change.pageId))];
      const removedSources = await removedSourceRecords(selected);
      const actionCount = estimatePublishActions(
        selected.length,
        pageIds.length,
        removedSources.length,
      );
      if (actionCount > TRANSACTION_ACTION_LIMIT)
        throw new ServiceError(
          'PUBLISH_SELECTION_TOO_LARGE',
          'Publish fewer changes and publish the remainder separately',
        );
      const publicationIds = pageIds.map(() => randomUUID());
      const operationId = randomUUID();
      const createdAt = isoNow();
      const publications = await Promise.all(
        pageIds.map(async (pageId, index) => {
          const current = await loadEntities(pageId);
          const selectedForPage = new Map(
            selected
              .filter((change) => change.pageId === pageId)
              .map((change) => [change.entityId, change]),
          );
          const snapshot = current.map((entity) => ({
            entityId: entity.id,
            entityVersion: entity.version + (selectedForPage.has(entity.id) ? 1 : 0),
            value: selectedForPage.get(entity.id)?.replacementValue ?? entity.value,
          }));
          assertPublicationFits(snapshot);
          return publicationSchema.parse({
            id: publicationIds[index],
            pageId,
            authors: [
              ...new Set(
                selected
                  .filter((change) => change.pageId === pageId)
                  .map((change) => change.authorId),
              ),
            ],
            publishedBy: source === 'AUTO_SYNC' ? 'system' : userId,
            publishedAt: createdAt,
            source,
            snapshot,
          });
        }),
      );
      const operation = publishOperationSchema.parse({
        id: operationId,
        publicationIds,
        affectedPageIds: pageIds,
        requestedBy: userId,
        status: 'DEPLOYING',
        createdAt,
      });
      const transactItems = [
        ...selected.flatMap((change) => [
          {
            Put: {
              TableName: tableName,
              Item: {
                pk: `ENTITY#${change.entityId}`,
                sk: 'CURRENT',
                id: change.entityId,
                pageId: change.pageId,
                version: change.baseEntityVersion + 1,
                value: change.replacementValue,
                updatedAt: createdAt,
              },
              ConditionExpression: 'attribute_not_exists(version) OR version = :version',
              ExpressionAttributeValues: { ':version': change.baseEntityVersion },
            },
          },
          {
            Delete: {
              TableName: tableName,
              Key: { pk: `CHANGE#${change.entityId}`, sk: 'PENDING' },
              ConditionExpression: 'revision = :revision',
              ExpressionAttributeValues: { ':revision': change.revision },
            },
          },
        ]),
        ...removedSources.map((source) => ({
          Delete: {
            TableName: tableName,
            Key: { pk: source['pk'], sk: source['sk'] },
            ConditionExpression: 'id = :id',
            ExpressionAttributeValues: { ':id': source['id'] },
          },
        })),
        ...publications.map((publication) => ({
          Put: {
            TableName: tableName,
            Item: {
              pk: `PUBLICATION#${publication.pageId}`,
              sk: `PUB#${publication.publishedAt}#${publication.id}`,
              ...publication,
              gsi1pk: `PUBLICATION#${publication.id}`,
              gsi1sk: 'META',
            },
          },
        })),
        {
          Put: {
            TableName: tableName,
            Item: { pk: `OPERATION#${operation.id}`, sk: 'META', ...operation },
          },
        },
        {
          Update: {
            TableName: tableName,
            Key: { pk: 'SITE', sk: 'STATE' },
            UpdateExpression: 'SET deployingOperationId = :operation',
            ConditionExpression: 'attribute_not_exists(blockedOperationId)',
            ExpressionAttributeValues: { ':operation': operation.id },
          },
        },
      ];
      try {
        await database.send(new TransactWriteCommand({ TransactItems: transactItems }));
      } catch {
        throw new ServiceError(
          'PUBLISH_SELECTION_STALE',
          'The publish selection changed before commit',
        );
      }
      try {
        await deploy(operation);
      } catch (error: unknown) {
        await database.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: `OPERATION#${operation.id}`, sk: 'META' },
            UpdateExpression: 'SET #status = :failed, failureMessage = :message',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':failed': 'DEPLOY_FAILED',
              ':message': error instanceof Error ? error.message : 'Unknown deployment error',
            },
          }),
        );
        await database.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: 'SITE', sk: 'STATE' },
            UpdateExpression: 'SET blockedOperationId = :operation REMOVE deployingOperationId',
            ExpressionAttributeValues: { ':operation': operation.id },
          }),
        );
        throw new ServiceError(
          'DEPLOYMENT_FAILED',
          'Publication committed but public deployment failed',
        );
      }
      return { operationId, publicationIds };
    },
    history: async (pageId) => {
      const result = await database.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': `PUBLICATION#${pageId}`, ':prefix': 'PUB#' },
          ScanIndexForward: false,
        }),
      );
      return (result.Items ?? []).map(asPublication);
    },
    rollback: async (publicationId, userId) => {
      const lookup = await database.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: 'gsi1',
          KeyConditionExpression: 'gsi1pk = :publication',
          ExpressionAttributeValues: { ':publication': `PUBLICATION#${publicationId}` },
          Limit: 1,
        }),
      );
      const historical = asPublication(lookup.Items?.[0]);
      const [current, changes] = await Promise.all([
        loadEntities(historical.pageId),
        service.pending(historical.pageId),
      ]);
      const byId = new Map(historical.snapshot.map((entry) => [entry.entityId, entry]));
      const operationId = randomUUID();
      const nextPublicationId = randomUUID();
      const createdAt = isoNow();
      const snapshot = current.map((entity) => ({
        entityId: entity.id,
        entityVersion: entity.version + 1,
        value: byId.get(entity.id)?.value ?? entity.value,
      }));
      assertPublicationFits(snapshot);
      const publication = publicationSchema.parse({
        id: nextPublicationId,
        pageId: historical.pageId,
        authors: [userId],
        publishedBy: userId,
        publishedAt: createdAt,
        source: 'ROLLBACK',
        snapshot,
      });
      const operation = publishOperationSchema.parse({
        id: operationId,
        publicationIds: [nextPublicationId],
        affectedPageIds: [historical.pageId],
        requestedBy: userId,
        status: 'DEPLOYING',
        createdAt,
      });
      const actionCount = current.length + changes.length + 3;
      if (actionCount > TRANSACTION_ACTION_LIMIT)
        throw new ServiceError(
          'PUBLISH_SELECTION_TOO_LARGE',
          'Rollback has too much pending work to fit one atomic transaction',
        );
      await database.send(
        new TransactWriteCommand({
          TransactItems: [
            ...current.map((entity) => ({
              Put: {
                TableName: tableName,
                Item: {
                  pk: `ENTITY#${entity.id}`,
                  sk: 'CURRENT',
                  id: entity.id,
                  pageId: entity.pageId,
                  version: entity.version + 1,
                  value: byId.get(entity.id)?.value ?? entity.value,
                  updatedAt: createdAt,
                },
                ConditionExpression: 'attribute_not_exists(version) OR version = :version',
                ExpressionAttributeValues: { ':version': entity.version },
              },
            })),
            ...changes.map((change) => ({
              Update: {
                TableName: tableName,
                Key: { pk: `CHANGE#${change.entityId}`, sk: 'PENDING' },
                UpdateExpression: 'SET baseEntityVersion = :version, beforeValue = :before',
                ConditionExpression: 'revision = :revision',
                ExpressionAttributeValues: {
                  ':version':
                    (current.find((entity) => entity.id === change.entityId)?.version ??
                      change.baseEntityVersion) + 1,
                  ':before': byId.get(change.entityId)?.value ?? change.beforeValue,
                  ':revision': change.revision,
                },
              },
            })),
            {
              Put: {
                TableName: tableName,
                Item: {
                  pk: `PUBLICATION#${publication.pageId}`,
                  sk: `PUB#${createdAt}#${publication.id}`,
                  ...publication,
                  gsi1pk: `PUBLICATION#${publication.id}`,
                  gsi1sk: 'META',
                },
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: { pk: `OPERATION#${operation.id}`, sk: 'META', ...operation },
              },
            },
            {
              Update: {
                TableName: tableName,
                Key: { pk: 'SITE', sk: 'STATE' },
                UpdateExpression: 'SET deployingOperationId = :operation',
                ConditionExpression: 'attribute_not_exists(blockedOperationId)',
                ExpressionAttributeValues: { ':operation': operation.id },
              },
            },
          ],
        }),
      );
      try {
        await deploy(operation);
      } catch (error: unknown) {
        await database.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: `OPERATION#${operation.id}`, sk: 'META' },
            UpdateExpression: 'SET #status = :failed, failureMessage = :message',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':failed': 'DEPLOY_FAILED',
              ':message': error instanceof Error ? error.message : 'Unknown deployment error',
            },
          }),
        );
        await database.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: 'SITE', sk: 'STATE' },
            UpdateExpression: 'SET blockedOperationId = :operation REMOVE deployingOperationId',
            ExpressionAttributeValues: { ':operation': operation.id },
          }),
        );
        throw new ServiceError(
          'DEPLOYMENT_FAILED',
          'Rollback committed but public deployment failed',
        );
      }
      return { operationId, publicationIds: [nextPublicationId] };
    },
    deploymentState: async () => {
      const state = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: 'SITE', sk: 'STATE' },
          ConsistentRead: true,
        }),
      );
      const blockedId = state.Item?.['blockedOperationId'];
      if (typeof blockedId !== 'string') return { blocked: false, failedOperation: null };
      const operation = await database.send(
        new GetCommand({ TableName: tableName, Key: { pk: `OPERATION#${blockedId}`, sk: 'META' } }),
      );
      return {
        blocked: true,
        failedOperation: operation.Item === undefined ? null : asOperation(operation.Item),
      };
    },
    retry: async (operationId) => {
      const result = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: `OPERATION#${operationId}`, sk: 'META' },
          ConsistentRead: true,
        }),
      );
      const operation = asOperation(result.Item);
      if (operation.status !== 'DEPLOY_FAILED')
        throw new ServiceError(
          'OPERATION_NOT_RETRYABLE',
          'Only a failed deployment can be retried',
        );
      await deploy({ ...operation, status: 'DEPLOYING' });
    },
  };
  return service;
}
