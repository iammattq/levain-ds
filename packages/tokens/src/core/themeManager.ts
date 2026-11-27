/**
 * Theme Manager - handles theme selection, application, and persistence
 *
 * Uses the V2 OKLCH-based theme system exclusively.
 * Also handles typography preset application.
 */
import { ThemeMode, ThemesV2Collection, ThemeV2Entry } from './themeTypes';
import {
  GeneratedThemeMode,
  GeneratedThemeV2,
  GeneratedTypographyV2,
  ThemeInputV2,
} from '../generator/types';
import { themeGeneratorV2 } from '../generator/generator';
import { baseThemesV2 } from '../data/baseThemesV2';
import { migrateKey, readKey, removeKey, writeKey } from './storage';
import { applyModeClass, getTheme, isDarkMode } from './themeMode';
import {
  SCHEME_ATTR,
  THEME_ATTR,
  THEMES_MARKER,
  cssBlock,
  swatchCSS,
  themeCSS,
  themeSelector,
  themeSlug,
  themesCSS,
  themeVars,
} from './themeCss';

/** The style element that carries the base themes when the app hasn't linked generated/themes.css. */
const BASE_THEMES_STYLE_ID = 'levain-themes';

/**
 * Typography presets collection type
 */
interface TypographyV2Collection {
  [index: string]: GeneratedTypographyV2;
}

// Storage keys (T32: levain- prefix; a base theme is kept by its name's slug, not its place in the list)
const SESSION_STORAGE_KEY = 'levain-theme';
const PERSISTENT_STORAGE_KEY = 'levain-theme-saved';
const TYPOGRAPHY_PREVIEW_KEY = 'levain-typography-preview';
const ACTIVE_THEME_KEY = 'levain-theme-active';

// The keys before T32, read once (an index mapped to that theme's name) and removed.
const OLD_SESSION_KEY = 'themeIndex';
const OLD_PERSISTENT_KEY = 'savedThemeIndex';
const OLD_TYPOGRAPHY_PREVIEW_KEY = 'typographyPreview';
const OLD_ACTIVE_THEME_KEY = 'ok-themes-active';

/**
 * Unified active theme state - distinguishes between built-in and user themes.
 * A built-in theme is stored by `name` (its slug); `index` is its place in the current list, filled in on read.
 */
export type ActiveThemeState =
  | { type: 'builtin'; index: number; name: string }
  | { type: 'user'; id: string };

/** A stored index from before T32 as the slug of the theme it meant (the list's order then), or null. */
function legacyIndexToSlug(value: string): string | null {
  const theme = baseThemesV2[parseInt(value, 10)];
  return theme ? themeSlug(theme.name) : null;
}

let storageMigrated = false;
/** Move the pre-T32 keys to the new ones, once per page. */
function migrateStorage(): void {
  if (storageMigrated || typeof window === 'undefined') return;
  storageMigrated = true;
  migrateKey('session', OLD_SESSION_KEY, SESSION_STORAGE_KEY, legacyIndexToSlug);
  migrateKey('local', OLD_PERSISTENT_KEY, PERSISTENT_STORAGE_KEY, legacyIndexToSlug);
  migrateKey('local', OLD_TYPOGRAPHY_PREVIEW_KEY, TYPOGRAPHY_PREVIEW_KEY);
  migrateKey('local', OLD_ACTIVE_THEME_KEY, ACTIVE_THEME_KEY, (old) => {
    try {
      const state = JSON.parse(old) as { type?: string; index?: number; id?: string };
      if (state.type === 'user' && typeof state.id === 'string') return old;
      if (state.type === 'builtin' && typeof state.index === 'number') {
        const name = legacyIndexToSlug(String(state.index));
        return name ? JSON.stringify({ type: 'builtin', name }) : null;
      }
    } catch {
      // unreadable: dropped
    }
    return null;
  });
}

/**
 * Manages theme selection, application, and persistence
 */
