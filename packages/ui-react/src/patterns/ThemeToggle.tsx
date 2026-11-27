'use client';

import { useEnhancedTheme } from '../provider/LevainProvider';
import React, { forwardRef } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode } from '@levain/tokens';
import { Button, type ButtonProps } from '../components/Button';

interface ThemeToggleProps {
  className?: string;
  variant?: ButtonProps['variant'];
}

const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(
  ({ className = '', variant = 'outline' }, ref) => {
    // Get the enhanced theme context
    const { theme, setTheme, themeIndex } = useEnhancedTheme();

    const cycleTheme = () => {
      const themeOrder: ThemeMode[] = ['light', 'dark', 'system'];
      const currentIndex = themeOrder.indexOf(theme);
      const nextIndex = (currentIndex + 1) % themeOrder.length;

      setTheme(themeOrder[nextIndex]);
    };

    const getThemeIcon = () => {
      switch (theme) {
        case 'light':
          return Sun;
        case 'dark':
          return Moon;
        case 'system':
          return Monitor;
        default:
          return Sun;
      }
    };

    const ThemeIcon = getThemeIcon();
    return (
      <Button
        ref={ref}
        onClick={cycleTheme}
        variant={variant}
        className={className}
        title={`Current theme: ${theme}`}
        aria-label="Toggle theme"
      >
        <ThemeIcon size={16} strokeWidth={1} />
      </Button>
    );
  }
);

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
