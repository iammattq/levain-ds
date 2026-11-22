/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_TOKEN_MAPPING,
  DEFAULT_SURFACE_PARAMS,
  DEFAULT_STATE_PARAMS,
  DEFAULT_ACTION_PARAMS,
  DEFAULT_ELEVATION_COLORS,
  DEFAULT_ELEVATION_STYLES,
} from '../defaults';

describe('Theme V2 Defaults', () => {
  describe('DEFAULT_TOKEN_MAPPING', () => {
    describe('structure', () => {
      it('should have light and dark mode mappings', () => {
        expect(DEFAULT_TOKEN_MAPPING).toHaveProperty('light');
        expect(DEFAULT_TOKEN_MAPPING).toHaveProperty('dark');
      });

      it('should have same keys in light and dark modes', () => {
        const lightKeys = Object.keys(DEFAULT_TOKEN_MAPPING.light).sort();
        const darkKeys = Object.keys(DEFAULT_TOKEN_MAPPING.dark).sort();
        expect(lightKeys).toEqual(darkKeys);
      });

      it('should have all semantic token categories', () => {
        const lightTokens = Object.keys(DEFAULT_TOKEN_MAPPING.light);

        // Check surface tokens exist
        const surfaceTokens = lightTokens.filter((t) =>
          t.startsWith('surface-')
        );
        expect(surfaceTokens.length).toBeGreaterThan(0);

        // Check text tokens exist
        const textTokens = lightTokens.filter((t) => t.startsWith('text-'));
        expect(textTokens.length).toBeGreaterThan(0);

        // Check border tokens exist
        const borderTokens = lightTokens.filter((t) => t.startsWith('border-'));
        expect(borderTokens.length).toBeGreaterThan(0);
      });
    });

    describe('light mode mappings (unified ramp 0-25)', () => {
      // Light mode: surfaces get lighter as UI layers stack upward.
      it('should map surface-canvas to index 21', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-canvas']).toBe(21);
      });

      it('should map surface-section to index 22', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-section']).toBe(22);
      });

      it('should map surface-card to index 23', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-card']).toBe(23);
      });

      it('should map surface-component to index 24', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-component']).toBe(24);
      });

      it('should map surface-subtle to index 22', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-subtle']).toBe(22);
      });

      it('should map surface-interactive to index 24', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-interactive']).toBe(24);
      });

      it('should map surface-elevated to index 25', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-elevated']).toBe(25);
      });

      it('should map surface-inverted to index 9 (dark end for contrast)', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['surface-inverted']).toBe(9);
      });

      it('should map text-emphasis to index 1 (dark end for dark text)', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-emphasis']).toBe(1);
      });

      it('should map text-default to index 5', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-default']).toBe(5);
      });

      it('should map text-muted to index 9', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-muted']).toBe(9);
      });

      it('should map text-faint to index 12', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-faint']).toBe(12);
      });

      it('should map text-disabled to index 13', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-disabled']).toBe(13);
      });

      it('should map text-inverted to index 24 (light for contrast)', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-inverted']).toBe(24);
      });

      it('should map text-link to primary', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['text-link']).toBe('primary');
      });

      it('should map border-subtle to index 20', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['border-subtle']).toBe(20);
      });

      it('should map border-default to index 17', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['border-default']).toBe(17);
      });

      it('should map border-emphasis to index 14', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['border-emphasis']).toBe(14);
      });

      it('should map border-focus to primary', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['border-focus']).toBe('primary');
      });

      it('should map border-decorative to primary', () => {
        expect(DEFAULT_TOKEN_MAPPING.light['border-decorative']).toBe(
          'primary'
        );
      });
    });

    describe('dark mode mappings (unified ramp 0-25)', () => {
      // Dark mode: surfaces from dark end (low indices), text from light end (high indices)
      it('should map surface-canvas to index 1 (dark end)', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-canvas']).toBe(1);
      });

      it('should map surface-section to index 2', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-section']).toBe(2);
      });

      it('should map surface-card to index 3', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-card']).toBe(3);
      });

      it('should map surface-component to index 4', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-component']).toBe(4);
      });

      it('should map surface-subtle to index 2', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-subtle']).toBe(2);
      });

      it('should map surface-interactive to index 4', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-interactive']).toBe(4);
      });

      it('should map surface-elevated to index 5', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-elevated']).toBe(5);
      });

      it('should map surface-inverted to index 22 (light end for contrast)', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['surface-inverted']).toBe(22);
      });

      it('should map text-emphasis to index 25 (light end for light text)', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-emphasis']).toBe(25);
      });

      it('should map text-default to index 23', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-default']).toBe(23);
      });

      it('should map text-muted to index 18', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-muted']).toBe(18);
      });

      it('should map text-faint to index 15', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-faint']).toBe(15);
      });

      it('should map text-disabled to index 13', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-disabled']).toBe(13);
      });

      it('should map text-inverted to index 1 (dark for contrast)', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-inverted']).toBe(1);
      });

      it('should map text-link to primary', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['text-link']).toBe('primary');
      });

      it('should map border-subtle to index 6', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['border-subtle']).toBe(6);
      });

      it('should map border-default to index 8', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['border-default']).toBe(8);
      });

      it('should map border-emphasis to index 11', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['border-emphasis']).toBe(11);
      });

      it('should map border-focus to primary', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['border-focus']).toBe('primary');
      });

      it('should map border-decorative to primary', () => {
        expect(DEFAULT_TOKEN_MAPPING.dark['border-decorative']).toBe('primary');
      });
    });

    describe('surface ladder', () => {
      // Higher ramp index is lighter in both modes, so every layer that sits on
      // top of another must sit higher on the ramp. When two levels collide the
      // boundary between them has no tonal signal at all and has to fall back
      // to a shadow — which is exactly what this ladder exists to avoid.
      const ladder = [
        'surface-canvas',
        'surface-section',
        'surface-card',
        'surface-component',
        'surface-elevated',
      ] as const;

      it.each(['light', 'dark'] as const)(
        'should climb the ramp strictly from canvas to elevated in %s mode',
        (mode) => {
          const indices = ladder.map((token) => DEFAULT_TOKEN_MAPPING[mode][token]);

          indices.forEach((index) => expect(typeof index).toBe('number'));
          expect(indices).toEqual([...indices].sort((a, b) => Number(a) - Number(b)));
          expect(new Set(indices).size).toBe(ladder.length);
        }
      );

      it.each(['light', 'dark'] as const)(
        'should keep interactive on the same rung as component in %s mode',
        (mode) => {
          expect(DEFAULT_TOKEN_MAPPING[mode]['surface-interactive']).toBe(
            DEFAULT_TOKEN_MAPPING[mode]['surface-component']
          );
        }
      );

      it.each(['light', 'dark'] as const)(
        'should keep subtle on the same rung as section in %s mode',
        (mode) => {
          expect(DEFAULT_TOKEN_MAPPING[mode]['surface-subtle']).toBe(
            DEFAULT_TOKEN_MAPPING[mode]['surface-section']
          );
        }
      );

      // A border that lands on a ladder rung is invisible against that
      // surface, so every border token must sit outside the ladder entirely:
      // below it in light mode (darker than canvas), above it in dark mode
      // (lighter than elevated).
      const borders = [
        'border-subtle',
        'border-default',
        'border-emphasis',
      ] as const;

      it('should keep every border below the surface ladder in light mode', () => {
        const floor = Number(DEFAULT_TOKEN_MAPPING.light['surface-canvas']);

        for (const border of borders) {
          expect(Number(DEFAULT_TOKEN_MAPPING.light[border])).toBeLessThan(floor);
        }
      });

      it('should keep every border above the surface ladder in dark mode', () => {
        const ceiling = Number(DEFAULT_TOKEN_MAPPING.dark['surface-elevated']);

        for (const border of borders) {
          expect(Number(DEFAULT_TOKEN_MAPPING.dark[border])).toBeGreaterThan(
            ceiling
          );
        }
      });
    });

    describe('mapping values', () => {
      it('should only use valid ramp indices (0-25), brand colors, or brand ramp refs', () => {
        const validBrandColors = ['primary', 'accent'];
        const brandRampRef = /^(primary|accent)-(100|200|300|400|500|600|700|800|900)$/;

        const validateMapping = (mapping: Record<string, number | string>) => {
          Object.values(mapping).forEach((value) => {
            if (typeof value === 'number') {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(25);
              expect(Number.isInteger(value)).toBe(true);
            } else if (validBrandColors.includes(value)) {
              // bare 'primary' / 'accent' — legacy form, picked-color hex
            } else {
              // brand ramp ref like 'primary-500'
              expect(value).toMatch(brandRampRef);
            }
          });
        };

        validateMapping(DEFAULT_TOKEN_MAPPING.light);
        validateMapping(DEFAULT_TOKEN_MAPPING.dark);
      });

      it('should use brand colors for interactive tokens', () => {
        // text-link should use brand color
        expect(DEFAULT_TOKEN_MAPPING.light['text-link']).toBe('primary');
        expect(DEFAULT_TOKEN_MAPPING.dark['text-link']).toBe('primary');

        // border-focus should use brand color
        expect(DEFAULT_TOKEN_MAPPING.light['border-focus']).toBe('primary');
        expect(DEFAULT_TOKEN_MAPPING.dark['border-focus']).toBe('primary');

        // border-decorative should use brand color
        expect(DEFAULT_TOKEN_MAPPING.light['border-decorative']).toBe(
          'primary'
        );
        expect(DEFAULT_TOKEN_MAPPING.dark['border-decorative']).toBe('primary');
      });
    });

    describe('mode differences with unified ramp', () => {
      it('should have opposite surface indices between modes', () => {
        // Light mode uses high indices for surfaces, dark mode uses low
        expect(DEFAULT_TOKEN_MAPPING.light['surface-canvas']).toBeGreaterThan(
          DEFAULT_TOKEN_MAPPING.dark['surface-canvas']
        );
      });

      it('should have opposite text indices between modes', () => {
        // Light mode uses low indices for text (dark text), dark mode uses high (light text)
        expect(DEFAULT_TOKEN_MAPPING.light['text-emphasis']).toBeLessThan(
          DEFAULT_TOKEN_MAPPING.dark['text-emphasis']
        );
      });

      it('should have different border indices between modes', () => {
        // Light mode uses higher indices for subtle borders, dark mode uses lower
        expect(DEFAULT_TOKEN_MAPPING.light['border-subtle']).toBeGreaterThan(
          DEFAULT_TOKEN_MAPPING.dark['border-subtle']
        );
      });
    });
  });

  describe('DEFAULT_SURFACE_PARAMS', () => {
    it('should have tint value of 3', () => {
      expect(DEFAULT_SURFACE_PARAMS.tint).toBe(3);
    });

    it('should have chromaFalloff value of 1.25', () => {
      expect(DEFAULT_SURFACE_PARAMS.chromaFalloff).toBe(1.25);
    });

    describe('unified ramp parameters (flat structure)', () => {
      it('should have floor of 4', () => {
        expect(DEFAULT_SURFACE_PARAMS.floor).toBe(4);
      });

      it('should have ceiling of 96', () => {
        expect(DEFAULT_SURFACE_PARAMS.ceiling).toBe(96);
      });

      it('should have darkCurve of 0.49', () => {
        expect(DEFAULT_SURFACE_PARAMS.darkCurve).toBe(0.49);
      });

      it('should have lightCurve of 0.47', () => {
        expect(DEFAULT_SURFACE_PARAMS.lightCurve).toBe(0.47);
      });

      it('should have all required properties', () => {
        expect(DEFAULT_SURFACE_PARAMS).toHaveProperty('tint');
        expect(DEFAULT_SURFACE_PARAMS).toHaveProperty('chromaFalloff');
        expect(DEFAULT_SURFACE_PARAMS).toHaveProperty('floor');
        expect(DEFAULT_SURFACE_PARAMS).toHaveProperty('ceiling');
        expect(DEFAULT_SURFACE_PARAMS).toHaveProperty('darkCurve');
        expect(DEFAULT_SURFACE_PARAMS).toHaveProperty('lightCurve');
      });
    });

    describe('parameter value ranges', () => {
      it('should have tint in valid range (0-10)', () => {
        expect(DEFAULT_SURFACE_PARAMS.tint).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_SURFACE_PARAMS.tint).toBeLessThanOrEqual(10);
      });

      it('should have chromaFalloff in valid range (0.5-2.0)', () => {
        expect(DEFAULT_SURFACE_PARAMS.chromaFalloff).toBeGreaterThanOrEqual(
          0.5
        );
        expect(DEFAULT_SURFACE_PARAMS.chromaFalloff).toBeLessThanOrEqual(2.0);
      });

      it('should have floor in valid range (0-15)', () => {
        expect(DEFAULT_SURFACE_PARAMS.floor).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_SURFACE_PARAMS.floor).toBeLessThanOrEqual(15);
      });

      it('should have ceiling in valid range (85-100)', () => {
        expect(DEFAULT_SURFACE_PARAMS.ceiling).toBeGreaterThanOrEqual(85);
        expect(DEFAULT_SURFACE_PARAMS.ceiling).toBeLessThanOrEqual(100);
      });

      it('should have darkCurve in valid range (0.2-1.5)', () => {
        expect(DEFAULT_SURFACE_PARAMS.darkCurve).toBeGreaterThanOrEqual(0.2);
        expect(DEFAULT_SURFACE_PARAMS.darkCurve).toBeLessThanOrEqual(1.5);
      });

      it('should have lightCurve in valid range (0.2-1.5)', () => {
        expect(DEFAULT_SURFACE_PARAMS.lightCurve).toBeGreaterThanOrEqual(0.2);
        expect(DEFAULT_SURFACE_PARAMS.lightCurve).toBeLessThanOrEqual(1.5);
      });
    });

    describe('curve differences', () => {
      it('should have different curve values for dark and light halves', () => {
        expect(DEFAULT_SURFACE_PARAMS.darkCurve).not.toBe(
          DEFAULT_SURFACE_PARAMS.lightCurve
        );
      });

      it('should have darkCurve slightly higher than lightCurve', () => {
        // Dark curve uses 0.49, light uses 0.47
        expect(DEFAULT_SURFACE_PARAMS.darkCurve).toBeGreaterThan(
          DEFAULT_SURFACE_PARAMS.lightCurve
        );
      });
    });
  });

  describe('DEFAULT_STATE_PARAMS', () => {
    describe('light mode parameters', () => {
      it('should have intensity of 6', () => {
        expect(DEFAULT_STATE_PARAMS.light.intensity).toBe(6);
      });

      it('should have intensity in valid range (2-15)', () => {
        expect(DEFAULT_STATE_PARAMS.light.intensity).toBeGreaterThanOrEqual(2);
        expect(DEFAULT_STATE_PARAMS.light.intensity).toBeLessThanOrEqual(15);
      });
    });

    describe('dark mode parameters', () => {
      it('should have intensity of 6', () => {
        expect(DEFAULT_STATE_PARAMS.dark.intensity).toBe(6);
      });

      it('should have intensity in valid range (2-15)', () => {
        expect(DEFAULT_STATE_PARAMS.dark.intensity).toBeGreaterThanOrEqual(2);
        expect(DEFAULT_STATE_PARAMS.dark.intensity).toBeLessThanOrEqual(15);
      });
    });

    describe('intensity differences', () => {
      it('should have equal intensity in both modes by default', () => {
        expect(DEFAULT_STATE_PARAMS.dark.intensity).toBe(
          DEFAULT_STATE_PARAMS.light.intensity
        );
      });
    });
  });

  describe('DEFAULT_ACTION_PARAMS', () => {
    describe('action color hues', () => {
      it('should have success hue of 145', () => {
        expect(DEFAULT_ACTION_PARAMS.success.hue).toBe(145);
      });

      it('should have success hueAdjust of 0', () => {
        expect(DEFAULT_ACTION_PARAMS.success.hueAdjust).toBe(0);
      });

      it('should have error hue of 25', () => {
        expect(DEFAULT_ACTION_PARAMS.error.hue).toBe(25);
      });

      it('should have error hueAdjust of 0', () => {
        expect(DEFAULT_ACTION_PARAMS.error.hueAdjust).toBe(0);
      });

      it('should have caution hue of 45', () => {
        expect(DEFAULT_ACTION_PARAMS.caution.hue).toBe(45);
      });

      it('should have caution hueAdjust of 0', () => {
        expect(DEFAULT_ACTION_PARAMS.caution.hueAdjust).toBe(0);
      });

      it('should have info hue of 220', () => {
        expect(DEFAULT_ACTION_PARAMS.info.hue).toBe(220);
      });

      it('should have info hueAdjust of 0', () => {
        expect(DEFAULT_ACTION_PARAMS.info.hueAdjust).toBe(0);
      });

      it('should have all action types defined', () => {
        expect(DEFAULT_ACTION_PARAMS).toHaveProperty('success');
        expect(DEFAULT_ACTION_PARAMS).toHaveProperty('error');
        expect(DEFAULT_ACTION_PARAMS).toHaveProperty('caution');
        expect(DEFAULT_ACTION_PARAMS).toHaveProperty('info');
      });
    });

    describe('common action parameters', () => {
      it('should have chroma of 0.15', () => {
        expect(DEFAULT_ACTION_PARAMS.chroma).toBe(0.15);
      });

      it('should have baseLightness of 50', () => {
        expect(DEFAULT_ACTION_PARAMS.baseLightness).toBe(50);
      });

      it('should have fgLightnessOffset of -15', () => {
        expect(DEFAULT_ACTION_PARAMS.fgLightnessOffset).toBe(-15);
      });

      it('should have bgLightnessOffset of 40', () => {
        expect(DEFAULT_ACTION_PARAMS.bgLightnessOffset).toBe(40);
      });
    });

    describe('parameter value ranges', () => {
      it('should have all hues in valid range (0-360)', () => {
        expect(DEFAULT_ACTION_PARAMS.success.hue).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ACTION_PARAMS.success.hue).toBeLessThanOrEqual(360);

        expect(DEFAULT_ACTION_PARAMS.error.hue).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ACTION_PARAMS.error.hue).toBeLessThanOrEqual(360);

        expect(DEFAULT_ACTION_PARAMS.caution.hue).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ACTION_PARAMS.caution.hue).toBeLessThanOrEqual(360);

        expect(DEFAULT_ACTION_PARAMS.info.hue).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ACTION_PARAMS.info.hue).toBeLessThanOrEqual(360);
      });

      it('should have chroma in valid range (0-0.25)', () => {
        expect(DEFAULT_ACTION_PARAMS.chroma).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ACTION_PARAMS.chroma).toBeLessThanOrEqual(0.25);
      });

      it('should have baseLightness in valid range (30-70)', () => {
        expect(DEFAULT_ACTION_PARAMS.baseLightness).toBeGreaterThanOrEqual(30);
        expect(DEFAULT_ACTION_PARAMS.baseLightness).toBeLessThanOrEqual(70);
      });

      it('should have fgLightnessOffset in valid range (-30 to 0)', () => {
        expect(DEFAULT_ACTION_PARAMS.fgLightnessOffset).toBeGreaterThanOrEqual(
          -30
        );
        expect(DEFAULT_ACTION_PARAMS.fgLightnessOffset).toBeLessThanOrEqual(0);
      });

      it('should have bgLightnessOffset in valid range (0 to +50)', () => {
        expect(DEFAULT_ACTION_PARAMS.bgLightnessOffset).toBeGreaterThanOrEqual(
          0
        );
        expect(DEFAULT_ACTION_PARAMS.bgLightnessOffset).toBeLessThanOrEqual(50);
      });
    });

    describe('semantic color hue assignments', () => {
      it('should use green hue range for success (120-160)', () => {
        expect(DEFAULT_ACTION_PARAMS.success.hue).toBeGreaterThanOrEqual(120);
        expect(DEFAULT_ACTION_PARAMS.success.hue).toBeLessThanOrEqual(160);
      });

      it('should use red-orange hue range for error (0-30)', () => {
        expect(DEFAULT_ACTION_PARAMS.error.hue).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ACTION_PARAMS.error.hue).toBeLessThanOrEqual(30);
      });

      it('should use yellow-orange hue range for caution (30-60)', () => {
        expect(DEFAULT_ACTION_PARAMS.caution.hue).toBeGreaterThanOrEqual(30);
        expect(DEFAULT_ACTION_PARAMS.caution.hue).toBeLessThanOrEqual(60);
      });

      it('should use blue hue range for info (200-240)', () => {
        expect(DEFAULT_ACTION_PARAMS.info.hue).toBeGreaterThanOrEqual(200);
        expect(DEFAULT_ACTION_PARAMS.info.hue).toBeLessThanOrEqual(240);
      });
    });

    describe('lightness offset relationships', () => {
      it('should have negative fg offset and positive bg offset', () => {
        expect(DEFAULT_ACTION_PARAMS.fgLightnessOffset).toBeLessThan(0);
        expect(DEFAULT_ACTION_PARAMS.bgLightnessOffset).toBeGreaterThan(0);
      });

      it('should have fg offset that darkens text from base', () => {
        // fg offset is -15, which darkens for better contrast on light backgrounds
        const fgLightness =
          DEFAULT_ACTION_PARAMS.baseLightness +
          DEFAULT_ACTION_PARAMS.fgLightnessOffset;
        expect(fgLightness).toBeLessThan(DEFAULT_ACTION_PARAMS.baseLightness);
        expect(fgLightness).toBe(35); // 50 - 15
      });

      it('should have bg offset that lightens background from base', () => {
        // bg offset is +40, which lightens for subtle backgrounds
        const bgLightness =
          DEFAULT_ACTION_PARAMS.baseLightness +
          DEFAULT_ACTION_PARAMS.bgLightnessOffset;
        expect(bgLightness).toBeGreaterThan(
          DEFAULT_ACTION_PARAMS.baseLightness
        );
        expect(bgLightness).toBe(90); // 50 + 40
      });
    });
  });

  describe('cross-parameter relationships', () => {
    it('should have consistent zero hueAdjust across action params', () => {
      expect(DEFAULT_ACTION_PARAMS.success.hueAdjust).toBe(0);
      expect(DEFAULT_ACTION_PARAMS.error.hueAdjust).toBe(0);
      expect(DEFAULT_ACTION_PARAMS.caution.hueAdjust).toBe(0);
      expect(DEFAULT_ACTION_PARAMS.info.hueAdjust).toBe(0);
    });

    it('should have balanced surface floor and ceiling values', () => {
      // Floor (4) and ceiling (96) should leave reasonable space for ramp
      const darkRoom = DEFAULT_SURFACE_PARAMS.floor;
      const lightRoom = 100 - DEFAULT_SURFACE_PARAMS.ceiling;

      expect(darkRoom).toBe(4); // 4 points from bottom
      expect(lightRoom).toBe(4); // 4 points from top
    });
  });

  describe('DEFAULT_ELEVATION_COLORS (New Model)', () => {
    describe('source property', () => {
      it('should have source set to accent', () => {
        expect(DEFAULT_ELEVATION_COLORS.source).toBe('accent');
      });
    });

    describe('chroma property', () => {
      it('should have chroma set to 100', () => {
        expect(DEFAULT_ELEVATION_COLORS.chroma).toBe(100);
      });

      it('should be within valid range (0-100)', () => {
        expect(DEFAULT_ELEVATION_COLORS.chroma).toBeGreaterThanOrEqual(0);
        expect(DEFAULT_ELEVATION_COLORS.chroma).toBeLessThanOrEqual(100);
      });
    });

    describe('lightOpacity property', () => {
      it('should have lightOpacity set to 10', () => {
        expect(DEFAULT_ELEVATION_COLORS.lightOpacity).toBe(10);
      });

      it('should be within valid range (5-30)', () => {
        expect(DEFAULT_ELEVATION_COLORS.lightOpacity).toBeGreaterThanOrEqual(5);
        expect(DEFAULT_ELEVATION_COLORS.lightOpacity).toBeLessThanOrEqual(30);
      });
    });

    describe('darkOpacity property', () => {
      it('should have darkOpacity set to 16', () => {
        expect(DEFAULT_ELEVATION_COLORS.darkOpacity).toBe(16);
      });

      it('should be within valid range (10-40)', () => {
        expect(DEFAULT_ELEVATION_COLORS.darkOpacity).toBeGreaterThanOrEqual(10);
        expect(DEFAULT_ELEVATION_COLORS.darkOpacity).toBeLessThanOrEqual(40);
      });
    });

    describe('new model structure', () => {
      it('should have all required properties', () => {
        expect(DEFAULT_ELEVATION_COLORS).toHaveProperty('source');
        expect(DEFAULT_ELEVATION_COLORS).toHaveProperty('chroma');
        expect(DEFAULT_ELEVATION_COLORS).toHaveProperty('lightOpacity');
        expect(DEFAULT_ELEVATION_COLORS).toHaveProperty('darkOpacity');
      });

      it('should not have old light/dark nested objects', () => {
        expect(DEFAULT_ELEVATION_COLORS).not.toHaveProperty('light');
        expect(DEFAULT_ELEVATION_COLORS).not.toHaveProperty('dark');
      });
    });
  });

  describe('DEFAULT_ELEVATION_STYLES', () => {
    const levels = ['level1', 'level2', 'level3'] as const;

    describe('structure', () => {
      it('should be keyed by level, not by component', () => {
        expect(DEFAULT_ELEVATION_STYLES).toHaveProperty('level1');
        expect(DEFAULT_ELEVATION_STYLES).toHaveProperty('level2');
        expect(DEFAULT_ELEVATION_STYLES).toHaveProperty('level3');
        expect(DEFAULT_ELEVATION_STYLES).not.toHaveProperty('card');
        expect(DEFAULT_ELEVATION_STYLES).not.toHaveProperty('button');
      });
    });

    describe('geometry', () => {
      it('should have level1 at offsetY=2, blur=8, intensity=low', () => {
        expect(DEFAULT_ELEVATION_STYLES.level1).toEqual({
          offsetX: 0,
          offsetY: 2,
          blur: 8,
          intensity: 'low',
        });
      });

      it('should have level2 at offsetY=6, blur=16, intensity=default', () => {
        expect(DEFAULT_ELEVATION_STYLES.level2).toEqual({
          offsetX: 0,
          offsetY: 6,
          blur: 16,
          intensity: 'default',
        });
      });

      it('should have level3 at offsetY=10, blur=30, intensity=high', () => {
        expect(DEFAULT_ELEVATION_STYLES.level3).toEqual({
          offsetX: 0,
          offsetY: 10,
          blur: 30,
          intensity: 'high',
        });
      });

      it('should cast every shadow straight down', () => {
        for (const level of levels) {
          expect(DEFAULT_ELEVATION_STYLES[level].offsetX).toBe(0);
        }
      });
    });

    describe('invariants', () => {
      it('should increase offset and blur monotonically with level', () => {
        const offsets = levels.map((l) => DEFAULT_ELEVATION_STYLES[l].offsetY);
        const blurs = levels.map((l) => DEFAULT_ELEVATION_STYLES[l].blur);

        expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
        expect(blurs).toEqual([...blurs].sort((a, b) => a - b));
        expect(new Set(offsets).size).toBe(levels.length);
        expect(new Set(blurs).size).toBe(levels.length);
      });

      it('should give each level a distinct intensity so adjacent levels read apart', () => {
        const intensities = levels.map(
          (l) => DEFAULT_ELEVATION_STYLES[l].intensity
        );
        expect(intensities).toEqual(['low', 'default', 'high']);
      });
    });
  });
});
