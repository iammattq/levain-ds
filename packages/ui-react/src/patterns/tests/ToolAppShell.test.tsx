import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ToolAppShell } from '../ToolAppShell';

// Mock next/navigation
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: {
      children: React.ReactNode;
      initial?: object;
      animate?: object;
      exit?: object;
      transition?: object;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
}));

// Mock AsciiHeader
jest.mock('../AsciiHeader', () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => (
    <span data-testid="ascii-header">{text}</span>
  ),
}));

// Mock design system Button
jest.mock('../../components/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

describe('ToolAppShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset history length mock
    Object.defineProperty(window, 'history', {
      value: { length: 2 },
      writable: true,
    });
  });

  describe('Rendering', () => {
    it('renders with title and close button', () => {
      render(
        <ToolAppShell title="Test Tool">
          <p>Content</p>
        </ToolAppShell>
      );

      expect(screen.getByText('Test Tool')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <ToolAppShell title="Test">
          <p data-testid="child-content">Child content here</p>
        </ToolAppShell>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('applies correct ARIA attributes', () => {
      render(
        <ToolAppShell title="Accessible Shell">
          <p>Content</p>
        </ToolAppShell>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');

      const titleId = dialog.getAttribute('aria-labelledby');
      expect(screen.getByText('Accessible Shell')).toHaveAttribute(
        'id',
        titleId
      );
    });

    it('uses custom titleId when provided', () => {
      render(
        <ToolAppShell title="Custom ID Shell" titleId="my-custom-id">
          <p>Content</p>
        </ToolAppShell>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'my-custom-id');
      expect(screen.getByText('Custom ID Shell')).toHaveAttribute(
        'id',
        'my-custom-id'
      );
    });
  });

  describe('Close behavior', () => {
    it('calls router.back() on close button click when history exists', () => {
      render(
        <ToolAppShell title="Test">
          <p>Content</p>
        </ToolAppShell>
      );

      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockBack).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('calls router.push("/design-system") when no history', () => {
      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        writable: true,
      });

      render(
        <ToolAppShell title="Test">
          <p>Content</p>
        </ToolAppShell>
      );

      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockPush).toHaveBeenCalledWith('/design-system');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('Escape key handling', () => {
    it('closes on Escape key press', () => {
      render(
        <ToolAppShell title="Test">
          <p>Content</p>
        </ToolAppShell>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockBack).toHaveBeenCalled();
    });

    it('does not close on other key presses', () => {
      render(
        <ToolAppShell title="Test">
          <p>Content</p>
        </ToolAppShell>
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'a' });
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('Focus trap', () => {
    it('traps focus within the shell - Tab cycles through focusable elements', async () => {
      const user = userEvent.setup();

      render(
        <ToolAppShell title="Focus Test">
          <button data-testid="btn-1">First</button>
          <button data-testid="btn-2">Second</button>
        </ToolAppShell>
      );

      // Get elements - note: mobile button also exists in DOM
      const closeBtn = screen.getByLabelText('Close');
      const btn1 = screen.getByTestId('btn-1');

      // Focus the close button and tab forward
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);

      // Tab should move to next focusable element
      await user.tab();
      await waitFor(() => {
        expect(document.activeElement).toBe(btn1);
      });
    });

    it('traps focus within the shell - Shift+Tab moves backwards', async () => {
      const user = userEvent.setup();

      render(
        <ToolAppShell title="Focus Test">
          <button data-testid="btn-1">First</button>
          <button data-testid="btn-2">Second</button>
        </ToolAppShell>
      );

      // Get elements
      const btn1 = screen.getByTestId('btn-1');
      const closeBtn = screen.getByLabelText('Close');

      // Focus btn-1 and shift+tab should go to close button
      btn1.focus();
      expect(document.activeElement).toBe(btn1);

      await user.tab({ shift: true });
      await waitFor(() => {
        expect(document.activeElement).toBe(closeBtn);
      });
    });
  });

  describe('Mobile handling', () => {
    it('renders mobile message element', () => {
      render(
        <ToolAppShell title="Test">
          <p>Content</p>
        </ToolAppShell>
      );

      // Mobile message should be in the DOM (visibility controlled by CSS)
      expect(
        screen.getByText('This tool works best on larger screens.')
      ).toBeInTheDocument();
    });

    it('renders Back to Design System button in mobile view', () => {
      render(
        <ToolAppShell title="Test">
          <p>Content</p>
        </ToolAppShell>
      );

      expect(screen.getByText('Back to Design System')).toBeInTheDocument();
    });
  });
});
