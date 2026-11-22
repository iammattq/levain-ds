import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeToggle from '../ThemeToggle';

// Mock for useEnhancedTheme hook
const mockSetTheme = jest.fn();
let mockTheme = 'light';
let mockThemeIndex = 0;

jest.mock('@/lib/hooks/useEnhancedTheme', () => ({
  useEnhancedTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    themeIndex: mockThemeIndex,
  }),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Sun: () => <div data-testid="sun-icon">Sun Icon</div>,
  Moon: () => <div data-testid="moon-icon">Moon Icon</div>,
  Monitor: () => <div data-testid="monitor-icon">Monitor Icon</div>,
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTheme = 'light';
    mockThemeIndex = 0;
  });

  it('renders correctly with default props', () => {
    render(<ThemeToggle />);

    // Button should be rendered
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Toggle theme');

    // Since mock returns 'light' theme, Sun icon should be rendered
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<ThemeToggle className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('calls setTheme when clicked', () => {
    render(<ThemeToggle />);

    // Click the theme toggle button
    fireEvent.click(screen.getByRole('button'));

    // setTheme should be called with the next theme ('dark')
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('cycles through themes in order: light -> dark -> system -> light', () => {
    // Test for light theme
    mockTheme = 'light';
    mockThemeIndex = 0;

    const { rerender } = render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');

    // Test for dark theme
    mockTheme = 'dark';
    mockThemeIndex = 1;
    mockSetTheme.mockClear();

    rerender(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');

    // Test for system theme
    mockTheme = 'system';
    mockThemeIndex = 2;
    mockSetTheme.mockClear();

    rerender(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('renders appropriate icon based on current theme', () => {
    // Test light theme (Sun icon)
    mockTheme = 'light';
    mockThemeIndex = 0;

    const { rerender } = render(<ThemeToggle />);
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('monitor-icon')).not.toBeInTheDocument();

    // Test dark theme (Moon icon)
    mockTheme = 'dark';
    mockThemeIndex = 1;

    rerender(<ThemeToggle />);
    expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('monitor-icon')).not.toBeInTheDocument();

    // Test system theme (Monitor icon)
    mockTheme = 'system';
    mockThemeIndex = 2;

    rerender(<ThemeToggle />);
    expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
    expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
  });

  it('sets title attribute with current theme information', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Current theme: light');
  });

  it('forwards ref to button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<ThemeToggle ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
