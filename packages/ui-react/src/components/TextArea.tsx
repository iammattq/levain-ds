'use client';

import React, { forwardRef, TextareaHTMLAttributes } from 'react';

export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
> {
  /** Unique identifier for the textarea */
  id: string;
  /** Text label for the textarea field */
  label: string;
  /** Error message to display (enables error state when provided) */
  error?: string;
  /** Optional helper text shown below the textarea */
  helperText?: string;
  /** Additional class name for the textarea container */
  className?: string;
  /** Additional class name for the textarea element */
  textareaClassName?: string;
  /** Whether the field has been touched/blurred */
  touched?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Number of rows to display */
  rows?: number;
  /** Whether to use compact sizing (smaller typography and padding) */
  compact?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      id,
      label,
      error,
      helperText,
      className = '',
      textareaClassName = '',
      touched = true, // Default to true to show errors immediately if provided
      required = false,
      disabled = false,
      rows = 4,
      compact = false,
      ...props
    },
    ref
  ) => {
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
      <div className={`${className}`}>
        <label
          htmlFor={id}
          className={`${compact ? 'type-label-sm' : 'type-label'} mb-1 block ${
            disabled
              ? 'text-[var(--color-text-disabled)]'
              : 'text-[var(--color-text-default)]'
          }`}
        >
          {label}{' '}
          {required && <span className="text-[var(--color-error)]">*</span>}
        </label>

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          {...props}
          className={`scrollbar-thin block w-full resize-y rounded-md ${compact ? 'type-body-sm px-2 py-1.5' : 'px-3 py-2'} ${
            disabled
              ? 'cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
              : showError
                ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
          } border border-[var(--color-border-emphasis)] text-[var(--color-text-default)] transition-colors focus:ring-1 focus:outline-none ${textareaClassName}`}
          aria-invalid={showError}
          aria-describedby={descriptionId}
          required={required}
        />

        {/* Error message */}
        {showError && !disabled && (
          <p
            id={errorId}
            className={`${compact ? 'type-caption' : 'type-body-sm'} mt-1 text-[var(--color-error)]`}
          >
            {error}
          </p>
        )}

        {/* Helper text - only show if no error is displayed */}
        {(!showError || disabled) && helperText && (
          <p
            id={helperId}
            className={`${compact ? 'type-caption-compact' : 'type-caption'} mt-1 ${disabled ? 'text-[var(--color-text-disabled)]' : ''}`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
