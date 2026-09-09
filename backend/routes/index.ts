import { Router } from 'express';

import { createV1Router } from './v1/index.js';
import type { Environment } from '../config/environment.js';
import type { HealthService } from '../services/health.js';
import type { AuthService } from '../services/auth.js';
import type { ContentService } from '../services/content.js';
import type { MediaService } from '../services/media.js';
import type { ExternalSourceService } from '../services/external-sources.js';

export function createApiRouter(
  healthService: HealthService,
  authService: AuthService,
  contentService: ContentService,
  mediaService: MediaService,
  externalSourceService: ExternalSourceService,
  environment: Environment,
): Router {
  const router = Router();
  router.use(
    '/v1',
    createV1Router(
      healthService,
      authService,
      contentService,
      mediaService,
      externalSourceService,
      environment,
    ),
  );
  return router;
}
