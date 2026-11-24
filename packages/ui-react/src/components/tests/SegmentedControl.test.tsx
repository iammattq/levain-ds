import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import SegmentedControl from '../SegmentedControl';

describe('SegmentedControl', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  test('renders all options', () => {
    render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={() => {}}
      />
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  test('sets aria-checked on the radios', () => {
    render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option2"
        onChange={() => {}}
      />
    );

    const option1 = screen.getByText('Option 1').closest('button');
    const option2 = screen.getByText('Option 2').closest('button');
    const option3 = screen.getByText('Option 3').closest('button');

    expect(option1).toHaveAttribute('aria-checked', 'false');
    expect(option2).toHaveAttribute('aria-checked', 'true');
    expect(option3).toHaveAttribute('aria-checked', 'false');
  });

  test('calls onChange when an option is clicked', () => {
    const handleChange = jest.fn();
    render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByText('Option 3'));
    expect(handleChange).toHaveBeenCalledWith('option3');
  });

  test('renders with a label when provided', () => {
    render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={() => {}}
        label="Test Label"
      />
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  test('disables individual options', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2', disabled: true },
      { value: 'option3', label: 'Option 3' },
    ];

    const handleChange = jest.fn();
    render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={handleChange}
      />
    );

    const option2 = screen.getByText('Option 2').closest('button');
    expect(option2).toBeDisabled();

    fireEvent.click(screen.getByText('Option 2'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  test('disables the entire control', () => {
    const handleChange = jest.fn();
    render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={handleChange}
        disabled
      />
    );

    const buttons = screen.getAllByRole('radio');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    fireEvent.click(screen.getByText('Option 2'));
    expect(handleChange).not.toHaveBeenCalled();
  });

  test('applies size classes correctly', () => {
    const { rerender } = render(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={() => {}}
        size="sm"
      />
    );

    let option1 = screen.getByText('Option 1').closest('button');
    expect(option1).toHaveClass('type-label-sm h-8 px-3');

    rerender(
      <SegmentedControl
        id="test-segmented-control"
        options={options}
        value="option1"
        onChange={() => {}}
        size="lg"
      />
    );

    option1 = screen.getByText('Option 1').closest('button');
    expect(option1).toHaveClass('type-body h-12 px-6');
  });
});

// The form-input convention (docs/prop-conventions.json, formInputs), point by point (T35)
describe('SegmentedControl: form-input convention', () => {
  const opts = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B', disabled: true },
    { value: 'c', label: 'C' },
    { value: 'd', label: 'D' },
  ];

  test('a radiogroup named by its label (before, a <label for> pointed at a div)', () => {
    render(
      <SegmentedControl
        options={opts}
        value="a"
        onChange={() => {}}
        label="View"
      />
    );
    const group = screen.getByRole('radiogroup', { name: 'View' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
  });

  test('aria-label names it when there is no label; data-* reach the group', () => {
    render(
      <SegmentedControl options={opts} value="a" aria-label="View" data-x="1" />
    );
    expect(screen.getByRole('radiogroup', { name: 'View' })).toHaveAttribute(
      'data-x',
      '1'
    );
  });

  test('keyboard: one Tab stop, on the chosen option', async () => {
    render(
      <>
        <SegmentedControl
          options={opts}
          value="c"
          onChange={() => {}}
          aria-label="V"
        />
        <button>after</button>
      </>
    );
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });

  test('keyboard: arrows move and select, skipping disabled, wrapping; Home and End', async () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        defaultValue="a"
        onChange={onChange}
        aria-label="V"
      />
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('c');
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'D' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'D' })).toBeChecked();
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('d');
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  test('keyboard: Space and Enter choose (native buttons)', async () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        value="a"
        onChange={onChange}
        aria-label="V"
      />
    );
    screen.getByRole('radio', { name: 'D' }).focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('d');
    screen.getByRole('radio', { name: 'C' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('c');
  });

  test('the Tab stop falls to the first enabled option when nothing is chosen', () => {
    render(
      <SegmentedControl
        options={[{ value: 'x', label: 'X', disabled: true }, ...opts]}
        aria-label="V"
      />
    );
    expect(screen.getByRole('radio', { name: 'A' })).toHaveAttribute(
      'tabindex',
      '0'
    );
    expect(screen.getByRole('radio', { name: 'C' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
  });

  test('controlled: stays on value until the parent changes it', () => {
    render(
      <SegmentedControl
        options={opts}
        value="a"
        onChange={() => {}}
        aria-label="V"
      />
    );
    fireEvent.click(screen.getByRole('radio', { name: 'C' }));
    expect(screen.getByRole('radio', { name: 'A' })).toBeChecked();
  });

  test('uncontrolled: defaultValue, then its own state; onChange still fires', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        defaultValue="a"
        onChange={onChange}
        aria-label="V"
      />
    );
    fireEvent.click(screen.getByRole('radio', { name: 'D' }));
    expect(screen.getByRole('radio', { name: 'D' })).toBeChecked();
    expect(onChange).toHaveBeenCalledWith('d');
  });

  test('re-choosing the chosen option does not fire onChange', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        value="a"
        onChange={onChange}
        aria-label="V"
      />
    );
    fireEvent.click(screen.getByRole('radio', { name: 'A' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  test('ref and id: on the group', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <SegmentedControl
        ref={ref}
        id="g"
        options={opts}
        value="a"
        aria-label="V"
      />
    );
    expect(ref.current).toBe(screen.getByRole('radiogroup'));
    expect(ref.current).toHaveAttribute('id', 'g');
  });

  test('disabled: every option native-disabled, none a Tab stop', () => {
    render(
      <SegmentedControl options={opts} value="a" disabled aria-label="V" />
    );
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
    expect(screen.getByRole('radiogroup')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  test('focus: an inset keyboard ring (the group clips outside it)', () => {
    render(<SegmentedControl options={opts} value="a" aria-label="V" />);
    expect(screen.getByRole('radio', { name: 'A' })).toHaveClass(
      'focus-visible:ring-2',
      'focus-visible:ring-inset',
      'focus-visible:ring-[var(--color-border-focus)]'
    );
  });

  test("the app's onKeyDown runs first and can stop the arrows", async () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={opts}
        value="a"
        onChange={onChange}
        aria-label="V"
        onKeyDown={(e) => e.preventDefault()}
      />
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
