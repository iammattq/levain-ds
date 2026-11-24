'use client';

import { forwardRef, SelectHTMLAttributes, useId } from 'react';
import { cn } from '../utils/cn';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';

/** Size variants for Select */
export type SelectSize = InputSize;

export interface SelectOption {
  /** The value to be submitted with the form */
  value: string;
  /** The text displayed to the user */
  label: string;
  /** Optional description providing more information about the option */
  description?: string;
  /** Whether the option is disabled */
  disabled?: boolean;
}

/**
 * Select follows the form-input convention (docs/prop-conventions.json, formInputs): a native field, so `value` /
 * `defaultValue` and the native `onChange(event)`; every prop it doesn't name goes to the <select>, as does the ref.
 */
export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'size'
> {
  /** The select's id; generated when left out */
  id?: string;
  /** Visible label (in `inline` mode, the select's aria-label). Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Error message; shown unless `touched` is false or the field is disabled */
  error?: string;
  /** Optional helper text shown below the select */
  helperText?: string;
  /** Additional class name for the root (merged with cn) */
  className?: string;
  /** Additional class name for the select element */
  selectClassName?: string;
  /** Leave out to show `error` at once; pass the field's touched state to hold it until the field is left */
  touched?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Size variant for the select. Defaults to 'md'. */
  size?: SelectSize;
  /**
   * @deprecated Use size="xs" instead. Will be removed in a future version.
   */
  compact?: boolean;
  /** Inline mode: hides visible label (uses aria-label), removes block layout for horizontal flows */
  inline?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id: idProp,
      label,
      options,
      error,
      helperText,
      className,
      selectClassName,
      touched,
      required = false,
      disabled = false,
      placeholder,
      size,
      compact = false,
      inline = false,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    // Resolve size from explicit prop or deprecated compact boolean
    const effectiveSize: SelectSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    // An error shows when set, unless touched is false; while disabled the helper shows instead
    const showError = !!error && touched !== false && !disabled;

    // Generate ids for associated elements
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    // Determine which element id to use for aria-describedby
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    return (
      <div className={cn(inline && 'inline-flex', className)}>
        {/* Visible label (hidden in inline mode, but still accessible via aria-label on select) */}
        {!inline && label && (
          <label
            htmlFor={id}
            className={cn(
              config.labelClass,
              'mb-1 block',
              disabled
                ? 'text-[var(--color-text-disabled)]'
                : 'text-[var(--color-text-default)]'
            )}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            aria-label={inline ? label : undefined}
            {...props}
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={showError}
            aria-describedby={
              [descriptionId, props['aria-describedby']]
                .filter(Boolean)
                .join(' ') || undefined
            }
            required={required}
            // one border colour per state (before, two were set and the alphabet chose: disabled drew emphasis)
            className={cn(
              'block w-full appearance-none border transition-colors focus:ring-1 focus:outline-none',
              config.rounded,
              config.height,
              config.selectPadding,
              config.textClass,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-emphasis)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] text-[var(--color-text-default)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-interactive)] text-[var(--color-text-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
              selectClassName
            )}
          >
          {placeholder && (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                title={option.description}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Custom select arrow */}
          <div
            className={`pointer-events-none absolute inset-y-0 right-0 flex items-center ${config.iconPadding}`}
          >
            <svg
              className={`${config.iconSize} ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {showError && (
          <p
            id={errorId}
            className={cn(config.errorClass, 'mt-1 text-[var(--color-error)]')}
          >
            {error}
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

Select.displayName = 'Select';

export default Select;
