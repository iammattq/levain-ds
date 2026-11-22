/**
 * Typography Generator
 * Generates CSS custom property mappings for semantic typography styles
 */

import type {
  TypographyInputV2,
  GeneratedTypographyV2,
  TypographySemanticStyles,
  TypographySemanticStyle,
  GoogleFont,
} from '../types';
import { DEFAULT_TYPOGRAPHY_SEMANTICS } from '../defaults';

/**
 * Font family fallback stacks for Google Fonts
 */
const FONT_FALLBACKS: Record<GoogleFont, string> = {
  Nunito: "'Nunito', sans-serif",
  Inter: "'Inter', sans-serif",
  Roboto: "'Roboto', sans-serif",
  'Open Sans': "'Open Sans', sans-serif",
  Lato: "'Lato', sans-serif",
  'Source Sans 3': "'Source Sans 3', sans-serif",
  Outfit: "'Outfit', sans-serif",
  Poppins: "'Poppins', sans-serif",
  'Work Sans': "'Work Sans', sans-serif",
  'DM Sans': "'DM Sans', sans-serif",
  Manrope: "'Manrope', sans-serif",
  Oswald: "'Oswald', 'Arial Narrow', sans-serif",
  'Libre Baskerville': "'Libre Baskerville', Georgia, serif",
  'Cormorant Garamond': "'Cormorant Garamond', Georgia, serif",
  'Crimson Text': "'Crimson Text', Georgia, serif",
  Prata: "'Prata', Georgia, serif",
};

/**
 * Style name to CSS property prefix mapping
 */
const STYLE_TO_CSS_PREFIX: Record<keyof TypographySemanticStyles, string> = {
  display: 'type-display',
  body: 'type-body',
  bodyLg: 'type-body-lg',
  bodySm: 'type-body-sm',
  label: 'type-label',
  labelSm: 'type-label-sm',
  labelCompact: 'type-label-compact',
  heading1: 'type-heading-1',
  heading2: 'type-heading-2',
  heading3: 'type-heading-3',
  heading4: 'type-heading-4',
  caption: 'type-caption',
  captionCompact: 'type-caption-compact',
  code: 'type-code',
};

/**
 * Merge user input with defaults
 */
function mergeWithDefaults(input: TypographyInputV2): {
  name: string;
  semantics: TypographySemanticStyles;
} {
  const mergedSemantics = { ...DEFAULT_TYPOGRAPHY_SEMANTICS };

  if (input.semantics) {
    for (const [key, value] of Object.entries(input.semantics)) {
      if (value) {
        mergedSemantics[key as keyof TypographySemanticStyles] = {
          ...mergedSemantics[key as keyof TypographySemanticStyles],
          ...value,
        };
      }
    }
  }

  return {
    name: input.name,
    semantics: mergedSemantics,
  };
}

/**
 * Generate CSS var reference for a primitive
 */
function primitiveVar(
  type: 'size' | 'weight' | 'leading' | 'tracking',
  value: string
): string {
  return `var(--type-${type}-${value})`;
}

/**
 * Generate CSS custom properties for a single semantic style
 */
function generateStyleVars(
  prefix: string,
  style: TypographySemanticStyle
): Record<string, string> {
  const vars: Record<string, string> = {
    [`${prefix}-size`]: primitiveVar('size', style.size),
    [`${prefix}-weight`]: primitiveVar('weight', style.weight),
    [`${prefix}-leading`]: primitiveVar('leading', style.leading),
  };

  // Add desktop size if specified (for responsive styles like headings)
  if (style.sizeMd) {
    vars[`${prefix}-size-md`] = primitiveVar('size', style.sizeMd);
  }

  // Add tracking if specified
  if (style.tracking) {
    vars[`${prefix}-tracking`] = primitiveVar('tracking', style.tracking);
  }

  // Add muted color reference if specified (for caption styles)
  if (style.muted) {
    vars[`${prefix}-color`] = 'var(--color-text-muted)';
  }

  return vars;
}

/**
 * Generate typography CSS custom property mappings
 */
export function generateTypography(
  input: TypographyInputV2
): GeneratedTypographyV2 {
  const { name, semantics } = mergeWithDefaults(input);
  const vars: Record<string, string> = {};
  const fontFamily = input.fontFamily ?? 'Nunito';
  const headingFontFamily = input.headingFontFamily ?? fontFamily;

  // Add font family variables. Headings default to the body/default family.
  vars['type-family-sans'] = FONT_FALLBACKS[fontFamily];
  vars['type-family-heading'] = FONT_FALLBACKS[headingFontFamily];

  // Generate vars for each semantic style
  for (const [styleName, style] of Object.entries(semantics)) {
    const prefix =
      STYLE_TO_CSS_PREFIX[styleName as keyof TypographySemanticStyles];
    const styleVars = generateStyleVars(prefix, style);
    Object.assign(vars, styleVars);
  }

  return { name, vars };
}

/**
 * Typography generator class (matches color generator pattern)
 */
export class TypographyGeneratorV2 {
  generate(input: TypographyInputV2): GeneratedTypographyV2 {
    return generateTypography(input);
  }
}

/**
 * Singleton instance for convenience
 */
export const typographyGeneratorV2 = new TypographyGeneratorV2();
