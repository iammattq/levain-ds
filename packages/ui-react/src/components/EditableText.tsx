'use client';

import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  KeyboardEvent,
  useCallback,
  useId,
} from 'react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from './Button';
import TextInput from './TextInput';

/**
 * EditableText follows the form-input convention (docs/prop-conventions.json, formInputs) as an input with no native
 * field at rest: `value` / `defaultValue` is the saved text, and `onChange(value)` and `onSave(value)` both fire when an
 * edit is saved (the draft while typing stays inside). The root is focusable at rest and takes the ref, the `id` and
 * every prop it doesn't name; double-click, Enter or F2 on it (or the edit icon) starts editing; in the field Enter
 * saves and Escape cancels, and focus goes back to the root. No `error`: no use needs one yet.
 */
export interface EditableTextProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** The saved text (controlled); leave out to let it keep its own */
  value?: string;
  /** The text at first, when `value` is left out */
  defaultValue?: string;
  /** Called with the new text when an edit is saved */
  onChange?: (value: string) => void;
  /** Called with the new text when an edit is saved (the commit; fires with `onChange`) */
  onSave?: (value: string) => void;
  /** Whether to show the pencil icon beside the text */
  showEditIcon?: boolean;
  /** Additional class name for the root */
  className?: string;
  /** Additional class name for the input element */
  inputClassName?: string;
  /** Custom placeholder for the input */
  placeholder?: string;
  /** Whether the editable text is disabled */
  disabled?: boolean;
}

const EditableText = forwardRef<HTMLDivElement, EditableTextProps>(
  (
    {
      id: idProp,
      value: valueProp,
      defaultValue = '',
      onChange,
      onSave,
      showEditIcon = false,
      className,
      inputClassName,
      placeholder = 'Enter text...',
      disabled = false,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const [value, setValue] = useControlled(
      valueProp,
      defaultValue,
      onChange,
      'EditableText'
    );
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);
    // focus goes back to the root when an edit ends from inside the field
    const refocus = useRef(false);

    const setRef = (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

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

    useEffect(() => {
      if (!isEditing && refocus.current) {
        refocus.current = false;
        rootRef.current?.focus();
      }
    }, [isEditing]);

    const handleStartEdit = () => {
      if (disabled) return;
      setInputValue(value);
      setIsEditing(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      // Update width as user types
      updateWidth();
    };

    const endEdit = () => {
      refocus.current =
        !!rootRef.current?.contains(document.activeElement) ||
        document.activeElement === document.body;
      setIsEditing(false);
    };

    const handleSave = () => {
      setValue(inputValue);
      onSave?.(inputValue);
      endEdit();
    };

    const handleCancel = () => {
      setInputValue(value);
      endEdit();
    };

    const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // an Enter that ends an IME composition picks the characters; it doesn't save
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        // claimed: a dialog around it leaves this Escape alone and stays open
        e.preventDefault();
        handleCancel();
      }
    };

    // at rest, Enter or F2 on the root starts editing (not from the edit button inside it)
    const handleRootKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || isEditing || e.target !== e.currentTarget)
        return;
      if (e.key === 'Enter' || e.key === 'F2') {
        e.preventDefault();
        handleStartEdit();
      }
    };

    return (
      <div
        ref={setRef}
        id={id}
        tabIndex={!isEditing && !disabled ? 0 : undefined}
        aria-disabled={disabled || undefined}
        className={cn(
          'group inline-flex items-center rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
          disabled ? 'cursor-not-allowed opacity-70' : 'cursor-text',
          className
        )}
        {...props}
        onKeyDown={handleRootKeyDown}
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
              id={`${id}-input`}
              label={props['aria-label'] ?? 'Edit text'}
              hideLabel
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
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
            <span className="inline-block" onDoubleClick={handleStartEdit}>
              {value || placeholder}
            </span>
            {showEditIcon && !disabled && (
              <Button
                onClick={handleStartEdit}
                variant="ghost"
                size="icon"
                className="ml-1 h-8 w-8 p-1 text-[var(--color-text-default)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
