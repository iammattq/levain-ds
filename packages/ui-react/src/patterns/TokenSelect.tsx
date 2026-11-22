'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';

/**
 * Token category definitions matching design-tokens-v2.json
 */
export type TokenCategory =
  | 'surface-ramp' // 0-25 surface indices
  | 'surface-semantic' // canvas, section, card, etc.
  | 'text' // emphasis, default, muted, etc.
  | 'border' // subtle, default, emphasis, etc.
  | 'brand' // primary, accent
  | 'action-success' // success base, fg, bg
  | 'action-error' // error base, fg, bg
  | 'action-caution' // caution base, fg, bg
  | 'action-info'; // info base, fg, bg

/**
 * Token option with value, label, and CSS variable
 */
export interface TokenOption {
  value: string;
  label: string;
  cssVar: string;
}

/**
 * Get token options for a category
 */
export function getTokensForCategory(category: TokenCategory): TokenOption[] {
  switch (category) {
    case 'surface-ramp':
      return Array.from({ length: 26 }, (_, i) => ({
        value: String(i),
        label: String(i),
        cssVar: `var(--color-surface-${i})`,
      }));
    case 'surface-semantic':
      return [
        {
          value: 'canvas',
          label: 'Canvas',
          cssVar: 'var(--color-surface-canvas)',
        },
        {
          value: 'section',
          label: 'Section',
          cssVar: 'var(--color-surface-section)',
        },
        { value: 'card', label: 'Card', cssVar: 'var(--color-surface-card)' },
        {
          value: 'component',
          label: 'Component',
          cssVar: 'var(--color-surface-component)',
        },
        {
          value: 'subtle',
          label: 'Subtle',
          cssVar: 'var(--color-surface-subtle)',
        },
        {
          value: 'interactive',
          label: 'Interactive',
          cssVar: 'var(--color-surface-interactive)',
        },
        {
          value: 'elevated',
          label: 'Elevated',
          cssVar: 'var(--color-surface-elevated)',
        },
        {
          value: 'inverted',
          label: 'Inverted',
          cssVar: 'var(--color-surface-inverted)',
        },
      ];
    case 'text':
      return [
        {
          value: 'emphasis',
          label: 'Emphasis',
          cssVar: 'var(--color-text-emphasis)',
        },
        {
          value: 'default',
          label: 'Default',
          cssVar: 'var(--color-text-default)',
        },
        { value: 'muted', label: 'Muted', cssVar: 'var(--color-text-muted)' },
        { value: 'faint', label: 'Faint', cssVar: 'var(--color-text-faint)' },
        {
          value: 'disabled',
          label: 'Disabled',
          cssVar: 'var(--color-text-disabled)',
        },
        {
          value: 'inverted',
          label: 'Inverted',
          cssVar: 'var(--color-text-inverted)',
        },
        { value: 'link', label: 'Link', cssVar: 'var(--color-text-link)' },
      ];
    case 'border':
      return [
        {
          value: 'subtle',
          label: 'Subtle',
          cssVar: 'var(--color-border-subtle)',
        },
        {
          value: 'default',
          label: 'Default',
          cssVar: 'var(--color-border-default)',
        },
        {
          value: 'emphasis',
          label: 'Emphasis',
          cssVar: 'var(--color-border-emphasis)',
        },
        { value: 'focus', label: 'Focus', cssVar: 'var(--color-border-focus)' },
        {
          value: 'decorative',
          label: 'Decorative',
          cssVar: 'var(--color-border-decorative)',
        },
      ];
    case 'brand':
      return [
        { value: 'primary', label: 'Primary', cssVar: 'var(--color-primary)' },
        { value: 'accent', label: 'Accent', cssVar: 'var(--color-accent)' },
      ];
    case 'action-success':
      return [
        { value: 'base', label: 'Success', cssVar: 'var(--color-success)' },
        { value: 'fg', label: 'Success FG', cssVar: 'var(--color-success-fg)' },
        { value: 'bg', label: 'Success BG', cssVar: 'var(--color-success-bg)' },
      ];
    case 'action-error':
      return [
        { value: 'base', label: 'Error', cssVar: 'var(--color-error)' },
        { value: 'fg', label: 'Error FG', cssVar: 'var(--color-error-fg)' },
        { value: 'bg', label: 'Error BG', cssVar: 'var(--color-error-bg)' },
      ];
    case 'action-caution':
      return [
        { value: 'base', label: 'Caution', cssVar: 'var(--color-caution)' },
        { value: 'fg', label: 'Caution FG', cssVar: 'var(--color-caution-fg)' },
        { value: 'bg', label: 'Caution BG', cssVar: 'var(--color-caution-bg)' },
      ];
    case 'action-info':
      return [
        { value: 'base', label: 'Info', cssVar: 'var(--color-info)' },
        { value: 'fg', label: 'Info FG', cssVar: 'var(--color-info-fg)' },
        { value: 'bg', label: 'Info BG', cssVar: 'var(--color-info-bg)' },
      ];
    default:
      return [];
  }
}

