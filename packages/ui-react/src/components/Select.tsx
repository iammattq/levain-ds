'use client';

import React, { forwardRef, SelectHTMLAttributes } from 'react';
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

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'className' | 'size'
> {
  /** Unique identifier for the select */
  id: string;
  /** Text label for the select field */
  label: string;
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Error message to display (enables error state when provided) */
  error?: string;
  /** Optional helper text shown below the select */
  helperText?: string;
  /** Additional class name for the select container */
  className?: string;
  /** Additional class name for the select element */
  selectClassName?: string;
  /** Whether the field has been touched/blurred */
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
      id,
      label,
      options,
      error,
      helperText,
      className = '',
      selectClassName = '',
      touched = true, // Default to true to show errors immediately if provided
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
    // Resolve size from explicit prop or deprecated compact boolean
    const effectiveSize: SelectSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    // Determine if we should show an error
    const showError = touched && !!error;

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
      <div className={`${inline ? 'inline-flex' : ''} ${className}`}>
        {/* Visible label (hidden in inline mode, but still accessible via aria-label on select) */}
        {!inline && (
          <label
            htmlFor={id}
            className={`${config.labelClass} mb-1 block ${
              disabled
                ? 'text-[var(--color-text-disabled)]'
                : 'text-[var(--color-text-default)]'
            }`}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-label={inline ? label : undefined}
            {...props}
            className={`block w-full appearance-none ${config.rounded} ${config.height} ${config.selectPadding} ${config.textClass} ${
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-interactive)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            } border border-[var(--color-border-emphasis)] text-[var(--color-text-default)] transition-colors focus:ring-1 focus:outline-none ${selectClassName}`}
            aria-invalid={showError}
            aria-describedby={descriptionId}
            required={required}
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

        {/* Error message */}
        {showError && !disabled && (
          <p
            id={errorId}
            className={`${config.errorClass} mt-1 text-[var(--color-error)]`}
          >
            {error}
          </p>
        )}

        {/* Helper text - only show if no error is displayed */}
        {(!showError || disabled) && helperText && (
          <p id={helperId} className={`${config.helperClass} mt-1`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
