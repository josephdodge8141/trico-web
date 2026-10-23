import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import {
  editableValueSchema,
  entityDefinitions,
  editorConnectionSchema,
  requireEntityDefinition,
  type EditorChat,
  type EditorCommand,
  type EditorProposal,
} from '@app/schemas';
import type { EditorAiConnection } from '../config/editor-ai.js';
import type { ContentService } from './content.js';
import type { MediaService } from './media.js';
import { ServiceError } from './errors.js';

const hash = (secret: string): string => createHash('sha256').update(secret).digest('hex');
export function createEditorAssistantService(
  database: DynamoDBDocumentClient,
  tableName: string,
  content: ContentService,
  media: MediaService,
  ai: EditorAiConnection,
) {
  const readConnection = async (id: string) => {
    const result = await database.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `EDITOR#${id}`, sk: 'CONNECTION' },
        ConsistentRead: true,
      }),
    );
    if (!result.Item || Number(result.Item['expiresAt']) <= Date.now())
      throw new ServiceError(
        'EDITOR_CONNECTION_INVALID',
        'This connection expired or was revoked. Reconnect from your MCP client.',
      );
    return result.Item;
  };
  const record = async (entityId: string, userId: string) => {
    const definition = requireEntityDefinition(entityId);
    const pending = (await content.pending(definition.pageId)).find(
      (change) => change.entityId === entityId,
    );
    const value = (await content.preview(definition.pageId, userId))[entityId];
    return {
      definition,
      pending,
      value: pending?.replacementValue ?? value,
      expectedRevision: pending?.revision ?? null,
    };
  };
  const validate = (entityId: string, value: unknown): string[] => {
    const result = requireEntityDefinition(entityId).schema.safeParse(value);
    return result.success
      ? []
      : result.error.issues.map(
          (issue) => `${issue.path.join('.') || 'Section'}: ${issue.message}`,
        );
  };
  return {
    connect: async () => {
      const id = randomUUID();
      const secret = randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + 5 * 60000;
      await database.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            pk: `EDITOR#${id}`,
            sk: 'CONNECTION',
            id,
            secretHash: hash(secret),
            approved: false,
            expiresAt,
          },
        }),
      );
      return editorConnectionSchema.parse({ id, secret, approved: false, expiresAt });
    },
    approve: async (id: string, userId: string, sessionToken: string) => {
      const connection = await readConnection(id);
      if (connection['approved'])
        throw new ServiceError('EDITOR_CONNECTION_INVALID', 'This request was already approved.');
      await database.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            ...connection,
            approved: true,
            userId,
            sessionDigest: hash(sessionToken),
            expiresAt: Date.now() + 15 * 60000,
          },
          ConditionExpression: 'approved = :pending',
          ExpressionAttributeValues: { ':pending': false },
        }),
      );
    },
    revoke: async (id: string, userId: string) => {
      const connection = await readConnection(id);
      if (connection['userId'] !== userId)
        throw new ServiceError(
          'EDITOR_CONNECTION_INVALID',
          'This connection belongs to another editor.',
        );
      await database.send(
        new DeleteCommand({ TableName: tableName, Key: { pk: `EDITOR#${id}`, sk: 'CONNECTION' } }),
      );
    },
    connection: async (id: string, secret: string) => {
      const connection = await readConnection(id);
      if (connection['secretHash'] !== hash(secret))
        throw new ServiceError('EDITOR_CONNECTION_INVALID', 'Invalid connection secret.');
      return editorConnectionSchema.parse({
        id,
        approved: connection['approved'],
        expiresAt: connection['expiresAt'],
      });
    },
    authorize: async (token: string) => {
      const [id = '', secret = ''] = token.split('.');
      const connection = await readConnection(id);
      if (!connection['approved'] || connection['secretHash'] !== hash(secret))
        throw new ServiceError(
          'EDITOR_CONNECTION_INVALID',
          'Approve this connection in the browser first.',
        );
      const session = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: `SESSION#${String(connection['sessionDigest'])}`, sk: 'SESSION' },
          ConsistentRead: true,
        }),
      );
      if (
        !session.Item ||
        Number(session.Item['expiresAt']) * 1000 <= Date.now() ||
        session.Item['userId'] !== connection['userId']
      )
        throw new ServiceError(
          'EDITOR_CONNECTION_INVALID',
          'Sign in and reconnect your MCP client.',
        );
      return String(connection['userId']);
    },
    execute: async (input: EditorCommand, userId: string): Promise<unknown> => {
      if (input.action === 'inspect')
        return entityDefinitions
          .filter((definition) => definition.pageId === input.pageId)
          .map(({ id, label, editor }) => ({ id, label, editor }));
      if (input.action === 'media')
        return media.list({ limit: 50, ...(input.cursor ? { cursor: input.cursor } : {}) });
      if (input.action === 'upload' && input.upload) return media.presign(input.upload, userId);
      if (input.action === 'confirm' && input.confirmation)
        return media.confirm(input.confirmation, userId);
      if (input.action === 'preview')
        return {
          path: input.pageId === 'home' ? '/' : `/${input.pageId}`,
          message: 'Sign in and enter edit mode to view private drafts.',
        };
      if (!input.entityId)
        throw new ServiceError('EDITOR_INPUT_INVALID', 'Choose a page section first.');
      const current = await record(input.entityId, userId);
      if (input.action === 'read')
        return {
          value: current.value,
          expectedRevision: current.expectedRevision,
          editor: current.definition.editor,
        };
      const questions = validate(input.entityId, input.replacementValue);
      if (input.action === 'validate') return { valid: questions.length === 0, questions };
      if (input.action !== 'save' || questions.length)
        throw new ServiceError(
          'EDITOR_INPUT_INVALID',
          questions.join('\n') || 'Supply the required operation details.',
        );
      return input.expectedRevision === null
        ? content.createChange(
            current.definition.id,
            userId,
            editableValueSchema.parse(current.definition.schema.parse(input.replacementValue)),
          )
        : content.updateChange(
            current.definition.id,
            userId,
            input.expectedRevision,
            editableValueSchema.parse(current.definition.schema.parse(input.replacementValue)),
          );
    },
    chat: async (input: EditorChat, userId: string): Promise<EditorProposal> => {
      const current = await record(input.entityId, userId);
      if (current.pending && current.pending.authorId !== userId)
        throw new ServiceError(
          'EDITOR_INPUT_INVALID',
          'Another editor owns this section. Their draft cannot be changed.',
        );
      const proposal = await ai
        .propose(
          {
            value: input.draftValue ?? current.value,
            editor: current.definition.editor,
            media: await media.list({ limit: 50 }),
          },
          input.messages,
        )
        .catch(() => {
          throw new ServiceError(
            'EDITOR_AI_UNAVAILABLE',
            'The local model request failed. Check LiteLLM credentials and retry.',
          );
        });
      return {
        ...proposal,
        expectedRevision: current.expectedRevision,
        questions:
          proposal.replacementValue === null
            ? []
            : validate(input.entityId, proposal.replacementValue),
      };
    },
  };
}
export type EditorAssistantService = ReturnType<typeof createEditorAssistantService>;
