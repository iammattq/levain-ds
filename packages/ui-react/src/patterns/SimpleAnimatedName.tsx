'use client';

import React, { useState, useEffect } from 'react';
import { useEnhancedTheme } from '@/lib/hooks/useEnhancedTheme';
import { themeManager } from '@levain/tokens';

interface SimpleAnimatedNameProps {
  name?: string;
  className?: string;
}

const SimpleAnimatedName = ({
  name = 'Matt Quinn',
  className = '',
}: SimpleAnimatedNameProps) => {
  const enhancedTheme = useEnhancedTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [availableIndices, setAvailableIndices] = useState<number[]>([]);

  // Create the gradient based on theme colors
  const createGradient = () => {
    return `linear-gradient(135deg, var(--color-base), var(--color-accent))`;
  };

  // Load available themes
  useEffect(() => {
    try {
      // Get available theme indices
      const indices = themeManager.getAvailableThemeIndices();
      setAvailableIndices(indices);
    } catch (error) {
      console.error('Error loading theme indices:', error);
    }
  }, [enhancedTheme]);

  // Handle keyboard events for changing colors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only change colors when the name is hovered
      if (!isHovered) return;

      // Space key to change colors
      if (e.code === 'Space') {
        e.preventDefault();

        if (enhancedTheme && availableIndices.length > 0) {
          // Change to a random available theme index
          const currentIndex = enhancedTheme.themeIndex;

          // Only proceed if we have more than one theme
          if (availableIndices.length > 1) {
            // Filter out the current index to get possible new indices
            const possibleIndices = availableIndices.filter(
              (idx) => idx !== currentIndex
            );

            // Pick a random index from the available ones
            const randomPosition = Math.floor(
              Math.random() * possibleIndices.length
            );
            const newIndex = possibleIndices[randomPosition];

            enhancedTheme.setThemeIndex(newIndex);
          }
        }
      }

      // 'S' key to save the current color preference permanently
      if (e.code === 'KeyS') {
        e.preventDefault();
        if (enhancedTheme) {
          enhancedTheme.saveThemePreference();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHovered, enhancedTheme, availableIndices]);

  return (
    <span
      className={`${className} animated-name inline-block cursor-pointer`}
      style={{
        backgroundImage: createGradient(),
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'gradientMove 6s ease infinite',
        transition: 'all 0.3s ease',
        color: 'transparent', // Fallback for browsers that don't support background-clip: text
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Press space to change colors when hovering, press 'S' to save your favorite color"
    >
      {name}
    </span>
  );
};

export default SimpleAnimatedName;
