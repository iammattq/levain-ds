// Mock for app-specific hooks like useEnhancedTheme
// These are mocked because they live in the app, not the package

export const useEnhancedTheme = () => ({
  theme: 'light' as const,
  setTheme: jest.fn(),
  themeIndex: 0,
  setThemeIndex: jest.fn(),
  saveThemePreference: jest.fn(),
});
