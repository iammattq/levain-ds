'use client';

import React, {
  useRef,
  forwardRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { besideTrigger } from '../utils/besideTrigger';
import ColorPickerPanel from './ColorPickerPanel';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';
import { useControlled } from '../utils/useControlled';

// Basic color validation (checks for # followed by 3, 4, 6, or 8 hex chars)
const isValidHexColor = (color: string): boolean =>
  /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);

/** Size variants for ColorInput */
export type ColorInputSize = InputSize;

/**
 * ColorInput follows the form-input convention (docs/prop-conventions.json, formInputs): `value` / `defaultValue` (a
 * hex string) and `onChange(hex)`, value first; the ref, the `id` and every prop it doesn't name (name, aria-*, data-*,
 * onFocus, onKeyDown…) go to the text field. The chip beside it opens the picker.
 */
export interface ColorInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'size' | 'className' | 'id'
> {
  /** The text field's id; generated when left out */
  id?: string;
  /** Visible label. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Controlled: the colour, a hex string such as #RRGGBB. Leave out for uncontrolled */
  value?: string;
  /** Uncontrolled: the colour at first (default '') */
  defaultValue?: string;
  /** The new colour (upper-case hex, '#' added), whether typed or picked */
  onChange?: (value: string) => void;
  /** Current alpha value (0-100). Only used when hideAlpha is false. */
  alpha?: number;
  /** Function called when the alpha value changes. Only used when hideAlpha is false. */
  onAlphaChange?: (alpha: number) => void;
  /** The app's error message: shows at once unless `touched` is false */
  error?: string;
  /** Your own check; its message (like the hex check's) shows after the first blur, or when `touched` is true */
  validate?: (value: string) => string | null | undefined;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the outer container */
  className?: string;
  /** Additional class name for the text input element */
  inputClassName?: string;
  /** Additional class name for the color chip element */
  chipClassName?: string;
  /** Leave out to show the app's error at once; pass the field's touched state to hold it until the field is left */
  touched?: boolean;
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

const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  (
    {
      id: idProp,
      label,
      value: valueProp,
      defaultValue = '',
      onChange,
      alpha = 100,
      onAlphaChange,
      onBlur,
      error: externalError,
      validate,
      helperText,
      className,
      inputClassName = '',
      chipClassName = '',
      touched,
      required = false,
      disabled = false,
      size,
      compact = false,
      hideAlpha,
      'aria-describedby': describedBy,
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
      'ColorInput'
    );
    // Handle deprecated compact prop - size takes precedence
    const effectiveSize: ColorInputSize = size ?? (compact ? 'xs' : 'md');
    const config = inputSizeConfig[effectiveSize];

    // Default hideAlpha to false if alpha props are provided, true otherwise
    const shouldHideAlpha = hideAlpha ?? !onAlphaChange;
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [blurred, setBlurred] = useState(false);

    // The ref goes to the text field (formInputs.ref: "ColorInput forwards to its text field")
    const setRefs = useCallback(
      (element: HTMLInputElement | null) => {
        (
          textInputRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    // Our own check: the hex format, then the app's validate
    const internalError =
      value !== '' && !isValidHexColor(value)
        ? 'Invalid hex color format.'
        : (validate?.(value) ?? null);

    // Errors (Q-touched): the app's shows at once unless touched is false; our own waits for the first blur (or
    // touched); neither while disabled
    const shownExternal = touched !== false ? externalError : undefined;
    const shownInternal =
      touched === true || (touched !== false && blurred)
        ? internalError
        : null;
    const effectiveError = shownExternal || shownInternal || null;
    const showError = !disabled && !!effectiveError;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const ownDescription = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;
    const descriptionId =
      [describedBy, ownDescription].filter(Boolean).join(' ') || undefined;

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
      if (disabled) return;
      setValue(color.hex.toUpperCase());
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
      setValue(inputValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setBlurred(true);
      onBlur?.(e);
    };

    return (
      <div className={cn('flex flex-col', className)}>
        {/* Label */}
        {label !== undefined && (
          <label
            htmlFor={id}
            className={`${config.labelClass} mb-1 block ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        )}

        {/* Input Group (Chip + Text Input) */}
        <div className="flex items-center">
          {/* Color Chip Button */}
          <button
            ref={triggerRef}
            type="button"
            onClick={handleChipClick}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-describedby={ownDescription}
            className={cn(
              'flex-shrink-0 border border-r-0 transition-colors focus:outline-none',
              config.roundedL,
              config.chipSize,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-subtle)]'
                : 'border-[var(--color-border-default)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
              showError && !disabled
                ? 'border-[var(--color-error)]'
                : 'border-[var(--color-border-default)]',
              chipClassName
            )}
            style={{
              backgroundColor:
                isValidHexColor(value) && !disabled ? value : 'transparent',
            }}
            aria-label={label ? `Choose ${label} color` : 'Choose color'}
          />

          {/* Text Input */}
          <input
            {...props}
            ref={setRefs}
            id={id}
            type="text"
            value={value}
            onChange={handleTextInputChange}
            onBlur={handleBlur}
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
              aria-label={label ? `Edit ${label}` : 'Edit color'}
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
