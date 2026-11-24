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
import GradientEditor, { gradientToCss } from '../patterns/GradientEditor';
import type { GradientValue } from '../patterns/GradientEditor';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';
import { useControlled } from '../utils/useControlled';

/** Size variants for GradientInput */
export type GradientInputSize = InputSize;

/** The gradient an uncontrolled GradientInput starts from when no `defaultValue` is given: black to white, left to right */
const DEFAULT_GRADIENT: GradientValue = {
  angle: 90,
  stops: [
    { position: 0, color: { hex: '#000000', alpha: 100 } },
    { position: 100, color: { hex: '#FFFFFF', alpha: 100 } },
  ],
};

/**
 * GradientInput follows the form-input convention (docs/prop-conventions.json, formInputs): `value` / `defaultValue`
 * and `onChange(gradient)`, value first. It has no native field, so the ref, the `id` and every prop it doesn't name
 * (aria-*, data-*, onFocus, onKeyDown…) go to its focusable root, the chip that opens the editor.
 */
export interface GradientInputProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'defaultValue' | 'onChange' | 'className' | 'id' | 'type'
> {
  /** The chip's id; generated when left out */
  id?: string;
  /** Visible label. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Controlled: the gradient. Leave out for uncontrolled */
  value?: GradientValue;
  /** Uncontrolled: the gradient at first (default black to white at 90°) */
  defaultValue?: GradientValue;
  /** The whole new gradient */
  onChange?: (value: GradientValue) => void;
  /** The app's error message: shows at once unless `touched` is false */
  error?: string;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the outer container */
  className?: string;
  /** Additional class name for the gradient chip element */
  chipClassName?: string;
  /** Leave out to show the app's error at once; pass the field's touched state to hold it until the field is left */
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
      id: idProp,
      label,
      value: valueProp,
      defaultValue = DEFAULT_GRADIENT,
      onChange,
      error,
      helperText,
      className,
      chipClassName = '',
      touched,
      required = false,
      disabled = false,
      size,
      compact = false,
      minStops = 2,
      maxStops = 10,
      lockedHue,
      'aria-describedby': describedBy,
      'aria-label': ariaLabel,
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
      'GradientInput'
    );
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

    // Errors (Q-touched): the app's shows at once unless touched is false; never while disabled
    const showError = !disabled && touched !== false && !!error;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const descriptionId =
      [describedBy, showError ? errorId : helperText ? helperId : undefined]
        .filter(Boolean)
        .join(' ') || undefined;

    const change = (next: GradientValue) => {
      if (!disabled) setValue(next);
    };

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
        {label && (
          <label
            htmlFor={id}
            className={`${config.labelClass} mb-1 block ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        )}

        {/* Input Group (Gradient Chip + Text Display) */}
        <div className="flex items-center">
          {/* Gradient Chip Button */}
          <button
            {...props}
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
                : 'border-[var(--color-border-default)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
              showError && !disabled
                ? 'border-[var(--color-error)]'
                : 'border-[var(--color-border-default)]',
              chipClassName
            )}
            style={{
              background: disabled ? 'transparent' : gradientCss,
            }}
            aria-label={
              ariaLabel ??
              (props['aria-labelledby']
                ? undefined
                : label
                  ? `Edit ${label} gradient`
                  : 'Edit gradient')
            }
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
        {showError && (
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
              aria-label={label ? `Edit ${label}` : 'Edit gradient'}
              className="fixed z-[9999] rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 shadow-lg"
              style={{
                // Initial values - useLayoutEffect sets actual position via direct DOM manipulation
                top: 0,
                left: 0,
              }}
            >
              <GradientEditor
                value={value}
                onChange={change}
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
