import { isDeepStrictEqual } from 'node:util';

import type { S3Client } from '@aws-sdk/client-s3';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

type Item = Record<string, unknown>;
type Command = {
  readonly input: Record<string, unknown>;
  readonly constructor: { readonly name: string };
};

const keyFor = (key: Record<string, unknown>): string =>
  `${String(key['pk'])}|${String(key['sk'])}`;
const copy = <T>(value: T): T => structuredClone(value);

export class MemoryDynamo {
  readonly items = new Map<string, Item>();

  asClient(): DynamoDBDocumentClient {
    return this as unknown as DynamoDBDocumentClient;
  }

  async send(value: unknown): Promise<Record<string, unknown>> {
    const command = value as Command;
    const input = command.input;
    if (command.constructor.name === 'GetCommand') {
      const item = this.items.get(keyFor(input['Key'] as Item));
      return item === undefined ? {} : { Item: copy(item) };
    }
    if (command.constructor.name === 'PutCommand') {
      this.put(input);
      return {};
    }
    if (command.constructor.name === 'DeleteCommand') {
      this.delete(input);
      return {};
    }
    if (command.constructor.name === 'UpdateCommand') {
      this.update(input);
      return {};
    }
    if (command.constructor.name === 'QueryCommand') return this.query(input);
    if (command.constructor.name === 'BatchGetCommand') {
      const requests = input['RequestItems'] as Record<string, { readonly Keys: readonly Item[] }>;
      const Responses: Record<string, Item[]> = {};
      for (const [table, request] of Object.entries(requests)) {
        Responses[table] = request.Keys.flatMap((key) => {
          const item = this.items.get(keyFor(key));
          return item === undefined ? [] : [copy(item)];
        });
      }
      return { Responses };
    }
    if (command.constructor.name === 'BatchWriteCommand') {
      const requests = input['RequestItems'] as Record<
        string,
        readonly { readonly PutRequest?: { readonly Item: Item } }[]
      >;
      for (const entries of Object.values(requests)) {
        for (const entry of entries)
          if (entry.PutRequest !== undefined) this.store(entry.PutRequest.Item);
      }
      return {};
    }
    if (command.constructor.name === 'TransactWriteCommand') {
      const prior = new Map([...this.items].map(([key, item]) => [key, copy(item)]));
      try {
        for (const entry of input['TransactItems'] as readonly Record<
          string,
          Record<string, unknown>
        >[]) {
          if (entry['Put'] !== undefined) this.put(entry['Put']);
          else if (entry['Delete'] !== undefined) this.delete(entry['Delete']);
          else if (entry['Update'] !== undefined) this.update(entry['Update']);
        }
      } catch (error: unknown) {
        this.items.clear();
        for (const [key, item] of prior) this.items.set(key, item);
        throw error;
      }
      return {};
    }
    throw new Error(`Unsupported memory Dynamo command: ${command.constructor.name}`);
  }

  private store(item: Item): void {
    this.items.set(keyFor(item), copy(item));
  }

  private put(input: Record<string, unknown>): void {
    const item = input['Item'] as Item;
    const existing = this.items.get(keyFor(item));
    this.assertCondition(existing, input);
    this.store(item);
  }

  private delete(input: Record<string, unknown>): void {
    const key = input['Key'] as Item;
    const existing = this.items.get(keyFor(key));
    this.assertCondition(existing, input);
    this.items.delete(keyFor(key));
  }

  private update(input: Record<string, unknown>): void {
    const key = input['Key'] as Item;
    const existing = this.items.get(keyFor(key));
    this.assertCondition(existing, input);
    const next: Item = { ...key, ...(existing ?? {}) };
    const expression = String(input['UpdateExpression']);
    const names = (input['ExpressionAttributeNames'] ?? {}) as Record<string, string>;
    const values = (input['ExpressionAttributeValues'] ?? {}) as Record<string, unknown>;
    const setPart = expression.match(/(?:^|\s)SET\s+(.+?)(?=\s+REMOVE\s+|$)/)?.[1];
    for (const assignment of setPart?.split(',') ?? []) {
      const [rawName, rawValue] = assignment.trim().split(/\s*=\s*/);
      if (rawName === undefined || rawValue === undefined) continue;
      next[names[rawName] ?? rawName] = copy(values[rawValue]);
    }
    const removePart = expression.match(/(?:^|\s)REMOVE\s+(.+)$/)?.[1];
    for (const rawName of removePart?.split(',') ?? [])
      delete next[names[rawName.trim()] ?? rawName.trim()];
    this.store(next);
  }

