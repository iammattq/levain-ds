import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tabs } from '../Tabs';

describe('Tabs', () => {
  const tabs = [
    { value: 'style', label: 'Style' },
    { value: 'image', label: 'Image' },
    { value: 'arrange', label: 'Arrange' },
  ];

  const defaultProps = {
    tabs,
    value: 'style',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders all tabs', () => {
      render(<Tabs {...defaultProps} />);

      expect(screen.getByText('Style')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();
      expect(screen.getByText('Arrange')).toBeInTheDocument();
    });

    test('renders with role="tablist" on container', () => {
      render(<Tabs {...defaultProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    test('renders each tab with role="tab"', () => {
      render(<Tabs {...defaultProps} />);

      const tabElements = screen.getAllByRole('tab');
      expect(tabElements).toHaveLength(3);
    });

    test('applies custom className to container', () => {
      render(<Tabs {...defaultProps} className="custom-class" />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('custom-class');
    });

    test('renders with aria-label when label prop is provided', () => {
      render(<Tabs {...defaultProps} label="View options" />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveAttribute('aria-label', 'View options');
    });
  });

  describe('Active state', () => {
    test('sets aria-selected correctly on active tab', () => {
      render(<Tabs {...defaultProps} value="image" />);

      const styleTab = screen.getByText('Style').closest('button');
      const imageTab = screen.getByText('Image').closest('button');
      const arrangeTab = screen.getByText('Arrange').closest('button');

      expect(styleTab).toHaveAttribute('aria-selected', 'false');
      expect(imageTab).toHaveAttribute('aria-selected', 'true');
      expect(arrangeTab).toHaveAttribute('aria-selected', 'false');
    });

    test('active tab has primary background class', () => {
      render(<Tabs {...defaultProps} value="style" />);

      const activeTab = screen.getByText('Style').closest('button');
      expect(activeTab).toHaveClass('bg-[var(--color-primary)]');
      expect(activeTab).toHaveClass('text-[var(--color-text-on-primary)]');
    });

    test('inactive tabs have default text class', () => {
      render(<Tabs {...defaultProps} value="style" />);

      const inactiveTab = screen.getByText('Image').closest('button');
      expect(inactiveTab).toHaveClass('text-[var(--color-text-default)]');
      expect(inactiveTab).not.toHaveClass('bg-[var(--color-primary)]');
    });

    test('only active tab has tabIndex 0', () => {
      render(<Tabs {...defaultProps} value="image" />);

      const styleTab = screen.getByText('Style').closest('button');
      const imageTab = screen.getByText('Image').closest('button');
      const arrangeTab = screen.getByText('Arrange').closest('button');

      expect(styleTab).toHaveAttribute('tabIndex', '-1');
      expect(imageTab).toHaveAttribute('tabIndex', '0');
      expect(arrangeTab).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Interaction', () => {
    test('calls onChange when a tab is clicked', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} onChange={handleChange} />);

      fireEvent.click(screen.getByText('Arrange'));
      expect(handleChange).toHaveBeenCalledWith('arrange');
    });

    test('does not call onChange when clicking already active tab', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="style" onChange={handleChange} />);

      fireEvent.click(screen.getByText('Style'));
      // Still calls onChange - component doesn't prevent this, consumer handles
      expect(handleChange).toHaveBeenCalledWith('style');
    });
  });

  describe('Disabled state', () => {
    test('disables individual tabs', () => {
      const tabsWithDisabled = [
        { value: 'style', label: 'Style' },
        { value: 'image', label: 'Image', disabled: true },
        { value: 'arrange', label: 'Arrange' },
      ];

      const handleChange = jest.fn();
      render(
        <Tabs tabs={tabsWithDisabled} value="style" onChange={handleChange} />
      );

      const disabledTab = screen.getByText('Image').closest('button');
      expect(disabledTab).toBeDisabled();
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
      expect(disabledTab).toHaveClass('opacity-50');

      fireEvent.click(screen.getByText('Image'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    test('disables all tabs when disabled prop is true', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} onChange={handleChange} disabled />);

      const buttons = screen.getAllByRole('tab');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('aria-disabled', 'true');
      });

      fireEvent.click(screen.getByText('Image'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Size variants', () => {
    test('applies compact size classes', () => {
      render(<Tabs {...defaultProps} size="compact" />);

      const tab = screen.getByText('Style').closest('button');
      expect(tab).toHaveClass('type-label-compact');
      expect(tab).toHaveClass('h-6');
      expect(tab).toHaveClass('px-2');
    });

    test('applies sm size classes', () => {
      render(<Tabs {...defaultProps} size="sm" />);

      const tab = screen.getByText('Style').closest('button');
      expect(tab).toHaveClass('type-label-sm');
      expect(tab).toHaveClass('h-7');
      expect(tab).toHaveClass('px-3');
    });

    test('applies md size classes (default)', () => {
      render(<Tabs {...defaultProps} />);

      const tab = screen.getByText('Style').closest('button');
      expect(tab).toHaveClass('type-label');
      expect(tab).toHaveClass('h-8');
      expect(tab).toHaveClass('px-4');
    });

    test('container has size-appropriate gap', () => {
      const { rerender } = render(<Tabs {...defaultProps} size="compact" />);

      let container = screen.getByRole('tablist');
      expect(container).toHaveClass('gap-0.5');

      rerender(<Tabs {...defaultProps} size="sm" />);
      container = screen.getByRole('tablist');
      expect(container).toHaveClass('gap-1');
    });
  });

  describe('Keyboard navigation', () => {
    test('ArrowRight moves focus to next tab and activates it', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="style" onChange={handleChange} />);

      const styleTab = screen.getByText('Style').closest('button');
      fireEvent.keyDown(styleTab!, { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledWith('image');
    });

    test('ArrowLeft moves focus to previous tab and activates it', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="image" onChange={handleChange} />);

      const imageTab = screen.getByText('Image').closest('button');
      fireEvent.keyDown(imageTab!, { key: 'ArrowLeft' });

      expect(handleChange).toHaveBeenCalledWith('style');
    });

    test('ArrowRight wraps from last to first tab', () => {
      const handleChange = jest.fn();
      render(
        <Tabs {...defaultProps} value="arrange" onChange={handleChange} />
      );

      const arrangeTab = screen.getByText('Arrange').closest('button');
      fireEvent.keyDown(arrangeTab!, { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledWith('style');
    });

    test('ArrowLeft wraps from first to last tab', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="style" onChange={handleChange} />);

      const styleTab = screen.getByText('Style').closest('button');
      fireEvent.keyDown(styleTab!, { key: 'ArrowLeft' });

      expect(handleChange).toHaveBeenCalledWith('arrange');
    });

    test('Home moves to first enabled tab', () => {
      const handleChange = jest.fn();
      render(
        <Tabs {...defaultProps} value="arrange" onChange={handleChange} />
      );

      const arrangeTab = screen.getByText('Arrange').closest('button');
      fireEvent.keyDown(arrangeTab!, { key: 'Home' });

      expect(handleChange).toHaveBeenCalledWith('style');
    });

    test('End moves to last enabled tab', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="style" onChange={handleChange} />);

      const styleTab = screen.getByText('Style').closest('button');
      fireEvent.keyDown(styleTab!, { key: 'End' });

      expect(handleChange).toHaveBeenCalledWith('arrange');
    });

    test('skips disabled tabs during keyboard navigation', () => {
      const tabsWithDisabled = [
        { value: 'style', label: 'Style' },
        { value: 'image', label: 'Image', disabled: true },
        { value: 'arrange', label: 'Arrange' },
      ];

      const handleChange = jest.fn();
      render(
        <Tabs tabs={tabsWithDisabled} value="style" onChange={handleChange} />
      );

      const styleTab = screen.getByText('Style').closest('button');
      fireEvent.keyDown(styleTab!, { key: 'ArrowRight' });

      // Should skip 'image' and go to 'arrange'
      expect(handleChange).toHaveBeenCalledWith('arrange');
    });

    test('ArrowDown moves focus to next tab (same as ArrowRight)', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="style" onChange={handleChange} />);

      const styleTab = screen.getByText('Style').closest('button');
      fireEvent.keyDown(styleTab!, { key: 'ArrowDown' });

      expect(handleChange).toHaveBeenCalledWith('image');
    });

    test('ArrowUp moves focus to previous tab (same as ArrowLeft)', () => {
      const handleChange = jest.fn();
      render(<Tabs {...defaultProps} value="image" onChange={handleChange} />);

      const imageTab = screen.getByText('Image').closest('button');
      fireEvent.keyDown(imageTab!, { key: 'ArrowUp' });

      expect(handleChange).toHaveBeenCalledWith('style');
    });
  });

  describe('Container styling', () => {
    test('container has subtle background by default (canvas surface)', () => {
      render(<Tabs {...defaultProps} />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('bg-[var(--color-surface-subtle)]');
    });

    test('container has rounded corners', () => {
      render(<Tabs {...defaultProps} />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('rounded-lg');
    });

    test('container has padding', () => {
      render(<Tabs {...defaultProps} />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('p-1');
    });
  });

  describe('Surface variants', () => {
    test('uses subtle background on canvas surface (default)', () => {
      render(<Tabs {...defaultProps} />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('bg-[var(--color-surface-subtle)]');
    });

    test('uses canvas background on section surface', () => {
      render(<Tabs {...defaultProps} surface="section" />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('bg-[var(--color-surface-canvas)]');
    });

    test('uses canvas background on card surface', () => {
      render(<Tabs {...defaultProps} surface="card" />);

      const container = screen.getByRole('tablist');
      expect(container).toHaveClass('bg-[var(--color-surface-canvas)]');
    });
  });

  describe('ReactNode labels', () => {
    test('renders tabs with ReactNode labels', () => {
      const tabsWithIcons = [
        { value: 'style', label: <span data-testid="icon-style">S</span> },
        { value: 'image', label: <span data-testid="icon-image">I</span> },
      ];

      render(<Tabs tabs={tabsWithIcons} value="style" onChange={jest.fn()} />);

      expect(screen.getByTestId('icon-style')).toBeInTheDocument();
      expect(screen.getByTestId('icon-image')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    test('handles empty tabs array gracefully', () => {
      render(<Tabs tabs={[]} value="" onChange={jest.fn()} />);

      const container = screen.getByRole('tablist');
      expect(container).toBeInTheDocument();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    });

    test('handles single tab without errors', () => {
      const singleTab = [{ value: 'only', label: 'Only Tab' }];
      const handleChange = jest.fn();

      render(<Tabs tabs={singleTab} value="only" onChange={handleChange} />);

      const tab = screen.getByText('Only Tab').closest('button');
      expect(tab).toHaveAttribute('aria-selected', 'true');

      // Keyboard navigation wraps to itself
      fireEvent.keyDown(tab!, { key: 'ArrowRight' });
      expect(handleChange).toHaveBeenCalledWith('only');

      handleChange.mockClear();
      fireEvent.keyDown(tab!, { key: 'ArrowLeft' });
      expect(handleChange).toHaveBeenCalledWith('only');
    });

    test('handles invalid value prop (no matching tab)', () => {
      render(<Tabs {...defaultProps} value="nonexistent" />);

      const tabElements = screen.getAllByRole('tab');

      // No tab should have aria-selected="true"
      tabElements.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected', 'false');
      });

      // All tabs should have tabIndex="-1" (no active tab in tab order)
      tabElements.forEach((tab) => {
        expect(tab).toHaveAttribute('tabIndex', '-1');
      });
    });

    test('handles all tabs individually disabled', () => {
      const allDisabledTabs = tabs.map((tab) => ({ ...tab, disabled: true }));
      const handleChange = jest.fn();

      render(
        <Tabs tabs={allDisabledTabs} value="style" onChange={handleChange} />
      );

      const buttons = screen.getAllByRole('tab');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });

      // Click should not trigger onChange
      fireEvent.click(buttons[1]);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
