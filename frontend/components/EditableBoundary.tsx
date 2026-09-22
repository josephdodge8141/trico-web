import { useState } from 'react';

import type { EditableValue, SemanticEntityDefinition } from '@app/schemas';

import { EditorSheet } from './EditorSheet.js';
import type { EditorLinkChoice, EditorMediaChoice } from './SemanticEditorForm.js';

export type EditorOwnership = 'available' | 'mine' | 'other';

export interface EditableBoundaryProps {
  readonly active: boolean;
  readonly definition: SemanticEntityDefinition;
  readonly value: EditableValue;
  readonly children: React.ReactNode;
  readonly ownership?: EditorOwnership;
  readonly busy?: boolean;
  readonly mediaChoices?: readonly EditorMediaChoice[];
  readonly linkChoices?: readonly EditorLinkChoice[];
  readonly onSave: (value: EditableValue) => Promise<void>;
  readonly onReloadLatest?: () => Promise<EditableValue>;
}

export function EditableBoundary({
  active,
  definition,
  value,
  children,
  ownership = 'available',
  busy = false,
  mediaChoices,
  linkChoices,
  onSave,
  onReloadLatest,
}: EditableBoundaryProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const locked = ownership === 'other';
  return (
    <div
      className={active ? 'editable-boundary' : undefined}
      data-entity-boundary="true"
      data-editor-state={active ? ownership : undefined}
    >
      {children}
      {active ? (
        <div className="editable-boundary-controls">
          {ownership === 'mine' ? (
            <span className="editor-pending-label">Unpublished change</span>
          ) : null}
          {locked ? (
            <span className="editor-ownership-label">Another editor is updating this section.</span>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={busy}
              aria-label={`Edit ${definition.editor.label}`}
            >
              <span aria-hidden="true">✎</span> Edit {definition.editor.label}
            </button>
          )}
        </div>
      ) : null}
      {open ? (
        <EditorSheet
          title={definition.editor.label}
          description={definition.editor.helpText}
          definition={definition.editor}
          schema={definition.schema}
          initialValue={value}
          busy={busy}
          {...(mediaChoices === undefined ? {} : { mediaChoices })}
          {...(linkChoices === undefined ? {} : { linkChoices })}
          onSave={onSave}
          {...(onReloadLatest === undefined ? {} : { onReloadLatest })}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
