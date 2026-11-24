'use client';

/**
 * ColumnStrip (T11): on a phone, columns a screen wide in a strip swiped with snap, with a row of pills (label and
 * count) above that follow the swipe and jump to a column on a tap (smoothly, or at once under Reduce Motion). The
 * strip is as tall as the column in view, so the page scrolls it as one.
 *
 * Paging a held card, as an iPhone's home screen pages a held icon (Ringmaster D226, D228): while a SortableGroup card
 * is in the hand, resting at either edge of the strip (`edge` px; on a phone, the screen's) pages one column after `dwell` ms, then every `repeat` ms
 * while the finger stays; moving off the edge stops it. A glow at that edge builds over the dwell. Paging stays within
 * `pageable`. While a card is held the strip never scrolls: the columns move by a transform (iOS froze scrolling a strip
 * under a held touch), and on drop the transform is swapped for the same scroll position in one frame. A page slides on
 * recipe.sheetIn's easing at an arrival's length: easing out, no overshoot.
 *
 * Wiring: the strip learns of the drag through SortableGroup's callbacks, handed over by a hook:
 *
 *   const drag = useColumnStrip();
 *   <SortableGroup onMove={move} onDragChange={drag.onDragChange} onDragMove={drag.onDragMove}>
 *     <ColumnStrip drag={drag} columns={[{ key, label, count, content: <SortableList … /> }, …]} />
 *   </SortableGroup>
 */
import { animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';
import { duration, motion as motionFor, recipe } from '@levain/tokens';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface StripColumn {
  key: string;
  /** The pill's words (and the column's accessible name when a string). */
  label: ReactNode;
  /** Shown in the pill after the label: a number, or a CountBadge. */
  count?: ReactNode;
  content: ReactNode;
}

/** What SortableGroup calls; from useColumnStrip(). */
export interface ColumnStripDrag {
  onDragChange: (dragging: boolean) => void;
  onDragMove: (x: number, y: number) => void;
}

export interface ColumnStripProps {
  columns: StripColumn[];
  /** The column in view, by key (controlled): changing it scrolls there. Swipes and paging report through onCurrentChange. */
  current?: string;
  /** The first column in view when uncontrolled (default: the first). */
  defaultCurrent?: string;
  onCurrentChange?: (key: string) => void;
  /** The columns a held card may page to (where it may land), by key. Default: all. */
  pageable?: string[];
  /** From useColumnStrip(), wired to the SortableGroup around the strip. Without it, no edge paging. */
  drag?: ColumnStripDrag;
  /** Each edge zone's width, px. */
  edge?: number;
  /** Resting in an edge zone this long (ms) pages once... */
  dwell?: number;
  /** ...then again every this long (ms) while the finger stays. */
  repeat?: number;
  /** The pills' accessible name. */
  label?: string;
  /** Beside the pills, at the row's end (an add button, say). */
  pillsEnd?: ReactNode;
  className?: string;
  /** On the pills' row: make it sticky, say. */
  pillsClassName?: string;
}

export const COLUMN_STRIP_EDGE = 56;
export const COLUMN_STRIP_DWELL = 500;
export const COLUMN_STRIP_REPEAT = 600;

/** The column a scroll position rests on: the nearest whole column, within 0..count-1. */
export function snapIndex(scrollLeft: number, width: number, count: number): number {
  if (width <= 0 || count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(scrollLeft / width)));
}

/** Which edge zone x is in, for a strip from `left` to `right` with zones `edge` px wide (past an edge counts as in it). */
export function edgeSide(x: number, left: number, right: number, edge: number): 'left' | 'right' | null {
  return x < left + edge ? 'left' : x > right - edge ? 'right' : null;
}

type Handlers = ColumnStripDrag;
const targets = new WeakMap<ColumnStripDrag, { current: Handlers | null }>();

/** The bridge between a SortableGroup and the ColumnStrip inside it: pass its two callbacks to the group and the
 *  object itself to the strip. Stable for the component's life. */
export function useColumnStrip(): ColumnStripDrag {
  const target = useRef<Handlers | null>(null);
  return useMemo(() => {
    const drag: ColumnStripDrag = {
      onDragChange: d => target.current?.onDragChange(d),
      onDragMove: (x, y) => target.current?.onDragMove(x, y),
    };
    targets.set(drag, target);
    return drag;
  }, []);
}

