'use client';

import React, {
  forwardRef,
  TextareaHTMLAttributes,
  useId,
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

/**
 * ChatInput follows the form-input convention (docs/prop-conventions.json, formInputs): a native text field, so `value`
 * / `defaultValue` and the native `onChange(event)`; `onSubmit(value)` is its commit (the button, or Enter without
 * Shift, not while an IME composition is open). Every prop it doesn't name goes to the <textarea>, as does the ref; an
 * app's `onKeyDown`, `onFocus` and `onBlur` run before its own (preventDefault in `onKeyDown` skips Enter-to-submit).
 */
export interface ChatInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'onChange' | 'onSubmit' | 'value' | 'defaultValue'
> {
  /** Optional unique identifier for the textarea */
  id?: string;
  /** The text (controlled); leave out to let the field keep its own */
  value?: string;
  /** The text at first, when `value` is left out */
  defaultValue?: string;
  /** Function called when the input value changes */
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Called with the text on submit (button click or Enter key). Uncontrolled, the field then clears */
  onSubmit: (value: string) => void;
  /** Visible label. Without it, pass `aria-label`; the placeholder names the field when neither is given */
  label?: string;
  /** Optional helper text shown below the field (the error replaces it) */
  helperText?: string;
  /** Error message; shown unless `touched` is false or the field is disabled */
  error?: string;
  /** Leave out to show `error` at once; pass the field's touched state to hold it until the field is left */
  touched?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Whether the input is in a loading state */
  loading?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class name for the root */
  className?: string;
  /** Accessible label for the submit button */
  submitLabel?: string;
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      id: providedId,
      value: valueProp,
      defaultValue = '',
      onChange,
      onSubmit,
      label,
      helperText,
      error,
      touched,
      placeholder,
      maxLength,
      loading = false,
      disabled = false,
      className,
      submitLabel = 'Submit',
      onKeyDown,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    // the app's ref, object or callback, and ours (before, a callback ref replaced ours and auto-resize stopped)
    const setRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );
    const [isFocused, setIsFocused] = useState(false);
    // uncontrolled: the field's own text, kept here so the counter and the button can read it
    const [own, setOwn] = useState(defaultValue);
    const value = valueProp ?? own;

    // Auto-resize textarea based on content
    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set to scrollHeight, capped at ~5 lines (approx 120px)
        const maxHeight = 120;
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, []);

    useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    const isOverLimit = maxLength !== undefined && value.length > maxLength;
    const canSubmit =
      value.trim().length > 0 && !isOverLimit && !disabled && !loading;

    // An error shows when set, unless touched is false; while disabled the helper shows instead
    const showError = !!error && touched !== false && !disabled;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const submit = () => {
      // the same test as the button's: Enter over the limit no longer submits
      if (canSubmit) {
        onSubmit(value);
        if (valueProp === undefined) setOwn('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // the app's handler runs first; preventDefault there skips Enter-to-submit
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      // an Enter that ends an IME composition picks the characters; it doesn't submit
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    };

    // Determine container border color based on state
    const getBorderClass = () => {
      if (disabled) {
        return 'border-[var(--color-border-default)]';
      }
      if (isOverLimit || showError) {
        return cn(
          'border-[var(--color-error)]',
          isFocused && 'ring-1 ring-[var(--color-error)]'
        );
      }
      if (isFocused) {
        return 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]';
      }
      return 'border-[var(--color-border-emphasis)]';
    };

    // the root is always the wrapper, so an error appearing doesn't remount the field
    const box = (
      <div
        className={cn(
          'flex flex-col rounded-md border p-1 transition-colors',
          getBorderClass(),
          disabled
            ? 'bg-[var(--color-surface-canvas)]'
            : 'bg-[var(--color-surface-card)]'
        )}
      >
        {/* Chromeless textarea */}
        <textarea
          ref={setRef}
          id={id}
          value={value}
          onChange={(e) => {
            if (valueProp === undefined) setOwn(e.target.value);
            onChange?.(e);
          }}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            onFocus?.(e);
            setIsFocused(true);
          }}
          onBlur={(e) => {
            onBlur?.(e);
            setIsFocused(false);
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled || loading}
          rows={1}
          aria-label={label ? undefined : placeholder}
          {...props}
          aria-invalid={showError || isOverLimit || undefined}
          aria-describedby={
            [descriptionId, props['aria-describedby']]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={`scrollbar-thin type-body-sm block w-full border-0 bg-transparent px-2 pt-2 pb-1 focus:ring-0 focus:outline-none ${
            disabled
              ? 'cursor-not-allowed text-[var(--color-text-disabled)]'
              : 'text-[var(--color-text-default)]'
          }`}
          style={{ minHeight: '36px', resize: 'none' }}
        />

        {/* Bottom row: char count + submit button */}
        <div className="flex items-center justify-between pl-2">
          {maxLength !== undefined ? (
            <span
              className={`type-label-compact ${
                isOverLimit
                  ? 'text-[var(--color-error)]'
                  : 'text-[var(--color-text-faint)]'
              }`}
            >
              {value.length}/{maxLength}
            </span>
          ) : (
            <span />
          )}
          <Button
            variant="primary"
            size="xs"
            iconOnly
            Icon={ArrowUp}
            onClick={submit}
            disabled={!canSubmit}
            loading={loading}
            aria-label={submitLabel}
          />
        </div>
      </div>
    );

    return (
      <div className={cn(className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'type-label mb-1 block',
              disabled
                ? 'text-[var(--color-text-disabled)]'
                : 'text-[var(--color-text-default)]'
            )}
          >
            {label}
          </label>
        )}
        {box}
        {showError && (
          <p id={errorId} className="type-body-sm mt-1 text-[var(--color-error)]">
            {error}
          </p>
        )}
        {!showError && helperText && (
          <p
            id={helperId}
            className={cn(
              'type-caption mt-1',
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

ChatInput.displayName = 'ChatInput';

export default ChatInput;
