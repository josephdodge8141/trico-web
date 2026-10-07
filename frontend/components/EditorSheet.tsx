import { useCallback, useRef, useState } from 'react';

import { editableValueSchema, type EditableValue, type EntityEditorDefinition } from '@app/schemas';
import type { z } from 'zod';

import { useEditMode } from '../context/editMode.js';
import type { MediaAsset } from '../services/cms.js';
import { Alert, AlertDescription, AlertTitle } from './ui/alert.js';
import { Button } from './ui/button.js';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './ui/sheet.js';
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
  onSave,
  onClose,
  onReloadLatest,
  isConflict = isConflictByStatus,
}: EditorSheetProps): React.JSX.Element {
  const editing = useEditMode();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<EditableValue>(() => structuredClone(initialValue));
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<readonly EditorMediaChoice[]>([]);
  const dirty = !editorValuesEqual(draft, initialValue);
  const visibleMediaChoices = [...(mediaChoices ?? []), ...selectedMedia];

  const requestMedia = (onSelect: (choice: EditorMediaChoice) => void): void => {
    editing.requestMedia((asset: MediaAsset) => {
      const path = new URL(asset.publicUrl, window.location.origin).pathname;
      if (!path.startsWith('/media/') || path.includes('..')) {
        throw new Error('The selected image reference is unavailable.');
      }
      const choice: EditorMediaChoice = {
        label: asset.name,
        previewUrl: asset.publicUrl,
        altText: asset.altText,
        value: { kind: 'managed', key: path.slice(1) },
      };
      setSelectedMedia((current) => [
        choice,
        ...current.filter(({ previewUrl }) => previewUrl !== choice.previewUrl),
      ]);
      onSelect(choice);
    });
  };

  const requestClose = useCallback((): void => {
    if (dirty && !window.confirm('Discard the changes you have not saved?')) return;
    onClose();
  }, [dirty, onClose]);

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

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) requestClose();
      }}
    >
      <SheetContent
        ref={panelRef}
        className="min-w-0 max-w-full overflow-x-hidden overflow-y-auto data-[side=right]:left-0 data-[side=right]:w-[100dvw] data-[side=right]:h-dvh sm:data-[side=right]:left-auto sm:data-[side=right]:w-full sm:data-[side=right]:max-w-xl"
        showCloseButton={false}
      >
        <SheetHeader className="sticky top-0 z-10 gap-2 border-b bg-popover p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Editing this section
          </p>
          <SheetTitle className="pr-12 text-xl">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-4 top-4"
            onClick={requestClose}
            aria-label={`Close ${title} editor`}
          >
            ×
          </Button>
        </SheetHeader>
        <form
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <div className="min-w-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <SemanticEditorForm
              definition={definition}
              value={draft}
              errors={errors}
              onChange={setDraft}
              mediaChoices={visibleMediaChoices}
              {...(linkChoices === undefined ? {} : { linkChoices })}
              onRequestMedia={requestMedia}
            />
            {conflict ? (
              <Alert variant="destructive">
                <AlertTitle>This section changed while you were editing.</AlertTitle>
                <AlertDescription>
                  Your work is still here. Reload the latest saved version before trying again.
                </AlertDescription>
                {onReloadLatest === undefined ? null : (
                  <Button type="button" variant="outline" onClick={() => void reload()}>
                    Reload latest
                  </Button>
                )}
              </Alert>
            ) : null}
            {saveError ? (
              <Alert variant="destructive">We could not save this change. Please try again.</Alert>
            ) : null}
          </div>
          <SheetFooter className="sticky bottom-0 flex-row border-t bg-popover">
            <Button type="submit" disabled={busy || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="outline" type="button" onClick={requestClose} disabled={saving}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
