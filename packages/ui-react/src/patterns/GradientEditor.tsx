'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { hexToRgb, rgbToHex } from '../utils/color';
import ColorPickerPanel from '../components/ColorPickerPanel';
import { Button } from '../components/Button';
import Slider from '../components/Slider';

// ============================================================================
// Types
// ============================================================================

export interface GradientStop {
  position: number; // 0-100
  color: { hex: string; alpha: number };
}

export interface GradientValue {
  angle: number; // 0-360
  stops: GradientStop[];
}

export interface GradientEditorProps {
  value: GradientValue;
  onChange: (value: GradientValue) => void;
  minStops?: number; // default: 2
  maxStops?: number; // default: 10
  className?: string;
  /** Called when selection state changes (for parent to know if color picker is visible) */
  onSelectionChange?: (hasSelection: boolean) => void;
  /**
   * When provided, locks all stops to this base hex color.
   * ColorPickerPanel will only show alpha controls, allowing opacity-only editing.
   * Useful for shine/glow layers where all stops share the same base color.
   */
  lockedHue?: string;
}

// Internal stop type with generated ID for React keys
interface InternalStop extends GradientStop {
  id: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a gradient value to a CSS linear-gradient string.
 * Uses rgba format when alpha < 100, hex when alpha is 100.
 */
export function gradientToCss(gradient: GradientValue): string {
  const sortedStops = [...gradient.stops].sort(
    (a, b) => a.position - b.position
  );

  const stopStrings = sortedStops.map((stop) => {
    const rgb = hexToRgb(stop.color.hex);
    if (!rgb) {
      return `${stop.color.hex} ${stop.position}%`;
    }

    if (stop.color.alpha < 100) {
      const alpha = stop.color.alpha / 100;
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha}) ${stop.position}%`;
    }

    return `${stop.color.hex} ${stop.position}%`;
  });

  return `linear-gradient(${gradient.angle}deg, ${stopStrings.join(', ')})`;
}

/**
 * Generates a unique ID for internal stop tracking.
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Interpolates between two colors at position t (0-1).
 */
function interpolateColor(
  color1: { hex: string; alpha: number },
  color2: { hex: string; alpha: number },
  t: number
): { hex: string; alpha: number } {
  const rgb1 = hexToRgb(color1.hex);
  const rgb2 = hexToRgb(color2.hex);

  if (!rgb1 || !rgb2) {
    return color1;
  }

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
  const alpha = Math.round(color1.alpha + (color2.alpha - color1.alpha) * t);

  return { hex: rgbToHex({ r, g, b }), alpha };
}

/**
 * Finds the largest gap between stops and returns the midpoint position
 * and the indices of the neighboring stops.
 */
function findLargestGap(stops: InternalStop[]): {
  position: number;
  leftIndex: number;
  rightIndex: number;
} {
  if (stops.length < 2) {
    return { position: 50, leftIndex: 0, rightIndex: 0 };
  }

  const sorted = [...stops].sort((a, b) => a.position - b.position);
  let maxGap = 0;
  let leftIdx = 0;
  let rightIdx = 1;

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1].position - sorted[i].position;
    if (gap > maxGap) {
      maxGap = gap;
      leftIdx = i;
      rightIdx = i + 1;
    }
  }

  const position = Math.round(
    (sorted[leftIdx].position + sorted[rightIdx].position) / 2
  );

  // Find original indices
  const leftId = sorted[leftIdx].id;
  const rightId = sorted[rightIdx].id;
  const originalLeftIdx = stops.findIndex((s) => s.id === leftId);
  const originalRightIdx = stops.findIndex((s) => s.id === rightId);

  return { position, leftIndex: originalLeftIdx, rightIndex: originalRightIdx };
}

// ============================================================================
// Component
// ============================================================================

/**
 * GradientEditor - A composed pattern for editing linear gradients.
 *
 * Features:
 * - Gradient bar with draggable stop handles
 * - Stop list with position inputs, color swatches, and remove buttons
 * - ColorPickerPanel for editing selected stop's color
 * - Add stop button (interpolates color from neighbors)
 * - Angle input (0-360 degrees)
 * - Auto-sorts stops by position
 */
export default function GradientEditor({
  value,
  onChange,
  minStops = 2,
  maxStops = 10,
  className,
  onSelectionChange,
  lockedHue,
}: GradientEditorProps) {
  // Convert external stops to internal format with IDs
  const [internalStops, setInternalStops] = useState<InternalStop[]>(() =>
    value.stops.map((stop) => ({ ...stop, id: generateId() }))
  );

  // Track selected stop by ID
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedStopId !== null);
  }, [selectedStopId, onSelectionChange]);

  // Dragging state for gradient bar handles
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);
  const gradientBarRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync external value to internal state when value changes from outside
  useEffect(() => {
    // Only sync if the number of stops changed or positions differ significantly
    // This preserves internal IDs during normal editing
    if (value.stops.length !== internalStops.length) {
      setInternalStops(
        value.stops.map((stop) => ({ ...stop, id: generateId() }))
      );
      setSelectedStopId(null);
    }
  }, [value.stops.length, internalStops.length]);

  // Get sorted internal stops
  const sortedStops = useMemo(
    () => [...internalStops].sort((a, b) => a.position - b.position),
    [internalStops]
  );

  // Get currently selected stop
  const selectedStop = useMemo(
    () => internalStops.find((s) => s.id === selectedStopId) ?? null,
    [internalStops, selectedStopId]
  );

  // Emit change to parent - converts internal stops back to external format
  const emitChange = useCallback(
    (stops: InternalStop[], angle?: number) => {
      const sortedExternal = [...stops]
        .sort((a, b) => a.position - b.position)
        .map(({ position, color }) => ({ position, color }));

      onChange({
        angle: angle ?? value.angle,
        stops: sortedExternal,
      });
    },
    [onChange, value.angle]
  );

  // Update a stop's position
  const updateStopPosition = useCallback(
    (stopId: string, newPosition: number) => {
      const clamped = Math.max(0, Math.min(100, newPosition));
      const newStops = internalStops.map((s) =>
        s.id === stopId ? { ...s, position: clamped } : s
      );
      setInternalStops(newStops);
      emitChange(newStops);
    },
    [internalStops, emitChange]
  );

  // Update a stop's color
  const updateStopColor = useCallback(
    (stopId: string, newColor: { hex: string; alpha: number }) => {
      const newStops = internalStops.map((s) =>
        s.id === stopId ? { ...s, color: newColor } : s
      );
      setInternalStops(newStops);
      emitChange(newStops);
    },
    [internalStops, emitChange]
  );

  // Add a new stop at the midpoint of the largest gap
  const addStop = useCallback(() => {
    if (internalStops.length >= maxStops) return;

    const { position, leftIndex, rightIndex } = findLargestGap(internalStops);
    const leftStop = internalStops[leftIndex];
    const rightStop = internalStops[rightIndex];

    // Calculate interpolation factor
    const totalGap = rightStop.position - leftStop.position;
    const t = totalGap > 0 ? (position - leftStop.position) / totalGap : 0.5;

    const interpolatedColor = interpolateColor(
      leftStop.color,
      rightStop.color,
      t
    );
    const newStop: InternalStop = {
      id: generateId(),
      position,
      color: interpolatedColor,
    };

    const newStops = [...internalStops, newStop];
    setInternalStops(newStops);
    setSelectedStopId(newStop.id);
    emitChange(newStops);
  }, [internalStops, maxStops, emitChange]);

  // Remove a stop
  const removeStop = useCallback(
    (stopId: string) => {
      if (internalStops.length <= minStops) return;

      const newStops = internalStops.filter((s) => s.id !== stopId);
      setInternalStops(newStops);

      if (selectedStopId === stopId) {
        setSelectedStopId(null);
      }

      emitChange(newStops);
    },
    [internalStops, minStops, selectedStopId, emitChange]
  );

  // Gradient bar drag handlers
  const updatePositionFromMouse = useCallback(
    (clientX: number) => {
      if (!gradientBarRef.current || !draggingStopId) return;

      const rect = gradientBarRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const position = Math.round(x * 100);
      updateStopPosition(draggingStopId, position);
    },
    [draggingStopId, updateStopPosition]
  );

  const handleStopMouseDown = useCallback(
    (e: React.MouseEvent, stopId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDraggingStopId(stopId);
      setSelectedStopId(stopId);
    },
    []
  );

  // Global mouse handlers for dragging
  useEffect(() => {
    if (!draggingStopId) return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePositionFromMouse(e.clientX);
    };

    const handleMouseUp = () => {
      setDraggingStopId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingStopId, updatePositionFromMouse]);

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelectedStopId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle position input change
  const handlePositionInputChange = useCallback(
    (stopId: string, inputValue: string) => {
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed)) {
        updateStopPosition(stopId, parsed);
      }
    },
    [updateStopPosition]
  );

  const canAddStop = internalStops.length < maxStops;
  const canRemoveStop = internalStops.length > minStops;

  return (
    <div ref={panelRef} className={cn('flex gap-6', className)}>
      {/* Left panel: ColorPickerPanel (visible when stop selected) */}
      {selectedStop && (
        <>
          <div className="w-52 shrink-0">
            <ColorPickerPanel
              value={selectedStop.color}
              onChange={(newColor) =>
                updateStopColor(selectedStop.id, newColor)
              }
              lockedHue={lockedHue}
            />
          </div>
          {/* Vertical divider */}
          <div className="w-px shrink-0 bg-[var(--color-border-subtle)]" />
        </>
      )}

      {/* Right panel: Gradient controls */}
      <div className="flex w-[200px] shrink-0 flex-col gap-3">
        {/* Gradient Bar with Stop Handles */}
        <div
          ref={gradientBarRef}
          data-testid="gradient-bar"
          className="relative h-8 w-full cursor-crosshair rounded-md"
          style={{ background: gradientToCss(value) }}
        >
          {/* Stop handles */}
          {sortedStops.map((stop) => (
            <button
              key={stop.id}
              type="button"
              data-testid={`stop-handle-${stop.id}`}
              className={cn(
                'absolute top-1/2 h-5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-sm border-2 transition-shadow',
                selectedStopId === stop.id
                  ? 'border-white shadow-lg ring-2 ring-[var(--color-primary)]'
                  : 'border-white shadow-md hover:shadow-lg',
                draggingStopId === stop.id && 'cursor-grabbing'
              )}
              style={{
                left: `${stop.position}%`,
                backgroundColor: stop.color.hex,
              }}
              onMouseDown={(e) => handleStopMouseDown(e, stop.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStopId(stop.id);
              }}
              aria-label={`Stop at ${stop.position}%`}
            />
          ))}
        </div>

        {/* Stop List */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="type-caption text-[var(--color-text-muted)]">
              Stops
            </span>
            <Button
              data-testid="add-stop-button"
              variant="outline"
              size="icon-sm"
              Icon={Plus}
              iconOnly
              onClick={addStop}
              disabled={!canAddStop}
              aria-label="Add color stop"
              className="!h-5 !w-5"
            />
          </div>

          <div className="flex flex-col gap-1">
            {sortedStops.map((stop) => (
              <div
                key={stop.id}
                data-testid={`stop-row-${stop.id}`}
                className={cn(
                  'flex items-center gap-1.5 rounded border px-1.5 py-1 transition-colors',
                  selectedStopId === stop.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface-card)]'
                    : 'border-transparent bg-[var(--color-surface-section)] hover:bg-[var(--color-surface-card)]'
                )}
                onClick={() => setSelectedStopId(stop.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedStopId(stop.id);
                  }
                }}
              >
                {/* Color Swatch */}
                <div
                  data-testid={`stop-swatch-${stop.id}`}
                  className="h-5 w-5 shrink-0 rounded-sm border border-[var(--color-border-default)]"
                  style={{ backgroundColor: stop.color.hex }}
                />

                {/* Hex Display */}
                <span className="type-caption inline-flex h-5 w-16 shrink-0 items-center font-mono text-[var(--color-text-default)]">
                  {stop.color.hex}
                </span>

                {/* Position Input */}
                <div className="relative flex h-5 w-12 shrink-0 items-center">
                  <input
                    type="text"
                    data-testid={`stop-position-${stop.id}`}
                    value={stop.position}
                    onChange={(e) =>
                      handlePositionInputChange(stop.id, e.target.value)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="type-caption h-5 w-full rounded border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-1 pr-4 text-[var(--color-text-default)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
                    aria-label={`Position for stop at ${stop.position}%`}
                  />
                  <span className="type-caption pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[var(--color-text-muted)]">
                    %
                  </span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Remove Button */}
                <Button
                  data-testid={`remove-stop-${stop.id}`}
                  variant="ghost"
                  size="icon-sm"
                  Icon={X}
                  iconOnly
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStop(stop.id);
                  }}
                  disabled={!canRemoveStop}
                  aria-label={`Remove stop at ${stop.position}%`}
                  className="!h-5 !w-5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Angle Slider */}
        <Slider
          data-testid="angle-input"
          label="Angle"
          value={value.angle}
          min={0}
          max={360}
          step={1}
          onChange={(angle) => emitChange(internalStops, angle)}
          size="sm"
          showInput
          className="!mb-0"
        />
      </div>
    </div>
  );
}

GradientEditor.displayName = 'GradientEditor';
