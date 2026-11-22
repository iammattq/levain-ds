'use client';

import { forwardRef } from 'react';
import { SwatchBook } from 'lucide-react';
import { useEnhancedTheme } from '@/lib/hooks/useEnhancedTheme';
import { themeManager } from '@levain/tokens';
import { Button, type ButtonProps } from '../components/Button';

interface ThemeColorButtonProps {
  className?: string;
  variant?: ButtonProps['variant'];
}

const ThemeColorButton = forwardRef<HTMLButtonElement, ThemeColorButtonProps>(
  ({ className = '', variant = 'outline' }, ref) => {
    const { themeIndex, setThemeIndex } = useEnhancedTheme();

    const cycleTheme = () => {
      const availableIndices = themeManager.getAvailableThemeIndices();
      const currentIndex = availableIndices.indexOf(themeIndex);
      const nextIndex = (currentIndex + 1) % availableIndices.length;

      // Log for debugging
      console.log(
        `Cycling color theme from index ${themeIndex} to ${availableIndices[nextIndex]}`
      );

      setThemeIndex(availableIndices[nextIndex]);
    };

    return (
      <Button
        ref={ref}
        onClick={cycleTheme}
        variant={variant}
        className={className}
        title="Change color theme"
        aria-label="Cycle color theme"
      >
        <SwatchBook size={16} strokeWidth={1} />
      </Button>
    );
  }
);

ThemeColorButton.displayName = 'ThemeColorButton';

export default ThemeColorButton;
