'use client';

/**
 * CardStack (T16): a set of cards as a stack, ported from the Ringmaster board's "Your work" (board/src/stack).
 *
 * Header: the label, a count, and one button, Show all ⇄ Stack: the only way to spread the stack out or close it.
 *
 * Row (`variant="row"`, desktop), stacked: a horizontal row whose trailing cards pile at the right edge. Scrolling
 * sideways (a trackpad, a horizontal or Shift wheel, or dragging the row) peels cards off the right pile, right to left,
 * and the cards passed pile at the left end in reverse; positions follow the scroll through a spring (tiltSpring), every
 * quantity continuous, and settle on a whole card at rest. A vertical wheel is the page's. A pile shows its top card and
 * the edges of the ones behind; a card's words (the children of the element `renderItem` returns) show only while
 * nothing covers it. Expanded: every card in a wrapping grid.
 *
 * Pile (`variant="pile"`, phone), stacked: the top card with up to three behind it, offset and scaled; only the top card
 * is live, and swiping it sideways steps to the next. The top card is kept by key as items change; a card new at the
 * head takes the top. Expanded: the full list, a morph (recipe.morph), not a swap.
 *
 * The caller picks the variant (the board switches at its own breakpoint); levain doesn't switch on its own.
 *
 * A tap opens a card (`onOpen`); while open (`openKey`) its place keeps its size, empty, and the card itself is elsewhere:
 * the caller's dialog shares its layoutId (`layoutId(key)`) and morphs from it on recipe.collapse. Nothing in the stack
 * drags out of it. A swipe is never a tap: past TAP_SLOP px it's a swipe.
 *
 * Keyboard (T29): every card a tap can reach is a button (Enter or Space opens it, with the focus ring). The row's cards
 * are each a Tab stop, in order, and a card taking focus scrolls the row until it's in the open, as a scroll would: plain
 * focusable cards rather than a roving tabindex, because the row is a list of separate items a screen reader should
 * read in order, every one reachable, and Tab is how the rest of the board moves between cards. A stacked pile shows
 * one live card, so it is one Tab stop: its top card, and the arrow keys step it (Right to the next, Left back), as a
 * swipe does. Show all makes every card a Tab stop.
 *
 * Reduce Motion: the row follows the scroll without the spring, and the collapse and morph are instant.
 */
import { drag as DRAG, motion as motionFor, tiltSpring } from '@levain/tokens';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue, type PanInfo } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { opensAttr } from '../utils/useDialogFocus';

export interface CardStackProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** 'row' (desktop) or 'pile' (phone). */
  variant: 'row' | 'pile';
  label: string;
  /** The stack's glyph, before its label. */
  icon?: ReactNode;
  /** A control right after the label (a generic slot: the board puts its notifications bell here). */
  headExtra?: ReactNode;
  /** The card open elsewhere (its dialog), if any: its place keeps its size, empty. */
  openKey?: string | null;
  onOpen?: (key: string) => void;
  /** The layoutId a card carries (its dialog morphs from it). Default 'stack-' + key. */
  layoutId?: (key: string) => string;
  /** Told what happened, for a debug log. */
  onEvent?: (what: string) => void;
  /** The row's card width to aim for, in px (default 232): a whole number of cards near this wide share the row. */
  cardWidth?: number;
  /** Shown in the stack's place, the full width of the row, when there are no items. */
  empty?: ReactNode;
}

/** Past this many px a press is a swipe, never a tap (drag.touchSlop's value; a literal so loading reads no token). */
export const TAP_SLOP = 8;
/** A pile's top card steps on when flung past this many px, or faster than this many px/s. */
export const PILE_FLING = { distance: 90, velocity: 500 } as const;

const defaultLayoutId = (k: string) => 'stack-' + k;

export function CardStack<T>(p: CardStackProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const n = p.items.length;
  const toggle = () => { setExpanded(e => !e); p.onEvent?.(expanded ? 'stacked' : 'shown all'); };
  return (
    <section aria-label={p.label} data-stack={p.variant} data-expanded={expanded} className="space-y-3xs">
      <div className="flex h-8 items-center gap-2xs px-3xs">
        {p.icon}
        <h2 className="type-label">{p.label} <span className="text-[var(--color-text-faint)]">{n}</span></h2>
        {p.headExtra}
        {n > 1 && (
          <button type="button" onClick={toggle} aria-expanded={expanded} className="type-caption ml-auto rounded-full px-2xs py-3xs text-[var(--color-text-muted)] hover:bg-[var(--color-state-hover)]">
            {expanded ? 'Stack' : `Show all ${n}`}
          </button>
        )}
      </div>
      {p.variant === 'row' ? <Row {...p} expanded={expanded} /> : <Pile {...p} expanded={expanded} />}
    </section>
  );
}

