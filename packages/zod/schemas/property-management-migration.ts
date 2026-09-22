import { z } from 'zod';

import { editableValueSchema, entityIdSchema, type EditableValue } from './content.js';
import {
  PROPERTY_MANAGEMENT_CONTENT_SCHEMA_VERSION,
  propertyManagementEntityDefinitions,
} from './property-management.js';
import { propertyManagementV2SeedData } from '../seeds/property-management.js';

export const propertyManagementMigrationRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  environment: z.enum(['local', 'preview', 'dev', 'production']),
  mode: z.enum(['dry-run', 'prepare-apply', 'reset-disposable-local']),
  currentContent: z.record(z.string(), editableValueSchema),
  pendingChanges: z.array(
    z.strictObject({
      entityId: entityIdSchema,
      schemaVersion: z.union([z.literal(1), z.literal(2)]),
    }),
  ),
});

export const propertyManagementMigrationPlanSchema = z.strictObject({
  fromVersion: z.literal(1),
  toVersion: z.literal(PROPERTY_MANAGEMENT_CONTENT_SCHEMA_VERSION),
  dryRun: z.boolean(),
  entries: z
    .array(
      z.strictObject({
        entityId: entityIdSchema,
        action: z.enum(['replace', 'preserve']),
        reason: z.string().trim().min(1).max(500),
      }),
    )
    .length(35),
  discardedPendingEntityIds: z.array(entityIdSchema),
  nextContent: z.record(z.string(), editableValueSchema),
});

export type PropertyManagementMigrationRequest = z.infer<
  typeof propertyManagementMigrationRequestSchema
>;
export type PropertyManagementMigrationPlan = z.infer<typeof propertyManagementMigrationPlanSchema>;

export function planPropertyManagementContentMigration(
  unchecked: PropertyManagementMigrationRequest,
): PropertyManagementMigrationPlan {
  const request = propertyManagementMigrationRequestSchema.parse(unchecked);
  if (request.mode === 'reset-disposable-local' && request.environment !== 'local') {
    throw new Error('Disposable content reset is only allowed in the local environment.');
  }
  const ids = new Set(propertyManagementEntityDefinitions.map(({ id }) => id));
  const unresolved = [
    ...new Set(
      request.pendingChanges
        .filter(({ entityId, schemaVersion }) => ids.has(entityId) && schemaVersion === 1)
        .map(({ entityId }) => entityId),
    ),
  ].sort();
  if (unresolved.length > 0 && request.mode !== 'reset-disposable-local') {
    throw new Error(
      `Property Management migration refused: unresolved version 1 pending changes exist for ${unresolved.join(', ')}.`,
    );
  }

  const nextContent: Record<string, EditableValue> = { ...request.currentContent };
  const entries = propertyManagementEntityDefinitions.map((definition) => {
    const seed =
      propertyManagementV2SeedData[definition.id as keyof typeof propertyManagementV2SeedData];
    const existing = request.currentContent[definition.id];
    const preserve = existing !== undefined && definition.schema.safeParse(existing).success;
    if (!preserve) nextContent[definition.id] = editableValueSchema.parse(seed);
    return {
      entityId: definition.id,
      action: preserve ? ('preserve' as const) : ('replace' as const),
      reason: preserve
        ? 'The existing value already satisfies the Property Management version 2 semantic schema.'
        : 'Replace the legacy extraction wrapper with the checked-in semantic Property Management seed.',
    };
  });

  return propertyManagementMigrationPlanSchema.parse({
    fromVersion: 1,
    toVersion: PROPERTY_MANAGEMENT_CONTENT_SCHEMA_VERSION,
    dryRun: request.mode === 'dry-run',
    entries,
    discardedPendingEntityIds: request.mode === 'reset-disposable-local' ? unresolved : [],
    nextContent,
  });
}
