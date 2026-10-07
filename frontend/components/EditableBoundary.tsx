import { lazy, Suspense, useState } from 'react';

import type { EditableValue, SemanticEntityDefinition } from '@app/schemas';

import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import type { EditorLinkChoice, EditorMediaChoice } from './SemanticEditorForm.js';

export type EditorOwnership = 'available' | 'mine' | 'other';

const EditorSheet = lazy(() =>
  import('./EditorSheet.js').then(({ EditorSheet }) => ({ default: EditorSheet })),
);

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
      data-slot="editable-boundary"
      className={
        active
          ? 'relative rounded-lg outline outline-2 outline-dashed outline-primary/40 outline-offset-2'
          : 'contents'
      }
      data-entity-boundary="true"
      data-editor-state={active ? ownership : undefined}
    >
      {children}
      {active ? (
        <div className="absolute right-2 top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-1 shadow-md">
          {ownership === 'mine' ? <Badge variant="secondary">Unpublished change</Badge> : null}
          {locked ? (
            <Badge variant="secondary">Another editor is updating this section.</Badge>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11"
              onClick={() => setOpen(true)}
              disabled={busy}
              aria-label={`Edit ${definition.editor.label}`}
            >
              Edit {definition.editor.label}
            </Button>
          )}
        </div>
      ) : null}
      {open ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}
    </div>
  );
}
