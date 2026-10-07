import { createHash } from 'node:crypto';

import { UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { RequestHandler } from 'express';

import { HttpError } from './errors.js';

const WINDOW_SECONDS = 15 * 60;
const limits = {
  '/inquiries': 30,
  '/applications': 10,
  '/applications/uploads': 10,
} as const;

export function createSubmissionRateLimit(
  database: DynamoDBDocumentClient,
  tableName: string,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    const resource =
      request.path === '/applications/uploads'
        ? '/applications/uploads'
        : request.path === '/applications'
          ? '/applications'
          : '/inquiries';
    const now = Math.floor(Date.now() / 1_000);
    const windowStart = Math.floor(now / WINDOW_SECONDS) * WINDOW_SECONDS;
    const address = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const addressHash = createHash('sha256').update(address).digest('hex');
    try {
      await database.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            pk: `PUBLIC_SUBMISSION#${addressHash}`,
            sk: `${resource}#${String(windowStart)}`,
          },
          ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
          UpdateExpression:
            'SET #expiresAt = if_not_exists(#expiresAt, :expiresAt) ADD #count :one',
          ExpressionAttributeNames: {
            '#count': 'count',
            '#expiresAt': 'expiresAt',
          },
          ExpressionAttributeValues: {
            ':one': 1,
            ':limit': limits[resource],
            ':expiresAt': windowStart + 2 * WINDOW_SECONDS,
          },
        }),
      );
      next();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        response.setHeader('Retry-After', String(windowStart + WINDOW_SECONDS - now));
        next(
          new HttpError(
            429,
            'SUBMISSION_RATE_LIMITED',
            'Too many submissions. Please try again later.',
          ),
        );
        return;
      }
      next(new HttpError(503, 'SUBMISSION_LIMIT_UNAVAILABLE', 'Submission is unavailable'));
    }
  };
}
