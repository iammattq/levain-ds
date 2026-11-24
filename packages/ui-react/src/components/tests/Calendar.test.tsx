// This file only exists as a placeholder for the Calendar component tests.
// Further tests will be implemented later.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Calendar from '../Calendar';

/**
 * Testing the Calendar component.
 *
 * This is a complex component with several key areas to test:
 * 1. Basic rendering
 * 2. Navigation (prev/next month)
 * 3. Month selector
 * 4. Year selector
 * 5. Date selection
 * 6. Highlighting current day, selected day, and days in current month
 */

describe('Calendar Component', () => {
  // Set a fixed date for testing to make tests consistent
  const mockToday = new Date('2024-04-15T00:00:00.000Z'); // April 15, 2024

  beforeEach(() => {
    // Set fake time to our fixed date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(mockToday);
  });

  afterEach(() => {
    // Reset timers after each test
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders the calendar with correct month and year', () => {
      const selectedDate = new Date('2024-03-31'); // March 31, 2024 (previous month)
      const handleDateSelect = jest.fn();

      render(
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      );

      // Check month and year
      expect(screen.getByText('March')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();

      // Check days of week headers
      expect(screen.getByText('Su')).toBeInTheDocument();
      expect(screen.getByText('Mo')).toBeInTheDocument();
      expect(screen.getByText('Tu')).toBeInTheDocument();
      expect(screen.getByText('We')).toBeInTheDocument();
      expect(screen.getByText('Th')).toBeInTheDocument();
      expect(screen.getByText('Fr')).toBeInTheDocument();
      expect(screen.getByText('Sa')).toBeInTheDocument();

      // Check specific dates are displayed
      const days = screen.getAllByText('31');
      expect(days.length).toBeGreaterThanOrEqual(1);
    });

    it('applies custom className', () => {
      const selectedDate = new Date('2024-03-31');
      const handleDateSelect = jest.fn();

      const { container } = render(
        <Calendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          className="custom-class"
        />
      );

      // The first div should have the custom class
      const calendarElement = container.firstChild;
      expect(calendarElement).toHaveClass('custom-class');
    });
  });

  describe('Date Selection', () => {
    it('selects a date when clicked', () => {
      const selectedDate = new Date('2024-03-15');
      const handleDateSelect = jest.fn();

      render(
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      );

      // Find and click on a date in the current month
      const dateButtons = screen.getAllByRole('button');
      const date15Button = dateButtons.find(
        (button) => button.getAttribute('aria-label') === '2024-03-15'
      );

      expect(date15Button).not.toBeUndefined();
      if (date15Button) {
        fireEvent.click(date15Button);
      }

      // Function should be called with correct date
      expect(handleDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = handleDateSelect.mock.calls[0][0];
      expect(calledDate.getFullYear()).toBe(2024);
      expect(calledDate.getMonth()).toBe(2); // 0-indexed, so March is 2
      expect(calledDate.getDate()).toBe(15);
    });
  });

  describe('Month Navigation', () => {
    it('navigates to previous month when prev button is clicked', () => {
      const selectedDate = new Date('2024-03-15');
      const handleDateSelect = jest.fn();

      render(
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      );

      // Check initial month
      expect(screen.getByText('March')).toBeInTheDocument();

      // Click prev month button
      const prevButton = screen.getByLabelText('Previous month');
      fireEvent.click(prevButton);

      // Should now show February
      expect(screen.getByText('February')).toBeInTheDocument();
    });

    it('navigates to next month when next button is clicked', () => {
      const selectedDate = new Date('2024-03-15');
      const handleDateSelect = jest.fn();

      render(
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      );

      // Check initial month
      expect(screen.getByText('March')).toBeInTheDocument();

      // Click next month button
      const nextButton = screen.getByLabelText('Next month');
      fireEvent.click(nextButton);

      // Should now show April
      expect(screen.getByText('April')).toBeInTheDocument();
    });
  });

  describe('Month Selector', () => {
    it('opens month selector when month button is clicked', () => {
      const selectedDate = new Date('2024-03-15');
      const handleDateSelect = jest.fn();

      render(
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      );

      // Find and click month button
      const monthButton = screen.getByText('March');
      fireEvent.click(monthButton);

      // Month selector should be visible
      expect(screen.getByText('Select Month')).toBeInTheDocument();
    });
  });

  describe('Year Selector', () => {
    it('opens year selector when year button is clicked', () => {
      const selectedDate = new Date('2024-03-15');
      const handleDateSelect = jest.fn();

      render(
        <Calendar selectedDate={selectedDate} onDateSelect={handleDateSelect} />
      );

      // Find and click year button
      const yearButton = screen.getByText('2024');
      fireEvent.click(yearButton);

      // Year selector should be visible
      expect(screen.getByText('Select Year')).toBeInTheDocument();
    });
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, the WAI-ARIA date grid, and the
// T26 A3 items (T54)
describe('Calendar: form-input convention', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 3, 15));
  });
  afterEach(() => jest.useRealTimers());

  const day = (key: string) => screen.getByRole('button', { name: key });

  test('value and change: onChange(date) at local midnight, value first', () => {
    const onChange = jest.fn();
    render(<Calendar value={new Date(2024, 2, 15)} onChange={onChange} />);
    fireEvent.click(day('2024-03-20'));
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 2, 20, 0, 0, 0, 0));
  });

  test('controlled: shows only what value says; null is none chosen', () => {
    const { rerender } = render(<Calendar value={new Date(2024, 2, 15)} onChange={() => {}} />);
    fireEvent.click(day('2024-03-20'));
    expect(day('2024-03-15').className).toContain('bg-[var(--color-primary)]');
    expect(day('2024-03-20').className).not.toContain('bg-[var(--color-primary)]');
    rerender(<Calendar value={null} onChange={() => {}} />);
    expect(screen.getByRole('grid').querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
  });

  test('uncontrolled: defaultValue (else none, on today’s month), then its own state', () => {
    const onChange = jest.fn();
    const { unmount } = render(<Calendar defaultValue={new Date(2024, 2, 15)} onChange={onChange} />);
    fireEvent.click(day('2024-03-20'));
    expect(day('2024-03-20').closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true');
    expect(onChange).toHaveBeenCalledTimes(1);
    unmount();
    render(<Calendar />);
    expect(screen.getByText('April')).toBeInTheDocument();
  });

  test('deprecated selectedDate/onDateSelect still work, alongside onChange', () => {
    const onDateSelect = jest.fn();
    const onChange = jest.fn();
    render(<Calendar selectedDate={new Date(2024, 2, 15)} onDateSelect={onDateSelect} onChange={onChange} />);
    fireEvent.click(day('2024-03-02'));
    expect(onDateSelect).toHaveBeenCalledWith(new Date(2024, 2, 2));
    expect(onChange).toHaveBeenCalledWith(new Date(2024, 2, 2));
  });

  test('the month view does not snap back when the parent re-renders with a new Date for the same day (A3)', () => {
    const { rerender } = render(<Calendar value={new Date(2024, 2, 15)} onChange={() => {}} />);
    fireEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByText('April')).toBeInTheDocument();
    rerender(<Calendar value={new Date(2024, 2, 15)} onChange={() => {}} />);
    expect(screen.getByText('April')).toBeInTheDocument();
    // a different day still brings its month into view
    rerender(<Calendar value={new Date(2024, 0, 3)} onChange={() => {}} />);
    expect(screen.getByText('January')).toBeInTheDocument();
  });

  test('timers are cleared on unmount (A3)', () => {
    const { unmount } = render(<Calendar value={new Date(2024, 2, 15)} />);
    fireEvent.click(screen.getByText('March'));
    fireEvent.click(screen.getByRole('button', { name: 'June' }));
    fireEvent.click(screen.getByText('2024'));
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('date grid: one Tab stop, on the chosen day', () => {
    render(<Calendar value={new Date(2024, 2, 15)} />);
    const grid = screen.getByRole('grid', { name: 'March 2024' });
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
    expect(day('2024-03-15')).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByRole('row')).toHaveLength(6);
  });

  test('date grid keys: arrows by day and week, Home/End the week, PageUp/PageDown the month, Shift for the year', () => {
    render(<Calendar value={new Date(2024, 2, 15)} />); // a Friday
    day('2024-03-15').focus();
    const press = (key: string, shiftKey = false) => fireEvent.keyDown(document.activeElement!, { key, shiftKey });
    press('ArrowRight');
    expect(day('2024-03-16')).toHaveFocus();
    press('ArrowLeft');
    press('ArrowUp');
    expect(day('2024-03-08')).toHaveFocus();
    press('ArrowDown');
    press('ArrowDown');
    expect(day('2024-03-22')).toHaveFocus();
    press('Home');
    expect(day('2024-03-17')).toHaveFocus();
    press('End');
    expect(day('2024-03-23')).toHaveFocus();
    press('PageDown');
    expect(screen.getByText('April')).toBeInTheDocument();
    expect(day('2024-04-23')).toHaveFocus();
    press('PageUp', true);
    expect(day('2023-04-23')).toHaveFocus();
    expect(day('2023-04-23')).toHaveAttribute('tabindex', '0');
  });

  test('an arrow off the month brings the next month into view; Jan 31 + a month is Feb 29', () => {
    render(<Calendar value={new Date(2024, 0, 31)} />);
    day('2024-01-31').focus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(screen.getByText('February')).toBeInTheDocument();
    expect(day('2024-02-01')).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    fireEvent.keyDown(document.activeElement!, { key: 'PageDown' });
    expect(day('2024-02-29')).toHaveFocus();
  });

  test('disabled: every button natively disabled, nothing fires', () => {
    const onChange = jest.fn();
    render(<Calendar value={new Date(2024, 2, 15)} disabled onChange={onChange} />);
    expect(day('2024-03-15')).toBeDisabled();
    expect(screen.getByLabelText('Next month')).toBeDisabled();
    expect(screen.getByText('March').closest('button')).toBeDisabled();
    fireEvent.click(day('2024-03-15'));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('ref, id and passthrough on the root, a named group; id falls back to useId', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { unmount } = render(<Calendar ref={ref} id="cal" aria-label="Due date" data-x="1" />);
    const root = screen.getByRole('group', { name: 'Due date' });
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('id', 'cal');
    expect(root).toHaveAttribute('data-x', '1');
    unmount();
    render(<Calendar />);
    const fallback = screen.getByRole('group', { name: 'Calendar' });
    expect(fallback.id).not.toBe('');
  });

  test('className is merged with cn: the app class wins', () => {
    render(<Calendar className="w-full" />);
    const root = screen.getByRole('group');
    expect(root).toHaveClass('w-full');
    expect(root).not.toHaveClass('w-[320px]');
  });
});
