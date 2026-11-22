/**
 * Kotlin Code Generator for Theme Tokens
 *
 * Generates Material 3 ColorScheme definitions for Android/Compose consumption.
 * Outputs pre-computed color values for all built-in themes (light + dark modes).
 */

import type { GeneratedThemeV2 } from '../../src/generator/types';

/**
 * Token mapping from our design system to Material 3 ColorScheme properties
 *
 * Our Token           -> Material 3 Property
 * -----------------------------------------
 * surface-canvas      -> surfaceContainerLowest, surface, background
 * surface-section     -> surfaceContainerLow
 * surface-card        -> surfaceContainer
 * surface-component   -> surfaceContainerHigh
 * surface-elevated    -> surfaceContainerHighest
 * surface-inverted    -> inverseSurface
 * text-default        -> onSurface
 * text-muted          -> onSurfaceVariant
 * text-inverted       -> inverseOnSurface
 * border-default      -> outline
 * border-subtle       -> outlineVariant
 * primary             -> primary
 * textOnPrimary       -> onPrimary
 * accent              -> tertiary
 * textOnAccent        -> onTertiary
 */
const TOKEN_TO_MATERIAL3: Record<string, string> = {
  'surface-canvas': 'surfaceContainerLowest',
  'surface-section': 'surfaceContainerLow',
  'surface-card': 'surfaceContainer',
  'surface-component': 'surfaceContainerHigh',
  'surface-elevated': 'surfaceContainerHighest',
  'surface-inverted': 'inverseSurface',
  'text-default': 'onSurface',
  'text-muted': 'onSurfaceVariant',
  'border-default': 'outline',
  'border-subtle': 'outlineVariant',
};

/**
 * Converts a hex color string to Kotlin Color format: Color(0xAARRGGBB)
 * Assumes full opacity (0xFF) for 6-digit hex codes.
 *
 * @param hex - Hex color string (e.g., "#FF5500" or "#f55")
 * @returns Kotlin Color literal (e.g., "Color(0xFFFF5500)")
 */
export function hexToKotlinColor(hex: string): string {
  // Remove # prefix if present
  let cleanHex = hex.replace('#', '');

  // Expand shorthand hex (e.g., "f55" -> "ff5555")
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // Validate hex length
  if (cleanHex.length !== 6 && cleanHex.length !== 8) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Add alpha channel if not present (assume full opacity)
  if (cleanHex.length === 6) {
    cleanHex = 'FF' + cleanHex;
  }

  return `Color(0x${cleanHex.toUpperCase()})`;
}

/**
 * Converts an rgba() color string to Kotlin Color format: Color(0xAARRGGBB)
 *
 * @param rgba - RGBA color string (e.g., "rgba(26, 209, 133, 0.150)")
 * @returns Kotlin Color literal (e.g., "Color(0x261AD185)")
 */
export function rgbaToKotlinColor(rgba: string): string {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  if (!match) {
    throw new Error(`Invalid rgba color: ${rgba}`);
  }

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] ? parseFloat(match[4]) : 1;

  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0');
  const red = r.toString(16).padStart(2, '0');
  const green = g.toString(16).padStart(2, '0');
  const blue = b.toString(16).padStart(2, '0');

  return `Color(0x${(alpha + red + green + blue).toUpperCase()})`;
}

/**
 * Theme entry from the JSON structure
 */
interface ThemeEntry {
  name: string;
  light: GeneratedThemeV2['light'];
  dark: GeneratedThemeV2['dark'];
}

/**
 * Mode colors including elevation
 */
interface ModeColors {
  colorScheme: string;
  elevationDefault: string;
}

/**
 * Themes JSON structure (indexed by string numbers)
 */
interface ThemesJSON {
  [index: string]: ThemeEntry;
}

/**
 * Generates a ColorScheme call for a single mode (light or dark)
 * Returns the ColorScheme code and the elevation color
 */
