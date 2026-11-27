/**
 * ThemeManager Tests
 *
 * Tests for V2 theme CSS generation and user theme activation
 */
import { ThemeV2Entry } from '../themeTypes';
import { GeneratedThemeMode, ThemeInputV2 } from '../../generator/types';

// Mock the themeMode module
jest.mock('../themeMode', () => ({
  isDarkMode: jest.fn(() => false),
  getTheme: jest.fn(() => 'light'),
  applyModeClass: jest.fn(),
}));

// Mock the V2 generator
jest.mock('../../generator/generator', () => ({
  themeGeneratorV2: {
    generate: jest.fn((input: ThemeInputV2) => ({
      name: input.name,
      light: {
        primary: input.primary,
        accent: input.accent,
        surfaces: Array(26).fill('#ffffff'),
        primaryRamp: Array(9).fill(input.primary),
        accentRamp: Array(9).fill(input.accent),
        tokens: {},
        actions: {},
        states: {
          hover: 'oklch(0% 0 0 / 6%)',
          focus: 'oklch(0% 0 0 / 8%)',
          active: 'oklch(0% 0 0 / 10%)',
        },
        textOnPrimary: '#ffffff',
        textOnAccent: '#000000',
        elevationColors: {
          low: '#f5e5e5',
          default: '#ebd9d9',
          high: '#e0cccc',
        },
        elevationStyles: {
          level1: '0px 2px 8px #f5e5e5',
          level2: '0px 6px 16px #ebd9d9',
          level3: '0px 10px 30px #e0cccc',
        },
      },
      dark: {
        primary: input.primary,
        accent: input.accent,
        surfaces: Array(26).fill('#000000'),
        primaryRamp: Array(9).fill(input.primary),
        accentRamp: Array(9).fill(input.accent),
        tokens: {},
        actions: {},
        states: {
          hover: 'oklch(100% 0 0 / 6%)',
          focus: 'oklch(100% 0 0 / 8%)',
          active: 'oklch(100% 0 0 / 10%)',
        },
        textOnPrimary: '#ffffff',
        textOnAccent: '#ffffff',
        elevationColors: {
          low: '#1a1515',
          default: '#261e1e',
          high: '#332828',
        },
        elevationStyles: {
          level1: '0px 0px 14px #1a1515',
          level2: '0px 0px 22px #261e1e',
          level3: '0px 0px 36px #332828',
        },
      },
    })),
  },
}));

