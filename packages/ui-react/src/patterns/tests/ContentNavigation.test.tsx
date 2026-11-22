import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContentNavigation from '../ContentNavigation';

jest.mock('../../provider/LevainProvider', () => {
  const actual = jest.requireActual('../../provider/LevainProvider');
  const link = (() => {
  // Use function instead of arrow function to avoid closure issues
  function MockNextLink(props: MockLinkProps) {
    // Use the defined interface
    const {
      children,
      href,
      className,
      'aria-label': ariaLabel,
      ...rest
    } = props;
    return (
      <a
        href={href}
        className={className}
        aria-label={ariaLabel}
        data-testid={`link-to-${href}`}
        {...rest}
      >
        {children}
      </a>
    );
  }

  // Add displayName for better debugging
  MockNextLink.displayName = 'MockNextLink';

  return MockNextLink;
})();
  return { ...actual, Link: link.default ?? link };
});

// Define an interface for the Link props
interface MockLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href: string;
  className?: string;
  'aria-label'?: string;
  // Add other potential props used by Link if necessary
}

// Mock next/link

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
}));

describe('ContentNavigation Pattern', () => {
  // Sample content items
  const mockPrevious = { title: 'Previous Article', slug: 'previous-article' };
  const mockNext = { title: 'Next Article', slug: 'next-article' };
  const mockBasePath = '/journal';

  // Mock timers for delayed visibility
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Wrap timer execution in act
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('renders nothing initially (before delay)', () => {
    render(
      <ContentNavigation
        previous={mockPrevious}
        next={mockNext}
        basePath={mockBasePath}
      />
    );

    // Navigation should not be visible immediately
    expect(
      screen.queryByTestId(`link-to-${mockBasePath}/${mockPrevious.slug}`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`link-to-${mockBasePath}/${mockNext.slug}`)
    ).not.toBeInTheDocument();
  });

  test('renders navigation links after delay', async () => {
    // Wrap the entire test in act
    act(() => {
      render(
        <ContentNavigation
          previous={mockPrevious}
          next={mockNext}
          basePath={mockBasePath}
          delayMs={100} // Shorter delay for testing
        />
      );
    });

    // Fast-forward past the delay and animation - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Navigation should now be visible - use getAllByTestId
    const previousLinks = screen.getAllByTestId(
      `link-to-${mockBasePath}/${mockPrevious.slug}`
    );
    const nextLinks = screen.getAllByTestId(
      `link-to-${mockBasePath}/${mockNext.slug}`
    );

    // We should have links in both desktop and mobile views
    expect(previousLinks.length).toBeGreaterThan(0);
    expect(nextLinks.length).toBeGreaterThan(0);
  });

  test('renders only previous link when next is null', async () => {
    // Wrap in act
    act(() => {
      render(
        <ContentNavigation
          previous={mockPrevious}
          next={null}
          basePath={mockBasePath}
          delayMs={100}
        />
      );
    });

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Only previous link should be visible - use getAllByTestId
    const previousLinks = screen.getAllByTestId(
      `link-to-${mockBasePath}/${mockPrevious.slug}`
    );
    expect(previousLinks.length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId(`link-to-${mockBasePath}/undefined`)
    ).not.toBeInTheDocument();
  });

  test('renders only next link when previous is null', async () => {
    // Wrap in act
    act(() => {
      render(
        <ContentNavigation
          previous={null}
          next={mockNext}
          basePath={mockBasePath}
          delayMs={100}
        />
      );
    });

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Only next link should be visible - use getAllByTestId
    expect(
      screen.queryByTestId(`link-to-${mockBasePath}/undefined`)
    ).not.toBeInTheDocument();
    const nextLinks = screen.getAllByTestId(
      `link-to-${mockBasePath}/${mockNext.slug}`
    );
    expect(nextLinks.length).toBeGreaterThan(0);
  });

  test('renders back link when backLinkText is provided', async () => {
    const backLinkText = 'Back to Journal';

    // Wrap in act
    act(() => {
      render(
        <ContentNavigation
          previous={mockPrevious}
          next={mockNext}
          basePath={mockBasePath}
          backLinkText={backLinkText}
          delayMs={100}
        />
      );
    });

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Back link should be visible
    const backLink = screen.getByTestId(`link-to-${mockBasePath}`);
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveTextContent(backLinkText);
  });

  test('applies correct aria-labels to desktop navigation links', async () => {
    // Wrap in act
    act(() => {
      render(
        <ContentNavigation
          previous={mockPrevious}
          next={mockNext}
          basePath={mockBasePath}
          delayMs={100}
        />
      );
    });

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Get all links and check for the desktop one with aria-label
    const previousLinks = screen.getAllByTestId(
      `link-to-${mockBasePath}/${mockPrevious.slug}`
    );

    // Find the desktop link - it should have an aria-label
    const desktopPreviousLink = previousLinks.find(
      (link) =>
        link.getAttribute('aria-label') === `Previous: ${mockPrevious.title}`
    );

    expect(desktopPreviousLink).toBeDefined();
    expect(desktopPreviousLink).toHaveAttribute(
      'aria-label',
      `Previous: ${mockPrevious.title}`
    );

    // Multiple text elements may have the same content - use getAllByText
    const nextTitleElements = screen.getAllByText(mockNext.title);
    expect(nextTitleElements.length).toBeGreaterThan(0);
  });

  test('respects displayMode="desktop-only" setting', async () => {
    const { container } = render(
      <ContentNavigation
        previous={mockPrevious}
        next={mockNext}
        basePath={mockBasePath}
        displayMode="desktop-only"
        delayMs={100}
      />
    );

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Desktop container should be present
    expect(container.querySelector('.hidden.lg\\:block')).toBeInTheDocument();

    // Mobile container should not be present
    expect(container.querySelector('.lg\\:hidden')).not.toBeInTheDocument();
  });

  test('respects displayMode="mobile-only" setting', async () => {
    const { container } = render(
      <ContentNavigation
        previous={mockPrevious}
        next={mockNext}
        basePath={mockBasePath}
        displayMode="mobile-only"
        delayMs={100}
      />
    );

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Desktop container should not be present
    expect(
      container.querySelector('.hidden.lg\\:block')
    ).not.toBeInTheDocument();

    // Mobile container should be present
    expect(container.querySelector('.lg\\:hidden')).toBeInTheDocument();
  });

  test('respects mobilePosition="top" setting', async () => {
    const { container } = render(
      <ContentNavigation
        previous={mockPrevious}
        next={mockNext}
        basePath={mockBasePath}
        mobilePosition="top"
        delayMs={100}
      />
    );

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Mobile container should not have the mt-16 class when positioned at top
    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer).not.toHaveClass('mt-16');
  });

  test('respects mobilePosition="bottom" setting (default)', async () => {
    const { container } = render(
      <ContentNavigation
        previous={mockPrevious}
        next={mockNext}
        basePath={mockBasePath}
        delayMs={100}
      />
    );

    // Fast-forward past the delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Mobile container should have the mt-16 class when positioned at bottom (default)
    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer).toHaveClass('mt-16');
  });

  test('applies opacity transition classes correctly', async () => {
    const { container } = render(
      <ContentNavigation
        previous={mockPrevious}
        next={mockNext}
        basePath={mockBasePath}
        delayMs={100}
      />
    );

    // Fast-forward past the initial visibility delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Elements should have opacity-0 initially
    const opacityElements = container.querySelectorAll('.opacity-0');
    expect(opacityElements.length).toBeGreaterThan(0);

    // Fast-forward past the animation delay - wrapped in act
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Elements should now have opacity-100
    const visibleElements = container.querySelectorAll('.opacity-100');
    expect(visibleElements.length).toBeGreaterThan(0);
  });
});
