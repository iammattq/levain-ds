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
 *
 * Below `md` the stack is a pile of bottom sheets (Sheet.tsx): it rises from the bottom edge over a scrim, the front
 * one scrolls inside, and the ones behind peek above its top edge (phonePose). Next/Back, Escape, a tap outside and the ✕ work as
 * above. Swiping the front sheet down by its handle closes the whole stack: onClose for every dialog, front first.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { duration, instant, motion as motionFor, recipe } from '@levain/tokens';
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { contentIn, DIALOG_BODY, DIALOG_PANEL, DialogHead, morphId, useRadius, type StatusCardDialogProps } from './StatusCard';
import { SheetPanel, SheetScrim, useIsPhone } from './Sheet';
import { opener, useDialogFocus } from '../utils/useDialogFocus';

/** One dialog in the stack: a StatusCardDialog's props, less its open and onClose (the stack's). */
export type StatusCardStackDialog = Omit<StatusCardDialogProps, 'open' | 'onClose'>;

export interface StatusCardDialogStackProps {
  /** The dialogs, front first. Empty: the stack is closed. */
  dialogs: StatusCardStackDialog[];
  /** The front dialog asks to close (Escape, a click outside it, its ✕), with its id. Removing it is the caller's. */
  onClose: (id: string) => void;
  /**
   * The one card the stack stands for on the board (a look-and-decide pair is one card), when it isn't the front's own:
   * the dialog in front when the stack opens grows out of this card, and the one that closes last collapses back into
   * it, whichever dialogs those are. Without it each dialog morphs only to a card with its own id.
   */
  cardId?: string;
}

/**
 * The board's pile (Ringmaster's CardStack): each card behind sits 10 px lower and 5 % smaller, three at most. The
 * board scales from the top edge, which leaves its ~96 px cards an edge of about 5 px; a dialog is several times as
 * tall, so a scale from the top would hide its edge entirely. Scaling from the bottom edge keeps the step's full 10 px
 * showing below the front at any height.
 */
export const PILE = { y: 10, scale: 0.05, depth: 3, origin: '50% 100%' } as const;
/**
 * PILE.origin as framer's own origin values (0 to 1). Framer's layout projection writes transform-origin itself from
 * originX/originY, centre by default, so a CSS transformOrigin is lost once a panel has had a layout animation (a
 * morph, a step forward and back, a resize) and the step lands behind the front (T23). Given as motion style values,
 * the origin survives projection.
 */
export const PILE_ORIGIN = { originX: 0.5, originY: 1 } as const;
/**
 * A panel behind the front, in light mode, keeps the board's hairline (its light cards' `--rm-edge`: an inset 1 px of
 * --color-border-subtle) under the elevation shadow: white on near-white, the shadow alone barely shows the step. Dark,
 * as on the board, the shadow alone. The front keeps StatusCardDialog's surface exactly.
 */
export const BEHIND_EDGE = 'shadow-[inset_0_0_0_1px_var(--color-border-subtle),var(--elevation-3)] dark:shadow-[var(--elevation-3)]';
const BEHIND_PANEL = DIALOG_PANEL.replace('shadow-[var(--elevation-3)]', BEHIND_EDGE);

/**
 * With a cardId, a panel's surface (its background, shadow and corners) is a layer of its own under the content, and
 * the layer is what grows out of the card and collapses into it. Framer fixes an element's layoutId when it mounts, so
 * the card's layoutId moves from one dialog to the next by remounting only that empty layer (in a frame where no
 * other layer holds it), never the panel, its content or focus. Nothing that moves clips the content, so with
 * CONTENT_AFTER_SURFACE the content fades in once the surface is full size (CONTENT_DELAY) and leaves at once on the last close;
 * false keeps the single dialog's timing (content in 90 ms into the morph, out over the collapse).
 */
// Q28 (the designer, 2026-11-23): today's timing, the words fading in while the box grows, as the single dialog does.
export const CONTENT_AFTER_SURFACE = false;
/**
 * With CONTENT_AFTER_SURFACE, when the content starts: so it is fully in as the morph ends. The morph's spring ease has
 * the surface at full size (overshooting) by then, so the fading content never sits outside it; waiting for the whole
 * morph first put the words in at ~690 ms, against ~310 ms for a single dialog.
 */
export const CONTENT_DELAY = (duration.morph - duration.contentIn) / 1000;
const SURFACE = 'pointer-events-none absolute inset-0 bg-[var(--color-surface-elevated)] ';

