import { useId } from 'react';

import {
  editableValueSchema,
  type EditableValue,
  type EditorField,
  type EntityEditorDefinition,
  type LeafEditorField,
} from '@app/schemas';

import { fieldKey, isEditableRecord, readEditorValue, writeEditorValue } from './editorValue.js';

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
      <textarea
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
      <span
        className={
          control.type === 'number' && control.suffix !== undefined ? 'editor-number' : undefined
        }
      >
        <input
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
          <span aria-hidden="true">{control.suffix}</span>
        ) : null}
      </span>
    );
  }
  if (control.type === 'boolean') {
    return (
      <label className={`editor-toggle editor-toggle-${control.display}`}>
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
        <select
          id={inputId}
          value={stringValue(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose an option</option>
          {control.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <div className="editor-choice-grid" id={inputId} role="radiogroup" aria-label={field.label}>
        {control.choices.map((choice) => (
          <label key={choice.value}>
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
    return (
      <div className="editor-icon-grid" id={inputId} role="radiogroup" aria-label={field.label}>
        {control.choices.map((choice) => (
          <label key={choice.value} title={choice.helpText}>
            <input
              type="radio"
              name={inputId}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span aria-hidden="true">◇</span>
            <strong>{choice.label}</strong>
          </label>
        ))}
      </div>
    );
  }
  if (control.type === 'media-picker') {
    const selected = mediaChoices.find(
      (choice) => JSON.stringify(choice.value) === JSON.stringify(value),
    );
    return (
      <div className="editor-media-picker" id={inputId}>
        {selected === undefined ? (
          <p>Current image selected</p>
        ) : (
          <figure>
            <img src={selected.previewUrl} alt="" />
            <figcaption>{selected.label}</figcaption>
          </figure>
        )}
        {mediaChoices.length > 0 ? (
          <select
            aria-label={`Choose ${field.label}`}
            value={selected?.label ?? ''}
            onChange={(event) => {
              const choice = mediaChoices.find(({ label }) => label === event.target.value);
              if (choice !== undefined) onChange(choice.value);
            }}
          >
            <option value="">Choose from media library</option>
            {mediaChoices.map((choice) => (
              <option key={choice.label} value={choice.label}>
                {choice.label}
              </option>
            ))}
          </select>
        ) : null}
        {onRequestMedia === undefined ? null : (
          <button type="button" onClick={onRequestMedia}>
            Open media library
          </button>
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
      <div className="editor-link-builder" id={inputId}>
        {visibleChoices.length > 0 ? (
          <select
            aria-label={`Destination for ${field.label}`}
            value={friendlyChoice?.label ?? ''}
            onChange={(event) => {
              const choice = visibleChoices.find(({ label }) => label === event.target.value);
              if (choice !== undefined) onChange(choice.value);
            }}
          >
            <option value="">Choose a page or section</option>
            {visibleChoices.map((choice) => (
              <option key={`${choice.kind}-${choice.label}`} value={choice.label}>
                {choice.label}
              </option>
            ))}
          </select>
        ) : null}
        {freeformAllowed ? (
          <input
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
    <div className="editor-nested-list" id={baseId}>
      {items.map((item, index) => {
        const record = isEditableRecord(item) ? item : {};
        const itemName =
          stringValue(readEditorValue(record, control.itemLabelPath)) ||
          `${control.itemLabel} ${String(index + 1)}`;
        return (
          <fieldset key={index}>
            <legend>{itemName}</legend>
            {control.itemFields
              .toSorted((left, right) => left.order - right.order)
              .map((itemField) => {
                if (itemField.control.type === 'system') return null;
                const id = `${baseId}-${String(index)}-${String(itemField.order)}`;
                return (
                  <div className="editor-field" key={fieldKey(itemField.path)}>
                    <label htmlFor={id}>{itemField.label}</label>
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
                  </div>
                );
              })}
            <div className="editor-row-actions">
              {control.reorderable ? (
                <>
                  <button
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
                  </button>
                  <button
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
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove {control.itemLabel.toLowerCase()}
              </button>
            </div>
          </fieldset>
        );
      })}
      <button
        type="button"
        disabled={control.maximumItems !== undefined && items.length >= control.maximumItems}
        onClick={() =>
          onChange([...items, editableValueSchema.parse(structuredClone(control.blankItem))])
        }
      >
        {control.addLabel}
      </button>
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
    <div className="semantic-editor-form">
      {definition.groups
        .toSorted((left, right) => left.order - right.order)
        .map((group) => (
          <fieldset key={group.id}>
            <legend>{group.label}</legend>
            {group.helpText === undefined ? null : <p className="editor-help">{group.helpText}</p>}
            {group.fields
              .toSorted((left, right) => left.order - right.order)
              .map((field) => {
                if (field.control.type === 'system') return null;
                const key = fieldKey(field.path);
                const inputId = `${generatedId}-${String(group.order)}-${String(field.order)}`;
                const error = errors[key];
                const fieldValue = readEditorValue(value, field.path);
                return (
                  <div
                    className="editor-field"
                    key={key}
                    data-invalid={error === undefined ? undefined : 'true'}
                  >
                    <label htmlFor={inputId}>
                      {field.label}
                      {field.required ? <span aria-hidden="true"> *</span> : null}
                    </label>
                    {field.helpText === undefined ? null : (
                      <p id={`${inputId}-help`} className="editor-help">
                        {field.helpText}
                      </p>
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
                      <p className="editor-error" id={`${inputId}-error`} role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
          </fieldset>
        ))}
    </div>
  );
}
