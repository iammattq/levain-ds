// A copy of the strip in Ringmaster's board/src/ly1/Board.tsx, `Phone` (T11), for the demo's side-by-side only:
// levain's ColumnStrip against the board's own, with the same columns and cards. Not exported, not part of levain.
// Copied verbatim from Board.tsx (lines ~677-680 and ~727-900, as of T11): the constants, the strip's state, `go`,
// `page`, `stop`, `onDragChange`, `onDragMove`, the pills, the strip and the cue. Left out, being the board's
// own and not the strip's: the header and menu, the In progress TipTab (a plain pill here), the + button, the Your
// work pile, the Releases tab (`tab` is always 'work') and the debug overlay (`debugLog` is a no-op). One change: DROP
// is [0, 2] (Ideas to In progress), the demo's pageable columns, where the board's is [0, 1].
// Its CSS (.tab, .count, .column) is board.css's, copied below under .rmb.
/* eslint-disable */
import { duration, motion as motionFor, recipe } from '@levain/tokens';
import { SortableGroup } from '@levain/ui-react';
import { animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const debugLog = (_: string) => {};

export const BOARD_CSS = `
.rmb { --rm-top: 0px; --rm-xs: 0.875rem; --rm-ease-out: cubic-bezier(0, 0, 0.58, 1); --rm-quick: 150ms;
  --rm-card: var(--color-surface-card); --rm-edge: inset 0 0 0 1px var(--color-border-subtle); font-size: var(--rm-xs); line-height: 1.5; }
html:not(.dark) .rmb .column { background-color: var(--color-border-subtle); }
.rmb .column { background-color: var(--color-surface-section); border-radius: calc(var(--radius-lg, 0.5rem) + 0.25rem); }
.rmb .tab { flex: none; display: flex; align-items: baseline; gap: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 500; color: var(--color-text-faint); white-space: nowrap;
  transition: background-color var(--rm-quick) var(--rm-ease-out), color var(--rm-quick) var(--rm-ease-out); }
.rmb .tab:focus-visible { outline-offset: -2px; }
.rmb .tab .count { font-weight: 400; }
.rmb .tab[aria-current='true'] { background: var(--rm-card); box-shadow: var(--rm-edge); color: var(--color-text-default); }
`;

/* ---------------- the phone ---------------- */

const DWELL = 500, REPEAT = 600; // ms
const EDGE = 56;                 // px, each edge zone's width
const DROP = [0, 2];             // the columns a card can land in (demo: Ideas to In progress; the board's is [0, 1])

export function BoardColumnStrip({ pages, counts, onMove }: {
  counts: number[]; pages: [string, ReactNode][]; onMove: Parameters<typeof SortableGroup>[0]['onMove']
}) {
  const tab = 'work' as 'work' | 'done';
  const setTab = (_: 'work' | 'done') => {};
  const reduce = useReducedMotion();
  const strip = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null); // the columns, inside the strip: moved by a transform while a card is held
  const railX = useMotionValue(0);
  const sliding = useRef<AnimationPlaybackControls | null>(null);
  // a page slides like the iPhone's home screen (D228): a large arrival's length, easing out with no overshoot
  const slide = motionFor({ ...recipe.sheetIn, duration: duration.arrival / 1000 }, reduce);
  const [at, setAt] = useState(0);
  const atRef = useRef(0);
  atRef.current = at;
  // the edge a page is coming from, for the cue (a glow that builds over the dwell)
  const [cue, setCue] = useState<{ side: 'left' | 'right'; wait: number; n: number } | null>(null);
  const dwell = useRef<{ side: 'left' | 'right' | null; timer: number }>({ side: null, timer: 0 });
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const on = () => setAt(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [tab]);
  // the strip is as tall as the column in view (each grows to its content; D242)
  const pageEls = useRef<(HTMLElement | null)[]>([]);
  const [pageHeight, setPageHeight] = useState<number>();
  useLayoutEffect(() => {
    const el = pageEls.current[at];
    if (!el || tab !== 'work') return;
    const ro = new ResizeObserver(() => setPageHeight(el.offsetHeight));
    ro.observe(el);
    setPageHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [at, tab]);
  const go = (i: number) => { setTab('work'); requestAnimationFrame(() => strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: reduce ? 'auto' : 'smooth' })); };

  // Paging while a card is in the hand (D226, D228), as an iPhone's home screen pages a held icon: resting at either
  // screen edge pages one column after DWELL, then every REPEAT while the finger stays; moving off the edge stops it.
  // While a card is held the strip never scrolls: the rail moves by a transform (iOS froze scrolling a strip under a
  // held touch), swapped on drop for the same scroll position in one frame. Paging stays between To do and Queued.
  const held = useRef({ base: 0, shift: 0 });
  const page = (i: number) => {
    try {
      held.current.shift = i * strip.current!.clientWidth - held.current.base;
      atRef.current = i;
      setAt(i);
      debugLog(`paging to ${pages[i]![0]} (shift ${Math.round(held.current.shift)})`);
      sliding.current = animate(railX, -held.current.shift, slide);
      return sliding.current.finished;
    } catch (e) { debugLog('page failed: ' + (e as Error).message); return Promise.resolve(); }
  };
  const stop = () => { if (dwell.current.side) debugLog('left the edge'); clearTimeout(dwell.current.timer); dwell.current = { side: null, timer: 0 }; setCue(null); };
  useEffect(() => () => clearTimeout(dwell.current.timer), []);
  const onDragChange = (d: boolean) => {
    const el = strip.current!;
    if (d) {
      held.current = { base: el.scrollLeft, shift: 0 };
      el.style.scrollSnapType = 'none';
      debugLog(`lifted (strip at ${Math.round(el.scrollLeft)})`);
      return;
    }
    stop();
    sliding.current?.stop();
    if (held.current.shift) {
      el.style.scrollBehavior = 'auto';
      railX.jump(0);
      el.scrollLeft = held.current.base + held.current.shift;
      el.style.scrollBehavior = '';
    }
    el.style.scrollSnapType = '';
    debugLog(`dropped (strip at ${Math.round(el.scrollLeft)})`);
    held.current = { base: el.scrollLeft, shift: 0 };
  };
  const onDragMove = (x: number) => {
    const side = x < EDGE ? 'left' : x > window.innerWidth - EDGE ? 'right' : null;
    if (side === dwell.current.side) return;
    stop();
    if (!side) return;
    const next = () => atRef.current + (side === 'left' ? -1 : 1);
    if (next() < DROP[0]! || next() > DROP[1]!) return; // nowhere to page to
    debugLog('enter ' + side + ' edge');
    const arm = (wait: number) => {
      debugLog(`dwell armed (${wait} ms)`);
      setCue(c => ({ side, wait, n: (c?.n ?? 0) + 1 }));
      dwell.current = { side, timer: window.setTimeout(() => {
        debugLog('dwell fired');
        setCue(null);
        void page(next()).then(() => {
          debugLog('slid');
          if (dwell.current.side === side && next() >= DROP[0]! && next() <= DROP[1]!) arm(REPEAT);
        });
      }, wait) };
    };
    arm(DWELL);
  };
  return (
    <div className="rmb flex select-none flex-col" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
      <style>{BOARD_CSS}</style>
      <div data-pills className="sticky top-[var(--rm-top)] z-20 flex items-center gap-1 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-sm pb-sm pt-1">
        <nav aria-label="Columns" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {pages.map(([c], i) => (
            <button key={c} type="button" onClick={() => go(i)} aria-current={tab === 'work' && at === i} className="tab">
              {c} <span className="count">{counts[i]!}</span>
            </button>
          ))}
        </nav>
      </div>
      <SortableGroup onMove={onMove} onDragChange={onDragChange} onDragMove={onDragMove}>
        {/* the columns page sideways (a snap strip); its height is the column in view, so the page scrolls it as one */}
        <div ref={strip} style={{ height: pageHeight }} className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
          <motion.div ref={rail} style={{ x: railX }} className="flex w-full items-start">
            {pages.map(([title, body], i) => (
              <section key={title} ref={el => { pageEls.current[i] = el; }} aria-label={title} className="w-full shrink-0 snap-start px-sm pt-sm pb-lg">
                {/* the column's container (D245); its head is its pill, pinned above */}
                <div className="column space-y-md p-xs">{body}</div>
              </section>
            ))}
          </motion.div>
        </div>
      </SortableGroup>
      {/* the cue: the edge glows, building over the dwell (a progress, so linear), and starts again after each page */}
      {cue && (
        <motion.div key={cue.n} aria-hidden data-page-cue={cue.side}
          initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : cue.wait / 1000, ease: 'linear' }}
          className={'pointer-events-none fixed inset-y-0 z-[55] w-6 ' + (cue.side === 'left' ? 'left-0 bg-gradient-to-r' : 'right-0 bg-gradient-to-l') + ' from-[color-mix(in_srgb,var(--color-text-link)_45%,transparent)] to-transparent'} />
      )}
    </div>
  );
}
