// A copy of Ringmaster's board/src/ly1/Switcher.tsx (as of T41, 2026-11-24), for the demo's side-by-side only: levain's
// Menu against the board's own switcher. Not exported, not part of levain. Copied verbatim but for its imports: Project,
// othersOf (board/src/others.ts) and StatusIcon (ly1/status.tsx, the arcs and blocked only) are copied below, and
// pickProject is the demo's (it swaps the shown project in place). Its CSS (board.css's .switcher*, .others, .ic,
// .rm-ring and the --rm-* values they read) is copied below under .rmb.
/* eslint-disable */
import { duration, ease, recipe, stagger } from '@levain/tokens';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export type Project = { name: string; root: string; waiting?: number; blocked?: number; working?: boolean };
let picker: (name: string) => void = () => {};
/** The demo's pickProject: the board's navigates to ?project=<name>; this one tells the demo. */
export const onPick = (f: (name: string) => void) => { picker = f; };
const pickProject = (name: string) => picker(name);

export type OthersState = 'idle' | 'working' | 'waiting';
const has = (p: Project) => [p.waiting ? `${p.waiting} waiting for you` : '', p.blocked ? `${p.blocked} blocked` : ''].filter(Boolean).join(', ');
export function othersOf(projects: Project[], current: string): { state: OthersState; label: string } | null {
  const others = projects.filter(p => p.name !== current);
  if (!others.length) return null;
  const state: OthersState = others.some(p => p.waiting || p.blocked) ? 'waiting' : others.some(p => p.working) ? 'working' : 'idle';
  const lines = others.map(p => {
    const parts = [p.working ? 'is working' : '', has(p) ? `has ${has(p)}` : ''].filter(Boolean);
    return parts.length ? `${p.name} ${parts.join(' and ')}` : '';
  }).filter(Boolean);
  return { state, label: `Other projects: ${lines.length ? lines.join('; ') : 'nothing happening'}` };
}

type Status = 'active' | 'idle' | 'blocked';
const STATUS_WORD: Record<Status, string> = { active: 'Active', idle: 'Idle', blocked: 'Blocked' };
const ARCS: Partial<Record<Status, string>> = { idle: 'idle', active: 'active' };
export function StatusIcon({ status, label, decorative }: { status: Status; label?: string; decorative?: boolean }) {
  const name = decorative ? undefined : label ?? STATUS_WORD[status];
  const arcs = ARCS[status];
  return (
    <svg className={'ic st' + (arcs ? ' rm-ring' : '')} data-status={status} data-state={arcs} viewBox="0 0 16 16"
      role={name ? 'img' : undefined} aria-label={name} aria-hidden={name ? undefined : true}>
      {name && <title>{name}</title>}
      {arcs ? <circle cx="8" cy="8" r="6" pathLength="100" /> : <circle cx="8" cy="8" r="6" />}
      {status === 'blocked' && <path d="M5.25 8 H10.75" />}
    </svg>
  );
}

const s = (ms: number) => ms / 1000;
/** The menu's corner, in px: a number, so the layout animation keeps it round while the shape is stretched. */
const RADIUS = 10;

/** The other projects' mark: 16 units, the status glyphs' family. Its rays draw outward from the dot (board.css). */
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4, c = Math.cos(a), sn = Math.sin(a), r = (n: number) => +n.toFixed(2);
  return `M${r(8 + 5.25 * c)} ${r(8 + 5.25 * sn)} L${r(8 + 8.25 * c)} ${r(8 + 8.25 * sn)}`;
});
const OthersGlyph = ({ state }: { state: OthersState }) => (
  <svg className={'ic others-glyph' + (state === 'working' ? ' rm-ring' : '')} data-state={state === 'working' ? 'active' : state} viewBox="0 0 16 16" aria-hidden>
    {state === 'idle' && <circle cx="8" cy="8" r="5" />}
    {state === 'working' && <circle cx="8" cy="8" r="6" pathLength="100" />}
    {state === 'waiting' && <>
      <circle className="fill dot" cx="8" cy="8" r="3.5" />
      {RAYS.map(d => <path key={d} className="ray" d={d} pathLength="1" />)}
    </>}
  </svg>
);

/** What a project's marks say, for assistive technology: "1 waiting on you, 2 blocked". */
const marksLabel = (p: Project) => [p.waiting ? `${p.waiting} waiting on you` : '', p.blocked ? `${p.blocked} blocked` : ''].filter(Boolean).join(', ');

