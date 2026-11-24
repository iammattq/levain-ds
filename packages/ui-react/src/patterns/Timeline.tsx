import React from 'react';
import { cn } from '../utils/cn';
import Heading from '../components/Heading';
import { EntryRow, TimelineList } from './TimelineList';

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
 * Individual timeline item with subway-stop marker, on its own (a div). Inside a group the roles are a TimelineList.
 */
export function TimelineItem({
  period,
  title,
  isLast = false,
  isFirst: _isFirst = false,
  isCurrent = false,
  className,
}: TimelineItemProps & { isFirst?: boolean }) {
  return <EntryRow as="div" date={period} title={title} isLast={isLast} current={isCurrent} className={className} />;
}

/**
 * Group of timeline items under a company heading: the company, then its roles as a TimelineList
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
      <TimelineList
        className="mt-2"
        entries={roles.map((role, index) => ({
          date: role.period,
          title: role.title,
          current: isFirstGroup && index === 0,
        }))}
      />
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
