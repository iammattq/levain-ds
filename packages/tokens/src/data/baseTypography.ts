/**
 * Base typography presets for V2 typography system
 * Each preset defines semantic style mappings
 */
import type { TypographyInputV2 } from '../generator/types';

/**
 * Array of typography presets
 * Index 0 is the default preset used by all themes initially.
 */
export const baseTypography: TypographyInputV2[] = [
  // 0: Quinn - default. Open Sans body with Oswald condensed display headings.
  //    heading3/4 size + sizeMd are the DEFAULT_TYPOGRAPHY_SEMANTICS values
  //    made explicit (the source config omits them to inherit those defaults;
  //    the static preset type requires `size`).
  {
    name: 'Quinn',
    fontFamily: 'Open Sans',
    headingFontFamily: 'Oswald',
    semantics: {
      body: { size: 'sm', weight: 'regular', leading: 'normal' },
      bodyLg: { size: 'md', weight: 'regular', leading: 'normal' },
      heading1: {
        size: '2xl',
        sizeMd: '5xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading2: {
        size: 'xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading3: {
        size: 'lg',
        sizeMd: '2xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'normal',
      },
      heading4: {
        size: 'md',
        weight: 'regular',
        leading: 'tight',
        tracking: 'normal',
      },
    },
  },

  // 1: Linen - warm editorial pairing (Inter body, Cormorant Garamond serif headings)
  {
    name: 'Linen',
    fontFamily: 'Inter',
    headingFontFamily: 'Cormorant Garamond',
    semantics: {
      body: { size: 'sm', weight: 'regular', leading: 'normal' },
      bodyLg: { size: 'md', weight: 'regular', leading: 'normal' },
      heading1: {
        size: '2xl',
        sizeMd: '6xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading2: {
        size: 'xl',
        sizeMd: '3xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading3: {
        size: 'lg',
        sizeMd: '2xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading4: {
        size: 'md',
        weight: 'medium',
        leading: 'tight',
        tracking: 'tight',
      },
    },
  },

  // 2: Default - balanced for general use
  {
    name: 'Default',
    fontFamily: 'Inter',
    headingFontFamily: 'Nunito',
    // Uses all defaults from DEFAULT_TYPOGRAPHY_SEMANTICS
  },

  // 3: Compact - tighter spacing for data-dense UIs
  {
    name: 'Compact',
    fontFamily: 'Inter',
    semantics: {
      body: { size: 'xs', weight: 'regular', leading: 'snug' },
      bodySm: { size: '2xs', weight: 'regular', leading: 'snug' },
      heading1: {
        size: 'lg',
        sizeMd: '3xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
      heading2: {
        size: 'md',
        sizeMd: '2xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
      heading3: {
        size: 'md',
        sizeMd: 'xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
    },
  },

  // 4: Editorial - larger body text for reading-focused content
  {
    name: 'Editorial',
    fontFamily: 'Lato',
    semantics: {
      body: { size: 'md', weight: 'regular', leading: 'relaxed' },
      bodyLg: { size: 'lg', weight: 'regular', leading: 'relaxed' },
      bodySm: { size: 'sm', weight: 'regular', leading: 'relaxed' },
      heading1: {
        size: '2xl',
        sizeMd: '6xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
    },
  },

  // 5: Technical - optimized for code-heavy interfaces
  {
    name: 'Technical',
    fontFamily: 'Source Sans 3',
    semantics: {
      body: { size: 'sm', weight: 'regular', leading: 'normal' },
      code: { size: 'sm', weight: 'regular', leading: 'normal' },
      label: { size: 'xs', weight: 'regular', leading: 'snug' },
    },
  },

  // 6: Playful - larger headings, bolder feel
  {
    name: 'Playful',
    fontFamily: 'Poppins',
    semantics: {
      heading1: {
        size: '2xl',
        sizeMd: '6xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
      heading2: {
        size: 'xl',
        sizeMd: '4xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
      heading3: {
        size: 'lg',
        sizeMd: '3xl',
        weight: 'bold',
        leading: 'tight',
        tracking: 'tight',
      },
      label: { size: 'xs', weight: 'bold', leading: 'snug' },
    },
  },

  // 7: Minimal - subtle, understated
  {
    name: 'Minimal',
    fontFamily: 'DM Sans',
    semantics: {
      heading1: {
        size: 'xl',
        sizeMd: '4xl',
        weight: 'medium',
        leading: 'tight',
        tracking: 'normal',
      },
      heading2: {
        size: 'lg',
        sizeMd: '2xl',
        weight: 'medium',
        leading: 'tight',
        tracking: 'normal',
      },
      heading3: {
        size: 'md',
        sizeMd: 'xl',
        weight: 'medium',
        leading: 'tight',
        tracking: 'normal',
      },
      heading4: {
        size: 'sm',
        weight: 'medium',
        leading: 'tight',
        tracking: 'normal',
      },
    },
  },

  // 8: Atrium - cool architectural monochrome (Manrope throughout)
  {
    name: 'Atrium',
    fontFamily: 'Manrope',
    semantics: {
      body: { size: 'sm', weight: 'regular', leading: 'normal' },
      bodySm: { size: 'xs', weight: 'regular', leading: 'snug' },
      label: {
        size: 'xs',
        weight: 'medium',
        leading: 'snug',
        tracking: 'wide',
      },
      labelSm: {
        size: '2xs',
        weight: 'medium',
        leading: 'tight',
        tracking: 'wide',
      },
      heading1: {
        size: 'xl',
        sizeMd: '4xl',
        weight: 'medium',
        leading: 'tight',
        tracking: 'tight',
      },
      heading2: {
        size: 'lg',
        sizeMd: '2xl',
        weight: 'medium',
        leading: 'tight',
        tracking: 'tight',
      },
      heading3: {
        size: 'md',
        sizeMd: 'xl',
        weight: 'medium',
        leading: 'tight',
        tracking: 'normal',
      },
      heading4: {
        size: 'sm',
        weight: 'medium',
        leading: 'tight',
        tracking: 'normal',
      },
    },
  },

  // 9: Heather - refined display (Lato body, Libre Baskerville headings).
  //    Was the default until Quinn (preset 0) replaced it; kept as an option.
  {
    name: 'Heather',
    fontFamily: 'Lato',
    headingFontFamily: 'Libre Baskerville',
    semantics: {
      body: { size: 'sm', weight: 'regular', leading: 'normal' },
      bodyLg: { size: 'md', weight: 'regular', leading: 'normal' },
      heading1: {
        size: '2xl',
        sizeMd: '5xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading2: {
        size: 'xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'tight',
      },
      heading3: {
        size: 'lg',
        sizeMd: '2xl',
        weight: 'regular',
        leading: 'tight',
        tracking: 'normal',
      },
      heading4: {
        size: 'md',
        weight: 'regular',
        leading: 'tight',
        tracking: 'normal',
      },
    },
  },
];
