'use client';

/**
 * SortableList: drag and drop within a list and across lists, by mouse, touch and keyboard, with the drag recipe from
 * assembly.json (drag-physics):
 * - the card tracks the pointer exactly (no lag, no transition) and stays the same card: it lifts (scale and one
 *   elevation step) and leans with its velocity;
 * - its neighbours part on recipe.shift to show where it will land;
 * - on release it settles into its slot on recipe.settle (the spring, a small overshoot).
 * A mouse drag starts after drag.mouseSlop px, anywhere on the item. A touch drag starts when a finger holds the item
 * for drag.touchHold ms without wandering past drag.touchSlop px (touch events, a non-passive touchmove: while the finger
 * holds still the page is kept from scrolling; any larger move is a scroll and the hold is off), or at once from the grip
 * each item gets on a touch screen (touch-action: none). Items take no text selection or callout on touch; a layout
 * should also turn selection off around its lists on touch screens (iOS selects the nearest selectable text). Near
 * the top or bottom of the window a held card scrolls the page (drag.edgeZone). An item moved to another list by
 * other means (a button) flies there on recipe.settle. From the keyboard: Space lifts the focused item, the arrows move it (left and right to the
 * neighbouring list), Space drops it, Escape puts it back. Under reduced motion everything moves at once.
 *
 * Wrap the lists in one <SortableGroup onMove>. Each <SortableList id> renders its items through `renderItem`.
 */
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'framer-motion';
import { drag as DRAG, duration, motion as motionFor, recipe, tiltSpring } from '@levain/tokens';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';

export interface SortableMove {
  /** The moved item's key. */
  key: string;
  from: string;
  to: string;
  /** Its index in the destination list, counted without it. */
  index: number;
}

type Registered = { id: string; keys: string[]; order: number; label: string; el: HTMLElement | null; items: Map<string, HTMLElement> };
type DragState = {
  key: string;
  from: string;
  to: string;
  index: number;
  mode: 'pointer' | 'keyboard';
  width: number;
  height: number;
  node: ReactNode;
};

interface GroupContext {
  register: (r: Registered) => () => void;
  drag: DragState | null;
  begin: (e: ReactPointerEvent<HTMLElement>, list: string, key: string, node: ReactNode) => void;
  beginTouch: (e: ReactTouchEvent<HTMLElement>, list: string, key: string, node: ReactNode) => void;
  keyboard: (e: ReactKeyboardEvent<HTMLElement>, list: string, key: string, node: ReactNode) => void;
  reduce: boolean;
}
const Group = createContext<GroupContext | null>(null);

export interface SortableGroupProps {
  /** Called once, when an item is dropped somewhere new. */
  onMove: (move: SortableMove) => void;
  /** Called with true when a card is lifted by pointer or touch, and false once it has settled (or the drag is off). */
  onDragChange?: (dragging: boolean) => void;
  children: ReactNode;
}

