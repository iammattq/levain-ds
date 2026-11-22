'use client';

import React from 'react';
import { generatePaggaText } from '../utils/pagga';

type AsciiText =
  | 'Matt Quinn'
  | 'Work'
  | 'Projects'
  | 'Photos'
  | 'Journal'
  | 'Dashboard'
  | 'Admin'
  | 'Sign In'
  | 'Themes'
  | 'Design System'
  | 'Button Studio'
  | 'Theme Builder'
  | 'Typography'
  | 'Surfaces'
  | 'ASCII Lab'
  | 'Dot Matrix'
  | 'Components';

type AsciiSize = 'sm' | 'md' | 'lg';

type AsciiColorVariant = 'gradient' | 'secondary' | 'default';

interface AsciiHeaderProps {
  text: AsciiText;
  size?: AsciiSize;
  colorVariant?: AsciiColorVariant;
  className?: string;
}

// Pre-generated ASCII art for supported text values
// Note: "Matt Quinn" has custom Q character with backslash for style
const ASCII_ART: Record<AsciiText, string> = {
  'Matt Quinn': `░█▄█░█▀█░▀█▀░▀█▀░░░▄▀▄░█░█░▀█▀░█▀█░█▀█
░█░█░█▀█░░█░░░█░░░░█\\█░█░█░░█░░█░█░█░█
░▀░▀░▀░▀░░▀░░░▀░░░░░▀\\░▀▀▀░▀▀▀░▀░▀░▀░▀`,
  Work: generatePaggaText('WORK'),
  Projects: generatePaggaText('PROJECTS'),
  Photos: generatePaggaText('PHOTOS'),
  Journal: generatePaggaText('JOURNAL'),
  Dashboard: generatePaggaText('DASHBOARD'),
  Admin: generatePaggaText('ADMIN'),
  'Sign In': generatePaggaText('SIGN IN'),
  Themes: generatePaggaText('THEMES'),
  'Design System': generatePaggaText('DESIGN SYSTEM'),
  'Button Studio': generatePaggaText('BUTTON STUDIO'),
  'Theme Builder': generatePaggaText('THEME BUILDER'),
  Typography: generatePaggaText('TYPOGRAPHY'),
  Surfaces: generatePaggaText('SURFACES'),
  'ASCII Lab': generatePaggaText('ASCII LAB'),
  'Dot Matrix': generatePaggaText('DOT MATRIX'),
  Components: generatePaggaText('COMPONENTS'),
};

const SIZE_CLASSES: Record<AsciiSize, string> = {
  sm: 'text-[0.35rem] leading-none sm:text-[0.4rem] md:text-[0.5rem]',
  md: 'text-[0.5rem] leading-none sm:text-xs md:text-sm',
  lg: 'text-xs leading-none sm:text-sm md:text-base lg:text-lg',
};

const AsciiHeader = ({
  text,
  size = 'lg',
  colorVariant = 'gradient',
  className = '',
}: AsciiHeaderProps) => {
  const asciiArt = ASCII_ART[text];

  const colorStyles =
    colorVariant === 'gradient'
      ? {
          backgroundImage:
            'linear-gradient(135deg, var(--color-base), var(--color-accent))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent',
        }
      : colorVariant === 'default'
        ? {
            color: 'var(--color-text-default)',
          }
        : {
            color: 'var(--color-text-muted)',
          };

  return (
    <div role="heading" aria-level={1} aria-label={text} className={className}>
      <pre
        className={`font-mono ${SIZE_CLASSES[size]} select-none`}
        style={{
          ...colorStyles,
          lineHeight: 1.1,
          display: 'block',
        }}
        aria-hidden="true"
      >
        {asciiArt}
      </pre>
    </div>
  );
};

export default AsciiHeader;
