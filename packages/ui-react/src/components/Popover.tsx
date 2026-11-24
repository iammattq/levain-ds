'use client';

/**
 * Popover (T39): a small panel anchored to a trigger, the board's head popovers and project switcher as one levain
 * piece. Menu (T41) is a Popover with role="menu"; Tooltip (T42) reuses `anchorPopup` and the portal layer.
 *
 * The motion is the switcher's (tokens/motion.ts): one surface starts as the trigger's box and changes shape into the
 * panel (recipe.morph); the content follows once there's room (contentIn, after contentOut). Closing runs it backwards
 * and quicker: the content leaves (contentOut) as the shape collapses into the trigger (recipe.collapse) and fades.
 * Reduce Motion: it fades in and out where it is.
 *
 * Placement: `calculatePopupPosition` with the panel's measured size, so it flips to the other side when there's no
 * room and keeps `viewportMargin` from the window's edges. Kept in place while the page scrolls or resizes.
 *
 * Focus and Escape are useDialogFocus's (T29): focus goes in (to `initialFocus`, else the first control, else the
 * panel), Escape closes it (only the top layer: a popover in a Modal closes alone), and focus goes back to the trigger.
 * Unlike a dialog it doesn't trap: Tab past the last control (Shift+Tab before the first) closes it, back to the
 * trigger, as the board's do. A press anywhere outside the trigger and panel closes it.
 *
 * Portalled to the body above dialogs (z 60; Modal and the StatusCard dialogs are z 50). `portal={false}` renders it
 * beside the trigger instead, under it: the trigger's label shows on the surface while it morphs (the board's
 * layering), for a trigger in a bar that nothing clips.
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { duration, instant, recipe } from '@levain/tokens';
import { cn } from '../utils/cn';
import { calculatePopupPosition, type PopupAlignment, type PopupPlacement } from '../utils/popupPosition';
import { focusables, useDialogFocus } from '../utils/useDialogFocus';

const s = (ms: number) => ms / 1000;

export interface AnchorOptions {
  placement?: PopupPlacement;
  align?: PopupAlignment;
  /** Gap between the trigger and the panel, in px. */
  sideOffset?: number;
  /** How far the panel reaches past the trigger's aligned edge, in px (the board's panels: 4). Ignored when centred. */
  alignOffset?: number;
  /** Least distance from the window's edges, in px. */
  viewportMargin?: number;
}

export interface Anchored {
  left: number;
  top: number;
  placement: PopupPlacement;
  alignment: PopupAlignment;
}

/**
 * Where a panel of `size` goes beside `trigger`, in window coordinates (for a fixed box): placed and flipped by
 * `calculatePopupPosition`, reached out by `alignOffset`, then kept `viewportMargin` inside the window.
 */
export function anchorPopup(
  trigger: HTMLElement,
  size: { width: number; height: number },
  { placement = 'bottom', align = 'start', sideOffset = 6, alignOffset = 0, viewportMargin = 8 }: AnchorOptions = {}
): Anchored {
  const p = calculatePopupPosition(trigger, null, {
    preferredPlacement: placement,
    preferredAlignment: align,
    viewportMargin,
    offset: sideOffset,
    popupWidth: size.width,
    popupHeight: size.height,
    autoAdjust: false,
  });
  const r = trigger.getBoundingClientRect();
  let left = r.left + p.x;
  let top = r.top + p.y;
  const reach = p.alignment === 'start' ? -alignOffset : p.alignment === 'end' ? alignOffset : 0;
  if (p.placement === 'top' || p.placement === 'bottom') left += reach;
  else top += reach;
  const clamp = (v: number, size: number, room: number) =>
    Math.max(viewportMargin, Math.min(v, room - viewportMargin - size));
  return {
    left: clamp(left, size.width, window.innerWidth),
    top: clamp(top, size.height, window.innerHeight),
    placement: p.placement,
    alignment: p.alignment,
  };
}

export interface PopoverTriggerProps {
  /** A callback ref, so it fits any element's ref. */
  ref: (el: HTMLElement | null) => void;
  onClick: () => void;
  'aria-haspopup': 'dialog' | 'menu' | 'listbox';
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
}

export interface PopoverProps extends AnchorOptions {
  /** The trigger, given the props it needs (spread them onto a button). */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** The panel's content, or a function given `close`. */
  children: ReactNode | ((close: () => void) => ReactNode);
  /** The panel's accessible name. */
  label: string;
  /** Controlled: whether it's open. Leave out for uncontrolled. */
  open?: boolean;
  /** Uncontrolled: open at first. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The panel's role (Menu passes "menu"). */
  role?: 'dialog' | 'menu' | 'listbox';
  /** What gets focus as it opens; by default the first control inside, else the panel. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Portalled to the body, above dialogs (the default), or rendered beside the trigger. */
  portal?: boolean;
  /** Classes for the panel's content box: padding, width. Default padding 0.75rem, width to fit. */
  className?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}

type Box = { left: number; top: number; width: number; height: number };
const boxOf = (el: HTMLElement | null): Box => {
  const r = el?.getBoundingClientRect();
  return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : { left: 0, top: 0, width: 0, height: 0 };
};

