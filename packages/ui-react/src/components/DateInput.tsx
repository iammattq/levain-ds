'use client';

import React, {
  useRef,
  InputHTMLAttributes,
  ChangeEvent,
  forwardRef,
  useState,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
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

export interface DateInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'onChange' | 'value' | 'type'
> {
  /** Unique identifier for the input */
  id: string;
  /** Text label for the input field */
  label: string;
  /** Current date value (string, in YYYY-MM-DD format) */
  value: string;
  /** Function called when the date value changes */
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
  /** Additional class name for the calendar button element */
  buttonClassName?: string;
  /** Whether the field has been touched/blurred (controls validation visibility) */
  touched?: boolean;
  /** Function called when the text input loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      id,
      label,
      value,
      onChange,
      onBlur,
      error: externalError,
      validate,
      helperText,
      className = '',
      inputClassName = '',
      buttonClassName = '',
      touched = false,
      required = false,
      disabled = false,
      ...props
    },
    ref // Forwarding ref to the text input element
  ) => {
    // Internal state for local input value
    const [localValue, setLocalValue] = useState(value);

    // Internal state to track if field has been touched
    const [internalTouched, setInternalTouched] = useState(touched);

    // Update local value when prop changes
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Update touched state when prop changes
    useEffect(() => {
      setInternalTouched(touched);
    }, [touched]);

    const [showCalendar, setShowCalendar] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);
    const [calendarStyles, setCalendarStyles] = useState<React.CSSProperties>({
      visibility: 'hidden',
    });
    const inputContainerRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarButtonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Use both forwarded ref and internal ref
    const handleInputRef = (el: HTMLInputElement) => {
      inputRef.current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        ref.current = el;
      }
    };

    // UPDATED: Increased estimated width
    const estimatedCalendarWidth = 340; // pixels
    const estimatedCalendarHeight = 340; // pixels
    const positionOffset = 4; // Space between input and calendar

    // Validate date format and validity internally
    useEffect(() => {
      let validationResult: string | null | undefined = null;
      if (localValue && !isValidDateFormat(localValue)) {
        validationResult = 'Date must be in YYYY-MM-DD format.';
      } else if (localValue && !isValidDate(localValue)) {
        validationResult = 'Please enter a valid date.';
      } else if (validate) {
        validationResult = validate(localValue);
      }
      setInternalError(validationResult ?? null);
    }, [localValue, validate]);

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
          newTop = positionOffset; // Position slightly below top edge
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
          position: 'fixed', // Use fixed positioning
          top: `${newTop}px`,
          left: `${newLeft}px`,
          zIndex: 50, // Ensure it's above other content
          visibility: 'visible', // Make it visible
        });
      } else {
        // Hide when not shown
        setCalendarStyles({ visibility: 'hidden' });
      }
    }, [showCalendar]); // Rerun only when showCalendar changes

    // Helper function to get a valid date for the calendar
    const getValidDateForCalendar = (): Date => {
      // If we have a valid date in the input, use it
      if (
        localValue &&
        isValidDateFormat(localValue) &&
        isValidDate(localValue)
      ) {
        // Parse the date and ensure it's at midnight in local time
        const [year, month, day] = localValue.split('-').map(Number);
        const midnightDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        return midnightDate;
      }

      // Otherwise, default to today's date at midnight
      const today = new Date();
      const todayMidnight = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0
      );
      return todayMidnight;
    };

    // Computed effective touched state (either from props or internal state)
    const effectiveTouched = internalTouched || touched;
    const effectiveError = externalError ?? internalError;
    const showError = effectiveTouched && !!effectiveError;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const descriptionId = showError
      ? errorId
      : helperText
        ? helperId
        : undefined;

    // Handle input changes with local state before propagating to parent
    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      // Get raw value from the input
      let newValue = event.target.value;

      // Remove any non-digit characters for clean processing
      const digits = newValue.replace(/\D/g, '');

      // Apply masking logic (YYYY-MM-DD format)
      if (digits.length > 0) {
        let maskedValue = '';

        // Add year portion
        if (digits.length >= 1) {
          maskedValue += digits.substring(0, Math.min(4, digits.length));
        }

        // Add month portion with hyphen separator
        if (digits.length > 4) {
          maskedValue += '-' + digits.substring(4, Math.min(6, digits.length));
        }

        // Add day portion with hyphen separator
        if (digits.length > 6) {
          maskedValue += '-' + digits.substring(6, Math.min(8, digits.length));
        }

        newValue = maskedValue;
      }

      // Update local state immediately for responsive typing
      setLocalValue(newValue);

      // Create a synthetic event with the masked value
      const syntheticEvent = {
        ...event,
        target: { ...event.target, value: newValue },
      };

      // Let the parent component know about the change
      onChange(syntheticEvent);
    };

    const handleCalendarClick = () => {
      if (disabled) return;
      // Just toggle the state, useEffect handles positioning
      setShowCalendar(!showCalendar);
    };

    const handleDateSelect = (selectedDate: Date) => {
      if (disabled) return;

      // Create a new date that's exactly the same day but at midnight in local timezone
      // to avoid any timezone-related date shifting
      const localDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0,
        0
      );

      // Format as YYYY-MM-DD from local components
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, '0');
      const day = String(localDate.getDate()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day}`;

      // Update local state immediately
      setLocalValue(formattedDate);

      // Create a synthetic event with the formatted date
      const syntheticEvent = {
        target: { id, value: formattedDate },
      } as unknown as ChangeEvent<HTMLInputElement>;

      // Notify parent component
      onChange(syntheticEvent);
      setShowCalendar(false);
    };

    // Handle blur event with validation
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      // Mark as touched on blur
      setInternalTouched(true);

      // If empty, clear the value and notify parent
      if (!localValue || localValue.trim() === '') {
        onChange({
          ...event,
          target: { ...event.target, value: '' },
        });
        setInternalError(required ? 'This field is required' : null);
        return;
      }

      // Check if date is valid and properly formatted
      if (isValidDateFormat(localValue) && isValidDate(localValue)) {
        // Clear any previous errors
        setInternalError(null);
      } else {
        // Invalid format, show error but keep the value for editing
        setInternalError('Please enter a valid date in YYYY-MM-DD format');
      }

      // Call the provided onBlur if it exists
      if (onBlur) {
        onBlur(event);
      }
    };

    // Close calendar when clicking outside (Portal Aware)
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // Check if click is outside the input container AND the button AND the calendar itself (if rendered)
        if (
          showCalendar &&
          inputContainerRef.current &&
          !inputContainerRef.current.contains(event.target as Node) &&
          calendarButtonRef.current &&
          !calendarButtonRef.current.contains(event.target as Node) &&
          calendarRef.current && // Check if calendar exists in DOM (portal renders async)
          !calendarRef.current.contains(event.target as Node)
        ) {
          setShowCalendar(false);
        }
      };

      // Use setTimeout to allow portal to render before attaching listener
      let timeoutId: NodeJS.Timeout | null = null;
      if (showCalendar) {
        timeoutId = setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside);
        }, 0);
      }

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showCalendar]); // Dependency is correct

    return (
      <div className={cn('relative flex flex-col', className)}>
        {/* Label */}
        <label
          htmlFor={id}
          className={`type-label mb-1 block ${disabled ? 'text-[var(--color-text-disabled)]' : 'text-[var(--color-text-default)]'}`}
        >
          {label}{' '}
          {required && <span className="text-[var(--color-error)]">*</span>}
        </label>

        {/* Input Group (Calendar Button + Text Input) */}
        <div ref={inputContainerRef} className="relative flex items-center">
          {/* Calendar Button */}
          <button
            type="button"
            ref={calendarButtonRef}
            onClick={handleCalendarClick}
            disabled={disabled}
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-l-md border border-r-0 transition-colors focus:outline-none',
              disabled
                ? 'cursor-not-allowed border-[var(--color-border-default)]'
                : 'border-[var(--color-border-emphasis)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1',
              showError && !disabled
                ? 'border-[var(--color-error)]'
                : 'border-[var(--color-border-emphasis)]',
              buttonClassName
            )}
            aria-label={`Choose ${label} date`}
          >
            {/* Calendar Icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
            ref={handleInputRef}
            id={id}
            type="text"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            placeholder="YYYY-MM-DD"
            aria-invalid={showError}
            aria-describedby={descriptionId}
            {...props}
            className={cn(
              'block h-10 w-full rounded-l-none rounded-r-md border px-3 py-2 transition-colors focus:ring-1 focus:outline-none',
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
                ref={calendarRef} // Attach ref here
                style={calendarStyles} // Apply calculated fixed styles
                className="rounded-md border border-[var(--color-border-emphasis)] bg-[var(--color-surface-section)] shadow-xl"
                // Add animation classes if desired
                // className="... animate-fade-in ..."
              >
                <Calendar
                  selectedDate={getValidDateForCalendar()}
                  onDateSelect={handleDateSelect}
                />
              </div>,
              document.body // Render into body
            )}
        </div>

        {/* Error Message */}
        {showError && !disabled && (
          <p
            id={errorId}
            className="type-body-sm mt-1 text-[var(--color-error)]"
          >
            {effectiveError}
          </p>
        )}

        {/* Helper Text */}
        {(!showError || disabled) && helperText && (
          <p
            id={helperId}
            className={`type-caption mt-1 ${disabled ? 'text-[var(--color-text-disabled)]' : ''}`}
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
