'use client';

import React, {
  forwardRef,
  InputHTMLAttributes,
  useState,
  useRef,
  useImperativeHandle,
  useId,
} from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';

/** Size variants for TextInput */
export type TextInputSize = InputSize;

/**
 * TextInput follows the form-input convention (docs/prop-conventions.json, formInputs): a native field, so `value` /
 * `defaultValue` and the native `onChange(event)`; every prop it doesn't name goes to the <input>, as does the ref.
 */
export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'onChange' | 'size'
> {
  /** The input's id; generated when left out */
  id?: string;
  /** Visible label. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Hides the label visually; screen readers still read it. For a field whose purpose the layout already shows. */
  hideLabel?: boolean;
  /** Controlled: the field's text. Leave out for uncontrolled */
  value?: string;
  /** Uncontrolled: the text at first */
  defaultValue?: string;
  /** The native change event */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Input type (text, password, email, etc.) */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  /** Error message (external validation or server error); shown unless `touched` is false or the field is disabled */
  error?: string;
  /** Returns a message when the value is invalid; it shows after the field's first blur (or when `touched` is true) */
  validate?: (value: string) => string | null | undefined;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the root (merged with cn) */
  className?: string;
  /** Additional class name for the input element */
  inputClassName?: string;
  /** Leave out to show `error` at once; pass the field's touched state to hold errors until the field is left */
  touched?: boolean;
  /** Function called when the input loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Size variant for the input. Defaults to 'md'. */
  size?: TextInputSize;
  /**
   * @deprecated Use size="xs" instead. Will be removed in a future version.
   */
  compact?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      id: idProp,
      label,
      hideLabel = false,
      type = 'text',
      value: valueProp,
      defaultValue = '',
      onChange,
      onBlur,
      error: externalError,
      validate,
      helperText,
      className,
      inputClassName,
      touched,
      required = false,
      disabled = false,
      size,
      compact = false,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    // Handle deprecated compact prop - size takes precedence
    const effectiveSize: TextInputSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    // the text, controlled or own (only `validate` reads it; the native onChange is called with the event below)
    const [value, setValue] = useControlled(
      valueProp,
      defaultValue,
      undefined,
      'TextInput'
    );
    const [blurred, setBlurred] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // An error the app passes shows at once unless touched is false; validate's waits for the first blur (or touched).
    // Neither shows while disabled: the helper does.
    const validationError = validate?.(value) || null;
    const shownError = disabled
      ? null
      : externalError && touched !== false
        ? externalError
        : validationError && (touched ?? blurred)
          ? validationError
          : null;
    const showError = !!shownError;

    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const isNumber = type === 'number';

    const borderColor = disabled
      ? 'border-[var(--color-border-default)]'
      : showError
        ? 'border-[var(--color-error)]'
        : 'border-[var(--color-border-subtle)]';

    const handleIncrement = () => {
      if (disabled || !inputRef.current) return;
      inputRef.current.stepUp();
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const handleDecrement = () => {
      if (disabled || !inputRef.current) return;
      inputRef.current.stepDown();
      inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const spinnerButtonClasses = `
      flex items-center justify-center px-1
      text-[var(--color-text-muted)]
      hover:bg-[var(--color-surface-canvas)]
      active:bg-[var(--color-state-active)]
      transition-colors
      disabled:opacity-50 disabled:pointer-events-none
    `;

    return (
      <div className={cn(className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              hideLabel ? 'sr-only' : [config.labelClass, 'mb-1 block'],
              disabled
                ? 'text-[var(--color-text-disabled)]'
                : 'text-[var(--color-text-default)]'
            )}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        )}

        <div className="relative flex">
          <input
            {...props}
            ref={inputRef}
            id={id}
            type={type}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onChange?.(e);
            }}
            onBlur={(e) => {
              setBlurred(true);
              onBlur?.(e);
            }}
            disabled={disabled}
            required={required}
            aria-invalid={showError}
            aria-describedby={
              [descriptionId, props['aria-describedby']]
                .filter(Boolean)
                .join(' ') || undefined
            }
            // one border colour per state (before, two were set and the alphabet chose: disabled drew emphasis)
            className={cn(
              'block w-full border transition-colors focus:ring-1 focus:outline-none',
              config.rounded,
              config.height,
              config.padding,
              config.textClass,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-emphasis)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] text-[var(--color-text-default)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-interactive)] text-[var(--color-text-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
              isNumber &&
                '[appearance:textfield] pr-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
              inputClassName
            )}
          />

          {isNumber && !disabled && (
            <div
              className={`absolute top-0 right-0 bottom-0 flex flex-col border-l ${borderColor}`}
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={handleIncrement}
                disabled={disabled}
                aria-label="Increment"
                className={`${spinnerButtonClasses} flex-1 rounded-tr-md border-b ${borderColor}`}
              >
                <ChevronUp className={config.iconSize} />
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={handleDecrement}
                disabled={disabled}
                aria-label="Decrement"
                className={`${spinnerButtonClasses} flex-1 rounded-br-md`}
              >
                <ChevronDown className={config.iconSize} />
              </button>
            </div>
          )}
        </div>

        {showError && (
          <p
            id={errorId}
            className={cn(config.errorClass, 'mt-1 text-[var(--color-error)]')}
          >
            {shownError}
          </p>
        )}

        {!showError && helperText && (
          <p
            id={helperId}
            className={cn(
              config.helperClass,
              'mt-1',
              disabled && 'text-[var(--color-text-disabled)]'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
