// A verbatim copy of Ringmaster's board/src/stack/CardStack.tsx (T16), for the demo's side-by-side only: levain's
// CardStack against the board's own, with the same cards. Not exported, not part of levain.
/* eslint-disable */
// @ts-nocheck
// CardStack (a levain gap, built in the board for now): the designer's work as a stack (specs/BOARD.md, "The stack").
//   Header: the label, a count, and one button, Show all ⇄ Stack: the only way to spread the stack out or close it.
//   Row (desktop), stacked (D240): a horizontal row whose trailing cards pile at the right edge. Scrolling sideways
//     (a trackpad, a horizontal or Shift wheel, or dragging the row) peels cards off the right pile, right to left,
//     and the cards passed pile at the left end in reverse; positions follow the scroll through a spring (levain's
//     tiltSpring), every quantity continuous, and settle on a whole card at rest. A vertical wheel is the page's.
//     A pile shows its top card and the edges of the ones behind; a card's words show only while nothing covers it.
//     Expanded: every card in a wrapping grid.
//   Pile (phone), stacked: the top card with up to three behind it, offset and scaled; only the top card is live,
//     and swiping it sideways steps to the next. Expanded: the full list (a morph, not a swap).
// A tap opens a card (`onOpen`); while open its place keeps its size and the card itself is elsewhere (the caller's
// dialog shares its layoutId, `layoutId(key)`). Nothing in the stack drags out of it. A swipe is never a tap: past
// TAP_SLOP px it's a swipe.
import { motion as motionFor, tiltSpring } from '@levain/tokens';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue, type PanInfo } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface CardStackProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** 'row' (desktop) or 'pile' (phone). */
  variant: 'row' | 'pile';
  label: string;
  /** The stack's glyph, before its label. */
  icon?: ReactNode;
  /** A control right after the label (Your work's notifications bell, T59). */
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

/** Past this many px a press is a swipe, never a tap. */
const TAP_SLOP = 8;

