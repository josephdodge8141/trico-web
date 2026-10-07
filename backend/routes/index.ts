import { Router, type RequestHandler } from 'express';

import { createV1Router } from './v1/index.js';
import type { Environment } from '../config/environment.js';
import type { HealthService } from '../services/health.js';
import type { AuthService } from '../services/auth.js';
import type { ContentService } from '../services/content.js';
import type { MediaService } from '../services/media.js';
import type { ExternalSourceService } from '../services/external-sources.js';
import type { InquiryService } from '../services/inquiry.js';
import type { CareerApplicationService } from '../services/career-application.js';

export function createApiRouter(
  healthService: HealthService,
  authService: AuthService,
  contentService: ContentService,
  mediaService: MediaService,
  externalSourceService: ExternalSourceService,
  inquiryService: InquiryService,
  careerApplicationService: CareerApplicationService,
  submissionRateLimit: RequestHandler,
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
      inquiryService,
      careerApplicationService,
      submissionRateLimit,
      environment,
    ),
  );
  return router;
}
