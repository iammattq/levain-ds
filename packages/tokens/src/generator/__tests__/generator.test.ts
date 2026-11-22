import { ThemeGeneratorV2, themeGeneratorV2 } from '../generator';
import type { ThemeInputV2 } from '../types';
import { DEFAULT_STATE_PARAMS, DEFAULT_ELEVATION_STYLES } from '../defaults';

describe('ThemeGeneratorV2', () => {
  let generator: ThemeGeneratorV2;

  beforeEach(() => {
    generator = new ThemeGeneratorV2();
  });

  describe('generate() method', () => {
    it('returns object with name, light, and dark modes', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result).toHaveProperty('name', 'Test Theme');
      expect(result).toHaveProperty('light');
      expect(result).toHaveProperty('dark');
    });

    it('each mode has primary, accent, surfaces, tokens, actions, states, textOnPrimary, textOnAccent', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // Check light mode
      expect(result.light).toHaveProperty('primary', '#3b82f6');
      expect(result.light).toHaveProperty('accent', '#8b5cf6');
      expect(result.light).toHaveProperty('surfaces');
      expect(result.light).toHaveProperty('tokens');
      expect(result.light).toHaveProperty('actions');
      expect(result.light).toHaveProperty('states');
      expect(result.light).toHaveProperty('textOnPrimary');
      expect(result.light).toHaveProperty('textOnAccent');

      // Check dark mode
      expect(result.dark).toHaveProperty('primary', '#3b82f6');
      expect(result.dark).toHaveProperty('accent', '#8b5cf6');
      expect(result.dark).toHaveProperty('surfaces');
      expect(result.dark).toHaveProperty('tokens');
      expect(result.dark).toHaveProperty('actions');
      expect(result.dark).toHaveProperty('states');
      expect(result.dark).toHaveProperty('textOnPrimary');
      expect(result.dark).toHaveProperty('textOnAccent');
    });

    it('surfaces array has exactly 26 items (indices 0-25) for unified ramp', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light.surfaces).toHaveLength(26);
      expect(result.dark.surfaces).toHaveLength(26);
    });

    it('both modes share the same unified ramp', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // With unified ramp, both modes get the exact same surface ramp
      expect(result.light.surfaces).toEqual(result.dark.surfaces);
    });

    it('unified ramp has dark colors at low indices and light colors at high indices', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // Index 0 should be dark, index 25 should be light
      // Both modes use the same ramp
      expect(result.light.surfaces[0]).not.toBe(result.light.surfaces[25]);
    });
  });

  describe('default merging', () => {
    it('minimal input (just name, primary, accent) produces full output', () => {
      const minimalInput: ThemeInputV2 = {
        name: 'Minimal Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(minimalInput);

      // Should have all required properties
      expect(result.name).toBe('Minimal Theme');
      expect(result.light.surfaces).toHaveLength(26);
      expect(result.dark.surfaces).toHaveLength(26);
      expect(Object.keys(result.light.tokens).length).toBeGreaterThan(0);
      expect(Object.keys(result.dark.tokens).length).toBeGreaterThan(0);
      expect(Object.keys(result.light.actions).length).toBeGreaterThan(0);
      expect(Object.keys(result.dark.actions).length).toBeGreaterThan(0);
      expect(result.light.states).toHaveProperty('hover');
      expect(result.light.states).toHaveProperty('focus');
      expect(result.light.states).toHaveProperty('active');
      expect(result.dark.states).toHaveProperty('hover');
      expect(result.dark.states).toHaveProperty('focus');
      expect(result.dark.states).toHaveProperty('active');
    });

    it('uses DEFAULT_SURFACE_PARAMS when surfaces not provided', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // The surfaces should be generated using default params
      expect(result.light.surfaces).toHaveLength(26);
      expect(result.dark.surfaces).toHaveLength(26);
      expect(typeof result.light.surfaces[0]).toBe('string');
      expect(typeof result.dark.surfaces[0]).toBe('string');
    });

    it('uses DEFAULT_STATE_PARAMS when states not provided', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // States should be generated with default intensity (6 for both modes)
      // Formula: hover=intensity, focus=intensity+2, active=intensity+4
      const lightIntensity = DEFAULT_STATE_PARAMS.light.intensity; // 6
      expect(result.light.states.hover).toBe(
        `oklch(0% 0 0 / ${lightIntensity}%)`
      );
      expect(result.light.states.focus).toBe(
        `oklch(0% 0 0 / ${lightIntensity + 2}%)`
      );
      expect(result.light.states.active).toBe(
        `oklch(0% 0 0 / ${lightIntensity + 4}%)`
      );

      // Dark mode: 6% intensity -> hover=6, focus=8, active=10
      const darkIntensity = DEFAULT_STATE_PARAMS.dark.intensity; // 6
      expect(result.dark.states.hover).toBe(
        `oklch(100% 0 0 / ${darkIntensity}%)`
      );
      expect(result.dark.states.focus).toBe(
        `oklch(100% 0 0 / ${darkIntensity + 2}%)`
      );
      expect(result.dark.states.active).toBe(
        `oklch(100% 0 0 / ${darkIntensity + 4}%)`
      );
    });

    it('uses DEFAULT_ACTION_PARAMS when actionColors not provided', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // Should have all action color variants
      expect(result.light.actions).toHaveProperty('success');
      expect(result.light.actions).toHaveProperty('success-fg');
      expect(result.light.actions).toHaveProperty('success-bg');
      expect(result.light.actions).toHaveProperty('error');
      expect(result.light.actions).toHaveProperty('error-fg');
      expect(result.light.actions).toHaveProperty('error-bg');
      expect(result.light.actions).toHaveProperty('caution');
      expect(result.light.actions).toHaveProperty('caution-fg');
      expect(result.light.actions).toHaveProperty('caution-bg');
      expect(result.light.actions).toHaveProperty('info');
      expect(result.light.actions).toHaveProperty('info-fg');
      expect(result.light.actions).toHaveProperty('info-bg');
    });
  });

  describe('custom overrides', () => {
    it('respects surfaces.tint override', () => {
      const inputWithDefaultTint: ThemeInputV2 = {
        name: 'Default Tint',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const inputWithCustomTint: ThemeInputV2 = {
        name: 'Custom Tint',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          tint: 8, // Much higher tint than default (3)
        },
      };

      const defaultResult = generator.generate(inputWithDefaultTint);
      const customResult = generator.generate(inputWithCustomTint);

      // The surface colors should be different due to different tint values
      expect(defaultResult.light.surfaces[12]).not.toBe(
        customResult.light.surfaces[12]
      );
    });

    it('defaults surface tint color to primary for backwards compatibility', () => {
      const legacyInput: ThemeInputV2 = {
        name: 'Legacy Tint',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          tint: 8,
        },
      };

      const explicitPrimaryTintInput: ThemeInputV2 = {
        ...legacyInput,
        surfaces: {
          ...legacyInput.surfaces,
          tintColor: legacyInput.primary,
        },
      };

      const legacyResult = generator.generate(legacyInput);
      const explicitResult = generator.generate(explicitPrimaryTintInput);

      expect(legacyResult.light.surfaces).toEqual(
        explicitResult.light.surfaces
      );
      expect(legacyResult.dark.surfaces).toEqual(explicitResult.dark.surfaces);
    });

    it('respects surfaces.tintColor override independently of primary color', () => {
      const primaryTintInput: ThemeInputV2 = {
        name: 'Primary Tint',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          tint: 8,
        },
      };

      const warmTintInput: ThemeInputV2 = {
        ...primaryTintInput,
        surfaces: {
          ...primaryTintInput.surfaces,
          tintColor: '#f1dfc2',
        },
      };

      const primaryTintResult = generator.generate(primaryTintInput);
      const warmTintResult = generator.generate(warmTintInput);

      expect(warmTintResult.light.primary).toBe(primaryTintInput.primary);
      expect(warmTintResult.light.accent).toBe(primaryTintInput.accent);
      expect(primaryTintResult.light.surfaces[20]).not.toBe(
        warmTintResult.light.surfaces[20]
      );
    });

    it('respects surfaces.ceiling override', () => {
      const inputWithDefaultCeiling: ThemeInputV2 = {
        name: 'Default Ceiling',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const inputWithCustomCeiling: ThemeInputV2 = {
        name: 'Custom Ceiling',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          ceiling: 90, // Lower than default (96)
        },
      };

      const defaultResult = generator.generate(inputWithDefaultCeiling);
      const customResult = generator.generate(inputWithCustomCeiling);

      // The lightest surfaces (high indices) should be different
      expect(defaultResult.light.surfaces[25]).not.toBe(
        customResult.light.surfaces[25]
      );
    });

    it('respects surfaces.floor override', () => {
      const inputWithDefaultFloor: ThemeInputV2 = {
        name: 'Default Floor',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const inputWithCustomFloor: ThemeInputV2 = {
        name: 'Custom Floor',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          floor: 15, // Higher than default (4)
        },
      };

      const defaultResult = generator.generate(inputWithDefaultFloor);
      const customResult = generator.generate(inputWithCustomFloor);

      // The darkest surfaces (low indices) should be different
      expect(defaultResult.light.surfaces[0]).not.toBe(
        customResult.light.surfaces[0]
      );
    });

    it('respects surfaces.darkCurve and lightCurve overrides', () => {
      const inputWithDefaultCurves: ThemeInputV2 = {
        name: 'Default Curves',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const inputWithCustomCurves: ThemeInputV2 = {
        name: 'Custom Curves',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          darkCurve: 1.0,
          lightCurve: 1.0,
        },
      };

      const defaultResult = generator.generate(inputWithDefaultCurves);
      const customResult = generator.generate(inputWithCustomCurves);

      // Mid-range values should be different due to curve changes
      expect(defaultResult.light.surfaces[6]).not.toBe(
        customResult.light.surfaces[6]
      );
    });

    it('respects states intensity overrides', () => {
      const input: ThemeInputV2 = {
        name: 'Custom States',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        states: {
          light: { intensity: 8 },
          dark: { intensity: 10 },
        },
      };

      const result = generator.generate(input);

      // Light mode with 8% intensity: hover=8, focus=10, active=12
      expect(result.light.states.hover).toBe('oklch(0% 0 0 / 8%)');
      expect(result.light.states.focus).toBe('oklch(0% 0 0 / 10%)');
      expect(result.light.states.active).toBe('oklch(0% 0 0 / 12%)');

      // Dark mode with 10% intensity: hover=10, focus=12, active=14
      expect(result.dark.states.hover).toBe('oklch(100% 0 0 / 10%)');
      expect(result.dark.states.focus).toBe('oklch(100% 0 0 / 12%)');
      expect(result.dark.states.active).toBe('oklch(100% 0 0 / 14%)');
    });

    it('respects actionColors hue overrides', () => {
      const inputWithDefaults: ThemeInputV2 = {
        name: 'Default Actions',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const inputWithCustomHues: ThemeInputV2 = {
        name: 'Custom Actions',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        actionColors: {
          success: { hue: 160 }, // Different from default (145)
          error: { hue: 15 }, // Different from default (25)
        },
      };

      const defaultResult = generator.generate(inputWithDefaults);
      const customResult = generator.generate(inputWithCustomHues);

      // Action colors should be different due to different hues
      expect(defaultResult.light.actions.success).not.toBe(
        customResult.light.actions.success
      );
      expect(defaultResult.light.actions.error).not.toBe(
        customResult.light.actions.error
      );
    });

    it('respects tokenMapping overrides', () => {
      const input: ThemeInputV2 = {
        name: 'Custom Tokens',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        tokenMapping: {
          light: {
            'text-link': 'accent', // Override from default 'primary'
          },
          dark: {
            'surface-elevated': 5, // Override from default 3
          },
        },
      };

      const result = generator.generate(input);

      // Light mode text-link should use accent color
      expect(result.light.tokens['text-link']).toBe('#8b5cf6');

      // Dark mode surface-elevated should use ramp index 5
      expect(result.dark.tokens['surface-elevated']).toBe(
        result.dark.surfaces[5]
      );
    });
  });

  describe('action colors', () => {
    it('generates all four action types: success, error, caution, info', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // Check light mode
      expect(result.light.actions).toHaveProperty('success');
      expect(result.light.actions).toHaveProperty('error');
      expect(result.light.actions).toHaveProperty('caution');
      expect(result.light.actions).toHaveProperty('info');

      // Check dark mode
      expect(result.dark.actions).toHaveProperty('success');
      expect(result.dark.actions).toHaveProperty('error');
      expect(result.dark.actions).toHaveProperty('caution');
      expect(result.dark.actions).toHaveProperty('info');
    });

    it('generates base, -fg, and -bg variants for each action type', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // Check all variants exist
      const actionTypes = ['success', 'error', 'caution', 'info'];
      const variants = ['', '-fg', '-bg'];

      for (const type of actionTypes) {
        for (const variant of variants) {
          const key = `${type}${variant}`;
          expect(result.light.actions).toHaveProperty(key);
          expect(result.dark.actions).toHaveProperty(key);
          expect(typeof result.light.actions[key]).toBe('string');
          expect(typeof result.dark.actions[key]).toBe('string');
        }
      }
    });

    it('total of 12 action color keys (4 types × 3 variants)', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(Object.keys(result.light.actions)).toHaveLength(12);
      expect(Object.keys(result.dark.actions)).toHaveLength(12);
    });
  });

  describe('state colors', () => {
    it('generates hover, focus, and active states', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light.states).toHaveProperty('hover');
      expect(result.light.states).toHaveProperty('focus');
      expect(result.light.states).toHaveProperty('active');

      expect(result.dark.states).toHaveProperty('hover');
      expect(result.dark.states).toHaveProperty('focus');
      expect(result.dark.states).toHaveProperty('active');
    });

    it('uses correct intensity offsets (hover=0, focus=+2, active=+4)', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        states: {
          light: { intensity: 5 },
          dark: { intensity: 7 },
        },
      };

      const result = generator.generate(input);

      // Light mode: intensity=5 -> hover=5, focus=7, active=9
      expect(result.light.states.hover).toBe('oklch(0% 0 0 / 5%)');
      expect(result.light.states.focus).toBe('oklch(0% 0 0 / 7%)');
      expect(result.light.states.active).toBe('oklch(0% 0 0 / 9%)');

      // Dark mode: intensity=7 -> hover=7, focus=9, active=11
      expect(result.dark.states.hover).toBe('oklch(100% 0 0 / 7%)');
      expect(result.dark.states.focus).toBe('oklch(100% 0 0 / 9%)');
      expect(result.dark.states.active).toBe('oklch(100% 0 0 / 11%)');
    });

    it('light mode uses oklch(0% ...) for dark overlays', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light.states.hover).toMatch(/^oklch\(0% 0 0/);
      expect(result.light.states.focus).toMatch(/^oklch\(0% 0 0/);
      expect(result.light.states.active).toMatch(/^oklch\(0% 0 0/);
    });

    it('dark mode uses oklch(100% ...) for light overlays', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.dark.states.hover).toMatch(/^oklch\(100% 0 0/);
      expect(result.dark.states.focus).toMatch(/^oklch\(100% 0 0/);
      expect(result.dark.states.active).toMatch(/^oklch\(100% 0 0/);
    });
  });

  describe('textOnPrimary and textOnAccent', () => {
    it('generates textOnPrimary color', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light.textOnPrimary).toBeDefined();
      expect(typeof result.light.textOnPrimary).toBe('string');
      expect(result.dark.textOnPrimary).toBeDefined();
      expect(typeof result.dark.textOnPrimary).toBe('string');
    });

    it('generates textOnAccent color', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light.textOnAccent).toBeDefined();
      expect(typeof result.light.textOnAccent).toBe('string');
      expect(result.dark.textOnAccent).toBeDefined();
      expect(typeof result.dark.textOnAccent).toBe('string');
    });

    it('textOnPrimary and textOnAccent are the same for both modes', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // These should be the same for both modes since they're based on
      // the brand colors which don't change between modes
      expect(result.light.textOnPrimary).toBe(result.dark.textOnPrimary);
      expect(result.light.textOnAccent).toBe(result.dark.textOnAccent);
    });

    it('generates valid hex colors', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      const hexPattern = /^#[0-9a-f]{6}$/i;
      expect(result.light.textOnPrimary).toMatch(hexPattern);
      expect(result.light.textOnAccent).toMatch(hexPattern);
      expect(result.dark.textOnPrimary).toMatch(hexPattern);
      expect(result.dark.textOnAccent).toMatch(hexPattern);
    });
  });

  describe('semantic tokens', () => {
    it('maps tokens to actual hex values or brand colors', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // All token values should be hex strings
      for (const tokenValue of Object.values(result.light.tokens)) {
        expect(typeof tokenValue).toBe('string');
        expect(tokenValue).toMatch(/^#[0-9a-f]{6}$/i);
      }

      for (const tokenValue of Object.values(result.dark.tokens)) {
        expect(typeof tokenValue).toBe('string');
        expect(tokenValue).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('tokens mapped to "primary" use primary color', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        tokenMapping: {
          light: {
            'text-link': 'primary',
          },
        },
      };

      const result = generator.generate(input);
      expect(result.light.tokens['text-link']).toBe('#3b82f6');
    });

    it('tokens mapped to "accent" use accent color', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        tokenMapping: {
          light: {
            'border-decorative': 'accent',
          },
        },
      };

      const result = generator.generate(input);
      expect(result.light.tokens['border-decorative']).toBe('#8b5cf6');
    });

    it('tokens mapped to numbers use surface ramp indices', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        tokenMapping: {
          light: {
            'surface-card': 20, // Using 0-25 range now
          },
        },
      };

      const result = generator.generate(input);
      expect(result.light.tokens['surface-card']).toBe(
        result.light.surfaces[20]
      );
    });
  });

  describe('edge cases and validation', () => {
    it('handles different primary and accent colors', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#ff0000', // Red
        accent: '#00ff00', // Green
      };

      const result = generator.generate(input);

      expect(result.light.primary).toBe('#ff0000');
      expect(result.light.accent).toBe('#00ff00');
      expect(result.dark.primary).toBe('#ff0000');
      expect(result.dark.accent).toBe('#00ff00');
    });

    it('handles uppercase and lowercase hex colors', () => {
      const inputUpper: ThemeInputV2 = {
        name: 'Upper',
        primary: '#3B82F6',
        accent: '#8B5CF6',
      };

      const inputLower: ThemeInputV2 = {
        name: 'Lower',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const resultUpper = generator.generate(inputUpper);
      const resultLower = generator.generate(inputLower);

      // Results should be functionally equivalent
      expect(resultUpper.light.primary.toLowerCase()).toBe(
        resultLower.light.primary.toLowerCase()
      );
    });
  });

  describe('singleton instance', () => {
    it('themeGeneratorV2 is an instance of ThemeGeneratorV2', () => {
      expect(themeGeneratorV2).toBeInstanceOf(ThemeGeneratorV2);
    });

    it('themeGeneratorV2.generate() works correctly', () => {
      const input: ThemeInputV2 = {
        name: 'Singleton Test',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = themeGeneratorV2.generate(input);

      expect(result.name).toBe('Singleton Test');
      expect(result.light).toBeDefined();
      expect(result.dark).toBeDefined();
    });

    it('singleton produces same results as new instance', () => {
      const input: ThemeInputV2 = {
        name: 'Comparison Test',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const singletonResult = themeGeneratorV2.generate(input);
      const instanceResult = generator.generate(input);

      expect(singletonResult).toEqual(instanceResult);
    });
  });

  describe('complex configuration', () => {
    it('handles fully customized theme with all options', () => {
      const input: ThemeInputV2 = {
        name: 'Fully Custom',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        surfaces: {
          tint: 5,
          chromaFalloff: 1.5,
          floor: 8,
          ceiling: 94,
          darkCurve: 0.5,
          lightCurve: 0.45,
        },
        states: {
          light: { intensity: 6 },
          dark: { intensity: 8 },
        },
        actionColors: {
          success: { hue: 150, hueAdjust: 5 },
          error: { hue: 20, hueAdjust: -5 },
          caution: { hue: 50, hueAdjust: 0 },
          info: { hue: 215, hueAdjust: 10 },
          chroma: 0.18,
          baseLightness: 55,
          fgLightnessOffset: -20,
          bgLightnessOffset: 35,
        },
        tokenMapping: {
          light: {
            'text-link': 'accent',
            'surface-card': 21,
          },
          dark: {
            'text-link': 'primary',
            'surface-elevated': 5,
          },
        },
      };

      const result = generator.generate(input);

      // Should generate successfully
      expect(result.name).toBe('Fully Custom');
      expect(result.light.surfaces).toHaveLength(26);
      expect(result.dark.surfaces).toHaveLength(26);

      // Custom states: light intensity=6 -> hover=6, dark intensity=8 -> hover=8
      expect(result.light.states.hover).toBe('oklch(0% 0 0 / 6%)');
      expect(result.dark.states.hover).toBe('oklch(100% 0 0 / 8%)');

      // Custom token mappings
      expect(result.light.tokens['text-link']).toBe('#8b5cf6');
      expect(result.dark.tokens['text-link']).toBe('#3b82f6');
    });
  });

  describe('generateElevationColors() - New Model', () => {
    // New model: elevation colors are rgba strings with opacity
    const rgbaPattern = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;

    it('light mode generates rgba colors with opacity based on lightOpacity', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light.elevationColors).toBeDefined();
      expect(result.light.elevationColors.low).toMatch(rgbaPattern);
      expect(result.light.elevationColors.default).toMatch(rgbaPattern);
      expect(result.light.elevationColors.high).toMatch(rgbaPattern);
    });

    it('dark mode generates rgba colors with opacity based on darkOpacity', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.dark.elevationColors).toBeDefined();
      expect(result.dark.elevationColors.low).toMatch(rgbaPattern);
      expect(result.dark.elevationColors.default).toMatch(rgbaPattern);
      expect(result.dark.elevationColors.high).toMatch(rgbaPattern);
    });

    it('intensity levels use fixed ratios (0.5x, 1x, 1.5x)', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        elevation: {
          lightOpacity: 20, // 20% base
        },
      };

      const result = generator.generate(input);

      // Extract opacity values from rgba strings
      const extractOpacity = (rgba: string) => {
        const match = rgba.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 0;
      };

      const lowOpacity = extractOpacity(result.light.elevationColors.low);
      const defaultOpacity = extractOpacity(
        result.light.elevationColors.default
      );
      const highOpacity = extractOpacity(result.light.elevationColors.high);

      // Low = 0.5x = 10%, Default = 1x = 20%, High = 1.5x = 30%
      expect(lowOpacity).toBeCloseTo(0.1, 2);
      expect(defaultOpacity).toBeCloseTo(0.2, 2);
      expect(highOpacity).toBeCloseTo(0.3, 2);
    });

    it('different source colors (primary vs accent) produce different results', () => {
      const inputWithPrimary: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6', // Blue
        accent: '#f97316', // Orange
        elevation: {
          source: 'primary',
        },
      };

      const inputWithAccent: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6', // Blue
        accent: '#f97316', // Orange
        elevation: {
          source: 'accent',
        },
      };

      const resultPrimary = generator.generate(inputWithPrimary);
      const resultAccent = generator.generate(inputWithAccent);

      // Different source colors should produce different elevation colors
      expect(resultPrimary.light.elevationColors.default).not.toBe(
        resultAccent.light.elevationColors.default
      );
    });

    it('different chroma values produce different base colors', () => {
      const inputLowChroma: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        elevation: {
          chroma: 20,
        },
      };

      const inputHighChroma: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        elevation: {
          chroma: 100,
        },
      };

      const resultLow = generator.generate(inputLowChroma);
      const resultHigh = generator.generate(inputHighChroma);

      // Higher chroma should produce different colors
      expect(resultLow.light.elevationColors.default).not.toBe(
        resultHigh.light.elevationColors.default
      );
    });

    it('different opacity values produce different alpha values', () => {
      const inputLowOpacity: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        elevation: {
          lightOpacity: 10,
        },
      };

      const inputHighOpacity: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        elevation: {
          lightOpacity: 25,
        },
      };

      const resultLow = generator.generate(inputLowOpacity);
      const resultHigh = generator.generate(inputHighOpacity);

      // Extract opacity values
      const extractOpacity = (rgba: string) => {
        const match = rgba.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
        return match ? parseFloat(match[1]) : 0;
      };

      const lowAlpha = extractOpacity(resultLow.light.elevationColors.default);
      const highAlpha = extractOpacity(
        resultHigh.light.elevationColors.default
      );

      expect(highAlpha).toBeGreaterThan(lowAlpha);
    });
  });

  describe('generateElevationStyles()', () => {
    const input: ThemeInputV2 = {
      name: 'Test Theme',
      primary: '#3b82f6',
      accent: '#8b5cf6',
    };
    const levels = ['level1', 'level2', 'level3'] as const;

    it('every level uses its geometry from DEFAULT_ELEVATION_STYLES', () => {
      const result = generator.generate(input);

      for (const level of levels) {
        const style = DEFAULT_ELEVATION_STYLES[level];
        const shadow = result.light.elevationStyles[level];

        expect(shadow).toContain(`${style.offsetX}px`);
        expect(shadow).toContain(`${style.offsetY}px`);
        expect(shadow).toContain(`${style.blur}px`);
      }
    });

    it('every level uses the shadow color for its own intensity', () => {
      const result = generator.generate(input);

      for (const level of levels) {
        const { intensity } = DEFAULT_ELEVATION_STYLES[level];
        const shadow = result.light.elevationStyles[level];

        expect(shadow).toContain(result.light.elevationColors[intensity]);
        expect(shadow).toContain('rgba(');
      }
    });

    it('produces three visibly distinct shadows', () => {
      const result = generator.generate(input);
      const shadows = levels.map((l) => result.light.elevationStyles[l]);

      expect(new Set(shadows).size).toBe(levels.length);
    });

    it('renders dark mode as a centred glow rather than a cast shadow', () => {
      const result = generator.generate(input);

      for (const level of levels) {
        const style = DEFAULT_ELEVATION_STYLES[level];
        const shadow = result.dark.elevationStyles[level];

        // Offset collapses to 0 and blur widens by 6px — a drop shadow is
        // invisible against a near-black canvas.
        expect(shadow.startsWith('0px 0px ')).toBe(true);
        expect(shadow).toContain(`${style.blur + 6}px`);
      }
    });
  });

  describe('generateMode() elevation integration', () => {
    it('generateMode() calls generateElevationColors() with correct mode parameter', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      // Light and dark modes should have different elevation colors
      // because they blend with different surface colors
      expect(result.light.elevationColors).toBeDefined();
      expect(result.dark.elevationColors).toBeDefined();
      // The colors should be different between modes
      expect(result.light.elevationColors.default).not.toBe(
        result.dark.elevationColors.default
      );
    });

    it('generated theme includes elevationColors in both light and dark modes', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      };

      const result = generator.generate(input);

      expect(result.light).toHaveProperty('elevationColors');
      expect(result.dark).toHaveProperty('elevationColors');
      expect(result.light.elevationColors).toHaveProperty('low');
      expect(result.light.elevationColors).toHaveProperty('default');
      expect(result.light.elevationColors).toHaveProperty('high');
      expect(result.dark.elevationColors).toHaveProperty('low');
      expect(result.dark.elevationColors).toHaveProperty('default');
      expect(result.dark.elevationColors).toHaveProperty('high');
    });

    it('full theme generation with elevation produces valid CSS-ready values', () => {
      const input: ThemeInputV2 = {
        name: 'Test Theme',
        primary: '#3b82f6',
        accent: '#8b5cf6',
        elevation: {
          source: 'accent',
          chroma: 100,
          lightOpacity: 15,
          darkOpacity: 25,
        },
      };

      const result = generator.generate(input);

      // All elevation colors should be valid rgba
      const rgbaPattern = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
      expect(result.light.elevationColors.low).toMatch(rgbaPattern);
      expect(result.light.elevationColors.default).toMatch(rgbaPattern);
      expect(result.light.elevationColors.high).toMatch(rgbaPattern);
      expect(result.dark.elevationColors.low).toMatch(rgbaPattern);
      expect(result.dark.elevationColors.default).toMatch(rgbaPattern);
      expect(result.dark.elevationColors.high).toMatch(rgbaPattern);

      // All elevation styles should be valid CSS box-shadow with rgba
      const boxShadowPattern =
        /^-?\d+px\s+-?\d+px\s+\d+px\s+rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
      for (const level of ['level1', 'level2', 'level3'] as const) {
        expect(result.light.elevationStyles[level]).toMatch(boxShadowPattern);
        expect(result.dark.elevationStyles[level]).toMatch(boxShadowPattern);
      }
    });
  });
});
