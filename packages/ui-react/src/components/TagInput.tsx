'use client';

import React, {
  useState,
  useRef,
  KeyboardEvent,
  forwardRef,
  useId,
  InputHTMLAttributes,
} from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import Tag from './Tag';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';

export interface TagOption {
  id: string;
  name: string;
}

/**
 * TagInput follows the form-input convention (docs/prop-conventions.json, formInputs): `value` / `defaultValue` (the
 * selected ids) and `onChange(ids)`. The text field is a combobox: typing filters the suggestions, ArrowDown/ArrowUp
 * move through them, Enter adds the active one (or the typed name), Escape closes them. Every prop it doesn't name goes
 * to the text <input>, as does the ref.
 */
export interface TagInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'className' | 'id'
> {
  /** The text field's id; generated when left out */
  id?: string;
  /** Visible label. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Array of all available tags */
  availableTags: TagOption[];
  /** The selected tag ids (controlled); leave out to let the input keep its own */
  value?: string[];
  /** The ids selected at first, when `value` is left out */
  defaultValue?: string[];
  /** @deprecated use `value` */
  selectedTags?: string[];
  /** Called with the whole new id list when a tag is added or removed */
  onChange?: (tags: string[]) => void;
  /** Whether the tags are currently being loaded */
  loading?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional function to handle creating new tags */
  onCreateTag?: (tagName: string) => Promise<TagOption>;
  /** Error message; shown unless `touched` is false or the field is disabled */
  error?: string;
  /** Leave out to show `error` at once; pass the field's touched state to hold it until the field is left */
  touched?: boolean;
  /** Optional helper text shown below the input (the error replaces it) */
  helperText?: string;
  /** Additional class name for the root */
  className?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Maximum number of tags that can be selected (the text field goes away when it is reached) */
  maxTags?: number;
  /** 'xs' (smaller type and padding) or 'md' (the default) */
  size?: 'xs' | 'md';
  /** @deprecated use `size="xs"` */
  compact?: boolean;
}

