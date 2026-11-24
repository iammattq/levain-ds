'use client';

import { Link } from '../provider/LevainProvider';
import {
  ReactNode,
  MouseEvent,
  KeyboardEvent,
  useMemo,
  useState,
  HTMLAttributes,
  useCallback,
} from 'react';
import { cn } from '../utils/cn';

/**
 * Configuration for a gradient layer (surface)
 */
export interface GradientConfig {
  startIndex: number; // 0-25 surface index
  endIndex: number; // 0-25 surface index
  angle: number; // 0-360 degrees
}

/**
 * Configuration for a border layer
 */
export interface BorderConfig {
  colorIndex: number; // 0-25 surface index
  angle: number; // 0-360 degrees
  width: number; // 1-10px
}

/**
 * Complete gradient layer configuration
 */
export interface GradientLayerConfig {
  surface: GradientConfig;
  borderTop: BorderConfig;
  borderBottom: BorderConfig;
}

/**
 * Flat preset configuration (no gradient borders)
 */
interface FlatLayerConfig {
  surfaceIndex: number;
}

/**
 * Named preset configurations
 */
export type SurfacePreset =
  'elevated' | 'inset' | 'matts' | 'modern' | 'modern2' | 'flat';

/** @deprecated Use SurfacePreset instead */
export type GradientPreset = Exclude<SurfacePreset, 'flat'>;

/**
 * Shadow style options
 */
export type ShadowStyle = 'subtle' | 'offset' | 'none';

/**
 * Shadow direction for offset shadow
 */
export type ShadowDirection = 'bl' | 'br' | 'tl' | 'tr';

/**
 * Preset configurations - matching Surfaces tool presets
 */
const PRESETS: Record<
  Exclude<SurfacePreset, 'flat'>,
  { light: GradientLayerConfig; dark: GradientLayerConfig }
> = {
  elevated: {
    light: {
      surface: { startIndex: 22, endIndex: 20, angle: 180 },
      borderTop: { colorIndex: 25, angle: 180, width: 1 },
      borderBottom: { colorIndex: 18, angle: 180, width: 1 },
    },
    dark: {
      surface: { startIndex: 6, endIndex: 4, angle: 180 },
      borderTop: { colorIndex: 8, angle: 180, width: 1 },
      borderBottom: { colorIndex: 2, angle: 180, width: 1 },
    },
  },
  inset: {
    light: {
      surface: { startIndex: 20, endIndex: 22, angle: 180 },
      borderTop: { colorIndex: 18, angle: 180, width: 1 },
      borderBottom: { colorIndex: 25, angle: 180, width: 1 },
    },
    dark: {
      surface: { startIndex: 4, endIndex: 6, angle: 180 },
      borderTop: { colorIndex: 2, angle: 180, width: 1 },
      borderBottom: { colorIndex: 8, angle: 180, width: 1 },
    },
  },
  matts: {
    light: {
      surface: { startIndex: 22, endIndex: 20, angle: 150 },
      borderTop: { colorIndex: 21, angle: 150, width: 1 },
      borderBottom: { colorIndex: 16, angle: 150, width: 1 },
    },
    dark: {
      surface: { startIndex: 6, endIndex: 2, angle: 150 },
      borderTop: { colorIndex: 10, angle: 150, width: 1 },
      borderBottom: { colorIndex: 3, angle: 150, width: 1 },
    },
  },
  modern: {
    light: {
      surface: { startIndex: 23, endIndex: 21, angle: 150 },
      borderTop: { colorIndex: 24, angle: 120, width: 1 },
      borderBottom: { colorIndex: 18, angle: 120, width: 1 },
    },
    dark: {
      surface: { startIndex: 6, endIndex: 3, angle: 150 },
      borderTop: { colorIndex: 8, angle: 120, width: 1 },
      borderBottom: { colorIndex: 1, angle: 120, width: 1 },
    },
  },
  modern2: {
    light: {
      surface: { startIndex: 24, endIndex: 19, angle: 165 },
      borderTop: { colorIndex: 25, angle: 165, width: 1 },
      borderBottom: { colorIndex: 17, angle: 165, width: 1 },
    },
    dark: {
      surface: { startIndex: 6, endIndex: 2, angle: 165 },
      borderTop: { colorIndex: 8, angle: 165, width: 1 },
      borderBottom: { colorIndex: 1, angle: 165, width: 1 },
    },
  },
};

