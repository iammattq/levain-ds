// T24: dialogs on a phone. A tall StatusCardDialog (Ringmaster's T50 decide, the text from the board's screenshot that
// ran off the bottom) and a look-and-decide pair in a StatusCardDialogStack. ?only=sheet shows only this section; with
// ?open=single or ?open=stack it opens that one on load (for captures).
import { Button, StatusCard, StatusCardDialog, StatusCardDialogStack } from '@levain/ui-react';
import { Image as ImageIcon, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BENCH, plain, sample } from './bench';

const T50_Q = 'At 1440 the PM line in the header no longer fits during a restart, now that the 2 minor pill sits beside it. While it says Waiting for the PM... or Updating the handoff..., it shrinks to the icon alone. How should it read?';
const T50_REC = 'PM recommends: A: short words on the line (Waiting..., Handoff..., Restarting...), with the full words on hover, for screen readers and in the popover. It never drops to the icon and nothing else moves.';
const T50_CONTEXT = 'PM context: restart from the board and auto compaction. When the PM context is red, the PM vitals in the header offer Restart: wait for the PM between turns, make sure the handoff is current, start a fresh PM session from it. The harness starts the PM to compact itself at 350k, with a PreCompact hook steering the summary (board, open asks, members in flight); after the second compaction in a session the board offers Restart (D327).';
const T50_OPTIONS = ['A: short words on the line, full words on hover', 'B: let it show only the icon mid-restart', 'C: always reserve room for the long words (crowds the groups either side)'];

// the catalogue's words: the same decision, told without the team's own names and codes (the bench keeps the board's text)
const WORDS = BENCH ? { q: T50_Q, rec: T50_REC, from: 'From your card T50 · Nov 23', context: T50_CONTEXT } : {
  q: 'At 1440 the status line in the header no longer fits during a restart, now that the version pill sits beside it. While it says Waiting for the session... or Saving notes..., it shrinks to the icon alone. How should it read?',
  rec: 'Recommended: A: short words on the line (Waiting..., Saving..., Restarting...), with the full words on hover, for screen readers and in the popover. It never drops to the icon and nothing else moves.',
  from: 'From your card #50 · Nov 23',
  context: 'Context: a restart from the header. When the session runs long, the header offers Restart: wait for a quiet moment, save the notes, start a fresh session from them. The words on the line change as each step runs, and the line has room for only a few of them beside the pill.',
};

export const t50 = { id: 'T50', number: plain('T50'), kind: { label: 'Decide', tone: 'caution' as const }, title: BENCH ? 'T50: restart words that fit' : 'Restart words that fit', markers: [{ label: '3 options' }] };

export function T50Body({ onPick }: { onPick: () => void }) {
  return (
    <div className="space-y-sm" data-demo="sheet-t50">
      <p className="type-body text-[var(--color-text-default)]">{WORDS.q}</p>
      <p className="type-body-sm text-[var(--color-text-muted)]">{WORDS.rec}</p>
      <hr className="border-[var(--color-border-subtle)]" />
      <p className="type-caption text-[var(--color-text-muted)]">{WORDS.from}</p>
      <p className="type-body-sm text-[var(--color-text-muted)]">{WORDS.context}</p>
      <div className="flex flex-col items-start gap-xs">
        {T50_OPTIONS.map((o, i) => <Button key={o} size="sm" variant={i === 0 ? 'primary' : 'outline'} data-demo={`sheet-answer-${i}`} onClick={onPick}>{o}</Button>)}
      </div>
      <label className="block space-y-3xs">
        <span className="type-body-sm text-[var(--color-text-default)]">Or answer in your own words</span>
        <textarea rows={4} data-demo="sheet-own-words" className="block w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-xs type-body-sm" />
      </label>
    </div>
  );
}

export function SheetDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const start = new URLSearchParams(location.search).get('open');
  const [single, setSingle] = useState(start === 'single');
  const [pair, setPair] = useState(start === 'stack');
  const [step, setStep] = useState(0);
  const look = sample({ id: 'L9', number: 'L9 · 1 of 2', kind: { label: 'Look', tone: 'accent' as const }, title: 'The header at 1440, mid-restart', markers: [{ icon: User, label: 'Matt' }, { icon: ImageIcon, label: '2', title: '2 images' }],
    children: (
      <div className="space-y-sm" data-demo="sheet-look">
        <div className="aspect-[16/9] rounded-[var(--radius-lg)] bg-[var(--color-surface-section)]" />
        <p className="type-body-sm text-[var(--color-text-muted)]">The look comes first; the decision it's for waits behind it.</p>
        <div><Button size="sm" variant="primary" data-demo="sheet-next" onClick={() => setStep(1)}>Next</Button></div>
      </div>
    ) });
  const decide = { ...t50, number: plain('T50 · 2 of 2'), children: (
    <div className="space-y-sm">
      <T50Body onPick={() => setPair(false)} />
      <div><Button size="sm" variant="ghost" data-demo="sheet-back" onClick={() => setStep(0)}>Back</Button></div>
    </div>
  ) };
  return (
    <Section title="Dialogs on a phone" note="A tall decide (the board's T50) and a look over its decide. Below md they open as bottom sheets: they rise from the bottom, scroll inside, and close by the handle (swipe down), the ✕, a tap outside or Escape.">
      <div className="grid max-w-sm gap-xs" data-demo="sheet-cards">
        <StatusCard {...t50} open={single} onOpen={() => setSingle(true)} />
        <StatusCard id="L9" number={plain('L9')} kind={look.kind} title={look.title} markers={look.markers} open={pair} onOpen={() => { setStep(0); setPair(true); }} />
      </div>
      <StatusCardDialog {...t50} open={single} onClose={() => setSingle(false)}>
        <T50Body onPick={() => setSingle(false)} />
      </StatusCardDialog>
      <StatusCardDialogStack dialogs={pair ? [look, decide].slice(step) : []} onClose={() => setPair(false)} cardId="L9" />
    </Section>
  );
}
