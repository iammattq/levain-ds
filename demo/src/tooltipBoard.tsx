// A copy of Ringmaster's two tooltips (as of T42, 2026-11-24), for the demo's side-by-side only: the stage strip's
// (board/src/ly1/faces.tsx Strip, its words and placement from stageTip.ts) and Restart PM's (RestartPm.tsx Tip).
// Not exported, not part of levain. Copied verbatim but for the imports and the types (StageOf is inlined); their CSS
// (.strip, .stage-tip and the --rm-* values they read) is board.css's, copied below. The board's body carries .rmb, so
// its portalled tooltip is styled; here the copied rules for the tooltip are unscoped instead.
/* eslint-disable */
import { recipe } from '@levain/tokens';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type Stage = 'queued' | 'briefed' | 'building' | 'review' | 'you' | 'merged';
export type StageOf = { stage: Stage; step?: number; steps?: number; since?: string };

// --- stageTip.ts (the parts Strip uses) ---
export const STAGES: Stage[] = ['queued', 'briefed', 'building', 'review', 'you', 'merged'];
export const STAGE_WORD: Record<Stage, string> = { queued: 'Queued', briefed: 'Briefed', building: 'Building', review: 'Review', you: 'For you', merged: 'Merged' };

/** What each stage means, in one plain line. */
export const STAGE_MEANS: Record<Stage, string> = {
  queued: 'In the queue; no one has it yet',
  briefed: 'Its brief is written; a member starts it next',
  building: 'A member is building it',
  review: 'Done; the PM is reviewing it',
  you: 'Waiting on you: a look or a merge',
  merged: 'Merged; it’s in',
};

/** Building's step in words: "step 2 of 4", "step 2", "none of 3 steps done yet"; '' when nothing is known. */
export function stepWords(s: StageOf): string {
  if (s.stage !== 'building') return '';
  if (s.step) return `step ${s.step}${s.steps ? ` of ${s.steps}` : ''}`;
  return s.steps ? `none of ${s.steps} steps done yet` : '';
}

/** The tooltip's six rows, in order: each stage's words and whether it's done, now, or still to come. */
export function tipRows(s: StageOf): { stage: Stage; text: string; state: 'done' | 'now' | 'later' }[] {
  const at = STAGES.indexOf(s.stage), step = stepWords(s);
  return STAGES.map((x, i) => ({
    stage: x,
    text: STAGE_WORD[x] + (i === at && step ? ` · ${step}` : ''),
    state: i < at ? 'done' : i === at ? 'now' : 'later',
  }));
}

type Box = { left: number; top: number; right: number; bottom: number };
/**
 * Where the tooltip goes, in window pixels: under its strip, lined up with the strip's left edge, `gap` below it; above
 * it when there's no room under it and more above; always `margin` inside the window's sides.
 */
export function placeTip(anchor: Box, tip: { width: number; height: number }, view: { width: number; height: number }, gap = 6, margin = 8) {
  const left = Math.max(margin, Math.min(anchor.left, view.width - margin - tip.width));
  const below = anchor.bottom + gap, above = anchor.top - gap - tip.height;
  const fits = below + tip.height <= view.height - margin;
  const top = fits || (above < margin && view.height - anchor.bottom >= anchor.top) ? below : above;
  return { left, top, side: top === below ? 'below' as const : 'above' as const };
}

// --- faces.tsx ---
/** "Building 2/3", "For you": a stage in words. */
export const stageWord = (s: StageOf) => STAGE_WORD[s.stage] + (s.stage === 'building' && s.step ? ` ${s.step}${s.steps ? '/' + s.steps : ''}` : s.stage === 'building' && s.steps ? ` 0/${s.steps}` : '');
/** The tooltip's hover delay, ms; focus (from the keyboard) and a tap show it at once. */
const TIP_DELAY = 300;
/**
 * A card's stage strip: six pips, one per stage (Queued → Briefed → Building → Review → For you → Merged), those
 * reached drawn in, then the stage in words, in the stage's colour (T52, board.css). `code` labels it when a card
 * carries several. It's a button for its tooltip (the six stages, the current one marked, what it means): after a
 * short hover, at once on keyboard focus or a tap; it closes on leave, blur, a press elsewhere or Escape. A press on it
 * never opens its card or starts a drag. The tooltip lives on the body, fixed, so no card clips it; Reduce Motion fades it only.
 */
