import { getContrastingText, generateContrastTextColors } from '../contrast';

describe('getContrastingText', () => {
  describe('dark backgrounds should return white', () => {
    it('returns white for pure black', () => {
      expect(getContrastingText('#000000')).toBe('#ffffff');
    });

    it('returns white for very dark gray', () => {
      expect(getContrastingText('#1a1a1a')).toBe('#ffffff');
    });

    it('returns white for dark navy', () => {
      expect(getContrastingText('#000080')).toBe('#ffffff');
    });

    it('returns white for dark green', () => {
      expect(getContrastingText('#006400')).toBe('#ffffff');
    });

    it('returns white for dark red', () => {
      expect(getContrastingText('#8b0000')).toBe('#ffffff');
    });

    it('returns white for dark purple', () => {
      expect(getContrastingText('#4b0082')).toBe('#ffffff');
    });

    it('returns white for dark brown', () => {
      expect(getContrastingText('#654321')).toBe('#ffffff');
    });
  });

  describe('light backgrounds should return black', () => {
    it('returns black for pure white', () => {
      expect(getContrastingText('#ffffff')).toBe('#000000');
    });

    it('returns black for very light gray', () => {
      expect(getContrastingText('#f0f0f0')).toBe('#000000');
    });

    it('returns black for light yellow', () => {
      expect(getContrastingText('#ffff00')).toBe('#000000');
    });

    it('returns black for light cyan', () => {
      expect(getContrastingText('#00ffff')).toBe('#000000');
    });

    it('returns black for light pink', () => {
      expect(getContrastingText('#ffb6c1')).toBe('#000000');
    });

    it('returns black for light lavender', () => {
      expect(getContrastingText('#e6e6fa')).toBe('#000000');
    });

    it('returns black for light peach', () => {
      expect(getContrastingText('#ffdab9')).toBe('#000000');
    });
  });

  describe('mid-range colors', () => {
    it('handles mid-gray', () => {
      // Mid-gray has better contrast with black based on WCAG
      expect(getContrastingText('#808080')).toBe('#000000');
    });

    it('handles medium blue', () => {
      expect(getContrastingText('#0000ff')).toBe('#ffffff');
    });

    it('handles medium green', () => {
      expect(getContrastingText('#00ff00')).toBe('#000000');
    });

    it('handles medium red', () => {
      // Pure red is bright, better contrast with black
      expect(getContrastingText('#ff0000')).toBe('#000000');
    });
  });

  describe('saturated colors', () => {
    it('handles saturated blue', () => {
      expect(getContrastingText('#0066cc')).toBe('#ffffff');
    });

    it('handles saturated orange', () => {
      expect(getContrastingText('#ff6600')).toBe('#000000');
    });

    it('handles saturated teal', () => {
      expect(getContrastingText('#008080')).toBe('#ffffff');
    });

    it('handles saturated magenta', () => {
      // Magenta has better contrast with black due to its brightness
      expect(getContrastingText('#ff00ff')).toBe('#000000');
    });

    it('handles saturated lime', () => {
      expect(getContrastingText('#00ff00')).toBe('#000000');
    });
  });

  describe('edge cases', () => {
    it('handles 3-character hex codes (black)', () => {
      expect(getContrastingText('#000')).toBe('#ffffff');
    });

    it('handles 3-character hex codes (white)', () => {
      expect(getContrastingText('#fff')).toBe('#000000');
    });

    it('handles uppercase hex codes', () => {
      expect(getContrastingText('#FFFFFF')).toBe('#000000');
      expect(getContrastingText('#000000')).toBe('#ffffff');
    });

    it('handles mid-gray correctly based on WCAG contrast', () => {
      // Mid-gray (#808080) has better contrast with black than white
      // This is based on actual WCAG contrast calculations
      const result = getContrastingText('#808080');
      expect(result).toBe('#000000');
    });
  });

  describe('common brand colors', () => {
    it('handles GitHub black', () => {
      expect(getContrastingText('#24292e')).toBe('#ffffff');
    });

    it('handles Twitter blue', () => {
      expect(getContrastingText('#1da1f2')).toBe('#000000');
    });

    it('handles Facebook blue', () => {
      // Facebook blue is bright enough for black text
      expect(getContrastingText('#1877f2')).toBe('#000000');
    });

    it('handles Spotify green', () => {
      expect(getContrastingText('#1db954')).toBe('#000000');
    });

    it('handles YouTube red', () => {
      // Pure red is bright, better contrast with black
      expect(getContrastingText('#ff0000')).toBe('#000000');
    });

    it('handles LinkedIn blue', () => {
      expect(getContrastingText('#0a66c2')).toBe('#ffffff');
    });
  });
});

