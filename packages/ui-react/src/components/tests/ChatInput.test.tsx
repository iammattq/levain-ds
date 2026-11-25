import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '../ChatInput';

// Mock lucide-react icons - ArrowUp is used for submit button
jest.mock('lucide-react', () => ({
  ArrowUp: ({ className }: { className?: string }) => (
    <svg data-testid="arrow-up-icon" className={className}>
      <path />
    </svg>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader2-icon" className={className}>
      <circle />
    </svg>
  ),
}));

describe('ChatInput Component', () => {
  // Define common props for testing
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test basic rendering
  describe('Rendering', () => {
    test('renders textarea and submit button', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeInTheDocument();
      expect(screen.getByTestId('arrow-up-icon')).toBeInTheDocument();
    });

    test('renders with placeholder text', () => {
      const placeholder = 'Type a message...';
      render(<ChatInput {...defaultProps} placeholder={placeholder} />);

      const textarea = screen.getByPlaceholderText(placeholder);
      expect(textarea).toBeInTheDocument();
    });

    test('applies custom className to container', () => {
      const { container } = render(
        <ChatInput {...defaultProps} className="custom-class" />
      );

      // T55: className is on the root, a wrapper around the bordered box (so a label or error can sit around it)
      expect(container.firstChild).toHaveClass('custom-class');
      expect(container.firstChild?.firstChild).toHaveClass('flex');
      expect(container.firstChild?.firstChild).toHaveClass('flex-col');
    });

    test('applies custom id when provided', () => {
      render(<ChatInput {...defaultProps} id="custom-id" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id', 'custom-id');
    });

    test('generates id automatically when not provided', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('id');
      expect(textarea.getAttribute('id')).toBeTruthy();
    });
  });

  // Test controlled value and onChange
  describe('Controlled Input', () => {
    test('displays the provided value', () => {
      const value = 'Test message';
      render(<ChatInput {...defaultProps} value={value} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(value);
    });

    test('calls onChange when textarea value changes', () => {
      const onChange = jest.fn();
      render(<ChatInput {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      expect(onChange).toHaveBeenCalledTimes(1);
      // onChange is called with the React change event
      expect(onChange).toHaveBeenCalledWith(expect.any(Object));
    });

    test('updates displayed value when controlled value changes', () => {
      const { rerender } = render(
        <ChatInput {...defaultProps} value="First" />
      );

      let textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('First');

      rerender(<ChatInput {...defaultProps} value="Second" />);
      textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Second');
    });
  });

  // Test submit behavior
  describe('Submit Behavior', () => {
    test('calls onSubmit when submit button is clicked', () => {
      const onSubmit = jest.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    test('calls onSubmit when Enter key is pressed', () => {
      const onSubmit = jest.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    test('does not call onSubmit when Shift+Enter is pressed', () => {
      const onSubmit = jest.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    // Note: Testing preventDefault is difficult with fireEvent
    // The important behavior is that onSubmit is called, which we test above
    test('Enter key triggers submit (implicit preventDefault)', () => {
      const onSubmit = jest.fn();
      render(<ChatInput {...defaultProps} value="Hello" onSubmit={onSubmit} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        shiftKey: false,
      });

      // If preventDefault wasn't called, a form submission would occur
      // Testing that onSubmit is called verifies the handler works correctly
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    test('does not call onSubmit when value is empty', () => {
      const onSubmit = jest.fn();
      render(<ChatInput {...defaultProps} value="" onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('does not call onSubmit when value is only whitespace', () => {
      const onSubmit = jest.fn();
      render(<ChatInput {...defaultProps} value="   " onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // Test disabled and loading states
  describe('Disabled State', () => {
    test('disables textarea when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    test('disables submit button when disabled prop is true', () => {
      render(<ChatInput {...defaultProps} value="Hello" disabled />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    test('does not call onSubmit when disabled and button is clicked', () => {
      const onSubmit = jest.fn();
      render(
        <ChatInput
          {...defaultProps}
          value="Hello"
          disabled
          onSubmit={onSubmit}
        />
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('does not call onSubmit when disabled and Enter is pressed', () => {
      const onSubmit = jest.fn();
      render(
        <ChatInput
          {...defaultProps}
          value="Hello"
          disabled
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('applies disabled styling to textarea', () => {
      render(<ChatInput {...defaultProps} disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('cursor-not-allowed');
      expect(textarea).toHaveClass('text-[var(--color-text-disabled)]');
    });
  });

  describe('Loading State', () => {
    test('disables textarea when loading prop is true', () => {
      render(<ChatInput {...defaultProps} loading />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    test('disables submit button when loading prop is true', () => {
      render(<ChatInput {...defaultProps} value="Hello" loading />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    test('does not call onSubmit when loading and button is clicked', () => {
      const onSubmit = jest.fn();
      render(
        <ChatInput
          {...defaultProps}
          value="Hello"
          loading
          onSubmit={onSubmit}
        />
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('does not call onSubmit when loading and Enter is pressed', () => {
      const onSubmit = jest.fn();
      render(
        <ChatInput
          {...defaultProps}
          value="Hello"
          loading
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // Test maxLength and character counter
  describe('Character Counter', () => {
    test('shows character counter when maxLength is provided', () => {
      render(<ChatInput {...defaultProps} value="Hello" maxLength={100} />);

      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    test('does not show character counter when maxLength is not provided', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
    });

    test('updates character counter as value changes', () => {
      const { rerender } = render(
        <ChatInput {...defaultProps} value="Hello" maxLength={100} />
      );

      expect(screen.getByText('5/100')).toBeInTheDocument();

      rerender(
        <ChatInput {...defaultProps} value="Hello World" maxLength={100} />
      );
      expect(screen.getByText('11/100')).toBeInTheDocument();
    });

    test('applies error styling when over maxLength', () => {
      const longValue = 'A'.repeat(101);
      render(<ChatInput {...defaultProps} value={longValue} maxLength={100} />);

      const counter = screen.getByText('101/100');
      expect(counter).toHaveClass('text-[var(--color-error)]');
    });

    test('applies faint styling when within maxLength', () => {
      render(<ChatInput {...defaultProps} value="Hello" maxLength={100} />);

      const counter = screen.getByText('5/100');
      expect(counter).toHaveClass('type-label-compact');
      expect(counter).toHaveClass('text-[var(--color-text-faint)]');
    });

    test('applies error border styling to container when over maxLength', () => {
      const longValue = 'A'.repeat(101);
      const { container } = render(
        <ChatInput {...defaultProps} value={longValue} maxLength={100} />
      );

      // Border is on the box, not the textarea (chromeless textarea design)
      expect(container.firstChild?.firstChild).toHaveClass('border-[var(--color-error)]');
    });

    test('disables submit button when over maxLength', () => {
      const longValue = 'A'.repeat(101);
      render(<ChatInput {...defaultProps} value={longValue} maxLength={100} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    test('does not call onSubmit when over maxLength and button is clicked', () => {
      const onSubmit = jest.fn();
      const longValue = 'A'.repeat(101);
      render(
        <ChatInput
          {...defaultProps}
          value={longValue}
          maxLength={100}
          onSubmit={onSubmit}
        />
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(onSubmit).not.toHaveBeenCalled();
    });

    // T55: Enter used to skip the over-limit test the button makes
    test('does not call onSubmit when over maxLength and Enter is pressed', () => {
      const onSubmit = jest.fn();
      const longValue = 'A'.repeat(101);
      render(
        <ChatInput
          {...defaultProps}
          value={longValue}
          maxLength={100}
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // Test auto-grow behavior
  describe('Auto-grow Behavior', () => {
    test('textarea has minimum height set', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveStyle({ minHeight: '36px' });
    });

    test('textarea starts with rows="1"', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '1');
    });

    test('textarea has resize disabled via inline style', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveStyle({ resize: 'none' });
    });

    // Note: Testing actual height changes requires mocking scrollHeight
    // which is difficult in JSDOM. This test verifies the structure is correct.
    test('textarea has auto-grow styling setup', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('block');
      expect(textarea).toHaveClass('w-full');
      expect(textarea).toHaveStyle({ minHeight: '36px' });
    });
  });

  // Test accessibility
  describe('Accessibility', () => {
    test('textarea has aria-label from placeholder', () => {
      const placeholder = 'Type your message';
      render(<ChatInput {...defaultProps} placeholder={placeholder} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', placeholder);
    });

    test('submit button has aria-label', () => {
      render(<ChatInput {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveAttribute('aria-label', 'Submit');
    });

    test('submit button uses custom submitLabel for aria-label', () => {
      const submitLabel = 'Send message';
      render(<ChatInput {...defaultProps} submitLabel={submitLabel} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveAttribute('aria-label', submitLabel);
    });

    test('textarea is keyboard accessible', () => {
      render(<ChatInput {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      textarea.focus();
      expect(textarea).toHaveFocus();
    });

    test('submit button is keyboard accessible', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      const submitButton = screen.getByRole('button');
      submitButton.focus();
      expect(submitButton).toHaveFocus();
    });
  });

  // Test submit button states
  describe('Submit Button States', () => {
    test('submit button is disabled when value is empty', () => {
      render(<ChatInput {...defaultProps} value="" />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    test('submit button is enabled when value has text', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).not.toBeDisabled();
    });

    test('submit button is disabled when value is only whitespace', () => {
      render(<ChatInput {...defaultProps} value="   " />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    test('submit button uses primary variant', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveClass('bg-[var(--color-primary)]');
    });

    test('submit button uses xs size for icon-only (h-5 w-5)', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveClass('h-5');
      expect(submitButton).toHaveClass('w-5');
    });

    test('submit button is icon-only', () => {
      render(<ChatInput {...defaultProps} value="Hello" />);

      const submitButton = screen.getByRole('button');
      expect(screen.getByTestId('arrow-up-icon')).toBeInTheDocument();
      expect(submitButton.textContent).toBe('');
    });
  });

  // Test ref forwarding
  describe('Ref Forwarding', () => {
    test('forwards ref to textarea element', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<ChatInput {...defaultProps} ref={ref} />);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName.toLowerCase()).toBe('textarea');
    });

    test('ref can be used to focus textarea', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<ChatInput {...defaultProps} ref={ref} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  // Test additional HTML attributes
  describe('Additional Attributes', () => {
    test('passes through additional HTML attributes to textarea', () => {
      render(
        <ChatInput
          {...defaultProps}
          data-testid="custom-textarea"
          autoComplete="off"
        />
      );

      const textarea = screen.getByTestId('custom-textarea');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('autocomplete', 'off');
    });

    test('applies maxLength attribute to textarea', () => {
      render(<ChatInput {...defaultProps} maxLength={100} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxLength', '100');
    });
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point, and the T26 A3 fixes (T55)
describe('ChatInput: form-input convention', () => {
  test('value and change: controlled, the native onChange(event); onSubmit gets the text', () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    render(<ChatInput value="hi" onChange={onChange} onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox');
    fireEvent.change(box, { target: { value: 'hiya' } });
    expect(onChange.mock.calls[0][0].target).toBe(box);
    expect(box).toHaveValue('hi');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('hi');
  });

  test('uncontrolled: defaultValue, it keeps what is typed, submits it and clears', () => {
    const onSubmit = jest.fn();
    render(<ChatInput defaultValue="a" onSubmit={onSubmit} maxLength={10} />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveValue('a');
    fireEvent.change(box, { target: { value: 'abc' } });
    expect(box).toHaveValue('abc');
    expect(screen.getByText('3/10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith('abc');
    expect(box).toHaveValue('');
  });

  test('error: shown when touched is left out, with aria-invalid, the description and the error border', () => {
    const { container } = render(<ChatInput value="" onSubmit={jest.fn()} label="Prompt" error="Too vague" />);
    expect(screen.getByText('Too vague')).toBeInTheDocument();
    const box = screen.getByRole('textbox', { name: 'Prompt' });
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Too vague');
    expect(container.querySelector('.rounded-md.border')).toHaveClass('border-[var(--color-error)]');
  });

  test('error: touched={false} holds it; disabled shows the helper instead', () => {
    const { rerender } = render(<ChatInput value="" onSubmit={jest.fn()} error="Bad" touched={false} helperText="Help" />);
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('Help');
    rerender(<ChatInput value="" onSubmit={jest.fn()} error="Bad" disabled helperText="Help" />);
    expect(screen.queryByText('Bad')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  test('an error appearing keeps the same field (no remount, focus stays)', () => {
    const { rerender } = render(<ChatInput value="" onSubmit={jest.fn()} />);
    const box = screen.getByRole('textbox');
    box.focus();
    rerender(<ChatInput value="" onSubmit={jest.fn()} error="Bad" />);
    expect(screen.getByRole('textbox')).toBe(box);
    expect(box).toHaveFocus();
  });

  test('ref: the native textarea', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<ChatInput ref={ref} value="" onSubmit={jest.fn()} />);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  // A3: a callback ref replaced the internal one and auto-resize stopped (ChatInput.tsx:59)
  test('A3: a callback ref gets the textarea and auto-resize still runs', () => {
    let got: HTMLTextAreaElement | null = null;
    const { rerender } = render(<ChatInput ref={(n) => { got = n; }} value="" onSubmit={jest.fn()} />);
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(got).toBe(box);
    Object.defineProperty(box, 'scrollHeight', { configurable: true, value: 64 });
    rerender(<ChatInput ref={(n) => { got = n; }} value={'one\ntwo\nthree'} onSubmit={jest.fn()} />);
    expect(box.style.height).toBe('64px');
  });

  test('disabled: native disabled; nothing submits', () => {
    const onSubmit = jest.fn();
    render(<ChatInput value="hi" onSubmit={onSubmit} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('id: optional, generated, and the label names the field (the placeholder no longer does)', () => {
    render(<ChatInput value="" onSubmit={jest.fn()} label="Prompt" placeholder="Ask..." />);
    const box = screen.getByLabelText('Prompt');
    expect(box.id).toBeTruthy();
    expect(box).not.toHaveAttribute('aria-label');
  });

  test('aria-label and other unnamed props reach the textarea', () => {
    render(<ChatInput value="" onSubmit={jest.fn()} aria-label="Message" name="m" data-x="1" />);
    const box = screen.getByRole('textbox', { name: 'Message' });
    expect(box).toHaveAttribute('name', 'm');
    expect(box).toHaveAttribute('data-x', '1');
  });

  test("className: merged with cn on the root; the app's class wins", () => {
    const { container } = render(<ChatInput value="" onSubmit={jest.fn()} className="mt-2 mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
    expect(container.firstChild).not.toHaveClass('mt-2');
  });

  test('focus: a text field shows focus however it came; in error the ring is the error colour', () => {
    const { container, rerender } = render(<ChatInput value="" onSubmit={jest.fn()} />);
    fireEvent.focus(screen.getByRole('textbox'));
    const frame = () => container.querySelector('.rounded-md.border') as HTMLElement;
    expect(frame()).toHaveClass('ring-1', 'ring-[var(--color-primary)]');
    rerender(<ChatInput value="" onSubmit={jest.fn()} error="Bad" />);
    expect(frame()).toHaveClass('ring-1', 'ring-[var(--color-error)]');
  });

  // A3: an app's onKeyDown replaced Enter-to-submit (ChatInput.tsx:136)
  test("A3: the app's onKeyDown, onFocus and onBlur run and ours still do", () => {
    const onSubmit = jest.fn();
    const onKeyDown = jest.fn();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const { container } = render(<ChatInput value="hi" onSubmit={onSubmit} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} />);
    const box = screen.getByRole('textbox');
    fireEvent.focus(box);
    expect(onFocus).toHaveBeenCalled();
    expect(container.querySelector('.rounded-md.border')).toHaveClass('ring-[var(--color-primary)]');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith('hi');
    fireEvent.blur(box);
    expect(onBlur).toHaveBeenCalled();
  });

  test("preventDefault in the app's onKeyDown skips Enter-to-submit", () => {
    const onSubmit = jest.fn();
    render(<ChatInput value="hi" onSubmit={onSubmit} onKeyDown={(e) => e.preventDefault()} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // A3: Enter during IME composition submitted (ChatInput.tsx:82)
  test('A3: an Enter that ends an IME composition does not submit', () => {
    const onSubmit = jest.fn();
    render(<ChatInput value="にほん" onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox');
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(box, { key: 'Enter', keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
