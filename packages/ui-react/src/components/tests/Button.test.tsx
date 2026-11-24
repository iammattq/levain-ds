import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

// Mock lucide-react icons - Loader2 is used internally by Button
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader2-icon" className={className}>
      <circle />
    </svg>
  ),
  Heart: ({ className }: { className?: string }) => (
    <svg data-testid="heart-icon" className={className}>
      <path />
    </svg>
  ),
}));

// Import Heart after mock is set up (for type checking in tests)
const { Heart } = jest.requireMock('lucide-react');

describe('Button Component', () => {
  // Test rendering and basic props
  test('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    // Check default variant classes (outline with gradient border)
    expect(button).toHaveClass('pill-gradient-border');
  });

  // Test variants
  test.each([
    ['primary', 'bg-[var(--color-primary)]'],
    ['accent', 'bg-[var(--color-accent)]'],
    ['secondary', 'bg-[var(--color-accent)]'], // deprecated alias for accent
    ['outline', 'pill-gradient-border'],
    ['ghost', 'bg-transparent'],
    ['link', 'underline-offset-4'],
    ['danger', 'bg-[var(--color-error)]'],
  ])('renders %s variant with correct classes', (variant, expectedClass) => {
    render(
      <Button
        variant={
          variant as
            | 'primary'
            | 'accent'
            | 'secondary'
            | 'outline'
            | 'ghost'
            | 'link'
            | 'danger'
        }
      >
        Button
      </Button>
    );
    const button = screen.getByRole('button', { name: /button/i });
    expect(button).toHaveClass(expectedClass);
  });

  // Test sizes
  test.each([
    ['sm', 'h-8'],
    ['md', 'h-9'],
    ['lg', 'h-12'],
  ])('renders %s size with correct classes', (size, expectedClass) => {
    render(<Button size={size as 'sm' | 'md' | 'lg'}>Button</Button>);
    const button = screen.getByRole('button', { name: /button/i });
    expect(button).toHaveClass(expectedClass);
  });

  // Test semantic typography classes
  // Note: Uses .type-label (base md/lg) and .type-label-sm (sm)
  test('renders with semantic typography classes', () => {
    const { rerender } = render(<Button>Default</Button>);
    let button = screen.getByRole('button', { name: /default/i });
    expect(button).toHaveClass('type-label');

    rerender(<Button size="sm">Small</Button>);
    button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('type-label-sm');
  });

  // Test full width
  test('renders full width button', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button', { name: /full width/i });
    expect(button).toHaveClass('w-full');
  });

  // Test disabled state
  test('disables the button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  // Test loading state
  test('shows loading spinner and disables button when loading', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  // Test click handler
  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test link behavior
  test('renders as Link component when href is provided', () => {
    render(<Button href="/dashboard">Dashboard</Button>);
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  test('renders as external link when href and external props are provided', () => {
    render(
      <Button href="https://example.com" external>
        External
      </Button>
    );
    const link = screen.getByRole('link', { name: /external/i });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // D6: a link Button keeps its ref, aria-*, title and disabled
  describe('with href (D6)', () => {
    test('forwards the ref to the anchor', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Button ref={ref} href="/dashboard">
          Dashboard
        </Button>
      );
      expect(ref.current).toBe(screen.getByRole('link'));
    });

    test('forwards the ref to an external anchor', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Button ref={ref} href="https://example.com" external>
          Out
        </Button>
      );
      expect(ref.current).toBe(screen.getByRole('link'));
    });

    test('keeps aria-label, aria-* and title on an internal link', () => {
      render(
        <Button
          href="/dashboard"
          aria-label="Go to dashboard"
          aria-describedby="hint"
          title="Dashboard"
        >
          <svg />
        </Button>
      );
      const link = screen.getByRole('link', { name: 'Go to dashboard' });
      expect(link).toHaveAttribute('aria-describedby', 'hint');
      expect(link).toHaveAttribute('title', 'Dashboard');
    });

    test('keeps aria-label and title on an external link', () => {
      render(
        <Button href="https://example.com" external aria-label="LinkedIn" title="LinkedIn">
          <svg />
        </Button>
      );
      const link = screen.getByRole('link', { name: 'LinkedIn' });
      expect(link).toHaveAttribute('title', 'LinkedIn');
    });

    test('does not put a button type on the anchor', () => {
      render(
        <Button href="/dashboard" type="submit">
          Dashboard
        </Button>
      );
      expect(screen.getByRole('link')).not.toHaveAttribute('type');
    });

    test('a disabled link has no href, is aria-disabled and ignores clicks', () => {
      const onClick = jest.fn();
      render(
        <Button href="/dashboard" disabled onClick={onClick}>
          Dashboard
        </Button>
      );
      const link = screen.getByRole('link', { name: /dashboard/i });
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('a loading link is inert like a disabled one', () => {
      const onClick = jest.fn();
      render(
        <Button href="/dashboard" loading onClick={onClick}>
          Dashboard
        </Button>
      );
      const link = screen.getByRole('link', { name: /dashboard/i });
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('a disabled external link has no href', () => {
      render(
        <Button href="https://example.com" external disabled>
          Out
        </Button>
      );
      const link = screen.getByRole('link', { name: /out/i });
      expect(link).not.toHaveAttribute('href');
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // Test icon rendering
  test('renders with icon on the left by default', () => {
    render(<Button Icon={Heart}>With Icon</Button>);
    const button = screen.getByRole('button', { name: /with icon/i });
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Check icon is before text (left position)
    expect(button.firstChild).toContainElement(svg);
  });

  test('renders with icon on the right when iconPosition is set to right', () => {
    render(
      <Button Icon={Heart} iconPosition="right">
        Right Icon
      </Button>
    );
    const button = screen.getByRole('button', { name: /right icon/i });
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Check icon is after text (right position)
    expect(button.lastChild).toContainElement(svg);
  });

  test('renders icon only button with aria-label', () => {
    render(
      <Button Icon={Heart} iconOnly aria-label="Like">
        Like
      </Button>
    );
    const button = screen.getByRole('button', { name: /like/i });
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Like');
    // Check that text content is not rendered
    expect(button).not.toHaveTextContent('Like');
  });

  test('collapses a labelled button to its icon below md', () => {
    render(
      <Button Icon={Heart} size="sm" iconOnlyOnMobile>
        Like
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Like' });

    expect(button).toHaveClass('h-7', 'w-7', 'md:w-auto');
    expect(button.querySelector('svg')).toHaveClass('mr-0', 'md:mr-2');
    expect(screen.getByText('Like')).toHaveClass('hidden', 'md:inline');
  });

  // Test active state
  test('renders with active state styling', () => {
    render(<Button active>Active Button</Button>);
    const button = screen.getByRole('button', { name: /active button/i });
    // Active state applies primary background with auto-calculated text color
    expect(button).toHaveClass('bg-[var(--color-primary)]');
    expect(button).toHaveClass('text-[var(--color-text-on-primary)]');
  });

  test('renders link with active state styling', () => {
    render(
      <Button href="/dashboard" active>
        Dashboard
      </Button>
    );
    const link = screen.getByRole('link', { name: /dashboard/i });
    expect(link).toHaveClass('bg-[var(--color-primary)]');
    expect(link).toHaveClass('text-[var(--color-text-on-primary)]');
  });
});