/**
 * Flat preset config (solid background, no gradient borders)
 */
const FLAT_PRESET: { light: FlatLayerConfig; dark: FlatLayerConfig } = {
  light: { surfaceIndex: 21 },
  dark: { surfaceIndex: 5 },
};

export interface SurfaceCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onClick'
> {
  children: ReactNode;
  /** Link destination - renders as Next.js Link when provided */
  href?: string;
  /** Use a named preset configuration */
  preset?: SurfacePreset;
  /** Custom light mode configuration (overrides preset, not applicable to flat) */
  lightConfig?: GradientLayerConfig;
  /** Custom dark mode configuration (overrides preset, not applicable to flat) */
  darkConfig?: GradientLayerConfig;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: (e: MouseEvent) => void;
  /** Apply scale effect - background shrinks while content grows on hover */
  scaleEffect?: boolean;
  /** Shadow style: 'subtle' (CSS var), 'offset' (pressed hover), or 'none' */
  shadowStyle?: ShadowStyle;
  /** @deprecated Shadow direction is ignored by the softened elevation style */
  shadowDirection?: ShadowDirection;
  /** Makes card keyboard focusable and interactive */
  selectable?: boolean;
  /** Applies active/selected visual state */
  active?: boolean;
  /** Called when card is selected via click or Enter/Space key */
  onSelect?: () => void;
}

/** @deprecated Use SurfaceCardProps instead */
export type GradientCardProps = SurfaceCardProps;

const DEFAULT_BORDER_RADIUS = 8;

/**
 * SurfaceCard - A card component with configurable gradient borders and shadow styles
 *
 * Uses a three-layer system for gradient presets:
 * 1. Bottom border: gradient from color → transparent
 * 2. Top border: gradient from color → transparent (blends with bottom)
 * 3. Surface: solid gradient fill on top (inset by border width)
 *
 * For flat preset, renders a solid background without gradient borders.
 *
 * Shadow styles:
 * - subtle: Uses var(--elevation-2) CSS variable, fades on hover
 * - offset: Uses var(--elevation-2) with a press effect
 * - none: No shadow
 *
 * Supports named presets (elevated, inset, matts, modern, modern2, flat)
 * or custom configurations. Uses CSS custom properties with light/dark variants
 * for theme switching.
 */
