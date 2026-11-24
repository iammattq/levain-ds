/**
 * Where a fixed popover opened beside its trigger goes (ColorInput, GradientInput): level with the trigger and to its
 * left, as before; to its right when the left has no room (a swatch near the left edge); and always inside the window.
 */
export interface BesideTriggerInput {
  trigger: { left: number; right: number; top: number };
  /** The popover's measured width, and the height to keep room for below its top. */
  width: number;
  height: number;
  viewport: { width: number; height: number };
  /** Gap between trigger and popover. */
  offset?: number;
  /** Least distance from the window's edges. */
  margin?: number;
}

export function besideTrigger({
  trigger,
  width,
  height,
  viewport,
  offset = 8,
  margin = 8,
}: BesideTriggerInput): { left: number; top: number } {
  let left = trigger.left - offset - width;
  if (left < margin) {
    // no room on the left: the right side, pulled back inside the window if that overflows too
    left = Math.max(margin, Math.min(trigger.right + offset, viewport.width - margin - width));
  }
  let top = trigger.top;
  if (top + height > viewport.height - margin) top = viewport.height - height - margin;
  if (top < margin) top = margin;
  return { left, top };
}
