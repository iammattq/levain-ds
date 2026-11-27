// T46: levain's EmptyState beside a copy of the Ringmaster board's empty Your work card (emptyStateBoard.tsx), both
// inside a copy of the board's page type (.rmb-copy), the full width of the row as CardStack shows it. Then levain's
// with an icon and an action, which the board doesn't have. ?only=empty shows only this section (for captures).
import { Button, EmptyState } from '@levain/ui-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { BoardEmptyStack, BoardPageStyle } from './emptyStateBoard';
import { BENCH } from './bench';

// the board's .card.compact height: calc(3rem + 1.5 × 0.75rem + 0.25rem + 3 × 1rem + 0.5rem + 1.5 × 0.875rem)
const CARD_HEIGHT = '9.1875rem';

const Side = ({ who, children }: { who: string; children: ReactNode }) => (
  <div className="space-y-xs" data-demo={`empty-${who}`}>
    <p className="type-caption text-[var(--color-text-faint)]">T46 · {who}</p>
    <div data-demo-empty={who}>{children}</div>
  </div>
);

export function EmptyStateDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="An empty state" note="EmptyState: a dashed outline, a muted centred message, an optional action. The board's empty Your work (a copy) first, then levain's, then levain's with an icon and an action.">
      <BoardPageStyle />
      <div className="rmb-copy space-y-xl">
        {BENCH && <Side who="board"><BoardEmptyStack /></Side>}
        <Side who="levain"><EmptyState message="No tasks for you right now" minHeight={CARD_HEIGHT} /></Side>
        <Side who="levain-action">
          <EmptyState icon={<Inbox size={20} />} message="Nothing queued" action={<Button size="sm" variant="outline">New task</Button>} minHeight={CARD_HEIGHT} />
        </Side>
      </div>
    </Section>
  );
}
