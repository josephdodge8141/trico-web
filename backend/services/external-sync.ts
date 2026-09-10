import { entityDefinitions, type EditableValue, type ScheduledSyncEvent } from '@app/schemas';

import type { AiConnection } from '../config/ai.js';
import { boundedPublicFetch } from '../config/external-http.js';
import type { ContentService } from './content.js';
import type { ExternalSourceService } from './external-sources.js';

const SYSTEM_EDITOR_ID = '00000000-0000-4000-8000-000000000001';

export interface ExternalSyncResult {
  readonly changedEntities: number;
  readonly skippedEntities: number;
  readonly failures: readonly { entityId: string; message: string }[];
}

export interface ExternalSyncService {
  run(event: ScheduledSyncEvent): Promise<ExternalSyncResult>;
}

export function createExternalSyncService(
  sources: ExternalSourceService,
  content: ContentService,
  ai: AiConnection,
  fetchSource: (url: string) => Promise<string> = boundedPublicFetch,
): ExternalSyncService {
  return {
    run: async (event) => {
      const definitions =
        event.pageId === undefined
          ? entityDefinitions
          : entityDefinitions.filter((definition) => definition.pageId === event.pageId);
      const pending = await content.pending(event.pageId);
      const locked = new Set(pending.map((change) => change.entityId));
      const failures: { entityId: string; message: string }[] = [];
      let changedEntities = 0;
      let skippedEntities = 0;
      for (const definition of definitions.filter((entry) => entry.kind === 'list')) {
        const mappings = (await sources.list(definition.id)).filter((source) => source.enabled);
        if (mappings.length === 0) continue;
        if (locked.has(definition.id)) {
          skippedEntities += 1;
          continue;
        }
        const page = await content.page(definition.pageId);
        const current = page[definition.id];
        if (!Array.isArray(current)) continue;
        const replacements = new Map<string, EditableValue>();
        for (const source of mappings) {
          const currentItem = current.find(
            (candidate) =>
              typeof candidate === 'object' &&
              candidate !== null &&
              Reflect.get(candidate, 'id') === source.itemId,
          );
          if (currentItem === undefined) continue;
          try {
            const sourceText = await fetchSource(source.url);
            if (source.validationFields.every((token) => sourceText.includes(token))) continue;
            replacements.set(
              source.itemId,
              await ai.synthesize({
                sourceUrl: source.url,
                sourceText,
                validationFields: source.validationFields,
                currentItem,
              }),
            );
          } catch (error: unknown) {
            failures.push({
              entityId: definition.id,
              message: error instanceof Error ? error.message : 'Unknown synchronization error',
            });
          }
        }
        if (replacements.size === 0) continue;
        const replacement = current.map((candidate) => {
          if (typeof candidate !== 'object' || candidate === null) return candidate;
          const id = Reflect.get(candidate, 'id');
          return typeof id === 'string' ? (replacements.get(id) ?? candidate) : candidate;
        });
        try {
          const change = await content.createChange(definition.id, SYSTEM_EDITOR_ID, replacement);
          await content.publish(
            [{ entityId: definition.id, expectedRevision: change.revision }],
            SYSTEM_EDITOR_ID,
            'AUTO_SYNC',
          );
          changedEntities += 1;
        } catch (error: unknown) {
          failures.push({
            entityId: definition.id,
            message:
              error instanceof Error ? error.message : 'Synchronization lost a concurrent update',
          });
        }
      }
      return { changedEntities, skippedEntities, failures };
    },
  };
}
