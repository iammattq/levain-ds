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
import { besideTrigger } from '../utils/besideTrigger';
import ColorPickerPanel from './ColorPickerPanel';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';

// Basic color validation (checks for # followed by 3, 4, 6, or 8 hex chars)
const isValidHexColor = (color: string): boolean =>
  /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);

/** Size variants for ColorInput */
export type ColorInputSize = InputSize;

export interface ColorInputProps {
  /** Unique identifier for the input */
  id: string;
  /** Text label for the input field */
  label: string;
  /** Current color value (string, expected hex format e.g., #RRGGBB) */
  value: string;
  /** Function called when the color value changes */
  onChange: (value: string) => void;
  /** Current alpha value (0-100). Only used when hideAlpha is false. */
  alpha?: number;
  /** Function called when the alpha value changes. Only used when hideAlpha is false. */
  onAlphaChange?: (alpha: number) => void;
  /** Optional: Error message to display */
  error?: string;
  /** Optional: Validation function */
  validate?: (value: string) => string | null | undefined;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the outer container */
  className?: string;
  /** Additional class name for the text input element */
  inputClassName?: string;
  /** Additional class name for the color chip element */
  chipClassName?: string;
  /** Whether the field has been touched/blurred (controls validation visibility) */
  touched?: boolean;
  /** Function called when the text input loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Size variant for the input. Defaults to 'md'. */
  size?: ColorInputSize;
  /**
   * @deprecated Use size="xs" instead. Will be removed in a future version.
   */
  compact?: boolean;
  /** Whether to hide the alpha slider in the color picker. Defaults to true unless alpha/onAlphaChange provided. */
  hideAlpha?: boolean;
}

const ColorInput = forwardRef<HTMLButtonElement, ColorInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      alpha = 100,
      onAlphaChange,
      onBlur,
      error: externalError,
      validate,
      helperText,
      className = '',
      inputClassName = '',
      chipClassName = '',
      touched = false,
      required = false,
      disabled = false,
      size,
      compact = false,
      hideAlpha,
    },
    ref
  ) => {
    // Handle deprecated compact prop - size takes precedence
    const effectiveSize: ColorInputSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    // Default hideAlpha to false if alpha props are provided, true otherwise
    const shouldHideAlpha = hideAlpha ?? !onAlphaChange;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

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

    // Validate color format internally
    useEffect(() => {
      let validationResult: string | null | undefined = null;
      if (!isValidHexColor(value) && value !== '') {
        validationResult = 'Invalid hex color format.';
      } else if (validate) {
        validationResult = validate(value);
      }
      setInternalError(validationResult ?? null);
    }, [value, validate]);

    const effectiveError = externalError ?? internalError;
    const showError = touched && !!effectiveError;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    const POPOVER_HEIGHT = 300;
    const OFFSET = 8;

    // Direct DOM manipulation for position updates - bypasses React 18 batching
    useLayoutEffect(() => {
      if (!isOpen || !popoverRef.current || !triggerRef.current) return;

      const updatePosition = () => {
        const trigger = triggerRef.current;
        const popover = popoverRef.current;
        if (!trigger || !popover) return;

        // beside the trigger, on whichever side has room, inside the window
        const { left, top } = besideTrigger({
          trigger: trigger.getBoundingClientRect(),
          width: popover.offsetWidth,
          height: POPOVER_HEIGHT,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          offset: OFFSET,
        });

        // Direct DOM update - synchronous, bypasses React batching
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
      };

      // Initial position
      updatePosition();

      // Watch for size changes
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
          !triggerRef.current.contains(target) &&
          textInputRef.current &&
          !textInputRef.current.contains(target)
        ) {
          setIsOpen(false);
        }
      };

      // Close on escape
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          // claimed, in the capture phase (below): a dialog around it leaves this Escape alone and stays open
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape, true);
      };
    }, [isOpen]);

    const handleChipClick = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    };

    // Handle color changes from the picker panel
    const handleColorPickerChange = (color: { hex: string; alpha: number }) => {
      onChange(color.hex.toUpperCase());
      if (onAlphaChange && color.alpha !== alpha) {
        onAlphaChange(color.alpha);
      }
    };

    // Handle direct text input changes
    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value.toUpperCase();
      // Auto-prepend # if missing
      if (inputValue && !inputValue.startsWith('#')) {
        inputValue = '#' + inputValue;
      }
      onChange(inputValue);
    };

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

        {/* Input Group (Chip + Text Input) */}
        <div className="flex items-center">
          {/* Color Chip Button */}
          <button
            ref={setRefs}
            type="button"
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
              backgroundColor:
                isValidHexColor(value) && !disabled ? value : 'transparent',
            }}
            aria-label={`Choose ${label} color`}
          />

          {/* Text Input */}
          <input
            ref={textInputRef}
            id={id}
            type="text"
            value={value}
            onChange={handleTextInputChange}
            onBlur={onBlur}
            disabled={disabled}
            required={required}
            aria-invalid={showError}
            aria-describedby={descriptionId}
            className={cn(
              'block w-full rounded-l-none border transition-colors focus:ring-1 focus:outline-none',
              config.roundedR,
              config.height,
              config.padding,
              config.paddingY,
              config.textClass,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-default)] bg-[var(--color-surface-interactive)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
              'text-[var(--color-text-default)]',
              inputClassName
            )}
          />
        </div>

        {/* Error Message */}
        {showError && !disabled && (
          <p
            id={errorId}
            className={`${config.errorClass} mt-1 text-[var(--color-error)]`}
          >
            {effectiveError}
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
              className="fixed z-[9999] w-64 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-lg"
              style={{
                // Initial values - useLayoutEffect sets actual position via direct DOM manipulation
                top: 0,
                left: 0,
              }}
            >
              <ColorPickerPanel
                value={{
                  hex: isValidHexColor(value) ? value : '#000000',
                  alpha,
                }}
                onChange={handleColorPickerChange}
                hideAlpha={shouldHideAlpha}
              />
            </div>,
            document.body
          )}
      </div>
    );
  }
);

ColorInput.displayName = 'ColorInput';

export default ColorInput;
