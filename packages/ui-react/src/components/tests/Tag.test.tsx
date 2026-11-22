import React from 'react';
import { render, screen } from '@testing-library/react';
import Tag from '../Tag';

// Helper to get the outer wrapper span (Tag wraps children in an inner span)
const getTagWrapper = (text: string) => {
  const textElement = screen.getByText(text);
  // The text is in an inner span, so we need the parent (outer span)
  return textElement.parentElement as HTMLElement;
};

describe('Tag Component', () => {
  // Test basic rendering
  test('renders children correctly', () => {
    render(<Tag>Test Tag</Tag>);

    const tagElement = screen.getByText('Test Tag');
    expect(tagElement).toBeInTheDocument();
    expect(tagElement.tagName.toLowerCase()).toBe('span');
  });

  // Test default variant styling
  test('applies default variant styling', () => {
    render(<Tag>Default Tag</Tag>);

    const tagWrapper = getTagWrapper('Default Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-primary)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-text-on-primary)]');
  });

  // Test accent variant styling
  test('applies accent variant styling', () => {
    render(<Tag variant="accent">Accent Tag</Tag>);

    const tagWrapper = getTagWrapper('Accent Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-accent)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-text-on-accent)]');
  });

  // Test size variants
  test('applies default md size styling', () => {
    render(<Tag>Medium Tag</Tag>);

    const tagWrapper = getTagWrapper('Medium Tag');
    expect(tagWrapper).toHaveClass('type-label');
    expect(tagWrapper).toHaveClass('px-3');
    expect(tagWrapper).toHaveClass('py-2');
    expect(tagWrapper).toHaveClass('gap-2');
  });

  test('applies sm size styling', () => {
    render(<Tag size="sm">Small Tag</Tag>);

    const tagWrapper = getTagWrapper('Small Tag');
    expect(tagWrapper).toHaveClass('type-label-compact');
    expect(tagWrapper).toHaveClass('px-3');
    expect(tagWrapper).toHaveClass('py-1.5');
    expect(tagWrapper).toHaveClass('gap-1.5');
  });

  // Test muted variant styling
  test('applies muted variant styling', () => {
    render(<Tag variant="muted">Muted Tag</Tag>);

    const tagWrapper = getTagWrapper('Muted Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-surface-section)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-text-default)]');
  });

  // Test success variant styling
  test('applies success variant styling', () => {
    render(<Tag variant="success">Success Tag</Tag>);

    const tagWrapper = getTagWrapper('Success Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-success-bg)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-success-fg)]');
  });

  // Test error variant styling
  test('applies error variant styling', () => {
    render(<Tag variant="error">Error Tag</Tag>);

    const tagWrapper = getTagWrapper('Error Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-error-bg)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-error-fg)]');
  });

  // Test info variant styling
  test('applies info variant styling', () => {
    render(<Tag variant="info">Info Tag</Tag>);

    const tagWrapper = getTagWrapper('Info Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-info-bg)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-info-fg)]');
  });

  // Test caution variant styling
  test('applies caution variant styling', () => {
    render(<Tag variant="caution">Caution Tag</Tag>);

    const tagWrapper = getTagWrapper('Caution Tag');
    expect(tagWrapper).toHaveClass('bg-[var(--color-caution-bg)]');
    expect(tagWrapper).toHaveClass('text-[var(--color-caution-fg)]');
  });

  // Test custom className
  test('applies custom className', () => {
    render(<Tag className="custom-test-class">Custom Tag</Tag>);

    const tagWrapper = getTagWrapper('Custom Tag');
    expect(tagWrapper).toHaveClass('custom-test-class');
  });

  // Test that base classes are always applied
  test('always applies base styling classes', () => {
    render(<Tag>Base Styled Tag</Tag>);

    const tagWrapper = getTagWrapper('Base Styled Tag');
    expect(tagWrapper).toHaveClass('inline-flex');
    expect(tagWrapper).toHaveClass('items-center');
    expect(tagWrapper).toHaveClass('rounded-full');
    expect(tagWrapper).toHaveClass('type-label');
  });

  // Test that base classes are maintained with custom classes
  test('maintains base styling with custom classes', () => {
    render(<Tag className="p-4 text-lg">Custom Sized Tag</Tag>);

    const tagWrapper = getTagWrapper('Custom Sized Tag');

    // Base classes should still be present
    expect(tagWrapper).toHaveClass('inline-flex');
    expect(tagWrapper).toHaveClass('items-center');
    expect(tagWrapper).toHaveClass('rounded-full');

    // Custom classes should be applied
    expect(tagWrapper).toHaveClass('p-4');
    expect(tagWrapper).toHaveClass('text-lg');
  });

  // Test that variant classes can be overridden
  test('allows variant styling to be overridden with custom classes', () => {
    render(<Tag className="bg-red-500 text-white">Override Tag</Tag>);

    const tagWrapper = getTagWrapper('Override Tag');
    expect(tagWrapper).toHaveClass('bg-red-500');
    expect(tagWrapper).toHaveClass('text-white');
  });

  // Test with complex children content
  test('renders complex children correctly', () => {
    render(
      <Tag>
        <span data-testid="icon">🔥</span>
        <span>Hot Tag</span>
      </Tag>
    );

    const iconElement = screen.getByTestId('icon');
    const textElement = screen.getByText('Hot Tag');

    expect(iconElement).toBeInTheDocument();
    expect(textElement).toBeInTheDocument();
  });
});
