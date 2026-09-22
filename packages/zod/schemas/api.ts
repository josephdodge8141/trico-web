import { z } from 'zod';

import {
  editableValueSchema,
  entityIdSchema,
  externalSourceIdSchema,
  isoDateTimeSchema,
  pageIdSchema,
  pendingChangeSchema,
  publicationIdSchema,
  publicationSchema,
  publishOperationIdSchema,
  publishOperationSchema,
  userIdSchema,
} from './content.js';

export const createPendingChangeRequestSchema = z.strictObject({
  replacementValue: editableValueSchema,
});
export const updatePendingChangeRequestSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  replacementValue: editableValueSchema,
});
export const discardPendingChangeRequestSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
});
export const pendingChangeResponseSchema = pendingChangeSchema;
export const pendingChangesResponseSchema = z.strictObject({
  changes: z.array(pendingChangeSchema),
});

export const previewPreferencesRequestSchema = z.strictObject({
  disabledEntityIds: z.array(entityIdSchema),
});
export const previewPreferencesResponseSchema = z.strictObject({
  disabledEntityIds: z.array(entityIdSchema),
});

export const publishSelectionSchema = z.strictObject({
  entityId: entityIdSchema,
  expectedRevision: z.number().int().positive(),
});
export const publishRequestSchema = z.strictObject({
  selections: z.array(publishSelectionSchema).min(1).max(100),
});
export const publishResponseSchema = z.strictObject({
  operationId: publishOperationIdSchema,
  publicationIds: z.array(publicationIdSchema).min(1),
});
export const publicationHistoryResponseSchema = z.strictObject({
  publications: z.array(publicationSchema),
});
export const rollbackRequestSchema = z.strictObject({ publicationId: publicationIdSchema });
export const deploymentStateResponseSchema = z.strictObject({
  blocked: z.boolean(),
  failedOperation: publishOperationSchema.nullable(),
});

export const mediaReferenceSchema = z.strictObject({
  bucket: z.string().trim().min(1).max(255),
  key: z.string().trim().min(1).max(1_024),
  publicUrl: z.union([z.url(), z.string().regex(/^\/media\/[A-Za-z0-9._/-]+$/)]),
});
export const mediaPresignRequestSchema = z.strictObject({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  contentLength: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
});
export const mediaPresignResponseSchema = z.strictObject({
  uploadUrl: z.url(),
  uploadId: z.uuid(),
  publicUrl: mediaReferenceSchema.shape.publicUrl,
  expiresAt: isoDateTimeSchema,
});

export const mediaAssetIdSchema = z.uuid();
export const mediaAssetSchema = z.strictObject({
  id: mediaAssetIdSchema,
  name: z.string().trim().min(1).max(160),
  altText: z.string().trim().min(1).max(500),
  contentType: mediaPresignRequestSchema.shape.contentType,
  contentLength: mediaPresignRequestSchema.shape.contentLength,
  publicUrl: mediaReferenceSchema.shape.publicUrl,
  createdAt: isoDateTimeSchema,
});
export const confirmMediaUploadRequestSchema = z.strictObject({
  uploadId: z.uuid(),
  name: mediaAssetSchema.shape.name,
  altText: mediaAssetSchema.shape.altText,
});
export const mediaLibraryQuerySchema = z.strictObject({
  cursor: z.string().trim().min(1).max(2_048).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export const mediaLibraryResponseSchema = z.strictObject({
  assets: z.array(mediaAssetSchema),
  nextCursor: z.string().nullable(),
});

export const externalSourceTypeSchema = z.enum(['MLS', 'LOOPNET', 'CREXI']);
export const externalSourceSchema = z.strictObject({
  id: externalSourceIdSchema,
  entityId: entityIdSchema,
  itemId: z.uuid(),
  type: externalSourceTypeSchema,
  url: z.url({ protocol: /^https$/ }),
  validationFields: z.array(z.string().trim().min(1).max(200)).min(1),
  overriddenFields: z
    .array(
      z
        .string()
        .trim()
        .regex(/^[A-Za-z][A-Za-z0-9]*$/)
        .max(100),
    )
    .max(50)
    .refine((fields) => new Set(fields).size === fields.length, 'Fields must be unique'),
  enabled: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export const createExternalSourceRequestSchema = externalSourceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateExternalSourceRequestSchema = createExternalSourceRequestSchema.partial();
export const externalSourcesResponseSchema = z.strictObject({
  sources: z.array(externalSourceSchema),
});

export const scheduledSyncEventSchema = z.strictObject({
  schemaVersion: z.literal(1),
  eventType: z.literal('trico.external-sync.requested'),
  requestedAt: isoDateTimeSchema,
  requestedBy: z.union([userIdSchema, z.literal('eventbridge')]),
  pageId: pageIdSchema.optional(),
});

export type CreatePendingChangeRequest = z.infer<typeof createPendingChangeRequestSchema>;
export type UpdatePendingChangeRequest = z.infer<typeof updatePendingChangeRequestSchema>;
export type DiscardPendingChangeRequest = z.infer<typeof discardPendingChangeRequestSchema>;
export type PublishRequest = z.infer<typeof publishRequestSchema>;
export type PublishResponse = z.infer<typeof publishResponseSchema>;
export type MediaReference = z.infer<typeof mediaReferenceSchema>;
export type MediaPresignRequest = z.infer<typeof mediaPresignRequestSchema>;
export type MediaPresignResponse = z.infer<typeof mediaPresignResponseSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type ConfirmMediaUploadRequest = z.infer<typeof confirmMediaUploadRequestSchema>;
export type MediaLibraryQuery = z.infer<typeof mediaLibraryQuerySchema>;
export type MediaLibraryResponse = z.infer<typeof mediaLibraryResponseSchema>;
export type ExternalSource = z.infer<typeof externalSourceSchema>;
export type ScheduledSyncEvent = z.infer<typeof scheduledSyncEventSchema>;
