/**
 * Dark mode set-up: themeManager.applyTheme puts <html> in its mode and theme
 * (the .dark class and data-levain-theme), so an app needs no initTheme() call
 * first, and calling initTheme() before or after it gives the same result.
 * Colours are checked as the page would resolve them: the theme CSS rule that
 * matches <html>'s attribute and class.
 *
 * Node environment (no jsdom in this package): a small fake DOM with a real
 * classList, storage and a controllable prefers-color-scheme.
 */
import { themeGeneratorV2 } from '../../generator/generator';
import type { ThemesV2Collection } from '../themeTypes';

type ChangeListener = (e: { matches: boolean }) => void;

interface FakeEnv {
  classes: Set<string>;
  attrs: Record<string, string>;
  storage: Record<string, string>;
  styles: Map<string, { id: string; textContent: string }>;
  mqlListeners: ChangeListener[];
  setSystemDark: (dark: boolean) => void;
  /** The value a colour var takes on <html>: the rule for the page's theme attribute and mode, from the styles. */
  colour: (name: string) => string | undefined;
}

const entry = themeGeneratorV2.generate({
  name: 'Test',
  primary: '#5860fe',
  accent: '#d946ef',
});
const themes: ThemesV2Collection = { '0': entry };
// The canvas surface, which differs between the modes.
const darkSurface = entry.dark.tokens['surface-canvas'];
const lightSurface = entry.light.tokens['surface-canvas'];
const CANVAS = '--color-surface-canvas';
const MODE = 'levain-theme-mode';

