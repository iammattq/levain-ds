'use client';

import React, {
  useRef,
  InputHTMLAttributes,
  ChangeEvent,
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useId,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { inputSizeConfig, type InputSize } from '../utils/inputSizing';
import Calendar from './Calendar';

// Validate date format YYYY-MM-DD
const isValidDateFormat = (dateString: string): boolean => {
  if (!dateString) return true; // Allow empty string
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

// Validate that the date is a real date
const isValidDate = (dateString: string): boolean => {
  if (!dateString) return true; // Allow empty string
  if (!isValidDateFormat(dateString)) return false;

  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);

  // Check if month and day are in valid ranges
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Create date and verify it's valid
  const date = new Date(year, month - 1, day); // Month is 0-indexed in JS Date

  // Check if the date actually exists (handles cases like Feb 30, etc.)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

/** Size variants for DateInput (the input scale, utils/inputSizing.ts) */
export type DateInputSize = InputSize;

const ICON_PX: Record<DateInputSize, number> = {
  '2xs': 12,
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
};

const INVALID = 'Please enter a valid date in YYYY-MM-DD format';

/** The date as YYYY-MM-DD, from its local components */
const formatDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** YYYY-MM-DD masking of whatever was typed: digits only, hyphens put in */
const maskDate = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  let masked = digits.substring(0, 4);
  if (digits.length > 4) masked += '-' + digits.substring(4, 6);
  if (digits.length > 6) masked += '-' + digits.substring(6, 8);
  return masked;
};

/**
 * DateInput follows the form-input convention (docs/prop-conventions.json, formInputs) as a native text field: `value`
 * / `defaultValue` (YYYY-MM-DD) and the native `onChange(event)`, a real ChangeEvent from the <input> whose
 * `target.value` is the masked date, whether typed or picked from the calendar. The <input> takes the ref, the `id` and
 * every prop the DateInput doesn't name.
 */
export interface DateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'onChange' | 'value' | 'defaultValue' | 'type' | 'size'
> {
  /** The input's id; generated when left out */
  id?: string;
  /** Visible label. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Controlled: the date, YYYY-MM-DD ('' for none). Leave out for uncontrolled */
  value?: string;
  /** Uncontrolled: the date at first */
  defaultValue?: string;
  /** The native change event; `event.target.value` is the masked date */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Error message; shows at once unless `touched` is false */
  error?: string;
  /** Own validation; its message (and the format check's) shows after the first blur, or when `touched` is true */
  validate?: (value: string) => string | null | undefined;
  /** Optional helper text shown below the input */
  helperText?: string;
  /** Additional class name for the outer container */
  className?: string;
  /** Additional class name for the text input element */
  inputClassName?: string;
  /** Additional class name for the calendar button element */
  buttonClassName?: string;
  /** Leave out to show errors at once; pass the field's touched state to hold them until it is left */
  touched?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Size variant. Defaults to 'md' */
  size?: DateInputSize;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      id: idProp,
      label,
      value,
      defaultValue = '',
      onChange,
      onBlur,
      error: externalError,
      validate,
      helperText,
      className,
      inputClassName,
      buttonClassName,
      touched,
      required = false,
      disabled = false,
      size = 'md',
      'aria-describedby': describedBy,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const config = inputSizeConfig[size];

    // What the field shows: as typed (never rewritten while typing); a controlled `value` from outside replaces it
    const [localValue, setLocalValue] = useState(value ?? defaultValue);
    useEffect(() => {
      if (value !== undefined) setLocalValue(value);
    }, [value]);

    const [blurred, setBlurred] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarStyles, setCalendarStyles] = useState<React.CSSProperties>({
      visibility: 'hidden',
    });
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarButtonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Use both forwarded ref and internal ref
    const handleInputRef = useCallback(
      (el: HTMLInputElement | null) => {
        inputRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      },
      [ref]
    );

    const estimatedCalendarWidth = 340; // pixels
    const estimatedCalendarHeight = 340; // pixels
    const positionOffset = 4; // Space between input and calendar

    // Own validation: the format, a real date, required, then the app's validate
    const internalError = !localValue
      ? required
        ? 'This field is required'
        : (validate?.(localValue) ?? null)
      : !isValidDate(localValue)
        ? INVALID
        : (validate?.(localValue) ?? null);

    // Calculate and set position when calendar is shown
    useEffect(() => {
      if (showCalendar && inputContainerRef.current) {
        const inputRect = inputContainerRef.current.getBoundingClientRect();
        let newTop = inputRect.bottom + positionOffset;
        let newLeft = inputRect.left;

        // Basic bottom edge detection (using estimated height)
        if (newTop + estimatedCalendarHeight > window.innerHeight) {
          newTop = inputRect.top - estimatedCalendarHeight - positionOffset;
        }
        // Prevent falling off top edge if positioned above
        if (newTop < 0) {
          newTop = positionOffset;
        }

        // Basic right edge detection (using estimated width)
        if (newLeft + estimatedCalendarWidth > window.innerWidth) {
          newLeft = inputRect.right - estimatedCalendarWidth;
        }
        // Prevent falling off left edge
        if (newLeft < 0) {
          newLeft = positionOffset;
        }

        setCalendarStyles({
          position: 'fixed',
          top: `${newTop}px`,
          left: `${newLeft}px`,
          zIndex: 50,
          visibility: 'visible',
        });
      } else {
        setCalendarStyles({ visibility: 'hidden' });
      }
    }, [showCalendar]);

    // The date the calendar shows: the field's, else today; kept by its day so a re-render doesn't hand the calendar a
    // new Date (A3: its month view snapped back)
    const calendarDay =
      localValue && isValidDate(localValue) ? localValue : formatDate(new Date());
    const calendarDate = useMemo(() => {
      const [y, m, d] = calendarDay.split('-').map(Number);
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    }, [calendarDay]);

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
    const descriptionId =
      [describedBy, showError ? errorId : helperText ? helperId : undefined]
        .filter(Boolean)
        .join(' ') || undefined;

    // Typing: the masked value is put on the input itself, then the real event goes out, so event.target.value is the
    // masked date (A3: it was a spread copy of the event)
    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const masked = maskDate(event.target.value);
      if (masked !== event.target.value) event.target.value = masked;
      setLocalValue(masked);
      onChange?.(event);
    };

    const handleCalendarClick = () => {
      if (disabled) return;
      setShowCalendar(!showCalendar);
    };

    // A pick goes through the input as a native input event, so onChange gets the same real event as typing (A3: it
    // was a { target: { id, value } } object)
    const handleDateSelect = (selectedDate: Date) => {
      if (disabled) return;
      const input = inputRef.current;
      if (input) {
        const setValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        setValue?.call(input, formatDate(selectedDate));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setShowCalendar(false);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setBlurred(true);
      onBlur?.(event);
    };

    // Close calendar when clicking outside (Portal Aware)
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          showCalendar &&
          inputContainerRef.current &&
          !inputContainerRef.current.contains(event.target as Node) &&
          calendarButtonRef.current &&
          !calendarButtonRef.current.contains(event.target as Node) &&
          calendarRef.current &&
          !calendarRef.current.contains(event.target as Node)
        ) {
          setShowCalendar(false);
        }
      };

      // Use setTimeout to allow portal to render before attaching listener
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      if (showCalendar) {
        timeoutId = setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
        }, 0);
      }

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showCalendar]);

    // Escape closes the calendar and puts focus back on its button
    useEffect(() => {
      if (!showCalendar) return;
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        setShowCalendar(false);
        calendarButtonRef.current?.focus();
      };
      document.addEventListener('keydown', handleEscape, true);
      return () => document.removeEventListener('keydown', handleEscape, true);
    }, [showCalendar]);

    return (
      <div className={cn('relative flex flex-col', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              config.labelClass,
              'mb-1 block',
              disabled
                ? 'text-[var(--color-text-disabled)]'
                : 'text-[var(--color-text-default)]'
            )}
          >
            {label}{' '}
            {required && <span className="text-[var(--color-error)]">*</span>}
          </label>
        )}

        {/* Input Group (Calendar Button + Text Input) */}
        <div ref={inputContainerRef} className="relative flex items-center">
          {/* Calendar Button */}
          <button
            type="button"
            ref={calendarButtonRef}
            onClick={handleCalendarClick}
            disabled={disabled}
            aria-expanded={showCalendar}
            aria-haspopup="dialog"
            className={cn(
              'flex flex-shrink-0 items-center justify-center border border-r-0 transition-colors focus:outline-none',
              config.chipSize,
              config.roundedL,
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-default)]'
                : 'border-[var(--color-border-emphasis)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
              showError
                ? 'border-[var(--color-error)]'
                : 'border-[var(--color-border-emphasis)]',
              buttonClassName
            )}
            aria-label={label ? `Choose ${label} date` : 'Choose date'}
          >
            {/* Calendar Icon */}
            <svg
              width={ICON_PX[size]}
              height={ICON_PX[size]}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={
                disabled
                  ? 'text-[var(--color-text-disabled)]'
                  : 'text-[var(--color-text-default)]'
              }
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>

          {/* Text Input */}
          <input
            placeholder="YYYY-MM-DD"
            {...props}
            ref={handleInputRef}
            id={id}
            type="text"
            value={localValue}
            onChange={handleInputChange}
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
                ? 'cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] text-[var(--color-text-disabled)]'
                : showError
                  ? 'border-[var(--color-error)] bg-[var(--color-surface-section)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]'
                  : 'border-[var(--color-border-emphasis)] bg-[var(--color-surface-card)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]',
              'text-[var(--color-text-default)]',
              inputClassName
            )}
          />

          {/* Portal for Calendar Dropdown */}
          {showCalendar &&
            createPortal(
              <div
                ref={calendarRef}
                role="dialog"
                aria-label={label ? `Choose ${label} date` : 'Choose date'}
                style={calendarStyles}
                className="rounded-md border border-[var(--color-border-emphasis)] bg-[var(--color-surface-section)] shadow-xl"
              >
                <Calendar value={calendarDate} onChange={handleDateSelect} />
              </div>,
              document.body
            )}
        </div>

        {/* Error Message */}
        {showError && (
          <p
            id={errorId}
            className={cn(config.errorClass, 'mt-1 text-[var(--color-error)]')}
          >
            {effectiveError}
          </p>
        )}

        {/* Helper Text */}
        {!showError && helperText && (
          <p
            id={helperId}
            className={cn(
              config.helperClass,
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

DateInput.displayName = 'DateInput';

export default DateInput;
