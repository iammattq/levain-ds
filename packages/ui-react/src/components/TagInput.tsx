'use client';

import React, { useState, useRef, KeyboardEvent, forwardRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import Tag from './Tag';
import { Button } from './Button';

export interface TagOption {
  id: string;
  name: string;
}

export interface TagInputProps {
  /** Unique identifier for the input */
  id: string;
  /** Text label for the tag input field */
  label: string;
  /** Array of all available tags */
  availableTags: TagOption[];
  /** Array of selected tag IDs */
  selectedTags: string[];
  /** Called when selected tags change (value-based per conventions) */
  onChange: (tags: string[]) => void;
  /** Whether the tags are currently being loaded */
  loading?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional function to handle creating new tags */
  onCreateTag?: (tagName: string) => Promise<TagOption>;
  /** Optional error message to display */
  error?: string;
  /** Whether the field has been touched (controls error visibility) */
  touched?: boolean;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the container */
  className?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Maximum number of tags that can be selected */
  maxTags?: number;
  /** Whether to use compact sizing (smaller typography and reduced padding) */
  compact?: boolean;
}

const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      id,
      label,
      availableTags = [],
      selectedTags = [],
      onChange,
      loading = false,
      disabled = false,
      onCreateTag,
      error,
      touched = false,
      helperText,
      className = '',
      required = false,
      maxTags,
      compact = false,
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState('');
    const [creatingTag, setCreatingTag] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const showError = touched && !!error;

    // Add debugging for state changes
    /*console.log('[TagInput] Render with state:', { 
      inputValue, 
      isCreatingTag, 
      focused, 
      selectedTags, 
      availableTags: availableTags.length 
    });*/

    const combinedRef = (node: HTMLInputElement) => {
      // Forward the ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      inputRef.current = node;
    };

    const reachedMaxTags =
      maxTags !== undefined && selectedTags.length >= maxTags;

    // Handle removing a tag
    const handleRemoveTag = (tagId: string) => {
      //console.log('[TagInput] Removing tag:', tagId);
      onChange(selectedTags.filter((id) => id !== tagId));
    };

    // Handle adding an existing tag
    const handleAddTag = (tagId: string) => {
      //console.log('[TagInput] Adding tag:', tagId);
      if (!selectedTags.includes(tagId)) {
        //console.log('[TagInput] Tag not in selected tags, adding it');
        onChange([...selectedTags, tagId]);
        setInputValue('');
      }
    };

    // Handle creating a new tag
    const handleCreateTag = async () => {
      const tagName = inputValue.trim();
      if (!tagName || !onCreateTag || creatingTag || disabled) {
        return;
      }

      try {
        setCreatingTag(true);
        const newTag = await onCreateTag(tagName);
        onChange([...selectedTags, newTag.id]);
        setInputValue('');
      } catch (err) {
        console.error('[TagInput] Error creating tag:', err);
      } finally {
        setCreatingTag(false);
      }
    };

    // Handle key press in the input
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      //console.log('[TagInput] Key pressed:', e.key);
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault(); // Prevent form submission

        // Check if the tag exists
        const existingTag = availableTags.find(
          (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
        );

        //console.log('[TagInput] Enter pressed with input:', inputValue);
        //console.log('[TagInput] Existing tag found:', existingTag);

        if (existingTag) {
          handleAddTag(existingTag.id);
        } else if (onCreateTag) {
          handleCreateTag();
        }
      }
    };

    // Get tag details by ID
    const getTagById = (tagId: string) => {
      return availableTags.find((tag) => tag.id === tagId);
    };

    // Filter available tags based on input
    const filteredAvailableTags = availableTags
      .filter(
        (tag) =>
          !selectedTags.includes(tag.id) &&
          tag.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      .slice(0, 5); // Limit to 5 suggestions

    // Focus the input when clicking on the container
    const handleContainerClick = () => {
      //console.log('[TagInput] Container clicked');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Fix for focus state management
    const handleFocus = () => {
      //console.log('[TagInput] Input focused');
      setFocused(true);
    };

    const handleBlur = (e: React.FocusEvent) => {
      // Only blur if we're not clicking within our component
      // This prevents the dropdown from disappearing when clicking on a suggestion
      // Check if the related target is within our component
      //console.log('[TagInput] Blur event, related target:', e.relatedTarget);

      // Capture currentTarget before it becomes null in setTimeout
      const currentTarget = e.currentTarget;

      // Delay the blur slightly to allow click events on dropdown items to complete
      setTimeout(() => {
        // Only blur if we're not focused on an element within our component
        if (currentTarget && document.activeElement) {
          const isClickingInside = currentTarget.contains(
            document.activeElement
          );
          //console.log('[TagInput] Is clicking inside component:', isClickingInside);

          if (!isClickingInside) {
            setFocused(false);
          }
        } else {
          // If we can't determine, default to keeping focus
          //console.log('[TagInput] Cannot determine if clicking inside (currentTarget or activeElement is null)');
        }
      }, 100);
    };

    return (
      <div className={`space-y-2 ${className}`} onBlur={handleBlur}>
        <div>
          <label
            htmlFor={id}
            className={`${compact ? 'type-label-sm' : 'type-label'} mb-1 block ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        </div>

        {/* Selected Tags */}
        <div
          className={`flex flex-wrap items-center gap-2 rounded-md border transition-colors ${
            compact ? 'min-h-7 px-2 py-1' : 'min-h-[42px] p-2'
          } ${
            disabled
              ? 'cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-surface-canvas)]'
              : focused
                ? 'border-[var(--color-primary)] bg-[var(--color-surface-card)] ring-1 ring-[var(--color-primary)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-card)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-card)]'
          }`}
          onClick={disabled ? undefined : handleContainerClick}
        >
          {loading ? (
            <div
              className={`${compact ? 'type-body-sm' : 'type-body-sm'} flex items-center text-[var(--color-text-muted)]`}
            >
              <Loader2
                className={`mr-2 ${compact ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`}
              />
              Loading tags...
            </div>
          ) : selectedTags.length === 0 ? (
            <div
              className={`${compact ? 'type-body-sm' : 'type-body-sm'} text-[var(--color-text-muted)]`}
            ></div>
          ) : (
            selectedTags.map((tagId) => {
              const tag = getTagById(tagId);
              return tag ? (
                <Tag
                  key={tag.id}
                  variant="default"
                  size={compact ? 'sm' : 'md'}
                >
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag.id);
                    }}
                    disabled={disabled}
                    className={`focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}`}
                    aria-label={`Remove ${tag.name} tag`}
                  >
                    <X className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
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
              className={`${compact ? 'type-body-sm' : 'type-body-sm'} min-w-[120px] flex-1 border-0 bg-transparent p-0 placeholder-[var(--color-text-muted)] outline-none ${
                disabled
                  ? 'cursor-not-allowed text-[var(--color-text-disabled)]'
                  : 'text-[var(--color-text-default)]'
              }`}
              placeholder={
                selectedTags.length > 0
                  ? 'Add more tags...'
                  : 'Start typing to add tags...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              disabled={disabled || loading}
              aria-invalid={showError}
            />
          )}
        </div>

        {/* Tag Suggestions */}
        {focused &&
          inputValue &&
          filteredAvailableTags.length > 0 &&
          !disabled && (
            <div className="z-10 mt-1 overflow-hidden rounded-md border border-[var(--color-border-default)] shadow-sm">
              {filteredAvailableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddTag(tag.id);
                  }}
                  className={`${compact ? 'type-body-sm px-2 py-1' : 'type-body-sm px-3 py-2'} w-full text-left text-[var(--color-text-default)] hover:bg-[var(--color-surface-3)]`}
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
              size={compact ? 'xs' : 'sm'}
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
                  className={`mr-2 ${compact ? 'h-3 w-3' : 'h-4 w-4'} animate-spin`}
                />
              ) : (
                <Plus className={`mr-2 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              )}
              Create &ldquo;{inputValue}&rdquo;
            </Button>
          )}

        {/* Error message */}
        {showError && !disabled && (
          <p
            className={`${compact ? 'type-caption' : 'type-body-sm'} mt-1 text-[var(--color-error)]`}
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {(!showError || disabled) && helperText && (
          <p
            className={`${compact ? 'type-caption-compact' : 'type-caption'} mt-1 ${disabled ? 'text-[var(--color-text-disabled)]' : ''}`}
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
