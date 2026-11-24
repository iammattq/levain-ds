'use client';

/**
 * A bottom sheet for any app (T10): StatusCardDialog's phone sheet (Sheet.tsx) with any head and body.
 *
 * Handle, swipe down or flick to close, a fixed head over a scrolling body with the hairline while scrolled, safe-area
 * padding, a scrim whose tap closes it, Escape, focus moved in, kept in (Tab wraps) and given back on close, and a fade
 * in place of the rise under Reduce Motion. No snap heights (Q45). It is a sheet at every width: the caller decides when
 * to show one (`useIsPhone` is exported for that).
 *
 * The head is `title` beside a ✕, exactly as StatusCardDialog's head with only a title; `head` replaces it whole (then
 * the caller supplies its own close, if any).
 */
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SheetPanel, SheetScrim } from './Sheet';
import { DialogHead } from './StatusCard';
import { useDialogFocus } from '../utils/useDialogFocus';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** The title in the default head, beside the ✕. A string also names the dialog. */
  title?: ReactNode;
  /** A head of the caller's own, in place of the title and ✕. It stays put while the body scrolls, and starts a drag. */
  head?: ReactNode;
  /** The dialog's accessible name; needed when `title` isn't a string. */
  label?: string;
  /** The body: scrolls inside the sheet. */
  children: ReactNode;
}

export function BottomSheet({ open, onClose, title, head, label, children }: BottomSheetProps) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panel, onClose);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onClick={onClose} data-sheet-overlay>
          <SheetScrim reduce={reduce} />
          <SheetPanel panelRef={panel} reduce={reduce} onDragClose={onClose} label={label ?? (typeof title === 'string' ? title : undefined)}
            head={head ?? <DialogHead title={title} onClose={onClose} />}>
            {children}
          </SheetPanel>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
