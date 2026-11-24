/**
 * Theme storage (T32): a base theme is kept by name, the keys carry a levain- prefix, a returning visitor's pre-T32
 * keys (an index into the list as it was) are read once into the new keys and removed, and blocked storage doesn't
 * throw. Node environment: a fake window with in-memory storage.
 */
import { themeGeneratorV2 } from '../../generator/generator';
import { baseThemesV2 } from '../../data/baseThemesV2';
import type { ThemesV2Collection } from '../themeTypes';

type Store = Record<string, string>;

/** Just enough DOM for setTheme/applyTheme to run; the DOM result is not what these tests check. */
function fakeDocument() {
  const el = () => ({ id: '', textContent: '', setAttribute: () => {} });
  return {
    documentElement: { classList: { toggle: () => true }, setAttribute: () => {} },
    getElementById: () => null,
    createElement: el,
    head: { appendChild: () => {} },
    body: { setAttribute: () => {} },
  };
}

function installStorage(local: Store, session: Store = {}) {
  const make = (s: Store) => ({
    getItem: (k: string) => (k in s ? s[k] : null),
    setItem: (k: string, v: string) => {
      s[k] = String(v);
    },
    removeItem: (k: string) => {
      delete s[k];
    },
  });
  const g = global as unknown as Record<string, unknown>;
  g.localStorage = make(local);
  g.sessionStorage = make(session);
  g.window = {
    localStorage: g.localStorage,
    sessionStorage: g.sessionStorage,
    addEventListener: () => {},
    location: { pathname: '/' },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  };
  g.document = fakeDocument();
}

/** Storage that throws on every access, as a blocked origin does. */
function installBlockedStorage() {
  const g = global as unknown as Record<string, unknown>;
  const blocked = () => {
    throw new Error('SecurityError: storage is blocked');
  };
  const store = { getItem: blocked, setItem: blocked, removeItem: blocked };
  g.localStorage = store;
  g.sessionStorage = store;
  g.window = {
    addEventListener: () => {},
    location: { pathname: '/' },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
  };
  g.document = fakeDocument();
}

async function load() {
  const { ThemeManager } = await import('../themeManager');
  const themeMode = await import('../themeMode');
  return { manager: new ThemeManager(), themeMode };
}

const slug = (i: number) => baseThemesV2[i].name.toLowerCase().replace(/\s+/g, '-');

