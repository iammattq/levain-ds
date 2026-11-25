'use client';

/**
 * Tooltip (T42): a short, non-interactive hint for one control, the board's two tooltips (the stage strip's and Restart
 * PM's) as one levain piece. Not a Popover: focus never moves, there's no dismiss layer, and the trigger is described
 * by it (`aria-describedby`), not expanded. It reuses Popover's `anchorPopup` for placement and its portal layer (z 60).
 *
 * Opens after `delay` (300 ms) of a mouse's hover, and at once on keyboard focus (`:focus-visible`: a click's focus
 * doesn't open it). Closes on the mouse leaving, blur, and Escape (claimed, so a dialog around it stays open).
 * A press on the trigger closes it: the trigger has its own action (Restart PM), and touch shows nothing.
 * With `toggle` the trigger is there for its tooltip (the stage strip): a tap or a key press toggles it, a mouse click
 * shows it at once, and a press anywhere outside the trigger and the tooltip closes it.
 *
 * Placed below the trigger and lined up with its start edge by default, `sideOffset` (6 px) away, flipped when there's
 * no room, kept `viewportMargin` (8 px) inside the window, and kept in place while the page scrolls or resizes.
 * It fades in with a 4 px rise from the trigger's side (recipe.quick) and fades out (recipe.contentOut); Reduce Motion:
 * the fade only.
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  version,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { recipe } from '@levain/tokens';
import { cn } from '../utils/cn';
import { anchorPopup, type AnchorOptions, type Anchored } from './Popover';

type TriggerProps = {
  ref?: Ref<HTMLElement>;
  'aria-describedby'?: string;
  onPointerEnter?: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerDown?: (e: ReactPointerEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
};

export interface TooltipProps extends Omit<AnchorOptions, 'alignOffset'> {
  /** What it says: a line, or a few rows. Nothing interactive (that's a Popover). Empty turns it off. */
  content: ReactNode;
  /** The trigger: one focusable element. Its ref and handlers are kept. */
  children: ReactElement;
  /** The trigger is there for its tooltip: a tap or a key press toggles it, a press outside closes it. */
  toggle?: boolean;
  /** How long a mouse rests on the trigger before it opens, ms. */
  delay?: number;
  /** Classes for the tooltip's box. */
  className?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}

const setRef = <T,>(ref: Ref<T> | undefined, el: T | null) => {
  if (typeof ref === 'function') ref(el);
  else if (ref) (ref as { current: T | null }).current = el;
};

export function Tooltip({
  content,
  children,
  toggle = false,
  delay = 300,
  className,
  placement = 'bottom',
  align = 'start',
  sideOffset = 6,
  viewportMargin = 8,
  ...data
}: TooltipProps) {
  const reduce = useReducedMotion();
  const on = content !== '' && content !== null && content !== undefined && content !== false;
  const [open, setOpen] = useState(false);
  const shown = open && on;
  const [pos, setPos] = useState<Anchored>();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pointer = useRef('');
  const id = useId();

  const wait = () => clearTimeout(timer.current);
  const show = useCallback(() => { wait(); setOpen(true); }, []);
  const hide = useCallback(() => { wait(); setOpen(false); }, []);
  useEffect(() => wait, []);
  useEffect(() => { if (!on) hide(); }, [on, hide]);

  // measured as it opens (unseen until then), kept in place through a scroll or a resize
  const place = useCallback(() => {
    const t = triggerRef.current, tip = tipRef.current;
    if (t && tip) setPos(anchorPopup(t, { width: tip.offsetWidth, height: tip.offsetHeight }, { placement, align, sideOffset, viewportMargin }));
  }, [placement, align, sideOffset, viewportMargin]);
  useLayoutEffect(() => {
    if (!shown) { setPos(undefined); return; }
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [shown, place]);

  // Escape anywhere closes it, claimed (capture, before a dialog's own listener); with toggle, a press outside too
  useEffect(() => {
    if (!shown) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(); } };
    const down = (e: PointerEvent) => {
      const at = e.target as Node;
      if (!triggerRef.current?.contains(at) && !tipRef.current?.contains(at)) hide();
    };
    document.addEventListener('keydown', key, true);
    if (toggle) document.addEventListener('pointerdown', down, true);
    return () => { document.removeEventListener('keydown', key, true); document.removeEventListener('pointerdown', down, true); };
  }, [shown, toggle, hide]);

  if (!isValidElement<TriggerProps>(children)) return children;
  const own = children.props;
  // React 19 keeps the ref in props; 18 on the element
  const childRef = (version.startsWith('18') ? (children as unknown as { ref?: Ref<HTMLElement> }).ref : own.ref) as Ref<HTMLElement> | undefined;
  const describedBy = [own['aria-describedby'], shown ? id : undefined].filter(Boolean).join(' ') || undefined;

  const trigger = cloneElement(children, {
    ref: (el: HTMLElement | null) => { triggerRef.current = el; setRef(childRef, el); },
    'aria-describedby': describedBy,
    onPointerEnter: e => {
      own.onPointerEnter?.(e);
      if (on && e.pointerType === 'mouse') { wait(); timer.current = setTimeout(show, delay); }
    },
    onPointerLeave: e => {
      own.onPointerLeave?.(e);
      if (e.pointerType === 'mouse') hide();
    },
    onPointerDown: e => {
      own.onPointerDown?.(e);
      pointer.current = e.pointerType;
      if (!toggle) hide();
    },
    onFocus: e => {
      own.onFocus?.(e);
      if (on && e.currentTarget.matches(':focus-visible')) show();
    },
    onBlur: e => {
      own.onBlur?.(e);
      hide();
    },
    onClick: e => {
      own.onClick?.(e);
      if (toggle && on) {
        // a tap or a key toggles it; a mouse click shows it now, without the wait
        if (e.detail === 0 || pointer.current === 'touch' || pointer.current === 'pen') setOpen(o => !o);
        else show();
      }
      pointer.current = '';
    },
  } satisfies TriggerProps);

  const nudge = reduce ? {} : pos?.placement === 'top' ? { y: 4 } : pos?.placement === 'left' ? { x: 4 } : pos?.placement === 'right' ? { x: -4 } : { y: -4 };
  const tip = (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="tooltip"
          ref={tipRef}
          id={id}
          role="tooltip"
          data-tooltip=""
          data-placement={pos?.placement}
          className={cn(
            'fixed z-[60] w-max max-w-[min(18rem,calc(100vw-1rem))] rounded-[var(--radius-lg)] bg-[var(--color-surface-component)] px-3 py-[0.625rem] text-left text-[length:var(--type-size-2xs)] leading-[var(--type-leading-normal)] text-[var(--color-text-faint)] shadow-[var(--elevation-3),inset_0_0_0_1px_var(--color-border-subtle)]',
            className
          )}
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? undefined : 'hidden' }}
          // a portal's events still reach the trigger's ancestors through React: a press on it never reaches them
          onClick={(e: MouseEvent) => e.stopPropagation()}
          onPointerDown={(e: ReactPointerEvent) => e.stopPropagation()}
          initial={{ opacity: 0, ...nudge }}
          animate={{ opacity: 1, x: 0, y: 0, transition: recipe.quick }}
          exit={{ opacity: 0, transition: recipe.contentOut }}
          {...data}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' && createPortal(tip, document.body)}
    </>
  );
}

export default Tooltip;
