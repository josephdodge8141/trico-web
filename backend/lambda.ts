import { configure as serverlessExpress } from '@codegenie/serverless-express';
import type { APIGatewayProxyEventV2, Context, EventBridgeEvent } from 'aws-lambda';
import { scheduledSyncEventSchema } from '@app/schemas';

import { createApp } from './app.js';
import { createConnections } from './config/connections.js';
import { createAiConnection } from './config/ai.js';
import { loadEnvironment } from './config/environment.js';
import { createContentService } from './services/content.js';
import { createExternalSourceService } from './services/external-sources.js';
import { createExternalSyncService } from './services/external-sync.js';

const environment = loadEnvironment();
const connections = createConnections(environment);
const httpHandler = serverlessExpress({ app: createApp({ connections, environment }) });
const content = createContentService(
  connections.dynamo,
  connections.s3,
  environment.dynamoTable,
  environment.s3Bucket,
);
const sources = createExternalSourceService(connections.dynamo, environment.dynamoTable);
const externalSync = createExternalSyncService(sources, content, createAiConnection(environment));

const isHttpEvent = (event: unknown): event is APIGatewayProxyEventV2 => {
  if (typeof event !== 'object' || event === null) return false;
  return 'requestContext' in event;
};

export async function handler(
  event: APIGatewayProxyEventV2 | EventBridgeEvent<string, unknown>,
  context: Context,
): Promise<unknown> {
  if (isHttpEvent(event)) return httpHandler(event, context, (): void => undefined);
  const direct = scheduledSyncEventSchema.safeParse(event.detail);
  const scheduled = direct.success
    ? direct.data
    : scheduledSyncEventSchema.parse({
        schemaVersion: 1,
        eventType: 'trico.external-sync.requested',
        requestedAt: event.time,
        requestedBy: 'eventbridge',
      });
  return externalSync.run(scheduled);
}
