// T70: the floating menu, as the designer's site uses it: a cream button in the corner that grows into a menu of four
// levels (links, a list, a draft that survives going back and closing, the theme). In the catalogue it sits in a stage
// (className="absolute"), not fixed to the page. ?only=fab shows only this section; ?open=fab opens it on load (for
// captures).
import { setTheme } from '@levain/tokens';
import { FabMenu, SegmentedControl, TextArea, type FabMenuItem } from '@levain/ui-react';
import { BookOpen, Briefcase, Palette, PenLine } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const link = 'type-body-sm block rounded-[var(--radius-sm)] px-2xs py-3xs text-[var(--color-text-default)] hover:bg-[var(--color-surface-canvas)]';

function Appearance() {
  const [mode, setMode] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  return (
    <SegmentedControl id="fab-theme" size="sm" value={mode} onChange={m => { setMode(m); setTheme(m as 'light' | 'dark'); }} options={[{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
  );
}

const ITEMS: FabMenuItem[] = [
  {
    id: 'work', label: 'Work', icon: Briefcase,
    content: <nav aria-label="Work" className="flex flex-col">{['Levain DS', 'Ringmaster', 'Portfolio'].map(w => <a key={w} href={`#${w}`} className={link}>{w}</a>)}</nav>,
  },
  {
    id: 'journal', label: 'Journal', icon: BookOpen,
    content: <ul className="type-body-sm flex flex-col gap-3xs text-[var(--color-text-muted)]"><li>Morphs that settle</li><li>A spring you can sample</li><li>Never blend the fill</li></ul>,
  },
  { id: 'write', label: 'Write to me', icon: PenLine, content: <TextArea label="Message" rows={3} placeholder="A draft stays while you look around" /> },
  { id: 'appearance', label: 'Appearance', icon: Palette, content: <Appearance /> },
];

export function FabMenuDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const startOpen = new URLSearchParams(location.search).get('open') === 'fab';
  return (
    <Section title="A floating menu" note="FabMenu: a round button in the corner that grows into a menu (460 ms on the spring; closing 260 ms), its fill switching in one step. Choose a row and it slides to that level; the back arrow, or Escape, comes back. Escape, a press outside or the cross closes it; a draft in Write to me survives. Under Reduce Motion it only fades.">
      <div data-demo="fab-stage" className="relative h-[30rem] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface-section)]">
        <FabMenu items={ITEMS} label="Site menu" fill="#f5e9cf" fillText="#2b2418" defaultOpen={startOpen} className="absolute" />
      </div>
    </Section>
  );
}
