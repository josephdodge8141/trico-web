import type { RequestHandler } from 'express';
import {
  createPendingChangeRequestSchema,
  entityIdSchema,
  pageIdSchema,
  previewPreferencesRequestSchema,
  publishRequestSchema,
  rollbackRequestSchema,
  publishOperationIdSchema,
  updatePendingChangeRequestSchema,
} from '@app/schemas';

import { HttpError } from '../middleware/errors.js';
import type { ContentService } from '../services/content.js';
import { ServiceError } from '../services/errors.js';

const requireUser = (userId: string | undefined): string => {
  if (userId === undefined) throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required');
  return userId;
};

const forward = (next: (error: unknown) => void, error: unknown): void => {
  if (error instanceof ServiceError) {
    const conflictCodes = new Set([
      'PENDING_CHANGE_EXISTS',
      'PENDING_CHANGE_CONFLICT',
      'PUBLISH_SELECTION_STALE',
    ]);
    const status = conflictCodes.has(error.code)
      ? 409
      : error.code === 'DEPLOYMENT_FAILED'
        ? 503
        : 400;
    next(new HttpError(status, error.code, error.message));
    return;
  }
  next(error);
};

export function createPublishedPageController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      response.status(200).json(await service.page(pageIdSchema.parse(request.params['pageId'])));
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createPreviewPageController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const userId = requireUser(request.auth?.userId);
      response
        .status(200)
        .json(await service.preview(pageIdSchema.parse(request.params['pageId']), userId));
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createPendingListController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const pageId =
        request.query['pageId'] === undefined
          ? undefined
          : pageIdSchema.parse(request.query['pageId']);
      response.status(200).json({ changes: await service.pending(pageId) });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function createChangeController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const entityId = entityIdSchema.parse(request.params['entityId']);
      const input = createPendingChangeRequestSchema.parse(request.body);
      response
        .status(201)
        .json(
          await service.createChange(
            entityId,
            requireUser(request.auth?.userId),
            input.replacementValue,
          ),
        );
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function updateChangeController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const entityId = entityIdSchema.parse(request.params['entityId']);
      const input = updatePendingChangeRequestSchema.parse(request.body);
      response
        .status(200)
        .json(
          await service.updateChange(
            entityId,
            requireUser(request.auth?.userId),
            input.expectedRevision,
            input.replacementValue,
          ),
        );
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function discardChangeController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const entityId = entityIdSchema.parse(request.params['entityId']);
      const input = updatePendingChangeRequestSchema
        .pick({ expectedRevision: true })
        .parse(request.body);
      await service.discardChange(
        entityId,
        requireUser(request.auth?.userId),
        input.expectedRevision,
      );
      response.status(204).end();
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function setPreviewPreferencesController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = previewPreferencesRequestSchema.parse(request.body);
      await service.setPreviewDisabled(requireUser(request.auth?.userId), input.disabledEntityIds);
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function togglePreviewController(
  service: ContentService,
  disabled: boolean,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      await service.togglePreview(
        requireUser(request.auth?.userId),
        entityIdSchema.parse(request.params['entityId']),
        disabled,
      );
      response.status(204).end();
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function publishController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = publishRequestSchema.parse(request.body);
      response
        .status(202)
        .json(await service.publish(input.selections, requireUser(request.auth?.userId)));
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function historyController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      response.status(200).json({
        publications: await service.history(pageIdSchema.parse(request.params['pageId'])),
      });
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function rollbackController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const input = rollbackRequestSchema.parse({ publicationId: request.params['publicationId'] });
      response
        .status(202)
        .json(await service.rollback(input.publicationId, requireUser(request.auth?.userId)));
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}

export function deploymentStateController(service: ContentService): RequestHandler {
  return async (_request, response, next): Promise<void> => {
    try {
      response.status(200).json(await service.deploymentState());
    } catch (error: unknown) {
      next(error);
    }
  };
}

export function retryController(service: ContentService): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
      const operationId = publishOperationIdSchema.parse(request.params['operationId']);
      await service.retry(operationId);
      response.status(204).end();
    } catch (error: unknown) {
      forward(next, error);
    }
  };
}
