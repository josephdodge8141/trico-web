import type { RequestHandler } from 'express';
import { mediaPresignRequestSchema, mediaPresignResponseSchema } from '@app/schemas';

import type { MediaService } from '../services/media.js';

export function createMediaPresignController(service: MediaService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = mediaPresignRequestSchema.parse(request.body);
      response.status(200).json(mediaPresignResponseSchema.parse(await service.presign(input)));
    } catch (error: unknown) {
      next(error);
    }
  };
}
