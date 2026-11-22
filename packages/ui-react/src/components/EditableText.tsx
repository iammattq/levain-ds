'use client';

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  KeyboardEvent,
  useCallback,
} from 'react';
import { cn } from '../utils/cn';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from './Button';
import TextInput from './TextInput';

export interface EditableTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Text value to display/edit */
  value: string;
  /** Function called when the text value is updated and saved */
  onSave: (value: string) => void;
  /** Whether to show the pencil icon beside the text */
  showEditIcon?: boolean;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for the input element */
  inputClassName?: string;
  /** Custom placeholder for the input */
  placeholder?: string;
  /** Whether the editable text is disabled */
  disabled?: boolean;
}

/**
 * EditableText component - display text that turns into an input when double-clicked or when the edit icon is clicked
 */
const EditableText = forwardRef<HTMLDivElement, EditableTextProps>(
  (
    {
      value,
      onSave,
      showEditIcon = false,
      className = '',
      inputClassName = '',
      placeholder = 'Enter text...',
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const textRef = useRef<HTMLSpanElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);

    // Memoize calculateTextWidth as it depends on placeholder prop
    const calculateTextWidth = useCallback(
      (text: string) => {
        if (!measureRef.current) return 0;

        // Use the measurement span to calculate width
        measureRef.current.textContent = text || placeholder;
        const width = measureRef.current.getBoundingClientRect().width;

        // Increase buffer from 6px to 12px to prevent text cutoff
        return Math.max(width, 40) + 36;
      },
      [placeholder]
    );

    // Memoize updateWidth as it depends on calculateTextWidth and inputValue
    const updateWidth = useCallback(() => {
      setInputWidth(calculateTextWidth(inputValue));
    }, [calculateTextWidth, inputValue]);

    // Set input width based on text width when editing starts
    useEffect(() => {
      if (isEditing) {
        updateWidth();
      }
    }, [isEditing, updateWidth]);

    // Update input value when value prop changes (if not editing)
    useEffect(() => {
      if (!isEditing) {
        setInputValue(value);
      }
    }, [value, isEditing]);

    const handleStartEdit = () => {
      if (disabled) return;
      setIsEditing(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      // Update width as user types
      updateWidth();
    };

    const handleSave = () => {
      onSave(inputValue);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setInputValue(value);
      setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group inline-flex items-center',
          disabled ? 'cursor-not-allowed opacity-70' : 'cursor-text',
          className
        )}
        {...props}
      >
        {/* Invisible span used for measuring text width */}
        <span
          ref={measureRef}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute whitespace-pre opacity-0',
            className
          )}
        />

        {isEditing ? (
          <div className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-card)]">
            <TextInput
              id={`editable-text-${Math.random().toString(36).substring(2, 9)}`}
              label=""
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{ width: `${inputWidth}px` }}
              helperText=""
              className="m-0 p-0"
              inputClassName={cn(
                'px-2 py-1 rounded-l-md border border-[var(--color-border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]',
                inputClassName
              )}
              autoFocus
            />
            <div className="inline-flex items-center pr-1">
              <Button
                onClick={handleSave}
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-1 text-[var(--color-success)]"
                aria-label="Save"
                Icon={Check}
                iconOnly
              />
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="icon"
                className="ml-1 h-8 w-8 p-1 text-[var(--color-error)]"
                aria-label="Cancel"
                Icon={X}
                iconOnly
              />
            </div>
          </div>
        ) : (
          <>
            <span
              ref={textRef}
              className="inline-block"
              onDoubleClick={handleStartEdit}
            >
              {value || placeholder}
            </span>
            {showEditIcon && !disabled && (
              <Button
                onClick={handleStartEdit}
                variant="ghost"
                size="icon"
                className="ml-1 h-8 w-8 p-1 text-[var(--color-text-default)] opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Edit"
                Icon={Pencil}
                iconOnly
              />
            )}
          </>
        )}
      </div>
    );
  }
);

EditableText.displayName = 'EditableText';

export { EditableText };
