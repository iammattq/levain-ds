'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';

export interface CalendarProps {
  /** Date that should be selected/highlighted in the calendar */
  selectedDate: Date;
  /** Function called when a date is selected */
  onDateSelect: (date: Date) => void;
  /** Additional class name for the calendar container */
  className?: string;
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

const Calendar = ({
  selectedDate,
  onDateSelect,
  className = '',
}: CalendarProps) => {
  const today = new Date();
  // Use selectedDate if provided, otherwise default to today's date for initial state
  const initialDate = selectedDate ?? new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [animation, setAnimation] = useState<'slideIn' | 'slideOut' | null>(
    null
  );
  const yearSelectorRef = useRef<HTMLDivElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  // Update calendar when month/year changes
  useEffect(() => {
    const days = generateCalendarDays(currentYear, currentMonth);
    setCalendarDays(days);
  }, [currentMonth, currentYear]);

  // Update current view when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate.getMonth());
      setCurrentYear(selectedDate.getFullYear());
    }
  }, [selectedDate]);

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
      setTimeout(() => {
        selectedYearRef.current?.scrollIntoView({
          behavior: 'auto',
          block: 'center',
        });
      }, 350); // Wait for animation to complete plus a little buffer
    }
  }, [showYearSelector]);

  // Generate array of dates for the calendar grid
  const generateCalendarDays = (year: number, month: number): Date[] => {
    const days: Date[] = [];
    const firstDayOfMonth = new Date(year, month, 1);

    // Get the first day to show (might be from previous month)
    const firstDayToShow = new Date(firstDayOfMonth);
    firstDayToShow.setDate(firstDayToShow.getDate() - firstDayOfMonth.getDay());

    // Generate 6 weeks (42 days) to ensure we have enough days
    for (let i = 0; i < 42; i++) {
      const day = new Date(firstDayToShow);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return days;
  };

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
    setTimeout(() => {
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
    setTimeout(() => {
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
      setTimeout(() => {
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
      setTimeout(() => {
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
    // First, reset the time portion to midnight exactly in the local timezone
    const localDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0
    );

    // Pass the date to the parent component directly
    onDateSelect(localDate);
  };

  const isToday = (date: Date): boolean => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    // Calculate date components for both dates
    const dateComponents = {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    };

    const selectedComponents = selectedDate
      ? {
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth(),
          day: selectedDate.getDate(),
        }
      : null;

    // Check if date components match (ignoring time)
    const isMatch =
      selectedDate &&
      dateComponents.day === selectedComponents?.day &&
      dateComponents.month === selectedComponents?.month &&
      dateComponents.year === selectedComponents?.year;

    return isMatch;
  };

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

  return (
    <div
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
          disabled={showMonthSelector || showYearSelector}
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
            className="type-label"
          >
            {MONTHS[currentMonth]}
          </Button>

          {/* Year Selector */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleYearSelector}
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
          disabled={showMonthSelector || showYearSelector}
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

      {/* Days of Week Header */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="type-label-sm py-1 text-center text-[var(--color-text-muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <Button
            key={index}
            variant={isSelected(date) ? 'primary' : 'ghost'}
            size="sm"
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
            disabled={!isCurrentMonth(date)}
            aria-label={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
          >
            {date.getDate()}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
