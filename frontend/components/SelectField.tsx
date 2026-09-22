import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

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
  errorClassName = 'ui-form-error',
}: SelectFieldProps): React.JSX.Element {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [constraintError, setConstraintError] = useState<string>();
  const selectedValue = value ?? internalValue;
  const labelId = `${id}-label`;
  const errorId = `${id}-error-${generatedId.replaceAll(':', '')}`;
  const visibleError = error ?? constraintError;

  useEffect(() => {
    const form = rootRef.current?.closest('form');
    if (form === undefined || form === null || value !== undefined) return;
    const reset = (): void => {
      setInternalValue(defaultValue);
      setConstraintError(undefined);
    };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [defaultValue, value]);

  const update = (nextValue: string): void => {
    if (value === undefined) setInternalValue(nextValue);
    setConstraintError(undefined);
    onValueChange?.(nextValue);
  };

  const showConstraintError = (): void => {
    setConstraintError(
      `Please choose ${String(label)
        .replace(/\s*\*\s*$/, '')
        .toLowerCase()}.`,
    );
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="ui-select-field">
      <label id={labelId} htmlFor={id}>
        {label}
      </label>
      <SelectPrimitive.Root required={required} value={selectedValue} onValueChange={update}>
        <SelectPrimitive.Trigger
          ref={triggerRef}
          id={id}
          className="ui-select-trigger"
          aria-labelledby={labelId}
          aria-describedby={visibleError === undefined ? undefined : errorId}
          aria-invalid={visibleError === undefined ? undefined : true}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ui-select-icon">
            <ChevronDown aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="ui-select-content"
            position="popper"
            sideOffset={4}
            collisionPadding={12}
          >
            <SelectPrimitive.Viewport className="ui-select-viewport">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  className="ui-select-option"
                  value={option.value}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="ui-select-option-check">
                    <Check aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      <select
        className="ui-native-select"
        name={name}
        required={required}
        value={selectedValue}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => update(event.target.value)}
        onInvalid={(event) => {
          event.preventDefault();
          showConstraintError();
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {visibleError === undefined ? null : (
        <small id={errorId} className={errorClassName} role="alert">
          {visibleError}
        </small>
      )}
    </div>
  );
}