  private query(input: Record<string, unknown>): Record<string, unknown> {
    const values = input['ExpressionAttributeValues'] as Record<string, unknown>;
    const index = input['IndexName'];
    const pkName = index === 'gsi1' ? 'gsi1pk' : 'pk';
    const pkValue =
      values[':page'] ??
      values[':publication'] ??
      values[':source'] ??
      values[':user'] ??
      values[':pk'];
    let items = [...this.items.values()].filter((item) => item[pkName] === pkValue);
    const prefix = values[':prefix'];
    if (typeof prefix === 'string')
      items = items.filter((item) => String(item['sk']).startsWith(prefix));
    items.sort((left, right) => String(left['sk']).localeCompare(String(right['sk'])));
    if (input['ScanIndexForward'] === false) items.reverse();
    const exclusiveStartKey = input['ExclusiveStartKey'] as Item | undefined;
    if (exclusiveStartKey !== undefined) {
      const cursorIndex = items.findIndex(
        (item) => item['pk'] === exclusiveStartKey['pk'] && item['sk'] === exclusiveStartKey['sk'],
      );
      if (cursorIndex >= 0) items = items.slice(cursorIndex + 1);
    }
    const limit = input['Limit'];
    if (typeof limit !== 'number' || items.length <= limit) return { Items: copy(items) };
    const page = items.slice(0, limit);
    const last = page.at(-1);
    return {
      Items: copy(page),
      ...(last === undefined ? {} : { LastEvaluatedKey: { pk: last['pk'], sk: last['sk'] } }),
    };
  }

  private assertCondition(existing: Item | undefined, input: Record<string, unknown>): void {
    const condition = input['ConditionExpression'];
    if (typeof condition !== 'string') return;
    const values = (input['ExpressionAttributeValues'] ?? {}) as Record<string, unknown>;
    const versionCreateOrMatch = condition.includes(
      'attribute_not_exists(version) OR version = :version',
    );
    const equalityFailed = [
      ...condition.matchAll(
        /\b(id|authorId|revision|version|blockedOperationId|disabledEntityIds)\s*=\s*(:\w+)/g,
      ),
    ].some((match) => {
      if (match[1] === 'version' && versionCreateOrMatch && existing === undefined) return false;
      return !isDeepStrictEqual(existing?.[match[1] ?? ''], values[match[2] ?? '']);
    });
    const fails =
      (condition.includes('attribute_not_exists(pk)') && existing !== undefined) ||
      (condition.includes('attribute_exists(pk)') && existing === undefined) ||
      (condition.includes('attribute_not_exists(blockedOperationId)') &&
        existing?.['blockedOperationId'] !== undefined) ||
      equalityFailed;
    if (fails)
      throw new Error(
        `ConditionalCheckFailedException: ${condition} for ${existing === undefined ? 'missing item' : keyFor(existing)}`,
      );
  }
}

export class MemoryS3 {
  readonly objects = new Map<string, string>();
  readonly writes: string[] = [];
  failKey: string | undefined;
  failKeySuffix: string | undefined;

  asClient(): S3Client {
    return this as unknown as S3Client;
  }

  async send(value: unknown): Promise<Record<string, unknown>> {
    const command = value as Command;
    const key = String(command.input['Key']);
    if (command.constructor.name === 'GetObjectCommand') {
      const body = this.objects.get(key);
      if (body === undefined) throw new Error('NoSuchKey');
      return { Body: { transformToString: async (): Promise<string> => body } };
    }
    if (command.constructor.name === 'PutObjectCommand') {
      if (
        this.failKey === key ||
        (this.failKeySuffix !== undefined && key.endsWith(this.failKeySuffix))
      )
        throw new Error(`Injected S3 failure for ${key}`);
      const body = command.input['Body'];
      this.objects.set(key, typeof body === 'string' ? body : String(body));
      this.writes.push(key);
      return {};
    }
    if (command.constructor.name === 'HeadObjectCommand') {
      const body = this.objects.get(key);
      if (body === undefined) throw new Error('NoSuchKey');
      return { ContentType: 'image/webp', ContentLength: Buffer.byteLength(body) };
    }
    throw new Error(`Unsupported memory S3 command: ${command.constructor.name}`);
  }
}
