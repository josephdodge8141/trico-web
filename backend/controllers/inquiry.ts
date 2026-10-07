import type { RequestHandler } from 'express';
import { inquiryRequestSchema, inquiryResponseSchema } from '@app/schemas';

import { HttpError } from '../middleware/errors.js';
import { ServiceError } from '../services/errors.js';
import type { InquiryService } from '../services/inquiry.js';

export function createInquiryController(service: InquiryService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = inquiryRequestSchema.parse(request.body);
      await service.submit(input);
      response.status(200).json(inquiryResponseSchema.parse({ delivered: true }));
    } catch (error: unknown) {
      if (error instanceof ServiceError) {
        next(
          new HttpError(
            error.code === 'INQUIRY_UNCONFIGURED' ? 503 : 502,
            error.code,
            error.message,
          ),
        );
      } else {
        next(error);
      }
    }
  };
}
