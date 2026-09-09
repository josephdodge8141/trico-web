import { Router } from 'express';

import {
  createExternalSourceController,
  deleteExternalSourceController,
  listExternalSourcesController,
  updateExternalSourceController,
} from '../../controllers/external-sources.js';
import { createOriginGuard, requireAuthenticated, requireCsrf } from '../../middleware/session.js';
import type { ExternalSourceService } from '../../services/external-sources.js';

export function createExternalSourceRoute(
  service: ExternalSourceService,
  publicOrigin: string,
): Router {
  const router = Router();
  const write = [createOriginGuard(publicOrigin), requireAuthenticated, requireCsrf] as const;
  router.get('/external-sources', requireAuthenticated, listExternalSourcesController(service));
  router.post('/external-sources', ...write, createExternalSourceController(service));
  router.put('/external-sources/:sourceId', ...write, updateExternalSourceController(service));
  router.delete('/external-sources/:sourceId', ...write, deleteExternalSourceController(service));
  return router;
}
