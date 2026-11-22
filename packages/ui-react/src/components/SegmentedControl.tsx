import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';

export type SegmentOption = {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
};

export interface SegmentedControlProps {
  id: string;
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  variant?: 'default' | 'subtle';
}

const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  (
    {
      id,
      options,
      value,
      onChange,
      label,
      className,
      disabled = false,
      size = 'md',
      fullWidth = false,
      variant = 'default',
    }: SegmentedControlProps,
    ref
  ) => {
    // Size variant classes - aligned with Button sizes
    // Typography: Uses semantic .type-label-sm (xs/sm), .type-label (md), .type-body (lg)
    const sizeClasses = {
      xs: 'type-label-sm h-7 px-2',
      sm: 'type-label-sm h-8 px-3',
      md: 'type-label h-9 px-4',
      lg: 'type-body h-12 px-6',
    };

    // Variant classes
    const variantClasses = {
      default:
        'bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-sm',
      subtle:
        'bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2',
          fullWidth ? 'w-full' : 'w-fit',
          className
        )}
      >
        {label && (
          <label
            htmlFor={id}
            className={cn(
              size === 'xs' || size === 'sm' ? 'type-label-sm' : 'type-label',
              'text-[var(--color-text-default)]'
            )}
          >
            {label}
          </label>
        )}
        <div
          id={id}
          className={cn(
            'flex overflow-hidden rounded-md',
            variantClasses[variant],
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {options.map((option, index) => {
            const isActive = value === option.value;
            const isDisabled = disabled || option.disabled;

            return (
              <button
                key={option.value}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    onChange(option.value);
                  }
                }}
                className={cn(
                  'relative transition-colors duration-200',
                  sizeClasses[size],
                  fullWidth ? 'flex-1' : '',
                  isActive
                    ? 'type-label font-semibold text-[var(--color-text-default)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-default)]',
                  isDisabled && 'cursor-not-allowed',
                  index !== 0 && 'border-l border-[var(--color-border-subtle)]'
                )}
                aria-pressed={isActive}
              >
                <span>{option.label}</span>
                {isActive && (
                  <div
                    className="absolute right-0 bottom-0 left-0 h-0.5 bg-linear-to-br from-[var(--color-base)] to-[var(--color-accent)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);

SegmentedControl.displayName = 'SegmentedControl';

export default SegmentedControl;
