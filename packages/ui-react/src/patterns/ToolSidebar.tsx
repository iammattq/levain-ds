'use client';

import { ReactNode, useCallback, useRef, useState } from 'react';

import { Tabs } from '../components/Tabs';
import { cn } from '../utils/cn';

export type ToolSidebarSize = 'hug' | 'sm' | 'default' | 'lg';

const SIDEBAR_WIDTHS: Record<Exclude<ToolSidebarSize, 'hug'>, number> = {
  sm: 240,
  default: 280,
  lg: 320,
};

/**
 * The same widths as static classes, for the collapsible variant.
 *
 * A collapsible sidebar cannot take its width from an inline style, because
 * that style would apply below the breakpoint too, where the panel spans the
 * screen. Static classes can carry the `md:` prefix; a value interpolated into
 * a class name cannot, since Tailwind scans source text.
 */
const SIDEBAR_WIDTH_CLASSES: Record<Exclude<ToolSidebarSize, 'hug'>, string> = {
  sm: 'md:w-[240px]',
  default: 'md:w-[280px]',
  lg: 'md:w-[320px]',
};

/**
 * Where a resized panel is allowed to sit, as fractions of the viewport.
 *
 * The floor is roughly a label, a track and a tab strip; the ceiling stops
 * short of the whole screen, because watching the canvas while a control moves
 * is the point of the panel.
 */
const MIN_FRACTION = 0.22;
const MAX_FRACTION = 0.8;
/** Where it opens. Four or five controls, and most of the canvas still there. */
const DEFAULT_FRACTION = 0.42;

/** One group of controls. On a phone these become the tab strip. */
export type ToolSection = {
  id: string;
  label: string;
  content: ReactNode;
};

export interface ToolSidebarProps {
  /** Content to render in the sidebar. Ignored when `sections` is given. */
  children?: ReactNode;
  /**
   * Controls grouped into named sections.
   *
   * Rendered as labelled groups down the sidebar on a wide screen, and as a
   * tab strip with one group showing on a phone. The grouping is the whole
   * reason the panel is usable small: a lab can carry twenty controls, and
   * scrolling a column of twenty on a phone is not tuning, it is hunting.
   */
  sections?: ToolSection[];
  /** Preset size of the sidebar. 'hug' lets content determine width. */
  size?: ToolSidebarSize;
  /** Custom width in pixels (overrides size, ignored if size is 'hug') */
  width?: number;
  /** Position of the sidebar */
  position?: 'left' | 'right';
  /** Fixed footer content (primary actions) - renders below scrollable area */
  footer?: ReactNode;
  /**
   * Below `md`, become a control panel across the bottom instead of a sidebar
   * down the side.
   *
   * Opt-in rather than automatic: the tool sidebars inside a multi-pane editor
   * are not rescued by moving them to the bottom, and the ones inside admin
   * have no small-screen story to change. Off, the markup is what it was.
   */
  collapsible?: boolean;
}

/**
 * ToolSidebar - Figma-style sidebar for design-system tool controls
 *
 * Provides consistent styling for control sidebars in tools:
 * - Preset sizes: hug (fit-content), sm (240px), default (280px), lg (320px)
 * - Border on the appropriate side
 * - Section background
 * - Thin scrollbar
 * - Proper flex structure for scrolling
 * - Optional fixed footer for primary actions
 *
 * With `collapsible`, it becomes a control panel across the bottom below `md`:
 * a fixed share of the viewport, the active section's controls scrolling
 * inside it, and a tab strip pinned along the bottom.
 *
 * It opens at a height worth working in and can be dragged taller from the
 * grip, which is a different thing from opening at one control and requiring a
 * resize before anything can be done. The grouping is what makes the default
 * usable; the grip is for when a section is long.
 *
 * The drag is on the grip alone, and it only works because the window body
 * around it no longer scrolls. The first attempt was competing with an
 * enclosing scroller: a vertical pan gets claimed by the scroller and arrives
 * as pointercancel rather than pointermove, so the gesture was gone before the
 * handler saw it.
 */
