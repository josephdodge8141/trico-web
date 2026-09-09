import type { RequestHandler } from 'express';
import {
  authSessionSchema,
  confirmPasswordResetSchema,
  csrfResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
  requestPasswordResetSchema,
  verifyEmailRequestSchema,
} from '@app/schemas';

import type { Environment } from '../config/environment.js';
import { HttpError } from '../middleware/errors.js';
import { sessionCookieOptions } from '../middleware/session.js';
import type { AuthService } from '../services/auth.js';
import { ServiceError } from '../services/errors.js';

const forward = (next: (error: unknown) => void, error: unknown): void => {
  if (error instanceof ServiceError) {
    const status =
      error.code === 'EMAIL_ALREADY_REGISTERED'
        ? 409
        : error.code === 'FORBIDDEN_EMAIL_DOMAIN'
          ? 403
          : 400;
    next(new HttpError(status, error.code, error.message));
    return;
  }
  next(error);
};

export function createRegisterController(service: AuthService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = registerRequestSchema.parse(request.body);
      const account = await service.register(input.email, input.password);
      response.status(201).json({ ...account, verificationRequired: true });
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function createVerifyEmailController(service: AuthService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = verifyEmailRequestSchema.parse(request.body);
      await service.verifyEmail(input.token);
      response.status(200).json({ message: 'Email verified' });
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function createLoginController(
  service: AuthService,
  environment: Environment,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = loginRequestSchema.parse(request.body);
      const session = await service.login(input.email, input.password);
      response.cookie(
        environment.sessionCookieName,
        session.token,
        sessionCookieOptions(environment),
      );
      response
        .status(200)
        .json(authSessionSchema.parse({ authenticated: true, principal: session.principal }));
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function createSessionController(): RequestHandler {
  return (request, response): void => {
    const body =
      request.auth === undefined
        ? { authenticated: false, principal: null }
        : {
            authenticated: true,
            principal: {
              subject: request.auth.userId,
              email: request.auth.email,
              emailVerified: request.auth.emailVerified,
            },
          };
    response.status(200).json(authSessionSchema.parse(body));
  };
}

export function createCsrfController(): RequestHandler {
  return (request, response, next): void => {
    if (request.auth === undefined) {
      next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required'));
      return;
    }
    response.status(200).json(csrfResponseSchema.parse({ token: request.auth.csrfToken }));
  };
}

export function createLogoutController(
  service: AuthService,
  environment: Environment,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      if (request.auth !== undefined) await service.logout(request.auth.sessionHash);
      response.clearCookie(environment.sessionCookieName, sessionCookieOptions(environment));
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createLogoutAllController(
  service: AuthService,
  environment: Environment,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      if (request.auth === undefined)
        throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
      await service.logoutAll(request.auth.userId);
      response.clearCookie(environment.sessionCookieName, sessionCookieOptions(environment));
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createRequestResetController(service: AuthService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = requestPasswordResetSchema.parse(request.body);
      await service.requestPasswordReset(input.email);
      response.status(202).json({ message: 'If the account exists, a reset email has been sent' });
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function createConfirmResetController(service: AuthService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = confirmPasswordResetSchema.parse(request.body);
      await service.confirmPasswordReset(input.token, input.password);
      response.status(200).json({ message: 'Password reset complete' });
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}
