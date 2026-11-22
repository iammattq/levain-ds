'use client';

import React, { useId, useRef, useMemo, KeyboardEvent } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../utils/cn';

// Container variants
const tabsContainerVariants = cva('inline-flex items-center rounded-lg p-1', {
  variants: {
    size: {
      compact: 'gap-0.5',
      sm: 'gap-1',
      md: 'gap-1',
    },
    surface: {
      canvas: 'bg-[var(--color-surface-subtle)]',
      section: 'bg-[var(--color-surface-canvas)]',
      card: 'bg-[var(--color-surface-canvas)]',
    },
  },
  defaultVariants: {
    size: 'md',
    surface: 'canvas',
  },
});

// Individual tab variants
const tabVariants = cva(
  'inline-flex items-center justify-center rounded-md cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-1',
  {
    variants: {
      size: {
        compact: 'type-label-compact h-6 px-2',
        sm: 'type-label-sm h-7 px-3',
        md: 'type-label h-8 px-4',
      },
      active: {
        true: 'bg-[var(--color-primary)] text-[var(--color-text-on-primary)]',
        false:
          'text-[var(--color-text-default)] hover:bg-[var(--color-state-hover)]',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      active: false,
      disabled: false,
    },
  }
);

export type TabItem = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface TabsProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently selected tab value */
  value: string;
  /** Callback when tab selection changes */
  onChange: (value: string) => void;
  /** Size variant */
  size?: 'compact' | 'sm' | 'md';
  /** The surface this component is placed on. Affects background color for proper contrast. */
  surface?: 'canvas' | 'section' | 'card';
  /** When true, tabs fill container width evenly */
  fill?: boolean;
  /** Disable all tabs */
  disabled?: boolean;
  /** Additional classes for the container */
  className?: string;
  /** Accessible label for the tablist (sr-only) */
  label?: string;
}

export function Tabs({
  tabs,
  value,
  onChange,
  size = 'md',
  surface = 'canvas',
  fill = false,
  disabled = false,
  className,
  label,
}: TabsProps) {
  const internalId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Memoize enabled tab indices for keyboard navigation
  const enabledIndices = useMemo(
    () =>
      tabs
        .map((tab, index) => (!tab.disabled && !disabled ? index : -1))
        .filter((index) => index !== -1),
    [tabs, disabled]
  );

  function getTargetIndex(
    key: string,
    currentEnabledIndex: number
  ): number | undefined {
    switch (key) {
      case 'ArrowRight':
      case 'ArrowDown':
        return enabledIndices[
          (currentEnabledIndex + 1) % enabledIndices.length
        ];
      case 'ArrowLeft':
      case 'ArrowUp':
        return enabledIndices[
          (currentEnabledIndex - 1 + enabledIndices.length) %
            enabledIndices.length
        ];
      case 'Home':
        return enabledIndices[0];
      case 'End':
        return enabledIndices[enabledIndices.length - 1];
      default:
        return undefined;
    }
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void {
    const currentEnabledIndex = enabledIndices.indexOf(index);
    if (currentEnabledIndex === -1) return;

    const targetIndex = getTargetIndex(e.key, currentEnabledIndex);
    if (targetIndex === undefined) return;

    e.preventDefault();
    tabRefs.current[targetIndex]?.focus();
    onChange(tabs[targetIndex].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        tabsContainerVariants({ size, surface }),
        fill && 'w-full',
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.value === value;
        const isDisabled = tab.disabled || disabled;

        return (
          <button
            key={tab.value}
            type="button"
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`${internalId}-tab-${index}`}
            aria-selected={isActive}
            aria-disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            className={cn(
              tabVariants({
                size,
                active: isActive,
                disabled: isDisabled,
              }),
              fill && 'flex-1'
            )}
            onClick={() => {
              if (!isDisabled) {
                onChange(tab.value);
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={isDisabled}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

Tabs.displayName = 'Tabs';

export { tabsContainerVariants, tabVariants };
