import { editableValueSchema, type SemanticEntityDefinition } from '@app/schemas';

import { useEditMode } from '../context/editMode.js';
import { EditableBoundary, type EditorOwnership } from './EditableBoundary.js';

/** Context-connected bridge retained while page compositions adopt semantic definitions. */
export function EditableEntity({
  entityId,
  definition,
  value,
  ownership,
  children,
}: {
  readonly entityId: string;
  readonly definition?: SemanticEntityDefinition;
  readonly value: unknown;
  readonly ownership?: EditorOwnership;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  const pending = editing.pending.find((change) => change.entityId === entityId);
  if (definition === undefined) {
    return (
      <div
        className={editing.active ? 'editable-boundary editor-contract-pending' : undefined}
        data-entity-boundary="true"
      >
        {children}
        {editing.active ? (
          <div className="editable-boundary-controls">
            <span className="editor-ownership-label">
              This section's friendly editing form is being prepared.
            </span>
          </div>
        ) : null}
      </div>
    );
  }
  const semanticValue = editableValueSchema.parse(value);
  return (
    <EditableBoundary
      active={editing.active}
      definition={definition}
      value={semanticValue}
      ownership={ownership ?? (pending === undefined ? 'available' : 'mine')}
      busy={editing.busy}
      onSave={(next) => editing.save(entityId, next)}
    >
      {children}
    </EditableBoundary>
  );
}
