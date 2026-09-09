import { z } from 'zod';

export const pageIdSchema = z.enum([
  'home',
  'property-management',
  'real-estate',
  'construction',
  'storage',
  'development',
]);

export const entityIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/);
export const userIdSchema = z.uuid();
export const publicationIdSchema = z.uuid();
export const publishOperationIdSchema = z.uuid();
export const externalSourceIdSchema = z.uuid();
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export type EditableValue =
  | string
  | number
  | boolean
  | null
  | readonly EditableValue[]
  | { readonly [key: string]: EditableValue };

export const editableValueSchema: z.ZodType<EditableValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(editableValueSchema),
    z.record(z.string(), editableValueSchema),
  ]),
);

export const editableObjectSchema = z.record(z.string(), editableValueSchema);
export const editableListItemSchema = z.object({ id: z.uuid() }).catchall(editableValueSchema);
export const editableListSchema = z.array(editableListItemSchema);

export const entitySchema = z.strictObject({
  id: entityIdSchema,
  pageId: pageIdSchema,
  version: z.number().int().positive(),
  value: editableValueSchema,
  updatedAt: isoDateTimeSchema,
});

export const pendingChangeSchema = z.strictObject({
  entityId: entityIdSchema,
  pageId: pageIdSchema,
  authorId: userIdSchema,
  baseEntityVersion: z.number().int().positive(),
  revision: z.number().int().positive(),
  beforeValue: editableValueSchema,
  replacementValue: editableValueSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const previewPreferencesSchema = z.strictObject({
  userId: userIdSchema,
  disabledEntityIds: z.array(entityIdSchema),
  updatedAt: isoDateTimeSchema,
});

export const publicationSourceSchema = z.enum(['MANUAL', 'AUTO_SYNC', 'ROLLBACK']);
export const publicationSnapshotEntitySchema = z.strictObject({
  entityId: entityIdSchema,
  entityVersion: z.number().int().positive(),
  value: editableValueSchema,
});
export const publicationSchema = z.strictObject({
  id: publicationIdSchema,
  pageId: pageIdSchema,
  authors: z.array(userIdSchema),
  publishedBy: z.union([userIdSchema, z.literal('system')]),
  publishedAt: isoDateTimeSchema,
  source: publicationSourceSchema,
  snapshot: z.array(publicationSnapshotEntitySchema),
});

export const publishOperationStatusSchema = z.enum(['DEPLOYING', 'LIVE', 'DEPLOY_FAILED']);
export const publishOperationSchema = z.strictObject({
  id: publishOperationIdSchema,
  publicationIds: z.array(publicationIdSchema).min(1),
  affectedPageIds: z.array(pageIdSchema).min(1),
  requestedBy: z.union([userIdSchema, z.literal('system')]),
  status: publishOperationStatusSchema,
  createdAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.optional(),
  failureMessage: z.string().trim().min(1).max(2_000).optional(),
});

export const pageContentSchema = z.record(z.string(), editableValueSchema);
export const contentManifestEntrySchema = z.strictObject({
  url: z.string().trim().min(1),
  etag: z.string().trim().min(1),
});
export const contentManifestSchema = z.strictObject({
  version: z.number().int().positive(),
  currentOperationId: publishOperationIdSchema,
  pages: z.record(pageIdSchema, contentManifestEntrySchema),
});

export type PageId = z.infer<typeof pageIdSchema>;
export type EntityId = z.infer<typeof entityIdSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type PendingChange = z.infer<typeof pendingChangeSchema>;
export type PreviewPreferences = z.infer<typeof previewPreferencesSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type PublishOperation = z.infer<typeof publishOperationSchema>;
export type PageContent = z.infer<typeof pageContentSchema>;
export type ContentManifest = z.infer<typeof contentManifestSchema>;
