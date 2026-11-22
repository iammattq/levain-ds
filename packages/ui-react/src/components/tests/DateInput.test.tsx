import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DateInput from '../DateInput';

// Mock dependencies
jest.mock('../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Mock Calendar component
jest.mock('../Calendar', () => {
  return function MockCalendar({
    selectedDate,
    onDateSelect,
  }: {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
  }) {
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
    render(<DateInput {...defaultProps} />);

    // Open the calendar
    const calendarButton = screen.getByRole('button');
    fireEvent.click(calendarButton);

    // Click the date selection button in mock calendar
    const selectDateButton = screen.getByTestId('select-date-button');
    fireEvent.click(selectDateButton);

    // onChange should be called with the new date
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    const event = defaultProps.onChange.mock.calls[0][0];
    expect(event.target.value).toBe('2023-05-15');

    // Calendar should close after selection
    expect(screen.queryByTestId('mock-calendar')).not.toBeInTheDocument();
  });

  // Test onChange callback from text input
  test('calls onChange when text input value changes', () => {
    render(<DateInput {...defaultProps} />);

    const textInput = screen.getByRole('textbox');

    // Type a new date
    fireEvent.change(textInput, { target: { value: '2023-06-01' } });

    // onChange should be called
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    const event = defaultProps.onChange.mock.calls[0][0];
    expect(event.target.value).toBe('2023-06-01');
  });

  // Test input masking logic
  test('applies date format masking when typing digits', () => {
    const onChange = jest.fn();
    render(<DateInput {...defaultProps} value="" onChange={onChange} />);

    const textInput = screen.getByRole('textbox');

    // Type digits without formatting
    fireEvent.change(textInput, { target: { value: '20230510' } });

    // Should add formatting (YYYY-MM-DD)
    expect(onChange).toHaveBeenCalledTimes(1);
    const event = onChange.mock.calls[0][0];
    expect(event.target.value).toBe('2023-05-10');
  });

  // Test date validation - valid format
  test('validates date format correctly', async () => {
    const { getByRole } = render(<DateInput {...defaultProps} value="" />);
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
    const { getByRole } = render(<DateInput {...defaultProps} value="" />);
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
        value="2024-05-10"
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

  // Test empty value handling
  test('handles empty value correctly on blur', () => {
    render(<DateInput {...defaultProps} value="" />);

    // Input should be empty initially
    const textInput = screen.getByRole('textbox');
    expect(textInput).toHaveValue('');

    // Blur the input
    fireEvent.blur(textInput);

    // onChange should be called with empty string
    expect(defaultProps.onChange).toHaveBeenCalledTimes(1);
    const event = defaultProps.onChange.mock.calls[0][0];
    expect(event.target.value).toBe('');
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
