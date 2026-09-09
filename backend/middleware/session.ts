import type { CookieOptions, RequestHandler } from 'express';

import type { Environment } from '../config/environment.js';
import type { AuthenticatedRequestState } from '../models/auth.js';
import type { AuthService } from '../services/auth.js';
import { HttpError } from './errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthenticatedRequestState;
  }
}

const parseCookies = (header: string | undefined): Readonly<Record<string, string>> => {
  if (header === undefined) return {};
  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 1) return [];
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      return [[name, decodeURIComponent(value)]];
    }),
  );
};

export function createAuthenticationMiddleware(
  service: AuthService,
  environment: Environment,
): RequestHandler {
  return async (request, _response, next): Promise<void> => {
    try {
      const token = parseCookies(request.headers.cookie)[environment.sessionCookieName];
      if (token !== undefined) {
        const session = await service.authenticate(token);
        if (session !== undefined) {
          request.auth = {
            userId: session.principal.subject,
            email: session.principal.email,
            emailVerified: session.principal.emailVerified,
            sessionHash: token,
            csrfToken: session.csrfToken,
          };
        }
      }
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function sessionCookieOptions(environment: Environment): CookieOptions {
  return {
    httpOnly: true,
    secure: environment.cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1_000,
  };
}

export const requireAuthenticated: RequestHandler = (request, _response, next): void => {
  if (request.auth === undefined) {
    next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    return;
  }
  next();
};

export function createOriginGuard(publicOrigin: string): RequestHandler {
  return (request, _response, next): void => {
    const origin = request.headers.origin;
    if (origin !== publicOrigin) {
      next(new HttpError(403, 'ORIGIN_REJECTED', 'Request origin was rejected'));
      return;
    }
    next();
  };
}

export const requireCsrf: RequestHandler = (request, _response, next): void => {
  if (request.auth === undefined) {
    next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required'));
    return;
  }
  if (request.headers['x-csrf-token'] !== request.auth.csrfToken) {
    next(new HttpError(403, 'CSRF_REJECTED', 'CSRF token was rejected'));
    return;
  }
  next();
};
