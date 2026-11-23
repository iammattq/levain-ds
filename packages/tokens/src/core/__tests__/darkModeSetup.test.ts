/**
 * Dark mode set-up: themeManager.applyTheme puts <html> in the mode whose
 * tokens it writes, so an app needs no initTheme() call first, and calling
 * initTheme() before or after it gives the same result.
 *
 * Node environment (no jsdom in this package): a small fake DOM with a real
 * classList, storage and a controllable prefers-color-scheme.
 */
import { themeGeneratorV2 } from '../../generator/generator';
import type { ThemesV2Collection } from '../themeTypes';

type ChangeListener = (e: { matches: boolean }) => void;

interface FakeEnv {
  classes: Set<string>;
  storage: Record<string, string>;
  styleEl: { id: string; textContent: string };
  mqlListeners: ChangeListener[];
  setSystemDark: (dark: boolean) => void;
}

const entry = themeGeneratorV2.generate({
  name: 'Test',
  primary: '#5860fe',
  accent: '#d946ef',
});
const themes: ThemesV2Collection = { '0': entry };
// The canvas surface token, which differs between the modes.
const canvas = (m: 'light' | 'dark') =>
  `--color-surface-canvas: ${entry[m].tokens['surface-canvas']} !important;`;
const darkSurface = canvas('dark');
const lightSurface = canvas('light');

function installFakeDom(systemDark: boolean): FakeEnv {
  const classes = new Set<string>();
  const storage: Record<string, string> = {};
  const styleEl = { id: '', textContent: '' };
  const mqlListeners: ChangeListener[] = [];
  let prefersDark = systemDark;
  let styleAttached = false;

  const makeStorage = (s: Record<string, string>) => ({
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => {
      s[k] = String(v);
    },
    removeItem: (k: string) => {
      delete s[k];
    },
  });
  const localStorage = makeStorage(storage);
  const sessionStorage = makeStorage({});

  const g = global as unknown as Record<string, unknown>;
  g.localStorage = localStorage;
  g.sessionStorage = sessionStorage;
  g.window = {
    localStorage,
    sessionStorage,
    addEventListener: () => {},
    matchMedia: (query: string) => ({
      media: query,
      get matches() {
        return prefersDark;
      },
      addEventListener: (_type: string, fn: ChangeListener) => {
        mqlListeners.push(fn);
      },
    }),
  };
  g.document = {
    documentElement: {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
        toggle: (c: string, force?: boolean) => {
          const on = force ?? !classes.has(c);
          if (on) classes.add(c);
          else classes.delete(c);
          return on;
        },
      },
    },
    getElementById: (id: string) =>
      styleAttached && id === styleEl.id ? styleEl : null,
    createElement: () => styleEl,
    head: {
      appendChild: () => {
        styleAttached = true;
      },
    },
    body: { setAttribute: () => {} },
  };

  return {
    classes,
    storage,
    styleEl,
    mqlListeners,
    setSystemDark: (dark: boolean) => {
      prefersDark = dark;
      mqlListeners.forEach((fn) => fn({ matches: dark }));
    },
  };
}

async function loadModules() {
  const themeMode = await import('../themeMode');
  const { ThemeManager } = await import('../themeManager');
  const manager = new ThemeManager();
  manager.setThemeJsonLoader(async () => themes);
  manager.setTypographyJsonLoader(async () => ({}));
  return { themeMode, manager };
}

describe('dark mode set-up through applyTheme', () => {
  beforeAll(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('the fixture modes differ (the token checks mean something)', () => {
    expect(darkSurface).not.toEqual(lightSurface);
  });

  describe('applyTheme alone, no initTheme()', () => {
    it('saved dark: .dark on <html>, dark tokens written', async () => {
      const env = installFakeDom(false);
      env.storage.theme = 'dark';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(true);
      expect(env.styleEl.textContent).toContain(darkSurface);
    });

    it('nothing saved (first visit defaults to dark): .dark, dark tokens', async () => {
      const env = installFakeDom(false);
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(true);
      expect(env.styleEl.textContent).toContain(darkSurface);
      // Reading the default doesn't save it.
      expect(env.storage.theme).toBeUndefined();
    });

    it('saved light: no .dark, light tokens', async () => {
      const env = installFakeDom(true);
      env.storage.theme = 'light';
      env.classes.add('dark'); // stale class from somewhere else
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(false);
      expect(env.styleEl.textContent).toContain(lightSurface);
    });

    it('saved system, system dark: .dark, dark tokens', async () => {
      const env = installFakeDom(true);
      env.storage.theme = 'system';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(true);
      expect(env.styleEl.textContent).toContain(darkSurface);
    });

    it('saved system, system light: no .dark, light tokens', async () => {
      const env = installFakeDom(false);
      env.storage.theme = 'system';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(false);
      expect(env.styleEl.textContent).toContain(lightSurface);
    });

    it('saved system: the class follows a later system change', async () => {
      const env = installFakeDom(false);
      env.storage.theme = 'system';
      const { manager } = await loadModules();

      await manager.applyTheme(0);
      env.setSystemDark(true);

      expect(env.classes.has('dark')).toBe(true);
    });
  });

  describe('order does not matter', () => {
    it.each(['dark', 'light', 'system', null])(
      'saved %s: initTheme() after applyTheme leaves the same result as applyTheme alone',
      async (saved) => {
        const alone = installFakeDom(true);
        if (saved) alone.storage.theme = saved;
        const first = await loadModules();
        await first.manager.applyTheme(0);
        const aloneDark = alone.classes.has('dark');
        const aloneCss = alone.styleEl.textContent;

        jest.resetModules();
        const env = installFakeDom(true);
        if (saved) env.storage.theme = saved;
        const { themeMode, manager } = await loadModules();
        await manager.applyTheme(0);
        themeMode.initTheme();

        expect(env.classes.has('dark')).toBe(aloneDark);
        expect(env.styleEl.textContent).toBe(aloneCss);
      }
    );

    it('initTheme() then applyTheme (the current documented order) is unchanged', async () => {
      const env = installFakeDom(false);
      env.storage.theme = 'light';
      const { themeMode, manager } = await loadModules();

      themeMode.initTheme();
      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(false);
      expect(env.styleEl.textContent).toContain(lightSurface);
      expect(env.storage.theme).toBe('light');
    });

    it('both called: one system listener, not two', async () => {
      const env = installFakeDom(false);
      env.storage.theme = 'system';
      const { themeMode, manager } = await loadModules();

      themeMode.initTheme();
      await manager.applyTheme(0);
      themeMode.initTheme();
      await manager.applyTheme(0);

      expect(env.mqlListeners).toHaveLength(1);
    });

    it('the system listener reads the saved mode at change time', async () => {
      const env = installFakeDom(false);
      env.storage.theme = 'system';
      const { themeMode, manager } = await loadModules();

      await manager.applyTheme(0);
      themeMode.setTheme('light');
      env.setSystemDark(true);

      expect(env.classes.has('dark')).toBe(false);
    });
  });
});
