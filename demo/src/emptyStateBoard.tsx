// T46: a copy of the Ringmaster board's empty Your work card (~/Projects/ringmaster/board/src/ly1/Board.tsx:239, its
// CSS from board.css: `.rmb` (the page's type and sizes), `.rmb .card`, `.card.compact`, `.card.stack-empty`), verbatim
// but for the scope (`.rmb-copy` for `.rmb`) and the hover, transition and entrance rules, which the empty card turns
// off or never shows: what levain's EmptyState is compared against.
const CSS = `
.rmb-copy {
  --rm-2xs: 0.75rem; --rm-xs: 0.875rem; --rm-sm: 1rem;
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: var(--rm-xs); line-height: 1.5; font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased;
  color: var(--color-text-default);
}
.rmb-copy .card { background-color: var(--color-surface-card); border-radius: var(--radius-lg, 0.5rem); padding: 1.5rem; box-shadow: inset 0 0 0 1px var(--color-border-subtle); text-align: left; }
.rmb-copy .card.compact { height: calc(3rem + 1.5 * var(--rm-2xs) + 0.25rem + 3 * var(--rm-sm) + 0.5rem + 1.5 * var(--rm-xs)); overflow: hidden; }
.rmb-copy .card.stack-empty { display: flex; align-items: center; justify-content: center; max-width: 100%; border: 1px dashed var(--color-border-emphasis); background: none; box-shadow: none; animation: none; color: var(--color-text-muted); font-size: var(--rm-xs); }
`;

export const BoardPageStyle = () => <style>{CSS}</style>;

/** The board's empty Your work, as Board.tsx renders it. */
export const BoardEmptyStack = () => (
  <div className="card compact stack-empty" data-empty-stack>No tasks for you right now</div>
);
