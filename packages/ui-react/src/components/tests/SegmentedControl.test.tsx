import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
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

  test('sets aria-pressed attribute correctly', () => {
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

    expect(option1).toHaveAttribute('aria-pressed', 'false');
    expect(option2).toHaveAttribute('aria-pressed', 'true');
    expect(option3).toHaveAttribute('aria-pressed', 'false');
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

    const buttons = screen.getAllByRole('button');
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
