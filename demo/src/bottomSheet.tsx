// T10: the T24 sheet for any app, as BottomSheet. A filter list (a title and ✕, a body of its own) and the board's T50
// words in a plain BottomSheet, to set beside StatusCardDialog's phone sheet in the section above. It is a sheet at
// every width: the caller decides when to show one (useIsPhone). ?only=bottom-sheet shows only this section; with
// ?open=filters or ?open=t50 it opens that one on load (for captures).
import { BottomSheet, Button, Checkbox, useIsPhone } from '@levain/ui-react';
import { useState, type ReactNode } from 'react';
import { T50Body, t50 } from './sheet';

const FILTERS = ['Waiting on me', 'Blocked', 'Has images', 'Has links', 'Owned by the PM', 'Owned by eng1', 'Owned by eng2', 'Older than a day', 'Changed today', 'In a release'];

export function BottomSheetDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const start = new URLSearchParams(location.search).get('open');
  const [filters, setFilters] = useState(start === 'filters');
  const [words, setWords] = useState(start === 't50');
  const [on, setOn] = useState<string[]>(['Waiting on me']);
  const phone = useIsPhone();
  return (
    <Section title="A bottom sheet for any app" note={`BottomSheet: the same sheet as the dialogs above on a phone (handle, swipe down or flick to close, the ✕, a tap outside, Escape), with any head and body. It is a sheet at every width; the caller decides when to show one (useIsPhone says ${phone ? 'phone' : 'not a phone'} here).`}>
      <div className="flex flex-wrap gap-xs" data-demo="bottom-sheet-open">
        <Button size="sm" variant="outline" data-demo="bottom-sheet-filters" onClick={() => setFilters(true)}>Filters ({on.length})</Button>
        <Button size="sm" variant="outline" data-demo="bottom-sheet-t50" onClick={() => setWords(true)}>The T50 words in a BottomSheet</Button>
      </div>
      <BottomSheet open={filters} onClose={() => setFilters(false)} title="Filters">
        <div className="flex flex-col gap-xs" data-demo="bottom-sheet-filter-list">
          {FILTERS.map(f => (
            <Checkbox key={f} id={`filter-${f.replace(/\W+/g, "-")}`} label={f} checked={on.includes(f)} onChange={c => setOn(c ? [...on, f] : on.filter(x => x !== f))} />
          ))}
        </div>
        <div><Button size="sm" variant="primary" onClick={() => setFilters(false)}>Show results</Button></div>
      </BottomSheet>
      <BottomSheet open={words} onClose={() => setWords(false)} title={t50.title}>
        <T50Body onPick={() => setWords(false)} />
      </BottomSheet>
    </Section>
  );
}
