import {
  generatePaggaText,
  isPaggaCharSupported,
  getSupportedPaggaChars,
} from '../../utils/pagga';

describe('Pagga Font Utility', () => {
  describe('generatePaggaText', () => {
    it('generates 3-line ASCII art for single character', () => {
      const result = generatePaggaText('A');
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('░█▀█');
    });

    it('generates ASCII art for multiple characters', () => {
      const result = generatePaggaText('HI');
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      // H + I should be concatenated on each line
      expect(lines[0]).toBe('░█░█░▀█▀');
      expect(lines[1]).toBe('░█▀█░░█░');
      expect(lines[2]).toBe('░▀░▀░▀▀▀');
    });

    it('converts lowercase to uppercase', () => {
      const lower = generatePaggaText('hello');
      const upper = generatePaggaText('HELLO');

      expect(lower).toBe(upper);
    });

    it('handles spaces correctly', () => {
      const result = generatePaggaText('A B');
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      // Space character is 3 chars wide
      expect(lines[0]).toContain('░░░');
    });

    it('handles numbers', () => {
      const result = generatePaggaText('123');
      const lines = result.split('\n');

      expect(lines).toHaveLength(3);
      expect(result).toContain('░▀█░'); // 1
      expect(result).toContain('░▀▀█'); // 2 or 3
    });

    it('skips unsupported characters', () => {
      const withPunctuation = generatePaggaText('A!B');
      const withoutPunctuation = generatePaggaText('AB');

      expect(withPunctuation).toBe(withoutPunctuation);
    });

    it('returns empty lines for empty string', () => {
      const result = generatePaggaText('');

      expect(result).toBe('\n\n');
    });

    it('generates consistent output for known words', () => {
      const cardopia = generatePaggaText('CARDOPIA');
      const lines = cardopia.split('\n');

      expect(lines).toHaveLength(3);
      // First line should start with C
      expect(lines[0]).toMatch(/^░█▀▀/);
      // Should end with A
      expect(lines[0]).toMatch(/░█▀█$/);
    });
  });

  describe('isPaggaCharSupported', () => {
    it('returns true for uppercase letters', () => {
      expect(isPaggaCharSupported('A')).toBe(true);
      expect(isPaggaCharSupported('Z')).toBe(true);
      expect(isPaggaCharSupported('M')).toBe(true);
    });

    it('returns true for lowercase letters (converted internally)', () => {
      expect(isPaggaCharSupported('a')).toBe(true);
      expect(isPaggaCharSupported('z')).toBe(true);
    });

    it('returns true for digits', () => {
      expect(isPaggaCharSupported('0')).toBe(true);
      expect(isPaggaCharSupported('9')).toBe(true);
      expect(isPaggaCharSupported('5')).toBe(true);
    });

    it('returns true for space', () => {
      expect(isPaggaCharSupported(' ')).toBe(true);
    });

    it('returns false for unsupported characters', () => {
      expect(isPaggaCharSupported('!')).toBe(false);
      expect(isPaggaCharSupported('@')).toBe(false);
      expect(isPaggaCharSupported('-')).toBe(false);
      expect(isPaggaCharSupported('.')).toBe(false);
    });
  });

  describe('getSupportedPaggaChars', () => {
    it('returns array of supported characters', () => {
      const chars = getSupportedPaggaChars();

      expect(Array.isArray(chars)).toBe(true);
      expect(chars.length).toBeGreaterThan(0);
    });

    it('includes all letters A-Z', () => {
      const chars = getSupportedPaggaChars();

      for (let i = 65; i <= 90; i++) {
        expect(chars).toContain(String.fromCharCode(i));
      }
    });

    it('includes digits 0-9', () => {
      const chars = getSupportedPaggaChars();

      for (let i = 0; i <= 9; i++) {
        expect(chars).toContain(String(i));
      }
    });

    it('includes space', () => {
      const chars = getSupportedPaggaChars();

      expect(chars).toContain(' ');
    });
  });
});