/** How far a dialog going away lifts as it fades, in px. */
export const AWAY_LIFT = 24;

/** Where the dialog `d` steps back from the front sits. */
export const pose = (d: number) => {
  const k = Math.min(d, PILE.depth);
  return { y: k * PILE.y, scale: 1 - k * PILE.scale, opacity: d > PILE.depth ? 0 : 1 };
};

/**
 * The pile on a phone, where the sheet is docked to the bottom edge and has no room below it (Q41, the designer: A):
 * each step back peeks PILE.y px above the front's top edge and PILE.scale narrower, scaled from its top edge, three at
 * most. The desktop keeps the peek below (Q11).
 */
export const phonePose = (d: number) => {
  const k = Math.min(d, PILE.depth);
  return { y: k === 0 ? 0 : -k * PILE.y, scale: 1 - k * PILE.scale, opacity: d > PILE.depth ? 0 : 1 };
};
/** The phone pile scales from the top edge (as framer origin values, for the reason PILE_ORIGIN gives). */
export const PHONE_ORIGIN = { originX: 0.5, originY: 0 } as const;

/** Away: lifted and faded. Under Reduce Motion only the fade. */
export const away = (reduce: boolean | null | undefined) =>
  reduce ? { opacity: 0, transition: recipe.travel } : { y: -AWAY_LIFT, opacity: 0, transition: recipe.travel };

/** The transition to a pile position: the move on recipe.morph (instant under Reduce Motion), the opacity a fade. */
const toPose = (reduce: boolean | null | undefined) => ({ ...motionFor('morph', reduce), opacity: recipe.fadeIn });

