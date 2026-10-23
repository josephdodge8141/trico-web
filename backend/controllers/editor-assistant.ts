import type { RequestHandler } from 'express';
import {
  editorChatSchema,
  editorCommandSchema,
  editorConnectionSchema,
  editorProposalSchema,
  editorResultSchema,
} from '@app/schemas';
import type { EditorAssistantService } from '../services/editor-assistant.js';
import { ServiceError } from '../services/errors.js';
import { HttpError } from '../middleware/errors.js';

export function editorAssistantController(
  service: EditorAssistantService,
  operation: 'connect' | 'connection' | 'approve' | 'revoke' | 'execute' | 'chat',
): RequestHandler {
  return async (request, response, next) => {
    try {
      const id = String(request.params['id'] ?? '');
      const userId = request.editorUserId ?? request.auth?.userId ?? '';
      if (operation === 'connect')
        response.status(201).json(editorConnectionSchema.parse(await service.connect()));
      if (operation === 'connection')
        response.json(
          await service.connection(
            id,
            request.headers.authorization?.replace(/^Bearer /, '') ?? '',
          ),
        );
      if (operation === 'approve') {
        await service.approve(id, userId, request.auth?.sessionHash ?? '');
        response.status(204).end();
      }
      if (operation === 'revoke') {
        await service.revoke(id, userId);
        response.status(204).end();
      }
      if (operation === 'execute')
        response.json(
          editorResultSchema.parse({
            result: await service.execute(editorCommandSchema.parse(request.body), userId),
          }),
        );
      if (operation === 'chat')
        response.json(
          editorProposalSchema.parse(
            await service.chat(editorChatSchema.parse(request.body), userId),
          ),
        );
    } catch (error: unknown) {
      if (error instanceof ServiceError)
        next(
          new HttpError(
            error.code === 'EDITOR_CONNECTION_INVALID'
              ? 403
              : error.code.includes('CONFLICT') || error.code === 'PENDING_CHANGE_EXISTS'
                ? 409
                : 400,
            error.code,
            error.message,
          ),
        );
      else next(error);
    }
  };
}
