'use client';

/**
 * A side drawer (T36): a full-height panel that slides in from the left edge, for a phone menu (Ringmaster's T112).
 *
 * BottomSheet's feel, turned on its side: the same scrim (its tap closes), the same focus behaviour (useDialogFocus:
 * focus moved in, kept in, given back on close; Escape from the top dialog only, unless a widget inside claimed it), the
 * same surface, its far corners rounded (--radius-2xl) and its near ones square against the edge. It slides in on
 * recipe.sheetIn and out on recipe.sheetOut; under Reduce Motion it appears and goes at once. The page under it doesn't
 * scroll while it's open. Its contents sit inside the safe-area insets and scroll inside it.
 *
 * A swipe left on the panel past a quarter of its width, or a flick left, closes it (the sheet's thresholds); a shorter
 * one springs back. No head: the caller's children are the whole contents, its own close (if any) among them.
 */
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type PanInfo } from 'framer-motion';
import { motion as motionFor } from '@levain/tokens';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SHEET_CLOSE, SheetScrim } from './Sheet';
import { useDialogFocus } from '../utils/useDialogFocus';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  /** The dialog's accessible name. */
  label: string;
  /** The edge it slides from. Only the left, for now. */
  side?: 'left';
  /** The contents: they scroll inside the drawer. */
  children: ReactNode;
}

/** Whether a horizontal drag that ended here closes the drawer: past a quarter of its width leftward, or a left flick. */
export const closesDrawer = (offsetX: number, velocityX: number, width: number) =>
  -offsetX > width * SHEET_CLOSE.distance || -velocityX > SHEET_CLOSE.velocity;

/** The page under an open drawer stays put: the body doesn't scroll, and keeps the width its scrollbar took. */
function useScrollLock(on: boolean) {
  useLayoutEffect(() => {
    if (!on) return;
    const body = document.body;
    const { overflow, paddingRight } = body.style;
    const bar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (bar > 0) body.style.paddingRight = `calc(${getComputedStyle(body).paddingRight} + ${bar}px)`;
    return () => {
      body.style.overflow = overflow;
      body.style.paddingRight = paddingRight;
    };
  }, [on]);
}

export function Drawer({ open, onClose, label, children }: DrawerProps) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  useDialogFocus(open, panel, onClose);
  useScrollLock(open);
  if (typeof document === 'undefined') return null;
  const end = (_: unknown, info: PanInfo) => {
    if (closesDrawer(info.offset.x, info.velocity.x, panel.current?.offsetWidth ?? 0)) onClose();
    else animate(x, 0, motionFor('sheetIn', reduce));
  };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onClick={onClose} data-drawer-overlay>
          <SheetScrim reduce={reduce} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            data-drawer
            data-side="left"
            initial={reduce ? false : { x: '-100%' }}
            animate={{ x: 0, transition: motionFor('sheetIn', reduce) }}
            exit={{ x: reduce ? 0 : '-100%', transition: motionFor('sheetOut', reduce) }}
            drag="x"
            dragMomentum={false}
            dragConstraints={{ right: 0 }}
            dragElastic={{ left: 1, right: 0 }}
            onDragEnd={end}
            style={{ x }}
            onClick={e => e.stopPropagation()}
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-hidden rounded-r-[var(--radius-2xl)] bg-[var(--color-surface-elevated)] shadow-[var(--elevation-3)] outline-none"
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
