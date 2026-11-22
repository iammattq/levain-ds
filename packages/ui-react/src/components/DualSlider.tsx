'use client';

import React from 'react';
import { cn } from '../utils/cn';

// Dual Range Slider Props
export interface DualSliderProps {
  label?: string;
  minValue: number;
  maxValue: number;
  min: number;
  max: number;
  step?: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  sliderClassName?: string;
  showValue?: boolean;
  valueFormatter?: (min: number, max: number) => string;
  minLabel?: string;
  maxLabel?: string;
}

/**
 * A dual slider input component for selecting a range of values
 */
export default function DualSlider({
  label,
  minValue,
  maxValue,
  min,
  max,
  step = 1,
  onMinChange,
  onMaxChange,
  className,
  labelClassName,
  valueClassName,
  sliderClassName,
  showValue = true,
  valueFormatter = (min, max) => `${min} - ${max}`,
  minLabel = 'Min',
  maxLabel = 'Max',
}: DualSliderProps) {
  return (
    <div className={cn('mb-4', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex justify-between">
          {label && (
            <label
              className={cn(
                'type-label text-[var(--color-text-default)]',
                labelClassName
              )}
            >
              {label}
            </label>
          )}
          {showValue && (
            <span className={cn('type-caption', valueClassName)}>
              {valueFormatter(minValue, maxValue)}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="type-caption">{minLabel}</span>
          <input
            type="range"
            min={min}
            max={maxValue}
            step={step}
            value={minValue}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              onMinChange(value);
            }}
            className={cn(
              'h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-1)] accent-[var(--color-primary)]',
              sliderClassName
            )}
          />
        </div>
        <div>
          <span className="type-caption">{maxLabel}</span>
          <input
            type="range"
            min={minValue}
            max={max}
            step={step}
            value={maxValue}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              onMaxChange(value);
            }}
            className={cn(
              'h-2 w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-1)] accent-[var(--color-primary)]',
              sliderClassName
            )}
          />
        </div>
      </div>
    </div>
  );
}