export function Strip({ s, code }: { s: StageOf; code?: string }) {
  const reduce = useReducedMotion();
  const at = STAGES.indexOf(s.stage), word = stageWord(s);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; side: 'below' | 'above' }>();
  const button = useRef<HTMLButtonElement>(null), tip = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined), pointer = useRef('');
  const id = useId();
  const wait = () => window.clearTimeout(timer.current);
  const show = () => { wait(); setOpen(true); };
  const hide = () => { wait(); setOpen(false); };
  useEffect(() => wait, []);
  // placed under the strip (above it near the window's foot), kept in place through a scroll or a resize
  useLayoutEffect(() => {
    if (!open) { setPos(undefined); return; }
    const place = () => {
      const a = button.current?.getBoundingClientRect(), t = tip.current;
      if (a && t) setPos(placeTip(a, { width: t.offsetWidth, height: t.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
    };
    place();
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [open]);
  // a press elsewhere, or Escape anywhere, closes it
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!button.current?.contains(e.target as Node) && !tip.current?.contains(e.target as Node)) hide(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); hide(); } };
    document.addEventListener('pointerdown', down, true); document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true); };
  }, [open]);
  const label = `${code ? code + ' ' : ''}stage: ${word} (${STAGES.map(x => STAGE_WORD[x]).join(', ')})`;
  return (
    <>
      <button ref={button} type="button" className="strip" data-stage={s.stage} aria-label={label} aria-describedby={open ? id : undefined}
        // its own press: never the card's tap, never the start of a drag
        onPointerDown={e => { pointer.current = e.pointerType; e.stopPropagation(); }}
        onPointerEnter={e => { if (e.pointerType === 'mouse') { wait(); timer.current = window.setTimeout(show, TIP_DELAY); } }}
        onPointerLeave={e => { if (e.pointerType === 'mouse') hide(); }}
        onFocus={e => { if (e.currentTarget.matches(':focus-visible')) show(); }}
        onBlur={hide}
        onClick={e => {
          e.stopPropagation();
          // a tap or a key toggles it; a mouse click shows it now, without the wait
          if (e.detail === 0 || pointer.current === 'touch' || pointer.current === 'pen') setOpen(o => !o); else show();
          pointer.current = '';
        }}>
        <span className="pips" aria-hidden>{STAGES.map((x, i) => <i key={x} data-on={i < at ? '' : undefined} data-at={i === at ? '' : undefined} />)}</span>
        <span aria-hidden>{code && <span className="code">{code} </span>}<span className="word">{word}</span></span>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div key="tip" ref={tip} id={id} role="tooltip" className="stage-tip" data-stage={s.stage} data-side={pos?.side}
              style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? undefined : 'hidden' }}
              // a portal's events still reach the card through React: a tap on the tooltip never opens it
              onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
              initial={{ opacity: 0, y: reduce ? 0 : pos?.side === 'above' ? 4 : -4 }} animate={{ opacity: 1, y: 0, transition: recipe.quick }}
              exit={{ opacity: 0, transition: recipe.contentOut }}>
              <ol>{tipRows(s).map(r => <li key={r.stage} data-state={r.state} aria-current={r.state === 'now' ? 'step' : undefined}><i aria-hidden />{r.text}</li>)}</ol>
              <p>{STAGE_MEANS[s.stage]}</p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

// --- RestartPm.tsx ---
/** The board's tooltip around a control (as the phone's In progress tab has it): after 300 ms of a mouse's hover, or at
 *  once on keyboard focus; gone on leave, blur, a press or Escape. Off while `text` is empty. */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>();
  const wrap = useRef<HTMLSpanElement>(null), tip = useRef<HTMLDivElement>(null), timer = useRef(0);
  const hide = () => { clearTimeout(timer.current); setOpen(false); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (!text) hide(); }, [text]);
  useLayoutEffect(() => {
    if (!open) { setPos(undefined); return; }
    const a = wrap.current?.getBoundingClientRect(), t = tip.current;
    if (a && t) setPos(placeTip(a, { width: t.offsetWidth, height: t.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    document.addEventListener('keydown', key, true);
    return () => document.removeEventListener('keydown', key, true);
  }, [open]);
  return (
    <span ref={wrap} className="inline-flex"
      onPointerEnter={e => { if (text && e.pointerType === 'mouse') { clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), 300); } }}
      onPointerLeave={hide} onPointerDown={hide} onBlur={hide}
      onFocus={e => { if (text && (e.target as HTMLElement).matches(':focus-visible')) setOpen(true); }}>
      {children}
      {open && text && createPortal(
        <div ref={tip} role="tooltip" data-restart-tip className="stage-tip" style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? undefined : 'hidden' }}>{text}</div>,
        document.body,
      )}
    </span>
  );
}

