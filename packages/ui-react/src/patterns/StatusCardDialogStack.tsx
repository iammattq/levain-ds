'use client';

/**
 * StatusCardDialogStack: StatusCardDialogs open as a pile, one in front and the rest behind it (a look over the decide
 * it's for). The dialogs come front first; an empty list is closed.
 *
 * The stack owns what a single dialog owns on its own: the one overlay, focus, Escape and aria-modal. Only the front is
 * a modal dialog and takes focus; Escape, a click outside it and its ✕ ask to close the front (`onClose(frontId)`) and
 * nothing else. The ones behind are inert and hidden from assistive technology, drawn as the board's pile: each step
 * back sits PILE.y px lower and PILE.scale smaller, as tall as the front, its words hidden, up to PILE.depth shown.
 *
 * Motion: the front shares its card's layoutId as StatusCardDialog does, so it grows out of the card (recipe.morph) and,
 * when the last one closes, collapses back into it. A front removed while others remain goes away (lifts on
 * recipe.travel, ease.away, and fades) and the next comes forward on recipe.morph; one added at the front comes back
 * from away. Under Reduce Motion each of those is a cross-fade: nothing moves, the opacity still changes.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motion as motionFor, recipe } from '@levain/tokens';
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { contentIn, DIALOG_BODY, DIALOG_PANEL, DialogHead, morphId, useRadius, type StatusCardDialogProps } from './StatusCard';

/** One dialog in the stack: a StatusCardDialog's props, less its open and onClose (the stack's). */
export type StatusCardStackDialog = Omit<StatusCardDialogProps, 'open' | 'onClose'>;

export interface StatusCardDialogStackProps {
  /** The dialogs, front first. Empty: the stack is closed. */
  dialogs: StatusCardStackDialog[];
  /** The front dialog asks to close (Escape, a click outside it, its ✕), with its id. Removing it is the caller's. */
  onClose: (id: string) => void;
}

/**
 * The board's pile (Ringmaster's CardStack): each card behind sits 10 px lower and 5 % smaller, three at most. The
 * board scales from the top edge, which leaves its ~96 px cards an edge of about 5 px; a dialog is several times as
 * tall, so a scale from the top would hide its edge entirely. Scaling from the bottom edge keeps the step's full 10 px
 * showing below the front at any height.
 */
export const PILE = { y: 10, scale: 0.05, depth: 3, origin: '50% 100%' } as const;
/** How far a dialog going away lifts as it fades, in px. */
export const AWAY_LIFT = 24;

/** Where the dialog `d` steps back from the front sits. */
export const pose = (d: number) => {
  const k = Math.min(d, PILE.depth);
  return { y: k * PILE.y, scale: 1 - k * PILE.scale, opacity: d > PILE.depth ? 0 : 1 };
};

/** Away: lifted and faded. Under Reduce Motion only the fade. */
export const away = (reduce: boolean | null | undefined) =>
  reduce ? { opacity: 0, transition: recipe.travel } : { y: -AWAY_LIFT, opacity: 0, transition: recipe.travel };

/** The transition to a pile position: the move on recipe.morph (instant under Reduce Motion), the opacity a fade. */
const toPose = (reduce: boolean | null | undefined) => ({ ...motionFor('morph', reduce), opacity: recipe.fadeIn });