/** A menu row's marks: a fixed slot per kind (waiting on you, then blocked), so each kind lines up down the rows; a row
 *  without one leaves its slot empty. Waiting on you is T76's blue burst, the mark's own glyph (T95, D-T95), so the
 *  project the mark beside the switcher points at reads the same in the menu; blocked keeps the red mark. */
export const RowMarks = ({ p }: { p: Project }) => (
  <span className="marks" {...(p.waiting || p.blocked ? { role: 'img', 'aria-label': marksLabel(p) } : { 'aria-hidden': true })}>
    <span className="slot" data-slot="you">{!!p.waiting && <OthersGlyph state="waiting" />}</span>
    <span className="slot" data-slot="blocked">{!!p.blocked && <StatusIcon status="blocked" decorative />}</span>
  </span>
);

export function Switcher({ current, projects }: { current: string; projects: Project[] }) {
  const reduce = useReducedMotion();
  // `open`: the menu is asked for (its rows are in). `grown`: the surface has the menu's shape; with motion it ends
  // with `open` (the collapse overlaps the rows' leaving); with Reduce Motion it outlasts it by the fade.
  const [open, setOpen] = useState(false);
  const [grown, setGrown] = useState(false);
  // the room to the window's right edge, so a long name never pushes the menu off a phone
  const [room, setRoom] = useState<number>();
  const wrap = useRef<HTMLSpanElement>(null), mark = useRef<HTMLButtonElement>(null), button = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const openNow = useRef(open);
  openNow.current = open;
  const id = useId();

  // the button the menu was opened from (the name or the mark): a close gives focus back to it
  const opener = useRef<HTMLButtonElement | null>(null);
  const show = (from: HTMLButtonElement | null = button.current) => {
    opener.current = from;
    const r = wrap.current?.getBoundingClientRect();
    if (r) setRoom(Math.max(160, window.innerWidth - r.left + 12 - 8));
    setGrown(true);
    setOpen(true);
  };
  // the shape starts collapsing as the rows start leaving (overlapped: content first, but no wait between them), so
  // it's back in the button as promptly as a dialog closes into its card. Reduce Motion keeps it until the fade ends.
  // Focus goes back to the button either way; its ring only after a keyboard close. Chrome carries :focus-visible
  // across a scripted focus (a keyboard close earlier, then a pointer one, would keep it), so a pointer close marks
  // the button quiet until the next key or until it loses focus.
  const close = (by: 'key' | 'pointer' = 'key') => {
    setOpen(false);
    if (!reduce) setGrown(false);
    const b = opener.current ?? button.current;
    if (!b) return;
    if (by === 'pointer') b.dataset.quiet = ''; else delete b.dataset.quiet;
    b.focus({ preventScroll: true, ...(by === 'pointer' ? { focusVisible: false } : {}) } as FocusOptions);
  };
  const pick = (name: string, by: 'key' | 'pointer') => { if (name !== current) pickProject(name); close(by); };
  const shrink = () => { if (!openNow.current) setGrown(false); };

  // focus goes into the list as it opens: the current project's row
  useEffect(() => {
    if (open) (list.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? list.current?.querySelector<HTMLElement>('[role="option"]'))?.focus({ preventScroll: true });
  }, [open]);
  // a press anywhere else closes it
  useEffect(() => {
    if (!open) return;
    // the mark toggles the menu itself (a press on it isn't "elsewhere")
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node) && !mark.current?.contains(e.target as Node)) close('pointer'); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (button.current) delete button.current.dataset.quiet;
    if (mark.current) delete mark.current.dataset.quiet;
    if (!open) {
      if (e.key === 'ArrowDown' && e.target === button.current) { e.preventDefault(); show(); }
      return;
    }
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])], at = rows.indexOf(document.activeElement as HTMLElement), n = rows.length;
    const to = e.key === 'ArrowDown' ? (at + 1) % n : e.key === 'ArrowUp' ? (at <= 0 ? n - 1 : at - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to >= 0 && n) { e.preventDefault(); rows[to]!.focus({ preventScroll: true }); }
    // Escape is this menu's alone; Tab leaves it, back to the button
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); close(); }
  };

  const shown = reduce ? open : grown;
  const others = othersOf(projects, current);
  return (<>
    {others && (
      <button ref={mark} type="button" className="others" data-others={others.state} aria-label={others.label} title={others.label}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={e => (open ? close(e.detail ? 'pointer' : 'key') : show(mark.current))} onBlur={e => { delete e.currentTarget.dataset.quiet; }}>
        <OthersGlyph state={others.state} />
      </button>
    )}
    <span ref={wrap} className="switcher" data-open={open || undefined} onKeyDown={onKeyDown}>
      <button ref={button} type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} title="Switch project"
        onClick={e => (open ? close(e.detail ? 'pointer' : 'key') : show())} onBlur={e => { delete e.currentTarget.dataset.quiet; }} className="switcher-button text-[13px]! leading-[20px]! font-semibold!">
        <span className="truncate">{current}</span>
        <ChevronDown aria-hidden size={14} className="chev" />
      </button>
      {/* the one surface: the button's shape at rest (unseen), the menu's when grown */}
      <motion.div data-switcher-menu data-grown={grown || undefined} className="switcher-menu" layout={!reduce}
        style={{ borderRadius: RADIUS, maxWidth: grown ? room : undefined }}
        initial={false} animate={{ opacity: shown ? 1 : 0 }}
        transition={reduce ? { duration: s(duration.quick), ease: ease.out } : {
          layout: open ? recipe.morph : recipe.collapse,
          // it shows at once as it starts to grow; closing, it melts into the button once the rows are gone
          opacity: grown ? recipe.contentOut : { ...recipe.quick, delay: s(duration.contentOut) },
        }}
        onAnimationComplete={() => { if (reduce) shrink(); }}>
        <AnimatePresence onExitComplete={shrink}>
          {(reduce ? grown : open) && (
            <motion.div key="list" ref={list} id={id} role="listbox" aria-label="Project" className="switcher-list" layout={!reduce}
              initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: reduce ? { duration: 0 } : recipe.contentOut }}>
              {projects.map((p, i) => (
                <motion.button key={p.name} type="button" role="option" aria-selected={p.name === current} tabIndex={-1} data-project={p.name}
                  onClick={e => pick(p.name, e.detail ? 'pointer' : 'key')} className="switcher-row text-[13px]! leading-[20px]!"
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0, transition: { ...recipe.contentIn, delay: s(duration.contentOut + i * stagger) } }}>
                  <span className="name truncate">{p.name}</span>
                  {/* working or idle (T38, D293): the board's Active ring turning, or the still ring; quiet, left of the marks */}
                  <span className="state" data-working={p.working ? '' : undefined}>
                    <StatusIcon status={p.working ? 'active' : 'idle'} label={p.working ? 'Working' : 'Idle'} />
                  </span>
                  <RowMarks p={p} />
                  <span className="check" aria-hidden>{p.name === current && <Check size={14} />}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </span>
  </>);
}

