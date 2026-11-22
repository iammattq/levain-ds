'use client';

import React, {
  forwardRef,
  InputHTMLAttributes,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';

/** Size variants for TextInput */
export type TextInputSize = InputSize;

export interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'onChange' | 'size'
> {
  /** Unique identifier for the input */
  id: string;
  /** Text label for the input field */
  label: string;
  /** Hides the label visually; screen readers still read it. For a field whose purpose the layout already shows. */
  hideLabel?: boolean;
  /** Current value of the input */
  value: string;
  /** Function called when the input value changes */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Input type (text, password, email, etc.) */
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';
  /** Error message to display (external validation or server error) */
  error?: string;
  /** Validation function: returns error message string if invalid, null/undefined if valid */
  validate?: (value: string) => string | null | undefined;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the input container */
  className?: string;
  /** Additional class name for the input element */
  inputClassName?: string;
  /** Whether the field has been touched/blurred (controls validation visibility) */
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
      id,
      label,
      hideLabel = false,
      type = 'text',
      value,
      onChange,
      onBlur,
      error: externalError,
      validate,
      helperText,
      className = '',
      inputClassName = '',
      touched = false,
      required = false,
      disabled = false,
      size,
      compact = false,
      step,
      min,
      max,
      ...props
    },
    ref
  ) => {
    // Handle deprecated compact prop - size takes precedence
    const effectiveSize: TextInputSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    const [internalError, setInternalError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    useEffect(() => {
      if (validate) {
        const validationResult = validate(value);
        setInternalError(validationResult ?? null);
      } else {
        setInternalError(null);
      }
    }, [value, validate]);

    const effectiveError = externalError ?? internalError;
    const showError = touched && !!effectiveError;

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
      <div className={`${className}`}>
        <label
          htmlFor={id}
          className={`${hideLabel ? 'sr-only' : `${config.labelClass} mb-1 block`} ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
        >
          {label}{' '}
          {required && <span className="text-[var(--color-error)]">*</span>}
        </label>

        <div className="relative flex">
          <input
            ref={inputRef}
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            step={step}
            min={min}
            max={max}
            aria-invalid={showError}
            aria-describedby={descriptionId}
            {...props}
            className={`block w-full ${config.rounded} ${config.height} ${config.padding} ${config.textClass} ${
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-interactive)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            } border border-[var(--color-border-emphasis)] text-[var(--color-text-default)] transition-colors focus:ring-1 focus:outline-none ${isNumber ? '[appearance:textfield] pr-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''} ${inputClassName}`}
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

        {showError && !disabled && (
          <p
            id={errorId}
            className={`${config.errorClass} mt-1 text-[var(--color-error)]`}
          >
            {effectiveError}
          </p>
        )}

        {(!showError || disabled) && helperText && (
          <p
            id={helperId}
            className={`${config.helperClass} mt-1 ${disabled ? 'text-[var(--color-text-disabled)]' : ''}`}
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
