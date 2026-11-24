'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { HelpCircle } from 'lucide-react';
import { cn } from '../utils/cn';

// Container variants for size
const containerVariants = cva('', {
  variants: {
    size: {
      sm: '',
      md: 'mb-4',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Label variants for size (matches TextInput compact pattern)
const labelVariants = cva('text-[var(--color-text-muted)]', {
  variants: {
    size: {
      sm: 'type-label-sm',
      md: 'type-label',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Value display variants for size (matches TextInput helperText pattern)
const valueVariants = cva('', {
  variants: {
    size: {
      sm: 'type-caption',
      md: 'type-body-sm',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// Track variants for size
const trackVariants = cva(
  'w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-canvas)] border border-[var(--color-border-default)] focus:outline-none',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        md: 'h-2',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface SliderProps extends VariantProps<typeof containerVariants> {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  sliderClassName?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  /** Show a tooltip bubble on hover/drag */
  showTooltip?: boolean;
  /** Show min/max labels at track endpoints */
  showMinMax?: boolean;
  /** Helper text displayed below the slider */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Tooltip text shown via info icon next to the label */
  labelTooltip?: string;
  /** Show an editable number input beside the slider for precise value entry */
  showInput?: boolean;
  /** Width of the input field (default: 'auto') */
  inputWidth?: string;
}

/**
 * A single slider input component with customizable styling.
 * Supports two sizes: 'sm' (compact) and 'md' (default).
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  labelClassName,
  valueClassName,
  sliderClassName,
  showValue = true,
  valueFormatter = (val) => val.toString(),
  showTooltip = false,
  showMinMax = false,
  helperText,
  disabled = false,
  size = 'md',
  labelTooltip,
  showInput = false,
  inputWidth,
}: SliderProps) {
  const id = useId();
  const sliderRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate percentage for filled track and tooltip positioning
  const percentage = ((value - min) / (max - min)) * 100;

  // Update CSS custom property for filled track
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty(
        '--slider-percentage',
        `${percentage}%`
      );
    }
  }, [percentage]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled) {
        onChange(parseFloat(e.target.value));
      }
    },
    [onChange, disabled]
  );

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        // Clamp value to min/max range
        const clampedValue = Math.min(max, Math.max(min, newValue));
        onChange(clampedValue);
      }
    },
    [onChange, disabled, min, max]
  );

  // Add global mouseup listener to catch drag end outside element
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchend', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  const shouldShowTooltip = showTooltip && (isHovering || isDragging);

  // Calculate tooltip offset to keep it within bounds at edges
  // Thumb is ~16px wide, so at 0% tooltip needs to shift right, at 100% shift left
  const thumbWidth = size === 'sm' ? 14 : 16; // pixels
  const tooltipOffset = ((thumbWidth / 2) * (50 - percentage)) / 50;

  return (
    <div className={cn(containerVariants({ size }), className)}>
      {/* Label row */}
      {(label || showValue) && (
        <div className="mb-0.5 flex justify-between">
          {label && (
            <span className="flex items-center gap-1">
              <label
                htmlFor={id}
                className={cn(labelVariants({ size }), labelClassName)}
              >
                {label}
              </label>
              {labelTooltip && (
                <span className="group relative">
                  <HelpCircle
                    className={cn(
                      'cursor-help text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-default)]',
                      size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
                    )}
                    aria-hidden="true"
                  />
                  <span
                    role="tooltip"
                    className={cn(
                      'pointer-events-none absolute top-full left-0 z-20 mt-1.5 w-48 rounded bg-[var(--color-surface-inverted)] px-2 py-1.5 text-[var(--color-text-inverted)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100',
                      size === 'sm' ? 'type-label-sm' : 'type-label'
                    )}
                  >
                    {labelTooltip}
                    <span className="absolute bottom-full left-2 border-4 border-transparent border-b-[var(--color-surface-inverted)]" />
                  </span>
                </span>
              )}
            </span>
          )}
          {showInput ? (
            <input
              type="number"
              value={value}
              onChange={handleInputChange}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className={cn(
                '[appearance:textfield] rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-right text-[var(--color-text-default)] transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                size === 'sm'
                  ? 'type-caption h-5 w-12 px-1'
                  : 'type-body-sm h-6 w-16 px-1.5',
                disabled && 'cursor-not-allowed opacity-50',
                valueClassName
              )}
              style={inputWidth ? { width: inputWidth } : undefined}
              aria-label={`${label} value`}
            />
          ) : (
            showValue && (
              <span className={cn(valueVariants({ size }), valueClassName)}>
                {valueFormatter(value)}
              </span>
            )
          )}
        </div>
      )}

      {/* Slider track container */}
      <div
        className="relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Tooltip */}
        {shouldShowTooltip && (
          <div
            className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 rounded bg-[var(--color-surface-inverted)] px-2 py-1 text-xs text-[var(--color-text-inverted)]"
            style={{
              left: `calc(${percentage}% + ${tooltipOffset}px)`,
            }}
          >
            {valueFormatter(value)}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-surface-inverted)]" />
          </div>
        )}

        <input
          ref={sliderRef}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
          className={cn(
            trackVariants({ size }),
            // Filled track: primary up to the value (--slider-percentage, set above), the track's own surface after
            'bg-[linear-gradient(to_right,var(--color-primary)_var(--slider-percentage,0%),transparent_var(--slider-percentage,0%))]',
            // Focus ring
            'focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50',
            sliderClassName
          )}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={valueFormatter(value)}
        />
      </div>

      {/* Min/Max labels - underneath track, tight spacing */}
      {showMinMax && (
        <div className="mt-0.5 flex justify-between">
          <span className="type-label-sm text-[var(--color-text-muted)]">
            {valueFormatter(min)}
          </span>
          <span className="type-label-sm text-[var(--color-text-muted)]">
            {valueFormatter(max)}
          </span>
        </div>
      )}

      {/* Helper text */}
      {helperText && (
        <p className="type-caption mt-1 text-[var(--color-text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
