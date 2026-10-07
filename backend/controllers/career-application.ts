import type { RequestHandler } from 'express';
import {
  careerApplicationRequestSchema,
  careerApplicationResponseSchema,
  careerApplicationUploadRequestSchema,
  careerApplicationUploadResponseSchema,
} from '@app/schemas';

import { HttpError } from '../middleware/errors.js';
import { ServiceError } from '../services/errors.js';
import type { CareerApplicationService } from '../services/career-application.js';

export function createCareerApplicationController(
  service: CareerApplicationService,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      await service.submit(careerApplicationRequestSchema.parse(request.body));
      response.status(200).json(careerApplicationResponseSchema.parse({ delivered: true }));
    } catch (error: unknown) {
      if (error instanceof ServiceError) {
        const status =
          error.code === 'APPLICATION_UNCONFIGURED'
            ? 503
            : error.code === 'INVALID_RESUME'
              ? 400
              : 502;
        next(new HttpError(status, error.code, error.message));
      } else {
        next(error);
      }
    }
  };
}

export function createCareerUploadController(service: CareerApplicationService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const result = await service.presign(
        careerApplicationUploadRequestSchema.parse(request.body),
      );
      response.status(200).json(careerApplicationUploadResponseSchema.parse(result));
    } catch (error: unknown) {
      if (error instanceof ServiceError && error.code === 'APPLICATION_UNCONFIGURED')
        next(new HttpError(503, error.code, error.message));
      else next(error);
    }
  };
}
