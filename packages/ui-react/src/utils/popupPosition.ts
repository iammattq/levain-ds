/**
 * Popup positioning utilities for design system components.
 * These functions help position dropdown menus, popovers, tooltips, and other popup elements
 * to ensure they remain within the viewport boundaries.
 */

export type PopupPlacement = 'top' | 'bottom' | 'left' | 'right';
export type PopupAlignment = 'start' | 'center' | 'end';

export interface PopupPosition {
  placement: PopupPlacement;
  alignment: PopupAlignment;
  transformOrigin: string;
  x: number; // offset in pixels
  y: number; // offset in pixels
}

export interface PositionConfig {
  /** Preferred placement of the popup (top, bottom, left, right) */
  preferredPlacement?: PopupPlacement;
  /** Preferred alignment within the placement (start, center, end) */
  preferredAlignment?: PopupAlignment;
  /** Minimum distance (in pixels) from the viewport edge */
  viewportMargin?: number;
  /** Allow flipping to opposite direction when there's not enough space */
  allowFlipping?: boolean;
  /** Whether to automatically adjust to stay within viewport (without flipping) */
  autoAdjust?: boolean;
  /** Optional fixed width for the popup (used for calculations) */
  popupWidth?: number;
  /** Optional fixed height for the popup (used for calculations) */
  popupHeight?: number;
  /** Optional offset from the trigger element */
  offset?: number;
}

/**
 * Calculate optimal popup position based on trigger element position and viewport constraints
 *
 * @param triggerElement - The element that triggers the popup (button, input, etc.)
 * @param popupElement - The popup element to position (if already in DOM, for size measurements)
 * @param config - Configuration options for positioning
 * @returns Optimal position data including placement, alignment, and transform origin
 */
export function calculatePopupPosition(
  triggerElement: HTMLElement,
  popupElement?: HTMLElement | null,
  config: PositionConfig = {}
): PopupPosition {
  // Default configuration
  const {
    preferredPlacement = 'bottom',
    preferredAlignment = 'start',
    viewportMargin = 8,
    allowFlipping = true,
    autoAdjust = true,
    offset = 4,
  } = config;

  // Get trigger element dimensions and position
  const triggerRect = triggerElement.getBoundingClientRect();

  // Get popup dimensions (either from element or config)
  const popupWidth = popupElement
    ? popupElement.offsetWidth
    : config.popupWidth || 0;
  const popupHeight = popupElement
    ? popupElement.offsetHeight
    : config.popupHeight || 0;

  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate available space in each direction
  const spaceAbove = triggerRect.top;
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceLeft = triggerRect.left;
  const spaceRight = viewportWidth - triggerRect.right;

  // Initialize with preferred placement
  let placement = preferredPlacement;
  const alignment = preferredAlignment;

  // Determine if we need to flip the placement
  if (allowFlipping) {
    if (
      placement === 'bottom' &&
      spaceBelow < popupHeight + viewportMargin &&
      spaceAbove > spaceBelow
    ) {
      placement = 'top';
    } else if (
      placement === 'top' &&
      spaceAbove < popupHeight + viewportMargin &&
      spaceBelow > spaceAbove
    ) {
      placement = 'bottom';
    } else if (
      placement === 'right' &&
      spaceRight < popupWidth + viewportMargin &&
      spaceLeft > spaceRight
    ) {
      placement = 'left';
    } else if (
      placement === 'left' &&
      spaceLeft < popupWidth + viewportMargin &&
      spaceRight > spaceLeft
    ) {
      placement = 'right';
    }
  }

  // Calculate base position based on placement
  let x = 0;
  let y = 0;

  switch (placement) {
    case 'top':
      y = -popupHeight - offset;
      break;
    case 'bottom':
      y = triggerRect.height + offset;
      break;
    case 'left':
      x = -popupWidth - offset;
      break;
    case 'right':
      x = triggerRect.width + offset;
      break;
  }

  // Calculate horizontal alignment for top/bottom placements
  if (placement === 'top' || placement === 'bottom') {
    switch (alignment) {
      case 'start':
        x = 0;
        break;
      case 'center':
        x = (triggerRect.width - popupWidth) / 2;
        break;
      case 'end':
        x = triggerRect.width - popupWidth;
        break;
    }
  }

  // Calculate vertical alignment for left/right placements
  if (placement === 'left' || placement === 'right') {
    switch (alignment) {
      case 'start':
        y = 0;
        break;
      case 'center':
        y = (triggerRect.height - popupHeight) / 2;
        break;
      case 'end':
        y = triggerRect.height - popupHeight;
        break;
    }
  }

  // Adjust to keep within viewport if autoAdjust is enabled
  if (autoAdjust) {
    // Check if popup extends beyond viewport boundaries
    const popupLeft = triggerRect.left + x;
    const popupTop = triggerRect.top + y;
    const popupRight = popupLeft + popupWidth;
    const popupBottom = popupTop + popupHeight;

    // Adjust horizontal position if needed
    if (popupLeft < viewportMargin) {
      x += viewportMargin - popupLeft;
    } else if (popupRight > viewportWidth - viewportMargin) {
      x -= popupRight - (viewportWidth - viewportMargin);
    }

    // Adjust vertical position if needed
    if (popupTop < viewportMargin) {
      y += viewportMargin - popupTop;
    } else if (popupBottom > viewportHeight - viewportMargin) {
      y -= popupBottom - (viewportHeight - viewportMargin);
    }
  }

  // Calculate transform-origin based on placement (for animations)
  let transformOrigin: string;

  switch (placement) {
    case 'top':
      transformOrigin = `bottom ${alignment}`;
      break;
    case 'bottom':
      transformOrigin = `top ${alignment}`;
      break;
    case 'left':
      transformOrigin = `right ${alignment}`;
      break;
    case 'right':
      transformOrigin = `left ${alignment}`;
      break;
    default:
      transformOrigin = 'center center';
  }

  // Return the calculated position data
  return {
    placement,
    alignment,
    x,
    y,
    transformOrigin,
  };
}

/**
 * Returns CSS styles to position a popup element based on calculated position data
 *
 * @param position - The position data calculated by calculatePopupPosition
 * @returns CSS styles object for positioning the popup
 */
export function getPositionStyles(
  position: PopupPosition
): React.CSSProperties {
  const { placement, x, y, transformOrigin } = position;

  // Base styles
  const styles: React.CSSProperties = {
    position: 'absolute',
    transformOrigin,
  };

  // Set position based on placement
  if (placement === 'top' || placement === 'bottom') {
    styles.left = `${x}px`;
    styles.top = placement === 'top' ? `${y}px` : `${y}px`;
  } else {
    styles.top = `${y}px`;
    styles.left = placement === 'left' ? `${x}px` : `${x}px`;
  }

  return styles;
}

/**
 * Hook to apply popup positioning logic with real-time updates
 * For use in React components to position popups correctly
 *
 * @param triggerRef - Ref to the trigger element
 * @param popupRef - Ref to the popup element
 * @param config - Configuration options for positioning
 * @returns CSS styles object to apply to the popup element
 */
export function usePopupPosition(
  triggerRef: React.RefObject<HTMLElement>,
  popupRef: React.RefObject<HTMLElement>,
  config: PositionConfig = {}
): React.CSSProperties | null {
  if (!triggerRef.current) return null;

  const position = calculatePopupPosition(
    triggerRef.current,
    popupRef.current,
    config
  );
  return getPositionStyles(position);
}
