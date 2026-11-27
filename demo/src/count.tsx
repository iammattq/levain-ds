// T7: CountBadge beside copies of the Ringmaster board's own counts (board/src/ly1/board.css and Board.tsx): a column
// head, the Questions head with something waiting on you, the phone's tabs, and the Completed tab's next-release pill.
// Each row: the board's copy on the left (its CSS, copied below under .bc), levain's CountBadge on the right. The board's
// "you" amber is its own --rm-amber; levain's caution tone is --color-caution-fg (T18/T21), so that colour differs by
// design.
import { CountBadge } from '@levain/ui-react';
import type { ReactNode } from 'react';
import { BENCH } from './bench';

const BOARD_CSS = `
.bc { --rm-xs: 0.875rem; --rm-amber: #f2af48; --rm-card: var(--color-surface-card); --rm-edge: none; font-size: var(--rm-xs); }
html:not(.dark) .bc { --rm-amber: #975d04; --rm-card: var(--color-surface-component, #fcfcfc); --rm-edge: inset 0 0 0 1px var(--color-border-subtle); }
.bc .col-head { display: flex; align-items: baseline; gap: 0.5rem; height: 2rem; font-size: var(--rm-xs); font-weight: 500; color: var(--color-text-default); }
.bc .col-head h2 { margin: 0; font-size: inherit; font-weight: 500; }
.bc .col-head .count { font-weight: 400; color: var(--color-text-faint); }
.bc .col-head .count.you { color: var(--rm-amber); }
.bc .tab { flex: none; display: flex; align-items: baseline; gap: 0.5rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 500; color: var(--color-text-faint); white-space: nowrap; }
.bc .tab .count { font-weight: 400; }
.bc .tab .count.you { color: var(--rm-amber); }
.bc .tab[aria-current='true'] { background: var(--rm-card); box-shadow: var(--rm-edge); color: var(--color-text-default); }
.bc .top-tab { position: relative; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--color-text-faint); }
.bc .top-tab[aria-selected='true'] { color: var(--color-text-default); }
.bc .next-release { display: inline-flex; align-items: center; gap: 0.375rem; margin-left: 0.375rem; vertical-align: baseline; font-weight: 400; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.bc .next-release .count { display: inline-flex; align-items: center; justify-content: center; min-width: 1.25rem; height: 1.25rem; padding: 0 0.375rem; border-radius: 999px; background: var(--color-text-default); color: var(--color-surface-canvas); font-size: 11px; line-height: 1; font-weight: 600; }
.bc .next-release .kind { padding: 0 0.375rem; border: 1px solid var(--color-border-subtle); border-radius: 999px; font-size: 11px; line-height: 16px; }
`;

/** A column head: the board's .col-head with its count either as the board's span or as a CountBadge. */
const head = (title: string, count: ReactNode, surface = 'section') => (
  <div className="rounded-[calc(var(--radius-lg)+0.25rem)] px-xs" style={{ background: `var(--color-surface-${surface})` }}>
    <header className="col-head items-center!" style={{ paddingInline: 'var(--spacing-md)' }}><h2>{title}</h2>{count}</header>
  </div>
);
const kind = <span className="kind">minor</span>;

type Row = { name: string; board: ReactNode; levain: ReactNode };
const ROWS: Row[] = [
  { name: 'Column head', board: head('Queued', <span className="count">4</span>), levain: head('Queued', <CountBadge count={4} />) },
  { name: 'Column head, empty', board: head('In progress', <span className="count">0</span>), levain: head('In progress', <CountBadge count={0} />) },
  {
    name: 'Questions head, waiting on you',
    board: head('Questions', <span className="count you">3</span>, 'canvas'),
    levain: head('Questions', <CountBadge count={3} tone="caution" label="3, 1 waiting on you" />, 'canvas'),
  },
  {
    name: 'Phone tabs',
    board: (
      <nav className="flex gap-1">
        <button type="button" className="tab" aria-current="true">Ideas <span className="count">5</span></button>
        <button type="button" className="tab">Queued <span className="count you">2</span></button>
        <button type="button" className="tab">In progress <span className="count">1</span></button>
      </nav>
    ),
    levain: (
      <nav className="flex gap-1">
        <button type="button" className="tab" aria-current="true">Ideas <CountBadge count={5} className="text-inherit" /></button>
        <button type="button" className="tab">Queued <CountBadge count={2} tone="caution" /></button>
        <button type="button" className="tab">In progress <CountBadge count={1} className="text-inherit" /></button>
      </nav>
    ),
  },
  {
    name: 'Completed tab, next release',
    board: <span className="flex gap-md"><span className="top-tab">Work board</span><span className="top-tab" aria-selected="true">Completed<span className="next-release"><span className="count">7</span>{kind}</span></span></span>,
    levain: <span className="flex gap-md"><span className="top-tab">Work board</span><span className="top-tab" aria-selected="true">Completed<span className="next-release"><CountBadge count={7} variant="filled" />{kind}</span></span></span>,
  },
  {
    name: 'Filled, caution (levain only)',
    board: <span className="type-caption text-[var(--color-text-faint)]">The board has no caution pill.</span>,
    levain: <span className="flex items-center gap-xs"><CountBadge count={2} variant="filled" tone="caution" /><CountBadge count={12} variant="filled" tone="caution" /></span>,
  },
];

export function CountDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="CountBadge beside the board's counts" note="Left: copies of the board's column head, phone tab and next-release pill, in its own CSS. Right: the same with levain's CountBadge. The board's amber is its own; levain's caution is --color-caution-fg.">
      <style>{BOARD_CSS}</style>
      <div className={'bc grid grid-cols-1 gap-x-md gap-y-sm ' + (BENCH ? 'sm:grid-cols-[10rem_1fr_1fr]' : 'sm:grid-cols-[10rem_1fr]')} data-demo="count">
        <span className="type-caption hidden text-[var(--color-text-faint)] sm:block" />
        {BENCH && <span className="type-label text-[var(--color-text-muted)]">Board</span>}
        <span className="type-label text-[var(--color-text-muted)]">levain CountBadge</span>
        {ROWS.map((r) => (
          <div key={r.name} className="contents">
            <span className="type-caption self-center text-[var(--color-text-muted)]">{r.name}</span>
            {BENCH && <div data-side="board" className="self-center">{r.board}</div>}
            <div data-side="levain" className="self-center">{r.levain}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}
