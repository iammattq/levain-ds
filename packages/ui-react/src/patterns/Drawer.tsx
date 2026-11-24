'use client';

/**
 * A side drawer (T36): a full-height panel that slides in from the left edge, for a phone menu (Ringmaster's T112).
 *
 * BottomSheet's feel, turned on its side: the same scrim (its tap closes), the same focus behaviour (useDialogFocus:
 * focus moved in, kept in, given back on close; Escape from the top dialog only, unless a widget inside claimed it), the
 * same surface (or, with surface="canvas", the darker canvas one), its far corners rounded (--radius-2xl) and its near ones square against the edge. It slides in on
 * recipe.sheetIn and out on recipe.sheetOut; under Reduce Motion it appears and goes at once. The page under it doesn't
 * scroll while it's open. It runs the screen's full height, even where iOS hands a fixed box a shorter viewport (T51);
 * its contents sit inside the safe-area insets and scroll inside it.
 *
 * A swipe left on the panel past a quarter of its width, or a flick left, closes it (the sheet's thresholds); a shorter
 * one springs back. As the sheet's handle: a swipe starts only off the controls (a press on a link or button stays a
 * click), and the panel's touch-action is pan-y pinch-zoom, so the browser keeps vertical scrolling and pinch-zoom and
 * hands sideways moves to the swipe; text stays selectable. No head: the caller's children are the whole contents, its
 * own close (if any) among them.
 */
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, type PanInfo } from 'framer-motion';
import { motion as motionFor } from '@levain/tokens';
import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { INTERACTIVE, SHEET_CLOSE, SheetScrim } from './Sheet';
import { useDialogFocus } from '../utils/useDialogFocus';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name. */
  label: string;
  /** The edge it slides from. Only the left, for now. */
  side?: 'left';
  /** Its background: the elevated surface (default), or the darker canvas surface (T51). Both keep elevation-3. */
  surface?: 'elevated' | 'canvas';
  /** The contents: they scroll inside the drawer. */
  children: ReactNode;
}

/** Whether a horizontal drag that ended here closes the drawer: past a quarter of its width leftward, or a left flick. */
export const closesDrawer = (offsetX: number, velocityX: number, width: number) =>
  -offsetX > width * SHEET_CLOSE.distance || -velocityX > SHEET_CLOSE.velocity;

/**
 * The page under an open drawer stays put: the body doesn't scroll, and keeps the width its scrollbar took. One lock for
 * every open drawer: the first to open saves the body's style, the last to close puts it back, in any order.
 */
let locks = 0;
let saved = { overflow: '', paddingRight: '' };
function useScrollLock(on: boolean) {
  useLayoutEffect(() => {
    if (!on) return;
    const body = document.body;
    if (locks++ === 0) {
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const bar = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = 'hidden';
      if (bar > 0) body.style.paddingRight = `calc(${getComputedStyle(body).paddingRight} + ${bar}px)`;
    }
    return () => {
      if (--locks === 0) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
      }
    };
  }, [on]);
}

/** The panel's background per `surface`, spelled out so Tailwind finds both. */
const SURFACE = {
  elevated: 'bg-[var(--color-surface-elevated)]',
  canvas: 'bg-[var(--color-surface-canvas)]',
} as const;

export function Drawer({ open, onClose, label, surface = 'elevated', children }: DrawerProps) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useDragControls();
  useDialogFocus(open, panel, onClose);
  useScrollLock(open);
  if (typeof document === 'undefined') return null;
  // a swipe from anywhere on the panel but a control (a link or button pressed and moved stays put)
  const startDrag = (e: ReactPointerEvent) => {
    if ((e.target as Element).closest?.(INTERACTIVE)) return;
    controls.start(e);
  };
  const end = (_: unknown, info: PanInfo) => {
    if (closesDrawer(info.offset.x, info.velocity.x, panel.current?.offsetWidth ?? 0)) onClose();
    else animate(x, 0, motionFor('sheetIn', reduce));
  };
  return createPortal(
    <AnimatePresence>
      {open && (
        // min-h-lvh (T51): iOS can size a fixed inset-0 box to a viewport shorter than the screen (Safari's toolbar, the
        // standalone app after the keyboard); never shorter than the largest viewport, the scrim and panel reach the bottom
        <div className="fixed inset-0 z-50 min-h-lvh" onClick={onClose} data-drawer-overlay>
          <SheetScrim reduce={reduce} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            data-drawer
            data-side="left"
            data-surface={surface}
            initial={reduce ? false : { x: '-100%' }}
            animate={{ x: 0, transition: motionFor('sheetIn', reduce) }}
            exit={{ x: reduce ? 0 : '-100%', transition: motionFor('sheetOut', reduce) }}
            drag="x"
            dragControls={controls}
            dragListener={false}
            onPointerDown={startDrag}
            dragMomentum={false}
            dragConstraints={{ right: 0 }}
            dragElastic={{ left: 1, right: 0 }}
            onDragEnd={end}
            style={{ x }}
            onClick={e => e.stopPropagation()}
            className={`absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] touch-pan-y touch-pinch-zoom flex-col overflow-hidden rounded-r-[var(--radius-2xl)] ${SURFACE[surface]} shadow-[var(--elevation-3)] outline-none`}
          >
            <div data-drawer-body className="flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto overscroll-contain pt-safe-md pb-safe-md pl-safe-md pr-md">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
