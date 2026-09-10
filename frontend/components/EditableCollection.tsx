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

interface DeletedItem {
  readonly index: number;
  readonly value: EditableValue;
  readonly label: string;
}

export interface EditableCollectionProps {
  readonly active: boolean;
  readonly definition: SemanticEntityDefinition;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
  readonly ownership?: EditorOwnership;
  readonly busy?: boolean;
  readonly mediaChoices?: readonly EditorMediaChoice[];
  readonly linkChoices?: readonly EditorLinkChoice[];
  readonly createItemId?: () => string;
  readonly onSave: (value: readonly EditableValue[]) => Promise<void>;
}

function withFreshIdentity(value: EditableValue, createItemId: () => string): EditableValue {
  if (!isEditableRecord(value) || !('id' in value)) return structuredClone(value);
  return { ...structuredClone(value), id: createItemId() };
}

export function EditableCollection({
  active,
  definition,
  value,
  renderItem,
  ownership = 'available',
  busy = false,
  mediaChoices,
  linkChoices,
  createItemId = () => crypto.randomUUID(),
  onSave,
}: EditableCollectionProps): React.JSX.Element {
  const editor = definition.editor;
  if (editor.kind !== 'list')
    throw new Error('EditableCollection requires a list editor definition');
  if (definition.listItemSchema === undefined)
    throw new Error('EditableCollection requires an item schema');
  const [selection, setSelection] = useState<Selection>();
  const [deleted, setDeleted] = useState<DeletedItem>();
  const dragIndex = useRef<number | undefined>(undefined);
  const locked = ownership === 'other';

  useEffect(() => {
    if (deleted === undefined) return;
    const timer = window.setTimeout(() => setDeleted(undefined), 8_000);
    return () => window.clearTimeout(timer);
  }, [deleted]);

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
  };

  const saveSelection = async (item: EditableValue): Promise<void> => {
    if (selection === undefined) return;
    if (selection.mode === 'add') await saveList([...value, item]);
    else
      await saveList(value.map((current, index) => (index === selection.index ? item : current)));
  };

  const remove = (index: number): void => {
    const item = value[index];
    if (item === undefined) return;
    const label = labelFor(item, index);
    if (!window.confirm(`Delete ${label}? You can undo this for a short time.`)) return;
    void saveList(value.filter((_, itemIndex) => itemIndex !== index))
      .then(() => setDeleted({ index, value: item, label }))
      .catch(() => undefined);
  };

  const move = (index: number, direction: -1 | 1): void => {
    const destination = index + direction;
    if (destination < 0 || destination >= value.length) return;
    const next = [...value];
    [next[index], next[destination]] = [next[destination] ?? null, next[index] ?? null];
    void saveList(next).catch(() => undefined);
  };

  const drop = (destination: number): void => {
    const source = dragIndex.current;
    dragIndex.current = undefined;
    if (source === undefined || source === destination) return;
    const next = [...value];
    const [moved] = next.splice(source, 1);
    if (moved === undefined) return;
    next.splice(destination, 0, moved);
    void saveList(next).catch(() => undefined);
  };

  return (
    <div
      className={active ? 'editable-collection' : undefined}
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
        {value.map((item, index) => {
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
              lastIndex={value.length - 1}
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
              index: value.length,
              value: withFreshIdentity(editor.blankItem, createItemId),
            })
          }
        >
          + {editor.addLabel}
        </button>
      ) : null}
      {deleted === undefined ? null : (
        <div className="editor-undo" role="status">
          <span>{deleted.label} deleted.</span>
          <button
            type="button"
            onClick={() => {
              const next = [...value];
              next.splice(deleted.index, 0, deleted.value);
              void saveList(next)
                .then(() => setDeleted(undefined))
                .catch(() => undefined);
            }}
          >
            Undo
          </button>
        </div>
      )}
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
          onClose={() => setSelection(undefined)}
        />
      )}
    </div>
  );
}