/** Size variants for TokenSelect */
export type TokenSelectSize = InputSize;

export interface TokenSelectProps {
  /** Unique identifier for the select */
  id: string;
  /** Text label for the select field */
  label: string;
  /** Current selected value */
  value: string;
  /** Function called when selection changes */
  onChange: (value: string) => void;
  /** Token category to display options from */
  tokenCategory: TokenCategory;
  /** Custom token options (overrides tokenCategory) */
  options?: TokenOption[];
  /** Error message to display */
  error?: string;
  /** Optional helper text shown below the select */
  helperText?: string;
  /** Additional class name for the container */
  className?: string;
  /** Whether the field has been touched/blurred */
  touched?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Function called when the select loses focus */
  onBlur?: () => void;
  /** Size variant for the select. Defaults to 'md'. */
  size?: TokenSelectSize;
  /**
   * @deprecated Use size="xs" instead. Will be removed in a future version.
   */
  compact?: boolean;
  /** Tab index for keyboard navigation order */
  tabIndex?: number;
}

/**
 * TokenSelect - A custom dropdown for selecting design tokens with color previews
 *
 * Features:
 * - Color swatch previews for each option
 * - Scrollable dropdown with portal rendering
 * - Full keyboard navigation (arrow keys, home/end, type-ahead)
 * - WAI-ARIA listbox pattern for accessibility
 * - Follows design system input conventions
 */
