import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, errorResponseSchema, type ErrorDetail, type ErrorResponse } from '@app/schemas';

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function safeError(error: unknown): { statusCode: number; body: ErrorResponse } {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      body: {
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.map((part) =>
              typeof part === 'symbol' ? (part.description ?? '') : part,
            ),
            message: issue.message,
            code: issue.code,
          })),
        },
      },
    };
  }
  if (error instanceof HttpError) {
    const body: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
    const parsed = errorResponseSchema.safeParse(body);
    if (
      parsed.success &&
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode <= 599
    ) {
      return { statusCode: error.statusCode, body: parsed.data };
    }
  }
  return {
    statusCode: 500,
    body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
  };
}

export const notFoundMiddleware: RequestHandler = (_request, _response, next): void => {
  next(new HttpError(404, 'NOT_FOUND', 'Resource not found'));
};

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
): void => {
  const mapped = safeError(error);
  response.status(mapped.statusCode).json(mapped.body);
};