const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      id: idProp,
      label,
      availableTags = [],
      value: valueProp,
      defaultValue,
      selectedTags: selectedTagsProp,
      onChange,
      loading = false,
      disabled = false,
      onCreateTag,
      error,
      touched,
      helperText,
      className,
      required = false,
      maxTags,
      size,
      compact = false,
      placeholder,
      onKeyDown,
      onFocus,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const xs = (size ?? (compact ? 'xs' : 'md')) === 'xs';
    const [selectedTags, setSelectedTags] = useControlled<string[]>(
      valueProp ?? selectedTagsProp,
      defaultValue ?? [],
      onChange,
      'TagInput'
    );
    // the latest list, for a tag created after an await
    const selectedRef = useRef(selectedTags);
    selectedRef.current = selectedTags;

    const [inputValue, setInputValue] = useState('');
    const [creatingTag, setCreatingTag] = useState(false);
    const [focused, setFocused] = useState(false);
    // the suggestion ArrowDown/ArrowUp point at (-1: none); Escape closes the list until the next keystroke
    const [active, setActive] = useState(-1);
    const [closed, setClosed] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // An error shows when set, unless touched is false; while disabled the helper shows instead
    const showError = !!error && touched !== false && !disabled;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const listId = `${id}-suggestions`;
    const optionId = (i: number) => `${id}-option-${i}`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const combinedRef = (node: HTMLInputElement) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      inputRef.current = node;
    };

    const reachedMaxTags =
      maxTags !== undefined && selectedTags.length >= maxTags;

    const handleRemoveTag = (tagId: string) => {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    };

    const handleAddTag = (tagId: string) => {
      if (!selectedTags.includes(tagId)) {
        setSelectedTags([...selectedTags, tagId]);
        setInputValue('');
        setActive(-1);
      }
    };

    const handleCreateTag = async () => {
      const tagName = inputValue.trim();
      if (!tagName || !onCreateTag || creatingTag || disabled) {
        return;
      }

      try {
        setCreatingTag(true);
        const newTag = await onCreateTag(tagName);
        setSelectedTags([...selectedRef.current, newTag.id]);
        setInputValue('');
      } catch (err) {
        console.error('[TagInput] Error creating tag:', err);
      } finally {
        setCreatingTag(false);
      }
    };

    // Filter available tags based on input
    const filteredAvailableTags = availableTags
      .filter(
        (tag) =>
          !selectedTags.includes(tag.id) &&
          tag.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 suggestions

    const suggestionsOpen =
      focused &&
      !!inputValue &&
      !closed &&
      filteredAvailableTags.length > 0 &&
      !disabled;
    const activeIndex =
      suggestionsOpen && active < filteredAvailableTags.length ? active : -1;

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      // the app's handler runs first; preventDefault there skips ours
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const count = filteredAvailableTags.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!inputValue || !count) return;
        e.preventDefault();
        setClosed(false);
        const down = e.key === 'ArrowDown';
        if (!suggestionsOpen || activeIndex === -1) {
          setActive(down ? 0 : count - 1);
        } else {
          setActive((activeIndex + (down ? 1 : count - 1)) % count);
        }
      } else if (e.key === 'Escape') {
        if (suggestionsOpen) {
          // claimed: a dialog around it leaves this Escape alone and stays open
          e.preventDefault();
          setClosed(true);
          setActive(-1);
        }
      } else if (e.key === 'Enter' && activeIndex !== -1) {
        e.preventDefault(); // Prevent form submission
        handleAddTag(filteredAvailableTags[activeIndex].id);
      } else if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault(); // Prevent form submission

        const existingTag = availableTags.find(
          (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
        );

        if (existingTag) {
          handleAddTag(existingTag.id);
        } else if (onCreateTag) {
          handleCreateTag();
        }
      }
    };

    const getTagById = (tagId: string) => {
      return availableTags.find((tag) => tag.id === tagId);
    };

    // Focus the input when clicking on the container
    const handleContainerClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(e);
      setFocused(true);
    };

    const handleBlur = (e: React.FocusEvent) => {
      // Only blur if we're not clicking within our component
      // This prevents the dropdown from disappearing when clicking on a suggestion
      // Capture currentTarget before it becomes null in setTimeout
      const currentTarget = e.currentTarget;

      // Delay the blur slightly to allow click events on dropdown items to complete
      setTimeout(() => {
        // Only blur if we're not focused on an element within our component
        if (currentTarget && document.activeElement) {
          const isClickingInside = currentTarget.contains(
            document.activeElement
          );

          if (!isClickingInside) {
            setFocused(false);
            setActive(-1);
          }
        }
      }, 100);
    };

    return (
      <div className={cn('space-y-2', className)} onBlur={handleBlur}>
        {label && (
          <div>
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
              {required && (
                <span className="text-[var(--color-error)]">*</span>
              )}
            </label>
          </div>
        )}

        {/* Selected Tags */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-md border transition-colors',
            xs ? 'min-h-7 px-2 py-1' : 'min-h-[42px] p-2',
            // a text field shows focus however it came; in error the focus colour is the error's
            disabled
              ? 'cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-surface-canvas)]'
              : showError
                ? cn(
                    'border-[var(--color-error)] bg-[var(--color-surface-card)]',
                    focused && 'ring-1 ring-[var(--color-error)]'
                  )
                : focused
                  ? 'border-[var(--color-primary)] bg-[var(--color-surface-card)] ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-card)]'
          )}
          onClick={disabled ? undefined : handleContainerClick}
        >
          {loading ? (
            <div className="type-body-sm flex items-center text-[var(--color-text-muted)]">
              <Loader2
                className={`mr-2 ${xs ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`}
              />
              Loading tags...
            </div>
          ) : selectedTags.length === 0 ? (
            <div className="type-body-sm text-[var(--color-text-muted)]"></div>
          ) : (
            selectedTags.map((tagId) => {
              const tag = getTagById(tagId);
              return tag ? (
                <Tag key={tag.id} variant="default" size={xs ? 'sm' : 'md'}>
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag.id);
                    }}
                    disabled={disabled}
                    className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}`}
                    aria-label={`Remove ${tag.name} tag`}
                  >
                    <X className={xs ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                  </button>
                </Tag>
              ) : null;
            })
          )}

          {!reachedMaxTags && (
            <input
              ref={combinedRef}
              id={id}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen}
              aria-controls={suggestionsOpen ? listId : undefined}
              aria-activedescendant={
                activeIndex !== -1 ? optionId(activeIndex) : undefined
              }
              placeholder={
                placeholder ??
                (selectedTags.length > 0
                  ? 'Add more tags...'
                  : 'Start typing to add tags...')
              }
              {...props}
              className={cn(
                'type-body-sm min-w-[120px] flex-1 border-0 bg-transparent p-0 placeholder-[var(--color-text-muted)] outline-none',
                disabled
                  ? 'cursor-not-allowed text-[var(--color-text-disabled)]'
                  : 'text-[var(--color-text-default)]'
              )}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setClosed(false);
                setActive(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              disabled={disabled || loading}
              required={required && selectedTags.length === 0}
              aria-invalid={showError}
              aria-describedby={
                [descriptionId, props['aria-describedby']]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            />
          )}
        </div>

        {/* Tag Suggestions */}
        {suggestionsOpen && (
          <div
            id={listId}
            role="listbox"
            aria-label={label ? `${label} suggestions` : 'Suggestions'}
            className="z-10 mt-1 overflow-hidden rounded-md border border-[var(--color-border-default)] shadow-sm"
          >
            {filteredAvailableTags.map((tag, i) => (
              <button
                key={tag.id}
                id={optionId(i)}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddTag(tag.id);
                }}
                className={cn(
                  xs ? 'type-body-sm px-2 py-1' : 'type-body-sm px-3 py-2',
                  'w-full text-left text-[var(--color-text-default)] hover:bg-[var(--color-surface-3)]',
                  i === activeIndex && 'bg-[var(--color-surface-3)]'
                )}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Add new tag button */}
        {focused &&
          inputValue &&
          onCreateTag &&
          !disabled &&
          !filteredAvailableTags.some(
            (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
          ) && (
            <Button
              type="button"
              variant="secondary"
              size={xs ? 'xs' : 'sm'}
              onMouseDown={(e) => {
                e.preventDefault();
                setFocused(true);
                handleCreateTag().catch();
              }}
              disabled={!inputValue.trim() || creatingTag}
              className="relative z-20 mt-1"
            >
              {creatingTag ? (
                <Loader2
                  className={`mr-2 ${xs ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`}
                />
              ) : (
                <Plus className={`mr-2 ${xs ? 'h-3 w-3' : 'h-4 w-4'}`} />
              )}
              Create &ldquo;{inputValue}&rdquo;
            </Button>
          )}

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

TagInput.displayName = 'TagInput';

export default TagInput;
