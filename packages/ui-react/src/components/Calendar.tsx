'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';
import { Button } from './Button';

/**
 * Calendar follows the form-input convention (docs/prop-conventions.json, formInputs): `value` / `defaultValue` (a
 * Date, or null for none) and `onChange(date)`. It has no native field, so the ref, the `id` and every prop it doesn't
 * name go to its root, a named `role="group"`. The days are a WAI-ARIA date grid: one Tab stop, the arrows move by day
 * and week, Home and End go to the week's ends, PageUp and PageDown by month (with Shift, by year), Enter or Space
 * picks.
 */
export interface CalendarProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'className'
> {
  /** The root's id; generated when left out */
  id?: string;
  /** Controlled: the chosen date (null for none). Leave out for uncontrolled */
  value?: Date | null;
  /** Uncontrolled: the chosen date at first (default none) */
  defaultValue?: Date | null;
  /** The picked date, at local midnight */
  onChange?: (date: Date) => void;
  /** Disabled: every button natively disabled; nothing fires */
  disabled?: boolean;
  /** Additional class name for the calendar container */
  className?: string;
  /** @deprecated use `value` */
  selectedDate?: Date;
  /** @deprecated use `onChange` */
  onDateSelect?: (date: Date) => void;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Generate years for year selector (current ± 50 years)
const generateYearOptions = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear - 50; year <= currentYear + 50; year++) {
    years.push(year);
  }
  return years;
};

const midnight = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const sameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** The same day `months` months on, kept inside the month (Jan 31 + 1 month: Feb 28 or 29) */
const addMonths = (d: Date, months: number) => {
  const first = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
};
const addDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

// Generate array of dates for the calendar grid: 6 weeks from the Sunday on or before the 1st
const generateCalendarDays = (year: number, month: number): Date[] => {
  const firstDayOfMonth = new Date(year, month, 1);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(year, month, 1 - firstDayOfMonth.getDay() + i));
  }
  return days;
};

