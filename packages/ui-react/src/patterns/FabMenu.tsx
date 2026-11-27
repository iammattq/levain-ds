'use client';

/**
 * FabMenu (T70): a round floating button at the bottom-right that is itself the menu. One element animates its width,
 * height and corner radius between the two shapes, growing up and left out of the corner, so the button visibly becomes
 * the panel; lifted from mattquinn.ca's OS menu (its timings) and Ringmaster's New task button (T259: the fill switch,
 * the close that always settles).
 *
 * The panel opens on a list of `items`; choosing one slides to that item's level, with a back arrow. Every level stays
 * mounted, open or closed, so a half-typed draft survives going back and forth and closing. The contents keep the open
 * width, anchored right (the edge that stays put), so nothing reflows mid-morph; they fade and rise 6px once it has
 * started to open.
 *
 * Motion (CSS transitions, the tokens' --ease-spring and --ease-spring-out): open, the size on the spring over 460ms
 * (it overshoots and settles) and the radius from 28px (half the circle; a 9999px radius squares the corners mid-morph)
 * on spring-out; close, all three over 260ms on spring-out. The fill switches from the button's colour to the panel's
 * in one step (at 180ms opening, 160ms closing), never blended: a blend of a cream and a dark surface goes taupe. Under
 * Reduce Motion there is no morph: the shape changes in one step and the contents only fade.
 *
 * The close always settles: it waits on every transition still running in the panel, looks again (a cancelled or
 * retargeted one starts another), and a safety net ends it at 300ms unless one is held on purpose (paused), so the
 * panel never stays half-closed.
 *
 * Focus (useDialogFocus, shared with Modal and Drawer): it moves into the contents on open, Tab wraps inside the panel,
 * and it goes back to what had it (the button) on close. Escape steps back from a level to the list, then closes; a
 * widget inside that claims Escape keeps it open. A press outside closes it, unless it lands in another dialog or popup.
 */
import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, PlusIcon, type LucideProps } from 'lucide-react';
import MenuItem from '../components/MenuItem';
import { cn } from '../utils/cn';
import { focusables, useDialogFocus } from '../utils/useDialogFocus';
import { useControlled } from '../utils/useControlled';

export interface FabMenuItem {
  /** Its key; the label when left out. */
  id?: string;
  /** The row's text, and its level's heading. */
  label: string;
  /** The row's left icon (e.g. from lucide-react). */
  icon?: ElementType<LucideProps>;
  /** The item's level: shown when the row is chosen, and kept mounted while hidden. */
  content: ReactNode;
}

/** A colour, or one per mode: `dark` applies under levain's `.dark` class. */
export type FabMenuColor = string | { light: string; dark: string };

