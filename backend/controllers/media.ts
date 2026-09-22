import type { RequestHandler } from 'express';
import {
  confirmMediaUploadRequestSchema,
  mediaAssetSchema,
  mediaLibraryQuerySchema,
  mediaLibraryResponseSchema,
  mediaPresignRequestSchema,
  mediaPresignResponseSchema,
} from '@app/schemas';

import type { MediaService } from '../services/media.js';
import { HttpError } from '../middleware/errors.js';
import { ServiceError } from '../services/errors.js';

const requireUser = (userId: string | undefined): string => {
  if (userId === undefined) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
  return userId;
};

const forward = (next: (error: unknown) => void, error: unknown): void => {
  if (error instanceof ServiceError) {
    next(new HttpError(400, error.code, error.message));
    return;
  }
  next(error);
};

export function createMediaPresignController(service: MediaService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = mediaPresignRequestSchema.parse(request.body);
      response
        .status(200)
        .json(
          mediaPresignResponseSchema.parse(
            await service.presign(input, requireUser(request.auth?.userId)),
          ),
        );
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function createMediaConfirmController(service: MediaService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = confirmMediaUploadRequestSchema.parse(request.body);
      response
        .status(201)
        .json(
          mediaAssetSchema.parse(await service.confirm(input, requireUser(request.auth?.userId))),
        );
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function createMediaListController(service: MediaService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = mediaLibraryQuerySchema.parse(request.query);
      response
        .status(200)
        .json(
          mediaLibraryResponseSchema.parse(
            await service.list(
              input.cursor === undefined
                ? { limit: input.limit }
                : { limit: input.limit, cursor: input.cursor },
            ),
          ),
        );
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}
