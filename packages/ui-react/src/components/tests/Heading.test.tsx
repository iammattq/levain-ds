import React from 'react';
import { render, screen } from '@testing-library/react';
import Heading from '../Heading';

jest.mock('../../provider/LevainProvider', () => {
  const actual = jest.requireActual('../../provider/LevainProvider');
  const link = (() => {
  const MockLink = ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
})();
  return { ...actual, Link: link.default ?? link };
});

// Mock the next/link component

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">←</div>,
}));

describe('Heading Component', () => {
  // Test rendering with different heading levels
  test.each(['h1', 'h2', 'h3', 'h4'] as const)(
    'renders %s heading correctly',
    (level) => {
      const headingText = `${level.toUpperCase()} Heading`;
      render(<Heading level={level}>{headingText}</Heading>);

      const headingElement = screen.getByText(headingText);
      expect(headingElement).toBeInTheDocument();
      expect(headingElement.tagName.toLowerCase()).toBe(level);
    }
  );

  // Test semantic typography classes are applied
  // Note: Uses .type-* prefix (not .text-*) to avoid tailwind-merge conflicts
  test.each([
    ['h1', 'type-heading-1'],
    ['h2', 'type-heading-2'],
    ['h3', 'type-heading-3'],
    ['h4', 'type-heading-4'],
  ] as const)(
    'applies semantic typography class for %s',
    (level, expectedClass) => {
      const { container } = render(
        <Heading level={level}>Test Heading</Heading>
      );

      const headingElement = container.querySelector(level);
      expect(headingElement).toHaveClass(expectedClass);
    }
  );

  // Test alignment options
  test.each(['left', 'center', 'right'] as const)(
    'applies %s alignment correctly',
    (align) => {
      const { container } = render(
        <Heading level="h2" align={align}>
          Aligned Heading
        </Heading>
      );

      // Check for alignment class
      const alignmentClass =
        align === 'left'
          ? 'text-left'
          : align === 'center'
            ? 'text-center'
            : 'text-right';

      expect(container.innerHTML).toContain(alignmentClass);
    }
  );

  // Test custom className
  test('applies custom className', () => {
    const { container } = render(
      <Heading level="h3" className="custom-test-class">
        Custom Class Heading
      </Heading>
    );

    expect(container.firstChild).toHaveClass('custom-test-class');
  });

  // Test the showBar prop
  test('renders with accent bar by default', () => {
    const { container } = render(
      <Heading level="h2">Heading with Bar</Heading>
    );

    // Check for the accent bar element
    const barElement = container.querySelector('span[aria-hidden="true"]');
    expect(barElement).toBeInTheDocument();
    expect(barElement).toHaveClass('rounded-r-xs');
    expect(barElement).toHaveClass('w-1.5'); // h2 should have w-1.5 bar
  });

  test('renders without accent bar when showBar is false', () => {
    const { container } = render(
      <Heading level="h2" showBar={false}>
        Heading without Bar
      </Heading>
    );

    // Bar element should not exist
    const barElement = container.querySelector('span[aria-hidden="true"]');
    expect(barElement).not.toBeInTheDocument();
  });

  // Test inverted prop
  test('renders with default text color when inverted is false', () => {
    const { container } = render(<Heading level="h2">Regular Heading</Heading>);

    // Should have default text color class
    const headingElement = container.querySelector('h2');
    expect(headingElement).toHaveClass('text-[var(--color-text-default)]');
  });

  test('renders with inverted text color when inverted is true', () => {
    const { container } = render(
      <Heading level="h2" inverted={true}>
        Inverted Heading
      </Heading>
    );

    // Should have inverted text color class
    const headingElement = container.querySelector('h2');
    expect(headingElement).toHaveClass('text-[var(--color-text-inverted)]');
  });

  // Test backLink functionality
  test('renders with back link when backLink is provided', () => {
    render(
      <Heading level="h2" backLink="/previous-page">
        Heading with Back Link
      </Heading>
    );

    // Check for back link and icon
    const backLink = screen.getByRole('link');
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/previous-page');

    const backIcon = screen.getByTestId('arrow-left-icon');
    expect(backIcon).toBeInTheDocument();
  });

  test('applies custom backLinkTitle for accessibility', () => {
    render(
      <Heading
        level="h2"
        backLink="/return"
        backLinkTitle="Return to previous section"
      >
        Heading with Custom Back Link Title
      </Heading>
    );

    const backLink = screen.getByRole('link');
    expect(backLink).toHaveAttribute(
      'aria-label',
      'Return to previous section'
    );
  });

  // Test complex combinations
  test('renders with multiple props correctly combined', () => {
    const { container } = render(
      <Heading
        level="h1"
        align="center"
        className="mt-8"
        inverted={true}
        showBar={true}
      >
        Complex Heading
      </Heading>
    );

    const headingElement = screen.getByText('Complex Heading');
    expect(headingElement).toBeInTheDocument();
    expect(headingElement.tagName.toLowerCase()).toBe('h1');

    // Container should have custom class
    expect(container.firstChild).toHaveClass('mt-8');

    // Heading should be centered
    expect(container.innerHTML).toContain('text-center');

    // Should have inverted color
    expect(headingElement).toHaveClass('text-[var(--color-text-inverted)]');

    // Should have accent bar
    const barElement = container.querySelector('span[aria-hidden="true"]');
    expect(barElement).toBeInTheDocument();
  });

  describe('eyebrow and caption', () => {
    test('renders neither, and adds no element, when neither is given', () => {
      const { container } = render(<Heading level="h1">Title</Heading>);

      // The wrapper holds the heading and nothing else, so an unused slot
      // cannot contribute height.
      expect(container.firstChild?.childNodes).toHaveLength(1);
    });

    test('renders the eyebrow above the heading and the caption below it', () => {
      render(
        <Heading level="h1" eyebrow="Journal" caption="May 8, 2026">
          Title
        </Heading>
      );

      const eyebrow = screen.getByText('Journal');
      const heading = screen.getByText('Title');
      const caption = screen.getByText('May 8, 2026');

      const following = Node.DOCUMENT_POSITION_FOLLOWING;
      expect(eyebrow.compareDocumentPosition(heading) & following).toBeTruthy();
      expect(heading.compareDocumentPosition(caption) & following).toBeTruthy();
    });

    test("sets both on the heading's spine, clear of the accent bar", () => {
      render(
        <Heading level="h1" eyebrow="Journal" caption="May 8, 2026">
          Title
        </Heading>
      );

      expect(screen.getByText('Journal')).toHaveClass('pl-7');
      expect(screen.getByText('May 8, 2026')).toHaveClass('pl-7');
    });

    test('drops the inset with the bar', () => {
      render(
        <Heading level="h1" showBar={false} caption="May 8, 2026">
          Title
        </Heading>
      );

      expect(screen.getByText('May 8, 2026')).toHaveClass('pl-0');
    });

    test('moves the block spacing onto the group, not the heading', () => {
      const { container } = render(
        <Heading level="h1" caption="May 8, 2026">
          Title
        </Heading>
      );

      const wrapper = container.firstChild as HTMLElement;
      const heading = screen.getByText('Title');

      // The wrapper is the block: its padding sits inside the bar, so the
      // space above the heading matches the space below the caption.
      expect(wrapper).toHaveClass('py-3', 'mt-2', 'mb-4', 'md:mb-12');
      expect(heading.className).not.toMatch(/\bpy-/);
      expect(heading.className).not.toMatch(/\bmb-4\b/);

      // Inside the block the two are spaced only against each other.
      expect(heading).toHaveClass('mb-3xs');
      expect(screen.getByText('May 8, 2026').className).not.toMatch(/\bm[tb]-/);
    });

    test('spaces the eyebrow against the heading, not the block', () => {
      const { container } = render(
        <Heading level="h1" eyebrow="Journal">
          Title
        </Heading>
      );

      expect(container.firstChild).toHaveClass('mt-2');
      expect(screen.getByText('Journal')).toHaveClass('mb-3xs');
      expect(screen.getByText('Journal').className).not.toMatch(/\bmt-/);
    });

    test('spans the accent bar across the whole group', () => {
      const { container } = render(
        <Heading level="h1" caption="May 8, 2026">
          Title
        </Heading>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('relative');

      // The bar belongs to the wrapper, so it runs past the caption rather
      // than stopping at the heading.
      expect(
        wrapper.querySelector(':scope > span[aria-hidden="true"]')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Title').querySelector('span[aria-hidden="true"]')
      ).toBeNull();
    });

    test('keeps the bar on the heading alone when neither slot is used', () => {
      const { container } = render(<Heading level="h1">Title</Heading>);

      expect(container.firstChild).not.toHaveClass('relative');
      expect(
        screen.getByText('Title').querySelector('span[aria-hidden="true"]')
      ).toBeInTheDocument();
    });

    test('adds no spacing to any of them when noSpacing is set', () => {
      const { container } = render(
        <Heading level="h1" noSpacing eyebrow="Journal" caption="May 8, 2026">
          Title
        </Heading>
      );

      expect((container.firstChild as HTMLElement).className).not.toMatch(
        /\b(m[tb]|py)-/
      );
      expect(screen.getByText('Journal').className).not.toMatch(
        /\b(m[tb]|pl)-/
      );
      expect(screen.getByText('May 8, 2026').className).not.toMatch(
        /\b(m[tb]|pl)-/
      );
    });
  });
});
