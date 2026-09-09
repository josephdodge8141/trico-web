import { Router } from 'express';

import {
  createConfirmResetController,
  createCsrfController,
  createLoginController,
  createLogoutAllController,
  createLogoutController,
  createRegisterController,
  createRequestResetController,
  createSessionController,
  createVerifyEmailController,
} from '../../controllers/auth.js';
import type { Environment } from '../../config/environment.js';
import { createOriginGuard, requireAuthenticated, requireCsrf } from '../../middleware/session.js';
import type { AuthService } from '../../services/auth.js';

export function createAuthRoute(service: AuthService, environment: Environment): Router {
  const router = Router();
  const originGuard = createOriginGuard(environment.publicOrigin);
  router.post('/auth/register', originGuard, createRegisterController(service));
  router.post('/auth/verify-email', originGuard, createVerifyEmailController(service));
  router.post('/auth/login', originGuard, createLoginController(service, environment));
  router.post('/auth/request-reset', originGuard, createRequestResetController(service));
  router.post('/auth/confirm-reset', originGuard, createConfirmResetController(service));
  router.get('/auth/csrf', requireAuthenticated, createCsrfController());
  router.get('/auth/me', createSessionController());
  router.get('/auth/session', createSessionController());
  router.post(
    '/auth/logout',
    originGuard,
    requireAuthenticated,
    requireCsrf,
    createLogoutController(service, environment),
  );
  router.post(
    '/auth/logout-all',
    originGuard,
    requireAuthenticated,
    requireCsrf,
    createLogoutAllController(service, environment),
  );
  return router;
}
