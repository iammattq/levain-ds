// T8: Column, the board's desktop column, levain's beside the board's own copy (compare/BoardColumn.tsx) with the same
// three columns and cards, laid out as the board's kanban (1fr 1fr 1.2fr, 16 px apart). Then a column with `scroll` in a
// fixed height, and Stack and Cluster. ?only=column shows only this section; with &column=levain or &column=board, only
// that kanban (for captures: each at the same place on the screen).
import { BOARD_COLUMN_CSS, BoardColumn, StatusIcon, type Status } from './compare/BoardColumn';
import { Cluster, Column, Stack, StatusCard, Tag } from '@levain/ui-react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { BENCH, plain } from './bench';

type Item = { id: string; title: string };
const COLS: { title: string; glyph: Status; items: Item[]; marks?: boolean; action?: 'add' | 'settings' }[] = [
  { title: 'Ideas', glyph: 'todo', action: 'add', items: [
    { id: 'T4', title: 'Board: two tabs, Work board and Completed' },
    { id: 'T5', title: 'The comment box is one line and cuts off what I type' },
    { id: 'T6', title: 'Drag and drop on the board' },
  ] },
  { title: 'Queued', glyph: 'queued', items: [
    { id: 'T2', title: 'Release v0.13.0: BN1, BN2 and IR1; notes first' },
    { id: 'T3', title: 'Bench background options and the condenser line fix' },
  ] },
  { title: 'In progress', glyph: 'idle', marks: true, action: 'settings', items: [
    { id: 'T7', title: 'CountBadge: the number beside a column heading' },
    { id: 'T8', title: 'Safe-area padding for the notch' },
  ] },
];

// the board's head controls: a round 18 px icon button (Board.tsx addButton), and the In progress marks (Board.tsx ~513)
const iconButton = (label: string, icon: ReactNode) => (
  <button type="button" aria-label={label} className="block rounded-full p-3xs text-[var(--color-text-muted)] hover:bg-[var(--color-state-hover)]">{icon}</button>
);
const action = (a?: 'add' | 'settings') => a === 'add' ? iconButton('Add idea', <Plus size={18} />) : a === 'settings' ? iconButton('Pool settings', <SlidersHorizontal size={18} />) : undefined;
const marks = <span className="marks" role="img" aria-label="1 waiting on you, 1 blocked"><StatusIcon status="you" /><StatusIcon status="blocked" /></span>;
const cards = (items: Item[], prefix = '') => items.map(it => <StatusCard key={it.id} id={prefix + it.id} number={plain(it.id)} title={it.title} />);

const grid = 'grid items-start gap-sm';
const cols = { gridTemplateColumns: '1fr 1fr 1.2fr' };

const MORE: Item[] = [
  ...COLS.flatMap(c => c.items),
  { id: 'T9', title: 'Timeline of a task, newest first' },
];

export function ColumnDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const only = new URLSearchParams(location.search).get('column');
  return (
    <Section title="Columns, as on the board's desktop" note="levain's Column: a glyph, the title, the count, marks and an action pushed right, over cards 24 px apart. In light the column takes the hairline token, a step below the page (there is no sunken surface yet). Under it, the board's own column (a copy) with the same cards.">
      <style>{BOARD_COLUMN_CSS}</style>
      {only !== 'board' && <>
        <p className="type-caption text-[var(--color-text-muted)]">levain's Column</p>
        <div data-compare="levain" data-demo="columns" className={'rm-glyphs ' + grid} style={cols}>
          {COLS.map(c => (
            <Column key={c.title} title={c.title} icon={<StatusIcon status={c.glyph} />} count={c.items.length} marks={c.marks ? marks : undefined} action={action(c.action)}>
              {cards(c.items)}
            </Column>
          ))}
        </div>
      </>}
      {BENCH && only !== 'levain' && <>
        <p className="type-caption pt-md text-[var(--color-text-muted)]">The board's own column (a copy, for comparison)</p>
        <div data-compare="board" data-demo="columns" className={'rmb rm-glyphs ' + grid} style={cols}>
          {COLS.map(c => (
            <BoardColumn key={c.title} title={c.title} glyph={c.glyph} count={c.items.length} marks={c.marks ? marks : undefined} action={action(c.action)}>
              {cards(c.items, 'b-')}
            </BoardColumn>
          ))}
        </div>
      </>}
      {!only && <>
        <p className="type-caption pt-md text-[var(--color-text-muted)]">With scroll, in a 22rem box: the cards scroll, the header stays</p>
        <div data-demo="column-scroll" className="rm-glyphs h-[22rem] max-w-sm">
          <Column scroll title="Everything" icon={<StatusIcon status="queued" />} count={MORE.length}>{cards(MORE, 's-')}</Column>
        </div>
        <p className="type-caption pt-md text-[var(--color-text-muted)]">Stack (gap sm) of Clusters (gap 2xs, wrapping)</p>
        <Stack gap="sm" data-demo="stack" className="max-w-md">
          <Cluster gap="2xs">{['design', 'tokens', 'motion', 'layout', 'density', 'phone', 'desktop'].map(t => <Tag key={t}>{t}</Tag>)}</Cluster>
          <Cluster gap="2xs" justify="between"><span className="type-body-sm">Left</span><span className="type-body-sm text-[var(--color-text-muted)]">Right, pushed by justify between</span></Cluster>
        </Stack>
      </>}
    </Section>
  );
}
