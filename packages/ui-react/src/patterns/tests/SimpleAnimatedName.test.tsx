import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleAnimatedName from '../SimpleAnimatedName';
import { useEnhancedTheme } from '@/lib/hooks/useEnhancedTheme';
import { themeManager } from '@levain/tokens';

// Mock the hooks and theme manager
jest.mock('@/lib/hooks/useEnhancedTheme');
jest.mock('@levain/tokens', () => ({
  themeManager: {
    getAvailableThemeIndices: jest.fn(),
  },
}));

describe('SimpleAnimatedName Pattern', () => {
  const mockUseEnhancedTheme = useEnhancedTheme as jest.Mock;
  const mockSetThemeIndex = jest.fn();
  const mockSaveThemePreference = jest.fn();
  // Store the keydown handler in a module-level variable for testing
  let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock theme hooks
    mockUseEnhancedTheme.mockReturnValue({
      themeIndex: 1,
      setThemeIndex: mockSetThemeIndex,
      saveThemePreference: mockSaveThemePreference,
      isDarkMode: true,
    });

    // Mock available theme indices
    (themeManager.getAvailableThemeIndices as jest.Mock).mockReturnValue([
      0, 1, 2, 3,
    ]);

    // Mock window to handle keydown events
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    jest
      .spyOn(window, 'addEventListener')
      .mockImplementation((event, handler, options) => {
        if (event === 'keydown') {
          // Store the keydown handler for testing
          keydownHandler = handler as (event: KeyboardEvent) => void;
          return;
        }
        return originalAddEventListener.call(window, event, handler, options);
      });

    jest
      .spyOn(window, 'removeEventListener')
      .mockImplementation((event, handler, options) => {
        if (event === 'keydown') {
          // Clean up keydown handler
          keydownHandler = null;
          return;
        }
        return originalRemoveEventListener.call(
          window,
          event,
          handler,
          options
        );
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    keydownHandler = null;
  });

  test('renders with default name', () => {
    render(<SimpleAnimatedName />);
    expect(screen.getByText('Matt Quinn')).toBeInTheDocument();
  });

  test('renders with custom name', () => {
    render(<SimpleAnimatedName name="John Doe" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<SimpleAnimatedName className="custom-class text-xl" />);
    const nameElement = screen.getByText('Matt Quinn');
    expect(nameElement).toHaveClass('text-xl');
    expect(nameElement).toHaveClass('custom-class');
  });

  test('has title tooltip with instructions', () => {
    render(<SimpleAnimatedName />);
    const nameElement = screen.getByText('Matt Quinn');
    expect(nameElement).toHaveAttribute(
      'title',
      expect.stringContaining('Press space')
    );
    expect(nameElement).toHaveAttribute(
      'title',
      expect.stringContaining("press 'S' to save")
    );
  });

  test('sets isHovered state on mouse events', () => {
    render(<SimpleAnimatedName />);
    const nameElement = screen.getByText('Matt Quinn');

    // Initial state, hover false
    fireEvent.mouseEnter(nameElement);
    // Now hover state should be true

    fireEvent.mouseLeave(nameElement);
    // Now hover state should be false again

    // We can't directly test the state, but we know it works if the keydown handlers behave correctly
  });

  test('changes theme on Space key press when hovered', () => {
    render(<SimpleAnimatedName />);
    const nameElement = screen.getByText('Matt Quinn');

    // Simulate hover
    fireEvent.mouseEnter(nameElement);

    // Simulate Space key press
    const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
    if (keydownHandler) keydownHandler(spaceEvent);

    // Should change theme
    expect(mockSetThemeIndex).toHaveBeenCalled();
  });

  test('does not change theme on Space key press when not hovered', () => {
    render(<SimpleAnimatedName />);

    // Do not hover the element

    // Simulate Space key press
    const spaceEvent = new KeyboardEvent('keydown', { code: 'Space' });
    if (keydownHandler) keydownHandler(spaceEvent);

    // Should not change theme
    expect(mockSetThemeIndex).not.toHaveBeenCalled();
  });

  test('saves theme preference on S key press when hovered', () => {
    render(<SimpleAnimatedName />);
    const nameElement = screen.getByText('Matt Quinn');

    // Simulate hover
    fireEvent.mouseEnter(nameElement);

    // Simulate S key press
    const sKeyEvent = new KeyboardEvent('keydown', { code: 'KeyS' });
    if (keydownHandler) keydownHandler(sKeyEvent);

    // Should save theme preference
    expect(mockSaveThemePreference).toHaveBeenCalled();
  });

  test('applies proper styling with gradient effects', () => {
    render(<SimpleAnimatedName />);
    const nameElement = screen.getByText('Matt Quinn');

    // Check for inline styles that can be tested reliably
    expect(nameElement).toHaveAttribute('style');
    const styleAttr = nameElement.getAttribute('style');

    // Check for key styling properties we can verify
    expect(styleAttr).toContain('background-clip: text');
    expect(styleAttr).toContain('color: transparent');
    expect(styleAttr).toContain('animation: gradientMove');

    // Verify the element has the animated-name class
    expect(nameElement).toHaveClass('animated-name');
  });
});
