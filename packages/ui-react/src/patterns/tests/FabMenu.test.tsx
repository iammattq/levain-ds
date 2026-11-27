// FabMenu (T70) in a DOM. jsdom has no Web Animations and lays nothing out, so each close hands the panel the
// transitions it would have (fakes, as Ringmaster's T259 test does), and heights read 0.
import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Heart, Search } from 'lucide-react';
import { FabMenu, FAB_SIZE, type FabMenuItem } from '../FabMenu';
import { useDialogFocus } from '../../utils/useDialogFocus';

// no Reduce Motion (FabMenu.reduced.test.tsx has it); put back as it was
const ownMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }),
  });
});
afterAll(() => { if (ownMatchMedia) Object.defineProperty(window, 'matchMedia', ownMatchMedia); else delete (window as { matchMedia?: unknown }).matchMedia; });

/** A stand-in for one CSS transition in the panel: running until it's finished, cancelled or paused. */
type Fake = { playState: AnimationPlayState; effect: { target?: Element | null; getComputedTiming: () => { endTime: number } }; finished: Promise<unknown>; end: () => void; cancel: () => void };
const fake = (endTime = 260, target: Element | null = null): Fake => {
  let end!: () => void, cancel!: () => void;
  const a = { playState: 'running' as AnimationPlayState, effect: { target, getComputedTiming: () => ({ endTime }) } } as Fake;
  a.finished = new Promise<unknown>((res, rej) => {
    end = () => { a.playState = 'finished'; res(a); };
    cancel = () => { a.playState = 'idle'; rej(new DOMException('cancelled', 'AbortError')); };
  });
  a.finished.catch(() => {});
  a.end = end;
  a.cancel = cancel;
  return a;
};
let anims: Fake[] = [];
beforeEach(() => {
  jest.useFakeTimers();
  anims = [];
  (Element.prototype as unknown as { getAnimations: () => Fake[] }).getAnimations = () => anims.filter(a => a.playState !== 'finished' && a.playState !== 'idle');
});
afterEach(() => {
  delete (Element.prototype as unknown as { getAnimations?: unknown }).getAnimations;
  jest.useRealTimers();
});

const items: FabMenuItem[] = [
  { label: 'Notifications', icon: Heart, content: <p>Nothing new</p> },
  { label: 'Draft', content: <textarea aria-label="Note" defaultValue="" /> },
  { id: 'settings', label: 'Settings', icon: Search, content: <><button type="button">Reset</button><button type="button">Save</button></> },
];

const fab = () => document.querySelector<HTMLElement>('[data-fab-menu]')!;
const trigger = () => document.querySelector<HTMLButtonElement>('[data-fab-trigger]')!;
const contents = () => document.querySelector<HTMLElement>('[data-fab-content]')!;
const press = async (el: Element) => { await act(async () => { fireEvent.click(el); }); };
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
/** closes it by its cross, with `running` as the close's transitions */
const closeWith = async (...running: Fake[]) => { anims = running; await press(trigger()); };
const settled = () => !fab().hasAttribute('data-closing') && contents().style.visibility === 'hidden';

