'use client';

import React from 'react';
import { generatePaggaText } from '../utils/pagga';

type AsciiSize = 'sm' | 'md' | 'lg';

type AsciiColorVariant = 'gradient' | 'secondary' | 'default';

interface AsciiHeaderProps {
  /** Any text. Letters, digits and spaces are drawn (letters in capitals); other characters are left out. */
  text: string;
  size?: AsciiSize;
  colorVariant?: AsciiColorVariant;
  className?: string;
}

// Hand-drawn art that takes the place of the generated letters for one text: this one has a custom Q with a backslash.
const HAND_DRAWN: Record<string, string> = {
  'Matt Quinn': `░█▄█░█▀█░▀█▀░▀█▀░░░▄▀▄░█░█░▀█▀░█▀█░█▀█
░█░█░█▀█░░█░░░█░░░░█\\█░█░█░░█░░█░█░█░█
░▀░▀░▀░▀░░▀░░░▀░░░░░▀\\░▀▀▀░▀▀▀░▀░▀░▀░▀`,
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
  const asciiArt = HAND_DRAWN[text] ?? generatePaggaText(text);

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