describe('generateContrastTextColors', () => {
  describe('basic functionality', () => {
    it('generates text colors for dark primary and dark accent', () => {
      const result = generateContrastTextColors('#1a1a1a', '#2a2a2a');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#ffffff',
      });
    });

    it('generates text colors for light primary and light accent', () => {
      const result = generateContrastTextColors('#f0f0f0', '#e0e0e0');
      expect(result).toEqual({
        textOnPrimary: '#000000',
        textOnAccent: '#000000',
      });
    });

    it('generates text colors for dark primary and light accent', () => {
      const result = generateContrastTextColors('#1a1a1a', '#f0f0f0');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('generates text colors for light primary and dark accent', () => {
      const result = generateContrastTextColors('#f0f0f0', '#1a1a1a');
      expect(result).toEqual({
        textOnPrimary: '#000000',
        textOnAccent: '#ffffff',
      });
    });
  });

  describe('black and white extremes', () => {
    it('handles pure black primary and white accent', () => {
      const result = generateContrastTextColors('#000000', '#ffffff');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('handles pure white primary and black accent', () => {
      const result = generateContrastTextColors('#ffffff', '#000000');
      expect(result).toEqual({
        textOnPrimary: '#000000',
        textOnAccent: '#ffffff',
      });
    });

    it('handles both black', () => {
      const result = generateContrastTextColors('#000000', '#000000');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#ffffff',
      });
    });

    it('handles both white', () => {
      const result = generateContrastTextColors('#ffffff', '#ffffff');
      expect(result).toEqual({
        textOnPrimary: '#000000',
        textOnAccent: '#000000',
      });
    });
  });

  describe('saturated color combinations', () => {
    it('handles saturated blue primary and orange accent', () => {
      const result = generateContrastTextColors('#0066cc', '#ff6600');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('handles saturated purple primary and yellow accent', () => {
      const result = generateContrastTextColors('#6a0dad', '#ffff00');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('handles saturated teal primary and coral accent', () => {
      const result = generateContrastTextColors('#008080', '#ff7f50');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('handles bright green primary and bright magenta accent', () => {
      const result = generateContrastTextColors('#00ff00', '#ff00ff');
      expect(result).toEqual({
        textOnPrimary: '#000000',
        textOnAccent: '#000000', // Bright magenta has better contrast with black
      });
    });
  });

  describe('real-world brand color combinations', () => {
    it('handles GitHub colors', () => {
      const result = generateContrastTextColors('#24292e', '#0366d6');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#ffffff',
      });
    });

    it('handles Material Design indigo and pink', () => {
      const result = generateContrastTextColors('#3f51b5', '#e91e63');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000', // Pink is bright, better with black text
      });
    });

    it('handles Stripe blue and green', () => {
      const result = generateContrastTextColors('#635bff', '#00d924');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });
  });

  describe('edge cases and 3-character hex codes', () => {
    it('handles 3-character hex codes', () => {
      const result = generateContrastTextColors('#000', '#fff');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('handles uppercase hex codes', () => {
      const result = generateContrastTextColors('#1A1A1A', '#F0F0F0');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });

    it('handles mixed case hex codes', () => {
      const result = generateContrastTextColors('#1a1A1a', '#F0f0F0');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
      });
    });
  });

  describe('monochromatic schemes', () => {
    it('handles dark monochromatic scheme', () => {
      const result = generateContrastTextColors('#1a1a1a', '#333333');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#ffffff',
      });
    });

    it('handles light monochromatic scheme', () => {
      const result = generateContrastTextColors('#f0f0f0', '#e0e0e0');
      expect(result).toEqual({
        textOnPrimary: '#000000',
        textOnAccent: '#000000',
      });
    });

    it('handles mid-tone monochromatic scheme', () => {
      const result = generateContrastTextColors('#707070', '#909090');
      expect(result).toEqual({
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000', // #909090 is lighter, better with black
      });
    });
  });
});