describe('FabMenu: the button and the morph', () => {
  it('closed: a 56px circle at the bottom-right (radius 28px, not radius-full), in the fill, named Open <label>', () => {
    render(<FabMenu items={items} label="Site menu" fill="#f5e9cf" fillText="#1b1b1b" />);
    const v = (name: string) => fab().style.getPropertyValue(name);
    for (const c of ['fixed', 'right-[calc(1.5rem+var(--safe-right))]', 'bottom-[calc(1.5rem+var(--safe-bottom))]', '[width:var(--fab-w)]', '[height:var(--fab-h)]', '[border-radius:var(--fab-r)]', '[background-color:var(--fab-bg)]', '[color:var(--fab-fg)]']) expect(fab().className.split(' ')).toContain(c);
    expect([v('--fab-w'), v('--fab-h'), v('--fab-r')]).toEqual([`${FAB_SIZE}px`, `${FAB_SIZE}px`, '28px']);
    expect(v('--fab-bg')).toBe('#f5e9cf');
    expect(v('--fab-fg')).toBe('#1b1b1b');
    expect(fab().dataset.open).toBe('false');
    expect(trigger()).toHaveAccessibleName('Open Site menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-controls', contents().id);
    expect(contents().id).not.toBe('');
    // a 1px border-default edge in every state, so the open panel shows on a light page
    expect(fab().className).toContain('inset_0_0_0_1px_var(--color-border-default)');
    // the contents are mounted but hidden and inert
    expect(contents().style.visibility).toBe('hidden');
    expect(contents()).toHaveAttribute('inert');
  });

  it('opens: the same element grows to the panel on the spring (460ms; radius on spring-out), the fill switches in one step at 180ms', async () => {
    render(<FabMenu items={items} label="Site menu" fill="#f5e9cf" />);
    await press(trigger());
    const s = fab().style;
    const v = (name: string) => s.getPropertyValue(name);
    expect(fab().dataset.open).toBe('true');
    expect(v('--fab-w')).toBe('var(--fab-menu-width)');
    expect(v('--fab-h')).toBe(`min(${FAB_SIZE}px, var(--fab-menu-cap))`); // jsdom: the list measures 0
    expect(v('--fab-r')).toBe('var(--radius-xl)');
    expect(v('--fab-bg')).toBe('var(--color-surface-elevated)');
    expect(s.transition).toContain('width var(--duration-morph) var(--ease-spring),');
    expect(s.transition).toContain('height var(--duration-morph) var(--ease-spring),');
    expect(s.transition).toContain('border-radius var(--duration-morph) var(--ease-spring-out)');
    // never blended: a zero-length step, delayed
    expect(s.transition).toContain('background-color 0s 180ms');
    expect(s.transition).not.toMatch(/background-color [1-9]/);
    // the contents fade in over 160ms and rise 6px, from 180ms
    const c = contents().style;
    expect(c.opacity).toBe('1');
    expect(c.transform).toBe('none');
    expect(c.transition).toBe('opacity 160ms ease-out 180ms, transform 320ms var(--ease-spring) 180ms');
    expect(contents()).toHaveAttribute('role', 'dialog');
    expect(contents()).toHaveAccessibleName('Site menu');
    expect(contents()).not.toHaveAttribute('inert');
    expect(trigger()).toHaveAccessibleName('Close Site menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('a { light, dark } fill: each mode its own colour, switched by the .dark class in CSS (no JS mode check)', () => {
    render(<FabMenu items={items} fill={{ light: '#dce5f6', dark: '#f5e9cf' }} fillText={{ light: '#000', dark: '#2b2418' }} />);
    const v = (name: string) => fab().style.getPropertyValue(name);
    expect([v('--fab-fill-light'), v('--fab-fill-dark')]).toEqual(['#dce5f6', '#f5e9cf']);
    expect([v('--fab-text-light'), v('--fab-text-dark')]).toEqual(['#000', '#2b2418']);
    expect(v('--fab-bg')).toBe('var(--fab-fill)');
    expect(v('--fab-fg')).toBe('var(--fab-text)');
    const cls = fab().className.split(' ');
    for (const c of ['[--fab-fill:var(--fab-fill-light)]', '[--fab-text:var(--fab-text-light)]', 'dark:[--fab-fill:var(--fab-fill-dark)]', 'dark:[--fab-text:var(--fab-text-dark)]']) expect(cls).toContain(c);
  });

  it('a string fill is unchanged: one colour straight on the panel, no per-mode properties', () => {
    render(<FabMenu items={items} fill="#f5e9cf" fillText="#2b2418" />);
    const v = (name: string) => fab().style.getPropertyValue(name);
    expect([v('--fab-bg'), v('--fab-fg')]).toEqual(['#f5e9cf', '#2b2418']);
    expect(['--fab-fill-light', '--fab-fill-dark', '--fab-text-light', '--fab-text-dark'].map(v)).toEqual(['', '', '', '']);
  });

  it('with a pair, the fill still switches to the panel in one step both ways (0s at 180ms open, 160ms close)', async () => {
    render(<FabMenu items={items} fill={{ light: '#dce5f6', dark: '#f5e9cf' }} fillText={{ light: '#000', dark: '#2b2418' }} />);
    await press(trigger());
    const s = fab().style;
    expect(s.getPropertyValue('--fab-bg')).toBe('var(--color-surface-elevated)');
    expect(s.transition).toContain('background-color 0s 180ms, color 0s 180ms');
    expect(s.transition).not.toMatch(/(background-color|color) [1-9]/);
    await closeWith(fake());
    expect(s.getPropertyValue('--fab-bg')).toBe('var(--fab-fill)');
    expect(s.transition).toContain('background-color 0s 160ms, color 0s 160ms');
    expect(s.transition).not.toMatch(/(background-color|color) [1-9]/);
  });

  it('closes on spring-out over 260ms, the fill back in one step at 160ms; contents fade out and sink 6px', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const a = fake();
    await closeWith(a);
    const s = fab().style;
    expect(['--fab-w', '--fab-h', '--fab-r'].map(n => s.getPropertyValue(n))).toEqual([`${FAB_SIZE}px`, `${FAB_SIZE}px`, '28px']);
    expect(s.transition).toBe('width var(--duration-shift) var(--ease-spring-out), height var(--duration-shift) var(--ease-spring-out), border-radius var(--duration-shift) var(--ease-spring-out), background-color 0s 160ms, color 0s 160ms');
    expect(contents().style.opacity).toBe('0');
    expect(contents().style.transform).toBe('translateY(6px)');
  });

  it('closing: data-closing while the morph runs, then the contents hide (still mounted) and data-closing clears', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const a = fake(), b = fake(160);
    await closeWith(a, b);
    expect(fab().dataset.open).toBe('false');
    expect(fab().dataset.closing).toBe('true');
    expect(contents()).toHaveAttribute('inert');
    expect(contents().style.visibility).toBe('visible');
    await act(async () => { b.end(); });
    expect(fab().dataset.closing).toBe('true');
    await act(async () => { a.end(); });
    expect(settled()).toBe(true);
    expect(screen.getByText('Nothing new', { selector: 'p' })).toBeInTheDocument();
  });

  it('a transition cancelled mid-close does not hang it: its retarget is waited out', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const width = fake(), fill = fake();
    await closeWith(width, fill);
    const retarget = fake();
    await act(async () => { fill.cancel(); anims = [width, retarget]; });
    expect(fab().dataset.closing).toBe('true');
    await act(async () => { width.end(); });
    expect(fab().dataset.closing).toBe('true');
    await act(async () => { retarget.end(); });
    expect(settled()).toBe(true);
  });

  it('all of them cancelled: it ends there', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const a = fake(), b = fake();
    await closeWith(a, b);
    await act(async () => { a.cancel(); b.cancel(); });
    expect(settled()).toBe(true);
  });

  it('one that never settles: the safety net ends it at 300ms', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    await closeWith(fake());
    await act(async () => { jest.advanceTimersByTime(299); });
    expect(fab().dataset.closing).toBe('true');
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(settled()).toBe(true);
  });

  it('one held on purpose (paused) keeps it past the net; let go, it ends', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const a = fake();
    a.playState = 'paused';
    await closeWith(a);
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(fab().dataset.closing).toBe('true');
    a.playState = 'running';
    await act(async () => { a.end(); });
    expect(settled()).toBe(true);
  });

  it("one paused inside a level is the app's, not the close's: the net still ends it", async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const inLevel = fake(260, document.querySelector('[data-fab-level="settings"] button'));
    inLevel.playState = 'paused';
    const width = fake(260, fab());
    await closeWith(width, inLevel);
    await act(async () => { width.end(); });
    expect(settled()).toBe(true);
    // and alone, held there: the net ends it at 300ms
    await press(trigger());
    await closeWith(inLevel);
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(settled()).toBe(true);
  });

  it('unmounted mid-close: its 300ms net is cleared and nothing lands after', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<FabMenu items={items} />);
    await press(trigger());
    const set = jest.spyOn(window, 'setTimeout'), clear = jest.spyOn(window, 'clearTimeout');
    const a = fake();
    await closeWith(a);
    expect(fab().dataset.closing).toBe('true');
    const nets = set.mock.calls.flatMap((c, i) => (c[1] === 300 ? [set.mock.results[i].value] : []));
    expect(nets).toHaveLength(1);
    unmount();
    expect(clear.mock.calls.map(c => c[0])).toContain(nets[0]);
    await act(async () => { a.end(); jest.advanceTimersByTime(1000); });
    expect(errors).not.toHaveBeenCalled();
    set.mockRestore(); clear.mockRestore(); errors.mockRestore();
  });

  it('a browser that cannot list animations: the net alone ends it', async () => {
    delete (Element.prototype as unknown as { getAnimations?: unknown }).getAnimations;
    render(<FabMenu items={items} />);
    await press(trigger());
    await press(trigger());
    expect(fab().dataset.closing).toBe('true');
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(settled()).toBe(true);
  });

  it('reopened mid-close: it turns back open and the stale close never lands', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    const a = fake();
    await closeWith(a);
    await press(trigger());
    await act(async () => { a.end(); jest.advanceTimersByTime(1000); });
    await flush();
    expect(fab().dataset.open).toBe('true');
    expect(contents().style.visibility).toBe('visible');
  });

  it('reopened mid-close on a level: it stays on that level (the reset waits for the settle)', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    await press(row('Draft'));
    const a = fake();
    await closeWith(a);
    expect(fab().dataset.level).toBe('Draft');
    await press(trigger());
    await act(async () => { a.end(); jest.advanceTimersByTime(1000); });
    await flush();
    expect(fab().dataset.open).toBe('true');
    expect(fab().dataset.level).toBe('Draft');
  });

  it('the glyph: three lines fold into a cross; glyph="plus" turns a plus 45deg', async () => {
    const { unmount } = render(<FabMenu items={items} />);
    const lines = () => [...document.querySelectorAll<HTMLElement>('[data-glyph="menu"] > span')];
    expect(lines()).toHaveLength(3);
    await press(trigger());
    expect(lines().map(l => l.style.transform || l.style.opacity)).toEqual(['translateY(5px) rotate(45deg)', 'rotate(-45deg)', '0']);
    unmount();
    render(<FabMenu items={items} glyph="plus" />);
    await press(trigger());
    expect(document.querySelector<SVGElement>('[data-glyph="plus"]')!.style.transform).toBe('rotate(45deg)');
  });

  it('className goes on the panel, and ref is the panel', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<FabMenu items={items} className="z-50" ref={ref} />);
    expect(ref.current).toBe(fab());
    expect(fab().className).toContain('z-50');
  });

  it('width caps to the screen less 1.5rem a side', () => {
    render(<FabMenu items={items} width="28rem" />);
    expect(fab().style.getPropertyValue('--fab-menu-width')).toBe('min(28rem, calc(100vw - 3rem - var(--safe-left, 0px) - var(--safe-right, 0px)))');
  });
});


