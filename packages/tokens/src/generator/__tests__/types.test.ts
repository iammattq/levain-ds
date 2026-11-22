/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import type {
  ElevationColors,
  ElevationStyle,
  ElevationStyles,
  ThemeInputV2,
} from '../types';

describe('Theme V2 Types - Elevation', () => {
  describe('ElevationColors interface', () => {
    it('should have source, light, and dark properties', () => {
      const colors: ElevationColors = {
        source: 'accent',
        light: { low: 5, default: 10, high: 15 },
        dark: { low: 5, default: 10, high: 15 },
      };

      expect(colors).toHaveProperty('source');
      expect(colors).toHaveProperty('light');
      expect(colors).toHaveProperty('dark');
    });

    it('should have light property with low, default, high number properties', () => {
      const colors: ElevationColors = {
        source: 'primary',
        light: { low: 3, default: 8, high: 12 },
        dark: { low: 5, default: 10, high: 15 },
      };

      expect(typeof colors.light.low).toBe('number');
      expect(typeof colors.light.default).toBe('number');
      expect(typeof colors.light.high).toBe('number');
    });

    it('should have dark property with low, default, high number properties', () => {
      const colors: ElevationColors = {
        source: 'accent',
        light: { low: 5, default: 10, high: 15 },
        dark: { low: 4, default: 9, high: 14 },
      };

      expect(typeof colors.dark.low).toBe('number');
      expect(typeof colors.dark.default).toBe('number');
      expect(typeof colors.dark.high).toBe('number');
    });

    it('should accept primary or accent as source', () => {
      const primaryColors: ElevationColors = {
        source: 'primary',
        light: { low: 5, default: 10, high: 15 },
        dark: { low: 5, default: 10, high: 15 },
      };

      const accentColors: ElevationColors = {
        source: 'accent',
        light: { low: 5, default: 10, high: 15 },
        dark: { low: 5, default: 10, high: 15 },
      };

      expect(primaryColors.source).toBe('primary');
      expect(accentColors.source).toBe('accent');
    });
  });

  describe('ElevationStyle interface', () => {
    it('should have offsetX, offsetY, blur, and intensity properties', () => {
      const style: ElevationStyle = {
        offsetX: -4,
        offsetY: 4,
        blur: 0,
        intensity: 'default',
      };

      expect(style).toHaveProperty('offsetX');
      expect(style).toHaveProperty('offsetY');
      expect(style).toHaveProperty('blur');
      expect(style).toHaveProperty('intensity');
    });

    it('should have numeric offsetX, offsetY, and blur', () => {
      const style: ElevationStyle = {
        offsetX: -3,
        offsetY: 3,
        blur: 2,
        intensity: 'high',
      };

      expect(typeof style.offsetX).toBe('number');
      expect(typeof style.offsetY).toBe('number');
      expect(typeof style.blur).toBe('number');
    });

    it('should accept low, default, or high as intensity', () => {
      const lowStyle: ElevationStyle = {
        offsetX: -2,
        offsetY: 2,
        blur: 0,
        intensity: 'low',
      };
      const defaultStyle: ElevationStyle = {
        offsetX: -4,
        offsetY: 4,
        blur: 0,
        intensity: 'default',
      };
      const highStyle: ElevationStyle = {
        offsetX: -3,
        offsetY: 3,
        blur: 0,
        intensity: 'high',
      };

      expect(lowStyle.intensity).toBe('low');
      expect(defaultStyle.intensity).toBe('default');
      expect(highStyle.intensity).toBe('high');
    });
  });

  describe('ElevationStyles interface', () => {
    it('should have card and button properties', () => {
      const styles: ElevationStyles = {
        card: { offsetX: -4, offsetY: 4, blur: 0, intensity: 'default' },
        button: { offsetX: -3, offsetY: 3, blur: 0, intensity: 'high' },
      };

      expect(styles).toHaveProperty('card');
      expect(styles).toHaveProperty('button');
    });
  });

  describe('ThemeInputV2 interface', () => {
    it('should accept optional partial ElevationColors in elevation field', () => {
      // Full elevation config
      const fullInput: ThemeInputV2 = {
        name: 'test',
        primary: '#000000',
        accent: '#ffffff',
        elevation: {
          source: 'primary',
          light: { low: 3, default: 8, high: 12 },
          dark: { low: 4, default: 9, high: 14 },
        },
      };

      // Partial elevation config (only source)
      const partialInput: ThemeInputV2 = {
        name: 'test',
        primary: '#000000',
        accent: '#ffffff',
        elevation: {
          source: 'accent',
        },
      };

      // No elevation config
      const noElevationInput: ThemeInputV2 = {
        name: 'test',
        primary: '#000000',
        accent: '#ffffff',
      };

      expect(fullInput.elevation?.source).toBe('primary');
      expect(partialInput.elevation?.source).toBe('accent');
      expect(noElevationInput.elevation).toBeUndefined();
    });
  });
});