/** A card's keyboard focus ring (the focus colour round its edge), on the card's live box. */
export const CARD_FOCUS_RING = 'outline-none rounded-[var(--radius-lg)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]';

/**
 * The card a tap opens; with `swipe` it can be pulled sideways (a pile's top card). A press that travelled past TAP_SLOP
 * is never a tap. A button to the keyboard: Enter or Space opens it; a Tab stop only when `tabbable`; `onKey` hears the
 * other keys (a pile's arrows), `onFocus` its focus (the row scrolls to it).
 */
function Live({ id, layoutId, open, swipe, tabbable = true, onOpen, onEvent, onFling, onKey, onFocus, children }: {
  id: string; layoutId: string; open: boolean; swipe: boolean; tabbable?: boolean; onOpen?: (k: string) => void
  onEvent?: (w: string) => void; onFling?: (info: PanInfo) => void; onKey?: (e: ReactKeyboardEvent) => void; onFocus?: () => void; children: ReactNode
}) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const moved = useRef(false);
  const down = useRef({ x: 0, y: 0 });
  useLayoutEffect(() => { if (!open && box.current) setHeight(box.current.offsetHeight); });
  if (open) return <div data-stack-open={id} style={{ height }} aria-hidden />;
  const opens = () => { onEvent?.(`${id} opened`); onOpen?.(id); };
  return (
    <motion.div ref={box} data-stack-card={id} layoutId={layoutId} transition={motionFor('collapse', reduce)}
      role="button" tabIndex={tabbable ? 0 : -1} {...{ [opensAttr]: layoutId }}
      drag={swipe ? 'x' : false} dragSnapToOrigin dragElastic={0.6} whileDrag={swipe ? { scale: DRAG.liftScale, zIndex: 50 } : undefined} className={'cursor-pointer touch-pan-y ' + CARD_FOCUS_RING}
      onPointerDown={e => { moved.current = false; down.current = { x: e.clientX, y: e.clientY }; }}
      onDrag={(_, info) => { if (Math.hypot(info.offset.x, info.offset.y) > TAP_SLOP) moved.current = true; }}
      onDragEnd={(_, info) => onFling?.(info)}
      onFocus={onFocus}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opens(); return; }
        onKey?.(e);
      }}
      // a press that travelled is never a tap, swiping or not (with swiping off, onDrag never says so). Framer turns
      // Enter on a focused card into a pointer press of its own (no pointerType): onKeyDown has already opened it.
      onTap={(e, info) => { if (!(e as PointerEvent).pointerType || moved.current || Math.hypot(info.point.x - down.current.x - window.scrollX, info.point.y - down.current.y - window.scrollY) > TAP_SLOP) return; opens(); }}>
      {children}
    </motion.div>
  );
}

/* ---------------- Row ---------------- */

/** The row's geometry: the gap between cards, how far each card behind a pile's top shows, and how many show. */
export const ROW = { gap: 12, peek: 9, depth: 3 } as const;
const { gap: GAP, peek: PEEK, depth: DEPTH } = ROW;

type Geo = { left: number; right: number; W: number; STEP: number };

/** Where card i sits for scroll offset o, before covering: its slot, or in a pile at either end (d: how far under its pile's top). */
function slot(i: number, o: number, g: Geo) {
  const natural = g.left + i * g.STEP - o;
  const side = natural < g.left - 0.5 ? 'left' : 'right';
  const d = side === 'left' ? (g.left - natural) / g.STEP : Math.max(0, (natural - g.right) / g.STEP);
  const shown = Math.min(d, DEPTH), scale = 1 - shown * 0.04;
  const x = side === 'left' ? g.left - shown * PEEK : natural > g.right ? g.right + shown * PEEK : natural;
  // a piled card shrinks towards its pile's outer side, so its edge peeks out there (PEEK px per card behind)
  const lo = side === 'left' ? x : x + g.W * (1 - scale), hi = side === 'left' ? x + g.W * scale : x + g.W;
  return { side, d, x, scale, lo, hi };
}

