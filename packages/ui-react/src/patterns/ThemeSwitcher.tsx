'use client';

import { forwardRef } from 'react';
import ThemeToggle from './ThemeToggle';
import ThemeColorButton from './ThemeColorButton';

interface ThemeSwitcherProps {
  className?: string;
}

const ThemeSwitcher = forwardRef<HTMLDivElement, ThemeSwitcherProps>(
  ({ className = '' }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center space-x-2 ${className}`}
        role="group"
        aria-label="Theme controls"
      >
        <ThemeToggle />
        <ThemeColorButton />
      </div>
    );
  }
);

ThemeSwitcher.displayName = 'ThemeSwitcher';

export default ThemeSwitcher;
