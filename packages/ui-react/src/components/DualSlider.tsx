'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';

/** The two ends of the range, [min, max] */
export type DualSliderValue = [number, number];

/**
 * DualSlider follows the form-input convention (docs/prop-conventions.json, formInputs): `value` / `defaultValue` as
 * `[min, max]` and `onChange([min, max])`. Two native range inputs (their keys: arrows, Home, End, PageUp, PageDown) in
 * a `role="group"` named by the label; the group takes the ref, the `id` and every prop the DualSlider doesn't name
 * (aria-label, data-*…).
 */
export interface DualSliderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'className'
> {
  /** The group's id; generated when left out. The ranges are `${id}-min` and `${id}-max` */
  id?: string;
  /** Visible label, naming the group. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  /** Controlled: the range, [min, max]. Leave out for uncontrolled */
  value?: DualSliderValue;
  /** Uncontrolled: the range at first (default [min, max]) */
  defaultValue?: DualSliderValue;
  /** The whole new range, whichever end moved */
  onChange?: (value: DualSliderValue) => void;
  min: number;
  max: number;
  step?: number;
  /** Size: 'sm' (compact) or 'md' (default) */
  size?: 'sm' | 'md';
  /** Disabled: both ranges get the native `disabled`; nothing fires */
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  sliderClassName?: string;
  showValue?: boolean;
  valueFormatter?: (min: number, max: number) => string;
  /** The low range's caption and name (default 'Min') */
  minLabel?: string;
  /** The high range's caption and name (default 'Max') */
  maxLabel?: string;
  /** @deprecated use `value={[min, max]}` */
  minValue?: number;
  /** @deprecated use `value={[min, max]}` */
  maxValue?: number;
  /** @deprecated use `onChange([min, max])` */
  onMinChange?: (value: number) => void;
  /** @deprecated use `onChange([min, max])` */
  onMaxChange?: (value: number) => void;
}

/**
 * A dual slider input component for selecting a range of values
 */
const DualSlider = forwardRef<HTMLDivElement, DualSliderProps>(
  function DualSlider(
    {
      id: idProp,
      label,
      value: valueProp,
      defaultValue,
      onChange,
      min,
      max,
      step = 1,
      size = 'md',
      disabled = false,
      className,
      labelClassName,
      valueClassName,
      sliderClassName,
      showValue = true,
      valueFormatter = (min, max) => `${min} - ${max}`,
      minLabel = 'Min',
      maxLabel = 'Max',
      minValue,
      maxValue,
      onMinChange,
      onMaxChange,
      ...props
    },
    ref
  ) {
    const autoId = useId();
    const id = idProp ?? autoId;
    // The deprecated pair still makes it controlled
    const legacy =
      minValue !== undefined || maxValue !== undefined
        ? ([minValue ?? min, maxValue ?? max] as DualSliderValue)
        : undefined;
    const [[low, high], setValue] = useControlled<DualSliderValue>(
      valueProp ?? legacy,
      defaultValue ?? [min, max],
      onChange,
      'DualSlider'
    );

    const change = (next: DualSliderValue) => {
      if (disabled) return;
      setValue(next);
      if (next[0] !== low) onMinChange?.(next[0]);
      if (next[1] !== high) onMaxChange?.(next[1]);
    };

    const labelId = `${id}-label`;
    const track = cn(
      'w-full cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-1)] accent-[var(--color-primary)] focus:outline-none',
      size === 'sm' ? 'h-1.5' : 'h-2',
      'focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-canvas)]',
      disabled && 'cursor-not-allowed opacity-50',
      sliderClassName
    );
    const caption = cn(
      size === 'sm' ? 'type-label-sm' : 'type-caption',
      disabled && 'text-[var(--color-text-disabled)]'
    );

    return (
      <div
        {...props}
        ref={ref}
        id={id}
        role="group"
        aria-labelledby={
          props['aria-labelledby'] ??
          (label && !props['aria-label'] ? labelId : undefined)
        }
        aria-disabled={disabled || undefined}
        className={cn('mb-4', className)}
      >
        {(label || showValue) && (
          <div className="mb-1 flex justify-between">
            {label && (
              <span
                id={labelId}
                className={cn(
                  size === 'sm' ? 'type-label-sm' : 'type-label',
                  disabled
                    ? 'text-[var(--color-text-disabled)]'
                    : 'text-[var(--color-text-default)]',
                  labelClassName
                )}
              >
                {label}
              </span>
            )}
            {showValue && (
              <span className={cn('type-caption', valueClassName)}>
                {valueFormatter(low, high)}
              </span>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={`${id}-min`} className={caption}>
              {minLabel}
            </label>
            <input
              id={`${id}-min`}
              type="range"
              min={min}
              max={high}
              step={step}
              value={low}
              disabled={disabled}
              onChange={(e) => change([parseFloat(e.target.value), high])}
              className={track}
            />
          </div>
          <div>
            <label htmlFor={`${id}-max`} className={caption}>
              {maxLabel}
            </label>
            <input
              id={`${id}-max`}
              type="range"
              min={low}
              max={max}
              step={step}
              value={high}
              disabled={disabled}
              onChange={(e) => change([low, parseFloat(e.target.value)])}
              className={track}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default DualSlider;
