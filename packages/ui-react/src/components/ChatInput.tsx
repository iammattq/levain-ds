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

export interface ChatInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'onChange' | 'onSubmit'
> {
  /** Optional unique identifier for the textarea */
  id?: string;
  /** Current value of the input */
  value: string;
  /** Function called when the input value changes */
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Function called when the form is submitted (button click or Enter key) */
  onSubmit: () => void;
  /** Maximum character length */
  maxLength?: number;
  /** Whether the input is in a loading state */
  loading?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class name for the container */
  className?: string;
  /** Accessible label for the submit button */
  submitLabel?: string;
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      id: providedId,
      value,
      onChange,
      onSubmit,
      placeholder,
      maxLength,
      loading = false,
      disabled = false,
      className = '',
      submitLabel = 'Submit',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef =
      (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef;
    const [isFocused, setIsFocused] = useState(false);

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
    }, [textareaRef]);

    useEffect(() => {
      adjustHeight();
    }, [value, adjustHeight]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !disabled && !loading) {
          onSubmit();
        }
      }
    };

    const handleSubmit = () => {
      if (value.trim() && !disabled && !loading) {
        onSubmit();
      }
    };

    const isOverLimit = maxLength !== undefined && value.length > maxLength;
    const canSubmit =
      value.trim().length > 0 && !isOverLimit && !disabled && !loading;

    // Determine container border color based on state
    const getBorderClass = () => {
      if (disabled) {
        return 'border-[var(--color-border-default)]';
      }
      if (isOverLimit) {
        return 'border-[var(--color-error)]';
      }
      if (isFocused) {
        return 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]';
      }
      return 'border-[var(--color-border-emphasis)]';
    };

    return (
      <div
        className={`flex flex-col rounded-md border p-1 transition-colors ${getBorderClass()} ${
          disabled
            ? 'bg-[var(--color-surface-canvas)]'
            : 'bg-[var(--color-surface-card)]'
        } ${className}`}
      >
        {/* Chromeless textarea */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled || loading}
          rows={1}
          aria-label={placeholder}
          {...props}
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
            onClick={handleSubmit}
            disabled={!canSubmit}
            loading={loading}
            aria-label={submitLabel}
          />
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