const row = (name: string) => document.querySelector<HTMLElement>(`[data-fab-item="${name}"]`)!;
const levelOf = (id: string) => document.querySelector<HTMLElement>(`[data-fab-level="${id}"]`)!;
const listView = () => document.querySelector<HTMLElement>('[data-fab-list]')!;
const backOf = (id: string) => levelOf(id).querySelector<HTMLButtonElement>('[data-fab-back]')!;

describe('FabMenu: the list and its levels', () => {
  it('opens on the list: a row per item (MenuItem buttons with a chevron), every level mounted, off to the right and inert', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    expect(fab().dataset.level).toBe('list');
    expect(listView().style.transform).toBe('translateX(0)');
    expect(listView()).not.toHaveAttribute('inert');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(row('Notifications').tagName).toBe('BUTTON');
    expect(row('Notifications')).toHaveTextContent('Notifications');
    expect(row('Notifications').querySelector('[data-testid="icon-heart"]')).not.toBeNull();
    expect(row('settings')).toHaveTextContent('Settings'); // keyed by id when given
    for (const id of ['Notifications', 'Draft', 'settings']) {
      expect(levelOf(id).style.transform).toBe('translateX(100%)');
      expect(levelOf(id)).toHaveAttribute('inert');
      expect(levelOf(id).style.visibility).toBe('hidden');
    }
  });

  it("choosing a row slides to its level (260ms, spring-out), headed by a back arrow with the item's name", async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    await press(row('settings'));
    expect(fab().dataset.level).toBe('settings');
    expect(listView().style.transform).toBe('translateX(-100%)');
    expect(listView()).toHaveAttribute('inert');
    const lv = levelOf('settings');
    expect(lv.style.transform).toBe('translateX(0)');
    expect(lv.style.visibility).toBe('visible');
    expect(lv).not.toHaveAttribute('inert');
    expect(lv.style.transition).toBe('transform var(--duration-shift) var(--ease-spring-out)');
    expect(lv).toHaveAccessibleName('Settings');
    expect(backOf('settings')).toHaveAccessibleName('Back from Settings');
    expect(backOf('settings').querySelector('[data-testid="icon-chevronleft"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('the back arrow slides back to the list; the level stays visible to slide out, then another level takes its place', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    await press(row('Notifications'));
    await press(backOf('Notifications'));
    expect(fab().dataset.level).toBe('list');
    expect(listView().style.transform).toBe('translateX(0)');
    expect(levelOf('Notifications').style.transform).toBe('translateX(100%)');
    expect(levelOf('Notifications').style.visibility).toBe('visible');
    expect(levelOf('Notifications')).toHaveAttribute('inert');
    await press(row('Draft'));
    expect(levelOf('Notifications').style.visibility).toBe('hidden');
    expect(levelOf('Draft').style.visibility).toBe('visible');
  });

  it('a half-typed draft survives going back and forth, and closing and reopening on the list (every level stays mounted)', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    await press(row('Draft'));
    const note = screen.getByRole('textbox', { name: 'Note' }) as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: 'Half a thought' } });
    await press(backOf('Draft'));
    await press(row('Notifications'));
    await press(backOf('Notifications'));
    await press(row('Draft'));
    expect(note.isConnected).toBe(true);
    expect((screen.getByRole('textbox', { name: 'Note' }) as HTMLTextAreaElement).value).toBe('Half a thought');
    await closeWith();
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(settled()).toBe(true);
    expect(note.isConnected).toBe(true);
    // closed, the level left on screen is hidden too (a visible child would show through the hidden contents)
    expect(levelOf('Draft').style.visibility).toBe('hidden');
    await press(trigger());
    // it reopens on the list; choosing the item again shows the draft in place
    expect(fab().dataset.level).toBe('list');
    await press(row('Draft'));
    expect(fab().dataset.level).toBe('Draft');
    expect(note.value).toBe('Half a thought');
  });
});

