import { randomUUID } from 'node:crypto';

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type {
  CareerApplicationRequest,
  CareerApplicationUploadRequest,
  CareerApplicationUploadResponse,
} from '@app/schemas';

import type { MailConnection, ResumeObjectConnection } from '../config/connections.js';
import { ServiceError } from './errors.js';

export interface CareerApplicationService {
  presign(input: CareerApplicationUploadRequest): Promise<CareerApplicationUploadResponse>;
  submit(input: CareerApplicationRequest): Promise<void>;
}

interface UploadReservation {
  readonly pk: string;
  readonly sk: 'RESERVATION';
  readonly resumeName: string;
  readonly resumeContentType: string;
  readonly contentLength: number;
  readonly expiresAt: number;
}

const reservationKey = (uploadId: string): { pk: string; sk: 'RESERVATION' } => ({
  pk: `CAREER_UPLOAD#${uploadId}`,
  sk: 'RESERVATION',
});
const objectKey = (uploadId: string): string => `careers/${uploadId}`;

const isResumeFile = (name: string, bytes: Uint8Array): boolean => {
  const prefix = Buffer.from(bytes.subarray(0, 8));
  if (name.toLowerCase().endsWith('.pdf')) return prefix.subarray(0, 5).toString() === '%PDF-';
  if (name.toLowerCase().endsWith('.doc'))
    return prefix.equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  return prefix.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
};

export function createCareerApplicationService(
  mail: MailConnection,
  recipient: string | undefined,
  objects: ResumeObjectConnection,
  database: DynamoDBDocumentClient,
  tableName: string,
): CareerApplicationService {
  const configuredRecipient = (): string => {
    if (recipient === undefined)
      throw new ServiceError('APPLICATION_UNCONFIGURED', 'Application delivery is unavailable');
    return recipient;
  };
  const claim = async (reservation: UploadReservation): Promise<void> => {
    try {
      await database.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { pk: reservation.pk, sk: reservation.sk },
          ConditionExpression: 'attribute_exists(pk) AND expiresAt = :expiresAt',
          ExpressionAttributeValues: { ':expiresAt': reservation.expiresAt },
        }),
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException')
        throw new ServiceError('INVALID_RESUME', 'Resume upload has expired or was already used');
      throw error;
    }
  };
  return {
    presign: async (input): Promise<CareerApplicationUploadResponse> => {
      configuredRecipient();
      const uploadId = randomUUID();
      const expiresAt = Math.floor(Date.now() / 1_000) + 5 * 60;
      const uploadUrl = await objects.presignPut(
        objectKey(uploadId),
        input.resumeContentType,
        input.contentLength,
      );
      await database.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            ...reservationKey(uploadId),
            resumeName: input.resumeName,
            resumeContentType: input.resumeContentType,
            contentLength: input.contentLength,
            expiresAt,
          } satisfies UploadReservation,
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      );
      return { uploadId, uploadUrl, expiresAt: new Date(expiresAt * 1_000).toISOString() };
    },
    submit: async (input): Promise<void> => {
      const mailbox = configuredRecipient();
      const result = await database.send(
        new GetCommand({ TableName: tableName, Key: reservationKey(input.uploadId) }),
      );
      const reservation = result.Item as UploadReservation | undefined;
      if (
        reservation === undefined ||
        reservation.pk !== reservationKey(input.uploadId).pk ||
        reservation.expiresAt <= Math.floor(Date.now() / 1_000)
      ) {
        throw new ServiceError('INVALID_RESUME', 'Resume upload has expired or was already used');
      }
      let resume: Awaited<ReturnType<ResumeObjectConnection['read']>>;
      try {
        resume = await objects.read(objectKey(input.uploadId));
      } catch {
        throw new ServiceError('INVALID_RESUME', 'Resume upload is missing');
      }
      if (
        resume.contentLength !== reservation.contentLength ||
        resume.content.length !== reservation.contentLength ||
        resume.contentType !== reservation.resumeContentType ||
        !isResumeFile(reservation.resumeName, resume.content)
      ) {
        await claim(reservation);
        await objects.delete(objectKey(input.uploadId)).catch(() => undefined);
        throw new ServiceError('INVALID_RESUME', 'Resume file is invalid');
      }
      await claim(reservation);
      const text = [
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        `Division: ${input.division}`,
        ...(input.phone ? [`Phone: ${input.phone}`] : []),
        ...(input.position ? [`Position: ${input.position}`] : []),
        ...(input.message ? [`Message: ${input.message}`] : []),
      ].join('\n');
      try {
        await mail.send({
          to: mailbox,
          subject: 'TriCo career application',
          text,
          attachment: {
            fileName: reservation.resumeName,
            contentType: reservation.resumeContentType,
            content: resume.content,
          },
        });
      } catch {
        throw new ServiceError(
          'APPLICATION_DELIVERY_FAILED',
          'Application delivery failed. Please try again.',
        );
      } finally {
        await objects.delete(objectKey(input.uploadId)).catch(() => undefined);
      }
    },
  };
}
