'use client';

import React, { forwardRef, TextareaHTMLAttributes, useId } from 'react';
import { cn } from '../utils/cn';

/**
 * TextArea follows the form-input convention (docs/prop-conventions.json, formInputs): a native field, so `value` /
 * `defaultValue` and the native `onChange(event)`; every prop it doesn't name goes to the <textarea>, as does the ref.
 */
export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
> {
  /** The textarea's id; generated when left out */
  id?: string;
  /** Visible label. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Error message; shown unless `touched` is false or the field is disabled */
  error?: string;
  /** Optional helper text shown below the textarea (the error replaces it) */
  helperText?: string;
  /** Additional class name for the root */
  className?: string;
  /** Additional class name for the textarea element */
  textareaClassName?: string;
  /** Leave out to show `error` at once; pass the field's touched state to hold it until the field is left */
  touched?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Number of rows to display */
  rows?: number;
  /** 'xs' (smaller type and padding) or 'md' (the default). Height is content-driven */
  size?: 'xs' | 'md';
  /** @deprecated use `size="xs"` */
  compact?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      id: idProp,
      label,
      error,
      helperText,
      className,
      textareaClassName,
      touched,
      required = false,
      disabled = false,
      rows = 4,
      size,
      compact = false,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const xs = (size ?? (compact ? 'xs' : 'md')) === 'xs';

    // An error shows when set, unless touched is false; while disabled the helper shows instead
    const showError = !!error && touched !== false && !disabled;

    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    return (
      <div className={cn(className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              xs ? 'type-label-sm' : 'type-label',
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

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          {...props}
          aria-invalid={showError}
          aria-describedby={
            [descriptionId, props['aria-describedby']]
              .filter(Boolean)
              .join(' ') || undefined
          }
          required={required}
          // one border colour per state (before, two border colours were set and the alphabet chose)
          className={cn(
            'scrollbar-thin block w-full resize-y rounded-md border transition-colors focus:ring-1 focus:outline-none',
            xs ? 'type-body-sm px-2 py-1.5' : 'px-3 py-2',
            disabled
              ? 'cursor-not-allowed border-[var(--color-border-emphasis)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
              : showError
                ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] text-[var(--color-text-default)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-default)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
            textareaClassName
          )}
        />

        {showError && (
          <p
            id={errorId}
            className={cn(
              xs ? 'type-caption' : 'type-body-sm',
              'mt-1 text-[var(--color-error)]'
            )}
          >
            {error}
          </p>
        )}

        {!showError && helperText && (
          <p
            id={helperId}
            className={cn(
              xs ? 'type-caption-compact' : 'type-caption',
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

TextArea.displayName = 'TextArea';

export default TextArea;
