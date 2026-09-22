import type { RequestHandler } from 'express';
import {
  createExternalSourceRequestSchema,
  entityDefinitions,
  entityIdSchema,
  externalSourceIdSchema,
  pageIdSchema,
  updateExternalSourceRequestSchema,
} from '@app/schemas';

import { HttpError } from '../middleware/errors.js';
import type { ExternalSourceService } from '../services/external-sources.js';
import { ServiceError } from '../services/errors.js';

const forward = (next: (error: unknown) => void, error: unknown): void => {
  if (error instanceof ServiceError) {
    next(
      new HttpError(error.code === 'SOURCE_ALREADY_EXISTS' ? 409 : 400, error.code, error.message),
    );
    return;
  }
  next(error);
};

export const listExternalSourcesController =
  (service: ExternalSourceService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const entityQuery = request.query['entityId'];
      const pageQuery = request.query['pageId'];
      const sources =
        entityQuery !== undefined
          ? await service.list(entityIdSchema.parse(entityQuery))
          : (
              await Promise.all(
                entityDefinitions
                  .filter((definition) => definition.pageId === pageIdSchema.parse(pageQuery))
                  .map((definition) => service.list(definition.id)),
              )
            ).flat();
      response.status(200).json({ sources });
    } catch (error: unknown) {
      next(error);
    }
  };

export const createExternalSourceController =
  (service: ExternalSourceService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      response
        .status(201)
        .json(await service.create(createExternalSourceRequestSchema.parse(request.body)));
    } catch (error: unknown) {
      forward(next, error);
    }
  };

export const updateExternalSourceController =
  (service: ExternalSourceService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      response
        .status(200)
        .json(
          await service.update(
            externalSourceIdSchema.parse(request.params['sourceId']),
            updateExternalSourceRequestSchema.parse(request.body),
          ),
        );
    } catch (error: unknown) {
      forward(next, error);
    }
  };

export const deleteExternalSourceController =
  (service: ExternalSourceService): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      await service.delete(externalSourceIdSchema.parse(request.params['sourceId']));
      response.status(204).end();
    } catch (error: unknown) {
      forward(next, error);
    }
  };
