'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { cn } from '../utils/cn';
import Section, { SectionProps } from './Section';

// Define the padding size type based on SectionProps
type PaddingSize = SectionProps['padding'];

// Type for individual section data
export interface SectionTabData {
  id: string;
  title: string;
  disabled?: boolean; // Optional: to disable specific tabs
  icon?: ReactNode; // Optional: icon to display before the title
  badge?: ReactNode; // Optional: badge or indicator to display after the title
}

// Props for the SectionTabs component
export interface SectionTabsProps {
  sections: SectionTabData[];
  children?: (activeSectionId: string) => React.ReactNode; // Optional children render prop (for uncontrolled)
  activeTabId?: string; // Optional: Makes component controlled
  onTabChange?: (tabId: string) => void; // Optional: Required if controlled, optional if uncontrolled
  initialSectionId?: string; // Optional: For uncontrolled initial state
  className?: string;
  containerClassName?: string; // Class for the outer container
  tabsClassName?: string; // Class for the tabs navigation area
  contentClassName?: string; // Class for the content area wrapper (uncontrolled mode)
  contentPadding?: PaddingSize; // Add contentPadding prop
}

/**
 * SectionTabs component for organizing content into distinct tabbed sections.
 *
 * @example
 * ```tsx
 * // Basic usage with icons
 * <SectionTabs
 *   sections={[
 *     {
 *       id: 'tab1',
 *       title: 'First Tab',
 *       icon: <Icon className="h-4 w-4 mr-2" />
 *     },
 *     {
 *       id: 'tab2',
 *       title: 'Second Tab',
 *       badge: <span className="ml-2 bg-red-500 text-white rounded-full text-xs px-2">New</span>
 *     }
 *   ]}
 *   activeTabId="tab1"
 *   onTabChange={handleTabChange}
 * />
 * ```
 */
const SectionTabs: React.FC<SectionTabsProps> = ({
  sections,
  children,
  activeTabId,
  onTabChange,
  initialSectionId,
  className,
  containerClassName,
  tabsClassName,
  contentClassName,
  contentPadding, // Destructure the new prop
}) => {
  // Determine if the component is controlled
  const isControlled = activeTabId !== undefined;

  // Internal state for uncontrolled mode
  const [internalActiveTabId, setInternalActiveTabId] = useState<string>(() => {
    if (isControlled) return ''; // Don't initialize if controlled
    const initial =
      initialSectionId &&
      sections.some((s) => s.id === initialSectionId && !s.disabled)
        ? initialSectionId
        : sections.find((s) => !s.disabled)?.id;
    return initial || '';
  });

  // Effect to handle initial/default state for uncontrolled mode
  useEffect(() => {
    if (!isControlled) {
      // Ensure an initial tab is set if none is active or initialSectionId changes
      const currentIsValid = sections.some(
        (s) => s.id === internalActiveTabId && !s.disabled
      );
      if (
        !currentIsValid ||
        (initialSectionId && initialSectionId !== internalActiveTabId)
      ) {
        const initial =
          initialSectionId &&
          sections.some((s) => s.id === initialSectionId && !s.disabled)
            ? initialSectionId
            : sections.find((s) => !s.disabled)?.id;
        setInternalActiveTabId(initial || '');
      }
    }
    // Intentionally excluding internalActiveTabId from deps to only react to prop/section changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, initialSectionId, sections]);

  // Determine the effective active ID based on mode
  const currentActiveId = isControlled ? activeTabId : internalActiveTabId;

  if (!sections || sections.length === 0) {
    return null;
  }

  // Validate the effective active ID
  const currentActiveTabExistsAndEnabled = sections.some(
    (s) => s.id === currentActiveId && !s.disabled
  );
  if (!currentActiveId || !currentActiveTabExistsAndEnabled) {
    // If uncontrolled, state update will handle it soon. If controlled, log warning.
    if (isControlled) {
      console.warn(
        `SectionTabs: Invalid or disabled activeTabId provided: ${activeTabId}`
      );
    }
    // Don't render tabs if no valid active tab ID is available yet (especially on initial uncontrolled render)
    return null;
  }

  const handleTabClick = (tabId: string) => {
    if (!isControlled) {
      setInternalActiveTabId(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <div className={cn(containerClassName)}>
      {/* Tab Navigation */}
      <div
        className={cn(
          'mb-0 flex gap-1 border-b-2 border-[var(--color-border-subtle)]',
          tabsClassName
        )}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            disabled={section.disabled}
            className={cn(
              'type-label rounded-t-md border border-b-0 border-[var(--color-border-subtle)] bg-[var(--color-surface-canvas)] px-4 py-2',
              'transition-colors duration-200 ease-in-out',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'flex items-center', // Added for icon alignment
              currentActiveId === section.id
                ? 'bg-[var(--color-accent)] text-[var(--color-text-default)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]',
              className
            )}
            onClick={() => {
              if (!section.disabled) {
                handleTabClick(section.id);
              }
            }}
          >
            {section.icon && (
              <span className="mr-2 inline-flex">{section.icon}</span>
            )}
            <span>{section.title}</span>
            {section.badge && (
              <span className="ml-2 inline-flex">{section.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area - Use Section component */}
      {!isControlled && children && (
        <Section
          className={cn('rounded-t-none', contentClassName)}
          padding={contentPadding ?? 'md'} // Set padding, default to 'md'
        >
          {children(currentActiveId)}
        </Section>
      )}
    </div>
  );
};

export default SectionTabs;
