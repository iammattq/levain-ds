/**
 * Tests for standalone token utility functions
 */
import { describe, it, expect } from '@jest/globals';
import { applyTokenMapping, generateStateOverlays } from '../tokens';
import type { SemanticToken, TokenMappingValue } from '../../types';

describe('applyTokenMapping', () => {
  const mockRamp = [
    '#ffffff', // 0
    '#fafafa', // 1
    '#f5f5f5', // 2
    '#eeeeee', // 3
    '#e0e0e0', // 4
    '#bdbdbd', // 5
    '#9e9e9e', // 6
    '#757575', // 7
    '#616161', // 8
    '#424242', // 9
    '#303030', // 10
    '#212121', // 11
    '#1a1a1a', // 12
    '#000000', // 13
  ];

  const primary = '#3b82f6';
  const accent = '#8b5cf6';

  // 9-stop mock brand ramps, indexed 0-8 (= steps 100-900). Step 500 (idx 4)
  // matches the picked color.
  const mockPrimaryRamp = [
    '#e6e8ff',
    '#c8ccff',
    '#a4abff',
    '#808bff',
    '#3b82f6',
    '#4348cc',
    '#33369c',
    '#23266c',
    '#13153e',
  ];
  const mockAccentRamp = [
    '#fbe5fd',
    '#f3bff7',
    '#e893ee',
    '#dd6bee',
    '#8b5cf6',
    '#a92cb8',
    '#7d2087',
    '#52155b',
    '#280a30',
  ];

  // Brand semantic defaults — appended to every test mapping below to
  // satisfy the `Record<SemanticToken, ...>` constraint.
  const brandDefaults = {
    primary: 'primary-500',
    accent: 'accent-500',
    'gradient-start': 'primary-300',
    'gradient-end': 'primary-700',
  } satisfies Partial<Record<SemanticToken, TokenMappingValue>>;

  describe('index-based mappings', () => {
    it('should map tokens to ramp indices', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 1,
        'surface-section': 2,
        'surface-card': 3,
        'surface-component': 4,
        'surface-subtle': 2,
        'surface-interactive': 3,
        'surface-elevated': 1,
        'surface-inverted': 12,
        'text-emphasis': 13,
        'text-default': 11,
        'text-muted': 8,
        'text-faint': 6,
        'text-disabled': 5,
        'text-inverted': 1,
        'text-link': 'primary',
        'border-subtle': 3,
        'border-default': 5,
        'border-emphasis': 7,
        'border-focus': 'primary',
        'border-decorative': 'primary',
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );

      expect(result['surface-canvas']).toBe('#fafafa');
      expect(result['surface-section']).toBe('#f5f5f5');
      expect(result['surface-card']).toBe('#eeeeee');
      expect(result['text-emphasis']).toBe('#000000');
      expect(result['text-default']).toBe('#212121');
    });

    it('should handle index 0 (pure extreme)', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 0,
        'surface-section': 0,
        'surface-card': 0,
        'surface-component': 0,
        'surface-subtle': 0,
        'surface-interactive': 0,
        'surface-elevated': 0,
        'surface-inverted': 0,
        'text-emphasis': 0,
        'text-default': 0,
        'text-muted': 0,
        'text-faint': 0,
        'text-disabled': 0,
        'text-inverted': 0,
        'text-link': 0,
        'border-subtle': 0,
        'border-default': 0,
        'border-emphasis': 0,
        'border-focus': 0,
        'border-decorative': 0,
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );
      expect(result['surface-canvas']).toBe('#ffffff');
    });

    it('should handle index 13 (opposite extreme)', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 13,
        'surface-section': 13,
        'surface-card': 13,
        'surface-component': 13,
        'surface-subtle': 13,
        'surface-interactive': 13,
        'surface-elevated': 13,
        'surface-inverted': 13,
        'text-emphasis': 13,
        'text-default': 13,
        'text-muted': 13,
        'text-faint': 13,
        'text-disabled': 13,
        'text-inverted': 13,
        'text-link': 13,
        'border-subtle': 13,
        'border-default': 13,
        'border-emphasis': 13,
        'border-focus': 13,
        'border-decorative': 13,
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );
      expect(result['text-emphasis']).toBe('#000000');
    });
  });

  describe('brand color mappings', () => {
    it('should map primary tokens to primary color', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 1,
        'surface-section': 2,
        'surface-card': 3,
        'surface-component': 4,
        'surface-subtle': 2,
        'surface-interactive': 3,
        'surface-elevated': 1,
        'surface-inverted': 12,
        'text-emphasis': 13,
        'text-default': 11,
        'text-muted': 8,
        'text-faint': 6,
        'text-disabled': 5,
        'text-inverted': 1,
        'text-link': 'primary',
        'border-subtle': 3,
        'border-default': 5,
        'border-emphasis': 7,
        'border-focus': 'primary',
        'border-decorative': 'primary',
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );

      expect(result['text-link']).toBe(primary);
      expect(result['border-focus']).toBe(primary);
      expect(result['border-decorative']).toBe(primary);
    });

    it('should map accent tokens to accent color', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 1,
        'surface-section': 2,
        'surface-card': 3,
        'surface-component': 4,
        'surface-subtle': 2,
        'surface-interactive': 3,
        'surface-elevated': 1,
        'surface-inverted': 12,
        'text-emphasis': 13,
        'text-default': 11,
        'text-muted': 8,
        'text-faint': 6,
        'text-disabled': 5,
        'text-inverted': 1,
        'text-link': 'accent',
        'border-subtle': 3,
        'border-default': 5,
        'border-emphasis': 7,
        'border-focus': 'accent',
        'border-decorative': 'accent',
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );

      expect(result['text-link']).toBe(accent);
      expect(result['border-focus']).toBe(accent);
      expect(result['border-decorative']).toBe(accent);
    });
  });

  describe('mixed mappings', () => {
    it('should handle mixed index and brand color mappings', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 1,
        'surface-section': 2,
        'surface-card': 'primary',
        'surface-component': 4,
        'surface-subtle': 'accent',
        'surface-interactive': 3,
        'surface-elevated': 1,
        'surface-inverted': 12,
        'text-emphasis': 13,
        'text-default': 11,
        'text-muted': 8,
        'text-faint': 6,
        'text-disabled': 5,
        'text-inverted': 1,
        'text-link': 'primary',
        'border-subtle': 3,
        'border-default': 5,
        'border-emphasis': 7,
        'border-focus': 'accent',
        'border-decorative': 'primary',
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );

      expect(result['surface-canvas']).toBe('#fafafa');
      expect(result['surface-card']).toBe(primary);
      expect(result['surface-subtle']).toBe(accent);
      expect(result['text-link']).toBe(primary);
      expect(result['border-focus']).toBe(accent);
    });
  });

  describe('return type', () => {
    it('should return an object with string keys and string values', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 1,
        'surface-section': 2,
        'surface-card': 3,
        'surface-component': 4,
        'surface-subtle': 2,
        'surface-interactive': 3,
        'surface-elevated': 1,
        'surface-inverted': 12,
        'text-emphasis': 13,
        'text-default': 11,
        'text-muted': 8,
        'text-faint': 6,
        'text-disabled': 5,
        'text-inverted': 1,
        'text-link': 'primary',
        'border-subtle': 3,
        'border-default': 5,
        'border-emphasis': 7,
        'border-focus': 'primary',
        'border-decorative': 'primary',
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );

      expect(typeof result).toBe('object');
      for (const [key, value] of Object.entries(result)) {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      }
    });

    it('should include all tokens from the mapping', () => {
      const mapping: Record<SemanticToken, TokenMappingValue> = {
        'surface-canvas': 1,
        'surface-section': 2,
        'surface-card': 3,
        'surface-component': 4,
        'surface-subtle': 2,
        'surface-interactive': 3,
        'surface-elevated': 1,
        'surface-inverted': 12,
        'text-emphasis': 13,
        'text-default': 11,
        'text-muted': 8,
        'text-faint': 6,
        'text-disabled': 5,
        'text-inverted': 1,
        'text-link': 'primary',
        'border-subtle': 3,
        'border-default': 5,
        'border-emphasis': 7,
        'border-focus': 'primary',
        'border-decorative': 'primary',
        ...brandDefaults,
      };

      const result = applyTokenMapping(
        mockRamp,
        mapping,
        primary,
        accent,
        mockPrimaryRamp,
        mockAccentRamp
      );

      expect(Object.keys(result).length).toBe(Object.keys(mapping).length);
      for (const token of Object.keys(mapping)) {
        expect(result[token]).toBeDefined();
      }
    });
  });
});