/**
 * Where card i sits for scroll offset o, and how it looks. The row's cards sit side by side; what doesn't fit piles at
 * the right; scrolling peels cards off the right pile, right to left, and the cards passed pile at the left end in
 * reverse, the most recently passed on top. A pile shows its top card and the edges of up to DEPTH behind it. A card's
 * words show only while nothing covers it, so a pile never shows a slice of a card with its text cut off.
 */
export function rowPlace(i: number, o: number, n: number, g: Geo) {
  const me = slot(i, o, g);
  // what covers it: on the right, the card before it (above it); on the left, the card after it
  const j = me.side === 'left' ? i + 1 : i - 1;
  let cover = 0;
  if (j >= 0 && j < n) {
    const them = slot(j, o, g);
    if (me.side === 'right' && them.side === 'right') cover = them.hi - me.lo;
    if (me.side === 'left') cover = me.hi - them.lo;
  }
  return {
    x: me.x,
    scale: me.scale,
    opacity: me.d > DEPTH + 0.5 ? Math.max(0, 1 - (me.d - DEPTH - 0.5) * 2) : 1,
    content: Math.min(1, Math.max(0, 1 - cover / 12)),
    // the open cards over the right pile, from left to right; both over the left pile, whose latest passed is on top
    z: me.side === 'left' ? 100 + i : 1000 - i,
    // under its pile's top it takes no taps
    live: me.d < 0.5,
    origin: me.side === 'left' ? '0% 50%' : '100% 50%',
  };
}

/** The row's geometry for a box `width` px wide: a whole number of cards near `cardWidth` share the content width. */
export function rowGeometry(width: number, cardWidth: number): Geo & { count: number } {
  // the box is the content width plus a pile's room at each end (it reaches into the gutters), so at rest the last card
  // in the open is the right pile's top, whole, and nothing is cut
  const left = DEPTH * PEEK, inner = Math.max(0, width - 2 * left);
  const count = Math.max(1, Math.round((inner + GAP) / (cardWidth + GAP)));
  const W = Math.max(1, (inner - (count - 1) * GAP) / count), STEP = W + GAP;
  return { left, right: left + (count - 1) * STEP, W, STEP, count };
}

