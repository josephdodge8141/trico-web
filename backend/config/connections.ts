import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import nodemailer from 'nodemailer';

import { loadEnvironment, type Environment } from './environment.js';

export interface ConnectionLifecycle {
  close(): Promise<void>;
  /** Abort all retained resources synchronously and idempotently. */
  forceAbort(): void;
}

/**
 * The narrow outbound contract used by the health service. Config owns the
 * concrete connection and the service only knows how to ask it for data.
 */
export interface HealthConnection {
  getHealth(): unknown;
}

export interface MailConnection {
  send(message: {
    readonly to: string;
    readonly subject: string;
    readonly text: string;
    readonly attachment?: {
      readonly fileName: string;
      readonly contentType: string;
      readonly content: Uint8Array;
    };
  }): Promise<void>;
}

export interface ResumeObjectConnection {
  presignPut(key: string, contentType: string, contentLength: number): Promise<string>;
  read(key: string): Promise<{ content: Uint8Array; contentType: string; contentLength: number }>;
  delete(key: string): Promise<void>;
}

export interface Connections extends ConnectionLifecycle {
  readonly health: HealthConnection;
  readonly dynamo: DynamoDBDocumentClient;
  readonly s3: S3Client;
  readonly mail: MailConnection;
  readonly resumeObjects: ResumeObjectConnection;
}

const localCredentials = {
  accessKeyId: 'localaccesskey',
  secretAccessKey: 'localsecretkey',
};

export function createConnections(environment: Environment = loadEnvironment()): Connections {
  const dynamoClient = new DynamoDBClient({
    region: environment.awsRegion,
    ...(environment.dynamoEndpoint === undefined
      ? {}
      : { endpoint: environment.dynamoEndpoint, credentials: localCredentials }),
  });
  const dynamo = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
  const s3 = new S3Client({
    region: environment.awsRegion,
    forcePathStyle: environment.s3ForcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...(environment.s3Endpoint === undefined ? {} : { endpoint: environment.s3Endpoint }),
  });
  const ses =
    environment.mailTransport === 'ses'
      ? new SESv2Client({ region: environment.awsRegion })
      : undefined;
  const smtp =
    environment.mailTransport === 'smtp'
      ? nodemailer.createTransport({
          host: environment.smtpHost,
          port: environment.smtpPort ?? 1025,
          secure: false,
        })
      : undefined;
  const mail: MailConnection = {
    send: async ({ to, subject, text, attachment }): Promise<void> => {
      if (smtp !== undefined) {
        await smtp.sendMail({
          from: environment.emailFrom,
          to,
          subject,
          text,
          ...(attachment === undefined
            ? {}
            : {
                attachments: [
                  {
                    filename: attachment.fileName,
                    contentType: attachment.contentType,
                    content: Buffer.from(attachment.content),
                  },
                ],
              }),
        });
        return;
      }
      if (ses === undefined) throw new Error('Mail transport is not configured');
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: environment.emailFrom,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: subject },
              Body: { Text: { Data: text } },
              ...(attachment === undefined
                ? {}
                : {
                    Attachments: [
                      {
                        FileName: attachment.fileName,
                        ContentType: attachment.contentType,
                        RawContent: attachment.content,
                        ContentDisposition: 'ATTACHMENT' as const,
                      },
                    ],
                  }),
            },
          },
        }),
      );
    },
  };
  const resumeObjects: ResumeObjectConnection = {
    presignPut: async (key, contentType, contentLength): Promise<string> =>
      getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: environment.resumeBucket,
          Key: key,
          ContentType: contentType,
          ContentLength: contentLength,
        }),
        { expiresIn: 5 * 60 },
      ),
    read: async (key) => {
      const head = await s3.send(
        new HeadObjectCommand({ Bucket: environment.resumeBucket, Key: key }),
      );
      if (head.ContentLength === undefined || head.ContentType === undefined)
        throw new Error('Resume object metadata is missing');
      const object = await s3.send(
        new GetObjectCommand({ Bucket: environment.resumeBucket, Key: key }),
      );
      if (object.Body === undefined) throw new Error('Resume object is missing');
      return {
        content: await object.Body.transformToByteArray(),
        contentType: head.ContentType,
        contentLength: head.ContentLength,
      };
    },
    delete: async (key): Promise<void> => {
      await s3.send(new DeleteObjectCommand({ Bucket: environment.resumeBucket, Key: key }));
    },
  };

  return {
    health: {
      getHealth: (): unknown => ({ status: 'ok' }),
    },
    dynamo,
    s3,
    mail,
    resumeObjects,
    close: async (): Promise<void> => {
      smtp?.close();
      dynamoClient.destroy();
      s3.destroy();
      ses?.destroy();
    },
    forceAbort: (): void => {
      smtp?.close();
      dynamoClient.destroy();
      s3.destroy();
      ses?.destroy();
    },
  };
}
