import { Router, type RequestHandler } from 'express';

import {
  createCareerApplicationController,
  createCareerUploadController,
} from '../../controllers/career-application.js';
import { createOriginGuard } from '../../middleware/session.js';
import type { CareerApplicationService } from '../../services/career-application.js';

export function createCareerApplicationRoute(
  service: CareerApplicationService,
  publicOrigin: string,
  submissionRateLimit: RequestHandler,
): Router {
  const router = Router();
  router.post(
    '/applications/uploads',
    createOriginGuard(publicOrigin),
    submissionRateLimit,
    createCareerUploadController(service),
  );
  router.post(
    '/applications',
    createOriginGuard(publicOrigin),
    submissionRateLimit,
    createCareerApplicationController(service),
  );
  return router;
}
