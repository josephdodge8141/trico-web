import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  editableValueSchema,
  type EditableValue,
  type EditorField,
  type EntityEditorDefinition,
} from '@app/schemas';
import type { z } from 'zod';

import {
  type EditorLinkChoice,
  type EditorMediaChoice,
  SemanticEditorForm,
} from './SemanticEditorForm.js';
import { editorValuesEqual, fieldForIssue, fieldKey } from './editorValue.js';

export interface EditorSheetProps {
  readonly title: string;
  readonly description: string;
  readonly definition: EntityEditorDefinition;
  readonly schema: z.ZodType;
  readonly initialValue: EditableValue;
  readonly busy?: boolean;
  readonly mediaChoices?: readonly EditorMediaChoice[];
  readonly linkChoices?: readonly EditorLinkChoice[];
  readonly onRequestMedia?: (field: EditorField) => void;
  readonly onSave: (value: EditableValue) => Promise<void>;
  readonly onClose: () => void;
  readonly onReloadLatest?: () => Promise<EditableValue>;
  readonly isConflict?: (error: unknown) => boolean;
}

function isConflictByStatus(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 409;
}

export function EditorSheet({
  title,
  description,
  definition,
  schema,
  initialValue,
  busy = false,
  mediaChoices,
  linkChoices,
  onRequestMedia,
  onSave,
  onClose,
  onReloadLatest,
  isConflict = isConflictByStatus,
}: EditorSheetProps): React.JSX.Element {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<EditableValue>(() => structuredClone(initialValue));
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const dirty = !editorValuesEqual(draft, initialValue);

  const requestClose = useCallback((): void => {
    if (dirty && !window.confirm('Discard the changes you have not saved?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input, textarea, select, button',
    );
    focusable?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') requestClose();
      if (event.key !== 'Tab' || panelRef.current === null) return;
      const controls = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => !element.hasAttribute('disabled'));
      const first = controls[0];
      const last = controls.at(-1);
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [requestClose]);

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setConflict(false);
    setSaveError(false);
    const result = schema.safeParse(draft);
    if (!result.success) {
      const fields = definition.groups.flatMap(({ fields: entries }) => entries);
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = fieldForIssue(fields, issue.path);
        if (field === undefined) continue;
        const key = fieldKey(field.path);
        if (nextErrors[key] !== undefined) continue;
        const fieldValue = issue.path.length === 0 ? draft : issue.input;
        const missing = fieldValue === undefined || fieldValue === null || fieldValue === '';
        nextErrors[key] =
          missing && field.validationMessages.required !== undefined
            ? field.validationMessages.required
            : field.validationMessages.invalid;
      }
      setErrors(nextErrors);
      window.setTimeout(() =>
        panelRef.current
          ?.querySelector<HTMLElement>(
            '[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select, [data-invalid="true"] button',
          )
          ?.focus(),
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSave(editableValueSchema.parse(result.data));
      onClose();
    } catch (error) {
      if (isConflict(error)) setConflict(true);
      else setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const reload = async (): Promise<void> => {
    if (onReloadLatest === undefined) return;
    const latest = await onReloadLatest();
    setDraft(structuredClone(latest));
    setConflict(false);
    setErrors({});
  };

  return createPortal(
    <div className="editor-sheet-layer">
      <button
        className="editor-sheet-backdrop"
        type="button"
        aria-label="Close editor"
        onClick={requestClose}
      />
      <div
        className="editor-sheet"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header>
          <div>
            <p className="editor-sheet-kicker">Editing this section</p>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
          <button
            type="button"
            className="editor-sheet-close"
            onClick={requestClose}
            aria-label={`Close ${title} editor`}
          >
            ×
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="editor-sheet-form-body">
            <SemanticEditorForm
              definition={definition}
              value={draft}
              errors={errors}
              onChange={setDraft}
              {...(mediaChoices === undefined ? {} : { mediaChoices })}
              {...(linkChoices === undefined ? {} : { linkChoices })}
              {...(onRequestMedia === undefined ? {} : { onRequestMedia })}
            />
            {conflict ? (
              <div className="editor-conflict" role="alert">
                <strong>This section changed while you were editing.</strong>
                <p>Your work is still here. Reload the latest saved version before trying again.</p>
                {onReloadLatest === undefined ? null : (
                  <button type="button" onClick={() => void reload()}>
                    Reload latest
                  </button>
                )}
              </div>
            ) : null}
            {saveError ? (
              <p className="editor-error" role="alert">
                We could not save this change. Please try again.
              </p>
            ) : null}
          </div>
          <footer>
            <button className="editor-save" type="submit" disabled={busy || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="editor-cancel"
              type="button"
              onClick={requestClose}
              disabled={saving}
            >
              Cancel
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
