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
  const storedTheme = (localStorage.getItem('theme') as ThemeMode) || 'dark';
  setTheme(storedTheme);

  // Listen for system preference changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (storedTheme === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    });
}

/**
 * Set the theme mode (dark, light, or system)
 */
export function setTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;

  // Store the preference
  localStorage.setItem('theme', theme);

  // Apply theme
  if (theme === 'system') {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
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