export function ToolSidebar({
  children,
  sections,
  size = 'default',
  width,
  position = 'right',
  footer,
  collapsible = false,
}: ToolSidebarProps) {
  const isHug = size === 'hug';
  const resolvedWidth = isHug ? undefined : (width ?? SIDEBAR_WIDTHS[size]);
  const borderClass =
    position === 'right'
      ? 'border-l border-[var(--color-border-subtle)]'
      : 'border-r border-[var(--color-border-subtle)]';

  const asideRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(sections?.[0]?.id ?? '');
  /**
   * Panel height in pixels, or null before it has been dragged.
   *
   * Null leaves the height to the class, which is a viewport fraction and so
   * survives a rotation; a dragged height is the viewer's and is kept.
   */
  const [height, setHeight] = useState<number | null>(null);
  const dragRef = useRef<{ y: number; height: number } | null>(null);

  const onGripDown = useCallback((event: React.PointerEvent) => {
    const element = asideRef.current;
    if (!element) return;
    dragRef.current = {
      y: event.clientY,
      height: element.getBoundingClientRect().height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onGripMove = useCallback((event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const viewport = window.innerHeight;
    // Dragging up makes the panel taller, so the delta is inverted.
    const next = drag.height + (drag.y - event.clientY);
    setHeight(
      Math.min(viewport * MAX_FRACTION, Math.max(viewport * MIN_FRACTION, next))
    );
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const current =
    sections?.find((section) => section.id === active) ?? sections?.[0];

  /**
   * Every section, labelled. What the sidebar shows on a wide screen, where
   * there is room for the whole set at once and a tab strip would only add a
   * click to reach a control that was already visible.
   */
  const stacked = sections && (
    <div className="space-y-md">
      {sections.map((section) => (
        <div key={section.id}>
          <h3 className="type-label-sm mb-xs text-[var(--color-text-default)]">
            {section.label}
          </h3>
          <div className="space-y-2xs">{section.content}</div>
        </div>
      ))}
    </div>
  );

  return (
    <aside
      ref={asideRef}
      role="complementary"
      aria-label="Controls"
      className={cn(
        'flex shrink-0 flex-col bg-[var(--color-surface-section)]',
        collapsible
          ? [
              // A panel across the bottom, a sidebar from `md` up. The height
              // stops short of half the viewport: watching the canvas while a
              // control moves is the entire point of a tool panel.
              // The literal matches DEFAULT_FRACTION. Written out because
              // Tailwind scans source text: a class name built from a constant
              // is a class that never gets generated.
              height === null && 'h-[42dvh]',
              'w-full border-t border-[var(--color-border-subtle)]',
              'md:h-auto md:w-auto md:border-t-0',
              position === 'right'
                ? 'md:border-l md:border-[var(--color-border-subtle)]'
                : 'md:border-r md:border-[var(--color-border-subtle)]',
              !isHug && SIDEBAR_WIDTH_CLASSES[size],
            ]
          : borderClass
      )}
      style={
        collapsible
          ? height === null
            ? undefined
            : { height }
          : resolvedWidth
            ? { width: resolvedWidth }
            : undefined
      }
    >
      {collapsible && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize controls"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={endDrag}
          // A cancelled pointer is not a decision; the panel keeps its height.
          onPointerCancel={endDrag}
          // The browser must not claim this vertical pan for scrolling. It only
          // works because the window body around it no longer scrolls either —
          // the first attempt at this drag was competing with a scroller, and
          // lost the gesture before a single move arrived.
          className="flex shrink-0 cursor-row-resize touch-none items-center justify-center py-2 md:hidden"
        >
          <span
            aria-hidden="true"
            className="h-1 w-9 rounded-full bg-[var(--color-border-default)]"
          />
        </div>
      )}
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {sections ? (
          <>
            {/* One section on a phone, all of them from `md` up. Both are
                rendered rather than switched at a breakpoint in state, so the
                server and the first client paint agree. */}
            <div className="md:hidden">
              <div className="space-y-2xs">{current?.content}</div>
            </div>
            <div className="hidden md:block">{stacked}</div>
          </>
        ) : (
          children
        )}
      </div>
      {sections && sections.length > 1 && (
        <div className="scrollbar-hide shrink-0 overflow-x-auto border-t border-[var(--color-border-subtle)] p-2 md:hidden">
          <Tabs
            size="sm"
            surface="section"
            label="Control groups"
            value={current?.id ?? ''}
            onChange={setActive}
            tabs={sections.map((section) => ({
              value: section.id,
              label: section.label,
            }))}
          />
        </div>
      )}
      {footer && (
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">
          {footer}
        </div>
      )}
    </aside>
  );
}