export function CardStack<T>(p: CardStackProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const n = p.items.length;
  const toggle = () => { setExpanded(e => !e); p.onEvent?.(expanded ? 'stacked' : 'shown all'); };
  return (
    // the head is as tall as a column's (Board.tsx Column: h-8, text centred), with the same room under it
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

/** The card a tap opens; with `swipe` it can be pulled sideways (a pile's top card). A press that travelled past TAP_SLOP is never a tap. */
function Live({ id, layoutId, open, swipe, onOpen, onEvent, onFling, children }: {
  id: string; layoutId: string; open: boolean; swipe: boolean; onOpen?: (k: string) => void
  onEvent?: (w: string) => void; onFling?: (info: PanInfo) => void; children: ReactNode
}) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const moved = useRef(false);
  const down = useRef({ x: 0, y: 0 });
  useLayoutEffect(() => { if (!open && box.current) setHeight(box.current.offsetHeight); });
  if (open) return <div style={{ height }} aria-hidden />;
  return (
    <motion.div ref={box} data-stack-card={id} layoutId={layoutId} transition={motionFor('collapse', reduce)}
      drag={swipe ? 'x' : false} dragSnapToOrigin dragElastic={0.6} whileDrag={swipe ? { scale: 1.03, zIndex: 50 } : undefined} className="cursor-pointer touch-pan-y"
      onPointerDown={e => { moved.current = false; down.current = { x: e.clientX, y: e.clientY }; }}
      onDrag={(_, info) => { if (Math.hypot(info.offset.x, info.offset.y) > TAP_SLOP) moved.current = true; }}
      onDragEnd={(_, info) => onFling?.(info)}
      // a press that travelled is never a tap, swiping or not (with swiping off, onDrag never says so)
      onTap={(_, info) => { if (moved.current || Math.hypot(info.point.x - down.current.x - window.scrollX, info.point.y - down.current.y - window.scrollY) > TAP_SLOP) return; onEvent?.(`${id} opened`); onOpen?.(id); }}>
      {children}
    </motion.div>
  );
}

/* ---------------- Row ---------------- */

const GAP = 12;
const PEEK = 9, DEPTH = 3; // how far each card behind shows, and how many show

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
 * Where card i sits for scroll offset o (D240), and how it looks. The row's cards sit side by side; what doesn't fit
 * piles at the right; scrolling peels cards off the right pile, right to left, and the cards passed pile at the left
 * end in reverse, the most recently passed on top. A pile shows its top card and the edges of up to DEPTH behind it.
 * A card's words show only while nothing covers it, so a pile never shows a slice of a card with its text cut off.
 */
function place(i: number, o: number, n: number, g: Geo) {
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

function Row<T>({ items, getKey, renderItem, expanded, openKey, onOpen, layoutId = k => 'stack-' + k, onEvent, cardWidth = 232, empty }: CardStackProps<T> & { expanded: boolean }) {
  const reduce = useReducedMotion();
  // the row is as tall as its tallest card (they sit absolutely, so it can't size itself)
  const [rowHeight, setRowHeight] = useState(112);
  const measure = (el: HTMLElement | null) => { if (!el) return; const h = Math.max(...[...el.querySelectorAll<HTMLElement>('[data-stack-card]')].map(c => c.offsetHeight), 0); if (h && Math.abs(h - rowHeight) > 1) setRowHeight(h); };
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
  }, [expanded, items.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // the box is the content width plus a pile's room at each end (it reaches into the gutters). A whole number of cards,
  // as near cardWidth wide as can be, share the content width, so at rest the last one in the open is the right pile's
  // top, whole, and nothing is cut.
  const left = DEPTH * PEEK, inner = Math.max(0, width - 2 * left);
  const count = Math.max(1, Math.round((inner + GAP) / (cardWidth + GAP)));
  const W = Math.max(1, (inner - (count - 1) * GAP) / count), STEP = W + GAP;
  const g: Geo = { left, right: left + (count - 1) * STEP, W, STEP };
  const n = items.length;
  const max = Math.max(0, (n - count) * STEP);
  const o = useMotionValue(0);
  const spring = useSpring(o, tiltSpring);
  const at = reduce ? o : spring;
  const clamp = (v: number) => Math.min(max, Math.max(0, v));
  // at rest the row sits on a whole card, so both piles show only edges
  const settle = () => o.set(clamp(Math.round(o.get() / STEP) * STEP));
  useEffect(() => { settle(); }, [max, STEP]); // eslint-disable-line react-hooks/exhaustive-deps

  // a sideways wheel (a trackpad's two fingers, a tilt wheel, Shift and the wheel) scrolls the row, and it settles on
  // a whole card once the wheel stops. A vertical wheel is left alone: it scrolls the page (D242: the page scrolls as
  // one), whatever the pointer is over.
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
  }, [max, STEP, expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // dragging the row scrolls it too, from its background or from a card (a press that travelled is never a tap)
  const pan = (e: React.PointerEvent) => {
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

  const live = (it: T) => (
    <Live id={getKey(it)} layoutId={layoutId(getKey(it))} open={openKey === getKey(it)} swipe={false} onOpen={onOpen} onEvent={onEvent}>
      {renderItem(it)}
    </Live>
  );
  if (n === 0 && empty) return (
    <div ref={box} style={{ marginInline: -left, paddingInline: left, paddingBlock: 4 }}><div>{empty}</div></div>
  );
  if (expanded) return (
    <div role="list" className="flex flex-wrap gap-[12px]">
      {items.map(it => <div role="listitem" key={getKey(it)} style={{ width: W }}>{live(it)}</div>)}
    </div>
  );
  return (
    // isolate: the piles' z-indexes stay inside the row, never over a dialog. It reaches a pile's room into each
    // gutter, so at rest its cards line up with the columns below and the piles' edges sit in the gutters.
    <div ref={box} role="list" onPointerDown={pan} style={{ height: rowHeight + 8, marginInline: -left }} className="relative isolate cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing">
      {items.map((it, i) => (
        <RowSlot key={getKey(it)} i={i} n={n} at={at} g={g}>{live(it)}</RowSlot>
      ))}
    </div>
  );
}

function RowSlot({ i, n, at, g, children }: { i: number; n: number; at: MotionValue<number>; g: Geo; children: ReactNode }) {
  const at_ = (v: number) => place(i, v, n, g);
  const x = useTransform(at, v => at_(v).x);
  const scale = useTransform(at, v => at_(v).scale);
  const opacity = useTransform(at, v => at_(v).opacity);
  const content = useTransform(at, v => at_(v).content);
  const zIndex = useTransform(at, v => at_(v).z);
  const transformOrigin = useTransform(at, v => at_(v).origin);
  // a card under its pile's top takes no press (stopped before it reaches the card)
  const inert = (e: React.PointerEvent) => { if (!at_(at.get()).live) e.stopPropagation(); };
  return (
    <motion.div role="listitem" onPointerDownCapture={inert} style={{ x, scale, opacity, zIndex, width: g.W, transformOrigin, '--stack-content': content } as never}
      className="absolute left-0 top-1 [&_[data-stack-card]>*>*]:[opacity:var(--stack-content)]">
      {children}
    </motion.div>
  );
}

/* ---------------- Pile ---------------- */

function Pile<T>({ items, getKey, renderItem, expanded, openKey, onOpen, layoutId = k => 'stack-' + k, onEvent, empty }: CardStackProps<T> & { expanded: boolean }) {
  const reduce = useReducedMotion();
  if (items.length === 0 && empty) return <>{empty}</>;
  // the top card by its key, so it stays on top as cards come and go; a card new at the head (just parked) takes it
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

  return (
    <motion.div role="list" layout transition={morph} data-top={n ? getKey(order[0]!) : ''}
      className={expanded ? 'flex flex-col gap-2xs' : 'relative'} style={expanded ? undefined : { height: topHeight + Math.min(n - 1, DEPTH) * 10 }}>
      {order.map((it, k) => {
        const id = getKey(it), d = Math.min(k, DEPTH), isTop = k === 0;
        return (
          // stacked: the cards behind sit lower and smaller, past the third out of sight, and take no taps
          <motion.div role="listitem" key={id} ref={isTop ? topBox : undefined} layout transition={morph} aria-hidden={!expanded && !isTop ? true : undefined}
            // a card behind takes the top card's height and shows only its edge (its words hidden): a taller one is cut, so
            // it never shows below the pile, and a shorter one grows (min-height beats a stack card's fixed height), so
            // its edge still shows under a taller top (a look and its decide, T36)
            className={expanded ? 'relative' : 'absolute inset-x-0 top-0' + (isTop ? '' : ' [&_[data-stack-card]>*]:h-(--pile-h) [&_[data-stack-card]>*]:min-h-(--pile-h) [&_[data-stack-card]>*]:overflow-hidden [&_[data-stack-card]>*>*]:opacity-0')}
            style={{ zIndex: n - k, transformOrigin: '50% 0%', pointerEvents: expanded || isTop ? 'auto' : 'none', '--pile-h': topHeight + 'px' } as never}
            animate={expanded ? { y: 0, scale: 1, opacity: 1 } : { y: d * 10, scale: 1 - d * 0.05, opacity: k > DEPTH ? 0 : 1 }}>
            <Live id={id} layoutId={layoutId(id)} open={openKey === id} swipe={!expanded && isTop} onOpen={onOpen} onEvent={onEvent}
              // flung sideways, the top card goes to the back of the pile (it springs home behind the next one)
              onFling={info => { if (!expanded && isTop && n > 1 && (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500)) step(Math.sign(info.offset.x)); }}>
              {renderItem(it)}
            </Live>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