describe('generateStateOverlays', () => {
  describe('light mode', () => {
    it('should generate hover state with intensity (base value)', () => {
      const result = generateStateOverlays(6, 'light');
      expect(result.hover).toBe('oklch(0% 0 0 / 6%)');
    });

    it('should generate focus state with intensity + 2', () => {
      const result = generateStateOverlays(6, 'light');
      expect(result.focus).toBe('oklch(0% 0 0 / 8%)'); // 6 + 2 = 8
    });

    it('should generate active state with intensity + 4', () => {
      const result = generateStateOverlays(6, 'light');
      expect(result.active).toBe('oklch(0% 0 0 / 10%)'); // 6 + 4 = 10
    });

    it('should use black (L:0) for light mode overlays', () => {
      const result = generateStateOverlays(5, 'light');
      expect(result.hover).toMatch(/^oklch\(0%/);
      expect(result.focus).toMatch(/^oklch\(0%/);
      expect(result.active).toMatch(/^oklch\(0%/);
    });
  });

  describe('dark mode', () => {
    it('should generate hover state with intensity (base value)', () => {
      const result = generateStateOverlays(6, 'dark');
      expect(result.hover).toBe('oklch(100% 0 0 / 6%)');
    });

    it('should generate focus state with intensity + 2', () => {
      const result = generateStateOverlays(6, 'dark');
      expect(result.focus).toBe('oklch(100% 0 0 / 8%)'); // 6 + 2 = 8
    });

    it('should generate active state with intensity + 4', () => {
      const result = generateStateOverlays(6, 'dark');
      expect(result.active).toBe('oklch(100% 0 0 / 10%)'); // 6 + 4 = 10
    });

    it('should use white (L:100) for dark mode overlays', () => {
      const result = generateStateOverlays(5, 'dark');
      expect(result.hover).toMatch(/^oklch\(100%/);
      expect(result.focus).toMatch(/^oklch\(100%/);
      expect(result.active).toMatch(/^oklch\(100%/);
    });
  });

  describe('intensity variations', () => {
    it('should handle low intensity values', () => {
      const result = generateStateOverlays(2, 'light');
      expect(result.hover).toBe('oklch(0% 0 0 / 2%)');
      expect(result.focus).toBe('oklch(0% 0 0 / 4%)'); // 2 + 2 = 4
      expect(result.active).toBe('oklch(0% 0 0 / 6%)'); // 2 + 4 = 6
    });

    it('should handle high intensity values', () => {
      const result = generateStateOverlays(10, 'light');
      expect(result.hover).toBe('oklch(0% 0 0 / 10%)');
      expect(result.focus).toBe('oklch(0% 0 0 / 12%)'); // 10 + 2 = 12
      expect(result.active).toBe('oklch(0% 0 0 / 14%)'); // 10 + 4 = 14
    });

    it('should handle intensity=4 for dark mode', () => {
      const result = generateStateOverlays(4, 'dark');
      expect(result.hover).toBe('oklch(100% 0 0 / 4%)');
      expect(result.focus).toBe('oklch(100% 0 0 / 6%)'); // 4 + 2 = 6
      expect(result.active).toBe('oklch(100% 0 0 / 8%)'); // 4 + 4 = 8
    });
  });

  describe('return type', () => {
    it('should return StateColors object with hover, focus, and active', () => {
      const result = generateStateOverlays(4, 'light');
      expect(result).toHaveProperty('hover');
      expect(result).toHaveProperty('focus');
      expect(result).toHaveProperty('active');
    });

    it('should return OKLCH color strings', () => {
      const result = generateStateOverlays(4, 'light');
      const oklchPattern = /^oklch\(\d+% 0 0 \/ [\d.]+%\)$/;
      expect(result.hover).toMatch(oklchPattern);
      expect(result.focus).toMatch(oklchPattern);
      expect(result.active).toMatch(oklchPattern);
    });
  });
});
