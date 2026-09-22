import { useEffect, useRef, useState } from 'react';

import {
  editableValueSchema,
  type EditableValue,
  type SemanticEntityDefinition,
} from '@app/schemas';

import { EditorSheet } from './EditorSheet.js';
import { EditableItem } from './EditableItem.js';
import type { EditorLinkChoice, EditorMediaChoice } from './SemanticEditorForm.js';
import { isEditableRecord, readEditorValue } from './editorValue.js';
import type { EditorOwnership } from './EditableBoundary.js';

interface Selection {
  readonly mode: 'add' | 'edit';
  readonly index: number;
  readonly value: EditableValue;
}

interface UndoState {
  readonly value: readonly EditableValue[];
  readonly message: string;
}

export interface EditableCollectionProps {
  readonly active: boolean;
  readonly layout?: 'natural' | 'fill';
  readonly definition: SemanticEntityDefinition;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
  readonly ownership?: EditorOwnership;
  readonly busy?: boolean;
  readonly mediaChoices?: readonly EditorMediaChoice[];
  readonly linkChoices?: readonly EditorLinkChoice[];
  readonly createItemId?: () => string;
  readonly onSave: (value: readonly EditableValue[]) => Promise<void>;
  readonly onReloadLatest?: () => Promise<EditableValue>;
}

function withFreshIdentity(value: EditableValue, createItemId: () => string): EditableValue {
  if (!isEditableRecord(value) || !('id' in value)) return structuredClone(value);
  return { ...structuredClone(value), id: createItemId() };
}

