import { Router } from 'express';

import {
  createMediaConfirmController,
  createMediaListController,
  createMediaPresignController,
} from '../../controllers/media.js';
import { createOriginGuard, requireAuthenticated, requireCsrf } from '../../middleware/session.js';
import type { MediaService } from '../../services/media.js';

export function createMediaRoute(service: MediaService, publicOrigin: string): Router {
  const router = Router();
  router.get('/media', requireAuthenticated, createMediaListController(service));
  router.post(
    '/media/presign',
    createOriginGuard(publicOrigin),
    requireAuthenticated,
    requireCsrf,
    createMediaPresignController(service),
  );
  router.post(
    '/media/confirm',
    createOriginGuard(publicOrigin),
    requireAuthenticated,
    requireCsrf,
    createMediaConfirmController(service),
  );
  return router;
}
