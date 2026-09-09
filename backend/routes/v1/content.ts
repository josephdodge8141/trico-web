import { Router } from 'express';

import {
  createChangeController,
  createPendingListController,
  createPreviewPageController,
  createPublishedPageController,
  deploymentStateController,
  discardChangeController,
  historyController,
  publishController,
  retryController,
  rollbackController,
  setPreviewPreferencesController,
  updateChangeController,
  togglePreviewController,
} from '../../controllers/content.js';
import { createOriginGuard, requireAuthenticated, requireCsrf } from '../../middleware/session.js';
import type { ContentService } from '../../services/content.js';

export function createContentRoute(service: ContentService, publicOrigin: string): Router {
  const router = Router();
  const write = [createOriginGuard(publicOrigin), requireAuthenticated, requireCsrf] as const;
  router.get('/pages/:pageId', createPublishedPageController(service));
  router.get('/pages/:pageId/preview', requireAuthenticated, createPreviewPageController(service));
  router.get('/changes', requireAuthenticated, createPendingListController(service));
  router.post('/entities/:entityId/changes', ...write, createChangeController(service));
  router.put('/entities/:entityId/changes', ...write, updateChangeController(service));
  router.delete('/entities/:entityId/changes', ...write, discardChangeController(service));
  router.put('/preview/preferences', ...write, setPreviewPreferencesController(service));
  router.put('/preview/disabled/:entityId', ...write, togglePreviewController(service, true));
  router.delete('/preview/disabled/:entityId', ...write, togglePreviewController(service, false));
  router.post('/publish', ...write, publishController(service));
  router.get('/publications/:pageId', requireAuthenticated, historyController(service));
  router.post('/publications/:publicationId/rollback', ...write, rollbackController(service));
  router.get('/deployment', requireAuthenticated, deploymentStateController(service));
  router.get('/publish-operations/state', requireAuthenticated, deploymentStateController(service));
  router.post('/publish-operations/:operationId/retry', ...write, retryController(service));
  return router;
}
