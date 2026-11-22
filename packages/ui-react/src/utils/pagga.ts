/**
 * Pagga ASCII Art Font Utility
 *
 * Generates ASCII art text using the Pagga font (from figlet/toilet).
 *
 * The glyphs are from "Pagga" by Sam Hocevar, a toilet font, WTFPL-2 (see LICENSES/WTFPL.txt at the
 * repository root). Copy: https://github.com/xero/figlet-fonts/blob/master/pagga.tlf
 *
 * Each character is 4 columns wide and 3 rows tall.
 * Characters are stored as [line1, line2, line3] tuples.
 */

// Pagga font character definitions (A-Z, 0-9, space, and common punctuation)
const PAGGA_CHARS: Record<string, [string, string, string]> = {
  A: ['░█▀█', '░█▀█', '░▀░▀'],
  B: ['░█▀▄', '░█▀▄', '░▀▀░'],
  C: ['░█▀▀', '░█░░', '░▀▀▀'],
  D: ['░█▀▄', '░█░█', '░▀▀░'],
  E: ['░█▀▀', '░█▀▀', '░▀▀▀'],
  F: ['░█▀▀', '░█▀▀', '░▀░░'],
  G: ['░█▀▀', '░█░█', '░▀▀▀'],
  H: ['░█░█', '░█▀█', '░▀░▀'],
  I: ['░▀█▀', '░░█░', '░▀▀▀'],
  J: ['░▀▀█', '░░░█', '░▀▀░'],
  K: ['░█░█', '░█▀▄', '░▀░▀'],
  L: ['░█░░', '░█░░', '░▀▀▀'],
  M: ['░█▄█', '░█░█', '░▀░▀'],
  N: ['░█▀█', '░█░█', '░▀░▀'],
  O: ['░█▀█', '░█░█', '░▀▀▀'],
  P: ['░█▀█', '░█▀▀', '░▀░░'],
  Q: ['░█▀█', '░█░█', '░▀▀▄'],
  R: ['░█▀▄', '░█▀▄', '░▀░▀'],
  S: ['░█▀▀', '░▀▀█', '░▀▀▀'],
  T: ['░▀█▀', '░░█░', '░░▀░'],
  U: ['░█░█', '░█░█', '░▀▀▀'],
  V: ['░█░█', '░▀▄▀', '░░▀░'],
  W: ['░█░█', '░█▄█', '░▀░▀'],
  X: ['░█░█', '░▄▀▄', '░▀░▀'],
  Y: ['░█░█', '░░█░', '░░▀░'],
  Z: ['░▀▀█', '░▄▀░', '░▀▀▀'],
  '0': ['░█▀█', '░█░█', '░▀▀▀'],
  '1': ['░▀█░', '░░█░', '░▀▀▀'],
  '2': ['░▀▀█', '░█▀░', '░▀▀▀'],
  '3': ['░▀▀█', '░░▀█', '░▀▀░'],
  '4': ['░█░█', '░░▀█', '░░░▀'],
  '5': ['░█▀▀', '░▀▀█', '░▀▀▀'],
  '6': ['░▄▀▀', '░█▀█', '░░▀░'],
  '7': ['░▀▀█', '░▄▀░', '░▀░░'],
  '8': ['░▄▀▄', '░▄▀▄', '░░▀░'],
  '9': ['░▄▀▄', '░░▀█', '░▀▀░'],
  ' ': ['░░░', '░░░', '░░░'],
};

/**
 * Generate ASCII art text using the Pagga font.
 *
 * @param text - The text to convert to ASCII art (A-Z, 0-9, space supported)
 * @returns A 3-line ASCII art string
 *
 * @example
 * ```ts
 * const art = generatePaggaText('HELLO');
 * // Returns:
 * // ░█░█░█▀▀░█░░░█░░░█▀█
 * // ░█▀█░█▀▀░█░░░█░░░█░█
 * // ░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀
 * ```
 */
export function generatePaggaText(text: string): string {
  const upper = text.toUpperCase();
  const lines: [string[], string[], string[]] = [[], [], []];

  for (const char of upper) {
    const charDef = PAGGA_CHARS[char];
    if (charDef) {
      lines[0].push(charDef[0]);
      lines[1].push(charDef[1]);
      lines[2].push(charDef[2]);
    }
  }

  return lines.map((line) => line.join('')).join('\n');
}

/**
 * Check if a character is supported by the Pagga font.
 */
export function isPaggaCharSupported(char: string): boolean {
  return char.toUpperCase() in PAGGA_CHARS;
}

/**
 * Get all supported Pagga characters.
 */
export function getSupportedPaggaChars(): string[] {
  return Object.keys(PAGGA_CHARS);
}