// Static flag to ensure storage listener is only added once across all instances
let storageListenerInitialized = false;

export class ThemeManager {
  private cachedThemes: ThemesV2Collection | null = null;
  private cachedTypography: TypographyV2Collection | null = null;
  private themeJsonLoader: (() => Promise<ThemesV2Collection>) | null = null;
  private typographyJsonLoader: (() => Promise<TypographyV2Collection>) | null =
    null;
  private projectThemeIndexGetter: ((slug: string) => number | null) | null =
    null;

  /**
   * Memory cache for user themes - stores generated V2 themes by ID
   * Used to avoid regeneration on mode switch
   */
  private userThemeCache: Map<string, GeneratedThemeV2> = new Map();

  /**
   * Current active user theme ID (if any) - used for mode switch regeneration
   */
  private activeUserThemeId: string | null = null;

  /**
   * Current active user theme input - needed for mode switch regeneration
   */
  private activeUserThemeInput: ThemeInputV2 | null = null;

  constructor() {
    migrateStorage();
    this.initStorageListener();
  }

  /** Each theme's slug by its index: the loaded collection's, or the base list's before it loads. */
  private slugsByIndex(): Map<number, string> {
    const map = new Map<number, string>();
    if (this.cachedThemes) {
      for (const [i, t] of Object.entries(this.cachedThemes)) {
        map.set(parseInt(i, 10), themeSlug(t.name));
      }
    } else {
      baseThemesV2.forEach((t, i) => map.set(i, themeSlug(t.name)));
    }
    return map;
  }

  private slugForIndex(index: number): string | null {
    return this.slugsByIndex().get(index) ?? null;
  }

  private indexForSlug(slug: string | null): number | null {
    if (slug === null) return null;
    for (const [i, s] of this.slugsByIndex()) if (s === slug) return i;
    return null;
  }

  /**
   * Configure the theme JSON loader function
   * This allows the app to provide its own loader (e.g., for Next.js dynamic imports)
   */
  setThemeJsonLoader(loader: () => Promise<ThemesV2Collection>): void {
    this.themeJsonLoader = loader;
  }

  /**
   * Configure the typography JSON loader function
   */
  setTypographyJsonLoader(loader: () => Promise<TypographyV2Collection>): void {
    this.typographyJsonLoader = loader;
  }

  /**
   * Configure the project theme index getter function
   * This allows the app to provide project-specific theme mappings
   */
  setProjectThemeIndexGetter(getter: (slug: string) => number | null): void {
    this.projectThemeIndexGetter = getter;
  }

  /**
   * Initialize localStorage listener for cross-tab sync
   * Uses module-level flag to ensure listener is only added once
   */
  private initStorageListener(): void {
    if (typeof window === 'undefined' || storageListenerInitialized) return;

    window.addEventListener('storage', (event) => {
      if (event.key === TYPOGRAPHY_PREVIEW_KEY) {
        if (event.newValue) {
          try {
            const typography = JSON.parse(
              event.newValue
            ) as GeneratedTypographyV2;
            this.applyTypographyPreviewToDOM(typography);
          } catch (e) {
            console.error('Failed to parse typography preview from storage', e);
          }
        } else {
          // Preview was cleared in another tab
          this.removeTypographyPreviewFromDOM();
        }
      }
    });

    storageListenerInitialized = true;
  }

  /**
   * Get the current theme index asynchronously
   * Will check session storage, project themes, and persistent storage
   */
  async getCurrentThemeAsync(): Promise<number> {
    if (typeof window === 'undefined') return 0;

    // Check session storage first
    const saved = this.indexForSlug(readKey('session', SESSION_STORAGE_KEY));
    if (saved !== null) return saved;

    // If project-specific theme is assigned, use that
    const projectTheme = this.getProjectTheme();
    if (projectTheme !== null) {
      this.setTheme(projectTheme);
      return projectTheme;
    }

    // For a new session, use saved theme or generate a random index
    const persistentTheme = this.indexForSlug(
      readKey('local', PERSISTENT_STORAGE_KEY)
    );
    if (persistentTheme !== null) {
      this.setTheme(persistentTheme);
      return persistentTheme;
    }

    // Use the first theme as default for new sessions
    const defaultTheme = 0;
    this.setTheme(defaultTheme);
    return defaultTheme;
  }