type Side = 'left' | 'right';

export function ColumnStrip({
  columns, current, defaultCurrent, onCurrentChange, pageable, drag,
  edge = COLUMN_STRIP_EDGE, dwell = COLUMN_STRIP_DWELL, repeat = COLUMN_STRIP_REPEAT,
  label = 'Columns', pillsEnd, className, pillsClassName,
}: ColumnStripProps) {
  const reduce = !!useReducedMotion();
  const indexOf = (key: string | undefined) => Math.max(0, columns.findIndex(c => c.key === key));
  const strip = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const railX = useMotionValue(0);
  const sliding = useRef<AnimationPlaybackControls | null>(null);
  const slide = motionFor({ ...recipe.sheetIn, duration: duration.arrival / 1000 }, reduce);

  const [at, setAtState] = useState(() => indexOf(current ?? defaultCurrent));
  const atRef = useRef(at);
  const report = useRef(onCurrentChange);
  report.current = onCurrentChange;
  const keys = useRef(columns.map(c => c.key));
  keys.current = columns.map(c => c.key);
  const setAt = (i: number) => {
    if (i === atRef.current) return;
    atRef.current = i;
    setAtState(i);
    const k = keys.current[i];
    if (k !== undefined) report.current?.(k);
  };

  // the first column in view, before paint
  useLayoutEffect(() => {
    const el = strip.current;
    if (el && atRef.current) el.scrollLeft = atRef.current * el.clientWidth;
  }, []);

  // a swipe: the pills follow the nearest column
  const count = useRef(columns.length);
  count.current = columns.length;
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const on = () => {
      // the strip never scrolls up and down (each column is its own height); WebKit's autoscroll under a held mouse
      // would scroll it once it shrinks to a shorter column, cutting off the column's top
      if (el.scrollTop) el.scrollTop = 0;
      if (!held.current.on) setAt(snapIndex(el.scrollLeft, el.clientWidth, count.current));
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);

  const go = (i: number) => {
    const el = strip.current;
    if (!el || held.current.on) return;
    if (typeof el.scrollTo === 'function') el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    else el.scrollLeft = i * el.clientWidth;
  };

  // controlled: a new `current` scrolls there
  useEffect(() => {
    if (current === undefined) return;
    const i = indexOf(current);
    if (i !== atRef.current) go(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // the strip is as tall as the column in view
  const pageEls = useRef<(HTMLElement | null)[]>([]);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = pageEls.current[at];
    if (!el) return;
    setHeight(el.offsetHeight || undefined);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight || undefined));
    ro.observe(el);
    return () => ro.disconnect();
  }, [at]);

  // ---- a held card ----
  const held = useRef({ on: false, base: 0, shift: 0 });
  const [cue, setCue] = useState<{ side: Side; wait: number; n: number; inset: number } | null>(null);
  const zone = useRef<{ side: Side | null; timer: number }>({ side: null, timer: 0 });
  const reach = useRef<string[] | undefined>(pageable);
  reach.current = pageable;
  const times = useRef({ edge, dwell, repeat });
  times.current = { edge, dwell, repeat };
  const mayReach = (i: number) => i >= 0 && i < count.current && (!reach.current || reach.current.includes(keys.current[i]!));

  const page = (i: number) => {
    const el = strip.current!;
    held.current.shift = i * el.clientWidth - held.current.base;
    setAt(i);
    sliding.current = animate(railX, -held.current.shift, slide);
    return sliding.current.finished;
  };
  const leave = () => {
    window.clearTimeout(zone.current.timer);
    zone.current = { side: null, timer: 0 };
    setCue(null);
  };
  useEffect(() => () => window.clearTimeout(zone.current.timer), []);

  const handlers: Handlers = {
    onDragChange(d) {
      const el = strip.current;
      if (!el) return;
      if (d) {
        held.current = { on: true, base: el.scrollLeft, shift: 0 };
        el.style.scrollSnapType = 'none';
        return;
      }
      leave();
      sliding.current?.stop();
      sliding.current = null;
      if (held.current.shift) {
        // one frame: the transform off and the same place as a scroll position. framer paints the jump on its next
        // frame, so the transform comes off here too: scrolled and snapped under the old one, the strip lands a column off
        el.style.scrollBehavior = 'auto';
        railX.jump(0);
        if (rail.current) rail.current.style.transform = 'none';
        el.scrollLeft = held.current.base + held.current.shift;
        el.style.scrollBehavior = '';
      }
      el.style.scrollSnapType = '';
      held.current = { on: false, base: el.scrollLeft, shift: 0 };
    },
    onDragMove(x) {
      const el = strip.current;
      if (!held.current.on || !el) return;
      const r = el.getBoundingClientRect();
      const side = edgeSide(x, r.left, r.right, times.current.edge);
      if (side === zone.current.side) return;
      leave();
      if (!side) return;
      const next = () => atRef.current + (side === 'left' ? -1 : 1);
      if (!mayReach(next())) return; // nowhere to page to
      // the cue sits at the strip's edge (on a phone, the screen's)
      const inset = Math.max(0, side === 'left' ? r.left : window.innerWidth - r.right);
      const arm = (wait: number) => {
        setCue(c => ({ side, wait, n: (c?.n ?? 0) + 1, inset }));
        zone.current = {
          side,
          timer: window.setTimeout(() => {
            setCue(null);
            void page(next()).then(() => {
              if (held.current.on && zone.current.side === side && mayReach(next())) arm(times.current.repeat);
            });
          }, wait),
        };
      };
      arm(times.current.dwell);
    },
  };
  const live = useRef(handlers);
  live.current = handlers;
  useEffect(() => {
    const t = drag && targets.get(drag);
    if (!t) return;
    t.current = { onDragChange: d => live.current.onDragChange(d), onDragMove: (x, y) => live.current.onDragMove(x, y) };
    return () => { t.current = null; };
  }, [drag]);

  return (
    <div data-column-strip="" className={className}>
      <div data-pills="" className={cn('flex items-center gap-1 bg-[var(--color-surface-canvas)]', pillsClassName)}>
        <nav aria-label={label} className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {columns.map((c, i) => (
            <button
              key={c.key}
              type="button"
              data-pill={c.key}
              aria-current={at === i}
              onClick={() => go(i)}
              className={cn(
                'type-label flex flex-none items-baseline gap-2 whitespace-nowrap rounded-full px-3 py-1 text-[var(--color-text-faint)]',
                'transition-[background-color,color] duration-[var(--duration-quick)] ease-[var(--ease-out)]',
                'focus-visible:outline-offset-[-2px]',
                'aria-[current=true]:bg-[var(--color-surface-card)] aria-[current=true]:text-[var(--color-text-default)] aria-[current=true]:shadow-[inset_0_0_0_1px_var(--color-border-subtle)]',
              )}
            >
              {c.label}
              {c.count !== undefined && <span className="font-normal tabular-nums">{c.count}</span>}
            </button>
          ))}
        </nav>
        {pillsEnd !== undefined && <span className="shrink-0">{pillsEnd}</span>}
      </div>
      <div
        ref={strip}
        data-strip=""
        style={{ height }}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
      >
        <motion.div ref={rail} data-rail="" style={{ x: railX }} className="flex w-full items-start">
          {columns.map((c, i) => (
            <section
              key={c.key}
              ref={el => { pageEls.current[i] = el; }}
              aria-label={typeof c.label === 'string' ? c.label : undefined}
              data-column={c.key}
              // the columns out of view are clipped to the strip's height (it clips them there anyway), so the strip
              // has nothing to scroll up and down into
              style={i === at || height === undefined ? undefined : { maxHeight: height, overflow: 'hidden' }}
              className="w-full shrink-0 snap-start"
            >
              {c.content}
            </section>
          ))}
        </motion.div>
      </div>
      {/* the cue: the edge glows, building over the dwell (a progress, so linear), and starts again after each page */}
      {cue && (
        <motion.div
          key={cue.n}
          aria-hidden
          data-page-cue={cue.side}
          style={{ [cue.side]: cue.inset }}
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={{ opacity: 1 }}
          // motion: continuous indicator (a progress over the dwell, its length the dwell's)
          transition={{ duration: reduce ? 0 : cue.wait / 1000, ease: 'linear' }}
          className={cn(
            'pointer-events-none fixed inset-y-0 z-[55] w-6 to-transparent from-[color-mix(in_srgb,var(--color-text-link)_45%,transparent)]',
            cue.side === 'left' ? 'bg-gradient-to-r' : 'bg-gradient-to-l',
          )}
        />
      )}
    </div>
  );
}
