import { useId, useState } from 'react';

import {
  editableValueSchema,
  type EditableValue,
  type EditorField,
  type EntityEditorDefinition,
  type LeafEditorField,
} from '@app/schemas';

import { fieldKey, isEditableRecord, readEditorValue, writeEditorValue } from './editorValue.js';
import { ContentIcon } from './ContentIcon.js';
import { Button } from './ui/button.js';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from './ui/field.js';
import { Input } from './ui/input.js';
import { NativeSelect, NativeSelectOption } from './ui/native-select.js';
import { Textarea } from './ui/textarea.js';

export interface EditorMediaChoice {
  readonly label: string;
  readonly previewUrl: string;
  readonly altText: string;
  readonly value: EditableValue;
}

export interface EditorLinkChoice {
  readonly kind: 'page' | 'section' | 'managed-file';
  readonly label: string;
  readonly value: EditableValue;
}

export interface SemanticEditorFormProps {
  readonly definition: EntityEditorDefinition;
  readonly value: EditableValue;
  readonly errors: Readonly<Record<string, string>>;
  readonly onChange: (value: EditableValue) => void;
  readonly mediaChoices?: readonly EditorMediaChoice[];
  readonly linkChoices?: readonly EditorLinkChoice[];
  readonly onRequestMedia?: (onSelect: (choice: EditorMediaChoice) => void) => void;
}

function stringValue(value: EditableValue): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: EditableValue): string {
  return typeof value === 'number' ? String(value) : '';
}

function updateInputValue(field: EditorField | LeafEditorField, input: string): EditableValue {
  if (field.control.type !== 'number') return input;
  const parsed = Number(input);
  return input === '' || !Number.isFinite(parsed) ? input : parsed;
}

function writeMediaChoice(
  root: EditableValue,
  field: EditorField | LeafEditorField,
  choice: EditorMediaChoice,
): EditableValue {
  let next = writeEditorValue(root, field.path, choice.value);
  if (field.control.type === 'media-picker' && field.control.altTextPath !== undefined) {
    next = writeEditorValue(next, field.control.altTextPath, choice.altText);
  }
  return next;
}

