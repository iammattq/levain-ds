'use client';

/**
 * useDialogFocus (T29): the one focus behaviour every levain dialog shares (Modal, BottomSheet, StatusCardDialog,
 * StatusCardDialogStack).
 *
 * While `open`: focus moves into the dialog (its container, unless something inside already has it), Tab and Shift+Tab
 * wrap inside it, and Escape calls `onEscape`. On close, focus goes back to what had it before the dialog opened.
 *
 * Dialogs layer: the one opened last is the top, and only the top answers Tab and Escape. So a dialog opened over
 * another (a confirmation over a card's dialog) closes alone on Escape, and its trap holds focus, not the one below.
 * The top claims Escape (preventDefault), so anything around it can tell the key was already answered.
 *
 * Focus goes back to what had it, or, when that left the page as the dialog opened (a card that morphs into its dialog
 * is unmounted until it closes, so focus falls to the body), to `returnTo()`: the card as it comes back. See `opensAttr`.
 *
 * `container` is a ref, or a function that returns the element (the dialog stack's front changes as dialogs come and
 * go). `onEscape` is read through a ref: a fresh inline callback each render never re-runs the open effect (focus would
 * jump back to the container mid-typing).
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/**
 * The attribute an opener carries so its dialog can give focus back to it after a morph remounted it: the shared
 * layoutId (StatusCard's open target, CardStack's cards). `opener(id)` finds it.
 */
export const opensAttr = 'data-opens';
export const opener = (layoutId: string) => document.querySelector<HTMLElement>(`[${opensAttr}="${layoutId.replace(/["\\]/g, '\\$&')}"]`);

type Container = RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

/** The open dialogs, oldest first: the last is the top. */
const layers: object[] = [];

/** What Tab can reach inside `root`, in order: nothing disabled, nothing inert. */
export function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => !el.closest('[inert]'));
}

export function useDialogFocus(open: boolean, container: Container, onEscape: () => void, returnTo?: () => HTMLElement | null | undefined) {
  const onEscapeRef = useRef(onEscape);
  const containerRef = useRef(container);
  const returnToRef = useRef(returnTo);
  useLayoutEffect(() => { onEscapeRef.current = onEscape; containerRef.current = container; returnToRef.current = returnTo; });
  // what had focus before the dialog opened: read in a layout effect, before the effect below moves focus in
  const before = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) before.current = document.activeElement as HTMLElement | null;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const me = {};
    layers.push(me);
    const get = () => {
      const c = containerRef.current;
      return (typeof c === 'function' ? c() : c.current) ?? null;
    };
    const el = get();
    if (el && !el.contains(document.activeElement)) el.focus();
    const key = (e: KeyboardEvent) => {
      if (layers[layers.length - 1] !== me) return;
      if (e.key === 'Escape') { e.preventDefault(); onEscapeRef.current(); return; }
      const root = get();
      if (e.key !== 'Tab' || !root) return;
      // Tab and Shift+Tab wrap inside; from outside it (or the container itself), they come back in
      const all = focusables(root);
      const first = all[0];
      const last = all[all.length - 1];
      const at = document.activeElement;
      if (!first || !last) { e.preventDefault(); root.focus(); return; }
      const inside = root.contains(at) && at !== root;
      if (e.shiftKey && (!inside || at === first)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || at === last)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', key);
    const prev = before.current;
    return () => {
      window.removeEventListener('keydown', key);
      const i = layers.indexOf(me);
      if (i >= 0) layers.splice(i, 1);
      // the opener may have left in the very commit that opened the dialog (focus fell to the body) or since
      const gone = !prev || !prev.isConnected || prev === document.body;
      (gone ? returnToRef.current?.() ?? prev : prev)?.focus?.();
    };
  }, [open]);
}
