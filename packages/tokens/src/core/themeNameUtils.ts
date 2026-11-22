/**
 * Utility functions for retrieving theme names and information
 */
import { baseThemesV2 } from '../data/baseThemesV2';

/**
 * Retrieves theme names from the V2 theme definitions
 * @returns Array of theme names
 */
export async function getThemeNames(): Promise<string[]> {
  try {
    return baseThemesV2.map((theme) => theme.name);
  } catch (error) {
    console.error('Error retrieving theme names:', error);
    return [];
  }
}

/**
 * Gets all theme names
 * @returns Array of all theme names
 */
export async function getAllThemeNames(): Promise<string[]> {
  return getThemeNames();
}

/**
 * Gets the count of all themes
 * @returns Number of themes
 */
export async function getThemeCount(): Promise<number> {
  const themes = await getAllThemeNames();
  return themes.length;
}

/**
 * Gets the theme mode names
 * @returns Array of mode names
 */
export function getThemeModeNames(): string[] {
  return ['light', 'dark', 'system'];
}
