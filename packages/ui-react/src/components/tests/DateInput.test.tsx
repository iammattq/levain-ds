import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DateInput from '../DateInput';

// Mock dependencies
jest.mock('../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Mock Calendar component; the focus tests set mockRealCalendar to use the real one
let mockRealCalendar = false;
jest.mock('../Calendar', () => {
  const RealCalendar = jest.requireActual('../Calendar').default;
  return function MockCalendar({
    value: selectedDate,
    onChange: onDateSelect,
  }: {
    value: Date;
    onChange: (date: Date) => void;
  }) {
    if (mockRealCalendar) return <RealCalendar value={selectedDate} onChange={onDateSelect} />;
    return (
      <div data-testid="mock-calendar">
        <div>Selected: {selectedDate.toISOString().split('T')[0]}</div>
        <button
          data-testid="select-date-button"
          onClick={() => onDateSelect(new Date(2023, 4, 15))} // May 15, 2023
        >
          Select May 15, 2023
        </button>
      </div>
    );
  };
});

// Mock the calculatePopupPosition function
jest.mock('../../utils/popupPosition', () => ({
  calculatePopupPosition: jest.fn().mockReturnValue({
    x: 0,
    y: 40,
    width: 300,
    height: 340,
    placement: 'bottom',
    alignment: 'start',
    transformOrigin: 'top left',
  }),
}));

describe('DateInput Component', () => {
  // Define common props for testing
  const defaultProps = {
    id: 'test-date',
    label: 'Event Date',
    value: '2023-04-20',
    onChange: jest.fn(),
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic rendering
  test('renders with label and input fields', () => {
    render(<DateInput {...defaultProps} />);

    // Check for the label element
    const labelElement = screen.getByText('Event Date');
    expect(labelElement).toBeInTheDocument();
    expect(labelElement.tagName.toLowerCase()).toBe('label');
    expect(labelElement).toHaveAttribute('for', 'test-date');

    // Check for the text input
    const textInput = screen.getByRole('textbox');
    expect(textInput).toBeInTheDocument();
    expect(textInput).toHaveAttribute('id', 'test-date');
    expect(textInput).toHaveValue('2023-04-20');
    expect(textInput).toHaveAttribute('placeholder', 'YYYY-MM-DD');

    // Check for the calendar button
    const calendarButton = screen.getByRole('button');
    expect(calendarButton).toBeInTheDocument();
    expect(calendarButton).toHaveAttribute(
      'aria-label',
      'Choose Event Date date'
    );

    // Calendar popup should not be visible initially
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();
  });

  // Test value binding
  test('displays the provided date value', () => {
    render(<DateInput {...defaultProps} value="2023-05-10" />);

    // Text input should have the date value
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveValue('2023-05-10');
  });

  // Test opening calendar popup
  test('opens calendar popup when calendar button is clicked', () => {
    render(<DateInput {...defaultProps} />);

    // Calendar should not be visible initially
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();

    // Click the calendar button
    const calendarButton = screen.getByRole('button');
    fireEvent.click(calendarButton);

    // Calendar should now be visible
    expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();

    // Calendar should show the currently selected date
    expect(screen.getByText('Selected: 2023-04-20')).toBeInTheDocument();
  });

  // Test closing calendar by clicking button again
  test('closes calendar popup when calendar button is clicked again', () => {
    render(<DateInput {...defaultProps} />);

    // Click to open calendar
    const calendarButton = screen.getByRole('button');
    fireEvent.click(calendarButton);

    // Calendar should be visible
    expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();

    // Click again to close
    fireEvent.click(calendarButton);

    // Calendar should no longer be visible
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();
  });

  // Test selecting date from calendar
  test('selects date from calendar and calls onChange', () => {
    // controlled: the field goes back to value after the event, so read target.value inside the handler
    const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => e.target.value);
    render(<DateInput {...defaultProps} onChange={onChange} />);

    // Open the calendar
    const calendarButton = screen.getByRole('button');
    fireEvent.click(calendarButton);

    // Click the date selection button in mock calendar
    const selectDateButton = screen.getByTestId('select-date-button');
    fireEvent.click(selectDateButton);

    // onChange should be called with the new date
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveReturnedWith('2023-05-15');

    // Calendar should close after selection
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();
  });

  // Test onChange callback from text input
  test('calls onChange when text input value changes', () => {
    const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => e.target.value);
    render(<DateInput {...defaultProps} onChange={onChange} />);

    const textInput = screen.getByRole('textbox');

    // Type a new date
    fireEvent.change(textInput, { target: { value: '2023-06-01' } });

    // onChange should be called
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveReturnedWith('2023-06-01');
  });

  // Test input masking logic
  test('applies date format masking when typing digits', () => {
    const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => e.target.value);
    render(<DateInput {...defaultProps} value="" onChange={onChange} />);

    const textInput = screen.getByRole('textbox');

    // Type digits without formatting
    fireEvent.change(textInput, { target: { value: '20230510' } });

    // Should add formatting (YYYY-MM-DD)
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveReturnedWith('2023-05-10');
  });

  // Test date validation - valid format
  test('validates date format correctly', async () => {
    const { getByRole } = render(<DateInput {...defaultProps} value={undefined} defaultValue="" />);
    const textInput = getByRole('textbox');

    // Enter an invalid format (mm/dd/yyyy instead of yyyy-mm-dd)
    fireEvent.change(textInput, { target: { value: '05/10/2023' } });
    fireEvent.blur(textInput);

    // Should show validation error for invalid format
    expect(
      screen.getByText('Please enter a valid date in YYYY-MM-DD format')
    ).toBeInTheDocument();

    // Now enter a valid format
    fireEvent.change(textInput, { target: { value: '2023-05-10' } });
    fireEvent.blur(textInput);

    // Error should be gone
    expect(
      screen.queryByText('Please enter a valid date in YYYY-MM-DD format')
    ).not.toBeInTheDocument();
  });

  // Test date validation - valid date
  test('validates date validity correctly', async () => {
    const { getByRole } = render(<DateInput {...defaultProps} value={undefined} defaultValue="" />);
    const textInput = getByRole('textbox');

    // Enter a date with invalid month (13)
    fireEvent.change(textInput, { target: { value: '2023-13-10' } });
    fireEvent.blur(textInput);

    // Should show validation error
    expect(
      screen.getByText('Please enter a valid date in YYYY-MM-DD format')
    ).toBeInTheDocument();

    // Enter a date with invalid day (February 30)
    fireEvent.change(textInput, { target: { value: '2023-02-30' } });
    fireEvent.blur(textInput);

    // Should show validation error
    expect(
      screen.getByText('Please enter a valid date in YYYY-MM-DD format')
    ).toBeInTheDocument();

    // Enter a valid date
    fireEvent.change(textInput, { target: { value: '2023-02-28' } });
    fireEvent.blur(textInput);

    // Error should be gone
    expect(
      screen.queryByText('Please enter a valid date in YYYY-MM-DD format')
    ).not.toBeInTheDocument();
  });

  // Test custom validation function
  test('uses custom validation function', async () => {
    const customValidate = (value: string) => {
      // Example: Only allow dates in 2023
      if (value && !value.startsWith('2023-')) {
        return 'Date must be in 2023';
      }
      return null;
    };

    const { getByRole } = render(
      <DateInput
        {...defaultProps}
        value={undefined}
        defaultValue="2024-05-10"
        validate={customValidate}
        touched={true}
      />
    );

    const textInput = getByRole('textbox');

    // Error should be visible without needing to trigger blur
    // since we've set touched=true and the initial value is invalid
    expect(screen.getByText('Date must be in 2023')).toBeInTheDocument();

    // Enter a valid date within 2023
    fireEvent.change(textInput, { target: { value: '2023-05-10' } });
    fireEvent.blur(textInput);

    // Error should be gone
    expect(screen.queryByText('Date must be in 2023')).not.toBeInTheDocument();
  });

  // Test external error message
  test('displays external error message when provided and touched is true', () => {
    const errorMessage = 'Date must be in the future';
    render(<DateInput {...defaultProps} error={errorMessage} touched={true} />);

    const errorElement = screen.getByText(errorMessage);
    expect(errorElement).toBeInTheDocument();

    // Input should have invalid state
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute('aria-invalid', 'true');
  });

  // Test that error is not shown if touched is false
  test('does not display error message when touched is false', () => {
    const errorMessage = 'Date must be in the future';
    render(
      <DateInput {...defaultProps} error={errorMessage} touched={false} />
    );

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  // Test helper text
  test('displays helper text when provided', () => {
    const helperText = 'Enter date in YYYY-MM-DD format';
    render(<DateInput {...defaultProps} helperText={helperText} />);

    const helperElement = screen.getByText(helperText);
    expect(helperElement).toBeInTheDocument();

    // Check for the correct aria description binding
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute(
      'aria-describedby',
      `${defaultProps.id}-helper`
    );
  });

  // Test required state
  test('shows required indicator when required is true', () => {
    render(<DateInput {...defaultProps} required />);

    // The label should contain the required asterisk
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-[var(--color-error)]');

    // Input should have required attribute
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveAttribute('required');
  });

  // Test disabled state
  test('renders in disabled state correctly', () => {
    render(<DateInput {...defaultProps} disabled />);

    // Text input should be disabled
    const textInput = screen.getByRole('textbox');
    expect(textInput).toBeDisabled();

    // Calendar button should be disabled
    const calendarButton = screen.getByRole('button');
    expect(calendarButton).toBeDisabled();

    // Label should have disabled styling
    const labelElement = screen.getByText('Event Date');
    expect(labelElement).toHaveClass('text-[var(--color-text-disabled)]');
  });

  // Test onBlur callback
  test('calls onBlur callback when provided', () => {
    const onBlurMock = jest.fn();
    render(<DateInput {...defaultProps} onBlur={onBlurMock} />);

    const textInput = screen.getByRole('textbox');
    fireEvent.blur(textInput);

    expect(onBlurMock).toHaveBeenCalledTimes(1);
  });

  // Blur no longer sends a made-up onChange('') (A3: synthetic events); clearing the field already sent one
  test('blur on an empty field sends no onChange', () => {
    render(<DateInput {...defaultProps} value={undefined} defaultValue="" />);
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveValue('');
    fireEvent.blur(textInput);
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  // Test custom class names
  test('applies custom class names', () => {
    const { container } = render(
      <DateInput
        {...defaultProps}
        className="custom-container-class"
        inputClassName="custom-input-class"
        buttonClassName="custom-button-class"
      />
    );

    // Container should have the custom class
    expect(container.firstChild).toHaveClass('custom-container-class');

    // Text input should have the custom class
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveClass('custom-input-class');

    // Calendar button should have the custom class
    const calendarButton = screen.getByRole('button');
    expect(calendarButton).toHaveClass('custom-button-class');
  });

  // Test helper text is hidden when error is shown
  test('hides helper text when error is shown', () => {
    const helperText = 'This is helper text';
    const errorMessage = 'This is an error';

    render(
      <DateInput
        {...defaultProps}
        helperText={helperText}
        error={errorMessage}
        touched={true}
      />
    );

    // Error should be visible
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    // Helper text should not be visible
    expect(screen.queryByText(helperText)).not.toBeInTheDocument();
  });

  // Test ref forwarding
  test('forwards ref to text input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<DateInput {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('input');
    expect(ref.current?.id).toBe('test-date');
    expect(ref.current?.type).toBe('text');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, and the T26 A3 item (T54)
describe('DateInput: form-input convention', () => {
  const field = () => screen.getByRole('textbox') as HTMLInputElement;

  test('typing: onChange gets the real ChangeEvent from the input, target.value masked (A3)', () => {
    const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => e.target.value);
    render(<DateInput label="Due" value="" onChange={onChange} />);
    fireEvent.change(field(), { target: { value: '20230510' } });
    const event = onChange.mock.calls[0][0];
    expect(event.target).toBe(field());
    expect(onChange).toHaveReturnedWith('2023-05-10');
    expect(event.type).toBe('change');
    expect(typeof event.preventDefault).toBe('function');
    expect(event.nativeEvent).toBeInstanceOf(Event);
  });

  test('a calendar pick: onChange gets the same real event, target.value the picked date (A3)', () => {
    const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => e.target.value);
    render(<DateInput label="Due" value="2023-04-20" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose Due date' }));
    fireEvent.click(screen.getByTestId('select-date-button'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0][0];
    expect(event.target).toBe(field());
    expect(event.target.id).toBe(field().id);
    expect(onChange).toHaveReturnedWith('2023-05-15');
    expect(event.nativeEvent).toBeInstanceOf(Event);
  });

  test('an app reading e.target.value from a form handler sees the same value both ways', () => {
    const seen: string[] = [];
    render(<DateInput label="Due" defaultValue="" onChange={(e) => seen.push(e.target.value)} />);
    fireEvent.change(field(), { target: { value: '2024-01-02' } });
    fireEvent.click(screen.getByRole('button', { name: 'Choose Due date' }));
    fireEvent.click(screen.getByTestId('select-date-button'));
    expect(seen).toEqual(['2024-01-02', '2023-05-15']);
  });

  test('controlled: the field shows value, always; a parent that rejects or resets an edit wins', () => {
    // a parent that takes only complete dates
    function OnlyComplete() {
      const [v, setV] = React.useState('2023-04-20');
      return (
        <>
          <DateInput label="Due" value={v} onChange={(e) => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && setV(e.target.value)} />
          <button type="button" onClick={() => setV('2000-01-01')}>Reset</button>
        </>
      );
    }
    render(<OnlyComplete />);
    fireEvent.change(field(), { target: { value: '2023-0' } });
    expect(field().value).toBe('2023-04-20'); // rejected: value wins
    fireEvent.change(field(), { target: { value: '20240305' } });
    expect(field().value).toBe('2024-03-05'); // accepted, as masked
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(field().value).toBe('2000-01-01');
    // a parent that ignores every change: the field never moves, even for a calendar pick
    const onChange = jest.fn();
    render(<DateInput label="Fixed" value="2023-04-20" onChange={onChange} />);
    const fixed = screen.getAllByRole('textbox')[1] as HTMLInputElement;
    fireEvent.change(fixed, { target: { value: '1999-09-09' } });
    expect(fixed.value).toBe('2023-04-20');
    fireEvent.click(screen.getByRole('button', { name: 'Choose Fixed date' }));
    fireEvent.click(screen.getByTestId('select-date-button'));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: fixed }));
    expect(fixed.value).toBe('2023-04-20');
  });

  test('uncontrolled: defaultValue, then its own state', () => {
    const onChange = jest.fn();
    render(<DateInput label="Due" defaultValue="2023-01-01" onChange={onChange} />);
    expect(field().value).toBe('2023-01-01');
    fireEvent.change(field(), { target: { value: '20240305' } });
    expect(field().value).toBe('2024-03-05');
    expect(onChange).toHaveBeenCalledTimes(1);
    render(<DateInput label="Other" />);
    expect(screen.getAllByRole('textbox')[1]).toHaveValue('');
  });

  test('an app error shows at once (Q-touched), unless touched is false or disabled', () => {
    const { rerender } = render(<DateInput label="Due" value="" onChange={() => {}} error="Too late" />);
    expect(screen.getByText('Too late')).toBeInTheDocument();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAttribute('aria-describedby', `${field().id}-error`);
    rerender(<DateInput label="Due" value="" onChange={() => {}} error="Too late" touched={false} />);
    expect(screen.queryByText('Too late')).not.toBeInTheDocument();
    rerender(<DateInput label="Due" value="" onChange={() => {}} error="Too late" helperText="Help" disabled />);
    expect(screen.queryByText('Too late')).not.toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  test('its own format check waits for the first blur', () => {
    render(<DateInput label="Due" defaultValue="" />);
    fireEvent.change(field(), { target: { value: '2023-13-01' } });
    expect(screen.queryByText('Please enter a valid date in YYYY-MM-DD format')).not.toBeInTheDocument();
    fireEvent.blur(field());
    expect(screen.getByText('Please enter a valid date in YYYY-MM-DD format')).toBeInTheDocument();
  });

  test('size: the input scale; md is the old look', () => {
    const { rerender } = render(<DateInput label="Due" defaultValue="" />);
    expect(field()).toHaveClass('h-10', 'px-3');
    expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
    rerender(<DateInput label="Due" defaultValue="" size="xs" />);
    expect(field()).toHaveClass('h-7', 'px-2');
    expect(screen.getByRole('button')).toHaveClass('h-7', 'w-7');
    expect(screen.getByText('Due')).toHaveClass('type-label-sm');
  });

  test('disabled: native, the calendar does not open, typing sends nothing', () => {
    const onChange = jest.fn();
    render(<DateInput label="Due" defaultValue="" disabled onChange={onChange} />);
    expect(field()).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();
    fireEvent.change(field(), { target: { value: '2024-01-01' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  test('id is optional (useId), label optional; aria-* and other props reach the input', () => {
    render(<DateInput aria-label="Start" name="start" data-x="1" aria-describedby="note" helperText="Help" />);
    const input = screen.getByRole('textbox', { name: 'Start' });
    expect(input.id).not.toBe('');
    expect(input).toHaveAttribute('name', 'start');
    expect(input).toHaveAttribute('data-x', '1');
    expect(input).toHaveAttribute('aria-describedby', `note ${input.id}-helper`);
    expect(screen.getByRole('button', { name: 'Choose date' })).toBeInTheDocument();
  });

  test('className goes on the root; the calendar button shows the keyboard ring', () => {
    const { container } = render(<DateInput label="Due" defaultValue="" className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
    const button = screen.getByRole('button');
    expect(button.className).toContain('focus-visible:ring-[var(--color-border-focus)]');
    expect(button.className).toContain('focus-visible:ring-offset-2');
  });

  test('Escape closes the calendar and puts focus back on its button', () => {
    render(<DateInput label="Due" defaultValue="" />);
    const button = screen.getByRole('button', { name: 'Choose Due date' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});

// The calendar popup by keyboard, with the real Calendar (T54 review)
describe('DateInput: the calendar by keyboard (real Calendar)', () => {
  beforeAll(() => {
    mockRealCalendar = true;
  });
  afterAll(() => {
    mockRealCalendar = false;
  });

  test('opening moves focus to the chosen day, the grid\'s one Tab stop', () => {
    render(<DateInput label="Due" defaultValue="2026-03-14" />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose Due date' }));
    const grid = screen.getByRole('grid', { name: 'March 2026' });
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '2026-03-14' })).toHaveFocus();
  });

  test('arrows then Enter pick a day: the field gets it and focus returns to the calendar button', () => {
    const onChange = jest.fn((e: React.ChangeEvent<HTMLInputElement>) => e.target.value);
    render(<DateInput label="Due" defaultValue="2026-03-14" onChange={onChange} />);
    const button = screen.getByRole('button', { name: 'Choose Due date' });
    fireEvent.click(button);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: '2026-03-21' })).toHaveFocus();
    // a native button: Enter clicks it
    fireEvent.click(document.activeElement!);
    expect(onChange).toHaveReturnedWith('2026-03-21');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveValue('2026-03-21');
  });

  test('Escape closes it and returns focus to the calendar button, the field unchanged', () => {
    render(<DateInput label="Due" defaultValue="2026-03-14" />);
    const button = screen.getByRole('button', { name: 'Choose Due date' });
    fireEvent.click(button);
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveValue('2026-03-14');
  });
});
