'use client';

/**
 * SortableList: drag and drop within a list and across lists, by mouse, touch and keyboard, with the drag recipe from
 * assembly.json (drag-physics):
 * - the card tracks the pointer exactly (no lag, no transition) and stays the same card: it lifts (scale and one
 *   elevation step) and leans with its velocity;
 * - its neighbours part on recipe.shift to show where it will land;
 * - on release it settles into its slot on recipe.settle (the spring, a small overshoot).
 * A mouse drag starts after drag.mouseSlop px, a touch drag after the finger holds still for drag.touchHold ms (so a
 * swipe still scrolls). From the keyboard: Space lifts the focused item, the arrows move it (left and right to the
 * neighbouring list), Space drops it, Escape puts it back. Under reduced motion everything moves at once.
 *
 * Wrap the lists in one <SortableGroup onMove>. Each <SortableList id> renders its items through `renderItem`.
 */
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'framer-motion';
import { drag as DRAG, motion as motionFor, recipe, tiltSpring } from '@levain/tokens';
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
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

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
  keyboard: (e: ReactKeyboardEvent<HTMLElement>, list: string, key: string, node: ReactNode) => void;
  reduce: boolean;
}
const Group = createContext<GroupContext | null>(null);
const DRAG_LIFT = DRAG.liftScale;

export interface SortableGroupProps {
  /** Called once, when an item is dropped somewhere new. */
  onMove: (move: SortableMove) => void;
  children: ReactNode;
}

export function SortableGroup({ onMove, children }: SortableGroupProps) {
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
    if (!d || cancelled) return;
    const fromIndex = lists.current.get(d.from)?.keys.indexOf(d.key) ?? -1;
    if (d.to === d.from && d.index === fromIndex) return;
    onMove({ key: d.key, from: d.from, to: d.to, index: d.index });
  }, [onMove]);

  const begin = useCallback((e: ReactPointerEvent<HTMLElement>, list: string, key: string, node: ReactNode) => {
    if (e.button !== 0 || dragRef.current) return;
    const el = e.currentTarget;
    const start = { x: e.clientX, y: e.clientY };
    const touch = e.pointerType === 'touch';
    let started = false, holdTimer = 0, last = start;
    const rect = el.getBoundingClientRect();

    const lift = () => {
      started = true;
      // no text selection while something is in the hand
      document.body.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();
      grab.current = { dx: start.x - rect.left, dy: start.y - rect.top };
      x.jump(rect.left);
      y.jump(rect.top);
      const d: DragState = { key, from: list, to: list, index: lists.current.get(list)!.keys.indexOf(key), mode: 'pointer', width: rect.width, height: rect.height, node };
      dragRef.current = d;
      setDrag(d);
      move(last.x, last.y);
    };
    const move = (px: number, py: number) => {
      last = { x: px, y: py };
      if (!started) return;
      x.set(px - grab.current.dx);
      y.set(py - grab.current.dy);
      const t = target(px, py, key);
      const d = dragRef.current;
      if (t && d && (t.id !== d.to || t.index !== d.index)) setDrag((dragRef.current = { ...d, to: t.id, index: t.index }));
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!started) {
        const far = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (touch) { if (far > 8) cleanup(); return; } // moved before the hold: it's a scroll
        if (far >= DRAG.mouseSlop) { last = { x: ev.clientX, y: ev.clientY }; lift(); }
        return;
      }
      move(ev.clientX, ev.clientY);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      cleanup();
      if (!started) return;
      const d = dragRef.current;
      // settle: the card flies to its slot on the spring, then the move is committed in that same place
      const slot = d && lists.current.get(d.to);
      const placeholder = slot?.el?.querySelector<HTMLElement>('[data-sortable-placeholder]');
      const r = placeholder?.getBoundingClientRect();
      if (!r || reduce) { finish(d, false); return; }
      setLanding(true);
      const tr = motionFor('settle', reduce);
      Promise.all([animate(x, r.left, tr).finished, animate(y, r.top, tr).finished]).then(() => finish(dragRef.current, false));
    };
    const onCancel = (ev: PointerEvent) => { if (ev.pointerId === e.pointerId) { cleanup(); if (started) finish(dragRef.current, true); } };
    const noScroll = (ev: TouchEvent) => { if (started) ev.preventDefault(); };
    const cleanup = () => {
      clearTimeout(holdTimer);
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('touchmove', noScroll);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('touchmove', noScroll, { passive: false });
    if (touch) holdTimer = window.setTimeout(lift, DRAG.touchHold);
  }, [finish, reduce, target, x, y]);

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

  const value = useMemo(() => ({ register, drag, begin, keyboard, reduce }), [register, drag, begin, keyboard, reduce]);
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
  // what the list shows: its items, minus the one lifted out of it, plus a gap where it would land
  type Row = { kind: 'item'; item: T; key: string } | { kind: 'carried'; key: string } | { kind: 'gap' };
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
  const carrying = d?.mode === 'keyboard';

  return (
    <div ref={ref} className={`flex flex-col gap-2xs ${className}`} role="list" aria-label={label}>
      {rows.map(r =>
        r.kind === 'gap' ? (
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
            animate={g.reduce ? { scale: 1 } : { scale: DRAG_LIFT, boxShadow: 'var(--elevation-3)' }}
          >
            {d!.node}
          </motion.div>
        ) : (
          <motion.div
            key={r.key}
            layout
            layoutId={carrying ? 'sortable-' + r.key : undefined}
            transition={shift}
            role="listitem"
            tabIndex={0}
            aria-roledescription="sortable item"
            ref={(el: HTMLDivElement | null) => { if (el) itemEls.current.set(r.key, el); else itemEls.current.delete(r.key); }}
            onPointerDown={e => g.begin(e, id, r.key, renderItem(r.item, { dragging: true, lifted: true }))}
            onKeyDown={e => g.keyboard(e, id, r.key, renderItem(r.item, { dragging: true, lifted: true }))}
            className="cursor-grab touch-pan-y select-none rounded-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] active:cursor-grabbing"
          >
            {renderItem(r.item, { dragging: false, lifted: false })}
          </motion.div>
        ),
      )}
      {rows.length === 0 && empty}
    </div>
  );
}
