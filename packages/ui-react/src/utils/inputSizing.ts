/**
 * Shared size configuration for form input components.
 * Used by TextInput, ColorInput, GradientInput, Select, TokenSelect.
 */

/** Size variants for input components */
export type InputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg';

/** Size configuration for each variant */
export const inputSizeConfig = {
  '2xs': {
    height: 'h-6',
    padding: 'px-1.5',
    paddingY: 'py-0.5',
    rounded: 'rounded',
    roundedL: 'rounded-l',
    roundedR: 'rounded-r',
    chipSize: 'h-6 w-6',
    labelClass: 'type-label-compact',
    textClass: 'type-label-sm',
    errorClass: 'type-caption-compact',
    helperClass: 'type-caption-compact',
    iconSize: 'h-3 w-3',
    iconPadding: 'pr-1.5',
    selectPadding: 'pl-1.5 pr-6',
  },
  xs: {
    height: 'h-7',
    padding: 'px-2',
    paddingY: 'py-1',
    rounded: 'rounded-md',
    roundedL: 'rounded-l-md',
    roundedR: 'rounded-r-md',
    chipSize: 'h-7 w-7',
    labelClass: 'type-label-sm',
    textClass: 'type-body-sm',
    errorClass: 'type-caption',
    helperClass: 'type-caption-compact',
    iconSize: 'h-3 w-3',
    iconPadding: 'pr-2',
    selectPadding: 'pl-2 pr-7',
  },
  sm: {
    height: 'h-8',
    padding: 'px-2',
    paddingY: 'py-1',
    rounded: 'rounded-md',
    roundedL: 'rounded-l-md',
    roundedR: 'rounded-r-md',
    chipSize: 'h-8 w-8',
    labelClass: 'type-label-sm',
    textClass: 'type-body-sm',
    errorClass: 'type-caption',
    helperClass: 'type-caption',
    iconSize: 'h-3.5 w-3.5',
    iconPadding: 'pr-2',
    selectPadding: 'pl-2 pr-7',
  },
  md: {
    height: 'h-10',
    padding: 'px-3',
    paddingY: 'py-2',
    rounded: 'rounded-md',
    roundedL: 'rounded-l-md',
    roundedR: 'rounded-r-md',
    chipSize: 'h-10 w-10',
    labelClass: 'type-label',
    textClass: '',
    errorClass: 'type-body-sm',
    helperClass: 'type-caption',
    iconSize: 'h-4 w-4',
    iconPadding: 'pr-3',
    selectPadding: 'px-3 pr-8',
  },
  lg: {
    height: 'h-12',
    padding: 'px-4',
    paddingY: 'py-3',
    rounded: 'rounded-md',
    roundedL: 'rounded-l-md',
    roundedR: 'rounded-r-md',
    chipSize: 'h-12 w-12',
    labelClass: 'type-label',
    textClass: 'type-body-lg',
    errorClass: 'type-body-sm',
    helperClass: 'type-body-sm',
    iconSize: 'h-5 w-5',
    iconPadding: 'pr-4',
    selectPadding: 'px-4 pr-10',
  },
} as const;

/** Type for accessing config values */
export type InputSizeConfig = (typeof inputSizeConfig)[InputSize];