function installFakeDom(systemDark: boolean): FakeEnv {
  const classes = new Set<string>();
  const attrs: Record<string, string> = {};
  const storage: Record<string, string> = {};
  const styles = new Map<string, { id: string; textContent: string }>();
  const mqlListeners: ChangeListener[] = [];
  let prefersDark = systemDark;

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
      setAttribute: (k: string, v: string) => {
        attrs[k] = v;
      },
      getAttribute: (k: string) => (k in attrs ? attrs[k] : null),
    },
    getElementById: (id: string) => styles.get(id) ?? null,
    createElement: () => ({ id: '', textContent: '' }),
    head: {
      appendChild: (el: { id: string; textContent: string }) => {
        styles.set(el.id, el);
      },
    },
    body: { setAttribute: () => {} },
  };

  // Only the selectors levain writes: [data-levain-theme="x"] for light, .dark[data-levain-theme="x"] for dark.
  const colour = (name: string) => {
    const theme = attrs['data-levain-theme'];
    if (!theme) return undefined;
    const sel = classes.has('dark')
      ? `.dark[data-levain-theme="${theme}"]`
      : `[data-levain-theme="${theme}"] {`;
    let found: string | undefined;
    for (const el of styles.values()) {
      for (const block of el.textContent.split('}')) {
        const head = block.slice(0, block.indexOf('{') + 1);
        if (!head.trimStart().startsWith(sel)) continue;
        const m = block.match(new RegExp(`${name}: ([^;]+);`));
        if (m) found = m[1];
      }
    }
    return found;
  };

  return {
    classes,
    attrs,
    storage,
    styles,
    mqlListeners,
    setSystemDark: (dark: boolean) => {
      prefersDark = dark;
      mqlListeners.forEach((fn) => fn({ matches: dark }));
    },
    colour,
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

  it('the fixture modes differ (the colour checks mean something)', () => {
    expect(darkSurface).not.toEqual(lightSurface);
  });

  describe('applyTheme alone, no initTheme()', () => {
    it('saved dark: .dark on <html>, dark tokens written', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'dark';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(true);
      expect(env.colour(CANVAS)).toBe(darkSurface);
    });

    it('nothing saved (first visit defaults to dark): .dark, dark tokens', async () => {
      const env = installFakeDom(false);
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(true);
      expect(env.colour(CANVAS)).toBe(darkSurface);
      // Reading the default doesn't save it.
      expect(env.storage[MODE]).toBeUndefined();
    });

    it('saved light: no .dark, light tokens', async () => {
      const env = installFakeDom(true);
      env.storage[MODE] = 'light';
      env.classes.add('dark'); // stale class from somewhere else
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(false);
      expect(env.colour(CANVAS)).toBe(lightSurface);
    });

    it('saved system, system dark: .dark, dark tokens', async () => {
      const env = installFakeDom(true);
      env.storage[MODE] = 'system';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(true);
      expect(env.colour(CANVAS)).toBe(darkSurface);
    });

    it('saved system, system light: no .dark, light tokens', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'system';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(false);
      expect(env.colour(CANVAS)).toBe(lightSurface);
    });

    it('saved system: the class and the colours follow a later system change (D2)', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'system';
      const { manager } = await loadModules();

      await manager.applyTheme(0);
      expect(env.colour(CANVAS)).toBe(lightSurface);

      env.setSystemDark(true);
      expect(env.classes.has('dark')).toBe(true);
      expect(env.colour(CANVAS)).toBe(darkSurface);

      env.setSystemDark(false);
      expect(env.classes.has('dark')).toBe(false);
      expect(env.colour(CANVAS)).toBe(lightSurface);
    });

    it('saved system: a user theme follows a system change too (D2)', async () => {
      const env = installFakeDom(true);
      env.storage[MODE] = 'system';
      const { manager } = await loadModules();

      await manager.applyUserTheme({ name: 'Mine', primary: '#5860fe', accent: '#d946ef' }, 'mine');
      expect(env.colour(CANVAS)).toBe(darkSurface);

      env.setSystemDark(false);
      expect(env.colour(CANVAS)).toBe(lightSurface);
    });
  });

  describe('colours as plain CSS (T32)', () => {
    it('applyTheme sets the theme attribute; the colours are not in the injected style', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'light';
      const { manager } = await loadModules();

      await manager.applyTheme(0);

      expect(env.attrs['data-levain-theme']).toBe('test');
      expect(env.styles.get('theme-styles')?.textContent).not.toContain('--color-');
      const base = env.styles.get('levain-themes')?.textContent ?? '';
      expect(base).toContain('[data-levain-theme="test"]');
      expect(base).not.toContain('!important');
    });

    it('the base themes are injected once, however often applyTheme runs', async () => {
      const env = installFakeDom(false);
      const { manager } = await loadModules();
      const appended = jest.spyOn(
        (global as unknown as { document: { head: { appendChild: (el: unknown) => void } } }).document.head,
        'appendChild'
      );

      await manager.applyTheme(0);
      await manager.applyTheme(0);

      const ids = appended.mock.calls.map(([el]) => (el as { id: string }).id);
      expect(ids.filter((id) => id === 'levain-themes')).toHaveLength(1);
      expect(env.styles.has('levain-themes')).toBe(true);
    });

    it('not injected when the page links generated/themes.css (its marker is set)', async () => {
      const env = installFakeDom(false);
      const g = global as unknown as Record<string, unknown>;
      g.getComputedStyle = () => ({
        getPropertyValue: (n: string) => (n === '--levain-themes' ? ' 1' : ''),
      });
      try {
        const { manager } = await loadModules();
        await manager.applyTheme(0);
        expect(env.styles.has('levain-themes')).toBe(false);
        expect(env.attrs['data-levain-theme']).toBe('test');
      } finally {
        delete g.getComputedStyle;
      }
    });

    it('a user theme is scoped by its own attribute, both modes, no !important', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'light';
      const { manager, themeMode } = await loadModules();
      const input = { name: 'Mine', primary: '#5860fe', accent: '#d946ef' };

      await manager.applyUserTheme(input, 'mine');

      expect(env.attrs['data-levain-theme']).toBe('user-mine');
      const css = env.styles.get('theme-styles')?.textContent ?? '';
      expect(css).not.toContain('!important');
      expect(env.colour(CANVAS)).toBe(lightSurface);
      expect(env.colour('--color-theme-user-primary')).toBe(entry.light.primary);

      // A mode change alone (no applyUserTheme again) switches the colours.
      themeMode.setTheme('dark');
      expect(env.colour(CANVAS)).toBe(darkSurface);
    });

    it('switching back to a base theme sets its attribute again', async () => {
      const env = installFakeDom(false);
      const { manager } = await loadModules();

      await manager.applyUserTheme({ name: 'Mine', primary: '#5860fe', accent: '#d946ef' }, 'mine');
      await manager.applyTheme(0);

      expect(env.attrs['data-levain-theme']).toBe('test');
    });
  });

  describe('applyUserTheme alone, no initTheme()', () => {
    it('saved dark: .dark on <html>, dark tokens written', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'dark';
      const { manager } = await loadModules();
      const input = { name: 'Mine', primary: '#5860fe', accent: '#d946ef' };

      await manager.applyUserTheme(input, 'mine');

      expect(env.classes.has('dark')).toBe(true);
      expect(env.colour(CANVAS)).toBe(darkSurface);
    });
  });

  describe('order does not matter', () => {
    it.each(['dark', 'light', 'system', null])(
      'saved %s: initTheme() after applyTheme leaves the same result as applyTheme alone',
      async (saved) => {
        const alone = installFakeDom(true);
        if (saved) alone.storage[MODE] = saved;
        const first = await loadModules();
        await first.manager.applyTheme(0);
        const aloneDark = alone.classes.has('dark');
        const aloneCss = alone.colour(CANVAS);

        jest.resetModules();
        const env = installFakeDom(true);
        if (saved) env.storage[MODE] = saved;
        const { themeMode, manager } = await loadModules();
        await manager.applyTheme(0);
        themeMode.initTheme();

        expect(env.classes.has('dark')).toBe(aloneDark);
        expect(env.colour(CANVAS)).toBe(aloneCss);
      }
    );

    it('initTheme() then applyTheme (the current documented order) is unchanged', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'light';
      const { themeMode, manager } = await loadModules();

      themeMode.initTheme();
      await manager.applyTheme(0);

      expect(env.classes.has('dark')).toBe(false);
      expect(env.colour(CANVAS)).toBe(lightSurface);
      expect(env.storage[MODE]).toBe('light');
    });

    it('both called: one system listener, not two', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'system';
      const { themeMode, manager } = await loadModules();

      themeMode.initTheme();
      await manager.applyTheme(0);
      themeMode.initTheme();
      await manager.applyTheme(0);

      expect(env.mqlListeners).toHaveLength(1);
    });

    it('the system listener reads the saved mode at change time', async () => {
      const env = installFakeDom(false);
      env.storage[MODE] = 'system';
      const { themeMode, manager } = await loadModules();

      await manager.applyTheme(0);
      themeMode.setTheme('light');
      env.setSystemDark(true);

      expect(env.classes.has('dark')).toBe(false);
    });
  });
});
