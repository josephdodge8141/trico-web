import { Router, type RequestHandler } from 'express';

import { createInquiryController } from '../../controllers/inquiry.js';
import { createOriginGuard } from '../../middleware/session.js';
import type { InquiryService } from '../../services/inquiry.js';

export function createInquiryRoute(
  service: InquiryService,
  publicOrigin: string,
  submissionRateLimit: RequestHandler,
): Router {
  const router = Router();
  router.post(
    '/inquiries',
    createOriginGuard(publicOrigin),
    submissionRateLimit,
    createInquiryController(service),
  );
  return router;
}
