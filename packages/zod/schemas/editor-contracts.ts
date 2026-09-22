import { z } from 'zod';

import { editableValueSchema, entityIdSchema, pageIdSchema } from './content.js';
import type { EntityDefinition } from './registry.js';

const nonEmptyLabelSchema = z.string().trim().min(1).max(160);
const helpTextSchema = z.string().trim().min(1).max(500);
const fieldPathSchema = z.array(z.string().trim().min(1).max(100)).min(1).max(12);
const orderSchema = z.number().int().nonnegative();

export const editorChoiceSchema = z.strictObject({
  value: z.string().trim().min(1).max(200),
  label: nonEmptyLabelSchema,
  helpText: helpTextSchema.optional(),
});

const shortTextControlSchema = z.strictObject({
  type: z.literal('short-text'),
  placeholder: z.string().max(200).optional(),
  maxLength: z.number().int().positive().max(10_000).optional(),
});

const multilineTextControlSchema = z.strictObject({
  type: z.literal('multiline-text'),
  placeholder: z.string().max(200).optional(),
  rows: z.number().int().min(2).max(20),
  maxLength: z.number().int().positive().max(100_000).optional(),
});

const numberControlSchema = z.strictObject({
  type: z.literal('number'),
  display: z.enum(['integer', 'decimal', 'statistic']),
  minimum: z.number().finite().optional(),
  maximum: z.number().finite().optional(),
  step: z.number().positive().finite().optional(),
  suffix: z.string().trim().min(1).max(20).optional(),
});

const booleanControlSchema = z.strictObject({
  type: z.literal('boolean'),
  display: z.enum(['checkbox', 'switch']),
});

const dateControlSchema = z.strictObject({
  type: z.literal('date'),
  minimum: z.iso.date().optional(),
  maximum: z.iso.date().optional(),
});

const emailControlSchema = z.strictObject({
  type: z.literal('email'),
  placeholder: z.string().max(200).optional(),
});

const phoneControlSchema = z.strictObject({
  type: z.literal('phone'),
  country: z.string().trim().length(2),
});

const enumControlSchema = z.strictObject({
  type: z.literal('enum'),
  display: z.enum(['select', 'radio']),
  choices: z.array(editorChoiceSchema).min(1),
});

const iconPickerControlSchema = z.strictObject({
  type: z.literal('icon-picker'),
  choices: z.array(editorChoiceSchema).min(1),
});

const mediaPickerControlSchema = z.strictObject({
  type: z.literal('media-picker'),
  mediaKind: z.literal('image'),
  aspectRatio: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/)
    .optional(),
  altTextPath: fieldPathSchema.optional(),
  supportsFocalPoint: z.boolean(),
});

export const linkDestinationKindSchema = z.enum([
  'page',
  'section',
  'email',
  'phone',
  'managed-file',
  'external-site',
]);

const linkBuilderControlSchema = z.strictObject({
  type: z.literal('link-builder'),
  allowedDestinations: z.array(linkDestinationKindSchema).min(1),
});

const systemControlSchema = z.strictObject({
  type: z.literal('system'),
  immutable: z.literal(true),
});

export const leafEditorControlSchema = z.discriminatedUnion('type', [
  shortTextControlSchema,
  multilineTextControlSchema,
  numberControlSchema,
  booleanControlSchema,
  dateControlSchema,
  emailControlSchema,
  phoneControlSchema,
  enumControlSchema,
  iconPickerControlSchema,
  mediaPickerControlSchema,
  linkBuilderControlSchema,
  systemControlSchema,
]);

export const editorValidationMessagesSchema = z.strictObject({
  required: helpTextSchema.optional(),
  invalid: helpTextSchema,
});

export const leafEditorFieldSchema = z.strictObject({
  path: fieldPathSchema,
  label: nonEmptyLabelSchema,
  helpText: helpTextSchema.optional(),
  required: z.boolean(),
  order: orderSchema,
  validationMessages: editorValidationMessagesSchema,
  control: leafEditorControlSchema,
});

