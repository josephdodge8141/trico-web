import { z } from 'zod';
import { editableValueSchema, entityIdSchema, pageIdSchema } from './content.js';
import { confirmMediaUploadRequestSchema, mediaPresignRequestSchema } from './api.js';

export const editorCommandSchema = z.strictObject({
  action: z.enum(['inspect', 'read', 'validate', 'save', 'media', 'upload', 'confirm', 'preview']),
  pageId: pageIdSchema.default('home'),
  entityId: entityIdSchema.optional(),
  expectedRevision: z.number().int().positive().nullable().default(null),
  replacementValue: editableValueSchema.optional(),
  cursor: z.string().max(500).optional(),
  upload: mediaPresignRequestSchema.optional(),
  confirmation: confirmMediaUploadRequestSchema.optional(),
});
export const editorResultSchema = z.strictObject({ result: z.unknown() });
export const editorConnectionSchema = z.strictObject({
  id: z.uuid(),
  secret: z.string().min(32).optional(),
  approved: z.boolean(),
  expiresAt: z.number(),
});
export const editorProposalSchema = z.strictObject({
  answer: z.string().min(1).max(6000),
  replacementValue: editableValueSchema.nullable(),
  expectedRevision: z.number().int().positive().nullable(),
  questions: z.array(z.string()),
});
export const editorChatSchema = z.strictObject({
  entityId: entityIdSchema,
  draftValue: editableValueSchema.optional(),
  messages: z
    .array(
      z.strictObject({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(6000) }),
    )
    .min(1)
    .max(12),
});
export const editorRpcSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type EditorCommand = z.infer<typeof editorCommandSchema>;
export type EditorProposal = z.infer<typeof editorProposalSchema>;
export type EditorChat = z.infer<typeof editorChatSchema>;
