/**
 * Theme Mode - handles dark/light mode toggling
 */

// Import theme mode type
import { ThemeMode } from './themeTypes';
export type { ThemeMode };

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
  localStorage.setItem('theme', theme);

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
      if (getTheme() === 'system') {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    });
  }
}

/**
 * Get the current theme mode
 */
export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('theme') as ThemeMode) || 'dark';
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