const key = async (k: string, opts: KeyboardEventInit = {}) => {
  await act(async () => { fireEvent.keyDown(document.activeElement ?? document.body, { key: k, ...opts }); });
};
const pointerDown = async (el: Element) => {
  await act(async () => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true })); });
};

describe('FabMenu: closing routes, focus, controlled', () => {
  it('Escape steps back from a level to the list, then closes; focus lands on the row, then the button', async () => {
    render(<FabMenu items={items} />);
    trigger().focus();
    await press(trigger());
    await press(row('Notifications'));
    await key('Escape');
    expect(fab().dataset.open).toBe('true');
    expect(fab().dataset.level).toBe('list');
    expect(row('Notifications')).toHaveFocus();
    await key('Escape');
    expect(fab().dataset.open).toBe('false');
    expect(trigger()).toHaveFocus();
  });

  it('a second dialog open on top: Escape closes only that one, the next steps back and closes FabMenu', async () => {
    function Over() {
      const [open, setOpen] = useState(false);
      const ref = React.useRef<HTMLDivElement>(null);
      useDialogFocus(open, ref, () => setOpen(false));
      return <><button type="button" onClick={() => setOpen(true)}>Are you sure</button>{open && <div ref={ref} role="dialog" aria-label="Sure?" tabIndex={-1}><button type="button">Yes</button></div>}</>;
    }
    render(<FabMenu items={[{ label: 'Danger', content: <Over /> }]} />);
    await press(trigger());
    await press(row('Danger'));
    await press(screen.getByRole('button', { name: 'Are you sure' }));
    expect(screen.getByRole('dialog', { name: 'Sure?' })).toBeInTheDocument();
    await key('Escape');
    expect(screen.queryByRole('dialog', { name: 'Sure?' })).toBeNull();
    expect(fab().dataset.open).toBe('true');
    expect(fab().dataset.level).toBe('Danger');
    await key('Escape');
    expect(fab().dataset.level).toBe('list');
    await key('Escape');
    expect(fab().dataset.open).toBe('false');
  });

  it('an Escape a widget inside claimed keeps it open', async () => {
    const claimed: FabMenuItem[] = [{ label: 'Edit', content: <input aria-label="Name" onKeyDown={e => { if (e.key === 'Escape') e.preventDefault(); }} /> }];
    render(<FabMenu items={claimed} />);
    await press(trigger());
    await press(row('Edit'));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    await key('Escape');
    expect(fab().dataset.open).toBe('true');
    expect(fab().dataset.level).toBe('Edit');
  });

  it('a press outside closes it; a press inside, or in another dialog or popup, does not', async () => {
    render(<><button type="button">Elsewhere</button><div data-popover=""><button type="button">In a popover</button></div><FabMenu items={items} /></>);
    await press(trigger());
    await pointerDown(row('Draft'));
    expect(fab().dataset.open).toBe('true');
    await pointerDown(screen.getByRole('button', { name: 'In a popover' }));
    expect(fab().dataset.open).toBe('true');
    await pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(fab().dataset.open).toBe('false');
  });

  it('the button closes it (now a cross)', async () => {
    render(<FabMenu items={items} />);
    await press(trigger());
    await press(trigger());
    expect(fab().dataset.open).toBe('false');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it("focus moves in on open (the first row), into a level (its contents' first control, else the back arrow), and back to the button on close", async () => {
    render(<FabMenu items={items} />);
    trigger().focus();
    await press(trigger());
    expect(row('Notifications')).toHaveFocus();
    await press(row('settings'));
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveFocus();
    await press(backOf('settings'));
    expect(row('settings')).toHaveFocus();
    await press(row('Notifications'));
    expect(backOf('Notifications')).toHaveFocus();
    await press(trigger());
    expect(trigger()).toHaveFocus();
    // reopened, it starts on the list: focus goes to the first row, not the level left
    await press(trigger());
    expect(fab().dataset.level).toBe('list');
    expect(row('Notifications')).toHaveFocus();
  });

  it('Tab wraps inside the panel: the hidden list and levels are skipped, the cross is in the loop', async () => {
    render(<FabMenu items={items} />);
    trigger().focus();
    await press(trigger());
    await press(row('settings'));
    // Shift+Tab from the first (the back arrow; the list's rows are inert) wraps to the last, the cross
    backOf('settings').focus();
    await key('Tab', { shiftKey: true });
    expect(trigger()).toHaveFocus();
    // Tab from the last (the cross) wraps to the first, the back arrow of the level on screen
    trigger().focus();
    await key('Tab');
    expect(backOf('settings')).toHaveFocus();
  });

  it('uncontrolled: defaultOpen opens it at first; onOpenChange hears each change', async () => {
    const onOpenChange = jest.fn();
    render(<FabMenu items={items} defaultOpen onOpenChange={onOpenChange} />);
    expect(fab().dataset.open).toBe('true');
    await press(trigger());
    expect(fab().dataset.open).toBe('false');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("controlled: open is the app's; the routes ask through onOpenChange, and the app's own close closes it", async () => {
    const asked: boolean[] = [];
    function App() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>App close</button>
          <FabMenu items={items} open={open} onOpenChange={o => { asked.push(o); setOpen(o); }} />
        </>
      );
    }
    render(<App />);
    await press(trigger());
    expect(fab().dataset.open).toBe('true');
    await press(screen.getByRole('button', { name: 'App close' }));
    expect(fab().dataset.open).toBe('false');
    expect(asked).toEqual([true]);
    // held closed: the button only asks
    const { unmount } = render(<FabMenu items={items} open={false} onOpenChange={o => asked.push(o)} />);
    const held = document.querySelectorAll<HTMLButtonElement>('[data-fab-trigger]')[1]!;
    await press(held);
    expect(asked).toEqual([true, true]);
    expect(held).toHaveAttribute('aria-expanded', 'false');
    unmount();
  });
});