export function SortableGroup({ onMove, onDragChange, children }: SortableGroupProps) {
  const reduce = !!useReducedMotion();
  const lists = useRef(new Map<string, Registered>());
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;
  const [announce, setAnnounce] = useState('');
  // the lifted card's position (set directly: it tracks the pointer exactly) and lean
  const x = useMotionValue(0), y = useMotionValue(0);
  const vx = useVelocity(x);
  const lean = useTransform(vx, [-DRAG.tiltAtSpeed, 0, DRAG.tiltAtSpeed], [-DRAG.maxTilt, 0, DRAG.maxTilt], { clamp: true });
  const rotate = useSpring(lean, tiltSpring);
  const grab = useRef({ dx: 0, dy: 0 });
  const [landing, setLanding] = useState(false);
  const onDrag = useRef(onDragChange);
  onDrag.current = onDragChange;
  // iOS honours preventDefault only from a non-passive touchmove listener that was there before the gesture began,
  // so one stays for the group's life (as dnd-kit's) and hands each move to the touch in progress, if any
  const touchMove = useRef<((ev: TouchEvent) => void) | null>(null);
  useEffect(() => {
    const on = (ev: TouchEvent) => touchMove.current?.(ev);
    window.addEventListener('touchmove', on, { passive: false });
    return () => window.removeEventListener('touchmove', on);
  }, []);

  const register = useCallback((r: Registered) => {
    lists.current.set(r.id, r);
    return () => { lists.current.delete(r.id); };
  }, []);

  /** Where the pointer would drop: the list under it and the index among that list's other items. */
  const target = useCallback((px: number, py: number, key: string) => {
    let best: { id: string; index: number } | null = null;
    for (const l of lists.current.values()) {
      const box = l.el?.getBoundingClientRect();
      if (!box || px < box.left || px > box.right || py < box.top - 24 || py > box.bottom + 48) continue;
      let index = 0;
      for (const k of l.keys) {
        if (k === key) continue;
        const r = l.items.get(k)?.getBoundingClientRect();
        if (r && py > r.top + r.height / 2) index++;
      }
      best = { id: l.id, index };
    }
    return best;
  }, []);

  const finish = useCallback((d: DragState | null, cancelled: boolean) => {
    setLanding(false);
    setDrag(null);
    if (d?.mode === 'pointer') onDrag.current?.(false);
    if (!d || cancelled) return;
    const fromIndex = lists.current.get(d.from)?.keys.indexOf(d.key) ?? -1;
    if (d.to === d.from && d.index === fromIndex) return;
    onMove({ key: d.key, from: d.from, to: d.to, index: d.index });
  }, [onMove]);

  /** One drag from a press at `start` on `el`: lift, follow, drop (settling into the slot) or cancel. */
  const session = useCallback((el: HTMLElement, list: string, key: string, node: ReactNode, start: { x: number; y: number }) => {
    const rect = el.getBoundingClientRect();
    const s = {
      started: false,
      done: false,
      last: start,
      lift() {
        s.started = true;
        // no text selection while something is in the hand
        document.body.style.userSelect = 'none';
        window.getSelection()?.removeAllRanges();
        grab.current = { dx: start.x - rect.left, dy: start.y - rect.top };
        x.jump(rect.left);
        y.jump(rect.top);
        const d: DragState = { key, from: list, to: list, index: lists.current.get(list)!.keys.indexOf(key), mode: 'pointer', width: rect.width, height: rect.height, node };
        dragRef.current = d;
        setDrag(d);
        onDrag.current?.(true);
        s.move(s.last.x, s.last.y);
        // each frame: scroll the page near its top or bottom edge, and re-aim at whatever is now under the finger
        // (scrolling moves the lists under a still finger)
        const tick = () => {
          if (!s.started || s.done) return;
          const h = window.innerHeight, py = s.last.y;
          const by = py < DRAG.edgeZone ? -DRAG.edgeSpeed * (1 - py / DRAG.edgeZone) : py > h - DRAG.edgeZone ? DRAG.edgeSpeed * (1 - (h - py) / DRAG.edgeZone) : 0;
          if (by) window.scrollBy(0, by);
          s.move(s.last.x, s.last.y);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      move(px: number, py: number) {
        s.last = { x: px, y: py };
        if (!s.started) return;
        x.set(px - grab.current.dx);
        y.set(py - grab.current.dy);
        const t = target(px, py, key);
        const d = dragRef.current;
        if (t && d && (t.id !== d.to || t.index !== d.index)) setDrag((dragRef.current = { ...d, to: t.id, index: t.index }));
      },
      drop() {
        s.done = true;
        document.body.style.userSelect = '';
        const d = dragRef.current;
        // settle: the card flies to its slot on the spring, then the move is committed in that same place
        const slot = d && lists.current.get(d.to);
        const placeholder = slot?.el?.querySelector<HTMLElement>('[data-sortable-placeholder]');
        const r = placeholder?.getBoundingClientRect();
        if (!r || reduce) { finish(d, false); return; }
        setLanding(true);
        const tr = motionFor('settle', reduce);
        Promise.all([animate(x, r.left, tr).finished, animate(y, r.top, tr).finished]).then(() => finish(dragRef.current, false));
      },
      cancel() {
        s.done = true;
        document.body.style.userSelect = '';
        if (s.started) finish(dragRef.current, true);
      },
    };
    return s;
  }, [finish, reduce, target, x, y]);

  // mouse and pen (a touch is handled from its touch events, below)
  const begin = useCallback((e: ReactPointerEvent<HTMLElement>, list: string, key: string, node: ReactNode) => {
    if (e.pointerType === 'touch' || e.button !== 0 || dragRef.current) return;
    const start = { x: e.clientX, y: e.clientY };
    const s = session(e.currentTarget, list, key, node, start);
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!s.started && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) >= DRAG.mouseSlop) { s.last = { x: ev.clientX, y: ev.clientY }; s.lift(); return; }
      s.move(ev.clientX, ev.clientY);
    };
    const onUp = (ev: PointerEvent) => { if (ev.pointerId !== e.pointerId) return; cleanup(); if (s.started) s.drop(); };
    const onCancel = (ev: PointerEvent) => { if (ev.pointerId === e.pointerId) { cleanup(); s.cancel(); } };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }, [session]);

  // touch, the way it works on a real phone (as dnd-kit's TouchSensor does): touch events with a non-passive touchmove.
  // During the hold, a still finger's moves are cancelled so the browser never starts a scroll from it; a move past
  // touchSlop is a scroll, left alone, and ends the hold. Once lifted, every move is the drag's.
  const beginTouch = useCallback((e: ReactTouchEvent<HTMLElement>, list: string, key: string, node: ReactNode) => {
    if (e.touches.length !== 1 || dragRef.current) return;
    const tgt = e.target as Element;
    if (tgt.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
    const t0 = e.touches[0]!, id = t0.identifier, start = { x: t0.clientX, y: t0.clientY };
    const s = session(e.currentTarget, list, key, node, start);
    const mine = (ev: TouchEvent) => [...ev.changedTouches].find(t => t.identifier === id);
    const onMove = (ev: TouchEvent) => {
      const t = mine(ev);
      if (!t) return;
      if (!s.started) {
        if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > DRAG.touchSlop) { cleanup(); return; } // a scroll
        if (ev.cancelable) ev.preventDefault();
        return;
      }
      if (ev.cancelable) ev.preventDefault();
      s.move(t.clientX, t.clientY);
    };
    const onEnd = (ev: TouchEvent) => {
      if (!mine(ev)) return;
      cleanup();
      if (!s.started) return;
      if (ev.cancelable) ev.preventDefault(); // no click after a drag
      s.drop();
    };
    const onCancel = (ev: TouchEvent) => { if (mine(ev)) { cleanup(); s.cancel(); } };
    const timer = setTimeout(() => s.lift(), DRAG.touchHold);
    const cleanup = () => {
      clearTimeout(timer);
      if (touchMove.current === onMove) touchMove.current = null;
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onCancel);
    };
    touchMove.current = onMove;
    window.addEventListener('touchend', onEnd, { passive: false });
    window.addEventListener('touchcancel', onCancel);
    if (tgt.closest('[data-sortable-handle]')) { clearTimeout(timer); s.lift(); } // the grip lifts at once
  }, [session]);

  const keyboard = useCallback((e: ReactKeyboardEvent<HTMLElement>, list: string, key: string, node: ReactNode) => {
    const d = dragRef.current;
    const ordered = [...lists.current.values()].sort((a, b) => a.order - b.order);
    if (!d) {
      if (e.key !== ' ') return;
      e.preventDefault();
      const l = lists.current.get(list)!;
      const r = e.currentTarget.getBoundingClientRect();
      setDrag((dragRef.current = { key, from: list, to: list, index: l.keys.indexOf(key), mode: 'keyboard', width: r.width, height: r.height, node }));
      setAnnounce(`Picked up. Arrow keys move it, Space drops it, Escape cancels.`);
      return;
    }
    if (d.key !== key) return;
    const size = (id: string) => (lists.current.get(id)?.keys.filter(k => k !== key).length ?? 0);
    let next = d;
    if (e.key === 'ArrowUp') next = { ...d, index: Math.max(0, d.index - 1) };
    else if (e.key === 'ArrowDown') next = { ...d, index: Math.min(size(d.to), d.index + 1) };
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const i = ordered.findIndex(l => l.id === d.to) + (e.key === 'ArrowLeft' ? -1 : 1);
      const l = ordered[i];
      if (l) next = { ...d, to: l.id, index: Math.min(d.index, size(l.id)) };
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const to = lists.current.get(d.to)?.label ?? d.to;
      setAnnounce(`Dropped in ${to}, position ${d.index + 1}.`);
      finish(d, false);
      return;
    } else if (e.key === 'Escape') {
      setAnnounce('Cancelled.');
      finish(d, true);
      return;
    } else return;
    e.preventDefault();
    setDrag((dragRef.current = next));
    setAnnounce(`${lists.current.get(next.to)?.label ?? next.to}, position ${next.index + 1}.`);
  }, [finish]);

  const value = useMemo(() => ({ register, drag, begin, beginTouch, keyboard, reduce }), [register, drag, begin, beginTouch, keyboard, reduce]);
  const lifted = drag?.mode === 'pointer';
  return (
    <Group.Provider value={value}>
      {children}
      <div aria-live="assertive" className="sr-only">{announce}</div>
      {lifted && typeof document !== 'undefined' && createPortal(
        <motion.div
          style={{ position: 'fixed', left: 0, top: 0, x, y, rotate: reduce ? 0 : rotate, width: drag.width, zIndex: 60, pointerEvents: 'none', transformOrigin: '50% 50%' }}
          initial={{ scale: 1, boxShadow: 'var(--elevation-1)' }}
          animate={{ scale: reduce || landing ? 1 : DRAG.liftScale, boxShadow: landing ? 'var(--elevation-1)' : 'var(--elevation-3)' }}
          transition={motionFor(landing ? 'settle' : 'quick', reduce)}
          className="rounded-[var(--radius-lg)]"
        >
          {drag.node}
        </motion.div>,
        document.body,
      )}
    </Group.Provider>
  );
}