export function SurfaceCard({
  children,
  href,
  preset = 'modern2',
  lightConfig,
  darkConfig,
  borderRadius = DEFAULT_BORDER_RADIUS,
  className = '',
  onClick,
  scaleEffect = false,
  shadowStyle = 'subtle',
  shadowDirection: _shadowDirection = 'bl',
  selectable = false,
  active = false,
  onSelect,
  ...restProps
}: SurfaceCardProps) {
  // Check if flat preset
  const isFlat = preset === 'flat';

  // Validate preset and fall back to modern2 for invalid values
  const validatedPreset =
    preset === 'flat' || preset in PRESETS ? preset : 'modern2';

  // Use custom config if provided, otherwise use preset (not for flat)
  const lightLayerConfig =
    !isFlat &&
    (lightConfig ?? PRESETS[validatedPreset as keyof typeof PRESETS]?.light);
  const darkLayerConfig =
    !isFlat &&
    (darkConfig ?? PRESETS[validatedPreset as keyof typeof PRESETS]?.dark);

  // Generate CSS gradients for light mode
  const lightGradients = useMemo(() => {
    if (isFlat || !lightLayerConfig) return null;
    const { surface, borderTop, borderBottom } = lightLayerConfig;
    return {
      surface: `linear-gradient(${surface.angle}deg, var(--color-surface-${surface.startIndex}), var(--color-surface-${surface.endIndex}))`,
      borderTop: `linear-gradient(${borderTop.angle}deg, var(--color-surface-${borderTop.colorIndex}), transparent)`,
      borderBottom: `linear-gradient(${(borderBottom.angle + 180) % 360}deg, var(--color-surface-${borderBottom.colorIndex}), transparent)`,
    };
  }, [lightLayerConfig, isFlat]);

  // Generate CSS gradients for dark mode
  const darkGradients = useMemo(() => {
    if (isFlat || !darkLayerConfig) return null;
    const { surface, borderTop, borderBottom } = darkLayerConfig;
    return {
      surface: `linear-gradient(${surface.angle}deg, var(--color-surface-${surface.startIndex}), var(--color-surface-${surface.endIndex}))`,
      borderTop: `linear-gradient(${borderTop.angle}deg, var(--color-surface-${borderTop.colorIndex}), transparent)`,
      borderBottom: `linear-gradient(${(borderBottom.angle + 180) % 360}deg, var(--color-surface-${borderBottom.colorIndex}), transparent)`,
    };
  }, [darkLayerConfig, isFlat]);

  const borderWidth =
    isFlat || !lightLayerConfig || !darkLayerConfig
      ? 0
      : Math.max(
          lightLayerConfig.borderTop.width,
          lightLayerConfig.borderBottom.width,
          darkLayerConfig.borderTop.width,
          darkLayerConfig.borderBottom.width
        );
  const innerRadius = Math.max(0, borderRadius - borderWidth);

  // scaleEffect is disabled when using offset shadow (offset provides its own hover effect)
  const effectiveScaleEffect = scaleEffect && shadowStyle !== 'offset';
  const backgroundScaleClass = effectiveScaleEffect
    ? 'transition-transform duration-300 ease-out group-hover/card:scale-[0.97]'
    : '';
  const contentScaleClass = effectiveScaleEffect
    ? 'transition-transform duration-300 ease-out group-hover/card:scale-[1.00]'
    : '';

  // Hover state for offset shadow press effect and selectable hover ring
  const [isHovered, setIsHovered] = useState(false);

  // Build inline styles for offset shadow (uses state like Button.tsx)
  const getOffsetShadowStyle = () => {
    if (shadowStyle !== 'offset') return {};
    const activeRing =
      selectable && active ? '0 0 0 2px var(--color-primary)' : null;
    return {
      boxShadow: activeRing || (isHovered ? 'none' : 'var(--elevation-2)'),
      transform: isHovered ? 'translateY(1px)' : 'none',
      transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
    };
  };

  // Build box-shadow for non-offset styles
  // Active ring is handled here since inline styles override Tailwind ring classes
  // Selectable cards get a hover ring using border token
  const getBoxShadow = () => {
    const activeRing =
      selectable && active ? '0 0 0 2px var(--color-primary)' : null;
    const hoverRing =
      selectable && isHovered && !active
        ? '0 0 0 1px var(--color-border-default)'
        : null;

    switch (shadowStyle) {
      case 'subtle':
        return activeRing || hoverRing || 'var(--elevation-2)';
      case 'offset':
        return activeRing || hoverRing || undefined; // Rest handled by getOffsetShadowStyle
      case 'none':
        return activeRing || hoverRing || 'none';
    }
  };

  // Build classes for hover effects (only for subtle)
  const getShadowClasses = () => {
    switch (shadowStyle) {
      case 'subtle':
        return 'transition-shadow duration-300 hover:shadow-none';
      case 'offset':
        return ''; // Handled by state-based inline styles
      case 'none':
        return '';
    }
  };

  // Hover handlers for offset shadow and selectable hover ring
  const needsHoverTracking = shadowStyle === 'offset' || selectable;
  const hoverHandlers = needsHoverTracking
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  // Keyboard handler for selectable cards
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!selectable || !onSelect) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    },
    [selectable, onSelect]
  );

  // Classes for selectable and active states
  // Note: active ring is handled via inline boxShadow since it overrides Tailwind classes
  const getSelectableClasses = () => {
    if (!selectable) return '';
    return cn(
      'cursor-pointer',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
    );
  };

  const cardContent = (
    <div
      className={cn(
        'surface-card group/card relative',
        getShadowClasses(),
        getSelectableClasses(),
        className
      )}
      style={{
        borderRadius,
        boxShadow: getBoxShadow(),
        // Add transition for selectable hover ring (offset has its own transition)
        ...(selectable && shadowStyle !== 'offset'
          ? { transition: 'box-shadow 150ms ease-out' }
          : {}),
        ...getOffsetShadowStyle(),
      }}
      onClick={!href ? onClick : undefined}
      tabIndex={selectable ? 0 : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
      role={selectable ? 'button' : undefined}
      {...hoverHandlers}
      {...restProps}
    >
      {isFlat ? (
        <>
          {/* Flat surface - light mode */}
          <div
            className={cn('absolute inset-0 dark:hidden', backgroundScaleClass)}
            style={{
              zIndex: 1,
              background: `var(--color-surface-${FLAT_PRESET.light.surfaceIndex})`,
              borderRadius,
            }}
          />
          {/* Flat surface - dark mode */}
          <div
            className={cn(
              'absolute inset-0 hidden dark:block',
              backgroundScaleClass
            )}
            style={{
              zIndex: 1,
              background: `var(--color-surface-${FLAT_PRESET.dark.surfaceIndex})`,
              borderRadius,
            }}
          />
        </>
      ) : (
        <>
          {/* Bottom border layer - light mode */}
          <div
            className={cn('absolute inset-0 dark:hidden', backgroundScaleClass)}
            style={{
              zIndex: 1,
              background: lightGradients?.borderBottom,
              borderRadius,
            }}
          />
          {/* Bottom border layer - dark mode */}
          <div
            className={cn(
              'absolute inset-0 hidden dark:block',
              backgroundScaleClass
            )}
            style={{
              zIndex: 1,
              background: darkGradients?.borderBottom,
              borderRadius,
            }}
          />

          {/* Top border layer - light mode */}
          <div
            className={cn('absolute inset-0 dark:hidden', backgroundScaleClass)}
            style={{
              zIndex: 2,
              background: lightGradients?.borderTop,
              borderRadius,
            }}
          />
          {/* Top border layer - dark mode */}
          <div
            className={cn(
              'absolute inset-0 hidden dark:block',
              backgroundScaleClass
            )}
            style={{
              zIndex: 2,
              background: darkGradients?.borderTop,
              borderRadius,
            }}
          />

          {/* Surface layer - light mode */}
          <div
            className={cn('absolute dark:hidden', backgroundScaleClass)}
            style={{
              zIndex: 3,
              inset: borderWidth,
              background: lightGradients?.surface,
              borderRadius: innerRadius,
            }}
          />
          {/* Surface layer - dark mode */}
          <div
            className={cn('absolute hidden dark:block', backgroundScaleClass)}
            style={{
              zIndex: 3,
              inset: borderWidth,
              background: darkGradients?.surface,
              borderRadius: innerRadius,
            }}
          />
        </>
      )}

      {/* Content layer - single instance, sits on top */}
      <div
        className={cn('relative h-full', contentScaleClass)}
        style={{
          zIndex: 4,
          padding: borderWidth,
          borderRadius: innerRadius,
        }}
      >
        {children}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full" onClick={onClick}>
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

/** @deprecated Use SurfaceCard instead */
export const GradientCard = SurfaceCard;
