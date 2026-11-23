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
import { applyModeClass, getTheme, isDarkMode } from './themeMode';

/**
 * Typography presets collection type
 */
interface TypographyV2Collection {
  [index: string]: GeneratedTypographyV2;
}

// Define storage keys
const SESSION_STORAGE_KEY = 'themeIndex';
const PERSISTENT_STORAGE_KEY = 'savedThemeIndex';
const TYPOGRAPHY_PREVIEW_KEY = 'typographyPreview';
const ACTIVE_THEME_KEY = 'ok-themes-active';

/**
 * Unified active theme state - distinguishes between built-in and user themes
 */
export type ActiveThemeState =
  { type: 'builtin'; index: number } | { type: 'user'; id: string };

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
    this.initStorageListener();
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
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved !== null) return parseInt(saved, 10);

    // If project-specific theme is assigned, use that
    const projectTheme = this.getProjectTheme();
    if (projectTheme !== null) {
      this.setTheme(projectTheme);
      return projectTheme;
    }

    // For a new session, use saved theme or generate a random index
    const persistentTheme = localStorage.getItem(PERSISTENT_STORAGE_KEY);
    if (persistentTheme !== null) {
      const themeIndex = parseInt(persistentTheme, 10);
      this.setTheme(themeIndex);
      return themeIndex;
    }

    // Use Green theme as default for new sessions
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

    // Update active theme state to built-in
    const activeState: ActiveThemeState = { type: 'builtin', index };
    localStorage.setItem(ACTIVE_THEME_KEY, JSON.stringify(activeState));

    sessionStorage.setItem(SESSION_STORAGE_KEY, String(index));
    this.applyTheme(index);
  }

  /**
   * Save the current theme permanently
   */
  saveTheme(): void {
    if (typeof window === 'undefined') return;

    const currentTheme = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (currentTheme !== null) {
      localStorage.setItem(PERSISTENT_STORAGE_KEY, currentTheme);
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
      localStorage.setItem(ACTIVE_THEME_KEY, JSON.stringify(activeState));

      // Clear the built-in theme session storage (prevents confusion)
      sessionStorage.removeItem(SESSION_STORAGE_KEY);

      // Apply to DOM
      const mode = this.isDarkMode() ? 'dark' : 'light';
      // Same as applyTheme: <html> in the mode whose tokens we write.
      applyModeClass(getTheme());
      const themeMode = generated[mode];

      // Load typography for consistent styling
      const typography = await this.loadTypography();

      let styleEl = document.getElementById('theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'theme-styles';
        document.head.appendChild(styleEl);
      }

      // Generate CSS
      const themeCSS = this.generateThemeCSS(themeMode);
      const typoPreset = typography['0'];
      const typographyCSS = typoPreset
        ? this.generateTypographyCSS(typoPreset)
        : '';

      // For user themes, generate simplified "all themes" CSS (just the user theme colors)
      const userThemeIndicatorCSS = `:root {
  --color-theme-user-primary: ${themeMode.primary} !important;
  --color-theme-user-secondary: ${themeMode.accent} !important;
}\n`;

      styleEl.textContent = themeCSS + typographyCSS + userThemeIndicatorCSS;

      // Update body attributes
      document.body.setAttribute('data-theme-index', `user-${id}`);
      document.body.setAttribute('data-theme-mode', mode);

      console.debug(`Applied user theme "${theme.name}" (${mode} mode):`, {
        primary: themeMode.primary,
        accent: themeMode.accent,
      });
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
      const stored = localStorage.getItem(ACTIVE_THEME_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as ActiveThemeState;
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
    localStorage.removeItem(ACTIVE_THEME_KEY);
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
        console.debug('[themeManager] loadThemes: using custom loader');
        this.cachedThemes = await this.themeJsonLoader();
      } else {
        // Default loader - import from package's generated folder
        console.debug(
          '[themeManager] loadThemes: dynamic import ../../generated/themesV2.json'
        );
        const themes = (await import('../../generated/themesV2.json')) as {
          default: ThemesV2Collection;
        };
        this.cachedThemes = themes.default;
      }
      console.debug(
        '[themeManager] loadThemes: success, %d theme(s)',
        Object.keys(this.cachedThemes).length
      );
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
        console.debug('[themeManager] loadTypography: using custom loader');
        this.cachedTypography = await this.typographyJsonLoader();
      } else {
        // Default loader - import from package's generated folder
        console.debug(
          '[themeManager] loadTypography: dynamic import ../../generated/typographyV2.json'
        );
        const typography =
          (await import('../../generated/typographyV2.json')) as {
            default: TypographyV2Collection;
          };
        this.cachedTypography = typography.default;
      }
      console.debug(
        '[themeManager] loadTypography: success, %d preset(s); first key=%s',
        Object.keys(this.cachedTypography).length,
        Object.keys(this.cachedTypography)[0]
      );
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
    console.debug('[themeManager] applyTheme START index=%d', index);

    try {
      // Load themes and typography data
      const [themes, typography] = await Promise.all([
        this.loadThemes(),
        this.loadTypography(),
      ]);
      console.debug(
        '[themeManager] applyTheme: themes+typography resolved (themes=%d, typo=%d)',
        Object.keys(themes).length,
        Object.keys(typography).length
      );

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
      // Put <html> in the mode whose tokens we write, so the `dark:` variants
      // agree with the colours whether or not initTheme() ran first.
      applyModeClass(getTheme());

      let styleEl = document.getElementById('theme-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'theme-styles';
        document.head.appendChild(styleEl);
      }

      // Generate all theme color variables for selector buttons
      const allThemesCSS = this.generateAllThemesCSS(themes, mode);

      // Generate current theme CSS
      const themeMode = theme[mode];
      const themeCSS = this.generateThemeCSS(themeMode);

      // Generate typography CSS (use default preset 0 for now)
      const typoPreset = typography['0'];
      const typographyCSS = typoPreset
        ? this.generateTypographyCSS(typoPreset)
        : '';

      const debugInfo = {
        primary: themeMode.primary,
        accent: themeMode.accent,
      };

      // Combine all CSS
      styleEl.textContent = themeCSS + typographyCSS + allThemesCSS;

      // Add data attribute to body for easier debugging
      document.body.setAttribute('data-theme-index', validIndex.toString());
      document.body.setAttribute('data-theme-mode', mode);

      // Print debug info
      console.debug(
        `[themeManager] applyTheme SUCCESS index=%d (%s) css_len=%d`,
        validIndex,
        mode,
        styleEl.textContent.length
      );
      console.debug('[themeManager] debug colors:', debugInfo);
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
   * Generate CSS for all themes (for gradient buttons in theme selector)
   */
  generateAllThemesCSS(themes: ThemesV2Collection, mode: ThemeMode): string {
    let css = ':root {\n';

    // Resolve 'system' to either 'light' or 'dark'
    const effectiveMode: 'light' | 'dark' =
      mode === 'system' ? (this.isDarkMode() ? 'dark' : 'light') : mode;

    // Add color variables for each theme
    for (const [index, theme] of Object.entries(themes)) {
      const themeMode = theme[effectiveMode];
      css += `  --color-theme-${index}-primary: ${themeMode.primary} !important;\n`;
      css += `  --color-theme-${index}-secondary: ${themeMode.accent} !important;\n`;
    }

    css += '}\n';
    return css;
  }

  /**
   * Generate CSS from V2 theme data
   * Emits V2-native variables (26-stop ramp, semantic tokens, states)
   */
  generateThemeCSS(v2Mode: GeneratedThemeMode): string {
    let css = ':root {\n';

    // Primary and accent — resolved through tokenMapping so they can differ
    // per mode (default: primary-500 / accent-500 = the picked colors).
    const resolvedPrimary = v2Mode.tokens['primary'] ?? v2Mode.primary;
    const resolvedAccent = v2Mode.tokens['accent'] ?? v2Mode.accent;
    css += `  --color-primary: ${resolvedPrimary} !important;\n`;
    css += `  --color-accent: ${resolvedAccent} !important;\n`;

    // Legacy alias for base (points to primary)
    css += `  --color-base: ${resolvedPrimary} !important;\n`;

    // 26-stop surface ramp (--color-surface-0 through --color-surface-25)
    v2Mode.surfaces.forEach((color, index) => {
      css += `  --color-surface-${index}: ${color} !important;\n`;
    });

    // 9-stop primary ramp (--color-primary-100 through --color-primary-900)
    v2Mode.primaryRamp.forEach((color, index) => {
      const step = (index + 1) * 100;
      css += `  --color-primary-${step}: ${color} !important;\n`;
    });

    // 9-stop accent ramp (--color-accent-100 through --color-accent-900)
    v2Mode.accentRamp.forEach((color, index) => {
      const step = (index + 1) * 100;
      css += `  --color-accent-${step}: ${color} !important;\n`;
    });

    // Semantic tokens (--color-surface-canvas, --color-text-default, etc.)
    // Brand semantics (primary / accent / gradient-start / gradient-end) are
    // emitted explicitly above and below; skip here to avoid duplication.
    const BRAND_KEYS = new Set([
      'primary',
      'accent',
      'gradient-start',
      'gradient-end',
    ]);
    Object.entries(v2Mode.tokens).forEach(([key, value]) => {
      if (BRAND_KEYS.has(key)) return;
      css += `  --color-${key}: ${value} !important;\n`;
    });

    // Action colors (--color-success, --color-error, etc.)
    Object.entries(v2Mode.actions).forEach(([key, value]) => {
      css += `  --color-${key}: ${value} !important;\n`;
    });

    // Spectrum stops (--color-spectrum-cool, -warm, -vivid). Decorative, not
    // semantic: they widen the palette for effects that interpolate across it.
    Object.entries(v2Mode.spectrum ?? {}).forEach(([key, value]) => {
      css += `  --color-spectrum-${key}: ${value} !important;\n`;
    });

    // State overlays (--color-state-hover, --color-state-focus, --color-state-active)
    css += `  --color-state-hover: ${v2Mode.states.hover} !important;\n`;
    css += `  --color-state-focus: ${v2Mode.states.focus} !important;\n`;
    css += `  --color-state-active: ${v2Mode.states.active} !important;\n`;

    // Auto-contrast text colors
    css += `  --color-text-on-primary: ${v2Mode.textOnPrimary} !important;\n`;
    css += `  --color-text-on-accent: ${v2Mode.textOnAccent} !important;\n`;

    // Gradient stops — resolved through tokenMapping (default: primary-300 →
    // primary-700, but user can map either to any primary or accent step).
    const gradStart = v2Mode.tokens['gradient-start'] ?? v2Mode.primaryRamp[2];
    const gradEnd = v2Mode.tokens['gradient-end'] ?? v2Mode.primaryRamp[6];
    css += `  --color-gradient-start: ${gradStart} !important;\n`;
    css += `  --color-gradient-end: ${gradEnd} !important;\n`;
    css += `  --color-grad-1: linear-gradient(to bottom right, ${gradStart}, ${gradEnd}) !important;\n`;
    css += `  --color-grad-2: linear-gradient(to right, ${gradStart}, ${gradEnd}) !important;\n`;

    // Elevation colors (shadow colors at different intensities)
    css += `  --color-elevation-low: ${v2Mode.elevationColors.low} !important;\n`;
    css += `  --color-elevation-default: ${v2Mode.elevationColors.default} !important;\n`;
    css += `  --color-elevation-high: ${v2Mode.elevationColors.high} !important;\n`;

    // Elevation styles (complete box-shadow values, one per level)
    css += `  --elevation-1: ${v2Mode.elevationStyles.level1} !important;\n`;
    css += `  --elevation-2: ${v2Mode.elevationStyles.level2} !important;\n`;
    css += `  --elevation-3: ${v2Mode.elevationStyles.level3} !important;\n`;

    css += '}\n';

    return css;
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

    console.debug(`Applied typography preview: ${typography.name}`);
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
    try {
      localStorage.setItem(TYPOGRAPHY_PREVIEW_KEY, JSON.stringify(typography));
    } catch (e) {
      console.error('Failed to save typography preview to storage', e);
    }
  }

  /**
   * Clear typography preview and restore default (syncs across tabs)
   */
  clearTypographyPreview(): void {
    if (typeof window === 'undefined') return;

    this.removeTypographyPreviewFromDOM();

    // Clear from localStorage (triggers storage event in other tabs)
    try {
      localStorage.removeItem(TYPOGRAPHY_PREVIEW_KEY);
    } catch (e) {
      console.error('Failed to clear typography preview from storage', e);
    }
  }

  /**
   * Load any existing typography preview from storage on page load
   */
  loadTypographyPreviewFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(TYPOGRAPHY_PREVIEW_KEY);
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
   * For backward compatibility
   * Get the current theme synchronously
   */
  getCurrentTheme(): number {
    // Default to 0 and then update asynchronously
    this.getCurrentThemeAsync().then((index) => this.setTheme(index));

    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved !== null) return parseInt(saved, 10);

    // If project-specific theme is assigned, use that
    const projectTheme = this.getProjectTheme();
    if (projectTheme !== null) return projectTheme;

    // For a new session, use saved theme
    const persistentTheme = localStorage.getItem(PERSISTENT_STORAGE_KEY);
    if (persistentTheme !== null) return parseInt(persistentTheme, 10);

    // Default to first theme
    return 0;
  }
}

// Create singleton instance
export const themeManager = new ThemeManager();
