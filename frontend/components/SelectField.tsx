import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { Field, FieldError, FieldLabel } from './ui/field.js';
import { NativeSelect, NativeSelectOption } from './ui/native-select.js';

export interface SelectFieldOption {
  readonly value: string;
  readonly label: string;
}

interface SelectFieldProps {
  readonly id: string;
  readonly name: string;
  readonly label: ReactNode;
  readonly placeholder: string;
  readonly options: readonly SelectFieldOption[];
  readonly required?: boolean;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
  readonly error?: string | undefined;
  readonly errorClassName?: string;
}

export function SelectField({
  id,
  name,
  label,
  placeholder,
  options,
  required = false,
  value,
  defaultValue = '',
  onValueChange,
  error,
  errorClassName,
}: SelectFieldProps): React.JSX.Element {
  const generatedId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [constraintError, setConstraintError] = useState<string>();
  const selectedValue = value ?? internalValue;
  const errorId = `${id}-error-${generatedId.replaceAll(':', '')}`;
  const visibleError = error ?? constraintError;

  useEffect(() => {
    const form = selectRef.current?.closest('form');
    if (form === undefined || form === null || value !== undefined) return;
    const reset = (): void => {
      setInternalValue(defaultValue);
      setConstraintError(undefined);
    };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [defaultValue, value]);

  return (
    <Field data-invalid={visibleError === undefined ? undefined : 'true'}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        className="w-full"
        ref={selectRef}
        id={id}
        name={name}
        required={required}
        value={selectedValue}
        aria-invalid={visibleError === undefined ? undefined : true}
        aria-describedby={visibleError === undefined ? undefined : errorId}
        onChange={(event) => {
          if (value === undefined) setInternalValue(event.target.value);
          setConstraintError(undefined);
          onValueChange?.(event.target.value);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setConstraintError(
            `Please choose ${String(label)
              .replace(/\s*\*\s*$/, '')
              .toLowerCase()}.`,
          );
          selectRef.current?.focus();
        }}
      >
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {visibleError === undefined ? null : (
        <FieldError id={errorId} className={errorClassName}>
          {visibleError}
        </FieldError>
      )}
    </Field>
  );
}