const nestedCollectionControlSchema = z.strictObject({
  type: z.literal('nested-collection'),
  itemLabel: nonEmptyLabelSchema,
  addLabel: nonEmptyLabelSchema,
  itemLabelPath: fieldPathSchema,
  reorderable: z.boolean(),
  minimumItems: z.number().int().nonnegative().optional(),
  maximumItems: z.number().int().positive().optional(),
  blankItem: editableValueSchema,
  itemFields: z.array(leafEditorFieldSchema).min(1),
});

export const editorControlSchema = z.discriminatedUnion('type', [
  ...leafEditorControlSchema.options,
  nestedCollectionControlSchema,
]);

export const editorFieldSchema = z.strictObject({
  path: fieldPathSchema,
  label: nonEmptyLabelSchema,
  helpText: helpTextSchema.optional(),
  required: z.boolean(),
  order: orderSchema,
  validationMessages: editorValidationMessagesSchema,
  control: editorControlSchema,
});

export const editorFieldGroupSchema = z.strictObject({
  id: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9-]*$/),
  label: nonEmptyLabelSchema,
  helpText: helpTextSchema.optional(),
  order: orderSchema,
  fields: z.array(editorFieldSchema).min(1),
});

const editorDefinitionBase = {
  version: z.literal(2),
  label: nonEmptyLabelSchema,
  helpText: helpTextSchema,
  groups: z.array(editorFieldGroupSchema).min(1),
} as const;

export const objectEditorDefinitionSchema = z.strictObject({
  ...editorDefinitionBase,
  kind: z.literal('object'),
});

export const listEditorDefinitionSchema = z.strictObject({
  ...editorDefinitionBase,
  kind: z.literal('list'),
  itemLabel: nonEmptyLabelSchema,
  itemLabelPath: fieldPathSchema,
  addLabel: nonEmptyLabelSchema,
  blankItem: editableValueSchema,
  reorderable: z.boolean(),
});

export const entityEditorDefinitionSchema = z.discriminatedUnion('kind', [
  objectEditorDefinitionSchema,
  listEditorDefinitionSchema,
]);

export const visualRenderSlotSchema = z.strictObject({
  slotId: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  routes: z.array(z.string().trim().regex(/^\//)).min(1),
  regionLabel: nonEmptyLabelSchema.optional(),
});

export const entityEmptyStateSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('not-applicable') }),
  z.strictObject({
    kind: z.literal('editable-empty-state'),
    heading: nonEmptyLabelSchema,
    description: helpTextSchema,
    addLabel: nonEmptyLabelSchema,
  }),
]);

export const entityViewCatalogEntrySchema = z.strictObject({
  entityId: entityIdSchema,
  pageId: pageIdSchema,
  legacyComponent: z.string().trim().min(1).max(300),
  primary: visualRenderSlotSchema,
  secondary: z.array(visualRenderSlotSchema),
  emptyState: entityEmptyStateSchema,
});

export type EditorChoice = z.infer<typeof editorChoiceSchema>;
export type LeafEditorControl = z.infer<typeof leafEditorControlSchema>;
export type EditorValidationMessages = z.infer<typeof editorValidationMessagesSchema>;
export type LeafEditorField = z.infer<typeof leafEditorFieldSchema>;
export type EditorControl = z.infer<typeof editorControlSchema>;
export type EditorField = z.infer<typeof editorFieldSchema>;
export type EditorFieldGroup = z.infer<typeof editorFieldGroupSchema>;
export type EntityEditorDefinition = z.infer<typeof entityEditorDefinitionSchema>;
export type VisualRenderSlot = z.infer<typeof visualRenderSlotSchema>;
export type EntityEmptyState = z.infer<typeof entityEmptyStateSchema>;
export type EntityViewCatalogEntry = z.infer<typeof entityViewCatalogEntrySchema>;

export interface SemanticEntityDefinition extends EntityDefinition {
  readonly editor: EntityEditorDefinition;
}

export interface EntityModule {
  readonly pageId: z.infer<typeof pageIdSchema>;
  readonly entities: readonly SemanticEntityDefinition[];
  readonly viewCatalog: readonly EntityViewCatalogEntry[];
}

export interface AggregatedEntityModules {
  readonly entities: readonly SemanticEntityDefinition[];
  readonly viewCatalog: readonly EntityViewCatalogEntry[];
}

