// A copy of Ringmaster's board/src/ly1/HeadPopover.tsx (as of T39, 2026-11-24), for the demo's side-by-side only: levain's
// Popover against the board's own, with the same panel. Not exported, not part of levain. Copied verbatim; its CSS
// (.pool, .pool-button, .pool-menu, .pool-panel and the --rm-* values they read) is board.css's, copied below under .rmb.
/* eslint-disable */
import { duration, ease, recipe } from '@levain/tokens';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

const s = (ms: number) => ms / 1000;
const FOCUSABLE = 'input, button, select, textarea, a[href]';
const RADIUS = 10;

export function HeadPopover({ icon, label, title, side = 'right', menu = 'pool', onClose, children, ...data }: {
  icon: ReactNode
  /** the button's accessible name and tooltip */
  label: string
  /** the panel's accessible name */
  title: string
  side?: 'left' | 'right'
  /** names the surface for the checks: data-<menu>-menu (the worker count's is data-pool-menu) */
  menu?: string
  /** before it closes (a pending value saved) */
  onClose?: () => void
  children: ReactNode
  [k: `data-${string}`]: string | boolean | undefined
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [grown, setGrown] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null), button = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const openNow = useRef(open);
  openNow.current = open;
  const id = useId();

  const show = () => { setGrown(true); setOpen(true); };
  const close = (by: 'key' | 'pointer' = 'key') => {
    onClose?.();
    setOpen(false);
    if (!reduce) setGrown(false);
    const b = button.current;
    if (!b) return;
    if (by === 'pointer') b.dataset.quiet = ''; else delete b.dataset.quiet;
    b.focus({ preventScroll: true, ...(by === 'pointer' ? { focusVisible: false } : {}) } as FocusOptions);
  };
  const shrink = () => { if (!openNow.current) setGrown(false); };

  // focus goes to its first control as it opens (the panel itself when it has none)
  useEffect(() => {
    if (!open) return;
    const p = panel.current;
    (p?.querySelector<HTMLElement>(FOCUSABLE) ?? p)?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close('pointer'); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (button.current) delete button.current.dataset.quiet;
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'Tab') {
      // Tab moves through the panel's controls (T75: the bell's cards, their X, "+N more", the switch); past its last
      // (or Shift+Tab before its first) it leaves, closing it, back to the button
      const p = panel.current, all = p ? [...p.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => !el.hasAttribute('disabled')) : [];
      const at = document.activeElement, first = all[0], last = all[all.length - 1];
      const leaving = !all.length || (e.shiftKey ? at === first || at === p || at === button.current : at === last);
      if (leaving) { e.preventDefault(); close(); }
    }
  };

  const shown = reduce ? open : grown;
  return (
    <span ref={wrap} className="pool" data-side={side} data-open={open || undefined} onKeyDown={onKeyDown} {...data}>
      <button ref={button} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={label} title={label}
        onClick={e => (open ? close(e.detail ? 'pointer' : 'key') : show())} onBlur={e => { delete e.currentTarget.dataset.quiet; }} className="pool-button">
        {icon}
      </button>
      <motion.div {...{ [`data-${menu}-menu`]: true }} data-grown={grown || undefined} className="pool-menu" layout={!reduce}
        style={{ borderRadius: RADIUS }}
        initial={false} animate={{ opacity: shown ? 1 : 0 }}
        transition={reduce ? { duration: s(duration.quick), ease: ease.out } : {
          layout: open ? recipe.morph : recipe.collapse,
          opacity: grown ? recipe.contentOut : { ...recipe.quick, delay: s(duration.contentOut) },
        }}
        onAnimationComplete={() => { if (reduce) shrink(); }}>
        <AnimatePresence onExitComplete={shrink}>
          {(reduce ? grown : open) && (
            <motion.div key="panel" ref={panel} id={id} role="dialog" aria-label={title} tabIndex={-1} className="pool-panel" layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { ...recipe.contentIn, delay: s(duration.contentOut) } }}
              exit={{ opacity: 0, transition: reduce ? { duration: 0 } : recipe.contentOut }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </span>
  );
}

export const BOARD_POPOVER_CSS = `
.rmb { --rm-ease-out: cubic-bezier(0, 0, 0.58, 1); --rm-quick: 150ms; --rm-hover: oklch(100% 0 0 / 5%); }
html:not(.dark) .rmb { --rm-hover: oklch(0% 0 0 / 4%); }
.rmb .pool { position: relative; display: inline-flex; }
.rmb .pool:is([data-open], :has(> .pool-menu[data-grown])) { z-index: 40; }
.rmb .pool-button { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem; border-radius: 9999px;
  color: var(--color-text-muted); cursor: pointer; outline: none; transition: background-color var(--rm-quick) var(--rm-ease-out); }
@media (hover: hover) { .rmb .pool-button:hover { background-color: var(--rm-hover); } }
.rmb .pool-button:focus-visible:not([data-quiet]) { box-shadow: 0 0 0 2px var(--color-border-focus); }
.rmb .pool[data-open] .pool-button { color: var(--color-text-default); }
.rmb .pool-menu { position: absolute; top: 0; right: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none;
  background-color: var(--color-surface-elevated); box-shadow: var(--elevation-3), inset 0 0 0 1px var(--color-border-subtle); }
.rmb .pool-menu[data-grown] { top: calc(100% + 0.375rem); right: -0.25rem; width: 15rem; max-width: calc(100vw - 2rem); height: auto; pointer-events: auto; }
.rmb .pool-panel { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem; }
.rmb .pool-menu:not([data-grown]) .pool-panel { position: absolute; top: 0; right: 0; width: 15rem; }
.rmb .pool[data-side='left'] .pool-menu { right: auto; left: 0; }
.rmb .pool[data-side='left'] .pool-menu[data-grown] { right: auto; left: -0.25rem; }
.rmb .pool[data-side='left'] .pool-menu:not([data-grown]) .pool-panel { right: auto; left: 0; }
`;