function Row<T>({ items, getKey, renderItem, expanded, openKey, onOpen, layoutId = defaultLayoutId, onEvent, cardWidth = 232, empty }: CardStackProps<T> & { expanded: boolean }) {
  const reduce = useReducedMotion();
  // the row is as tall as its tallest card (they sit absolutely, so it can't size itself)
  const [rowHeight, setRowHeight] = useState(112);
  const measure = (el: HTMLElement | null) => {
    if (!el) return;
    const h = Math.max(...[...el.querySelectorAll<HTMLElement>('[data-stack-card]')].map(c => c.offsetHeight), 0);
    if (h) setRowHeight(r => (Math.abs(h - r) > 1 ? h : r));
  };
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { setWidth(el.clientWidth); measure(el); });
    ro.observe(el);
    setWidth(el.clientWidth);
    measure(el);
    el.querySelectorAll('[data-stack-card]').forEach(c => ro.observe(c));
    return () => ro.disconnect();
  }, [expanded, items.length]);
  const geo = rowGeometry(width, cardWidth);
  const { left, count, STEP, W } = geo;
  const n = items.length;
  const max = Math.max(0, (n - count) * STEP);
  const o = useMotionValue(0);
  const spring = useSpring(o, tiltSpring);
  const at = reduce ? o : spring;
  const clamp = (v: number) => Math.min(max, Math.max(0, v));
  // at rest the row sits on a whole card, so both piles show only edges
  const settle = () => o.set(clamp(Math.round(o.get() / STEP) * STEP));
  useEffect(() => { settle(); }, [max, STEP]); // eslint-disable-line react-hooks/exhaustive-deps

  // a sideways wheel (a trackpad's two fingers, a tilt wheel, Shift and the wheel) scrolls the row, and it settles on a
  // whole card once the wheel stops. A vertical wheel is left alone: it scrolls the page, whatever the pointer is over.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const next = clamp(o.get() + e.deltaX);
      if (next !== o.get()) { e.preventDefault(); o.set(next); }
      clearTimeout(quiet); quiet = setTimeout(settle, 160);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => { el.removeEventListener('wheel', wheel); clearTimeout(quiet); };
  }, [max, STEP, expanded, n]); // eslint-disable-line react-hooks/exhaustive-deps

  // dragging the row scrolls it too, from its background or from a card (a press that travelled is never a tap)
  const pan = (e: ReactPointerEvent) => {
    const id = e.pointerId, x0 = e.clientX, o0 = o.get();
    const move = (ev: PointerEvent) => { if (ev.pointerId === id) o.set(clamp(o0 - (ev.clientX - x0))); };
    // the browser may take the gesture for itself (a touch that turns into a page scroll): that ends the pan too
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      settle(); onEvent?.(`row at ${Math.round(o.get())}`);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // a card taking focus (Tab) comes into the open: the row scrolls the least that shows it whole, as a scroll would.
  // Not for the focus a press gives (a pile's edge pressed would jump the row): a press marks the moment, and the focus
  // it brings comes in the same task.
  const pressing = useRef(false);
  const press = () => { pressing.current = true; setTimeout(() => { pressing.current = false; }); };
  const reveal = (i: number) => {
    if (pressing.current) return;
    const v = o.get();
    const next = clamp(Math.min(Math.max(v, (i - count + 1) * STEP), i * STEP));
    if (next !== v) { o.set(next); onEvent?.(`row at ${Math.round(next)}`); }
  };
  const live = (it: T, i: number) => (
    <Live id={getKey(it)} layoutId={layoutId(getKey(it))} open={openKey === getKey(it)} swipe={false} onOpen={onOpen} onEvent={onEvent}
      onFocus={expanded ? undefined : () => reveal(i)}>
      {renderItem(it)}
    </Live>
  );
  if (n === 0 && empty) return (
    <div ref={box} data-stack-empty style={{ marginInline: -left, paddingInline: left, paddingBlock: 4 }}><div>{empty}</div></div>
  );
  if (expanded) return (
    <div role="list" className="flex flex-wrap gap-[12px]">
      {items.map((it, i) => <div role="listitem" key={getKey(it)} style={{ width: W }}>{live(it, i)}</div>)}
    </div>
  );
  return (
    // isolate: the piles' z-indexes stay inside the row, never over a dialog. It reaches a pile's room into each gutter,
    // so at rest its cards line up with the content edges and the piles' edges sit in the gutters. select-none: dragging
    // the row with a mouse would otherwise select its cards' words (the board's page turns selection off for the whole
    // page; a component can't count on that).
    <div ref={box} role="list" data-stack-row onPointerDownCapture={press} onPointerDown={pan} style={{ height: rowHeight + 8, marginInline: -left }} className="relative isolate cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing">
      {items.map((it, i) => (
        <RowSlot key={getKey(it)} i={i} n={n} at={at} g={geo}>{live(it, i)}</RowSlot>
      ))}
    </div>
  );
}

function RowSlot({ i, n, at, g, children }: { i: number; n: number; at: MotionValue<number>; g: Geo; children: ReactNode }) {
  const at_ = (v: number) => rowPlace(i, v, n, g);
  const x = useTransform(at, v => at_(v).x);
  const scale = useTransform(at, v => at_(v).scale);
  const opacity = useTransform(at, v => at_(v).opacity);
  const content = useTransform(at, v => at_(v).content);
  const zIndex = useTransform(at, v => at_(v).z);
  const transformOrigin = useTransform(at, v => at_(v).origin);
  // a card under its pile's top takes no press (stopped before it reaches the card)
  const inert = (e: ReactPointerEvent) => { if (!at_(at.get()).live) e.stopPropagation(); };
  return (
    <motion.div role="listitem" onPointerDownCapture={inert} style={{ x, scale, opacity, zIndex, width: g.W, transformOrigin, '--stack-content': content } as never}
      className="absolute left-0 top-1 [&_[data-stack-card]>*>*]:[opacity:var(--stack-content)]">
      {children}
    </motion.div>
  );
}

/* ---------------- Pile ---------------- */

