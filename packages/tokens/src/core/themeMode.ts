/**
 * Theme Mode - handles dark/light mode toggling
 */

// Import theme mode type
import { ThemeMode } from './themeTypes';
import { migrateKey, readKey, writeKey } from './storage';
export type { ThemeMode };

/** Where the mode is saved. A pre-paint script that sets .dark before JavaScript reads this key. */
export const MODE_KEY = 'levain-theme-mode';
/** The key before T32, read once and removed. */
const OLD_MODE_KEY = 'theme';

let migrated = false;
function migrate(): void {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;
  migrateKey('local', OLD_MODE_KEY, MODE_KEY, (v) =>
    v === 'light' || v === 'dark' || v === 'system' ? v : null
  );
}

/**
 * Initialize theme based on stored preference or system setting
 */
export function initTheme(): void {
  if (typeof window === 'undefined') return;

  // Get stored theme preference, or default to dark for a first-time visitor.
  // Must stay in sync with the pre-paint script in the app shell, or the page
  // resolves one mode before paint and another after hydration.
  setTheme(getTheme());
}

/**
 * Set the theme mode (dark, light, or system)
 */
export function setTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;

  // Store the preference
  migrate();
  writeKey('local', MODE_KEY, theme);

  applyModeClass(theme);
}

let systemListenerAdded = false;

/**
 * Put <html> in the given mode: the `.dark` class on for dark, off for light,
 * following prefers-color-scheme for system. Also starts (once per page) the
 * listener that keeps the class following the system while the saved mode is
 * `system`. Shared by setTheme and themeManager.applyTheme, so whichever runs
 * first sets the page up. Internal: not exported from the package.
 */
export function applyModeClass(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const dark = theme === 'system' ? media.matches : theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);

  if (!systemListenerAdded) {
    systemListenerAdded = true;
    media.addEventListener('change', (e) => {
      // Read the saved mode at change time: it may have been set since.
      // The colours follow the class: both modes are in the theme CSS behind .dark (T32, D2).
      if (getTheme() === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
        document.body?.setAttribute('data-theme-mode', e.matches ? 'dark' : 'light');
      }
    });
  }
}

/**
 * Get the current theme mode
 */
export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  migrate();
  const saved = readKey('local', MODE_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
}

/**
 * Check if dark mode is active
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;

  const theme = getTheme();

  // System preference
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // User preference
  return theme === 'dark';
}
