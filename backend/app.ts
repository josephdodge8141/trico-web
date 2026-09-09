import express, { type Express } from 'express';
import helmet from 'helmet';

import type { Connections } from './config/connections.js';
import { loadEnvironment, type Environment } from './config/environment.js';
import { createAuthenticationMiddleware } from './middleware/session.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/errors.js';
import { createApiRouter } from './routes/index.js';
import { createHealthService } from './services/health.js';
import { createAuthService } from './services/auth.js';
import { createContentService } from './services/content.js';
import { createMediaService } from './services/media.js';
import { createExternalSourceService } from './services/external-sources.js';

export interface AppDependencies {
  readonly connections: Connections;
  readonly environment?: Environment;
}

export function createApp(dependencies: AppDependencies): Express {
  const environment = dependencies.environment ?? loadEnvironment();
  const app = express();
  const healthService = createHealthService(dependencies.connections.health);
  const authService = createAuthService(
    dependencies.connections.dynamo,
    environment.dynamoTable,
    dependencies.connections.mail,
    environment.publicOrigin,
  );
  const contentService = createContentService(
    dependencies.connections.dynamo,
    dependencies.connections.s3,
    environment.dynamoTable,
    environment.s3Bucket,
  );
  const mediaService = createMediaService(dependencies.connections.s3, environment.s3Bucket);
  const externalSourceService = createExternalSourceService(
    dependencies.connections.dynamo,
    environment.dynamoTable,
  );

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json());
  app.use(createAuthenticationMiddleware(authService, environment));
  app.use(
    '/api',
    createApiRouter(
      healthService,
      authService,
      contentService,
      mediaService,
      externalSourceService,
      environment,
    ),
  );
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
