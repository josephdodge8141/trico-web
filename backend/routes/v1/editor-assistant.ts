import { Router } from 'express';
import { editorAssistantController } from '../../controllers/editor-assistant.js';
import {
  createEditorAccess,
  rejectBrowserConnection,
  createOriginGuard,
  requireAuthenticated,
  requireCsrf,
} from '../../middleware/session.js';
import type { EditorAssistantService } from '../../services/editor-assistant.js';

export function createEditorAssistantRoute(
  service: EditorAssistantService,
  origin: string,
): Router {
  const router = Router();
  const write = [createOriginGuard(origin), requireAuthenticated, requireCsrf] as const;
  router.post(
    '/editor/connections',
    rejectBrowserConnection,
    editorAssistantController(service, 'connect'),
  );
  router.get('/editor/connections/:id', editorAssistantController(service, 'connection'));
  router.post('/editor/connections/:id', ...write, editorAssistantController(service, 'approve'));
  router.delete('/editor/connections/:id', ...write, editorAssistantController(service, 'revoke'));
  router.post(
    '/editor/tools',
    createEditorAccess(service, origin),
    editorAssistantController(service, 'execute'),
  );
  router.post('/editor/chat', ...write, editorAssistantController(service, 'chat'));
  return router;
}