function Pile<T>({ items, getKey, renderItem, expanded, openKey, onOpen, layoutId = defaultLayoutId, onEvent, empty }: CardStackProps<T> & { expanded: boolean }) {
  const reduce = useReducedMotion();
  // the top card by its key, so it stays on top as cards come and go; a card new at the head (just added) takes it
  const keys = items.map(getKey), n = items.length;
  const [topKey, setTopKey] = useState<string | null>(keys[0] ?? null);
  const [seen, setSeen] = useState(keys);
  if (keys.join() !== seen.join()) {
    setSeen(keys);
    if (keys[0] && !seen.includes(keys[0])) setTopKey(keys[0]);
  }
  const first = Math.max(0, keys.indexOf(topKey ?? ''));
  // the pile's order: the top card first, then the ones behind it
  const order = items.map((_, k) => items[(first + k) % n]!);
  const morph = motionFor('morph', reduce);
  const step = (dir: number) => { setTopKey(getKey(order[dir < 0 ? 1 : n - 1]!)); onEvent?.(`stepped ${dir < 0 ? 'on' : 'back'}`); };
  // the arrow keys on the top card step as a swipe does (Right: on to the next, as a swipe left; Left: back), and focus
  // follows to the new top
  const list = useRef<HTMLDivElement>(null);
  const keyed = useRef(false);
  const arrows = (e: ReactKeyboardEvent) => {
    if (n < 2 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    keyed.current = true;
    step(e.key === 'ArrowRight' ? -1 : 1);
  };
  useEffect(() => {
    if (!keyed.current) return;
    keyed.current = false;
    list.current?.querySelector<HTMLElement>(`[data-stack-card="${topKey}"]`)?.focus();
  }, [topKey]);
  // stacked, the pile is as tall as its top card, plus the edges of the ones behind it
  const topBox = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState(96);
  useLayoutEffect(() => {
    const el = topBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTopHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [first, n]);

  // (after the hooks: the board's copy returned before them, which broke a pile going from empty to not)
  if (n === 0 && empty) return <div data-stack-empty>{empty}</div>;
  return (
    <motion.div ref={list} role="list" layout transition={morph} data-top={n ? getKey(order[0]!) : ''}
      className={expanded ? 'flex flex-col gap-2xs' : 'relative'} style={expanded ? undefined : { height: topHeight + Math.min(n - 1, DEPTH) * 10 }}>
      {order.map((it, k) => {
        const id = getKey(it), d = Math.min(k, DEPTH), isTop = k === 0;
        return (
          // stacked: the cards behind sit lower and smaller, past the third out of sight, and take no taps
          <motion.div role="listitem" key={id} ref={isTop ? topBox : undefined} layout transition={morph} aria-hidden={!expanded && !isTop ? true : undefined}
            // a card behind takes the top card's height and shows only its edge (its words hidden): a taller one is cut, so
            // it never shows below the pile, and a shorter one grows (min-height beats a card's fixed height), so its edge
            // still shows under a taller top
            className={expanded ? 'relative' : 'absolute inset-x-0 top-0' + (isTop ? '' : ' [&_[data-stack-card]>*]:h-(--pile-h) [&_[data-stack-card]>*]:min-h-(--pile-h) [&_[data-stack-card]>*]:overflow-hidden [&_[data-stack-card]>*>*]:opacity-0')}
            style={{ zIndex: n - k, transformOrigin: '50% 0%', pointerEvents: expanded || isTop ? 'auto' : 'none', '--pile-h': topHeight + 'px' } as never}
            animate={expanded ? { y: 0, scale: 1, opacity: 1 } : { y: d * 10, scale: 1 - d * 0.05, opacity: k > DEPTH ? 0 : 1 }}>
            <Live id={id} layoutId={layoutId(id)} open={openKey === id} swipe={!expanded && isTop} onOpen={onOpen} onEvent={onEvent}
              tabbable={expanded || isTop} onKey={!expanded && isTop ? arrows : undefined}
              // flung sideways, the top card goes to the back of the pile (it springs home behind the next one)
              onFling={info => { if (!expanded && isTop && n > 1 && (Math.abs(info.offset.x) > PILE_FLING.distance || Math.abs(info.velocity.x) > PILE_FLING.velocity)) step(Math.sign(info.offset.x)); }}>
              {renderItem(it)}
            </Live>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
