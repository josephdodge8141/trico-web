import { Router } from 'express';

import { createHealthRoute } from './health.js';
import { createAuthRoute } from './auth.js';
import { createContentRoute } from './content.js';
import { createMediaRoute } from './media.js';
import { createExternalSourceRoute } from './external-sources.js';
import type { Environment } from '../../config/environment.js';
import type { AuthService } from '../../services/auth.js';
import type { ContentService } from '../../services/content.js';
import type { HealthService } from '../../services/health.js';
import type { MediaService } from '../../services/media.js';
import type { ExternalSourceService } from '../../services/external-sources.js';

export function createV1Router(
  healthService: HealthService,
  authService: AuthService,
  contentService: ContentService,
  mediaService: MediaService,
  externalSourceService: ExternalSourceService,
  environment: Environment,
): Router {
  const router = Router();
  router.use(createHealthRoute(healthService));
  router.use(createAuthRoute(authService, environment));
  router.use(createContentRoute(contentService, environment.publicOrigin));
  router.use(createMediaRoute(mediaService, environment.publicOrigin));
  router.use(createExternalSourceRoute(externalSourceService, environment.publicOrigin));
  return router;
}
