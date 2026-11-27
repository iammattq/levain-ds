'use client';

import { useEnhancedTheme } from '../provider/LevainProvider';
import { forwardRef } from 'react';
import { SwatchBook } from 'lucide-react';
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
