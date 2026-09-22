import { randomUUID } from 'node:crypto';

import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { externalSourceSchema, type ExternalSource } from '@app/schemas';

import { ServiceError } from './errors.js';

export interface ExternalSourceService {
  list(entityId: string): Promise<readonly ExternalSource[]>;
  create(input: Omit<ExternalSource, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExternalSource>;
  update(
    sourceId: string,
    input: {
      readonly [Key in keyof Omit<ExternalSource, 'id' | 'createdAt' | 'updatedAt'>]?:
        ExternalSource[Key] | undefined;
    },
  ): Promise<ExternalSource>;
  delete(sourceId: string): Promise<void>;
}

export function createExternalSourceService(
  database: DynamoDBDocumentClient,
  tableName: string,
): ExternalSourceService {
  const asSource = (value: unknown): ExternalSource => {
    if (typeof value !== 'object' || value === null) return externalSourceSchema.parse({});
    const record = value as Record<string, unknown>;
    return externalSourceSchema.parse(
      Object.fromEntries(
        [
          'id',
          'entityId',
          'itemId',
          'type',
          'url',
          'validationFields',
          'overriddenFields',
          'enabled',
          'createdAt',
          'updatedAt',
        ].flatMap((field) => (field in record ? [[field, record[field]]] : [])),
      ),
    );
  };
  const find = async (sourceId: string): Promise<ExternalSource | undefined> => {
    const response = await database.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :source',
        ExpressionAttributeValues: { ':source': `SOURCEID#${sourceId}` },
        Limit: 1,
      }),
    );
    return response.Items?.[0] === undefined ? undefined : asSource(response.Items[0]);
  };
  const put = async (
    source: ExternalSource,
    condition?: string,
    expressionAttributeValues?: Readonly<Record<string, unknown>>,
  ): Promise<void> => {
    await database.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `SOURCE#${source.entityId}`,
          sk: `ITEM#${source.itemId}`,
          ...source,
          gsi1pk: `SOURCEID#${source.id}`,
          gsi1sk: 'SOURCE',
        },
        ...(condition === undefined ? {} : { ConditionExpression: condition }),
        ...(expressionAttributeValues === undefined
          ? {}
          : { ExpressionAttributeValues: expressionAttributeValues }),
      }),
    );
  };
  return {
    list: async (entityId) => {
      const response = await database.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': `SOURCE#${entityId}`, ':prefix': 'ITEM#' },
        }),
      );
      return (response.Items ?? []).map(asSource);
    },
    create: async (input) => {
      const now = new Date().toISOString();
      const source = externalSourceSchema.parse({
        ...input,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      });
      try {
        await put(source, 'attribute_not_exists(pk)');
      } catch {
        throw new ServiceError(
          'SOURCE_ALREADY_EXISTS',
          'This list item already has an external source',
        );
      }
      return source;
    },
    update: async (sourceId, input) => {
      const current = await find(sourceId);
      if (current === undefined)
        throw new ServiceError('SOURCE_NOT_FOUND', 'External source was not found');
      if (
        (input.entityId !== undefined && input.entityId !== current.entityId) ||
        (input.itemId !== undefined && input.itemId !== current.itemId)
      ) {
        throw new ServiceError(
          'SOURCE_TARGET_IMMUTABLE',
          'An external source target cannot be changed',
        );
      }
      const updated = externalSourceSchema.parse({
        ...current,
        ...input,
        updatedAt: new Date().toISOString(),
      });
      await put(updated, 'id = :id', { ':id': sourceId });
      return updated;
    },
    delete: async (sourceId) => {
      const current = await find(sourceId);
      if (current === undefined) return;
      await database.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { pk: `SOURCE#${current.entityId}`, sk: `ITEM#${current.itemId}` },
          ConditionExpression: 'id = :id',
          ExpressionAttributeValues: { ':id': sourceId },
        }),
      );
    },
  };
}
