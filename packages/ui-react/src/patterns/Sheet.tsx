'use client';

/**
 * The phone side of StatusCardDialog and StatusCardDialogStack (T24): below `md` a dialog is a bottom sheet.
 *
 * Full width, docked to the bottom edge, its top corners rounded (--radius-2xl) and its bottom square against the edge.
 * It rises on recipe.sheetIn and drops away on recipe.sheetOut; under Reduce Motion it doesn't move, it fades. It is
 * capped below the top inset, 2rem short, so the page always peeks above it; the head stays put and the body scrolls
 * inside, clear of the home bar (shared.css's safe-area utilities: px-safe, pb-safe-md, and --safe-top in the cap). A
 * scrim behind it (as ToolInfo's) gives it something to read against and takes the tap that closes it.
 *
 * A handle at the top: dragging it (or the head) down past a quarter of the sheet's height, or flicking it down, closes
 * the sheet; a shorter drag springs back on recipe.sheetIn. Only the handle and the head start a drag (useDragControls),
 * so scrolling the body never moves the sheet.
 *
 * A hairline under the head only while the body is scrolled (Q36): at rest nothing divides them; once words run up under
 * the head, the line marks the edge. Always 1 px, transparent at rest, so nothing shifts when it shows.
 */
import { animate, motion, useDragControls, useMotionValue, type MotionProps, type MotionStyle, type PanInfo } from 'framer-motion';
import { motion as motionFor, recipe } from '@levain/tokens';
import { forwardRef, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';

/** Below Tailwind's `md` (48rem): the sheet's width. */
export const PHONE_QUERY = '(max-width: 47.99rem)';

const subscribe = (change: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener?.('change', change);
  return () => mq.removeEventListener?.('change', change);
};
const phoneNow = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches;

/** True below `md`. False on the server and where matchMedia is missing: the desktop dialog is the default. */
export function useIsPhone() {
  return useSyncExternalStore(subscribe, phoneNow, () => false);
}

/** How far down (a share of the sheet's height) a drag must go to close it, and how fast a flick must be (px/s). */
export const SHEET_CLOSE = { distance: 0.25, velocity: 500 } as const;

/** Whether a drag that ended here closes the sheet: past the distance, or a downward flick. */
export const closesSheet = (offsetY: number, velocityY: number, height: number) =>
  offsetY > height * SHEET_CLOSE.distance || velocityY > SHEET_CLOSE.velocity;

/** The sheet's cap: the viewport less the top inset less 2rem, so the page peeks above it. */
export const SHEET_MAX_HEIGHT = 'max-h-[calc(100dvh-var(--safe-top)-2rem)]';

/** Rising and dropping away; under Reduce Motion no rise, a fade. */
const enter = (reduce: boolean | null | undefined) => (reduce ? { opacity: 0 } : { y: '100%' });
const shown = (reduce: boolean | null | undefined) =>
  reduce ? { opacity: 1, transition: recipe.fadeIn } : { y: 0, transition: recipe.sheetIn };
const leave = (reduce: boolean | null | undefined) =>
  reduce ? { opacity: 0, transition: recipe.contentOut } : { y: '100%', transition: recipe.sheetOut };

/** The scrim behind a sheet; a tap on it reaches the overlay's onClick, which closes. */
export function SheetScrim({ reduce }: { reduce: boolean | null | undefined }) {
  return (
    <motion.div
      aria-hidden
      data-sheet-scrim
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: motionFor('fadeIn', reduce) }}
      exit={{ opacity: 0, transition: motionFor('contentOut', reduce) }}
      className="absolute inset-0 bg-[var(--color-surface-inverted)]/30"
    />
  );
}

const INTERACTIVE = 'button, a, input, textarea, select, [role="button"], [contenteditable="true"]';

