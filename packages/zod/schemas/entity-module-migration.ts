import { z } from 'zod';

import {
  editableValueSchema,
  entityIdSchema,
  pageIdSchema,
  type EditableValue,
} from './content.js';
import type { EntityModule } from './editor-contracts.js';

export const entityModuleMigrationModeSchema = z.enum([
  'dry-run',
  'prepare-apply',
  'reset-disposable-local',
]);

export const entityModuleMigrationRequestSchema = z.strictObject({
  pageId: pageIdSchema,
  schemaVersion: z.literal(1),
  environment: z.enum(['local', 'preview', 'dev', 'production']),
  mode: entityModuleMigrationModeSchema,
  currentContent: z.record(z.string(), editableValueSchema),
  pendingChanges: z.array(
    z.strictObject({
      entityId: entityIdSchema,
      schemaVersion: z.union([z.literal(1), z.literal(2)]),
    }),
  ),
});

export const entityModuleMigrationEntrySchema = z.strictObject({
  entityId: entityIdSchema,
  action: z.enum(['replace', 'preserve']),
  reason: z.string().trim().min(1).max(500),
});

export const entityModuleMigrationPlanSchema = z.strictObject({
  pageId: pageIdSchema,
  fromVersion: z.literal(1),
  toVersion: z.literal(2),
  dryRun: z.boolean(),
  entries: z.array(entityModuleMigrationEntrySchema),
  discardedPendingEntityIds: z.array(entityIdSchema),
  nextContent: z.record(z.string(), editableValueSchema),
});

export type EntityModuleMigrationRequest = z.infer<typeof entityModuleMigrationRequestSchema>;
export type EntityModuleMigrationPlan = z.infer<typeof entityModuleMigrationPlanSchema>;

export function planEntityModuleContentMigration(
  module: EntityModule,
  seeds: Readonly<Record<string, EditableValue>>,
  unchecked: EntityModuleMigrationRequest,
): EntityModuleMigrationPlan {
  const request = entityModuleMigrationRequestSchema.parse(unchecked);
  if (request.pageId !== module.pageId) {
    throw new Error(`Migration page ${request.pageId} does not match module ${module.pageId}.`);
  }
  if (request.mode === 'reset-disposable-local' && request.environment !== 'local') {
    throw new Error('Disposable content reset is only allowed in the local environment.');
  }

  const entityIds = new Set(module.entities.map(({ id }) => id));
  const unresolved = [
    ...new Set(
      request.pendingChanges
        .filter(({ entityId, schemaVersion }) => entityIds.has(entityId) && schemaVersion === 1)
        .map(({ entityId }) => entityId),
    ),
  ].sort();
  if (unresolved.length > 0 && request.mode !== 'reset-disposable-local') {
    throw new Error(
      `${module.pageId} migration refused: unresolved version 1 pending changes exist for ${unresolved.join(', ')}.`,
    );
  }

  const nextContent: Record<string, EditableValue> = { ...request.currentContent };
  const entries = module.entities.map((definition) => {
    const seed = editableValueSchema.parse(seeds[definition.id]);
    definition.schema.parse(seed);
    const existing = request.currentContent[definition.id];
    const preserve = existing !== undefined && definition.schema.safeParse(existing).success;
    if (!preserve) nextContent[definition.id] = seed;
    return {
      entityId: definition.id,
      action: preserve ? ('preserve' as const) : ('replace' as const),
      reason: preserve
        ? `The existing value already satisfies the ${module.pageId} version 2 semantic schema.`
        : `Replace the legacy value with the checked-in semantic ${module.pageId} seed.`,
    };
  });

  return entityModuleMigrationPlanSchema.parse({
    pageId: module.pageId,
    fromVersion: 1,
    toVersion: 2,
    dryRun: request.mode === 'dry-run',
    entries,
    discardedPendingEntityIds: request.mode === 'reset-disposable-local' ? unresolved : [],
    nextContent,
  });
}