describe('theme storage', () => {
  beforeAll(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());
  beforeEach(() => jest.resetModules());

  describe('saved by name, with prefixed keys', () => {
    it('setTheme keeps the theme name in the session and the active state', async () => {
      const local: Store = {};
      const session: Store = {};
      installStorage(local, session);
      const { manager } = await load();

      manager.setTheme(1);

      expect(session['levain-theme']).toBe(slug(1));
      expect(JSON.parse(local['levain-theme-active'])).toEqual({ type: 'builtin', name: slug(1) });
      expect(manager.getActiveThemeState()).toEqual({ type: 'builtin', index: 1, name: slug(1) });
    });

    it('saveTheme keeps the name for the next visit', async () => {
      const local: Store = {};
      installStorage(local);
      const { manager } = await load();

      manager.setTheme(3);
      manager.saveTheme();

      expect(local['levain-theme-saved']).toBe(slug(3));
    });

    it('a saved name finds its theme wherever it now sits in the list', async () => {
      const heather = themeGeneratorV2.generate({ name: 'Heather', primary: '#8a6fa8', accent: '#c98a6b' });
      const sage = themeGeneratorV2.generate({ name: 'Sage', primary: '#97A888', accent: '#C9966B' });
      const reordered: ThemesV2Collection = { '0': heather, '1': sage };
      installStorage({ 'levain-theme-saved': 'sage' });
      const { manager } = await load();
      manager.setThemeJsonLoader(async () => reordered);
      await manager.getThemeCount(); // loads the collection

      expect(await manager.getCurrentThemeAsync()).toBe(1);
    });

    it('the mode is saved under levain-theme-mode', async () => {
      const local: Store = {};
      installStorage(local);
      const { themeMode } = await load();

      themeMode.setTheme('light');

      expect(local['levain-theme-mode']).toBe('light');
      expect(local.theme).toBeUndefined();
    });
  });

  describe('a returning visitor’s old keys, read once', () => {
    it('savedThemeIndex becomes the name of the theme that index meant, and is removed', async () => {
      const local: Store = { savedThemeIndex: '2' };
      installStorage(local);
      const { manager } = await load();

      expect(local['levain-theme-saved']).toBe(slug(2));
      expect(local.savedThemeIndex).toBeUndefined();
      expect(await manager.getCurrentThemeAsync()).toBe(2);
    });

    it('themeIndex (session) becomes levain-theme', async () => {
      const session: Store = { themeIndex: '7' };
      installStorage({}, session);
      const { manager } = await load();

      expect(session['levain-theme']).toBe(slug(7));
      expect(session.themeIndex).toBeUndefined();
      expect(manager.getCurrentTheme()).toBe(7);
    });

    it('ok-themes-active: a built-in index becomes its name; a user theme is kept', async () => {
      const local: Store = { 'ok-themes-active': JSON.stringify({ type: 'builtin', index: 4 }) };
      installStorage(local);
      const first = await load();
      expect(JSON.parse(local['levain-theme-active'])).toEqual({ type: 'builtin', name: slug(4) });
      expect(first.manager.getActiveThemeState()).toEqual({ type: 'builtin', index: 4, name: slug(4) });
      expect(local['ok-themes-active']).toBeUndefined();

      jest.resetModules();
      const userLocal: Store = { 'ok-themes-active': JSON.stringify({ type: 'user', id: 'u1' }) };
      installStorage(userLocal);
      const second = await load();
      expect(second.manager.getActiveThemeState()).toEqual({ type: 'user', id: 'u1' });
    });

    it('typographyPreview and theme (the mode) move to their prefixed keys', async () => {
      const local: Store = { typographyPreview: '{"name":"x","vars":{}}', theme: 'light' };
      installStorage(local);
      const { themeMode } = await load();

      expect(themeMode.getTheme()).toBe('light');
      expect(local['levain-theme-mode']).toBe('light');
      expect(local['levain-typography-preview']).toBe('{"name":"x","vars":{}}');
      expect(local.theme).toBeUndefined();
      expect(local.typographyPreview).toBeUndefined();
    });

    it('a new key already set wins; the old key is still removed', async () => {
      const local: Store = { savedThemeIndex: '2', 'levain-theme-saved': slug(5) };
      installStorage(local);
      await load();

      expect(local['levain-theme-saved']).toBe(slug(5));
      expect(local.savedThemeIndex).toBeUndefined();
    });

    it('an index past the end of the old list is dropped', async () => {
      const local: Store = { savedThemeIndex: '99' };
      installStorage(local);
      const { manager } = await load();

      expect(local['levain-theme-saved']).toBeUndefined();
      expect(local.savedThemeIndex).toBeUndefined();
      expect(manager.getCurrentTheme()).toBe(0);
    });
  });

  describe('getCurrentTheme (D12)', () => {
    it('reads without side effects: no setTheme, no applyTheme, storage unchanged', async () => {
      const local: Store = { 'levain-theme-saved': slug(2) };
      const session: Store = {};
      installStorage(local, session);
      const { manager } = await load();
      const setTheme = jest.spyOn(manager, 'setTheme');
      const applyTheme = jest.spyOn(manager, 'applyTheme');
      const before = JSON.stringify([local, session]);

      expect(manager.getCurrentTheme()).toBe(2);
      await new Promise((r) => setTimeout(r, 0)); // anything it might have started asynchronously

      expect(setTheme).not.toHaveBeenCalled();
      expect(applyTheme).not.toHaveBeenCalled();
      expect(JSON.stringify([local, session])).toBe(before);
    });

    it('prefers the session theme over the saved one', async () => {
      installStorage({ 'levain-theme-saved': slug(2) }, { 'levain-theme': slug(5) });
      const { manager } = await load();

      expect(manager.getCurrentTheme()).toBe(5);
    });
  });

  describe('blocked storage', () => {
    it('reads as nothing saved and writes are dropped, without throwing', async () => {
      installBlockedStorage();
      const { manager, themeMode } = await load();

      expect(themeMode.getTheme()).toBe('dark');
      expect(() => themeMode.setTheme('light')).not.toThrow();
      expect(() => manager.setTheme(1)).not.toThrow();
      expect(() => manager.saveTheme()).not.toThrow();
      expect(manager.getCurrentTheme()).toBe(0);
      expect(manager.getActiveThemeState()).toBeNull();
      expect(() => manager.clearActiveUserTheme()).not.toThrow();
    });
  });
});
