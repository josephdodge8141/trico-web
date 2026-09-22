import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
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
  }): Promise<void>;
}

export interface Connections extends ConnectionLifecycle {
  readonly health: HealthConnection;
  readonly dynamo: DynamoDBDocumentClient;
  readonly s3: S3Client;
  readonly mail: MailConnection;
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
    send: async ({ to, subject, text }): Promise<void> => {
      if (smtp !== undefined) {
        await smtp.sendMail({ from: environment.emailFrom, to, subject, text });
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
            },
          },
        }),
      );
    },
  };

  return {
    health: {
      getHealth: (): unknown => ({ status: 'ok' }),
    },
    dynamo,
    s3,
    mail,
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
