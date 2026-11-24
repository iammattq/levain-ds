// T9: the career Timeline (company, roles, its own "History" heading) beside the general TimelineList it is now built
// on, here as a release history like the Ringmaster board's Completed tab (version, date, a few lines). The list has no
// heading of its own; the caller puts one above it. ?only=timeline shows only this section (for captures).
import { Timeline, TimelineList, type TimelineEntryData } from '@levain/ui-react';
import type { ReactNode } from 'react';

const CAREER = [
  { company: 'Northwind', roles: [{ period: '2026 – now', title: 'Principal Design Engineer' }, { period: '2021 – 2025', title: 'Director, Design System' }] },
  { company: 'Contoso', roles: [{ period: '2018 – 2020', title: 'Lead Product Designer' }] },
];

const Lines = ({ lines }: { lines: [string, string][] }) => (
  <ul className="space-y-3xs">
    {lines.map(([id, text]) => (
      <li key={id} className="flex gap-xs">
        <span className="type-caption w-8 shrink-0 pt-[2px] tabular-nums text-[var(--color-text-faint,var(--color-text-muted))]">{id}</span>
        <span className="min-w-0">{text}</span>
      </li>
    ))}
  </ul>
);

const RELEASES: TimelineEntryData[] = [
  { title: 'v0.13.0', date: 'Nov 22, 2026', current: true, body: <Lines lines={[['T4', 'Board: two tabs, Work board and Completed'], ['T6', 'Drag and drop on the board'], ['T5', 'The comment box grows with what you type']]} /> },
  { title: 'v0.12.1', date: 'Nov 18, 2026', body: <Lines lines={[['T3', 'Fix: the condenser line no longer clips at 1440']]} /> },
  { title: 'v0.12.0', date: 'Nov 15, 2026', body: <Lines lines={[['BN1', 'Bench background options'], ['IR1', 'Release notes before the tag']]} /> },
  { title: 'v0.11.0', date: 'Nov 9, 2026' },
];

export function TimelineDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="Timelines: a career, and a release history" note="The career Timeline is built on TimelineList: dated entries (date, title, an optional body) in an ordered list, the current one's dot filled. The list has no heading; the release history's is the caller's.">
      <div className="grid grid-cols-1 gap-xl md:grid-cols-2">
        <div data-demo="timeline-career">
          <Timeline groups={CAREER} />
        </div>
        <div data-demo="timeline-releases" className="space-y-xs">
          <h3 className="type-label">Releases</h3>
          <TimelineList entries={RELEASES} />
        </div>
      </div>
    </Section>
  );
}