export interface SheetPanelProps {
  /** Called when a drag ends past the threshold. */
  onDragClose: () => void;
  reduce: boolean | null | undefined;
  /** The head: stays put while the body scrolls, and starts a drag. */
  head: ReactNode;
  children: ReactNode;
  panelRef?: Ref<HTMLDivElement>;
  /** The dialog's accessible name. */
  label?: string;
  /**
   * False for a sheet behind the front in a stack: not a dialog, hidden from assistive technology, never dragged, its
   * words hidden (they fade out as it steps back). Default true.
   */
  front?: boolean;
  /** Its own motion (a stack's pile pose, its arrivals and exits) in place of the single sheet's rise and drop. */
  motionProps?: Pick<MotionProps, 'initial' | 'animate' | 'exit' | 'variants' | 'transition'>;
  /** Extra motion style (the pile's origin, its z-index). */
  style?: MotionStyle;
  /** Where it sits: docked to the bottom edge by default. */
  place?: string;
  /** Its surface: the elevated background and floating shadow by default. */
  surface?: string;
  /** Extra classes. */
  className?: string;
  onAnimationComplete?: MotionProps['onAnimationComplete'];
  [data: `data-${string}`]: unknown;
}

/**
 * The hairline under the head while the body scrolls: light as the body's own dividers (--color-border-subtle), dark one
 * step stronger (--color-border-default), where subtle is all but invisible on the elevated surface.
 */
export const SCROLLED_EDGE = 'border-[var(--color-border-subtle)] dark:border-[var(--color-border-default)]';

const SURFACE = 'bg-[var(--color-surface-elevated)] shadow-[var(--elevation-3)]';

/** A sheet's panel: handle, head, scrolling body. Must sit inside an AnimatePresence for its exit to play. */
export const SheetPanel = forwardRef<HTMLDivElement, SheetPanelProps>(function SheetPanel(
  { onDragClose, reduce, head, children, panelRef, label, front = true, motionProps, style, place = 'absolute inset-x-0 bottom-0', surface = SURFACE, className = '', onAnimationComplete, ...data },
  forwarded,
) {
  const controls = useDragControls();
  const y = useMotionValue(0);
  const el = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const ref = (node: HTMLDivElement | null) => {
    el.current = node;
    for (const r of [panelRef, forwarded]) if (typeof r === 'function') r(node); else if (r) (r as { current: HTMLDivElement | null }).current = node;
  };
  // a drag from the handle or the head, never from a control in the head (its ✕ must stay a click)
  const startDrag = (e: ReactPointerEvent) => {
    if (!front || (e.target as Element).closest?.(INTERACTIVE)) return;
    controls.start(e);
  };
  const end = (_: unknown, info: PanInfo) => {
    if (closesSheet(info.offset.y, info.velocity.y, el.current?.offsetHeight ?? 0)) onDragClose();
    else animate(y, 0, motionFor('sheetIn', reduce));
  };
  // a sheet behind keeps its words in place but hidden, as the desktop pile does
  const words = front ? { opacity: 1, transition: recipe.contentIn } : { opacity: 0, transition: recipe.contentOut };
  return (
    <motion.div
      ref={ref}
      {...data}
      role={front ? 'dialog' : undefined}
      aria-modal={front ? 'true' : undefined}
      aria-hidden={front ? undefined : true}
      aria-label={front ? label : undefined}
      tabIndex={front ? -1 : undefined}
      data-sheet
      {...(motionProps ?? { initial: enter(reduce), animate: shown(reduce), exit: leave(reduce) })}
      drag={front ? 'y' : false}
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 1 }}
      onDragEnd={end}
      onAnimationComplete={onAnimationComplete}
      style={{ y, ...style }}
      onClick={front ? e => e.stopPropagation() : undefined}
      className={
        // the cap spelled out in full here, as Tailwind finds classes by reading the source
        place + ' flex max-h-[calc(100dvh-var(--safe-top)-2rem)] flex-col overflow-hidden rounded-t-[var(--radius-2xl)] outline-none ' + surface + ' ' + className
      }
    >
      <motion.div onPointerDown={startDrag} data-sheet-grab initial={false} animate={words}
        className="shrink-0 touch-none select-none px-safe">
        <div data-sheet-handle aria-hidden className="flex justify-center pt-2xs pb-3xs">
          <span className="h-1 w-9 rounded-full bg-[var(--color-border-default)]" />
        </div>
        <div data-sheet-head data-scrolled={scrolled || undefined}
          className={'border-b px-md pb-sm ' + (scrolled ? SCROLLED_EDGE : 'border-transparent')}>
          {head}
        </div>
      </motion.div>
      <motion.div
        data-sheet-body
        initial={false}
        animate={words}
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 0)}
        className="flex min-h-0 flex-col gap-sm overflow-y-auto overscroll-contain pt-3xs pb-safe-md px-safe-md"
      >
        {children}
      </motion.div>
    </motion.div>
  );
});
