import { useEffect, useState } from 'react';

import { useEditMode } from '../context/editMode.js';

export function EditableEntity({
  entityId,
  value,
  children,
}: {
  readonly entityId: string;
  readonly value: unknown;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const editing = useEditMode();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const pending = editing.pending.find((change) => change.entityId === entityId);
  useEffect(
    () => setDraft(JSON.stringify(pending?.replacementValue ?? value, null, 2)),
    [pending?.replacementValue, value],
  );

  const save = (): void => {
    try {
      const parsed: unknown = JSON.parse(draft);
      void editing
        .save(entityId, parsed)
        .then(() => setOpen(false))
        .catch(() => undefined);
    } catch {
      setDraft((current) => current);
    }
  };

  return (
    <div className={editing.active ? 'editable-entity' : undefined} data-entity-id={entityId}>
      {editing.active ? (
        <div className="entity-controls">
          <span>{entityId}</span>
          {pending === undefined ? null : (
            <span className="status-pill">revision {pending.revision}</span>
          )}
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            disabled={editing.busy}
          >
            {open ? 'Close' : pending === undefined ? 'Edit' : 'Update edit'}
          </button>
          {pending === undefined ? null : (
            <button
              type="button"
              onClick={() => void editing.togglePreview(entityId)}
              disabled={editing.busy}
            >
              {editing.disabledEntityIds.has(entityId) ? 'Show in preview' : 'Hide from preview'}
            </button>
          )}
          {pending === undefined ? null : (
            <button
              type="button"
              onClick={() => void editing.discard(entityId)}
              disabled={editing.busy}
            >
              Discard
            </button>
          )}
        </div>
      ) : null}
      {open ? (
        <div className="entity-editor">
          <label htmlFor={`editor-${entityId}`}>Complete entity JSON</label>
          <textarea
            id={`editor-${entityId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={12}
            spellCheck={false}
          />
          <div className="editor-actions">
            <button className="button primary" type="button" onClick={save} disabled={editing.busy}>
              Save
            </button>
            <button className="button quiet" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
