import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TokenSelect, {
  getTokensForCategory,
  TokenCategory,
  TokenOption,
} from '../TokenSelect';

// Mock createPortal for testing
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

// Mock scrollIntoView - not available in JSDOM
Element.prototype.scrollIntoView = jest.fn();

describe('TokenSelect Pattern', () => {
  const defaultProps = {
    id: 'test-select',
    label: 'Test Label',
    value: '5',
    onChange: jest.fn(),
    tokenCategory: 'surface-ramp' as TokenCategory,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTokensForCategory utility', () => {
    test('returns 26 options (0-25) for surface-ramp category', () => {
      const tokens = getTokensForCategory('surface-ramp');
      expect(tokens).toHaveLength(26);
      expect(tokens[0]).toEqual({
        value: '0',
        label: '0',
        cssVar: 'var(--color-surface-0)',
      });
      expect(tokens[25]).toEqual({
        value: '25',
        label: '25',
        cssVar: 'var(--color-surface-25)',
      });
    });

    test('returns correct options for surface-semantic category', () => {
      const tokens = getTokensForCategory('surface-semantic');
      expect(tokens).toHaveLength(8);
      expect(tokens.map((t) => t.value)).toEqual([
        'canvas',
        'section',
        'card',
        'component',
        'subtle',
        'interactive',
        'elevated',
        'inverted',
      ]);
    });

    test('returns correct options for text category', () => {
      const tokens = getTokensForCategory('text');
      expect(tokens).toHaveLength(7);
      expect(tokens.map((t) => t.value)).toEqual([
        'emphasis',
        'default',
        'muted',
        'faint',
        'disabled',
        'inverted',
        'link',
      ]);
    });

    test('returns correct options for border category', () => {
      const tokens = getTokensForCategory('border');
      expect(tokens).toHaveLength(5);
      expect(tokens.map((t) => t.value)).toEqual([
        'subtle',
        'default',
        'emphasis',
        'focus',
        'decorative',
      ]);
    });

    test('returns correct options for brand category', () => {
      const tokens = getTokensForCategory('brand');
      expect(tokens).toHaveLength(2);
      expect(tokens.map((t) => t.value)).toEqual(['primary', 'accent']);
    });

    test('returns correct options for action-success category', () => {
      const tokens = getTokensForCategory('action-success');
      expect(tokens).toHaveLength(3);
      expect(tokens.map((t) => t.value)).toEqual(['base', 'fg', 'bg']);
    });

    test('returns correct options for action-error category', () => {
      const tokens = getTokensForCategory('action-error');
      expect(tokens).toHaveLength(3);
      expect(tokens.map((t) => t.value)).toEqual(['base', 'fg', 'bg']);
    });

    test('returns correct options for action-caution category', () => {
      const tokens = getTokensForCategory('action-caution');
      expect(tokens).toHaveLength(3);
      expect(tokens.map((t) => t.value)).toEqual(['base', 'fg', 'bg']);
    });

    test('returns correct options for action-info category', () => {
      const tokens = getTokensForCategory('action-info');
      expect(tokens).toHaveLength(3);
      expect(tokens.map((t) => t.value)).toEqual(['base', 'fg', 'bg']);
    });

    test('returns empty array for unknown category', () => {
      // @ts-expect-error Testing invalid category
      const tokens = getTokensForCategory('unknown-category');
      expect(tokens).toEqual([]);
    });
  });

  describe('Basic Rendering', () => {
    test('renders with label and combobox button', () => {
      render(<TokenSelect {...defaultProps} />);

      const label = screen.getByText('Test Label');
      expect(label).toBeInTheDocument();
      expect(label.tagName.toLowerCase()).toBe('label');
      expect(label).toHaveAttribute('for', 'test-select');

      const button = screen.getByRole('combobox');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('id', 'test-select');
    });

    test('displays current value with color swatch', () => {
      render(<TokenSelect {...defaultProps} value="5" />);

      const button = screen.getByRole('combobox');
      expect(button).toHaveTextContent('5');

      // Check color swatch exists (has the background style)
      const swatch = button.querySelector('[aria-hidden="true"]');
      expect(swatch).toBeInTheDocument();
    });

    test('renders with custom options override', () => {
      const customOptions: TokenOption[] = [
        { value: 'custom1', label: 'Custom One', cssVar: 'var(--custom-1)' },
        { value: 'custom2', label: 'Custom Two', cssVar: 'var(--custom-2)' },
      ];
      render(
        <TokenSelect
          {...defaultProps}
          value="custom1"
          options={customOptions}
        />
      );

      const button = screen.getByRole('combobox');
      expect(button).toHaveTextContent('Custom One');
    });
  });

  describe('ARIA Attributes', () => {
    test('has correct ARIA attributes when closed', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-controls', 'test-select-listbox');
    });

    test('has correct ARIA attributes when open', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute(
        'aria-activedescendant',
        expect.stringContaining('test-select-option-')
      );
    });

    test('sets aria-invalid when error and touched', () => {
      render(
        <TokenSelect
          {...defaultProps}
          error="This is an error"
          touched={true}
        />
      );

      const button = screen.getByRole('combobox');
      expect(button).toHaveAttribute('aria-invalid', 'true');
    });

    test('sets aria-describedby for error', () => {
      render(
        <TokenSelect
          {...defaultProps}
          error="This is an error"
          touched={true}
        />
      );

      const button = screen.getByRole('combobox');
      expect(button).toHaveAttribute('aria-describedby', 'test-select-error');
    });

    test('sets aria-describedby for helper text', () => {
      render(<TokenSelect {...defaultProps} helperText="Helper text here" />);

      const button = screen.getByRole('combobox');
      expect(button).toHaveAttribute('aria-describedby', 'test-select-helper');
    });
  });

  describe('Dropdown Interaction', () => {
    test('opens dropdown on click', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    test('closes dropdown on second click', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('renders all options in dropdown', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(26); // surface-ramp has 26 options (0-25)
    });

    test('selects option on click and closes dropdown', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      const options = screen.getAllByRole('option');
      fireEvent.click(options[10]); // Click option with value "10"

      expect(onChange).toHaveBeenCalledWith('10');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('calls onBlur when dropdown closes', () => {
      const onBlur = jest.fn();
      render(<TokenSelect {...defaultProps} onBlur={onBlur} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);
      fireEvent.click(button); // Close

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    test('opens dropdown on ArrowDown key', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('opens dropdown on ArrowUp key', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.keyDown(button, { key: 'ArrowUp' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('opens dropdown on Space key', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.keyDown(button, { key: ' ' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('opens dropdown on Enter key', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('navigates down with ArrowDown', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="5" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      expect(onChange).toHaveBeenCalledWith('6');
    });

    test('navigates up with ArrowUp', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="5" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: 'ArrowUp' });

      expect(onChange).toHaveBeenCalledWith('4');
    });

    test('jumps to first option with Home key', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="10" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: 'Home' });

      expect(onChange).toHaveBeenCalledWith('0');
    });

    test('jumps to last option with End key', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="10" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: 'End' });

      expect(onChange).toHaveBeenCalledWith('25');
    });

    test('closes dropdown on Enter key when open', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('closes dropdown on Escape key', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(button, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('closes dropdown on Tab key', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(button, { key: 'Tab' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('does not go below 0 on ArrowUp', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="0" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: 'ArrowUp' });

      expect(onChange).toHaveBeenCalledWith('0'); // Stays at 0
    });

    test('does not go above max on ArrowDown', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="25" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      expect(onChange).toHaveBeenCalledWith('25'); // Stays at 25
    });
  });

  describe('Type-ahead for surface-ramp', () => {
    test('jumps to single digit on number key press', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="0" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: '5' });

      expect(onChange).toHaveBeenCalledWith('5');
    });

    test('combines digits for two-digit numbers', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="1" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: '5' }); // Should type "15"

      expect(onChange).toHaveBeenCalledWith('15');
    });

    test('does not exceed 25 on combined digits', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} value="3" onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: '7' }); // "37" > 25, should just be "7"

      expect(onChange).toHaveBeenCalledWith('7');
    });

    test('does not apply type-ahead for non-surface-ramp categories', () => {
      const onChange = jest.fn();
      render(
        <TokenSelect
          {...defaultProps}
          tokenCategory="text"
          value="emphasis"
          onChange={onChange}
        />
      );

      const button = screen.getByRole('combobox');
      fireEvent.click(button); // Open
      fireEvent.keyDown(button, { key: '5' });

      // Should not have called onChange with a number
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    test('does not open dropdown when disabled', () => {
      render(<TokenSelect {...defaultProps} disabled />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('has disabled attribute on button', () => {
      render(<TokenSelect {...defaultProps} disabled />);

      const button = screen.getByRole('combobox');
      expect(button).toBeDisabled();
    });

    test('applies disabled label styling', () => {
      render(<TokenSelect {...defaultProps} disabled />);

      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('text-[var(--color-text-disabled)]');
    });

    test('ignores keyboard navigation when disabled', () => {
      const onChange = jest.fn();
      render(<TokenSelect {...defaultProps} disabled onChange={onChange} />);

      const button = screen.getByRole('combobox');
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Required State', () => {
    test('shows required indicator asterisk', () => {
      render(<TokenSelect {...defaultProps} required />);

      const asterisk = screen.getByText('*');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveClass('text-[var(--color-error)]');
    });
  });

  describe('Error State', () => {
    test('shows error message when touched and has error', () => {
      render(
        <TokenSelect
          {...defaultProps}
          error="Selection required"
          touched={true}
        />
      );

      const errorMessage = screen.getByText('Selection required');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-[var(--color-error)]');
    });

    test('does not show error message when not touched', () => {
      render(
        <TokenSelect
          {...defaultProps}
          error="Selection required"
          touched={false}
        />
      );

      expect(screen.queryByText('Selection required')).not.toBeInTheDocument();
    });

    test('does not show error when disabled', () => {
      render(
        <TokenSelect
          {...defaultProps}
          error="Selection required"
          touched={true}
          disabled
        />
      );

      expect(screen.queryByText('Selection required')).not.toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    test('displays helper text', () => {
      render(
        <TokenSelect {...defaultProps} helperText="Pick a surface color" />
      );

      const helperText = screen.getByText('Pick a surface color');
      expect(helperText).toBeInTheDocument();
      expect(helperText).toHaveClass('type-caption');
    });

    test('hides helper text when error is shown', () => {
      render(
        <TokenSelect
          {...defaultProps}
          helperText="Pick a surface color"
          error="Selection required"
          touched={true}
        />
      );

      expect(
        screen.queryByText('Pick a surface color')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Selection required')).toBeInTheDocument();
    });

    test('shows helper text when disabled even with error', () => {
      render(
        <TokenSelect
          {...defaultProps}
          helperText="Pick a surface color"
          error="Selection required"
          touched={true}
          disabled
        />
      );

      expect(screen.getByText('Pick a surface color')).toBeInTheDocument();
      expect(screen.queryByText('Selection required')).not.toBeInTheDocument();
    });

    test('helper text has disabled styling when disabled', () => {
      render(
        <TokenSelect
          {...defaultProps}
          helperText="Pick a surface color"
          disabled
        />
      );

      const helperText = screen.getByText('Pick a surface color');
      expect(helperText).toHaveClass('text-[var(--color-text-disabled)]');
    });
  });

  describe('Compact Mode', () => {
    test('applies compact label styling', () => {
      render(<TokenSelect {...defaultProps} compact />);

      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('type-label-sm');
      expect(label).toHaveClass('text-[var(--color-text-default)]');
    });

    test('uses default label styling when not compact', () => {
      render(<TokenSelect {...defaultProps} />);

      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('type-label');
      expect(label).toHaveClass('text-[var(--color-text-default)]');
    });
  });

  describe('Custom className', () => {
    test('applies custom className to container', () => {
      const { container } = render(
        <TokenSelect {...defaultProps} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Ref Forwarding', () => {
    test('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<TokenSelect {...defaultProps} ref={ref} />);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName.toLowerCase()).toBe('button');
      expect(ref.current?.id).toBe('test-select');
    });

    test('works with callback ref', () => {
      let buttonEl: HTMLButtonElement | null = null;
      const callbackRef = (el: HTMLButtonElement | null) => {
        buttonEl = el;
      };

      render(<TokenSelect {...defaultProps} ref={callbackRef} />);

      expect(buttonEl).not.toBeNull();
      expect(buttonEl?.id).toBe('test-select');
    });
  });

  describe('Outside Click', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('closes dropdown on outside click', async () => {
      render(
        <div>
          <TokenSelect {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      const button = screen.getByRole('combobox');
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Advance timers to allow the setTimeout(0) in the event listener setup
      jest.advanceTimersByTime(10);

      // Simulate outside click
      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Option Selection Display', () => {
    test('shows aria-selected on selected option', () => {
      render(<TokenSelect {...defaultProps} value="5" />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveTextContent('5');
    });

    test('highlights focused option', () => {
      render(<TokenSelect {...defaultProps} value="5" />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      // The focused option should have highlighting class
      const options = screen.getAllByRole('option');
      expect(options[5]).toHaveClass('bg-[var(--color-surface-section)]');
    });
  });

  describe('Display Name', () => {
    test('has correct displayName', () => {
      expect(TokenSelect.displayName).toBe('TokenSelect');
    });
  });

  describe('Dropdown Positioning', () => {
    test('dropdown has fixed positioning styles', () => {
      render(<TokenSelect {...defaultProps} />);

      const button = screen.getByRole('combobox');
      fireEvent.click(button);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveStyle({ position: 'fixed' });
    });
  });

  describe('Edge Cases', () => {
    test('handles value not in options gracefully', () => {
      render(<TokenSelect {...defaultProps} value="999" />);

      // Should fall back to first option display
      const button = screen.getByRole('combobox');
      expect(button).toHaveTextContent('0');
    });

    test('handles empty value', () => {
      render(<TokenSelect {...defaultProps} value="" />);

      const button = screen.getByRole('combobox');
      expect(button).toHaveTextContent('0'); // Falls back to first option
    });
  });
});
