import React from 'react';
import { cn } from '../utils/cn';
import Heading from '../components/Heading';

export interface TimelineItemData {
  period: string;
  title: string;
}

export interface TimelineGroupData {
  company: string;
  roles: TimelineItemData[];
}

interface TimelineProps {
  groups: TimelineGroupData[];
  className?: string;
}

interface TimelineGroupProps {
  company: string;
  roles: TimelineItemData[];
  className?: string;
}

interface TimelineItemProps {
  period: string;
  title: string;
  isLast?: boolean;
  isCurrent?: boolean;
  className?: string;
}

/**
 * Individual timeline item with subway-stop marker
 * Uses flexbox to keep dot vertically centered with text
 */
export function TimelineItem({
  period,
  title,
  isLast = false,
  isFirst: _isFirst = false,
  isCurrent = false,
  className,
}: TimelineItemProps & { isFirst?: boolean }) {
  return (
    <div className={cn('flex gap-4', className)}>
      {/* Left column: dot + line */}
      <div className="flex flex-col items-center">
        {/* Line above dot (except first item) */}
        {/* Dot */}
        <div
          className={cn(
            'mt-1 h-3 w-3 flex-shrink-0 rounded-full border-2 border-[var(--color-primary)]',
            isCurrent
              ? 'animate-pulse bg-[var(--color-primary)]'
              : 'bg-[var(--color-surface-canvas)]'
          )}
        />
        {/* Line below dot (except last item) */}
        {!isLast && (
          <div className="mt-1 w-0.5 flex-1 bg-[var(--color-primary)]" />
        )}
      </div>

      {/* Right column: content */}
      <div className="flex flex-col pb-2">
        <span className="type-label text-[var(--color-text-muted)]">
          {title}
        </span>
        <span className="type-caption-compact leading-4 text-[var(--color-text-disabled)]">
          {period}
        </span>
      </div>
    </div>
  );
}

/**
 * Group of timeline items under a company heading
 */
export function TimelineGroup({
  company,
  roles,
  className,
  isFirstGroup = false,
}: TimelineGroupProps & { isFirstGroup?: boolean }) {
  return (
    <div className={cn('', className)}>
      <span className="type-label mb-1 block font-semibold text-[var(--color-text-default)]">
        {company}
      </span>
      <div className="mt-2">
        {roles.map((role, index) => (
          <TimelineItem
            key={`${role.period}-${role.title}`}
            period={role.period}
            title={role.title}
            isFirst={index === 0}
            isLast={index === roles.length - 1}
            isCurrent={isFirstGroup && index === 0}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Timeline container component
 * Renders multiple groups of timeline entries in a subway-stop style
 */
export function Timeline({ groups, className }: TimelineProps) {
  return (
    <div className={cn('', className)}>
      <Heading level="h4" showBar={false}>
        History
      </Heading>
      <div className="space-y-3">
        {groups.map((group, index) => (
          <TimelineGroup
            key={group.company}
            company={group.company}
            roles={group.roles}
            isFirstGroup={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

export default Timeline;
