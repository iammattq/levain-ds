// T11: ColumnStrip, the board's phone columns. Four columns a screen wide under pills with counts; swipe, or tap a
// pill. Hold a card (on a touch screen, press and hold; with a mouse, drag) and rest it at either edge of the strip:
// it pages one column after 500 ms, then every 600 ms, as far as In progress (Review takes no drops here, as the
// board's In progress doesn't). On a phone the strip spans the screen; wider, it sits in a 390 px phone frame.
// Under it, a copy of the board's own strip (compare/BoardColumnStrip.tsx) with the same columns and cards, its own
// state: it pages at the screen's edges only, as on the board. ?only=strip shows only this section; with
// &strip=levain or &strip=board, only that strip (for captures: each at the same place on the screen).
import { BoardColumnStrip } from './compare/BoardColumnStrip';
import { ColumnStrip, CountBadge, SortableGroup, SortableList, StatusCard, useColumnStrip, type SortableMove } from '@levain/ui-react';
import { useState, type ReactNode } from 'react';
import { BENCH, plain } from './bench';

type Item = { id: string; title: string };
type Key = 'ideas' | 'queued' | 'progress' | 'review';
const START: Record<Key, Item[]> = {
  ideas: [
    { id: 'T4', title: 'Board: two tabs, Work board and Completed' },
    { id: 'T5', title: 'The comment box is one line and cuts off what I type' },
    { id: 'T6', title: 'Drag and drop on the board' },
  ],
  queued: [
    { id: 'T2', title: 'Release v0.13.0: BN1, BN2 and IR1; notes first' },
    { id: 'T3', title: 'Bench background options and the condenser line fix' },
  ],
  progress: [
    { id: 'T7', title: 'CountBadge: the number beside a column heading' },
    { id: 'T8', title: 'Safe-area padding for the notch' },
  ],
  review: [{ id: 'T1', title: 'Relative time that updates on its own' }],
};
const NAMES: Record<Key, string> = { ideas: 'Ideas', queued: 'Queued', progress: 'In progress', review: 'Review' };
const PAGEABLE: Key[] = ['ideas', 'queued', 'progress'];
const KEYS = Object.keys(NAMES) as Key[];

const moved = (m: SortableMove) => (l: Record<Key, Item[]>) => {
  const item = l[m.from as Key].find(i => i.id === m.key)!;
  const next = { ...l, [m.from]: l[m.from as Key].filter(i => i.id !== m.key) };
  const to = [...next[m.to as Key]];
  to.splice(m.index, 0, item);
  return { ...next, [m.to]: to };
};

/** A column's cards: a SortableList where a card may land, plain cards elsewhere. `id` prefixes the cards' ids, so the
 *  two strips' cards don't share layout ids. */
function body(k: Key, i: number, items: Item[], id = '') {
  return PAGEABLE.includes(k) ? (
    <SortableList id={k} order={i} label={NAMES[k]} items={items} getKey={it => it.id} className="min-h-24 space-y-2xs"
      renderItem={it => <StatusCard id={id + it.id} number={plain(it.id)} title={it.title} />}
      empty={<p className="type-caption p-xs text-[var(--color-text-muted)]">Nothing here. Drop a card.</p>} />
  ) : (
    <div className="space-y-2xs">{items.map(it => <StatusCard key={it.id} id={id + it.id} number={plain(it.id)} title={it.title} />)}</div>
  );
}

function BoardCopy() {
  const [lists, setLists] = useState(START);
  return <BoardColumnStrip pages={KEYS.map((k, i) => [NAMES[k], body(k, i, lists[k], 'b-')])} counts={KEYS.map(k => lists[k].length)} onMove={m => setLists(moved(m))} />;
}

export function StripDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [lists, setLists] = useState(START);
  const [at, setAt] = useState<string>('ideas');
  const drag = useColumnStrip();
  const onMove = (m: SortableMove) => setLists(moved(m));
  const columns = KEYS.map((k, i) => ({
    key: k,
    label: NAMES[k],
    count: <CountBadge count={lists[k].length} />,
    content: (
      <div className="px-sm pb-lg pt-sm">
        <div className="space-y-md rounded-[calc(var(--radius-lg)+0.25rem)] bg-[var(--color-surface-section)] p-xs">
          {body(k, i, lists[k])}
        </div>
      </div>
    ),
  }));
  const only = new URLSearchParams(location.search).get('strip');
  return (
    <Section title="A column strip, as on the board's phone" note="Swipe between columns, or tap a pill. Hold a card and rest it at either edge of the strip: the edge glows, then the strip pages one column, and again while you stay, as far as In progress. Drop it there. With Reduce Motion, pages and pill jumps are instant.">
      {only !== 'board' && <>
      <p className="type-caption text-[var(--color-text-muted)]">levain's ColumnStrip</p>
      <div data-demo="strip" data-compare="levain" className="-mx-md select-none sm:mx-0 sm:max-w-[390px] sm:overflow-hidden sm:rounded-[var(--radius-xl)] sm:border sm:border-[var(--color-border-subtle)]" style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}>
        <SortableGroup onMove={onMove} onDragChange={drag.onDragChange} onDragMove={drag.onDragMove}>
          <ColumnStrip drag={drag} columns={columns} current={at} onCurrentChange={setAt} pageable={PAGEABLE}
            pillsClassName="sticky top-0 z-20 border-b border-[var(--color-border-subtle)] px-sm pb-sm pt-1" />
        </SortableGroup>
      </div>
      <p className="type-caption text-[var(--color-text-muted)]" data-demo="strip-at">In view: {NAMES[at as Key]}</p>
      </>}
      {BENCH && only !== 'levain' && <>
      <p className="type-caption pt-md text-[var(--color-text-muted)]">The board's own strip (a copy, for comparison)</p>
      <div data-compare="board" className="-mx-md sm:mx-0 sm:max-w-[390px] sm:rounded-[var(--radius-xl)] sm:border sm:border-[var(--color-border-subtle)]">
        <BoardCopy />
      </div>
      </>}
    </Section>
  );
}