const noSelect = { WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as const;

/** True on a touch-first screen (pointer: coarse), where items get a grip to drag by. */
const coarseQuery = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null);
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => !!coarseQuery()?.matches);
  useEffect(() => {
    const q = coarseQuery();
    if (!q) return;
    const on = () => setCoarse(q.matches);
    q.addEventListener?.('change', on);
    return () => q.removeEventListener?.('change', on);
  }, []);
  return coarse;
}

export interface SortableListProps<T> {
  /** The list's id, as SortableMove names it. */
  id: string;
  /** Read out to keyboard users as they move an item here. */
  label: string;
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, state: { dragging: boolean; lifted: boolean }) => ReactNode;
  /** Shown when the list is empty (it still takes drops). */
  empty?: ReactNode;
  className?: string;
  /** Lists are ordered for the keyboard's left and right arrows by this, then by mount order. */
  order?: number;
}

export function SortableList<T>({ id, label, items, getKey, renderItem, empty, className = '', order = 0 }: SortableListProps<T>) {
  const g = useContext(Group);
  if (!g) throw new Error('SortableList must be inside a SortableGroup');
  const ref = useRef<HTMLDivElement>(null);
  const itemEls = useRef(new Map<string, HTMLElement>());
  const keys = items.map(getKey);
  const reg = useRef<Registered>({ id, keys, order, label, el: null, items: itemEls.current });
  reg.current.keys = keys;
  reg.current.label = label;
  useLayoutEffect(() => { reg.current.el = ref.current; return g.register(reg.current); }, [g.register]);
  useEffect(() => { reg.current.order = order; }, [order]);

  const d = g.drag;
  const shift = motionFor('shift', g.reduce);
  const coarse = useCoarsePointer();
  // what the list shows: its items, minus the one lifted out of it, plus a gap where it would land
  type Row = { kind: 'item'; item: T; key: string } | { kind: 'carried'; key: string } | { kind: 'gap' } | { kind: 'leaving'; item: T; key: string };
  const rows: Row[] = items.filter(it => !(d?.mode === 'pointer' && getKey(it) === d.key)).map(it => ({ kind: 'item', item: it, key: getKey(it) }));
  if (d?.mode === 'keyboard') {
    // the carried item is drawn in the list it is over, wherever it came from
    const at = rows.findIndex(r => r.kind === 'item' && r.key === d.key);
    if (at >= 0) rows.splice(at, 1);
    if (d.to === id) rows.splice(Math.min(d.index, rows.length), 0, { kind: 'carried', key: d.key });
  } else if (d && d.to === id) rows.splice(Math.min(d.index, rows.length), 0, { kind: 'gap' });

  // keep the keyboard on the carried item as it moves from list to list
  useEffect(() => {
    if (d?.mode === 'keyboard' && d.to === id) itemEls.current.get(d.key)?.focus();
  }, [d?.mode, d?.to, d?.key, id]);

  // lists-close-gaps: an item that was on screen and leaves the list (answered, started, dropped, moved by someone else)
  // stays a moment, collapsing, while its neighbours close the gap. A dragged or carried item is already off screen in
  // its source list, so it never counts as leaving.
  const shown = useRef(new Map<string, { item: T; index: number }>());
  const [leaving, setLeaving] = useState<{ key: string; item: T; index: number }[]>([]);
  useLayoutEffect(() => {
    const present = new Set(keys);
    const gone = [...shown.current].filter(([k]) => !present.has(k)).map(([key, v]) => ({ key, ...v }));
    const next = new Map<string, { item: T; index: number }>();
    rows.forEach((r, index) => { if (r.kind === 'item') next.set(r.key, { item: r.item, index }); });
    shown.current = next;
    if (!gone.length) return;
    setLeaving(l => [...l.filter(x => !present.has(x.key)), ...gone.filter(x => !l.some(y => y.key === x.key))]);
    // a timer, not the animation's end, decides when it's gone (motion-never-blocks); not cleared on the next render,
    // which comes at once
    setTimeout(() => setLeaving(l => l.filter(x => !gone.some(y => y.key === x.key))), g.reduce ? 0 : duration.shift);
  });
  // an item new to this list since the last render (not on its first): it came from another list and lands on settle
  const settle = motionFor('settle', g.reduce);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
  const before = shown.current;
  const arrived = (key: string) => mounted.current && !before.has(key);
  for (const l of leaving) if (!keys.includes(l.key)) rows.splice(Math.min(l.index, rows.length), 0, { kind: 'leaving', item: l.item, key: l.key });

  return (
    <div ref={ref} className={`flex flex-col gap-2xs ${className}`} role="list" aria-label={label}>
      {rows.map(r =>
        r.kind === 'leaving' ? (
          <motion.div key={'leaving-' + r.key} aria-hidden layout transition={shift}
            initial={{ opacity: 1, height: 'auto' }} animate={{ opacity: 0, height: 0, transition: { height: shift, opacity: motionFor('contentOut', g.reduce) } }}
            style={{ overflow: 'hidden', pointerEvents: 'none' }}>
            {renderItem(r.item, { dragging: false, lifted: false })}
          </motion.div>
        ) : r.kind === 'gap' ? (
          <motion.div key="__gap" data-sortable-placeholder layout transition={shift} style={{ height: d!.height }}
            className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-subtle)]" />
        ) : r.kind === 'carried' ? (
          // the item carried from the keyboard: the same element (shared layoutId), lifted, travelling between lists
          <motion.div
            key={r.key}
            layoutId={'sortable-' + r.key}
            transition={shift}
            role="listitem"
            tabIndex={0}
            aria-roledescription="sortable item"
            aria-grabbed
            ref={(el: HTMLDivElement | null) => { if (el) itemEls.current.set(r.key, el); else itemEls.current.delete(r.key); }}
            onKeyDown={e => g.keyboard(e, id, r.key, null)}
            className="rounded-[var(--radius-lg)] outline-none ring-2 ring-[var(--color-border-focus)]"
            animate={g.reduce ? { scale: 1 } : { scale: DRAG.liftScale, boxShadow: 'var(--elevation-3)' }}
          >
            {d!.node}
          </motion.div>
        ) : (
          <motion.div
            key={r.key}
            layout
            // one layoutId across the group: an item moved to another list (by a button, or someone else) flies there
            layoutId={'sortable-' + r.key}
            transition={arrived(r.key) ? settle : shift}
            role="listitem"
            tabIndex={0}
            aria-roledescription="sortable item"
            ref={(el: HTMLDivElement | null) => { if (el) itemEls.current.set(r.key, el); else itemEls.current.delete(r.key); }}
            onPointerDown={e => g.begin(e, id, r.key, renderItem(r.item, { dragging: true, lifted: true }))}
            onTouchStart={e => g.beginTouch(e, id, r.key, renderItem(r.item, { dragging: true, lifted: true }))}
            // a hold is a drag, not the phone's text selection, callout or context menu
            onContextMenu={coarse ? e => e.preventDefault() : undefined}
            style={coarse ? noSelect : undefined}
            onKeyDown={e => g.keyboard(e, id, r.key, renderItem(r.item, { dragging: true, lifted: true }))}
            className={'select-none rounded-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] ' + (coarse ? 'flex items-stretch' : 'cursor-grab active:cursor-grabbing')}
          >
            {coarse ? <div className="min-w-0 flex-1">{renderItem(r.item, { dragging: false, lifted: false })}</div> : renderItem(r.item, { dragging: false, lifted: false })}
            {coarse && (
              // the touch grip: claims the gesture so the page doesn't pan; the keyboard path covers assistive tech
              <span data-sortable-handle aria-hidden style={{ touchAction: 'none' }}
                className="flex w-11 min-h-11 shrink-0 cursor-grab items-center justify-center text-[var(--color-text-muted)]">
                <GripVertical size={20} />
              </span>
            )}
          </motion.div>
        ),
      )}
      {rows.length === 0 && empty}
    </div>
  );
}
