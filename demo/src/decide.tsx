// T17: a Decide StatusCard with its answers on the face (the actions slot), the PM's recommendation filled, beside a
// stand-in of the Ringmaster board's decide card (its card as drawn in board.css: meta 12 / title 16 / supporting 14,
// a 1.5rem inset) carrying the same answers the way the board wires them by hand today: stopPropagation on click and
// on pointerdown capture, per button. Both sit in a SortableGroup column, so a press on an answer can be tried
// against a drag from the rest of the card.
import { Button, SortableGroup, SortableList, StatusCard, StatusCardDialog, type SortableMove } from '@levain/ui-react';
import { Clock, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Decision = { id: string; title: string; q: string; options: string[]; rec: string; age: string };
const DECISIONS: Decision[] = [
  { id: 'D14', title: 'Strip or arc for the progress mark', q: 'The strip reads at a glance; the arc fits the ring.', options: ['Strip', 'Arc'], rec: 'Strip', age: '2h' },
  { id: 'D15', title: 'Where the release notes live', q: 'One file per release, or one running file.', options: ['Per release', 'Running file', 'Both'], rec: 'Running file', age: '25m' },
];

/** The answers: the recommended one filled (primary), the rest outlined. The consumer's own Buttons. */
const answers = (d: Decision, onPick: (d: Decision, o: string) => void) =>
  d.options.map(o => (
    <Button key={o} size="sm" variant={o === d.rec ? 'primary' : 'outline'} data-demo={`answer-${d.id}-${o}`} onClick={() => onPick(d, o)}>{o}</Button>
  ));

/** The board's decide card as drawn (board.css .card, .meta, .title, .line), its answers wired by hand. */
function BoardStandIn({ d, onOpen, onPick }: { d: Decision; onOpen: () => void; onPick: (d: Decision, o: string) => void }) {
  return (
    <article data-demo="board-decide" onClick={onOpen}
      style={{ backgroundColor: 'var(--color-surface-card)', borderRadius: 'var(--radius-lg, 0.5rem)', padding: '1.5rem', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--color-text-faint)' }}>
        <span><span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Decide</span> · {d.id}</span>
        <span>{d.age}</span>
      </div>
      <h3 style={{ margin: '0.25rem 0 0', fontSize: '1rem', lineHeight: 1.5, fontWeight: 500, color: 'var(--color-text-default)' }}>{d.title}</h3>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--color-text-muted)' }}>{d.q}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
        {d.options.map(o => (
          <Button key={o} size="sm" variant={o === d.rec ? 'primary' : 'outline'}
            // today's workaround, on every button: never the card's tap, never the start of a drag
            onClick={e => { e.stopPropagation(); onPick(d, o); }} onPointerDownCapture={e => e.stopPropagation()}>{o}</Button>
        ))}
      </div>
    </article>
  );
}

export function DecideDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const [open, setOpen] = useState<Decision | null>(null);
  const [picked, setPicked] = useState('Nothing answered yet.');
  const [cols, setCols] = useState({ levain: DECISIONS.map(d => d.id), board: DECISIONS.map(d => d.id) });
  const of = (id: string) => DECISIONS.find(d => d.id === id)!;
  const pick = (d: Decision, o: string) => setPicked(`${d.id}: ${o}${o === d.rec ? ' (recommended)' : ''}`);
  const onMove = (m: SortableMove) => setCols(c => {
    const from = m.from as 'levain', to = m.to as 'levain';
    if (from !== to) return c; // each column keeps its own copies
    const next = c[from].filter(k => k !== m.key);
    next.splice(m.index, 0, m.key);
    return { ...c, [from]: next };
  });
  const column = (heading: string, children: ReactNode) => (
    <div className="space-y-2xs rounded-[calc(var(--radius-lg)+0.25rem)] bg-[var(--color-surface-section)] p-2xs">
      <p className="type-label px-3xs text-[var(--color-text-muted)]">{heading}</p>
      {children}
    </div>
  );
  return (
    <Section title="A decision card with its answers on the face" note="levain's StatusCard with actions (left) beside the board's decide card as drawn, its answers wired by hand (right). The recommended answer is filled. A press on an answer never opens the card or starts a drag; the rest of the card opens on a tap and drags.">
      <div data-demo="decide" className="space-y-sm">
        <SortableGroup onMove={onMove}>
          <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
            {column('levain StatusCard, actions slot',
              <SortableList id="levain" label="levain" items={cols.levain} getKey={k => k} renderItem={k => {
                const d = of(k);
                return (
                  <StatusCard id={'lv-' + d.id} number={d.id} kind={{ label: 'Decide', tone: 'accent' }} title={d.title}
                    markers={[{ icon: User, label: 'PM' }, { icon: Clock, label: d.age, title: 'waiting ' + d.age }, { label: d.options.length + ' options' }]}
                    open={open?.id === d.id} onOpen={() => setOpen(d)} actions={answers(d, pick)} />
                );
              }} />,
            )}
            {column('Board stand-in, wired by hand',
              <SortableList id="board" label="board" items={cols.board} getKey={k => k} renderItem={k => <BoardStandIn d={of(k)} onOpen={() => setPicked(`${k} opened (the stand-in has no dialog)`)} onPick={pick} />} />,
            )}
          </div>
        </SortableGroup>
        <p className="type-body-sm text-[var(--color-text-muted)]" data-demo="decide-picked" aria-live="polite">{picked}</p>
      </div>
      <StatusCardDialog id={open ? 'lv-' + open.id : ''} open={!!open} onClose={() => setOpen(null)} number={open?.id} kind={{ label: 'Decide', tone: 'accent' }} title={open?.title ?? ''}>
        <p className="type-body-sm text-[var(--color-text-muted)]">{open?.q} PM recommends: {open?.rec}.</p>
        <div className="flex flex-wrap gap-2xs">{open && answers(open, (d, o) => { pick(d, o); setOpen(null); })}</div>
      </StatusCardDialog>
    </Section>
  );
}
