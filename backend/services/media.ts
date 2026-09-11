import { randomUUID } from 'node:crypto';

import { HeadObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  mediaAssetSchema,
  mediaLibraryResponseSchema,
  type ConfirmMediaUploadRequest,
  type MediaAsset,
  type MediaLibraryResponse,
  type MediaPresignRequest,
  type MediaPresignResponse,
} from '@app/schemas';

import { ServiceError } from './errors.js';

const MEDIA_PARTITION = 'MEDIA#LIBRARY';
const UPLOAD_PARTITION = 'MEDIA#UPLOAD';

const extensionFor = (contentType: MediaPresignRequest['contentType']): string =>
  ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  })[contentType];

export interface MediaService {
  presign(input: MediaPresignRequest, userId: string): Promise<MediaPresignResponse>;
  confirm(input: ConfirmMediaUploadRequest, userId: string): Promise<MediaAsset>;
  list(input: { readonly cursor?: string; readonly limit: number }): Promise<MediaLibraryResponse>;
}

const encodeCursor = (sortKey: string): string =>
  Buffer.from(sortKey, 'utf8').toString('base64url');

const decodeCursor = (cursor: string): string => {
  try {
    const value = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!/^\d{4}-\d{2}-\d{2}T.+#[0-9a-f-]{36}$/i.test(value)) throw new Error('invalid');
    return value;
  } catch {
    throw new ServiceError('MEDIA_CURSOR_INVALID', 'The media page could not be loaded');
  }
};

const asAsset = (value: unknown): MediaAsset => {
  if (typeof value !== 'object' || value === null) return mediaAssetSchema.parse({});
  const record = value as Record<string, unknown>;
  return mediaAssetSchema.parse({
    id: record['id'],
    name: record['name'],
    altText: record['altText'],
    contentType: record['contentType'],
    contentLength: record['contentLength'],
    publicUrl: record['publicUrl'],
    createdAt: record['createdAt'],
  });
};

export function createMediaService(
  objects: S3Client,
  bucket: string,
  database: DynamoDBDocumentClient,
  tableName: string,
): MediaService {
  return {
    presign: async (input, userId) => {
      const uploadId = randomUUID();
      const key = `media/${uploadId}.${extensionFor(input.contentType)}`;
      const expiresIn = 300;
      const expiresAt = new Date(Date.now() + expiresIn * 1_000).toISOString();
      const publicUrl = `/media/${key.slice('media/'.length)}`;
      const uploadUrl = await getSignedUrl(
        objects,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
        { expiresIn },
      );
      await database.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: UPLOAD_PARTITION,
            sk: `UPLOAD#${uploadId}`,
            uploadId,
            userId,
            bucket,
            objectKey: key,
            publicUrl,
            contentType: input.contentType,
            contentLength: input.contentLength,
            expiresAt,
            ttl: Math.floor(Date.now() / 1_000) + expiresIn,
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );
      return {
        uploadUrl,
        uploadId,
        publicUrl,
        expiresAt,
      };
    },
    confirm: async (input, userId) => {
      const reservationResponse = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: UPLOAD_PARTITION, sk: `UPLOAD#${input.uploadId}` },
        }),
      );
      const reservation = reservationResponse.Item;
      const objectKey = reservation?.['objectKey'];
      const expectedType = reservation?.['contentType'];
      const expectedLength = reservation?.['contentLength'];
      const publicUrl = reservation?.['publicUrl'];
      const expiresAt = reservation?.['expiresAt'];
      if (
        reservation?.['uploadId'] !== input.uploadId ||
        reservation['userId'] !== userId ||
        reservation['bucket'] !== bucket ||
        typeof objectKey !== 'string' ||
        typeof expectedType !== 'string' ||
        typeof expectedLength !== 'number' ||
        typeof publicUrl !== 'string' ||
        typeof expiresAt !== 'string' ||
        Date.parse(expiresAt) <= Date.now()
      ) {
        throw new ServiceError(
          'MEDIA_UPLOAD_NOT_FOUND',
          'Request a new image upload and try again',
        );
      }
      let stored;
      try {
        stored = await objects.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      } catch {
        throw new ServiceError(
          'MEDIA_UPLOAD_NOT_FOUND',
          'Finish uploading the image before adding it',
        );
      }
      if (stored.ContentType !== expectedType || stored.ContentLength !== expectedLength) {
        throw new ServiceError(
          'MEDIA_UPLOAD_MISMATCH',
          'The uploaded image does not match the selected file',
        );
      }
      const asset = mediaAssetSchema.parse({
        id: randomUUID(),
        name: input.name,
        altText: input.altText,
        contentType: expectedType,
        contentLength: expectedLength,
        publicUrl,
        createdAt: new Date().toISOString(),
      });
      await database.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: {
                  pk: MEDIA_PARTITION,
                  sk: `${asset.createdAt}#${asset.id}`,
                  ...asset,
                  objectKey,
                },
                ConditionExpression: 'attribute_not_exists(pk)',
              },
            },
            {
              Delete: {
                TableName: tableName,
                Key: { pk: UPLOAD_PARTITION, sk: `UPLOAD#${input.uploadId}` },
                ConditionExpression: 'uploadId = :uploadId AND userId = :userId',
                ExpressionAttributeValues: { ':uploadId': input.uploadId, ':userId': userId },
              },
            },
          ],
        }),
      );
      return asset;
    },
    list: async ({ cursor, limit }) => {
      const response = await database.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': MEDIA_PARTITION },
          Limit: limit,
          ...(cursor === undefined
            ? {}
            : { ExclusiveStartKey: { pk: MEDIA_PARTITION, sk: decodeCursor(cursor) } }),
        }),
      );
      const nextSortKey = response.LastEvaluatedKey?.['sk'];
      return mediaLibraryResponseSchema.parse({
        assets: (response.Items ?? []).map(asAsset),
        nextCursor: typeof nextSortKey === 'string' ? encodeCursor(nextSortKey) : null,
      });
    },
  };
}
