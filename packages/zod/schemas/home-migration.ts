import { z } from 'zod';

import { editableValueSchema, entityIdSchema, type EditableValue } from './content.js';
import { homeEntityDefinitions, HOME_CONTENT_SCHEMA_VERSION } from './home.js';
import { homeV2SeedData } from '../seeds/home.js';

export const homeMigrationModeSchema = z.enum([
  'dry-run',
  'prepare-apply',
  'reset-disposable-local',
]);

export const homeMigrationRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  environment: z.enum(['local', 'preview', 'dev', 'production']),
  mode: homeMigrationModeSchema,
  currentContent: z.record(z.string(), editableValueSchema),
  pendingChanges: z.array(
    z.strictObject({
      entityId: entityIdSchema,
      schemaVersion: z.union([z.literal(1), z.literal(2)]),
    }),
  ),
});

export const homeMigrationEntrySchema = z.strictObject({
  entityId: entityIdSchema,
  action: z.enum(['replace', 'preserve']),
  reason: z.string().trim().min(1).max(500),
});

export const homeMigrationPlanSchema = z.strictObject({
  fromVersion: z.literal(1),
  toVersion: z.literal(HOME_CONTENT_SCHEMA_VERSION),
  dryRun: z.boolean(),
  entries: z.array(homeMigrationEntrySchema).length(18),
  discardedPendingEntityIds: z.array(entityIdSchema),
  nextContent: z.record(z.string(), editableValueSchema),
});

export type HomeMigrationRequest = z.infer<typeof homeMigrationRequestSchema>;
export type HomeMigrationPlan = z.infer<typeof homeMigrationPlanSchema>;

export function planHomeContentMigration(unchecked: HomeMigrationRequest): HomeMigrationPlan {
  const request = homeMigrationRequestSchema.parse(unchecked);
  if (request.mode === 'reset-disposable-local' && request.environment !== 'local') {
    throw new Error('Disposable content reset is only allowed in the local environment.');
  }

  const homeIds = new Set(homeEntityDefinitions.map(({ id }) => id));
  const unresolved = [
    ...new Set(
      request.pendingChanges
        .filter(({ entityId, schemaVersion }) => homeIds.has(entityId) && schemaVersion === 1)
        .map(({ entityId }) => entityId),
    ),
  ].sort();
  if (unresolved.length > 0 && request.mode !== 'reset-disposable-local') {
    throw new Error(
      `Home migration refused: unresolved version 1 pending changes exist for ${unresolved.join(', ')}.`,
    );
  }

  const nextContent: Record<string, EditableValue> = { ...request.currentContent };
  const entries = homeEntityDefinitions.map((definition) => {
    const seed = homeV2SeedData[definition.id as keyof typeof homeV2SeedData];
    const existing = request.currentContent[definition.id];
    const preservesVersionTwo =
      existing !== undefined && definition.schema.safeParse(existing).success;
    if (!preservesVersionTwo) nextContent[definition.id] = seed;
    return {
      entityId: definition.id,
      action: preservesVersionTwo ? ('preserve' as const) : ('replace' as const),
      reason: preservesVersionTwo
        ? 'The existing value already satisfies the Home version 2 semantic schema.'
        : 'Replace the legacy extraction wrapper with the checked-in semantic Home seed.',
    };
  });

  return homeMigrationPlanSchema.parse({
    fromVersion: 1,
    toVersion: HOME_CONTENT_SCHEMA_VERSION,
    dryRun: request.mode === 'dry-run',
    entries,
    discardedPendingEntityIds: request.mode === 'reset-disposable-local' ? unresolved : [],
    nextContent,
  });
}
