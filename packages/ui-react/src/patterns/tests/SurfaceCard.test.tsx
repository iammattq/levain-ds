import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurfaceCard, GradientCard } from '../SurfaceCard';

jest.mock('../../provider/LevainProvider', () => {
  const actual = jest.requireActual('../../provider/LevainProvider');
  const link = (() => {
  return function NextLink({
    children,
    href,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
  }) {
    return (
      <a href={href} className={className} onClick={onClick} data-testid="link">
        {children}
      </a>
    );
  };
})();
  return { ...actual, Link: link.default ?? link };
});

// Mock Next/Link

describe('SurfaceCard', () => {
  describe('Basic Rendering', () => {
    test('renders with flat preset - expects solid background, no gradient borders', () => {
      render(
        <SurfaceCard preset="flat" data-testid="surface-card">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = screen.getByTestId('surface-card');
      expect(card).toBeInTheDocument();
      // The flat preset should have the surface-card class
      expect(card).toHaveClass('surface-card');
    });

    test('renders with existing presets (elevated, inset, matts, modern, modern2) - expects unchanged behavior', () => {
      const presets = [
        'elevated',
        'inset',
        'matts',
        'modern',
        'modern2',
      ] as const;

      presets.forEach((preset) => {
        const { container, unmount } = render(
          <SurfaceCard preset={preset}>
            <div>Content</div>
          </SurfaceCard>
        );

        // Each preset should render without error
        expect(container.querySelector('.surface-card')).toBeInTheDocument();
        unmount();
      });
    });

    test("shadowStyle='subtle' applies var(--elevation-2) - expects CSS variable in shadow", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="subtle">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      expect(card).toBeInTheDocument();
      // The subtle shadow should be present via boxShadow style
      expect(card).toHaveStyle({ boxShadow: 'var(--elevation-2)' });
    });

    test("shadowStyle='offset' applies softened shadow with press effect", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      expect(card).toBeInTheDocument();
      // The inline style should have boxShadow set
      expect(card).toHaveAttribute('style');
      expect(card!.getAttribute('style')).toContain('box-shadow');
    });

    test("shadowStyle='none' removes shadow - expects no box-shadow", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="none">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      expect(card).toBeInTheDocument();
      // Should have box-shadow: none
      expect(card).toHaveStyle({ boxShadow: 'none' });
    });

    test("default shadowStyle is 'subtle' - expects subtle shadow when prop omitted", () => {
      const { container } = render(
        <SurfaceCard>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      expect(card).toBeInTheDocument();
      // Default should be subtle (var(--elevation-2))
      expect(card).toHaveStyle({ boxShadow: 'var(--elevation-2)' });
    });

    test('invalid preset falls back to modern - expects fallback behavior', () => {
      // TypeScript will complain about invalid preset, but we're testing runtime fallback
      const { container } = render(
        // @ts-expect-error - testing invalid preset
        <SurfaceCard preset="invalid-preset">
          <div>Content</div>
        </SurfaceCard>
      );

      // Should still render without error (falls back to modern)
      expect(container.querySelector('.surface-card')).toBeInTheDocument();
    });
  });

  describe('Shadow Implementation', () => {
    test("shadowDirection='bl' keeps softened elevation shadow", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset" shadowDirection="bl">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      const style = card!.getAttribute('style') || '';
      expect(style).toContain('var(--elevation-2)');
    });

    test("shadowDirection='br' keeps softened elevation shadow", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset" shadowDirection="br">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      const style = card!.getAttribute('style') || '';
      expect(style).toContain('var(--elevation-2)');
    });

    test("shadowDirection='tl' keeps softened elevation shadow", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset" shadowDirection="tl">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      const style = card!.getAttribute('style') || '';
      expect(style).toContain('var(--elevation-2)');
    });

    test("shadowDirection='tr' keeps softened elevation shadow", () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset" shadowDirection="tr">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      const style = card!.getAttribute('style') || '';
      expect(style).toContain('var(--elevation-2)');
    });

    test('default offset shadow uses softened elevation token', () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      const style = card!.getAttribute('style') || '';
      expect(style).toContain('var(--elevation-2)');
    });

    test('offset shadow has inline transition styles for press effect', () => {
      const { container } = render(
        <SurfaceCard shadowStyle="offset">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      const style = card?.getAttribute('style') || '';
      // Uses inline styles with transition for press effect (like Button.tsx)
      expect(style).toContain('transition');
      expect(style).toContain('transform');
    });

    test('subtle shadow has hover transition for fade effect', () => {
      const { container } = render(
        <SurfaceCard shadowStyle="subtle">
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      // Should have transition for shadow fade
      expect(card).toHaveClass('transition-shadow');
    });
  });

  describe('Backward Compatibility', () => {
    test('GradientCard alias still works', () => {
      const { container } = render(
        <GradientCard>
          <div>Content</div>
        </GradientCard>
      );

      // Should render the same as SurfaceCard
      expect(container.querySelector('.surface-card')).toBeInTheDocument();
    });

    test('existing GradientCard props still work (backward compatibility)', () => {
      // Test all props that were available on GradientCard
      const handleClick = jest.fn();
      const { container } = render(
        <GradientCard
          preset="elevated"
          borderRadius={12}
          className="custom-class"
          onClick={handleClick}
          scaleEffect
          shadowStyle="offset"
          shadowDirection="br"
        >
          <div>Content</div>
        </GradientCard>
      );

      const card = container.querySelector('.surface-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveStyle({ borderRadius: '12px' });

      // Click should work
      fireEvent.click(card!);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Link Support', () => {
    test('renders as link when href is provided', () => {
      render(
        <SurfaceCard href="/test-link">
          <div>Content</div>
        </SurfaceCard>
      );

      const link = screen.getByTestId('link');
      expect(link).toHaveAttribute('href', '/test-link');
    });
  });

  describe('Selection State', () => {
    test('selectable={true} makes card keyboard focusable - expects tabIndex=0', () => {
      const { container } = render(
        <SurfaceCard selectable>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    test('active={true} applies active styling - expects visual indicator (ring via boxShadow)', () => {
      const { container } = render(
        <SurfaceCard selectable active>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      // Active ring is now applied via inline boxShadow to avoid Tailwind override issues
      expect(card).toHaveStyle({ boxShadow: '0 0 0 2px var(--color-primary)' });
    });

    test('Enter key triggers onSelect() - expects handler called once', () => {
      const handleSelect = jest.fn();
      const { container } = render(
        <SurfaceCard selectable onSelect={handleSelect}>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card')!;
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(handleSelect).toHaveBeenCalledTimes(1);
    });

    test('Space key triggers onSelect() - expects handler called once', () => {
      const handleSelect = jest.fn();
      const { container } = render(
        <SurfaceCard selectable onSelect={handleSelect}>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card')!;
      fireEvent.keyDown(card, { key: ' ' });

      expect(handleSelect).toHaveBeenCalledTimes(1);
    });

    test('Focus applies ring with focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]', () => {
      const { container } = render(
        <SurfaceCard selectable>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card');
      // Check for focus-visible ring classes (applied via CSS on :focus-visible)
      expect(card).toHaveClass('focus-visible:ring-2');
      expect(card).toHaveClass('focus-visible:ring-[var(--color-primary)]');
    });

    test('Non-selectable card ignores keyboard events - expects no handler calls', () => {
      const handleSelect = jest.fn();
      const { container } = render(
        <SurfaceCard onSelect={handleSelect}>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card')!;
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });

      expect(handleSelect).not.toHaveBeenCalled();
    });

    test("selectable={true} without onSelect doesn't error - expects no crash", () => {
      // Should render without error even when selectable is true but no onSelect provided
      expect(() => {
        render(
          <SurfaceCard selectable>
            <div>Content</div>
          </SurfaceCard>
        );
      }).not.toThrow();

      // Keyboard events should be handled gracefully
      const { container } = render(
        <SurfaceCard selectable>
          <div>Content</div>
        </SurfaceCard>
      );

      const card = container.querySelector('.surface-card')!;
      expect(() => {
        fireEvent.keyDown(card, { key: 'Enter' });
        fireEvent.keyDown(card, { key: ' ' });
      }).not.toThrow();
    });
  });
});