export const BOARD_SWITCHER_CSS = `
.rmb { --rm-ease-out: cubic-bezier(0, 0, 0.58, 1); --rm-ease-spring-out: cubic-bezier(0.4, 0, 0.2, 1); --rm-quick: 150ms; --rm-morph: 460ms; --rm-orbit: 6000ms;
  --rm-red: var(--color-error-fg, #d5766f); --rm-hover: oklch(100% 0 0 / 5%); --rm-active: oklch(100% 0 0 / 9%); }
html:not(.dark) .rmb { --rm-hover: oklch(0% 0 0 / 4%); --rm-active: oklch(0% 0 0 / 8%); }
.rmb .ic { display: inline-block; width: 1em; height: 1em; flex: none; vertical-align: -0.23em; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; overflow: visible; }
.rmb .ic * { vector-effect: non-scaling-stroke; }
.rmb .ic .fill { fill: currentColor; stroke: none; }
.rmb .rm-ring circle {
  stroke-dasharray: 23.333 10 23.333 10 23.333 10;
  stroke-dashoffset: 20;
  transition: stroke-dasharray var(--rm-morph) var(--rm-ease-spring-out), stroke-dashoffset var(--rm-morph) var(--rm-ease-spring-out);
}
.rmb .rm-ring[data-state='silent'] circle { stroke-dasharray: 37 0 37 0 0 26; stroke-dashoffset: 12; }
.rmb .rm-ring[data-state='active'] { animation: rm-orbit var(--rm-orbit) linear infinite; }
@keyframes rm-orbit { to { transform: rotate(360deg); } }
.rmb .ic.st { width: 0.875rem; height: 0.875rem; vertical-align: -0.16em; align-self: center; color: var(--color-text-muted); }
.rmb .ic.st[data-status='blocked'] { color: var(--rm-red); }
.rmb .switcher { position: relative; z-index: 40; display: inline-flex; min-width: 0; }
.rmb .switcher-button { position: relative; z-index: 1; display: inline-flex; min-width: 0; align-items: center; gap: 0.25rem; margin: 0 -0.375rem; padding: 0.125rem 0.375rem;
  border-radius: 0.375rem; cursor: pointer; outline: none; transition: background-color var(--rm-quick) var(--rm-ease-out); }
@media (hover: hover) { .rmb .switcher-button:hover { background-color: var(--rm-hover); } }
.rmb .switcher-button:focus-visible:not([data-quiet]) { box-shadow: 0 0 0 2px var(--color-border-focus); }
.rmb .switcher .chev { flex: none; color: var(--color-text-faint); transition: transform var(--rm-quick) var(--rm-ease-out); }
.rmb .switcher[data-open] .chev { transform: rotate(180deg); }
/* at rest: the button's own box (unseen, opacity 0); grown: the menu, under the button, its names under the label */
.rmb .switcher-menu { position: absolute; top: 0; left: -0.375rem; right: -0.375rem; height: 100%; overflow: hidden; pointer-events: none;
  background-color: var(--color-surface-elevated); box-shadow: var(--elevation-3), inset 0 0 0 1px var(--color-border-subtle); }
.rmb .switcher-menu[data-grown] { top: calc(100% + 0.375rem); left: -0.75rem; right: auto; width: max-content; min-width: 13rem; height: auto; pointer-events: auto; }
.rmb .switcher-list { display: flex; flex-direction: column; padding: 0.25rem; }
/* leaving (the surface collapsing round it): the list keeps its own size, clipped, so its rows never squeeze */
.rmb .switcher-menu:not([data-grown]) .switcher-list { position: absolute; top: 0; left: 0; width: max-content; min-width: 13rem; }
.rmb .switcher-row { display: flex; align-items: center; gap: 0.5rem; width: 100%; min-height: 2.25rem; padding: 0 0.5rem; border-radius: 0.375rem; text-align: left;
  color: var(--color-text-muted); cursor: pointer; outline: none; }
.rmb .switcher-row .name { flex: 1; min-width: 0; }
.rmb .switcher-row[aria-selected='true'] { color: var(--color-text-default); font-weight: 600; }
@media (hover: hover) { .rmb .switcher-row:hover { background-color: var(--rm-hover); color: var(--color-text-default); } }
.rmb .switcher-row:focus-visible { background-color: var(--rm-active); color: var(--color-text-default); }
.rmb .switcher-row .state { display: inline-flex; flex: none; width: 14px; color: var(--color-text-muted); }
.rmb .switcher-row .state:not([data-working]) { opacity: 0.55; }
.rmb .switcher-row .marks { display: inline-flex; flex: none; gap: 0.25rem; }
.rmb .switcher-row .marks .ic { vertical-align: 0; }
.rmb .switcher-row .marks .slot { display: inline-flex; flex: none; width: 14px; justify-content: center; }
/* waiting on the designer (T95, D-T95): T76's blue burst, as the mark beside the switcher draws it */
.rmb .switcher-row .marks .others-glyph { width: 0.875rem; height: 0.875rem; color: var(--color-text-link); }
.rmb .switcher-row .check { display: inline-flex; flex: none; width: 0.875rem; color: var(--color-text-muted); }
.rmb .others { display: inline-grid; place-items: center; flex: none; margin: -0.3125rem -0.125rem -0.3125rem 0; padding: 0.3125rem; border-radius: 999px; color: var(--color-text-faint); }
@media (hover: hover) { .rmb .others:hover { background-color: var(--rm-hover); } }
.rmb .others:focus-visible:not([data-quiet]) { outline: none; box-shadow: 0 0 0 2px var(--color-border-focus); }
.rmb .others .ic { width: 0.875rem; height: 0.875rem; vertical-align: 0; }
.rmb .others[data-others='working'] { color: var(--color-text-muted); }
.rmb .others[data-others='waiting'] { color: var(--color-text-link); }
/* the burst: the glyph's own, so the switcher's menu rows (T95) draw the same one as the mark */
.rmb .others-glyph .dot { transform-box: fill-box; transform-origin: center; animation: rm-burst-dot var(--rm-burst) var(--rm-ease-out) infinite; }
.rmb .others-glyph .ray { stroke-width: 1.25; stroke-dasharray: 1 2; stroke-dashoffset: 0; animation: rm-burst-ray var(--rm-burst) var(--rm-ease-out) infinite; }
.rmb .others-glyph { --rm-burst: 4000ms; }
@keyframes rm-burst-dot { 0% { transform: scale(1); } 5% { transform: scale(1.25); } 15%, 100% { transform: scale(1); } }
@keyframes rm-burst-ray { 0% { stroke-dashoffset: 1; opacity: 0; } 1% { opacity: 1; } 7% { stroke-dashoffset: 0; opacity: 1; } 15%, 100% { stroke-dashoffset: -1; opacity: 0; } }
`;
export { OthersGlyph };