export function StatusCardDialogStack({ dialogs, onClose, cardId: givenCardId }: StatusCardDialogStackProps) {
  const reduce = useReducedMotion();
  const phone = useIsPhone();
  // on a phone the sheets rise from the bottom edge, never out of a card
  const cardId = phone ? undefined : givenCardId;
  const open = dialogs.length > 0;
  const frontId = dialogs[0]?.id;
  // the overlay outlives the last dialog while its exit plays
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  // With a cardId: the dialog whose surface holds the card's layoutId. The front when the stack opens (set in this
  // render, so its surface mounts with it); later always the front, handed over in two steps (below).
  // Without a cardId none of this runs: a state change in the stack while the last one leaves changes when it goes.
  const [holder, setHolder] = useState<string | undefined>(open && cardId !== undefined ? frontId : undefined);
  if (open !== wasOpen) { setWasOpen(open); if (!open) setLeaving(true); else if (cardId !== undefined) setHolder(frontId); }
  const holderPresent = holder !== undefined && dialogs.some(d => d.id === holder);
  // The handover, one layer holding the layoutId at a time, so framer never morphs one surface from another: a holder
  // still in the stack (now behind) gives the layoutId up, and the front takes it in the next commit; a holder that
  // left is still going away, and gives it up when its exit ends (onExitComplete).
  useEffect(() => {
    if (cardId === undefined || !open || holder === frontId) return;
    if (holder === undefined) setHolder(frontId);
    else if (holderPresent) setHolder(undefined);
  }, [cardId, open, holder, frontId, holderPresent]);
  // whether the stack was already open when a dialog arrived: one arriving at the front then comes back from away,
  // rather than growing out of its card
  const settled = useRef(false);
  useEffect(() => { settled.current = open; });

  // The latest onClose and front, read through refs: a consumer passing a fresh inline onClose on every render must not
  // re-run the focus effect, or focus would jump back to the panel mid-typing (D258).
  const onCloseRef = useRef(onClose);
  const frontRef = useRef(frontId);
  // the last front, kept after the stack closes: focus goes back to its card (or the stack's) if that was the opener
  const lastFront = useRef(frontId);
  useLayoutEffect(() => { onCloseRef.current = onClose; frontRef.current = frontId; if (frontId !== undefined) lastFront.current = frontId; });
  const closeFront = () => { if (frontRef.current !== undefined) onCloseRef.current(frontRef.current); };
  const idsRef = useRef<string[]>([]);
  useLayoutEffect(() => { idsRef.current = dialogs.map(d => d.id); });
  const closeAll = () => { for (const id of idsRef.current) onCloseRef.current(id); };

  const panels = useRef(new Map<string, HTMLDivElement>());
  // the shared dialog behaviour, held by the front panel: focus moved in, kept in (Tab wraps; the ones behind are
  // inert) and given back to what had it before the stack opened; Escape closes the front when the stack is on top
  useDialogFocus(open, () => (frontRef.current === undefined ? null : panels.current.get(frontRef.current)), closeFront,
    () => { const c = cardId ?? lastFront.current; return c === undefined ? null : opener(morphId(c)); });
  // a new front takes focus as it comes forward
  useEffect(() => {
    if (frontId === undefined) return;
    panels.current.get(frontId)?.focus();
  }, [frontId]);

  if (typeof document === 'undefined' || (!open && !leaving)) return null;
  const width = dialogs[0]?.width ?? '40rem';
  const behind = Math.max(0, Math.min(dialogs.length - 1, PILE.depth));
  const panelRef = (id: string) => (el: HTMLDivElement | null) => { if (el) panels.current.set(id, el); else panels.current.delete(id); };
  if (phone) return createPortal(
    <div
      className={'fixed inset-0 z-50' + (open ? '' : ' pointer-events-none')}
      onClick={open ? closeFront : undefined}
      data-dialog-stack
      data-sheet-overlay
    >
      <AnimatePresence>{open && <SheetScrim key="scrim" reduce={reduce} />}</AnimatePresence>
      {/* one grid cell, docked to the bottom edge: the front sizes it and the ones behind fill it, as on the desktop */}
      <div className="absolute inset-x-0 bottom-0 grid">
        <AnimatePresence mode="popLayout" custom={!open} onExitComplete={() => setLeaving(false)}>
          {dialogs.map((dialog, d) => (
            <StackSheet key={dialog.id} dialog={dialog} depth={d} count={dialogs.length} arriving={settled.current} reduce={reduce}
              onClose={closeFront} onDragClose={closeAll} panelRef={panelRef(dialog.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>,
    document.body,
  );
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
        <AnimatePresence mode="popLayout" custom={!open} onExitComplete={() => { setLeaving(false); if (cardId !== undefined && open && !holderPresent) setHolder(undefined); }}>
          {dialogs.map((dialog, d) => (
            <Panel key={dialog.id} dialog={dialog} depth={d} count={dialogs.length} arriving={settled.current} reduce={reduce} onClose={closeFront}
              cardId={cardId} holds={cardId !== undefined && holder === dialog.id}
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
  /** The stack's cardId; with one the panel draws its surface as a layer (SurfacePanel). */
  cardId?: string;
  /** This panel's surface holds the card's layoutId. */
  holds?: boolean;
  panelRef: (el: HTMLDivElement | null) => void;
}

// forwardRef: AnimatePresence's popLayout measures its direct child through this ref to take a leaving front out of
// flow, so the next one can take its place while it goes away (without it, the next waits below until the exit ends)
const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel({ dialog, depth, count, arriving, reduce, onClose, cardId, holds = false, panelRef }, forwarded) {
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
  // grows out of the card when it opens: its content waits for the surface to land
  const [grows] = useState(() => initial === false && holds);
  if (cardId !== undefined) {
    const after = CONTENT_AFTER_SURFACE && grows && !reduce;
    return (
      <motion.div
        ref={ref}
        layout
        initial={initial}
        animate={{ ...pose(depth), transition: toPose(reduce) }}
        // the last one leaving: its surface collapses into the card and the panel waits for it; without the card's
        // layoutId (the handover not done yet) it fades where it is
        variants={{ leave: (closing: boolean) => (closing ? (holds ? {} : { opacity: 0, transition: recipe.contentOut }) : front ? away(reduce) : { opacity: 0, transition: recipe.contentOut }) }}
        exit="leave"
        transition={motionFor('morph', reduce)}
        style={{ ...PILE_ORIGIN, zIndex: count - depth }}
        role={front ? 'dialog' : undefined}
        aria-modal={front ? 'true' : undefined}
        aria-hidden={front ? undefined : true}
        aria-label={front && typeof title === 'string' ? title : undefined}
        tabIndex={front ? -1 : undefined}
        data-stack-depth={depth}
        onClick={front ? (e: MouseEvent) => e.stopPropagation() : undefined}
        className={'relative w-full outline-none [grid-area:1/1]' + (front ? '' : ' [contain:size]')}
      >
        {/* the surface: carries the pile pose with the panel; remounted (its key) only to take or give up the card's
            layoutId, which costs nothing: it has no children */}
        <motion.div
          key={holds ? 'card' : 'own'}
          layoutId={holds ? morphId(cardId) : morphId(id)}
          transition={motionFor('morph', reduce)}
          style={{ borderRadius: radius }}
          aria-hidden
          data-stack-surface={holds ? 'card' : 'own'}
          className={SURFACE + (front ? 'shadow-[var(--elevation-3)]' : BEHIND_EDGE)}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: front ? 1 : 0, transition: front ? (after ? { ...motionFor('contentIn', reduce), delay: CONTENT_DELAY } : contentIn(reduce)) : recipe.contentOut }}
          variants={{ leave: (closing: boolean) => ({ opacity: 0, transition: closing && CONTENT_AFTER_SURFACE && holds ? instant : recipe.contentOut }) }}
          exit="leave"
          className={'relative ' + DIALOG_BODY}
        >
          <DialogHead number={number} kind={kind} title={title} markers={markers} onClose={onClose} />
          {children}
        </motion.div>
      </motion.div>
    );
  }
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
      style={{ borderRadius: radius, ...PILE_ORIGIN, zIndex: count - depth }}
      role={front ? 'dialog' : undefined}
      aria-modal={front ? 'true' : undefined}
      aria-hidden={front ? undefined : true}
      aria-label={front && typeof title === 'string' ? title : undefined}
      tabIndex={front ? -1 : undefined}
      data-stack-depth={depth}
      onClick={front ? (e: MouseEvent) => e.stopPropagation() : undefined}
      // the front sizes the cell; the ones behind fill it without sizing it (contain: size), so they take the front's box,
      // their words hidden, as the board's pile does
      className={'[grid-area:1/1] ' + (front ? DIALOG_PANEL : '[contain:size] ' + BEHIND_PANEL)}
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

interface StackSheetProps {
  dialog: StatusCardStackDialog; depth: number; count: number; arriving: boolean; reduce: boolean | null;
  onClose: () => void; onDragClose: () => void; panelRef: (el: HTMLDivElement | null) => void;
}

/**
 * One dialog of the stack on a phone: a sheet in the pile. When the stack opens they all rise together (recipe.sheetIn)
 * to their places; later moves are the desktop's (a front going away, the next coming forward on recipe.morph); when
 * the stack closes they all drop away (recipe.sheetOut). Under Reduce Motion each is a fade.
 */
const StackSheet = forwardRef<HTMLDivElement, StackSheetProps>(function StackSheet({ dialog, depth, count, arriving, reduce, onClose, onDragClose, panelRef }, forwarded) {
  const { number, kind, title, markers, children } = dialog;
  const front = depth === 0;
  const [initial] = useState(() =>
    !arriving ? { ...phonePose(depth), ...(reduce ? { opacity: 0 } : { y: '100%' }) }
      : front ? { y: reduce ? 0 : -AWAY_LIFT, opacity: 0 } : { ...phonePose(depth), opacity: 0 });
  // rising with the stack: its first move is the sheet's; after that, the pile's
  const [rising, setRising] = useState(!arriving);
  const el = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => { el.current?.toggleAttribute('inert', !front); }, [front]);
  const transition = rising ? { ...motionFor('sheetIn', reduce), opacity: recipe.fadeIn } : toPose(reduce);
  return (
    <SheetPanel
      ref={forwarded}
      panelRef={node => { el.current = node; panelRef(node); }}
      front={front}
      reduce={reduce}
      label={typeof title === 'string' ? title : undefined}
      onDragClose={onDragClose}
      motionProps={{
        initial,
        animate: { ...phonePose(depth), transition },
        variants: {
          leave: (closing: boolean) => (closing
            ? (reduce ? { opacity: 0, transition: recipe.contentOut } : { y: '100%', transition: recipe.sheetOut })
            : front ? away(reduce) : { opacity: 0, transition: recipe.contentOut }),
        },
        exit: 'leave',
      }}
      onAnimationComplete={() => { if (rising) setRising(false); }}
      style={{ ...PHONE_ORIGIN, zIndex: count - depth }}
      place={'relative [grid-area:1/1]' + (front ? '' : ' [contain:size]')}
      surface={'bg-[var(--color-surface-elevated)] ' + (front ? 'shadow-[var(--elevation-3)]' : BEHIND_EDGE)}
      data-stack-depth={depth}
      head={<DialogHead number={number} kind={kind} title={title} markers={markers} onClose={onClose} />}
    >
      {children}
    </SheetPanel>
  );
});