export function StatusCardDialogStack({ dialogs, onClose }: StatusCardDialogStackProps) {
  const reduce = useReducedMotion();
  const open = dialogs.length > 0;
  const frontId = dialogs[0]?.id;
  // the overlay outlives the last dialog while its exit plays
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (!open) setLeaving(true); }
  // whether the stack was already open when a dialog arrived: one arriving at the front then comes back from away,
  // rather than growing out of its card
  const settled = useRef(false);
  useEffect(() => { settled.current = open; });

  // The latest onClose and front, read through refs: a consumer passing a fresh inline onClose on every render must not
  // re-run the focus effect, or focus would jump back to the panel mid-typing (D258).
  const onCloseRef = useRef(onClose);
  const frontRef = useRef(frontId);
  useLayoutEffect(() => { onCloseRef.current = onClose; frontRef.current = frontId; });
  const closeFront = () => { if (frontRef.current !== undefined) onCloseRef.current(frontRef.current); };

  const panels = useRef(new Map<string, HTMLDivElement>());
  // what had focus before the stack opened, read before the front's panel takes it (layout effects run first)
  const before = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => { if (open) before.current = document.activeElement as HTMLElement | null; }, [open]);
  useEffect(() => {
    if (frontId === undefined) return;
    panels.current.get(frontId)?.focus();
  }, [frontId]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') closeFront(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); before.current?.focus?.(); };
  }, [open]);

  if (typeof document === 'undefined' || (!open && !leaving)) return null;
  const width = dialogs[0]?.width ?? '40rem';
  const behind = Math.max(0, Math.min(dialogs.length - 1, PILE.depth));
  return createPortal(
    // No dimmed page: the front grows out of its card, and a click outside it closes it. While the last one leaves,
    // the overlay lets clicks through.
    <div
      className={'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-sm md:items-center md:p-lg' + (open ? '' : ' pointer-events-none')}
      onClick={open ? closeFront : undefined}
      data-dialog-stack
    >
      {/* One grid cell holds every panel, and the cell isn't positioned: a front leaving is popped out of flow against the
          overlay, which doesn't move, so it lifts from where it was while the cell shrinks and re-centres on the next */}
      <div className="grid w-full" style={{ maxWidth: width, marginBottom: behind * PILE.y }}>
        <AnimatePresence mode="popLayout" custom={!open} onExitComplete={() => setLeaving(false)}>
          {dialogs.map((dialog, d) => (
            <Panel key={dialog.id} dialog={dialog} depth={d} count={dialogs.length} arriving={settled.current} reduce={reduce} onClose={closeFront}
              panelRef={el => { if (el) panels.current.set(dialog.id, el); else panels.current.delete(dialog.id); }} />
          ))}
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
}

interface PanelProps {
  dialog: StatusCardStackDialog; depth: number; count: number; arriving: boolean; reduce: boolean | null; onClose: () => void;
  panelRef: (el: HTMLDivElement | null) => void;
}

// forwardRef: AnimatePresence's popLayout measures its direct child through this ref to take a leaving front out of
// flow, so the next one can take its place while it goes away (without it, the next waits below until the exit ends)
const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel({ dialog, depth, count, arriving, reduce, onClose, panelRef }, forwarded) {
  const { id, number, kind, title, markers, children } = dialog;
  const radius = useRadius('--radius-2xl');
  const front = depth === 0;
  // how it first appears: the front of a stack just opened grows out of its card (its layoutId, no initial pose); one
  // put in front of an open stack comes back from away; one put behind fades in at its place in the pile
  const [initial] = useState(() => (!arriving && front ? false : front ? { y: reduce ? 0 : -AWAY_LIFT, opacity: 0 } : { ...pose(depth), opacity: 0 }));
  const el = useRef<HTMLDivElement | null>(null);
  const ref = (node: HTMLDivElement | null) => {
    el.current = node;
    panelRef(node);
    if (typeof forwarded === 'function') forwarded(node); else if (forwarded) forwarded.current = node;
  };
  // behind: inert, so nothing in it takes focus or a click (set on the node: React 18 has no boolean `inert` prop).
  // A layout effect, so it's lifted before the stack's effect focuses a new front.
  useLayoutEffect(() => { el.current?.toggleAttribute('inert', !front); }, [front]);
  return (
    <motion.div
      ref={ref}
      layoutId={morphId(id)}
      layout
      initial={initial}
      animate={{ ...pose(depth), transition: toPose(reduce) }}
      // the last one leaving collapses into its card (its layoutId, as a single dialog does); one leaving the front of a
      // stack that stays open goes away; one leaving from behind fades where it is
      variants={{ leave: (closing: boolean) => (closing ? {} : front ? away(reduce) : { opacity: 0, transition: recipe.contentOut }) }}
      exit="leave"
      transition={motionFor('morph', reduce)}
      style={{ borderRadius: radius, transformOrigin: PILE.origin, zIndex: count - depth }}
      role={front ? 'dialog' : undefined}
      aria-modal={front ? 'true' : undefined}
      aria-hidden={front ? undefined : true}
      aria-label={front && typeof title === 'string' ? title : undefined}
      tabIndex={front ? -1 : undefined}
      data-stack-depth={depth}
      onClick={front ? (e: MouseEvent) => e.stopPropagation() : undefined}
      // the front sizes the cell; the ones behind fill it without sizing it (contain: size), so they take the front's box,
      // their words hidden, as the board's pile does
      className={'[grid-area:1/1] ' + (front ? '' : '[contain:size] ') + DIALOG_PANEL}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: front ? 1 : 0, transition: front ? contentIn(reduce) : recipe.contentOut }}
        exit={{ opacity: 0, transition: recipe.contentOut }}
        className={DIALOG_BODY}
      >
        <DialogHead number={number} kind={kind} title={title} markers={markers} onClose={onClose} />
        {children}
      </motion.div>
    </motion.div>
  );
});
