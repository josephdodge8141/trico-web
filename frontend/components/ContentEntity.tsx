import {
  editableValueSchema,
  type EditableValue,
  type SemanticEntityDefinition,
} from '@app/schemas';

import { useEditMode } from '../context/editMode.js';
import { EditableBoundary, type EditorOwnership } from './EditableBoundary.js';
import { EditableCollection } from './EditableCollection.js';

function ownershipFor(
  id: string,
  pending: ReturnType<typeof useEditMode>['pending'],
  currentUserId: string | undefined,
): EditorOwnership {
  const change = pending.find((entry) => entry.entityId === id);
  return change === undefined ? 'available' : change.authorId === currentUserId ? 'mine' : 'other';
}

export function ContentEntity({
  definition,
  value,
  children,
}: {
  readonly definition: SemanticEntityDefinition;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <EditableBoundary
      active={editing.active}
      definition={definition}
      value={editableValueSchema.parse(value)}
      ownership={ownershipFor(definition.id, editing.pending, editing.currentUserId)}
      busy={editing.busy}
      onSave={(next) => editing.save(definition.id, next)}
      onReloadLatest={() => editing.reload(definition.id)}
    >
      {children}
    </EditableBoundary>
  );
}

export function ContentCollection({
  definition,
  value,
  renderItem,
  itemsElement,
  itemsClassName,
}: {
  readonly definition: SemanticEntityDefinition;
  readonly value: readonly EditableValue[];
  readonly renderItem: (item: EditableValue, index: number) => React.ReactNode;
  readonly itemsElement?: 'div' | 'ol' | 'ul';
  readonly itemsClassName?: string;
}): React.JSX.Element {
  const editing = useEditMode();
  return (
    <EditableCollection
      active={editing.active}
      {...(itemsElement === undefined ? {} : { itemsElement })}
      {...(itemsClassName === undefined ? {} : { itemsClassName })}
      definition={definition}
      value={value}
      renderItem={renderItem}
      ownership={ownershipFor(definition.id, editing.pending, editing.currentUserId)}
      busy={editing.busy}
      onSave={(next) => editing.save(definition.id, next)}
      onReloadLatest={() => editing.reload(definition.id)}
    />
  );
}
