import { wcagContrast } from 'culori';

/**
 * Calculate contrasting text color for a background
 * Returns white or black hex based on WCAG contrast ratio
 * @param backgroundHex - Background color in hex format
 * @returns '#ffffff' or '#000000'
 */
export function getContrastingText(backgroundHex: string): string {
  const contrastWithWhite = wcagContrast(backgroundHex, '#ffffff');
  const contrastWithBlack = wcagContrast(backgroundHex, '#000000');

  // Return whichever has better contrast (prefer white for ties)
  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000';
}

/**
 * Generate text-on-primary and text-on-accent colors
 * @param primary - Primary brand color hex
 * @param accent - Accent brand color hex
 */
export function generateContrastTextColors(
  primary: string,
  accent: string
): { textOnPrimary: string; textOnAccent: string } {
  return {
    textOnPrimary: getContrastingText(primary),
    textOnAccent: getContrastingText(accent),
  };
}