const TokenSelect = forwardRef<HTMLButtonElement, TokenSelectProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      tokenCategory,
      options: customOptions,
      error,
      helperText,
      className = '',
      touched = false,
      required = false,
      disabled = false,
      onBlur,
      size,
      compact = false,
      tabIndex,
    },
    ref
  ) => {
    // Handle deprecated compact prop - size takes precedence
    const effectiveSize: TokenSelectSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>(
      {}
    );
    const [focusedIndex, setFocusedIndex] = useState(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Use custom options or get from category
    const options = customOptions ?? getTokensForCategory(tokenCategory);

    // Find current value index
    const currentIndex = options.findIndex((opt) => opt.value === value);

    // Error display logic
    const showError = touched && !!error;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const listboxId = `${id}-listbox`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    // Get current option for display
    const currentOption = options[currentIndex] ?? options[0];

    // Calculate dropdown position based on the container (includes color chip)
    const calculatePosition = useCallback(() => {
      const container = containerRef.current;
      if (!container) return {};
      const rect = container.getBoundingClientRect();
      const dropdownHeight = 192; // max-h-48 = 12rem = 192px

      let top = rect.bottom + 4;
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 4;
      }
      if (top < 4) {
        top = 4;
      }

      return {
        position: 'fixed' as const,
        top: `${top}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
        maxWidth: '160px',
        width: 'max-content',
        zIndex: 100,
      };
    }, []);

    // Open handler
    const handleOpen = useCallback(() => {
      if (disabled) return;
      setDropdownStyles(calculatePosition());
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
      setIsOpen(true);
    }, [calculatePosition, currentIndex, disabled]);

    // Close handler
    const handleClose = useCallback(() => {
      setIsOpen(false);
      onBlur?.();
    }, [onBlur]);

    // Scroll focused option into view
    useEffect(() => {
      if (isOpen && optionRefs.current[focusedIndex]) {
        optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
      }
    }, [isOpen, focusedIndex]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
          if (['ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(e.key)) {
            e.preventDefault();
            handleOpen();
          }
          return;
        }

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            {
              const next = Math.min(focusedIndex + 1, options.length - 1);
              setFocusedIndex(next);
              onChange(options[next].value);
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            {
              const prev = Math.max(focusedIndex - 1, 0);
              setFocusedIndex(prev);
              onChange(options[prev].value);
            }
            break;
          case 'Home':
            e.preventDefault();
            setFocusedIndex(0);
            onChange(options[0].value);
            break;
          case 'End':
            e.preventDefault();
            setFocusedIndex(options.length - 1);
            onChange(options[options.length - 1].value);
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            handleClose();
            (ref && 'current' in ref
              ? ref.current
              : buttonRef.current
            )?.focus();
            break;
          case 'Escape':
            e.preventDefault();
            handleClose();
            (ref && 'current' in ref
              ? ref.current
              : buttonRef.current
            )?.focus();
            break;
          case 'Tab':
            handleClose();
            break;
          default:
            // Type-ahead for numeric values (surface ramp)
            if (/^\d$/.test(e.key) && tokenCategory === 'surface-ramp') {
              const typed = parseInt(e.key, 10);
              const twoDigit = parseInt(`${focusedIndex}${typed}`, 10);
              let newIndex: number | null = null;
              if (twoDigit <= 25 && focusedIndex < 10) {
                newIndex = twoDigit;
              } else if (typed <= 25) {
                newIndex = typed;
              }
              if (newIndex !== null && newIndex < options.length) {
                setFocusedIndex(newIndex);
                onChange(options[newIndex].value);
              }
            }
        }
      },
      [
        isOpen,
        focusedIndex,
        options,
        onChange,
        handleOpen,
        handleClose,
        disabled,
        ref,
        tokenCategory,
      ]
    );

    // Close on outside click
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as Node;
        const button =
          ref && 'current' in ref ? ref.current : buttonRef.current;
        if (
          button &&
          !button.contains(target) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target)
        ) {
          handleClose();
        }
      };

      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, handleClose, ref]);

    // Merge refs
    const mergedRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <div className={cn('min-w-0', className)}>
        <label
          htmlFor={id}
          className={cn(
            'mb-1 block',
            config.labelClass,
            disabled
              ? 'text-[var(--color-text-disabled)]'
              : 'text-[var(--color-text-default)]'
          )}
        >
          {label}{' '}
          {required && <span className="text-[var(--color-error)]">*</span>}
        </label>

        <div ref={containerRef} className="flex min-w-0 items-center">
          {/* Color Chip */}
          <button
            type="button"
            onClick={() => !disabled && (isOpen ? handleClose() : handleOpen())}
            disabled={disabled}
            tabIndex={-1}
            className={cn(
              'flex-shrink-0 border border-r-0 transition-colors',
              config.roundedL,
              config.chipSize,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-subtle)]'
                : 'cursor-pointer border-[var(--color-border-default)]',
              showError && !disabled && 'border-[var(--color-error)]'
            )}
            style={{ background: currentOption?.cssVar }}
            aria-hidden="true"
          />

          {/* Select Button */}
          <button
            ref={mergedRef}
            id={id}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              isOpen ? `${id}-option-${focusedIndex}` : undefined
            }
            aria-invalid={showError}
            aria-describedby={descriptionId}
            disabled={disabled}
            tabIndex={tabIndex}
            onClick={() => (isOpen ? handleClose() : handleOpen())}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex w-full min-w-0 items-center gap-2 rounded-l-none border text-left transition-colors focus:ring-1 focus:outline-none',
              config.roundedR,
              config.height,
              config.padding,
              config.paddingY,
              config.textClass,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] hover:border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-interactive)] hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
              'text-[var(--color-text-default)]'
            )}
          >
            <span className="flex-1 truncate">{currentOption?.label}</span>
            <svg
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                disabled
                  ? 'text-[var(--color-text-disabled)]'
                  : 'text-[var(--color-text-muted)]',
                isOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown portal */}
          {isOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={dropdownRef}
                id={listboxId}
                role="listbox"
                aria-label={label}
                tabIndex={-1}
                className="scrollbar-thin max-h-48 overflow-auto rounded-md border border-[var(--color-border-emphasis)] bg-[var(--color-surface-elevated)] py-1 shadow-lg"
                style={dropdownStyles}
              >
                {options.map((option, index) => (
                  <button
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    key={option.value}
                    id={`${id}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => {
                      onChange(option.value);
                      handleClose();
                      (ref && 'current' in ref
                        ? ref.current
                        : buttonRef.current
                      )?.focus();
                    }}
                    className={`type-body-sm flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                      focusedIndex === index
                        ? 'bg-[var(--color-surface-section)]'
                        : ''
                    } ${
                      value === option.value
                        ? 'text-[var(--color-text-default)]'
                        : 'text-[var(--color-text-muted)]'
                    } hover:bg-[var(--color-surface-section)]`}
                  >
                    <div
                      className="h-4 w-4 shrink-0 rounded border border-[var(--color-border-subtle)]"
                      style={{ background: option.cssVar }}
                      aria-hidden="true"
                    />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>,
              document.body
            )}
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

        {/* Helper text */}
        {(!showError || disabled) && helperText && (
          <p
            id={helperId}
            className={`${config.helperClass} mt-1 ${
              disabled ? 'text-[var(--color-text-disabled)]' : ''
            }`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TokenSelect.displayName = 'TokenSelect';

export default TokenSelect;