export interface SemanticRegistryStatus {
  readonly migratedEntityIds: readonly string[];
  readonly missingEditorEntityIds: readonly string[];
  readonly missingViewEntityIds: readonly string[];
}

function pathKey(path: readonly string[]): string {
  return path.join('.');
}

function assertUnique(values: readonly string[], description: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${description}: ${value}`);
    seen.add(value);
  }
}

function validateFields(fields: readonly EditorField[], description: string): void {
  assertUnique(
    fields.map(({ path }) => pathKey(path)),
    `${description} field path`,
  );
  assertUnique(
    fields.map(({ order }) => String(order)),
    `${description} field order`,
  );
  for (const field of fields) {
    if (
      field.required &&
      field.control.type !== 'system' &&
      field.validationMessages.required === undefined
    ) {
      throw new Error(
        `${description} required field ${pathKey(field.path)} has no friendly message`,
      );
    }
    if (
      !field.required &&
      field.control.type !== 'system' &&
      field.validationMessages.required !== undefined
    ) {
      throw new Error(
        `${description} optional field ${pathKey(field.path)} has a required message`,
      );
    }
    if (field.control.type === 'enum' || field.control.type === 'icon-picker') {
      assertUnique(
        field.control.choices.map(({ value }) => value),
        `${description} ${pathKey(field.path)} choice value`,
      );
    }
    if (field.control.type === 'link-builder') {
      assertUnique(
        field.control.allowedDestinations,
        `${description} ${pathKey(field.path)} link destination`,
      );
    }
    if (field.control.type !== 'nested-collection') continue;
    assertUnique(
      field.control.itemFields.map(({ path }) => pathKey(path)),
      `${description} nested field path`,
    );
    assertUnique(
      field.control.itemFields.map(({ order }) => String(order)),
      `${description} nested field order`,
    );
    if (
      field.control.minimumItems !== undefined &&
      field.control.maximumItems !== undefined &&
      field.control.minimumItems > field.control.maximumItems
    ) {
      throw new Error(`${description} ${pathKey(field.path)} has an invalid item range`);
    }
  }
}

export function validateEditorDefinition(definition: SemanticEntityDefinition): void {
  const editor = entityEditorDefinitionSchema.parse(definition.editor);
  if (editor.kind !== definition.kind) {
    throw new Error(`Entity ${definition.id} editor kind does not match entity kind`);
  }
  assertUnique(
    editor.groups.map(({ id }) => id),
    `${definition.id} editor group ID`,
  );
  assertUnique(
    editor.groups.map(({ order }) => String(order)),
    `${definition.id} editor group order`,
  );
  const allFieldPaths: string[] = [];
  for (const group of editor.groups) {
    validateFields(group.fields, `${definition.id}.${group.id}`);
    allFieldPaths.push(...group.fields.map(({ path }) => pathKey(path)));
  }
  assertUnique(allFieldPaths, `${definition.id} editor field path`);
  if (editor.kind === 'list') {
    if (definition.listItemSchema === undefined) {
      throw new Error(`Entity ${definition.id} list editor has no list item schema`);
    }
    definition.listItemSchema.parse(editor.blankItem);
  }
}

export function defineSemanticEntity(
  definition: EntityDefinition & { readonly editor: EntityEditorDefinition },
): SemanticEntityDefinition {
  const normalized = {
    ...definition,
    editor: entityEditorDefinitionSchema.parse(definition.editor),
  };
  validateEditorDefinition(normalized);
  return normalized;
}

export function isSemanticEntityDefinition(
  definition: EntityDefinition,
): definition is SemanticEntityDefinition {
  return definition.editor !== undefined;
}

export function semanticRegistryStatus(
  definitions: readonly EntityDefinition[],
  catalog: readonly EntityViewCatalogEntry[],
): SemanticRegistryStatus {
  const viewIds = new Set(catalog.map(({ entityId }) => entityId));
  return {
    migratedEntityIds: definitions
      .filter(isSemanticEntityDefinition)
      .map(({ id }) => id)
      .sort(),
    missingEditorEntityIds: definitions
      .filter((definition) => !isSemanticEntityDefinition(definition))
      .map(({ id }) => id)
      .sort(),
    missingViewEntityIds: definitions
      .filter(({ id }) => !viewIds.has(id))
      .map(({ id }) => id)
      .sort(),
  };
}

export function validateEntityViewCatalog(
  definitions: readonly EntityDefinition[],
  uncheckedCatalog: readonly EntityViewCatalogEntry[],
  coverage: 'partial' | 'complete' = 'partial',
): void {
  const catalog = uncheckedCatalog.map((entry) => entityViewCatalogEntrySchema.parse(entry));
  assertUnique(
    catalog.map(({ entityId }) => entityId),
    'view catalog entity ID',
  );
  for (const definition of definitions.filter(isSemanticEntityDefinition)) {
    validateEditorDefinition(definition);
  }
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const allSlotIds: string[] = [];
  for (const entry of catalog) {
    const definition = definitionById.get(entry.entityId);
    if (definition === undefined) throw new Error(`Unknown view catalog entity: ${entry.entityId}`);
    if (definition.pageId !== entry.pageId) {
      throw new Error(`View catalog page does not match entity ${entry.entityId}`);
    }
    if (!isSemanticEntityDefinition(definition)) {
      throw new Error(`View catalog entity ${entry.entityId} has no semantic editor definition`);
    }
    validateEditorDefinition(definition);
    if ((definition.kind === 'list') !== (entry.emptyState.kind === 'editable-empty-state')) {
      throw new Error(`View catalog empty state does not match entity kind for ${entry.entityId}`);
    }
    for (const slot of [entry.primary, ...entry.secondary]) {
      assertUnique(slot.routes, `${slot.slotId} route`);
    }
    allSlotIds.push(entry.primary.slotId, ...entry.secondary.map(({ slotId }) => slotId));
  }
  assertUnique(allSlotIds, 'visual slot ID');
  if (coverage === 'complete') {
    const status = semanticRegistryStatus(definitions, catalog);
    if (status.missingEditorEntityIds.length > 0 || status.missingViewEntityIds.length > 0) {
      throw new Error(
        `Semantic registry is incomplete: ${String(status.missingEditorEntityIds.length)} editor definitions and ${String(status.missingViewEntityIds.length)} visual slots missing`,
      );
    }
  }
}

export function defineEntityModule(module: EntityModule): EntityModule {
  for (const definition of module.entities) {
    if (definition.pageId !== module.pageId) {
      throw new Error(`Entity ${definition.id} does not belong to module ${module.pageId}`);
    }
    validateEditorDefinition(definition);
  }
  validateEntityViewCatalog(module.entities, module.viewCatalog, 'complete');
  return module;
}

export function aggregateEntityModules(
  modules: readonly EntityModule[],
  options: {
    readonly coverage: 'partial' | 'complete';
    readonly registry?: readonly EntityDefinition[];
  },
): AggregatedEntityModules {
  assertUnique(
    modules.map(({ pageId }) => pageId),
    'entity module page ID',
  );
  const entities = modules.flatMap(({ entities: entries }) => entries);
  const viewCatalog = modules.flatMap(({ viewCatalog: entries }) => entries);
  assertUnique(
    entities.map(({ id }) => id),
    'semantic entity ID',
  );
  const registry = options.registry ?? entities;
  validateEntityViewCatalog(registry, viewCatalog, options.coverage);
  return { entities, viewCatalog };
}

export function mergeEntityModules(
  baseDefinitions: readonly EntityDefinition[],
  modules: readonly EntityModule[],
): readonly EntityDefinition[] {
  const aggregated = aggregateEntityModules(modules, { coverage: 'partial' });
  const baseById = new Map(baseDefinitions.map((definition) => [definition.id, definition]));
  for (const definition of aggregated.entities) {
    const base = baseById.get(definition.id);
    if (base === undefined) throw new Error(`Unknown semantic entity ID: ${definition.id}`);
    if (base.pageId !== definition.pageId || base.kind !== definition.kind) {
      throw new Error(`Semantic entity ${definition.id} changes its page or kind`);
    }
    baseById.set(definition.id, definition);
  }
  return baseDefinitions.map(({ id }) => {
    const definition = baseById.get(id);
    if (definition === undefined) throw new Error(`Missing base entity ID: ${id}`);
    return definition;
  });
}
