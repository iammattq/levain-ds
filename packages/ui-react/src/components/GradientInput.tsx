'use client';

import React, {
  useRef,
  forwardRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import GradientEditor, { gradientToCss } from '../patterns/GradientEditor';
import type { GradientValue } from '../patterns/GradientEditor';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';

/** Size variants for GradientInput */
export type GradientInputSize = InputSize;

export interface GradientInputProps {
  /** Unique identifier for the input */
  id: string;
  /** Text label for the input field */
  label: string;
  /** Current gradient value */
  value: GradientValue;
  /** Function called when the gradient value changes */
  onChange: (value: GradientValue) => void;
  /** Optional: Error message to display */
  error?: string;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the outer container */
  className?: string;
  /** Additional class name for the gradient chip element */
  chipClassName?: string;
  /** Whether the field has been touched/blurred (controls validation visibility) */
  touched?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Size variant for the input. Defaults to 'md'. */
  size?: GradientInputSize;
  /**
   * @deprecated Use size="xs" instead. Will be removed in a future version.
   */
  compact?: boolean;
  /** Minimum number of gradient stops */
  minStops?: number;
  /** Maximum number of gradient stops */
  maxStops?: number;
  /** Lock all stops to this hue - only alpha varies (for shine/gloss effects) */
  lockedHue?: string;
}

const GradientInput = forwardRef<HTMLButtonElement, GradientInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      error,
      helperText,
      className = '',
      chipClassName = '',
      touched = false,
      required = false,
      disabled = false,
      size,
      compact = false,
      minStops = 2,
      maxStops = 10,
      lockedHue,
    },
    ref
  ) => {
    // Handle deprecated compact prop - size takes precedence
    const effectiveSize: GradientInputSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [hasColorPicker, setHasColorPicker] = useState(false);

    // Combine forwarded ref with internal ref
    const setRefs = useCallback(
      (element: HTMLButtonElement | null) => {
        (
          triggerRef as React.MutableRefObject<HTMLButtonElement | null>
        ).current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    const showError = touched && !!error;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    // Generate display text for the input
    const displayText = `${value.angle}°, ${value.stops.length} stops`;

    const POPOVER_HEIGHT = 380;
    const OFFSET = 8;

    // Direct DOM manipulation for position updates - bypasses React 18 batching
    // This ensures synchronous updates when popover resizes (e.g., color picker opens)
    useLayoutEffect(() => {
      if (!isOpen || !popoverRef.current || !triggerRef.current) return;

      const updatePosition = () => {
        const trigger = triggerRef.current;
        const popover = popoverRef.current;
        if (!trigger || !popover) return;

        const triggerRect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Right edge stays fixed relative to trigger
        let right = viewportWidth - triggerRect.left + OFFSET;
        let top = triggerRect.top;

        if (right < 8) right = 8;
        if (top < 8) top = 8;
        if (top + POPOVER_HEIGHT > viewportHeight - 8) {
          top = viewportHeight - POPOVER_HEIGHT - 8;
        }

        // Direct DOM update - synchronous, bypasses React batching
        popover.style.top = `${top}px`;
        popover.style.right = `${right}px`;
      };

      // Initial position
      updatePosition();

      // Watch for size changes (when color picker opens/closes)
      const resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(popoverRef.current);

      // Also update on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [isOpen]);

    // Close popover when clicking outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          popoverRef.current &&
          !popoverRef.current.contains(target) &&
          triggerRef.current &&
          !triggerRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      // Close on escape
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen]);

    const handleChipClick = () => {
      if (!disabled) {
        if (isOpen) {
          setIsOpen(false);
        } else {
          setHasColorPicker(false);
          setIsOpen(true);
        }
      }
    };

    const gradientCss = gradientToCss(value);

    return (
      <div className={cn('flex flex-col', className)}>
        {/* Label */}
        <label
          htmlFor={id}
          className={`${config.labelClass} mb-1 block ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
        >
          {label}{' '}
          {required && <span className="text-[var(--color-error)]">*</span>}
        </label>

        {/* Input Group (Gradient Chip + Text Display) */}
        <div className="flex items-center">
          {/* Gradient Chip Button */}
          <button
            ref={setRefs}
            type="button"
            id={id}
            onClick={handleChipClick}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-describedby={descriptionId}
            className={cn(
              'flex-shrink-0 border border-r-0 transition-colors focus:outline-none',
              config.roundedL,
              config.chipSize,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-subtle)]'
                : 'border-[var(--color-border-default)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1',
              showError && !disabled
                ? 'border-[var(--color-error)]'
                : 'border-[var(--color-border-default)]',
              chipClassName
            )}
            style={{
              background: disabled ? 'transparent' : gradientCss,
            }}
            aria-label={`Edit ${label} gradient`}
          />

          {/* Text Display */}
          <div
            onClick={disabled ? undefined : handleChipClick}
            className={cn(
              'block w-full cursor-pointer rounded-l-none border transition-colors',
              config.roundedR,
              config.height,
              config.padding,
              config.paddingY,
              config.textClass,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-interactive)] hover:bg-[var(--color-surface-section)]',
              'text-[var(--color-text-default)]',
              'flex items-center'
            )}
          >
            <span className="truncate">{displayText}</span>
          </div>
        </div>

        {/* Error Message */}
        {showError && !disabled && (
          <p
            id={errorId}
            className={`${config.errorClass} mt-1 text-[var(--color-error)]`}
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {(!showError || disabled) && helperText && (
          <p
            id={helperId}
            className={`${config.helperClass} mt-1 ${disabled ? 'text-[var(--color-text-disabled)]' : ''}`}
          >
            {helperText}
          </p>
        )}

        {/* Popover (rendered via portal to escape overflow clipping) */}
        {isOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={`Edit ${label}`}
              className="fixed z-[9999] rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-lg"
              style={{
                // Initial values - useLayoutEffect sets actual position via direct DOM manipulation
                top: 0,
                right: 0,
              }}
            >
              <GradientEditor
                value={value}
                onChange={onChange}
                minStops={minStops}
                maxStops={maxStops}
                onSelectionChange={setHasColorPicker}
                lockedHue={lockedHue}
              />
            </div>,
            document.body
          )}
      </div>
    );
  }
);

GradientInput.displayName = 'GradientInput';

export default GradientInput;
export type { GradientValue };
