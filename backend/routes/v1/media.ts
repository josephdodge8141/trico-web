import { Router } from 'express';

import { createMediaPresignController } from '../../controllers/media.js';
import { createOriginGuard, requireAuthenticated, requireCsrf } from '../../middleware/session.js';
import type { MediaService } from '../../services/media.js';

export function createMediaRoute(service: MediaService, publicOrigin: string): Router {
  const router = Router();
  router.post(
    '/media/presign',
    createOriginGuard(publicOrigin),
    requireAuthenticated,
    requireCsrf,
    createMediaPresignController(service),
  );
  return router;
}