function IconPicker({
  field,
  inputId,
  value,
  onChange,
}: {
  readonly field: EditorField | LeafEditorField;
  readonly inputId: string;
  readonly value: EditableValue;
  readonly onChange: (value: EditableValue) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState('');
  if (field.control.type !== 'icon-picker') {
    throw new Error('The icon picker received a non-icon field.');
  }
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingChoices = field.control.choices.filter(({ label, value: choiceValue }) =>
    `${label} ${choiceValue}`.toLocaleLowerCase().includes(normalizedQuery),
  );
  const selectedChoice = field.control.choices.find(
    ({ value: choiceValue }) => value === choiceValue,
  );
  const initialChoices = matchingChoices.slice(0, 120);
  const visibleChoices =
    normalizedQuery !== '' ||
    selectedChoice === undefined ||
    initialChoices.some(({ value: choiceValue }) => choiceValue === selectedChoice.value)
      ? normalizedQuery === ''
        ? initialChoices
        : matchingChoices
      : [...initialChoices, selectedChoice];
  return (
    <div className="space-y-3" id={inputId}>
      <label className="grid gap-2 text-sm font-medium">
        <span>Search icons</span>
        <Input
          type="search"
          aria-label="Search icons"
          value={query}
          placeholder="Try building, people, or tractor"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {query === ''
          ? `${String(field.control.choices.length)} icons available. Search to narrow the list.`
          : `${String(matchingChoices.length)} matching icons.`}
      </p>
      <div
        className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-4"
        role="radiogroup"
        aria-label={field.label}
      >
        {visibleChoices.map((choice) => (
          <label
            key={choice.value}
            title={choice.helpText}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs has-[:checked]:border-primary has-[:checked]:bg-secondary"
          >
            <input
              type="radio"
              name={inputId}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span className="text-primary" aria-hidden="true">
              <ContentIcon name={choice.value} />
            </span>
            <strong>{choice.label}</strong>
          </label>
        ))}
      </div>
      {matchingChoices.length === 0 ? <p>No icons match that search.</p> : null}
    </div>
  );
}

function EditorFieldControl({
  field,
  value,
  inputId,
  onChange,
  mediaChoices,
  linkChoices,
  onRequestMedia,
}: {
  readonly field: EditorField | LeafEditorField;
  readonly value: EditableValue;
  readonly inputId: string;
  readonly onChange: (value: EditableValue) => void;
  readonly mediaChoices: readonly EditorMediaChoice[];
  readonly linkChoices: readonly EditorLinkChoice[];
  readonly onRequestMedia?: () => void;
}): React.JSX.Element | null {
  const control = field.control;
  if (control.type === 'system') return null;
  if (control.type === 'multiline-text') {
    return (
      <Textarea
        id={inputId}
        value={stringValue(value)}
        rows={control.rows}
        maxLength={control.maxLength}
        placeholder={control.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (
    control.type === 'short-text' ||
    control.type === 'email' ||
    control.type === 'phone' ||
    control.type === 'date' ||
    control.type === 'number'
  ) {
    const type =
      control.type === 'short-text' ? 'text' : control.type === 'phone' ? 'tel' : control.type;
    return (
      <span className="flex items-center gap-2">
        <Input
          id={inputId}
          type={type}
          value={control.type === 'number' ? numberValue(value) : stringValue(value)}
          required={field.required}
          placeholder={'placeholder' in control ? control.placeholder : undefined}
          maxLength={'maxLength' in control ? control.maxLength : undefined}
          min={'minimum' in control ? control.minimum : undefined}
          max={'maximum' in control ? control.maximum : undefined}
          step={'step' in control ? control.step : undefined}
          onChange={(event) => onChange(updateInputValue(field, event.target.value))}
        />
        {control.type === 'number' && control.suffix !== undefined ? (
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            {control.suffix}
          </span>
        ) : null}
      </span>
    );
  }
  if (control.type === 'boolean') {
    return (
      <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
        <input
          id={inputId}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{value === true ? 'Yes' : 'No'}</span>
      </label>
    );
  }
  if (control.type === 'enum') {
    if (control.display === 'select') {
      return (
        <NativeSelect
          className="w-full"
          id={inputId}
          value={stringValue(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <NativeSelectOption value="">Choose an option</NativeSelectOption>
          {control.choices.map((choice) => (
            <NativeSelectOption key={choice.value} value={choice.value}>
              {choice.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
    }
    return (
      <div
        className="grid gap-2 sm:grid-cols-2"
        id={inputId}
        role="radiogroup"
        aria-label={field.label}
      >
        {control.choices.map((choice) => (
          <label
            key={choice.value}
            className="flex items-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary"
          >
            <input
              type="radio"
              name={inputId}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
    );
  }
  if (control.type === 'icon-picker') {
    return <IconPicker field={field} inputId={inputId} value={value} onChange={onChange} />;
  }
  if (control.type === 'media-picker') {
    const selected = mediaChoices.find(
      (choice) => JSON.stringify(choice.value) === JSON.stringify(value),
    );
    return (
      <div className="space-y-3 rounded-lg border bg-muted/30 p-3" id={inputId}>
        {selected === undefined ? (
          <p>Current image selected</p>
        ) : (
          <figure className="flex items-center gap-3">
            <img className="size-16 rounded-md object-cover" src={selected.previewUrl} alt="" />
            <figcaption className="text-sm">{selected.label}</figcaption>
          </figure>
        )}
        {mediaChoices.length > 0 ? (
          <NativeSelect
            className="w-full"
            aria-label={`Choose ${field.label}`}
            value={selected?.label ?? ''}
            onChange={(event) => {
              const choice = mediaChoices.find(({ label }) => label === event.target.value);
              if (choice !== undefined) onChange(choice.value);
            }}
          >
            <NativeSelectOption value="">Choose from media library</NativeSelectOption>
            {mediaChoices.map((choice) => (
              <NativeSelectOption key={choice.label} value={choice.label}>
                {choice.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
        {onRequestMedia === undefined ? null : (
          <Button type="button" variant="outline" onClick={onRequestMedia}>
            Open media library
          </Button>
        )}
      </div>
    );
  }
  if (control.type === 'link-builder') {
    const friendlyChoice = linkChoices.find(
      (choice) => JSON.stringify(choice.value) === JSON.stringify(value),
    );
    const visibleChoices = linkChoices.filter((choice) =>
      control.allowedDestinations.includes(choice.kind),
    );
    const freeformAllowed = control.allowedDestinations.some(
      (kind) => kind === 'email' || kind === 'phone' || kind === 'external-site',
    );
    return (
      <div className="space-y-2" id={inputId}>
        {visibleChoices.length > 0 ? (
          <NativeSelect
            className="w-full"
            aria-label={`Destination for ${field.label}`}
            value={friendlyChoice?.label ?? ''}
            onChange={(event) => {
              const choice = visibleChoices.find(({ label }) => label === event.target.value);
              if (choice !== undefined) onChange(choice.value);
            }}
          >
            <NativeSelectOption value="">Choose a page or section</NativeSelectOption>
            {visibleChoices.map((choice) => (
              <NativeSelectOption key={`${choice.kind}-${choice.label}`} value={choice.label}>
                {choice.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
        {freeformAllowed ? (
          <Input
            type="text"
            aria-label={`Custom destination for ${field.label}`}
            value={friendlyChoice === undefined ? stringValue(value) : ''}
            placeholder="Email, phone number, or website"
            onChange={(event) => onChange(event.target.value)}
          />
        ) : null}
      </div>
    );
  }
  return null;
}

function NestedCollectionField({
  field,
  value,
  baseId,
  onChange,
  mediaChoices,
  linkChoices,
  onRequestMedia,
}: {
  readonly field: EditorField;
  readonly value: EditableValue;
  readonly baseId: string;
  readonly onChange: (value: EditableValue) => void;
  readonly mediaChoices: readonly EditorMediaChoice[];
  readonly linkChoices: readonly EditorLinkChoice[];
  readonly onRequestMedia?: (onSelect: (choice: EditorMediaChoice) => void) => void;
}): React.JSX.Element {
  if (field.control.type !== 'nested-collection') return <></>;
  const control = field.control;
  const items = Array.isArray(value) ? value : [];
  const updateItem = (index: number, item: EditableValue): void =>
    onChange(items.map((current, itemIndex) => (itemIndex === index ? item : current)));
  return (
    <div className="space-y-4" id={baseId}>
      {items.map((item, index) => {
        const record = isEditableRecord(item) ? item : {};
        const itemName =
          stringValue(readEditorValue(record, control.itemLabelPath)) ||
          `${control.itemLabel} ${String(index + 1)}`;
        return (
          <FieldSet key={index} className="rounded-lg border bg-muted/20 p-4">
            <FieldLegend>{itemName}</FieldLegend>
            {control.itemFields
              .toSorted((left, right) => left.order - right.order)
              .map((itemField) => {
                if (itemField.control.type === 'system') return null;
                const id = `${baseId}-${String(index)}-${String(itemField.order)}`;
                return (
                  <Field key={fieldKey(itemField.path)}>
                    <FieldLabel htmlFor={id}>{itemField.label}</FieldLabel>
                    <EditorFieldControl
                      field={itemField}
                      value={readEditorValue(record, itemField.path)}
                      inputId={id}
                      onChange={(next) =>
                        updateItem(index, writeEditorValue(record, itemField.path, next))
                      }
                      mediaChoices={mediaChoices}
                      linkChoices={linkChoices}
                      {...(onRequestMedia === undefined
                        ? {}
                        : {
                            onRequestMedia: (): void =>
                              onRequestMedia((choice) =>
                                updateItem(index, writeMediaChoice(record, itemField, choice)),
                              ),
                          })}
                    />
                  </Field>
                );
              })}
            <div className="flex flex-wrap gap-2">
              {control.reorderable ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      if (index === 0) return;
                      const next = [...items];
                      [next[index - 1], next[index]] = [
                        next[index] ?? null,
                        next[index - 1] ?? null,
                      ];
                      onChange(next);
                    }}
                  >
                    Move up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => {
                      if (index === items.length - 1) return;
                      const next = [...items];
                      [next[index], next[index + 1]] = [
                        next[index + 1] ?? null,
                        next[index] ?? null,
                      ];
                      onChange(next);
                    }}
                  >
                    Move down
                  </Button>
                </>
              ) : null}
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove {control.itemLabel.toLowerCase()}
              </Button>
            </div>
          </FieldSet>
        );
      })}
      <Button
        variant="outline"
        type="button"
        disabled={control.maximumItems !== undefined && items.length >= control.maximumItems}
        onClick={() =>
          onChange([...items, editableValueSchema.parse(structuredClone(control.blankItem))])
        }
      >
        {control.addLabel}
      </Button>
    </div>
  );
}

export function SemanticEditorForm({
  definition,
  value,
  errors,
  onChange,
  mediaChoices = [],
  linkChoices = [],
  onRequestMedia,
}: SemanticEditorFormProps): React.JSX.Element {
  const generatedId = useId().replaceAll(':', '');
  return (
    <div className="space-y-6">
      {definition.groups
        .toSorted((left, right) => left.order - right.order)
        .map((group) => (
          <FieldSet key={group.id} className="space-y-4">
            <FieldLegend className="text-lg font-semibold">{group.label}</FieldLegend>
            {group.helpText === undefined ? null : (
              <FieldDescription>{group.helpText}</FieldDescription>
            )}
            {group.fields
              .toSorted((left, right) => left.order - right.order)
              .map((field) => {
                if (field.control.type === 'system') return null;
                const key = fieldKey(field.path);
                const inputId = `${generatedId}-${String(group.order)}-${String(field.order)}`;
                const error = errors[key];
                const fieldValue = readEditorValue(value, field.path);
                return (
                  <Field key={key} data-invalid={error === undefined ? undefined : 'true'}>
                    <FieldLabel htmlFor={inputId}>
                      {field.label}
                      {field.required ? <span aria-hidden="true"> *</span> : null}
                    </FieldLabel>
                    {field.helpText === undefined ? null : (
                      <FieldDescription id={`${inputId}-help`}>{field.helpText}</FieldDescription>
                    )}
                    {field.control.type === 'nested-collection' ? (
                      <NestedCollectionField
                        field={field}
                        value={fieldValue}
                        baseId={inputId}
                        onChange={(next) => onChange(writeEditorValue(value, field.path, next))}
                        mediaChoices={mediaChoices}
                        linkChoices={linkChoices}
                        {...(onRequestMedia === undefined ? {} : { onRequestMedia })}
                      />
                    ) : (
                      <EditorFieldControl
                        field={field}
                        value={fieldValue}
                        inputId={inputId}
                        onChange={(next) => onChange(writeEditorValue(value, field.path, next))}
                        mediaChoices={mediaChoices}
                        linkChoices={linkChoices}
                        {...(onRequestMedia === undefined
                          ? {}
                          : {
                              onRequestMedia: (): void =>
                                onRequestMedia((choice) =>
                                  onChange(writeMediaChoice(value, field, choice)),
                                ),
                            })}
                      />
                    )}
                    {error === undefined ? null : (
                      <FieldError id={`${inputId}-error`}>{error}</FieldError>
                    )}
                  </Field>
                );
              })}
          </FieldSet>
        ))}
    </div>
  );
}
