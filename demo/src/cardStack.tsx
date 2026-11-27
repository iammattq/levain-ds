// T16: CardStack, levain's beside the board's own copy (compare/BoardCardStack.tsx), with the same cards. The row
// (desktop) and the pile (phone) each shown twice, levain's first. ?only=cardstack shows only this section (captures).
// A tap opens the card's dialog, which grows out of it (the stack card's layoutId is the dialog's morphId).
import { CardStack, StatusCardDialog, morphId } from '@levain/ui-react';
import { Layers } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CardStack as BoardCardStack } from './compare/BoardCardStack';
import { BENCH } from './bench';

type Who = 'levain-row' | 'board-row' | 'levain-pile' | 'board-pile';
type Work = { key: string; kind: string; title: string; line: string };
const WORK: Work[] = [
  { key: 'T50', kind: 'Decide · T50', title: 'Restart words that fit in the header at 1440', line: 'PM recommends A: short words on the line' },
  { key: 'L9', kind: 'Look · L9', title: 'The header at 1440, mid-restart', line: '2 images · from eng1' },
  { key: 'T36', kind: 'Decide · T36', title: 'A look and its decide as one card', line: 'Blocks eng2' },
  { key: 'A3', kind: 'Alarm · eng3', title: 'Tests red on main after the merge', line: '4 failing in SortableList' },
  { key: 'Q12', kind: 'Answer · Q12', title: 'Which theme does the phone start on?', line: 'The system setting, then yours' },
  { key: 'T61', kind: 'Decide · T61', title: 'Keep the bell in the phone header or move it to More', line: '2 options' },
  { key: 'L14', kind: 'Look · L14', title: 'Completed tab, empty state', line: '1 image · from eng2' },
  { key: 'T70', kind: 'Decide · T70', title: 'How long a card stays in Completed before it archives', line: 'PM recommends a week' },
];

/** A stack card as the board draws one (board.css .card.compact): a top line, a title of two lines at most, one line under it. */
function Face({ w }: { w: Work }) {
  return (
    <div className="h-[118px] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] p-xs shadow-[var(--elevation-1)]">
      <p className="type-caption text-[var(--color-text-muted)]">{w.kind}</p>
      <p className="type-body-sm mt-3xs line-clamp-2 font-medium text-[var(--color-text-default)]">{w.title}</p>
      <p className="type-caption mt-3xs truncate text-[var(--color-text-muted)]">{w.line}</p>
    </div>
  );
}

const Label = ({ children }: { children: ReactNode }) => <p className="type-caption text-[var(--color-text-faint)]">{children}</p>;

export function CardStackDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  // the open card: which of the four stacks, and its key. Each stack's cards (and so their dialogs) have ids of their
  // own, so no two elements on the page share a layoutId. The last one opened stays mounted, so it collapses back.
  const [open, setOpen] = useState<{ who: Who; key: string } | null>(null);
  const [last, setLast] = useState<{ who: Who; key: string }>({ who: 'levain-row', key: WORK[0]!.key });
  const [count, setCount] = useState(WORK.length);
  const items = WORK.slice(0, count);
  const id = (who: Who, k: string) => who + '-' + k;
  const lastW = WORK.find(w => w.key === last.key)!;
  const props = (who: Who) => ({
    items, getKey: (w: Work) => w.key, renderItem: (w: Work) => <Face w={w} />, label: 'Your work', icon: <Layers size={16} aria-hidden />,
    openKey: open?.who === who ? open.key : null, onOpen: (k: string) => { setOpen({ who, key: k }); setLast({ who, key: k }); }, layoutId: (k: string) => morphId(id(who, k)),
    empty: <div className="flex h-[118px] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-emphasis)] type-caption text-[var(--color-text-muted)]">No tasks for you right now</div>,
  });
  return (
    <Section title="Card stack: a row that piles at the right, a pile on phones" note="Scroll the row sideways (trackpad, Shift and the wheel, or drag it): cards peel off the right pile and pile at the left, following the scroll on a spring, settling on a whole card. Swipe a pile's top card to step. Show all spreads either out. levain's first, the board's own copy under it.">
      <div className="flex flex-wrap items-center gap-xs type-caption text-[var(--color-text-muted)]">
        Cards
        {[0, 1, 3, WORK.length].map(n => (
          <button key={n} type="button" data-demo={`stack-count-${n}`} onClick={() => setCount(n)} aria-pressed={count === n}
            className="rounded-full bg-[var(--color-surface-section)] px-xs py-3xs aria-pressed:bg-[var(--color-state-active)]">{n}</button>
        ))}
      </div>
      <div className="space-y-md" data-demo="stack-rows">
        <div data-demo="stack-row-levain" className="space-y-3xs"><Label>levain · row</Label><CardStack variant="row" cardWidth={232} {...props('levain-row')} /></div>
        {BENCH && <div data-demo="stack-row-board" className="space-y-3xs"><Label>board's copy · row</Label><BoardCardStack variant="row" cardWidth={232} {...props('board-row')} /></div>}
      </div>
      <div className="grid gap-md sm:grid-cols-2" data-demo="stack-piles">
        <div data-demo="stack-pile-levain" className="max-w-[360px] space-y-3xs"><Label>levain · pile</Label><CardStack variant="pile" {...props('levain-pile')} /></div>
        {BENCH && <div data-demo="stack-pile-board" className="max-w-[360px] space-y-3xs"><Label>board's copy · pile</Label><BoardCardStack variant="pile" {...props('board-pile')} /></div>}
      </div>
      <StatusCardDialog id={id(last.who, lastW.key)} number={lastW.key} title={lastW.title} open={!!open} onClose={() => setOpen(null)}>
        <p className="type-body-sm text-[var(--color-text-muted)]">{lastW.line}</p>
      </StatusCardDialog>
    </Section>
  );
}