const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    id: idProp,
    value: valueProp,
    defaultValue = null,
    onChange,
    disabled = false,
    className,
    selectedDate: legacyDate,
    onDateSelect,
    ...props
  },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const today = new Date();
  const [selectedDate, setSelected] = useControlled<Date | null>(
    valueProp !== undefined ? valueProp : legacyDate,
    defaultValue,
    undefined,
    'Calendar'
  );
  // Use selectedDate if provided, otherwise default to today's date for initial state
  const initialDate = selectedDate ?? today;
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [animation, setAnimation] = useState<'slideIn' | 'slideOut' | null>(
    null
  );
  // The day that holds the grid's one Tab stop, and whether the keyboard just moved it (then it takes focus)
  const [focusDay, setFocusDay] = useState<Date | null>(null);
  const keyboardMove = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const yearSelectorRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  // Every timer goes through `later` and is cleared on unmount (A3: five were never cleared)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentMonth, currentYear]
  );

  // Show the chosen date's month when the chosen date changes: by its day, not the Date object, so a parent that
  // re-renders with a new Date for the same day doesn't snap the view back (A3)
  const selectedKey = selectedDate ? dayKey(selectedDate) : null;
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate.getMonth());
      setCurrentYear(selectedDate.getFullYear());
    }
  }, [selectedKey]);

  // Scroll to the selected year when year selector opens
  useEffect(() => {
    if (
      showYearSelector &&
      yearSelectorRef.current &&
      selectedYearRef.current
    ) {
      // Clear any existing scroll position first
      yearSelectorRef.current.scrollTop = 0;

      // Wait until animation is complete before scrolling to selected year
      later(() => {
        selectedYearRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'center',
        });
      }, 350); // Wait for animation to complete plus a little buffer
    }
  }, [showYearSelector, later]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setCurrentMonth((prevMonth) => {
      if (prevMonth === 0) {
        setCurrentYear((prevYear) => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setCurrentMonth((prevMonth) => {
      if (prevMonth === 11) {
        setCurrentYear((prevYear) => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  };

  const handleMonthSelect = (e: React.MouseEvent, monthIndex: number) => {
    // Prevent event propagation to avoid form submission
    e.preventDefault();
    e.stopPropagation();

    setAnimation('slideOut');

    // Wait for animation to complete
    later(() => {
      setCurrentMonth(monthIndex);
      setShowMonthSelector(false);
      setAnimation(null);
    }, 300);
  };

  const handleYearSelect = (e: React.MouseEvent, year: number) => {
    // Prevent event propagation to avoid form submission
    e.preventDefault();
    e.stopPropagation();

    setAnimation('slideOut');

    // Wait for animation to complete
    later(() => {
      setCurrentYear(year);
      setShowYearSelector(false);
      setAnimation(null);
    }, 300);
  };

  const toggleMonthSelector = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid form submission
    e.preventDefault();
    e.stopPropagation();

    if (showMonthSelector) {
      setAnimation('slideOut');

      // Wait for animation to complete
      later(() => {
        setShowMonthSelector(false);
        setAnimation(null);
      }, 300);
    } else {
      setShowYearSelector(false);
      setAnimation('slideIn');
      setShowMonthSelector(true);
    }
  };

  const toggleYearSelector = (e: React.MouseEvent) => {
    // Prevent event propagation to avoid form submission
    e.preventDefault();
    e.stopPropagation();

    if (showYearSelector) {
      setAnimation('slideOut');

      // Wait for animation to complete
      later(() => {
        setShowYearSelector(false);
        setAnimation(null);
      }, 300);
    } else {
      setShowMonthSelector(false);
      setAnimation('slideIn');
      setShowYearSelector(true);
    }
  };

  const handleDateSelect = (date: Date) => {
    if (disabled) return;
    // Midnight in the local timezone
    const localDate = midnight(date);
    setSelected(localDate);
    setFocusDay(localDate);
    onChange?.(localDate);
    onDateSelect?.(localDate);
  };

  // The day with the grid's Tab stop: the one the keyboard is on, else the chosen day, else today, else the 1st, of
  // the month on view
  const inView = (d: Date | null) =>
    !!d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  const tabDay = inView(focusDay)
    ? focusDay!
    : inView(selectedDate)
      ? selectedDate!
      : inView(today)
        ? today
        : new Date(currentYear, currentMonth, 1);

  // Arrow keys and the rest of the date-grid keys: move the Tab stop, change the month on view when it leaves it
  const handleGridKeyDown = (e: React.KeyboardEvent, date: Date) => {
    let next: Date | null = null;
    switch (e.key) {
      case 'ArrowLeft':
        next = addDays(date, -1);
        break;
      case 'ArrowRight':
        next = addDays(date, 1);
        break;
      case 'ArrowUp':
        next = addDays(date, -7);
        break;
      case 'ArrowDown':
        next = addDays(date, 7);
        break;
      case 'Home':
        next = addDays(date, -date.getDay());
        break;
      case 'End':
        next = addDays(date, 6 - date.getDay());
        break;
      case 'PageUp':
        next = addMonths(date, e.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        next = addMonths(date, e.shiftKey ? 12 : 1);
        break;
    }
    if (!next) return;
    e.preventDefault();
    keyboardMove.current = true;
    setFocusDay(next);
    setCurrentMonth(next.getMonth());
    setCurrentYear(next.getFullYear());
  };

  // After a keyboard move, the new day takes focus
  useEffect(() => {
    if (!keyboardMove.current || !focusDay) return;
    keyboardMove.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${dayKey(focusDay)}"]`)
      ?.focus();
  }, [focusDay, currentMonth, currentYear]);

  const isToday = (date: Date): boolean => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => sameDay(date, selectedDate);

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth;
  };

  // Get the animation classes based on the current animation state
  const getAnimationClasses = () => {
    if (animation === 'slideIn') {
      return 'animate-slide-in will-change-transform';
    } else if (animation === 'slideOut') {
      return 'animate-slide-out will-change-transform';
    }
    return '';
  };

  const weeks = [0, 1, 2, 3, 4, 5].map((w) =>
    calendarDays.slice(w * 7, w * 7 + 7)
  );

  return (
    <div
      aria-label={props['aria-labelledby'] ? undefined : 'Calendar'}
      {...props}
      ref={ref}
      id={id}
      role="group"
      aria-disabled={disabled || undefined}
      className={cn(
        'relative w-[320px] overflow-hidden p-4 text-[var(--color-text-default)]',
        className
      )}
    >
      {/* Calendar Header */}
      <div className="mb-4 flex items-center justify-between">
        {/* Previous Month Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          disabled={disabled || showMonthSelector || showYearSelector}
          aria-label="Previous month"
          Icon={ChevronLeft}
          iconOnly
          className="z-10"
        />

        {/* Month/Year Display and Selectors */}
        <div className="z-10 flex space-x-1">
          {/* Month Selector */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMonthSelector}
            disabled={disabled}
            className="type-label"
          >
            {MONTHS[currentMonth]}
          </Button>

          {/* Year Selector */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleYearSelector}
            disabled={disabled}
            className="type-label"
          >
            {currentYear}
          </Button>
        </div>

        {/* Next Month Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          disabled={disabled || showMonthSelector || showYearSelector}
          aria-label="Next month"
          Icon={ChevronRight}
          iconOnly
          className="z-10"
        />
      </div>

      {/* Month Selector Dropdown */}
      {showMonthSelector && (
        <div
          className={cn(
            'absolute top-0 right-0 bottom-0 left-0 z-20 flex flex-col bg-[var(--color-surface-section)] pt-14',
            'origin-bottom rounded-md shadow-md',
            getAnimationClasses()
          )}
        >
          <div className="absolute top-0 right-0 left-0 flex h-14 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-section)] px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMonthSelector}
              aria-label="Back to calendar"
              Icon={ChevronLeft}
              iconOnly
            />
            <h2 className="type-label">Select Month</h2>
            <div className="w-10"></div> {/* Spacer for alignment */}
          </div>

          <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-4">
            {MONTHS.map((month, index) => (
              <Button
                key={month}
                variant={currentMonth === index ? 'primary' : 'ghost'}
                size="sm"
                onClick={(e) => handleMonthSelect(e, index)}
                className={cn('type-body-sm h-auto px-0 py-1')}
              >
                {month}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Year Selector Dropdown */}
      {showYearSelector && (
        <div
          className={cn(
            'absolute top-0 right-0 bottom-0 left-0 z-20 flex flex-col bg-[var(--color-surface-section)] pt-14',
            'origin-bottom rounded-md shadow-md',
            getAnimationClasses()
          )}
        >
          <div className="absolute top-0 right-0 left-0 z-10 flex h-14 items-center justify-between border-b border-[var(--color-border-default)] bg-[var(--color-surface-section)] px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleYearSelector}
              aria-label="Back to calendar"
              Icon={ChevronLeft}
              iconOnly
            />
            <h2 className="type-label">Select Year</h2>
            <div className="w-10"></div> {/* Spacer for alignment */}
          </div>

          <div
            ref={yearSelectorRef}
            className="grid flex-1 grid-cols-4 gap-2 overflow-y-auto p-4"
            style={{ overscrollBehavior: 'contain' }}
          >
            {generateYearOptions().map((year) => (
              <Button
                key={year}
                ref={year === currentYear ? selectedYearRef : null}
                variant={currentYear === year ? 'primary' : 'ghost'}
                size="sm"
                onClick={(e) => handleYearSelect(e, year)}
                className={cn('type-body-sm h-auto px-0 py-1')}
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid: a WAI-ARIA date grid. The weekday header is its first row (columnheaders); each row is its
          own 7-column CSS grid and each gridcell a one-cell grid around its day button, so the layout is the one the
          separate header and single 7-column grid had, with no display:contents (Safari drops those elements' roles) */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`${MONTHS[currentMonth]} ${currentYear}`}
        className="flex flex-col gap-1"
      >
        <div role="row" className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="type-label-sm py-1 text-center text-[var(--color-text-muted)]"
            >
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} role="row" className="grid grid-cols-7 gap-1">
            {week.map((date) => (
              <div key={dayKey(date)} role="gridcell" className="grid" aria-selected={isSelected(date) || undefined}>
                <Button
                  variant={isSelected(date) ? 'primary' : 'ghost'}
                  size="sm"
                  data-day={dayKey(date)}
                  tabIndex={sameDay(date, tabDay) ? 0 : -1}
                  onKeyDown={(e) => handleGridKeyDown(e, date)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDateSelect(date);
                  }}
                  className={cn(
                    'h-8 min-w-0 p-0',
                    !isSelected(date) &&
                      (isCurrentMonth(date)
                        ? 'text-[var(--color-text-default)]'
                        : 'text-[var(--color-text-disabled)]'),
                    isToday(date) && !isSelected(date)
                      ? 'border border-[var(--color-primary)]'
                      : ''
                  )}
                  disabled={disabled || !isCurrentMonth(date)}
                  aria-label={dayKey(date)}
                >
                  {date.getDate()}
                </Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

export default Calendar;
