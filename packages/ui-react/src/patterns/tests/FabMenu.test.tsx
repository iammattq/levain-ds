// FabMenu (T70) in a DOM. jsdom has no Web Animations and lays nothing out, so each close hands the panel the
// transitions it would have (fakes, as Ringmaster's T259 test does), and heights read 0.
import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Heart, Search } from 'lucide-react';
import { FabMenu, FAB_SIZE, type FabMenuItem } from '../FabMenu';

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
type Fake = { playState: AnimationPlayState; effect: { getComputedTiming: () => { endTime: number } }; finished: Promise<unknown>; end: () => void; cancel: () => void };
const fake = (endTime = 260): Fake => {
  let end!: () => void, cancel!: () => void;
  const a = { playState: 'running' as AnimationPlayState, effect: { getComputedTiming: () => ({ endTime }) } } as Fake;
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

  it('a half-typed draft survives going back and forth, and closing and reopening (every level stays mounted)', async () => {
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
    await press(trigger());
    // it reopens where it was left, the draft in place
    expect(fab().dataset.level).toBe('Draft');
    expect(note.value).toBe('Half a thought');
  });
});