function generateModeColors(
  mode: GeneratedThemeV2['light'] | GeneratedThemeV2['dark'],
  schemeType: 'lightColorScheme' | 'darkColorScheme',
  indent: string = '            '
): ModeColors {
  const lines: string[] = [`${schemeType}(`];

  // Primary and tertiary (accent) colors
  lines.push(`${indent}primary = ${hexToKotlinColor(mode.primary)},`);
  lines.push(`${indent}onPrimary = ${hexToKotlinColor(mode.textOnPrimary)},`);
  lines.push(`${indent}tertiary = ${hexToKotlinColor(mode.accent)},`);
  lines.push(`${indent}onTertiary = ${hexToKotlinColor(mode.textOnAccent)},`);

  // Surface tokens mapped to Material 3
  const tokens = mode.tokens;

  // Secondary colors - use accent color
  // Used for: NavigationBar indicator, FilterChip selected, etc.
  lines.push(`${indent}secondary = ${hexToKotlinColor(mode.accent)},`);
  lines.push(`${indent}onSecondary = ${hexToKotlinColor(mode.textOnAccent)},`);
  lines.push(`${indent}secondaryContainer = ${hexToKotlinColor(tokens['surface-component'])},`);
  lines.push(`${indent}onSecondaryContainer = ${hexToKotlinColor(tokens['text-default'])},`);

  // Primary/Tertiary containers - use surface colors for tonal effect
  lines.push(`${indent}primaryContainer = ${hexToKotlinColor(tokens['surface-component'])},`);
  lines.push(`${indent}onPrimaryContainer = ${hexToKotlinColor(mode.primary)},`);
  lines.push(`${indent}tertiaryContainer = ${hexToKotlinColor(tokens['surface-component'])},`);
  lines.push(`${indent}onTertiaryContainer = ${hexToKotlinColor(mode.accent)},`);

  // Surface hierarchy
  lines.push(
    `${indent}surfaceContainerLowest = ${hexToKotlinColor(tokens['surface-canvas'])},`
  );
  lines.push(
    `${indent}surfaceContainerLow = ${hexToKotlinColor(tokens['surface-section'])},`
  );
  lines.push(
    `${indent}surfaceContainer = ${hexToKotlinColor(tokens['surface-card'])},`
  );
  lines.push(
    `${indent}surfaceContainerHigh = ${hexToKotlinColor(tokens['surface-component'])},`
  );
  lines.push(
    `${indent}surfaceContainerHighest = ${hexToKotlinColor(tokens['surface-elevated'])},`
  );
  lines.push(
    `${indent}inverseSurface = ${hexToKotlinColor(tokens['surface-inverted'])},`
  );

  // Use surface-canvas as the base surface and background color
  lines.push(
    `${indent}surface = ${hexToKotlinColor(tokens['surface-canvas'])},`
  );
  lines.push(
    `${indent}background = ${hexToKotlinColor(tokens['surface-canvas'])},`
  );

  // Text/content colors
  lines.push(`${indent}onSurface = ${hexToKotlinColor(tokens['text-default'])},`);
  lines.push(
    `${indent}onSurfaceVariant = ${hexToKotlinColor(tokens['text-muted'])},`
  );
  lines.push(
    `${indent}inverseOnSurface = ${hexToKotlinColor(tokens['text-inverted'])},`
  );

  // Border/outline colors
  lines.push(`${indent}outline = ${hexToKotlinColor(tokens['border-default'])},`);
  lines.push(
    `${indent}outlineVariant = ${hexToKotlinColor(tokens['border-subtle'])},`
  );

  // Surface tint - use primary for elevation tinting
  lines.push(`${indent}surfaceTint = ${hexToKotlinColor(mode.primary)},`);

  // Scrim color for modal overlays
  lines.push(`${indent}scrim = Color(0xFF000000),`);

  // Action colors mapped to Material 3 semantic colors
  const actions = mode.actions;
  lines.push(`${indent}error = ${hexToKotlinColor(actions.error)},`);
  lines.push(`${indent}onError = ${hexToKotlinColor(actions['error-fg'])},`);
  lines.push(
    `${indent}errorContainer = ${hexToKotlinColor(actions['error-bg'])},`
  );
  lines.push(
    `${indent}onErrorContainer = ${hexToKotlinColor(actions['error-fg'])}`
  );

  lines.push(`${indent.slice(4)})`);

  // Get elevation color
  const elevationDefault = rgbaToKotlinColor(mode.elevationColors.default);

  return {
    colorScheme: lines.join('\n'),
    elevationDefault,
  };
}

/**
 * Generates a single Theme entry
 */
function generateThemeEntry(
  index: string,
  theme: ThemeEntry,
  indent: string = '        '
): string {
  const lines: string[] = [];

  const lightColors = generateModeColors(theme.light, 'lightColorScheme', indent + '        ');
  const darkColors = generateModeColors(theme.dark, 'darkColorScheme', indent + '        ');

  lines.push(`${indent}"${index}" to Theme(`);
  lines.push(`${indent}    name = "${theme.name}",`);
  lines.push(`${indent}    light = ${lightColors.colorScheme},`);
  lines.push(`${indent}    dark = ${darkColors.colorScheme},`);
  lines.push(`${indent}    lightElevation = ${lightColors.elevationDefault},`);
  lines.push(`${indent}    darkElevation = ${darkColors.elevationDefault}`);
  lines.push(`${indent})`);

  return lines.join('\n');
}

/**
 * Generates the complete Kotlin file with all themes
 */
export function generateKotlinFile(themes: ThemesJSON): string {
  const themeCount = Object.keys(themes).length;

  const header = `/**
 * Generated Theme Tokens for Material 3
 *
 * DO NOT EDIT MANUALLY - Generated by packages/tokens/scripts/generate.ts
 *
 * Contains ${themeCount} themes, each with light and dark color schemes.
 * Uses Material 3 ColorScheme for Jetpack Compose integration.
 */

package com.portfolio.tokens

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

/**
 * Data class representing a complete theme with light and dark modes.
 * Includes elevation colors for shadow effects (used by buttons, cards, etc.)
 */
data class Theme(
    val name: String,
    val light: ColorScheme,
    val dark: ColorScheme,
    val lightElevation: Color,
    val darkElevation: Color
) {
    /**
     * Get the elevation color for the current mode.
     */
    fun elevationColor(darkTheme: Boolean): Color = if (darkTheme) darkElevation else lightElevation
}

/**
 * Built-in themes for the Portfolio app.
 *
 * Access themes by their index key (e.g., BuiltInThemes.themes["0"] for the first theme).
 */
object BuiltInThemes {
    val themes: Map<String, Theme> = mapOf(
`;

  // Generate all theme entries
  const themeEntries = Object.keys(themes)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((index, i, arr) => {
      const entry = generateThemeEntry(index, themes[index]);
      // Add comma if not the last entry
      return i < arr.length - 1 ? entry + ',' : entry;
    });

  const footer = `
    )

    /**
     * Get a theme by its index.
     * @param index The theme index as a string (e.g., "0", "1", etc.)
     * @return The Theme if found, null otherwise
     */
    fun getTheme(index: String): Theme? = themes[index]

    /**
     * Get the default theme (first theme in the list).
     */
    val defaultTheme: Theme
        get() = themes["0"] ?: error("No default theme available")

    /**
     * Get all theme names with their indices.
     */
    val themeNames: Map<String, String>
        get() = themes.mapValues { it.value.name }
}
`;

  return header + themeEntries.join('\n') + footer;
}

/**
 * Export the token mapping for documentation/reference
 */
export { TOKEN_TO_MATERIAL3 };
