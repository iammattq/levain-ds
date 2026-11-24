// T47: a copy of the portfolio photo explorer's loading skeleton (portfolio-ai/apps/portfolio/src/components/public/
// photos-ai/PhotosAIExplorer.tsx, LoadingSkeleton), verbatim but for the export and its viewMode type: what levain's
// Skeleton is compared against.
import type { FC } from 'react';

type ViewMode = 'clusters' | 'mood' | 'timeOfDay' | 'color';

export const LoadingSkeleton: FC<{ viewMode: ViewMode }> = ({ viewMode }) => {
  const groupCount = viewMode === 'clusters' ? 4 : 6;

  return (
    <div className="space-y-8">
      {Array.from({ length: groupCount }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-[var(--color-surface-section)]" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, j) => (
              <div
                key={j}
                className="aspect-square animate-pulse rounded-lg bg-[var(--color-surface-section)]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