export function Popover({
  trigger,
  children,
  label,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  role = 'dialog',
  initialFocus,
  portal = true,
  className,
  placement = 'bottom',
  align = 'start',
  sideOffset = 6,
  alignOffset = 0,
  viewportMargin = 8,
  ...data
}: PopoverProps) {
  const reduce = useReducedMotion();
  const [own, setOwn] = useState(defaultOpen);
  const open = openProp ?? own;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwn(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );
  const close = useCallback(() => setOpen(false), [setOpen]);

  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // where it is: the trigger's box (the closed shape) and the panel's (the open one), measured as it opens and kept
  // while the page scrolls or resizes
  const [geo, setGeo] = useState<{ from: Box; to: Box; placement: PopupPlacement; alignment: PopupAlignment }>();
  const place = useCallback(() => {
    const t = triggerRef.current;
    const p = panelRef.current;
    if (!t || !p) return;
    const size = { width: p.offsetWidth, height: p.offsetHeight };
    const a = anchorPopup(t, size, { placement, align, sideOffset, alignOffset, viewportMargin });
    setGeo({ from: boxOf(t), to: { left: a.left, top: a.top, ...size }, placement: a.placement, alignment: a.alignment });
  }, [placement, align, sideOffset, alignOffset, viewportMargin]);
  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => place());
    if (panelRef.current) ro?.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      ro?.disconnect();
    };
  }, [open, place]);

  useDialogFocus(open, panelRef, close, () => triggerRef.current);
  // after useDialogFocus has put focus on the panel: on to what should have it
  useEffect(() => {
    if (!open) return;
    const p = panelRef.current;
    if (!p) return;
    (initialFocus?.current ?? focusables(p)[0])?.focus({ preventScroll: true });
  }, [open, initialFocus]);

  // a press outside the trigger and the panel closes it (the trigger toggles it itself)
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const at = e.target as Node;
      if (!triggerRef.current?.contains(at) && !panelRef.current?.contains(at)) close();
    };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open, close]);

  // Tab past the last control, or Shift+Tab before the first, leaves it: closed, focus back on the trigger
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const p = panelRef.current;
    if (!p) return;
    const all = focusables(p);
    const at = document.activeElement;
    const leaving = !all.length || (e.shiftKey ? at === all[0] || at === p : at === all[all.length - 1]);
    if (!leaving) return;
    e.preventDefault();
    e.stopPropagation();
    close();
  };

  // before the first measure, the panel's own box sits on the trigger (unseen: opacity 0)
  const from = geo?.from ?? boxOf(triggerRef.current);
  const to = geo?.to ?? from;
  const shut = reduce ? to : from;
  const side = geo?.placement ?? placement;
  const alignment = geo?.alignment ?? align;
  const vertical = side === 'top' || side === 'bottom';
  // the content keeps to the edge the surface grows from, so the collapsing shape clips it rather than moving it
  const anchor: CSSProperties = {
    [(vertical ? alignment === 'end' : side === 'left') ? 'right' : 'left']: 0,
    [(vertical ? side === 'top' : alignment === 'end') ? 'bottom' : 'top']: 0,
    maxWidth: `calc(100vw - ${viewportMargin * 2}px)`,
  };
  const nudge = side === 'top' ? { y: 4 } : side === 'bottom' ? { y: -4 } : side === 'left' ? { x: 4 } : { x: -4 };

  const surface = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="surface"
          data-popover=""
          data-placement={side}
          className="pointer-events-auto fixed overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] shadow-[var(--elevation-3),inset_0_0_0_1px_var(--color-border-subtle)]"
          style={{ zIndex: portal ? 60 : 0 }}
          initial={{ ...shut, opacity: 0 }}
          animate={{
            ...to,
            opacity: 1,
            transition: reduce
              ? recipe.quick
              : { default: geo ? recipe.morph : instant, opacity: recipe.contentOut },
          }}
          exit={{
            ...(geo && !reduce ? geo.from : to),
            opacity: 0,
            transition: reduce
              ? recipe.quick
              : { default: recipe.collapse, opacity: { ...recipe.quick, delay: s(duration.contentOut) } },
          }}
        >
          <motion.div
            ref={panelRef}
            id={id}
            role={role}
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className={cn('absolute w-max p-3 outline-none', className)}
            style={anchor}
            initial={reduce ? false : { opacity: 0, ...nudge }}
            animate={{ opacity: 1, x: 0, y: 0, transition: reduce ? instant : { ...recipe.contentIn, delay: s(duration.contentOut) } }}
            exit={{ opacity: 0, transition: reduce ? instant : recipe.contentOut }}
            {...data}
          >
            {typeof children === 'function' ? children(close) : children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const setTrigger = useCallback((el: HTMLElement | null) => { triggerRef.current = el; }, []);
  const triggerNode = trigger({
    ref: setTrigger,
    onClick: () => setOpen(!open),
    'aria-haspopup': role,
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
  });

  if (portal) {
    return (
      <>
        {triggerNode}
        {typeof document !== 'undefined' && createPortal(surface, document.body)}
      </>
    );
  }
  // beside the trigger: the trigger over the surface, the pair over the page
  return (
    <span className="relative inline-flex" style={{ zIndex: open ? 40 : undefined }}>
      <span className="relative z-[1] inline-flex">{triggerNode}</span>
      {surface}
    </span>
  );
}

export default Popover;
