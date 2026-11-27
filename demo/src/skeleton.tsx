// T47: levain's Skeleton beside a copy of the portfolio photo explorer's loading skeleton (skeletonExplorer.tsx), in
// the explorer's own layout (4 groups: a title line over a grid of 6 squares). Only the shapes differ: levain's are
// Skeleton, inside a SkeletonGroup that says "Loading photos". ?only=skeleton shows only this section (for captures).
import { Skeleton, SkeletonGroup } from '@levain/ui-react';
import type { ReactNode } from 'react';
import { LoadingSkeleton } from './skeletonExplorer';
import { BENCH } from './bench';

/** The explorer's LoadingSkeleton (clusters: 4 groups) with levain's shapes. */
function LevainLoadingSkeleton() {
  return (
    <SkeletonGroup label="Loading photos" className="space-y-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton shape="line" width="8rem" height="1.5rem" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="aspect-square" />
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

const Side = ({ who, children }: { who: string; children: ReactNode }) => (
  <div className="space-y-xs" data-demo={`skeleton-${who}`}>
    <p className="type-caption text-[var(--color-text-faint)]">T47 · {who}</p>
    <div data-demo-shapes={who}>{children}</div>
  </div>
);

export function SkeletonDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="A skeleton" note="Skeleton: placeholder shapes while a list loads, on the section surface, pulsing softly (still under Reduce Motion). The portfolio photo explorer's (a copy) first, then levain's in the same layout.">
      <div className="space-y-xl">
        {BENCH && <Side who="explorer"><LoadingSkeleton viewMode="clusters" /></Side>}
        <Side who="levain"><LevainLoadingSkeleton /></Side>
      </div>
    </Section>
  );
}