export function EditableCollection({
  active,
  layout = 'natural',
  definition,
  value,
  renderItem,
  ownership = 'available',
  busy = false,
  mediaChoices,
  linkChoices,
  createItemId = () => crypto.randomUUID(),
  onSave,
  onReloadLatest,
}: EditableCollectionProps): React.JSX.Element {
  const editor = definition.editor;
  if (editor.kind !== 'list')
    throw new Error('EditableCollection requires a list editor definition');
  if (definition.listItemSchema === undefined)
    throw new Error('EditableCollection requires an item schema');
  const [selection, setSelection] = useState<Selection>();
  const [undo, setUndo] = useState<UndoState>();
  const [displayValue, setDisplayValue] = useState<readonly EditableValue[]>(value);
  const [operationError, setOperationError] = useState(false);
  const dragIndex = useRef<number | undefined>(undefined);
  const locked = ownership === 'other';

  useEffect(() => {
    if (undo === undefined) return;
    const timer = window.setTimeout(() => setUndo(undefined), 8_000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  useEffect(() => setDisplayValue(value), [value]);

  const labelFor = (item: EditableValue, index: number): string => {
    const candidate = readEditorValue(item, editor.itemLabelPath);
    return typeof candidate === 'string' && candidate.trim() !== ''
      ? candidate
      : `${editor.itemLabel} ${String(index + 1)}`;
  };

  const saveList = async (next: readonly EditableValue[]): Promise<void> => {
    const parsed = definition.schema.parse(next);
    const valueToSave = editableValueSchema.parse(parsed);
    if (!Array.isArray(valueToSave)) throw new Error('The collection schema must return a list');
    await onSave(valueToSave);
    setDisplayValue(valueToSave);
    setOperationError(false);
  };

  const saveSelection = async (item: EditableValue): Promise<void> => {
    if (selection === undefined) return;
    if (selection.mode === 'add') await saveList([...displayValue, item]);
    else
      await saveList(
        displayValue.map((current, index) => (index === selection.index ? item : current)),
      );
  };

  const remove = (index: number): void => {
    const item = displayValue[index];
    if (item === undefined) return;
    const label = labelFor(item, index);
    if (!window.confirm(`Delete ${label}? You can undo this for a short time.`)) return;
    void saveList(displayValue.filter((_, itemIndex) => itemIndex !== index))
      .then(() => setUndo({ value: structuredClone(displayValue), message: `${label} deleted.` }))
      .catch(() => setOperationError(true));
  };

  const move = (index: number, direction: -1 | 1): void => {
    const destination = index + direction;
    if (destination < 0 || destination >= displayValue.length) return;
    const next = [...displayValue];
    [next[index], next[destination]] = [next[destination] ?? null, next[index] ?? null];
    void saveList(next)
      .then(() => setUndo({ value: structuredClone(displayValue), message: 'Order updated.' }))
      .catch(() => setOperationError(true));
  };

  const drop = (destination: number): void => {
    const source = dragIndex.current;
    dragIndex.current = undefined;
    if (source === undefined || source === destination) return;
    const next = [...displayValue];
    const [moved] = next.splice(source, 1);
    if (moved === undefined) return;
    next.splice(destination, 0, moved);
    void saveList(next)
      .then(() => setUndo({ value: structuredClone(displayValue), message: 'Order updated.' }))
      .catch(() => setOperationError(true));
  };

  return (
    <div
      className={active || layout === 'fill' ? 'editable-collection' : undefined}
      data-collection-layout={layout === 'fill' ? 'fill' : undefined}
      data-editor-state={active ? ownership : undefined}
    >
      {ownership === 'mine' && active ? (
        <span className="editor-pending-label collection-pending">Unpublished changes</span>
      ) : null}
      {locked && active ? (
        <p className="editor-ownership-label collection-locked">
          Another editor is updating this section.
        </p>
      ) : null}
      <div className="editable-collection-items">
        {displayValue.map((item, index) => {
          const label = labelFor(item, index);
          return (
            <EditableItem
              key={
                isEditableRecord(item) && typeof item['id'] === 'string'
                  ? item['id']
                  : `${label}-${String(index)}`
              }
              active={active}
              label={label}
              index={index}
              lastIndex={displayValue.length - 1}
              disabled={busy || locked}
              reorderable={editor.reorderable}
              onEdit={() => setSelection({ mode: 'edit', index, value: structuredClone(item) })}
              onDelete={() => remove(index)}
              onMove={(direction) => move(index, direction)}
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDrop={() => drop(index)}
            >
              {renderItem(item, index)}
            </EditableItem>
          );
        })}
      </div>
      {active && !locked ? (
        <button
          className="editable-collection-add"
          type="button"
          disabled={busy}
          onClick={() =>
            setSelection({
              mode: 'add',
              index: displayValue.length,
              value: withFreshIdentity(editor.blankItem, createItemId),
            })
          }
        >
          + {editor.addLabel}
        </button>
      ) : null}
      {undo === undefined ? null : (
        <div className="editor-undo" role="status">
          <span>{undo.message}</span>
          <button
            type="button"
            onClick={() => {
              void saveList(undo.value)
                .then(() => setUndo(undefined))
                .catch(() => setOperationError(true));
            }}
          >
            Undo
          </button>
        </div>
      )}
      {operationError ? (
        <p className="editor-error" role="alert">
          We could not save this collection change. Please try again.
        </p>
      ) : null}
      {selection === undefined ? null : (
        <EditorSheet
          title={
            selection.mode === 'add'
              ? editor.addLabel
              : `Edit ${labelFor(selection.value, selection.index)}`
          }
          description={editor.helpText}
          definition={editor}
          schema={definition.listItemSchema}
          initialValue={selection.value}
          busy={busy}
          {...(mediaChoices === undefined ? {} : { mediaChoices })}
          {...(linkChoices === undefined ? {} : { linkChoices })}
          onSave={saveSelection}
          {...(onReloadLatest === undefined
            ? {}
            : {
                onReloadLatest: async () => {
                  const latest = await onReloadLatest();
                  if (!Array.isArray(latest))
                    throw new Error('The latest saved collection is unavailable.');
                  const item = latest[selection.index];
                  if (item === undefined)
                    throw new Error('This item is no longer in the latest saved collection.');
                  return editableValueSchema.parse(item);
                },
              })}
          onClose={() => setSelection(undefined)}
        />
      )}
    </div>
  );
}
