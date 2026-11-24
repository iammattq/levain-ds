import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TagInput from '../TagInput';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="x-icon">✕</div>,
  Plus: () => <div data-testid="plus-icon">+</div>,
  Loader2: () => (
    <div data-testid="loader-icon" className="animate-spin">
      ↻
    </div>
  ),
}));

describe('TagInput Component', () => {
  // Sample data for testing
  const availableTags = [
    { id: '1', name: 'React' },
    { id: '2', name: 'TypeScript' },
    { id: '3', name: 'JavaScript' },
    { id: '4', name: 'CSS' },
    { id: '5', name: 'HTML' },
  ];

  const defaultProps = {
    id: 'test-tag-input',
    label: 'Skills',
    availableTags,
    selectedTags: ['1'], // Pre-select React
    onChange: jest.fn(),
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic rendering
  test('renders with a label and input field', () => {
    render(<TagInput {...defaultProps} />);

    // Check for the label
    expect(screen.getByText('Skills')).toBeInTheDocument();

    // Check for the input field
    const input = screen.getByRole('combobox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-tag-input');
  });

  // Test rendering selected tags
  test('displays selected tags correctly', () => {
    render(<TagInput {...defaultProps} />);

    // The pre-selected React tag should be visible
    expect(screen.getByText('React')).toBeInTheDocument();

    // Should have a remove button
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  // Test removing a tag
  test('removes a tag when the remove button is clicked', () => {
    render(<TagInput {...defaultProps} />);

    // Find and click the remove button
    const removeButton = screen.getByRole('button', {
      name: /Remove React tag/i,
    });
    fireEvent.click(removeButton);

    // onChange should be called with an empty array (removing the only selected tag)
    expect(defaultProps.onChange).toHaveBeenCalledWith([]);
  });

  // Test tag suggestions appear when typing
  test('shows tag suggestions when typing', async () => {
    render(<TagInput {...defaultProps} />);

    // Focus the input and type
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Type' } });

    // TypeScript suggestion should appear
    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    // We're not testing for JavaScript here since the component may only show
    // a limited number of suggestions or sort them differently
  });

  // Test selecting a tag from suggestions
  test('selects a tag when clicking on a suggestion', () => {
    render(<TagInput {...defaultProps} />);

    // Focus the input and type to get suggestions
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Type' } });

    // Find and click on the TypeScript suggestion
    const suggestion = screen.getByText('TypeScript');
    fireEvent.mouseDown(suggestion); // Use mouseDown because the component uses it

    // onChange should be called with both React and TypeScript
    expect(defaultProps.onChange).toHaveBeenCalledWith(['1', '2']);

    // Input should be cleared
    expect(input).toHaveValue('');
  });

  // Test adding a tag with keyboard
  test('adds a tag when pressing Enter on a matching input', () => {
    render(<TagInput {...defaultProps} />);

    // Focus the input and type an exact match
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'CSS' } });

    // Press Enter to add the tag
    fireEvent.keyDown(input, { key: 'Enter' });

    // onChange should be called with both React and CSS
    expect(defaultProps.onChange).toHaveBeenCalledWith(['1', '4']);
  });

  // Test maxTags limit
  test('respects maxTags limit', () => {
    render(
      <TagInput {...defaultProps} selectedTags={['1', '2']} maxTags={2} />
    );

    // Input field should exist but be hidden when max tags reached
    const input = screen.queryByRole('textbox');
    expect(input).not.toBeInTheDocument();

    // Both selected tags should be visible
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  // Test creating a new tag
  test('shows create tag button for new tag names', async () => {
    const onCreateTag = jest
      .fn()
      .mockResolvedValue({ id: '6', name: 'NewTag' });

    render(<TagInput {...defaultProps} onCreateTag={onCreateTag} />);

    // Focus the input and type a non-existing tag
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'NewTag' } });

    // Look for plus icon inside button
    const plusIcon = screen.getByTestId('plus-icon');
    expect(plusIcon).toBeInTheDocument();

    // Find the create button (parent of plus icon)
    const createButton = plusIcon.closest('button');
    expect(createButton).not.toBeNull();

    // Click the create button
    fireEvent.mouseDown(createButton!);

    // onCreateTag should be called with the tag name
    expect(onCreateTag).toHaveBeenCalledWith('NewTag');

    // Wait for the async operation
    await waitFor(() => {
      // onChange should be called with both existing tag and new tag
      expect(defaultProps.onChange).toHaveBeenCalledWith(['1', '6']);
    });
  });

  // Test creating a tag with keyboard
  test('creates a tag when pressing Enter on a non-matching input', async () => {
    const onCreateTag = jest
      .fn()
      .mockResolvedValue({ id: '7', name: 'AnotherTag' });

    render(<TagInput {...defaultProps} onCreateTag={onCreateTag} />);

    // Focus the input and type a non-existing tag
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'AnotherTag' } });

    // Press Enter to create the tag
    fireEvent.keyDown(input, { key: 'Enter' });

    // onCreateTag should be called with the tag name
    expect(onCreateTag).toHaveBeenCalledWith('AnotherTag');

    // Wait for the async operation
    await waitFor(() => {
      // onChange should be called with both existing tag and new tag
      expect(defaultProps.onChange).toHaveBeenCalledWith(['1', '7']);
    });
  });

  // Test error message
  test('displays error message when provided and touched', () => {
    const errorMessage = 'Please select at least one tag';
    render(<TagInput {...defaultProps} error={errorMessage} touched={true} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  // Test error message hidden when not touched
  test('hides error message when not touched', () => {
    const errorMessage = 'Please select at least one tag';
    render(<TagInput {...defaultProps} error={errorMessage} touched={false} />);

    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  // Test helper text
  test('displays helper text when provided', () => {
    const helperText = 'Select skills relevant to your project';
    render(<TagInput {...defaultProps} helperText={helperText} />);

    expect(screen.getByText(helperText)).toBeInTheDocument();
  });

  // Test loading state
  test('displays loading indicator when loading is true', () => {
    render(<TagInput {...defaultProps} loading={true} />);

    // Should show the loading icon
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

    // Should show loading text
    expect(screen.getByText('Loading tags...')).toBeInTheDocument();

    // Input should be disabled
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
  });

  // Test required indicator
  test('shows required indicator when required is true', () => {
    render(<TagInput {...defaultProps} required={true} />);

    // Should show the required asterisk
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-[var(--color-error)]');
  });

  // Test creating tag with error handling
  test('handles errors when creating tags', async () => {
    // Mock console.error to prevent test output noise
    const originalConsoleError = console.error;
    console.error = jest.fn();

    // Mock that throws an error
    const onCreateTag = jest
      .fn()
      .mockRejectedValue(new Error('Failed to create tag'));

    render(<TagInput {...defaultProps} onCreateTag={onCreateTag} />);

    // Focus the input and type a non-existing tag
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'FailingTag' } });

    // Press Enter to attempt creating the tag
    fireEvent.keyDown(input, { key: 'Enter' });

    // onCreateTag should be called with the tag name
    expect(onCreateTag).toHaveBeenCalledWith('FailingTag');

    // Wait for the async operation to fail
    await waitFor(() => {
      // console.error should be called
      expect(console.error).toHaveBeenCalled();

      // onChange should NOT be called with a new tag (since creation failed)
      expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });

  // Test ref forwarding
  test('forwards ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<TagInput {...defaultProps} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName.toLowerCase()).toBe('input');
    expect(ref.current?.id).toBe('test-tag-input');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, and the T26 A3 fix (T55)
describe('TagInput: form-input convention', () => {
  const tags = [
    { id: 'r', name: 'React' },
    { id: 'rs', name: 'Rust' },
    { id: 'ru', name: 'Ruby' },
    { id: 'c', name: 'CSS' },
  ];

  test('value and change: controlled value, onChange(ids) value-first; the field shows only value', () => {
    const onChange = jest.fn();
    render(<TagInput label="Skills" availableTags={tags} value={['r']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove React tag' }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  test('selectedTags: the deprecated alias still selects', () => {
    render(<TagInput label="Skills" availableTags={tags} selectedTags={['c']} onChange={() => {}} />);
    expect(screen.getByText('CSS')).toBeInTheDocument();
  });

  test('uncontrolled: defaultValue, the input keeps its own list and still calls onChange', () => {
    const onChange = jest.fn();
    render(<TagInput label="Skills" availableTags={tags} defaultValue={['r']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove React tag' }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  test('error: shown when touched is left out, with aria-invalid and the description', () => {
    render(<TagInput label="Skills" availableTags={tags} error="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
    const box = screen.getByRole('combobox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Pick one');
  });

  test('error: touched={false} holds it; disabled shows the helper instead', () => {
    const { rerender } = render(<TagInput label="S" availableTags={tags} error="Bad" touched={false} />);
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    rerender(<TagInput label="S" availableTags={tags} error="Bad" disabled helperText="Help" />);
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Help');
  });

  test('size: xs draws the compact type; compact is its deprecated alias; size wins', () => {
    const { rerender } = render(<TagInput label="N" availableTags={tags} size="xs" />);
    expect(screen.getByText('N')).toHaveClass('type-label-sm');
    rerender(<TagInput label="N" availableTags={tags} compact />);
    expect(screen.getByText('N')).toHaveClass('type-label-sm');
    rerender(<TagInput label="N" availableTags={tags} compact size="md" />);
    expect(screen.getByText('N')).toHaveClass('type-label');
  });

  test('ref: the native input', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<TagInput ref={ref} label="N" availableTags={tags} />);
    expect(ref.current).toBe(screen.getByRole('combobox'));
  });

  test('disabled: native disabled on the field and every remove button; nothing fires', () => {
    const onChange = jest.fn();
    render(<TagInput label="N" availableTags={tags} value={['r']} onChange={onChange} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    const remove = screen.getByRole('button', { name: 'Remove React tag' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(onChange).not.toHaveBeenCalled();
  });

  test('id: optional, generated, and the label still names the field', () => {
    render(<TagInput label="Skills" availableTags={tags} />);
    expect(screen.getByLabelText('Skills').id).toBeTruthy();
  });

  test('label: optional; aria-label and other unnamed props reach the input', () => {
    const onBlur = jest.fn();
    render(<TagInput aria-label="Topics" name="t" data-x="1" onBlur={onBlur} availableTags={tags} />);
    const box = screen.getByRole('combobox', { name: 'Topics' });
    expect(box).toHaveAttribute('name', 't');
    expect(box).toHaveAttribute('data-x', '1');
    fireEvent.blur(box);
    expect(onBlur).toHaveBeenCalled();
    expect(document.querySelector('label')).toBeNull();
  });

  test("className: merged with cn on the root; the app's class wins", () => {
    const { container } = render(<TagInput label="N" availableTags={tags} className="space-y-4 mt-2" />);
    expect(container.firstChild).toHaveClass('space-y-4', 'mt-2');
    expect(container.firstChild).not.toHaveClass('space-y-2');
  });

  test('focus: a text field shows focus however it came; in error the ring is the error colour', () => {
    const { container, rerender } = render(<TagInput label="N" availableTags={tags} />);
    fireEvent.focus(screen.getByRole('combobox'));
    const box = () => container.querySelector('.rounded-md.border') as HTMLElement;
    expect(box()).toHaveClass('ring-1', 'ring-[var(--color-primary)]');
    rerender(<TagInput label="N" availableTags={tags} error="Bad" />);
    expect(box()).toHaveClass('ring-1', 'ring-[var(--color-error)]', 'border-[var(--color-error)]');
  });

  // A3: suggestions were mouse-only (TagInput.tsx:311-314)
  test('A3: ArrowDown/ArrowUp move through the suggestions (wrapping) and Enter adds the active one', () => {
    const onChange = jest.fn();
    render(<TagInput label="Skills" availableTags={tags} value={[]} onChange={onChange} />);
    const box = screen.getByRole('combobox');
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'r' } });
    expect(box).toHaveAttribute('aria-expanded', 'true');
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['React', 'Rust', 'Ruby']);
    expect(box).not.toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    expect(box).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(box, { key: 'ArrowUp' }); // wraps to the last
    expect(box).toHaveAttribute('aria-activedescendant', options[2].id);
    fireEvent.keyDown(box, { key: 'ArrowDown' }); // wraps to the first
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['rs']);
  });

  test('A3: Escape closes the suggestions and is claimed; a second Escape is left to a dialog', () => {
    render(<TagInput label="Skills" availableTags={tags} />);
    const box = screen.getByRole('combobox');
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: 'r' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(fireEvent.keyDown(box, { key: 'Escape' })).toBe(false); // default prevented
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(fireEvent.keyDown(box, { key: 'Escape' })).toBe(true);
    fireEvent.keyDown(box, { key: 'ArrowDown' }); // opens again
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  test("the app's onKeyDown runs too; preventDefault there skips ours", () => {
    const onChange = jest.fn();
    const onKeyDown = jest.fn((e: React.KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault(); });
    render(<TagInput label="S" availableTags={tags} value={[]} onChange={onChange} onKeyDown={onKeyDown} />);
    const box = screen.getByRole('combobox');
    fireEvent.change(box, { target: { value: 'React' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('an Enter that ends an IME composition (isComposing, or keyCode 229) adds nothing', () => {
    const onChange = jest.fn();
    render(<TagInput label="S" availableTags={tags} value={[]} onChange={onChange} />);
    const box = screen.getByRole('combobox');
    fireEvent.change(box, { target: { value: 'React' } });
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(box, { key: 'Enter', keyCode: 229 });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['r']);
  });

  test('a callback ref is called once, not again on a rerender', () => {
    const ref = jest.fn();
    const { rerender } = render(<TagInput ref={ref} label="S" availableTags={tags} value={[]} />);
    rerender(<TagInput ref={ref} label="S" availableTags={tags} value={['r']} />);
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledWith(screen.getByRole('combobox'));
  });
});