// Sample V2 theme mode data
const sampleV2Mode: GeneratedThemeMode = {
  primary: '#5860fe',
  accent: '#d946ef',
  elevationColors: {
    low: '#e8e5f0',
    default: '#d9d3e6',
    high: '#c9c0dc',
  },
  elevationStyles: {
    level1: '0px 2px 8px #e8e5f0',
    level2: '0px 6px 16px #d9d3e6',
    level3: '0px 10px 30px #c9c0dc',
  },
  surfaces: [
    '#000000',
    '#111111',
    '#1d1d1e',
    '#272728',
    '#303031',
    '#373839',
    '#3f3f40',
    '#454647',
    '#4c4c4e',
    '#525254',
    '#58585a',
    '#5d5e5f',
    '#636365',
    '#636365',
    '#8d8d8e',
    '#9d9e9f',
    '#aaabab',
    '#b5b5b6',
    '#bfbfc0',
    '#c8c8c8',
    '#d0d0d0',
    '#d7d7d8',
    '#dededf',
    '#e5e5e5',
    '#ebebec',
    '#f2f2f2',
  ],
  tokens: {
    'surface-canvas': '#ebebec',
    'surface-section': '#e5e5e5',
    'surface-card': '#dededf',
    'surface-component': '#d7d7d8',
    'surface-subtle': '#e5e5e5',
    'surface-interactive': '#dededf',
    'surface-elevated': '#ebebec',
    'surface-inverted': '#272728',
    'text-emphasis': '#111111',
    'text-default': '#272728',
    'text-muted': '#454647',
    'text-faint': '#58585a',
    'text-disabled': '#636365',
    'text-inverted': '#ebebec',
    'text-link': '#5860fe',
    'border-subtle': '#d0d0d0',
    'border-default': '#b5b5b6',
    'border-emphasis': '#8d8d8e',
    'border-focus': '#5860fe',
    'border-decorative': '#5860fe',
  },
  actions: {
    success: '#107823',
    'success-fg': '#004c00',
    'success-bg': '#c0ecc0',
    error: '#a83634',
    'error-fg': '#760009',
    'error-bg': '#ffcbc5',
    caution: '#a53e00',
    'caution-fg': '#730700',
    'caution-bg': '#ffcfb5',
    info: '#00739d',
    'info-fg': '#00476f',
    'info-bg': '#a6eaff',
  },
  states: {
    hover: 'oklch(0% 0 0 / 6%)',
    focus: 'oklch(0% 0 0 / 8%)',
    active: 'oklch(0% 0 0 / 10%)',
  },
  textOnPrimary: '#ffffff',
  textOnAccent: '#000000',
  primaryRamp: [
    '#e6e8ff',
    '#c8ccff',
    '#a4abff',
    '#808bff',
    '#5860fe',
    '#4348cc',
    '#33369c',
    '#23266c',
    '#13153e',
  ],
  accentRamp: [
    '#fbe5fd',
    '#f3bff7',
    '#e893ee',
    '#dd6bee',
    '#d946ef',
    '#a92cb8',
    '#7d2087',
    '#52155b',
    '#280a30',
  ],
};

// Sample V2 theme entry
const sampleV2ThemeEntry: ThemeV2Entry = {
  name: 'Test Theme',
  light: sampleV2Mode,
  dark: sampleV2Mode,
};

