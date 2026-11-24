// A copy of the desktop column in Ringmaster's board/src/ly1/Board.tsx, `Column` (~594, as of T8), for the demo's
// side-by-side only: levain's Column against the board's own, with the same cards. Not exported, not part of levain.
// Copied verbatim but for the board's own count: `Count` with its pool and PM (n of pool) and the "you" amber are left
// out, so `count` is a plain number. Its CSS (.column, .col-head, .count) is board.css's, copied below under .rmb.
// StatusIcon is a copy of board/src/ly1/status.tsx's, the statuses this demo uses only, with its CSS (.ic, .st,
// .rm-ring) under .rm-glyphs: the demo hands it to levain's Column too, as the board would.
/* eslint-disable */
import type { ReactNode } from 'react';

export const BOARD_COLUMN_CSS = `
.rmb { --rm-xs: 0.875rem; font-size: var(--rm-xs); line-height: 1.5; }
.rm-glyphs { --rm-red: var(--color-error-fg, #d5766f); }
html:not(.dark) .rmb .column { background-color: var(--color-border-subtle); }
.rmb .column { background-color: var(--color-surface-section); border-radius: calc(var(--radius-lg, 0.5rem) + 0.25rem); }
.rmb .col-head { display: flex; align-items: baseline; gap: 0.5rem; font-size: var(--rm-xs); font-weight: 500; }
.rmb .col-head .count { font-weight: 400; color: var(--color-text-faint); }
.rm-glyphs .ic { display: inline-block; width: 1em; height: 1em; flex: none; vertical-align: -0.23em; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; overflow: visible; }
.rm-glyphs .ic * { vector-effect: non-scaling-stroke; }
.rm-glyphs .ic .fill { fill: currentColor; stroke: none; }
.rm-glyphs .rm-ring circle { stroke-dasharray: 23.333 10 23.333 10 23.333 10; stroke-dashoffset: 20; }
.rm-glyphs .rm-ring[data-state='dashed'] circle { stroke-dasharray: 7 9.667; stroke-dashoffset: 3.5; }
.rm-glyphs .ic.st { width: 0.875rem; height: 0.875rem; vertical-align: -0.16em; align-self: center; color: var(--color-text-muted); }
.rm-glyphs .ic.st[data-status='you'] { color: var(--rm-amber); }
.rm-glyphs .ic.st[data-status='blocked'] { color: var(--rm-red); }
`;

export type Status = 'todo' | 'queued' | 'idle' | 'you' | 'blocked';
const ARCS: Partial<Record<Status, string>> = { todo: 'dashed', queued: 'idle', idle: 'idle' };

export function StatusIcon({ status }: { status: Status }) {
  const arcs = ARCS[status];
  return (
    <svg className={'ic st' + (arcs ? ' rm-ring' : '')} data-status={status} data-state={arcs} viewBox="0 0 16 16" aria-hidden>
      {arcs ? <circle cx="8" cy="8" r="6" pathLength="100" /> : <circle cx="8" cy="8" r="6" />}
      {status === 'you' && <circle className="fill" cx="8" cy="8" r="2" />}
      {status === 'blocked' && <path d="M5.25 8 H10.75" />}
    </svg>
  );
}

export function BoardColumn({ title, glyph, count, marks, action, children }: { title: string; glyph: Status; count: number; marks?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="column flex min-w-0 flex-col px-xs pb-xs pt-2xs">
      <header className="col-head flex h-8 shrink-0 items-center! px-md">
        <StatusIcon status={glyph} />
        <h2 className="m-0 font-medium">{title}</h2>
        <span className="count">{count}</span>
        {marks}
        {action && <span className="ml-auto">{action}</span>}
      </header>
      <div className="space-y-md pt-[calc(var(--spacing-3xs)+4px)]">{children}</div>
    </section>
  );
}