export interface FabMenuProps {
  items: FabMenuItem[];
  /** The panel's accessible name; the button reads "Open <label>" and "Close <label>". */
  label?: string;
  /**
   * The closed button's background (e.g. the site's cream, #f5e9cf). Defaults to the panel's surface.
   * A `{ light, dark }` pair gives each mode its own, switched by the `.dark` class in CSS (no flash).
   */
  fill?: FabMenuColor;
  /** The closed button's glyph colour on `fill`; a pair as for `fill`. Defaults to the default text colour. */
  fillText?: FabMenuColor;
  /** The button's mark: three lines that fold into a cross, or a plus that turns into one. */
  glyph?: 'menu' | 'plus';
  /** The open panel's width (any CSS length); capped to the screen less 1.5rem a side. */
  width?: string;
  /** Controlled: whether it's open. Leave out for uncontrolled. */
  open?: boolean;
  /** Uncontrolled: open at first. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** The closed circle's size; its radius is half of it. */
export const FAB_SIZE = 56;
/** How long the close takes; the safety net ends it 40ms later. */
const CLOSE_MS = 260;
/** The contents' fade, and when it starts opening (as the fill switches). */
const FADE_MS = 160;
const IN_DELAY_MS = 180;
/** Where a press doesn't count as outside: what other dialogs and popups draw in their own portals. */
const ELSEWHERE = '[role="dialog"], [role="menu"], [role="listbox"], [data-popover], [data-sheet-overlay], [data-drawer-overlay], [data-image-viewer]';

const keyOf = (item: FabMenuItem) => item.id ?? item.label;

/** The transitions, per state, as the site's and t259's CSS has them. */
function transitions(open: boolean, reduce: boolean) {
  if (reduce) {
    return open
      ? { panel: 'none', content: `opacity ${FADE_MS}ms ease-out`, slide: 'none' }
      : {
          // the contents fade first, then the shape goes back in one step
          panel: ['width', 'height', 'border-radius', 'background-color', 'color'].map(p => `${p} 0s ${FADE_MS}ms`).join(', '),
          content: `opacity ${FADE_MS}ms ease-out`,
          slide: 'none',
        };
  }
  return open
    ? {
        panel: `width var(--duration-morph) var(--ease-spring), height var(--duration-morph) var(--ease-spring), border-radius var(--duration-morph) var(--ease-spring-out), background-color 0s ${IN_DELAY_MS}ms, color 0s ${IN_DELAY_MS}ms`,
        content: `opacity ${FADE_MS}ms ease-out ${IN_DELAY_MS}ms, transform 320ms var(--ease-spring) ${IN_DELAY_MS}ms`,
        slide: 'transform var(--duration-shift) var(--ease-spring-out)',
      }
    : {
        panel: `width var(--duration-shift) var(--ease-spring-out), height var(--duration-shift) var(--ease-spring-out), border-radius var(--duration-shift) var(--ease-spring-out), background-color 0s ${FADE_MS}ms, color 0s ${FADE_MS}ms`,
        content: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
        slide: 'transform var(--duration-shift) var(--ease-spring-out)',
      };
}

/** The site's mark: three hairlines, the last one short, that fold into a cross in place. */
function MenuGlyph({ open, reduce }: { open: boolean; reduce: boolean }) {
  const t = reduce ? 'none' : `transform ${CLOSE_MS}ms var(--ease-spring-out), opacity 120ms ease-out`;
  const line = 'absolute left-0 h-px bg-current';
  return (
    <span aria-hidden className="relative block h-[11px] w-5" data-glyph="menu">
      <span className={cn(line, 'top-0 w-full')} style={{ transition: t, transform: open ? 'translateY(5px) rotate(45deg)' : undefined }} />
      <span className={cn(line, 'top-[5px] w-full')} style={{ transition: t, transform: open ? 'rotate(-45deg)' : undefined }} />
      <span className={cn(line, 'top-[10px] w-[65%]')} style={{ transition: t, opacity: open ? 0 : 1 }} />
    </span>
  );
}

export const FabMenu = forwardRef<HTMLDivElement, FabMenuProps>(function FabMenu(
  {
    items,
    label = 'Menu',
    fill = 'var(--color-surface-elevated)',
    fillText = 'var(--color-text-default)',
    glyph = 'menu',
    width = '20rem',
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    className,
  },
  ref,
) {
  const reduce = !!useReducedMotion();
  const [open, setOpen] = useControlled(openProp, defaultOpen, onOpenChange, 'FabMenu');
  const panel = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const setPanel = useCallback(
    (el: HTMLDivElement | null) => {
      panel.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  // shown: open, or closing (the morph back still running). Closed and settled, the contents are hidden (still mounted)
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  const closing = !open && shown;

  // the level on screen (null: the list), and the last one chosen, which stays visible while it slides back out
  const [level, setLevel] = useState<string | null>(null);
  const [lastLevel, setLastLevel] = useState<string | null>(null);
  const atList = level === null;

  const close = useCallback(() => setOpen(false), [setOpen]);
  const back = useCallback(() => setLevel(null), []);

  // the close settles: every finite transition running in the panel is waited out (allSettled: one cancelled or
  // retargeted rejects), then it looks again (a retarget starts a new one), until none is left. The net ends it at
  // CLOSE_MS+40 whatever happens, unless one is held on purpose (paused); a browser that can't list them has only the net
  useEffect(() => {
    if (open || !shown) return;
    const el = panel.current;
    if (!el) { setShown(false); return; }
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => { if (!live) return; live = false; clearTimeout(timer); setShown(false); };
    const listable = typeof el.getAnimations === 'function';
    // the panel's own: the morph, the contents' fade, the mark. Not the app's, inside the list or a level (one paused or
    // endless there would hold the close for ever)
    const own = (a: Animation) => !((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('[data-fab-list],[data-fab-level]');
    const running = () => (listable ? el.getAnimations({ subtree: true }) : []).filter(a =>
      own(a) && a.playState !== 'finished' && a.playState !== 'idle' && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)));
    const net = () => { timer = setTimeout(() => (running().some(a => a.playState === 'paused') ? net() : finish()), CLOSE_MS + 40); };
    net();
    if (listable) void (async () => {
      for (let now = running(); live && now.length; now = running()) await Promise.allSettled(now.map(a => a.finished));
      finish();
    })();
    return () => { live = false; clearTimeout(timer); };
  }, [open, shown]);

  // the open height: the view on screen's own, measured before paint, and again as it changes
  const list = useRef<HTMLDivElement>(null);
  const levels = useRef(new Map<string, HTMLElement>());
  const [viewH, setViewH] = useState(0);
  useLayoutEffect(() => {
    const view = level === null ? list.current : levels.current.get(level);
    if (!view) return;
    const measure = () => setViewH(Math.ceil(view.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(view);
    return () => ro.disconnect();
  }, [level, items]);

  // Escape: a level steps back to the list, the list closes. Tab wraps inside; focus goes back on close
  useDialogFocus(open, panel, () => (level !== null ? back() : close()));

  // focus into the contents: on open, and on each move between the list and a level (back: the row that opened it)
  const firstOpen = useRef(true);
  useEffect(() => {
    if (!open) { firstOpen.current = true; return; }
    const opening = firstOpen.current;
    firstOpen.current = false;
    let target: HTMLElement | null | undefined;
    if (atList) {
      target = !opening && lastLevel !== null
        ? [...(list.current?.querySelectorAll<HTMLElement>('[data-fab-item]') ?? [])].find(el => el.dataset.fabItem === lastLevel)
        : list.current ? focusables(list.current)[0] : null;
    } else {
      const view = levels.current.get(level!);
      const body = view?.querySelector<HTMLElement>('[data-fab-level-body]');
      target = (body && focusables(body)[0]) ?? view?.querySelector<HTMLElement>('[data-fab-back]');
    }
    (target ?? content.current)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, level]);

  // a press outside closes it (the button toggles it itself; another dialog's or popup's portal isn't outside)
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || panel.current?.contains(t) || t.closest?.(ELSEWHERE)) return;
      close();
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open, close]);

  const choose = (id: string) => { setLastLevel(id); setLevel(id); };
  const tr = transitions(open, reduce);
  const openWidth = `min(${width}, calc(100vw - 3rem - var(--safe-left, 0px) - var(--safe-right, 0px)))`;
  const cap = 'calc(100dvh - 6rem - var(--safe-top, 0px) - var(--safe-bottom, 0px))';

  // the shape and fill go through custom properties the classes below read, one set per state
  // a { light, dark } pair goes through per-mode properties the dark: classes below pick from
  const modeVars = (c: FabMenuColor, name: string) =>
    typeof c === 'string' ? { value: c, vars: {} } : { value: `var(--fab-${name})`, vars: { [`--fab-${name}-light`]: c.light, [`--fab-${name}-dark`]: c.dark } };
  const bg = modeVars(fill, 'fill');
  const fg = modeVars(fillText, 'text');
  const panelStyle = {
    '--fab-menu-width': openWidth,
    '--fab-menu-cap': cap,
    ...bg.vars,
    ...fg.vars,
    ...(open
      ? {
          '--fab-w': 'var(--fab-menu-width)',
          '--fab-h': `min(${viewH + FAB_SIZE}px, var(--fab-menu-cap))`,
          '--fab-r': 'var(--radius-xl)',
          '--fab-bg': 'var(--color-surface-elevated)',
          '--fab-fg': 'var(--color-text-default)',
        }
      : { '--fab-w': `${FAB_SIZE}px`, '--fab-h': `${FAB_SIZE}px`, '--fab-r': `${FAB_SIZE / 2}px`, '--fab-bg': bg.value, '--fab-fg': fg.value }),
    transition: tr.panel,
  } as CSSProperties;

  const viewCap = `calc(var(--fab-menu-cap) - ${FAB_SIZE}px)`;
  const slide = (x: string): CSSProperties => ({ transform: `translateX(${x})`, transition: tr.slide, maxHeight: viewCap });

  return (
    <div
      ref={setPanel}
      data-fab-menu=""
      data-open={open}
      data-closing={closing || undefined}
      data-level={level ?? 'list'}
      style={panelStyle}
      className={cn(
        'fixed right-[calc(1.5rem+var(--safe-right))] bottom-[calc(1.5rem+var(--safe-bottom))] z-40 overflow-hidden',
        '[width:var(--fab-w)] [height:var(--fab-h)] [border-radius:var(--fab-r)] [background-color:var(--fab-bg)] [color:var(--fab-fg)]',
        'shadow-[var(--elevation-3),inset_0_0_0_1px_var(--color-border-default)]',
        '[--fab-fill:var(--fab-fill-light)] [--fab-text:var(--fab-text-light)] dark:[--fab-fill:var(--fab-fill-dark)] dark:[--fab-text:var(--fab-text-dark)]',
        className,
      )}
    >
      <div
        ref={content}
        role="dialog"
        aria-label={label}
        aria-hidden={!open || undefined}
        inert={!open || undefined}
        tabIndex={-1}
        id={contentId}
        data-fab-content=""
        style={{
          width: 'var(--fab-menu-width)',
          opacity: open ? 1 : 0,
          transform: open || reduce ? 'none' : 'translateY(6px)',
          visibility: shown ? 'visible' : 'hidden',
          transition: tr.content,
        }}
        className="absolute right-0 bottom-0 flex flex-col outline-none"
      >
        <div className="relative overflow-hidden [height:var(--fab-view-h)]" style={{ '--fab-view-h': `min(${viewH}px, ${viewCap})` } as CSSProperties}>
          <div
            ref={list}
            data-fab-list=""
            inert={!atList || undefined}
            style={slide(atList ? '0' : '-100%')}
            className="absolute inset-x-0 top-0 overflow-y-auto overscroll-contain p-2xs"
          >
            <ul className="flex flex-col">
              {items.map(item => (
                <li key={keyOf(item)}>
                  <MenuItem
                    size="lg"
                    radius="sm"
                    iconSize="sm"
                    LeftIcon={item.icon}
                    RightIcon={ChevronRight}
                    data-fab-item={keyOf(item)}
                    onClick={() => choose(keyOf(item))}
                  >
                    {item.label}
                  </MenuItem>
                </li>
              ))}
            </ul>
          </div>
          {items.map(item => {
            const id = keyOf(item);
            const here = level === id;
            return (
              <section
                key={id}
                ref={el => { if (el) levels.current.set(id, el); else levels.current.delete(id); }}
                aria-label={item.label}
                data-fab-level={id}
                inert={!here || undefined}
                style={{ ...slide(here ? '0' : '100%'), visibility: shown && id === lastLevel ? 'visible' : 'hidden' }}
                className="absolute inset-x-0 top-0 flex flex-col overflow-y-auto overscroll-contain"
              >
                <header className="flex shrink-0 items-center px-2xs pt-2xs">
                  <button
                    type="button"
                    data-fab-back=""
                    aria-label={`Back from ${item.label}`}
                    onClick={back}
                    className="flex min-w-0 items-center gap-3xs rounded-[var(--radius-sm)] px-2xs py-3xs text-[var(--color-text-default)] transition-colors hover:bg-[var(--color-surface-canvas)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
                  >
                    <ChevronLeft size={16} aria-hidden />
                    <span className="type-label truncate">{item.label}</span>
                  </button>
                </header>
                <div data-fab-level-body="" className="px-sm py-xs">
                  {item.content}
                </div>
              </section>
            );
          })}
        </div>
        {/* the circle's row: room for the button, which never moves */}
        <div aria-hidden className="shrink-0" style={{ height: FAB_SIZE }} />
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={contentId}
        aria-label={open ? `Close ${label}` : `Open ${label}`}
        data-fab-trigger=""
        onClick={() => setOpen(!open)}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          color: open ? 'var(--color-text-muted)' : 'inherit',
          transition: reduce ? 'none' : `color 0s ${open ? IN_DELAY_MS : FADE_MS}ms`,
        }}
        className="absolute right-0 bottom-0 grid cursor-pointer place-items-center rounded-full focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--color-border-focus)]"
      >
        {glyph === 'plus' ? (
          <PlusIcon
            size={22}
            strokeWidth={1.75}
            aria-hidden
            data-glyph="plus"
            style={{ transform: open ? 'rotate(45deg)' : undefined, transition: reduce ? 'none' : `transform ${CLOSE_MS}ms var(--ease-spring-out)` }}
          />
        ) : (
          <MenuGlyph open={open} reduce={reduce} />
        )}
      </button>
    </div>
  );
});

export default FabMenu;