describe('ThemeManager', () => {
  // Reset modules before each test to allow different config mocking
  beforeEach(() => {
    jest.resetModules();
  });

  describe('generateThemeCSS', () => {
    it('generates V2-native CSS variables', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      // Check V2 primary and accent
      expect(css).toContain('--color-primary: #5860fe');
      expect(css).toContain('--color-accent: #d946ef');

      // Check legacy base alias
      expect(css).toContain('--color-base: #5860fe');

      // Check 26-stop surface ramp
      expect(css).toContain('--color-surface-0: #000000');
      expect(css).toContain('--color-surface-25: #f2f2f2');

      // Check semantic tokens
      expect(css).toContain('--color-surface-canvas: #ebebec');
      expect(css).toContain('--color-text-default: #272728');
      expect(css).toContain('--color-border-default: #b5b5b6');

      // Check state overlays
      expect(css).toContain('--color-state-hover: oklch(0% 0 0 / 6%)');
      expect(css).toContain('--color-state-focus: oklch(0% 0 0 / 8%)');
      expect(css).toContain('--color-state-active: oklch(0% 0 0 / 10%)');

      // Check auto-contrast text
      expect(css).toContain('--color-text-on-primary: #ffffff');
      expect(css).toContain('--color-text-on-accent: #000000');
    });

    it('generates action colors without semantic- prefix', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      // V2 action colors should not have semantic- prefix
      expect(css).toContain('--color-success: #107823');
      expect(css).toContain('--color-error: #a83634');
      expect(css).toContain('--color-caution: #a53e00');
      expect(css).toContain('--color-info: #00739d');
    });

    it('outputs --color-elevation-low with hex value', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      expect(css).toContain('--color-elevation-low: #e8e5f0');
    });

    it('outputs --color-elevation-default with hex value', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      expect(css).toContain('--color-elevation-default: #d9d3e6');
    });

    it('outputs --color-elevation-high with hex value', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      expect(css).toContain('--color-elevation-high: #c9c0dc');
    });

    it('outputs --elevation-1 with box-shadow value', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      // Should contain offset and blur values in shadow string
      expect(css).toContain('--elevation-1: 0px 2px 8px #e8e5f0');
    });

    it('outputs --elevation-3 with box-shadow value', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const css = manager.generateThemeCSS(sampleV2Mode);

      // Should contain offset and blur values in shadow string
      expect(css).toContain('--elevation-3: 0px 10px 30px #c9c0dc');
    });

    it('escapes special characters in CSS variables correctly', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      // Test with box-shadow values that contain valid CSS
      const css = manager.generateThemeCSS(sampleV2Mode);

      // Verify the generated CSS is valid (no unescaped special chars)
      // The box-shadow value should be properly formatted
      expect(css).toMatch(
        /--elevation-1:\s*-?\d+px\s+-?\d+px\s+\d+px\s+#[a-fA-F0-9]+/
      );
      expect(css).toMatch(
        /--elevation-3:\s*-?\d+px\s+-?\d+px\s+\d+px\s+#[a-fA-F0-9]+/
      );
    });
  });

  describe('generateTypographyCSS', () => {
    // T74: the --type-*-color vars resolve where declared, so a scheme scope needs its own copy.
    it('re-declares every type colour var on the scheme scope, and only those', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();
      const css = manager.generateTypographyCSS({
        name: 'T',
        vars: {
          'type-caption-size': '12px',
          'type-caption-color': 'var(--color-text-muted)',
          'type-caption-compact-color': 'var(--color-text-muted)',
        },
      });
      const scope = css.split('[data-levain-scheme] {')[1];
      expect(scope).toContain('--type-caption-color: var(--color-text-muted) !important;');
      expect(scope).toContain('--type-caption-compact-color: var(--color-text-muted) !important;');
      expect(scope).not.toContain('--type-caption-size');
    });

    it('leaves the :root block as it was, every var still in it', async () => {
      const { ThemeManager } = await import('../themeManager');
      const vars = {
        'type-caption-size': '12px',
        'type-caption-color': 'var(--color-text-muted)',
      };
      const css = new ThemeManager().generateTypographyCSS({ name: 'T', vars });
      expect(css.split('[data-levain-scheme] {')[0]).toBe(
        ':root {\n  --type-caption-size: 12px !important;\n  --type-caption-color: var(--color-text-muted) !important;\n}\n',
      );
    });

    it('does the same for the shipped presets', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const presets = require('../../../generated/typographyV2.json') as Record<
        string,
        { name: string; vars: Record<string, string> }
      >;
      Object.values(presets).forEach((preset) => {
        const css = manager.generateTypographyCSS(preset as never);
        const names = Object.keys(preset.vars).filter((k) => /^type-.*-color$/.test(k));
        expect(names.length).toBeGreaterThan(0);
        const scope = css.split('[data-levain-scheme] {')[1];
        names.forEach((k) => expect(scope).toContain(`--${k}:`));
      });
    });

    it('adds no scope block when a preset has no colour vars', async () => {
      const { ThemeManager } = await import('../themeManager');
      const css = new ThemeManager().generateTypographyCSS({ name: 'T', vars: {} });
      expect(css).not.toContain('data-levain-scheme');
    });
  });

  describe('generateAllThemesCSS', () => {
    it('generates theme selector variables', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const themes = {
        '0': sampleV2ThemeEntry,
        '1': sampleV2ThemeEntry,
      };

      const css = manager.generateAllThemesCSS(themes, 'light');

      expect(css).toContain('--color-theme-0-primary: #5860fe');
      expect(css).toContain('--color-theme-0-secondary: #d946ef');
      expect(css).toContain('--color-theme-1-primary: #5860fe');
      expect(css).toContain('--color-theme-1-secondary: #d946ef');
    });
  });

  describe('ensureValidThemeIndex', () => {
    it('returns the index if valid', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const themes = {
        '0': sampleV2ThemeEntry,
        '1': sampleV2ThemeEntry,
        '2': sampleV2ThemeEntry,
      };
      expect(manager.ensureValidThemeIndex(1, themes)).toBe(1);
    });

    it('returns smallest index if requested index is invalid', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const themes = {
        '0': sampleV2ThemeEntry,
        '1': sampleV2ThemeEntry,
        '2': sampleV2ThemeEntry,
      };
      expect(manager.ensureValidThemeIndex(99, themes)).toBe(0);
    });

    it('handles non-sequential indices', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      const themes = {
        '5': sampleV2ThemeEntry,
        '10': sampleV2ThemeEntry,
        '15': sampleV2ThemeEntry,
      };
      expect(manager.ensureValidThemeIndex(10, themes)).toBe(10);
      expect(manager.ensureValidThemeIndex(7, themes)).toBe(5);
    });
  });

  describe('isV2()', () => {
    it('always returns true', async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      expect(manager.isV2()).toBe(true);
    });
  });

  describe('User Theme Activation', () => {
    // Sample user theme input
    const sampleUserTheme: ThemeInputV2 = {
      name: 'My Custom Theme',
      primary: '#ff0000',
      accent: '#00ff00',
    };

    // Mock storage for Node environment
    let mockLocalStorage: Record<string, string> = {};
    let mockSessionStorage: Record<string, string> = {};

    // Create mock storage objects
    const createMockStorage = (storage: Record<string, string>) => ({
      getItem: jest.fn((key: string) => storage[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }),
      length: 0,
      key: jest.fn(() => null),
    });

    beforeAll(() => {
      // Set up window mock with storage
      const localStorageMock = createMockStorage(mockLocalStorage);
      const sessionStorageMock = createMockStorage(mockSessionStorage);

      Object.defineProperty(global, 'window', {
        value: {
          addEventListener: jest.fn(),
          localStorage: localStorageMock,
          sessionStorage: sessionStorageMock,
        },
        writable: true,
      });
      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
      Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });
      Object.defineProperty(global, 'document', {
        value: {
          getElementById: jest.fn(() => null),
          createElement: jest.fn(() => ({
            id: '',
            textContent: '',
          })),
          head: {
            appendChild: jest.fn(),
          },
          body: {
            setAttribute: jest.fn(),
          },
          documentElement: {
            setAttribute: jest.fn(),
          },
        },
        writable: true,
      });
    });

    beforeEach(() => {
      // Reset mock storage
      mockLocalStorage = {};
      mockSessionStorage = {};
      // Re-bind the storage mocks with cleared storage
      const localStorageMock = createMockStorage(mockLocalStorage);
      const sessionStorageMock = createMockStorage(mockSessionStorage);
      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
      Object.defineProperty(global, 'sessionStorage', {
        value: sessionStorageMock,
        writable: true,
      });
      (
        global.window as { localStorage: typeof localStorageMock }
      ).localStorage = localStorageMock;
      (
        global.window as { sessionStorage: typeof sessionStorageMock }
      ).sessionStorage = sessionStorageMock;
      jest.clearAllMocks();
    });

    // Helper to create a manager with mock loaders configured
    const createManagerWithLoaders = async () => {
      const { ThemeManager } = await import('../themeManager');
      const manager = new ThemeManager();

      // Configure mock loaders
      manager.setThemeJsonLoader(async () => ({
        '0': sampleV2ThemeEntry,
      }));
      manager.setTypographyJsonLoader(async () => ({
        '0': { name: 'Default', vars: {} },
      }));

      return manager;
    };

    describe('applyUserTheme()', () => {
      it('updates getActiveUserThemeId()', async () => {
        const manager = await createManagerWithLoaders();

        expect(manager.getActiveUserThemeId()).toBeNull();

        await manager.applyUserTheme(sampleUserTheme, 'user-456');

        expect(manager.getActiveUserThemeId()).toBe('user-456');
      });
    });

    describe('clearUserThemeCache()', () => {
      it('clears active state when clearing active theme cache', async () => {
        const manager = await createManagerWithLoaders();

        await manager.applyUserTheme(sampleUserTheme, 'user-abc');
        expect(manager.getActiveUserThemeId()).toBe('user-abc');

        manager.clearUserThemeCache('user-abc');

        expect(manager.getActiveUserThemeId()).toBeNull();
      });

      it('does not clear active state for different theme', async () => {
        const manager = await createManagerWithLoaders();

        await manager.applyUserTheme(sampleUserTheme, 'user-abc');
        manager.clearUserThemeCache('user-other');

        expect(manager.getActiveUserThemeId()).toBe('user-abc');
      });
    });

    describe('clearActiveUserTheme()', () => {
      it('clears active user theme state', async () => {
        const manager = await createManagerWithLoaders();

        await manager.applyUserTheme(sampleUserTheme, 'user-del');
        expect(manager.getActiveUserThemeId()).toBe('user-del');

        manager.clearActiveUserTheme();

        expect(manager.getActiveUserThemeId()).toBeNull();
      });
    });

    describe('setTheme() with user theme active', () => {
      it('clears active user theme when selecting built-in', async () => {
        const manager = await createManagerWithLoaders();

        await manager.applyUserTheme(sampleUserTheme, 'user-switch');
        expect(manager.getActiveUserThemeId()).toBe('user-switch');

        manager.setTheme(0);

        expect(manager.getActiveUserThemeId()).toBeNull();
      });
    });

    describe('Elevation CSS Variables Integration', () => {
      it('applies elevation CSS to DOM when applying user theme', async () => {
        const manager = await createManagerWithLoaders();

        // Track what CSS is generated
        let capturedCSS = '';
        const mockStyleEl = {
          id: 'theme-styles',
          textContent: '',
        };
        Object.defineProperty(mockStyleEl, 'textContent', {
          set: (value: string) => {
            capturedCSS = value;
          },
          get: () => capturedCSS,
        });

        (document.getElementById as jest.Mock).mockReturnValue(mockStyleEl);

        await manager.applyUserTheme(sampleUserTheme, 'elevation-test');

        // Verify elevation colors are in the CSS
        expect(capturedCSS).toContain('--color-elevation-low:');
        expect(capturedCSS).toContain('--color-elevation-default:');
        expect(capturedCSS).toContain('--color-elevation-high:');

        // Verify elevation styles are in the CSS
        expect(capturedCSS).toContain('--elevation-1:');
        expect(capturedCSS).toContain('--elevation-3:');
      });

      it('uses defaults when theme has no elevation field', async () => {
        const manager = await createManagerWithLoaders();

        // The mock generator always returns elevation data (simulating mergeWithDefaults)
        // so when we apply a theme without explicit elevation, it still gets defaults
        let capturedCSS = '';
        const mockStyleEl = {
          id: 'theme-styles',
          textContent: '',
        };
        Object.defineProperty(mockStyleEl, 'textContent', {
          set: (value: string) => {
            capturedCSS = value;
          },
          get: () => capturedCSS,
        });

        (document.getElementById as jest.Mock).mockReturnValue(mockStyleEl);

        // Apply theme without explicit elevation (generator mock handles defaults)
        const themeWithoutElevation: ThemeInputV2 = {
          name: 'No Elevation Theme',
          primary: '#0000ff',
          accent: '#00ff00',
          // Note: no elevation field - generator applies defaults
        };

        await manager.applyUserTheme(
          themeWithoutElevation,
          'no-elevation-test'
        );

        // Should still have elevation CSS (from defaults via mergeWithDefaults in generator)
        expect(capturedCSS).toContain('--color-elevation-low:');
        expect(capturedCSS).toContain('--color-elevation-default:');
        expect(capturedCSS).toContain('--color-elevation-high:');
        expect(capturedCSS).toContain('--elevation-1:');
        expect(capturedCSS).toContain('--elevation-3:');
      });
    });
  });
});
