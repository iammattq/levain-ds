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
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SheetPanel, SheetScrim } from './Sheet';
import { DialogHead } from './StatusCard';

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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function BottomSheet({ open, onClose, title, head, label, children }: BottomSheetProps) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  // the latest onClose through a ref: a fresh inline onClose each render must not re-run the open effect (focus would
  // jump back to the panel mid-typing)
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      // Tab and Shift+Tab wrap inside the sheet; from outside it (or the panel itself), they come back in
      const all = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = all[0];
      const last = all[all.length - 1];
      const at = document.activeElement;
      if (!first || !last) { e.preventDefault(); panel.current.focus(); return; }
      const inside = panel.current.contains(at) && at !== panel.current;
      if (e.shiftKey && (!inside || at === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || at === last)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [open]);
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