// board.css: the strip and its tooltip (T52), and the --rm-* values they read. The tooltip rules unscoped (see above);
// the rows inside levain's Tooltip ([data-stage-rows]) read the same rules: the content is the consumer's.
export const BOARD_TIP_CSS = `
.rmb, .stage-tip, [data-stage-rows] { --rm-2xs: 0.75rem; --rm-amber: #f2af48; --rm-quick: 150ms; --rm-ease-out: cubic-bezier(0, 0, 0.58, 1); }
.rmb .strip, .stage-tip, [data-stage-rows] { --stage: var(--color-text-muted); }
.rmb .strip[data-stage='building'], :is(.stage-tip, [data-stage-rows])[data-stage='building'] { --stage: var(--color-border-focus); }
.rmb .strip[data-stage='review'], :is(.stage-tip, [data-stage-rows])[data-stage='review'] { --stage: var(--color-info-fg); }
.rmb .strip[data-stage='you'], :is(.stage-tip, [data-stage-rows])[data-stage='you'] { --stage: var(--rm-amber); }
.rmb .strip[data-stage='merged'], :is(.stage-tip, [data-stage-rows])[data-stage='merged'] { --stage: var(--color-success-fg); }
.rmb .strip { display: flex; width: fit-content; max-width: calc(100% + 0.75rem); align-items: center; gap: 0.5rem; margin: 0 -0.375rem; padding: 0.25rem 0.375rem 0;
  border-radius: 0.375rem; font-size: var(--rm-2xs); line-height: 1.5; color: var(--color-text-faint); text-align: left; cursor: default; outline: none; }
.rmb .strip:focus-visible { box-shadow: 0 0 0 2px var(--color-border-focus); }
.rmb .strip .pips { display: inline-flex; gap: 2px; flex: none; }
.rmb .strip .pips i { display: block; width: 0.625rem; height: 3px; border-radius: 9999px; background: var(--color-border-subtle); }
.rmb .strip .pips i[data-on] { background: var(--color-text-faint); }
.rmb .strip .pips i[data-at] { background: var(--color-text-muted); }
.rmb .strip:not([data-stage='queued'], [data-stage='briefed']) .pips i:is([data-on], [data-at]) { background: var(--stage); }
.rmb .strip .word { color: var(--stage); }
/* the strip's tooltip (T52): the switcher's recipe (radius, shadow, hairline) a rung lower, on the component surface,
   where every stage colour reads at 4.5:1 or more in both themes (on the elevated one, dark Review and Merged miss);
   the six stages, the current one in its stage's colour, and a line on what that stage means. Fixed to the window,
   placed by Strip (faces.tsx). */
.stage-tip { position: fixed; z-index: 60; width: max-content; max-width: min(18rem, calc(100vw - 1rem)); padding: 0.625rem 0.75rem;
  border-radius: 10px; background-color: var(--color-surface-component); box-shadow: var(--elevation-3), inset 0 0 0 1px var(--color-border-subtle);
  font-size: var(--rm-2xs); line-height: 1.5; color: var(--color-text-faint); text-align: left; }
:is(.stage-tip, [data-stage-rows]) ol { display: flex; flex-direction: column; gap: 0.125rem; margin: 0; padding: 0; list-style: none; }
:is(.stage-tip, [data-stage-rows]) li { display: flex; align-items: center; gap: 0.5rem; }
:is(.stage-tip, [data-stage-rows]) li i { display: block; flex: none; width: 0.625rem; height: 3px; border-radius: 9999px; background: var(--color-border-default); }
:is(.stage-tip, [data-stage-rows]) li[data-state='done'] { color: var(--color-text-muted); }
:is(.stage-tip, [data-stage-rows]) li[data-state='done'] i { background: var(--color-text-faint); }
:is(.stage-tip, [data-stage-rows]) li[data-state='now'] { color: var(--stage); font-weight: 600; }
:is(.stage-tip, [data-stage-rows]) li[data-state='now'] i { background: var(--stage); }
:is(.stage-tip, [data-stage-rows]) p { margin: 0.5rem 0 0; padding-top: 0.5rem; border-top: 1px solid var(--color-border-subtle); color: var(--color-text-muted); }
/* Restart PM's icon button (the header's short form) */
.rmb .pm-restart-icon { display: inline-flex; align-items: center; gap: 0.375rem; min-height: 1.75rem; min-width: 1.75rem; justify-content: center;
  padding: 0 0.25rem; border: 0; border-radius: 0.375rem; background: none; color: var(--color-text-muted); cursor: pointer; outline: none;
  transition: color var(--rm-quick) var(--rm-ease-out); }
@media (hover: hover) { .rmb .pm-restart-icon:hover { color: var(--color-text-default); } }
.rmb .pm-restart-icon:focus-visible { box-shadow: 0 0 0 2px var(--color-border-focus); }
`;