  /**
   * Set a specific built-in theme
   */
  setTheme(index: number): void {
    if (typeof window === 'undefined') return;

    // Clear any active user theme
    this.activeUserThemeId = null;
    this.activeUserThemeInput = null;

    // Update active theme state to built-in, kept by name
    const name = this.slugForIndex(index);
    if (name !== null) {
      writeKey('local', ACTIVE_THEME_KEY, JSON.stringify({ type: 'builtin', name }));
      writeKey('session', SESSION_STORAGE_KEY, name);
    }
    this.applyTheme(index);
  }

  /**
   * Save the current theme permanently
   */
  saveTheme(): void {
    if (typeof window === 'undefined') return;

    const currentTheme = readKey('session', SESSION_STORAGE_KEY);
    if (currentTheme !== null) {
      writeKey('local', PERSISTENT_STORAGE_KEY, currentTheme);
    }
  }

  /**
   * Apply a user-created theme with runtime generation
   * Uses memory cache to avoid regeneration on mode switch
   */
  async applyUserTheme(theme: ThemeInputV2, id: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Check cache first
      let generated = this.userThemeCache.get(id);
      if (!generated) {
        // Generate theme using V2 generator
        generated = themeGeneratorV2.generate(theme);
        this.userThemeCache.set(id, generated);
      }

      // Store active state
      this.activeUserThemeId = id;
      this.activeUserThemeInput = theme;

      // Persist active theme state
      const activeState: ActiveThemeState = { type: 'user', id };
      writeKey('local', ACTIVE_THEME_KEY, JSON.stringify(activeState));

      // Clear the built-in theme session storage (prevents confusion)
      removeKey('session', SESSION_STORAGE_KEY);

      // Apply to DOM. Both modes are written, scoped like a base theme, so a light/dark change needs nothing here.
      const mode = this.isDarkMode() ? 'dark' : 'light';
      applyModeClass(getTheme());
      const attr = `user-${id}`;

      // Load typography for consistent styling
      const typography = await this.loadTypography();

      let styleEl = document.getElementById('theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'theme-styles';
        document.head.appendChild(styleEl);
      }

      const typoPreset = typography['0'];
      const typographyCSS = typoPreset
        ? this.generateTypographyCSS(typoPreset)
        : '';

      // The user theme's own swatch, per mode (the base themes' swatches stay as they are).
      const swatch = (m: 'light' | 'dark') =>
        cssBlock(themeSelector(attr, m), [
          ['--color-theme-user-primary', generated![m].primary],
          ['--color-theme-user-secondary', generated![m].accent],
        ]);

      styleEl.textContent =
        themeCSS(attr, generated) + typographyCSS + swatch('light') + swatch('dark');
      document.documentElement.setAttribute(THEME_ATTR, attr);

      // Update body attributes
      document.body.setAttribute('data-theme-index', `user-${id}`);
      document.body.setAttribute('data-theme-mode', mode);

    } catch (error) {
      console.error('Failed to apply user theme', error);
      // Fallback to default built-in theme
      this.setTheme(0);
    }
  }

  /**
   * Clear a user theme from cache (call when theme is edited or deleted)
   */
  clearUserThemeCache(id: string): void {
    this.userThemeCache.delete(id);

    // If this was the active theme, clear active state
    if (this.activeUserThemeId === id) {
      this.activeUserThemeId = null;
      this.activeUserThemeInput = null;
    }
  }

  /**
   * Get the currently active user theme ID (if any)
   */
  getActiveUserThemeId(): string | null {
    return this.activeUserThemeId;
  }

  /**
   * Get the current active theme state from storage
   */
  getActiveThemeState(): ActiveThemeState | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = readKey('local', ACTIVE_THEME_KEY);
      if (!stored) return null;
      const state = JSON.parse(stored) as { type?: string; name?: string; id?: string };
      if (state.type === 'user' && typeof state.id === 'string') {
        return { type: 'user', id: state.id };
      }
      if (state.type === 'builtin' && typeof state.name === 'string') {
        const index = this.indexForSlug(state.name);
        return index === null ? null : { type: 'builtin', index, name: state.name };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear active user theme and revert to built-in theme
   */
  clearActiveUserTheme(): void {
    this.activeUserThemeId = null;
    this.activeUserThemeInput = null;
    removeKey('local', ACTIVE_THEME_KEY);
  }

  /**
   * Reset to the session theme
   */
  resetToSessionTheme(): void {
    const themeIndex = this.getCurrentTheme();
    this.applyTheme(themeIndex);
  }

  /**
   * Get theme index assigned to a specific project
   */
  getProjectTheme(): number | null {
    if (typeof window === 'undefined') return null;
    if (!this.projectThemeIndexGetter) return null;

    // Check if we're on a work project page
    const path = window.location.pathname;
    const projectMatch = path.match(/^\/projects\/([^\/]+)/);

    if (projectMatch && projectMatch[1]) {
      const projectSlug = projectMatch[1];
      return this.projectThemeIndexGetter(projectSlug);
    }

    return null;
  }

  /**
   * Load themes data
   */
  private async loadThemes(): Promise<ThemesV2Collection> {
    if (this.cachedThemes) {
      return this.cachedThemes;
    }

    try {
      // Use custom loader if provided, otherwise use default import
      if (this.themeJsonLoader) {
        this.cachedThemes = await this.themeJsonLoader();
      } else {
        // Default loader - import from package's generated folder
        const themes = (await import('../../generated/themesV2.json')) as {
          default: ThemesV2Collection;
        };
        this.cachedThemes = themes.default;
      }
      return this.cachedThemes;
    } catch (error) {
      const err = error as Error;
      console.error(
        '[themeManager] loadThemes FAILED:',
        err?.name,
        err?.message,
        err?.stack
      );
      throw error;
    }
  }

  /**
   * Load typography presets data
   */
  private async loadTypography(): Promise<TypographyV2Collection> {
    if (this.cachedTypography) {
      return this.cachedTypography;
    }

    try {
      // Use custom loader if provided, otherwise use default import
      if (this.typographyJsonLoader) {
        this.cachedTypography = await this.typographyJsonLoader();
      } else {
        // Default loader - import from package's generated folder
        const typography =
          (await import('../../generated/typographyV2.json')) as {
            default: TypographyV2Collection;
          };
        this.cachedTypography = typography.default;
      }
      return this.cachedTypography;
    } catch (error) {
      const err = error as Error;
      console.error(
        '[themeManager] loadTypography FAILED:',
        err?.name,
        err?.message,
        err?.stack
      );
      throw error;
    }
  }

  /**
   * Check if V2 theme system is active (always true now)
   */
  isV2(): boolean {
    return true;
  }

  /**
   * Get themes - returns current cached themes or null if not loaded
   */
  getThemes(): ThemesV2Collection | null {
    return this.cachedThemes;
  }

  /**
   * Get available theme indices as a sorted array
   */
  getAvailableThemeIndices(): number[] {
    if (!this.cachedThemes) return [];

    return Object.keys(this.cachedThemes)
      .map((key) => parseInt(key, 10))
      .sort((a, b) => a - b);
  }

  /**
   * Apply theme to DOM
   */
  async applyTheme(index: number): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Load themes and typography data
      const [themes, typography] = await Promise.all([
        this.loadThemes(),
        this.loadTypography(),
      ]);

      // Get the number of available themes
      const themeCount = Object.keys(themes).length;

      // Handle the case where no themes are available
      if (themeCount === 0) {
        console.error('No themes available');
        return;
      }

      // Ensure the index is within the available range
      const validIndex = this.ensureValidThemeIndex(index, themes);
      if (validIndex !== index) {
        console.warn(
          `Theme index ${index} is out of bounds, using theme ${validIndex} instead`
        );
        // Update the session storage with the valid index
        this.setTheme(validIndex);
        return; // The setTheme will call applyTheme again
      }

      const theme = themes[validIndex.toString()] as ThemeV2Entry;

      if (!theme) {
        console.error(`Theme with index ${validIndex} not found`);
        return;
      }

      const mode = this.isDarkMode() ? 'dark' : 'light';
      // Put <html> in the mode the colours follow, whether or not initTheme() ran first.
      applyModeClass(getTheme());

      // The colours are plain CSS (generated/themes.css, or injected once from the same data): picking a theme is
      // setting the attribute. Both modes are in the CSS behind .dark, so a mode change needs no call here.
      this.ensureBaseThemesCSS(themes);
      document.documentElement.setAttribute(THEME_ATTR, themeSlug(theme.name));

      let styleEl = document.getElementById('theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'theme-styles';
        document.head.appendChild(styleEl);
      }

      // Typography (default preset 0) is still injected: T32 moved only the colours.
      const typoPreset = typography['0'];
      const typographyCSS = typoPreset
        ? this.generateTypographyCSS(typoPreset)
        : '';

      styleEl.textContent = typographyCSS;

      // Add data attribute to body for easier debugging
      document.body.setAttribute('data-theme-index', validIndex.toString());
      document.body.setAttribute('data-theme-mode', mode);
    } catch (error) {
      const err = error as Error;
      console.error(
        '[themeManager] applyTheme FAILED:',
        err?.name,
        err?.message,
        err?.stack
      );
    }
  }

  /**
   * Ensure the theme index is valid (within the range of available themes)
   */
  ensureValidThemeIndex(index: number, themes: ThemesV2Collection): number {
    const availableIndices = Object.keys(themes).map((key) =>
      parseInt(key, 10)
    );

    // If the requested index exists, use it
    if (availableIndices.includes(index)) {
      return index;
    }

    // Otherwise, use the smallest available index
    const smallestIndex = Math.min(...availableIndices);
    return smallestIndex;
  }

  /**
   * Inject the base themes' CSS once, unless the page already has it (generated/themes.css linked: its marker var is
   * set on :root). Apps that link the file get colour before JavaScript; apps that don't (the board) still get it here.
   */
  private ensureBaseThemesCSS(themes: ThemesV2Collection): void {
    if (document.getElementById(BASE_THEMES_STYLE_ID)) return;
    if (
      typeof getComputedStyle === 'function' &&
      getComputedStyle(document.documentElement)
        .getPropertyValue(THEMES_MARKER)
        .trim() === '1'
    ) {
      return;
    }
    const el = document.createElement('style');
    el.id = BASE_THEMES_STYLE_ID;
    el.textContent = themesCSS(themes);
    document.head.appendChild(el);
  }

  /**
   * CSS for every theme's swatch vars (the theme selector's gradient buttons). Both modes: light on :root, dark on
   * .dark. The mode argument is kept for compatibility and no longer changes the output.
   */
  generateAllThemesCSS(themes: ThemesV2Collection, _mode?: ThemeMode): string {
    return swatchCSS(themes);
  }

  /**
   * One theme mode's colour variables as a :root block (no !important). The same declarations as generated/themes.css.
   */
  generateThemeCSS(v2Mode: GeneratedThemeMode): string {
    return cssBlock(':root', themeVars(v2Mode));
  }

  /**
   * Generate CSS from typography preset data
   * Emits semantic typography CSS custom properties
   */
  generateTypographyCSS(typography: GeneratedTypographyV2): string {
    let css = ':root {\n';

    // Emit all typography semantic vars
    Object.entries(typography.vars).forEach(([key, value]) => {
      css += `  --${key}: ${value} !important;\n`;
    });

    css += '}\n';

    // The colour vars point at --color-* tokens, which resolve where they are declared. Declared on :root alone they take
    // the page's mode, so a scheme scope (T72) would never reach .type-* text. Declare them again on the scope (T74).
    const colorVars = Object.entries(typography.vars).filter(([key]) =>
      /^type-.*-color$/.test(key),
    );
    if (colorVars.length > 0) {
      css += `[${SCHEME_ATTR}] {\n`;
      colorVars.forEach(([key, value]) => {
        css += `  --${key}: ${value} !important;\n`;
      });
      css += '}\n';
    }

    return css;
  }

  /**
   * Apply typography preview to the DOM (internal helper)
   */
  private applyTypographyPreviewToDOM(typography: GeneratedTypographyV2): void {
    if (typeof window === 'undefined') return;

    let styleEl = document.getElementById('typography-preview-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'typography-preview-styles';
      document.head.appendChild(styleEl);
    }

    const typographyCSS = this.generateTypographyCSS(typography);
    styleEl.textContent = typographyCSS;
  }

  /**
   * Remove typography preview from DOM (internal helper)
   */
  private removeTypographyPreviewFromDOM(): void {
    if (typeof window === 'undefined') return;

    const styleEl = document.getElementById('typography-preview-styles');
    if (styleEl) {
      styleEl.remove();
    }
  }

  /**
   * Apply typography preview to the DOM and sync across tabs
   * Uses a separate style element so it can be easily removed/replaced
   */
  applyTypographyPreview(typography: GeneratedTypographyV2): void {
    if (typeof window === 'undefined') return;

    // Apply to current tab
    this.applyTypographyPreviewToDOM(typography);

    // Store in localStorage for cross-tab sync
    writeKey('local', TYPOGRAPHY_PREVIEW_KEY, JSON.stringify(typography));
  }

  /**
   * Clear typography preview and restore default (syncs across tabs)
   */
  clearTypographyPreview(): void {
    if (typeof window === 'undefined') return;

    this.removeTypographyPreviewFromDOM();

    // Clear from localStorage (triggers storage event in other tabs)
    removeKey('local', TYPOGRAPHY_PREVIEW_KEY);
  }

  /**
   * Load any existing typography preview from storage on page load
   */
  loadTypographyPreviewFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = readKey('local', TYPOGRAPHY_PREVIEW_KEY);
      if (stored) {
        const typography = JSON.parse(stored) as GeneratedTypographyV2;
        this.applyTypographyPreviewToDOM(typography);
      }
    } catch (e) {
      console.error('Failed to load typography preview from storage', e);
    }
  }

  /**
   * Check if dark mode is active
   */
  isDarkMode(): boolean {
    return isDarkMode();
  }

  /**
   * Get the count of available themes
   */
  async getThemeCount(): Promise<number> {
    try {
      const themes = await this.loadThemes();
      return Object.keys(themes).length;
    } catch (error) {
      console.error('Failed to get theme count', error);
      return 9; // Fallback to minimum themes (baseThemes count)
    }
  }

  /**
   * The current theme's index, read synchronously: session, then project, then saved, then the first theme.
   * Reads only (D12): it neither saves nor applies a theme.
   */
  getCurrentTheme(): number {
    if (typeof window === 'undefined') return 0;

    const saved = this.indexForSlug(readKey('session', SESSION_STORAGE_KEY));
    if (saved !== null) return saved;

    // If project-specific theme is assigned, use that
    const projectTheme = this.getProjectTheme();
    if (projectTheme !== null) return projectTheme;

    // For a new session, use saved theme
    const persistentTheme = this.indexForSlug(readKey('local', PERSISTENT_STORAGE_KEY));
    if (persistentTheme !== null) return persistentTheme;

    // Default to first theme
    return 0;
  }
}

// Create singleton instance
export const themeManager = new ThemeManager();
