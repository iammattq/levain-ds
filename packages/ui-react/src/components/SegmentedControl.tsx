import React, { forwardRef, useId, useRef } from 'react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';

export type SegmentOption = {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
};

/**
 * SegmentedControl follows the form-input convention (docs/prop-conventions.json, formInputs): `value` /
 * `defaultValue` and `onChange(value)`. It is a single-choice group: role="radiogroup", one Tab stop, the arrows move
 * and select (skipping disabled options, wrapping), Home and End go to the ends. The ref, the `id` and every prop it
 * doesn't name (aria-label, data-*…) go to the group.
 */
export interface SegmentedControlProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'className' | 'id'
> {
  /** The group's id; generated when left out */
  id?: string;
  options: SegmentOption[];
  /** Controlled: the chosen value. Leave out for uncontrolled */
  value?: string;
  /** Uncontrolled: the value chosen at first */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Visible label, naming the group. Without it, pass `aria-label` or `aria-labelledby` */
  label?: string;
  className?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  variant?: 'default' | 'subtle';
}

// Size variant classes - aligned with Button sizes
// Typography: Uses semantic .type-label-sm (xs/sm), .type-label (md), .type-body (lg)
const sizeClasses = {
  xs: 'type-label-sm h-7 px-2',
  sm: 'type-label-sm h-8 px-3',
  md: 'type-label h-9 px-4',
  lg: 'type-body h-12 px-6',
};

const variantClasses = {
  default:
    'bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-sm',
  subtle:
    'bg-[var(--color-surface-canvas)] border border-[var(--color-border-subtle)]',
};

const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  (
    {
      id: idProp,
      options,
      value: valueProp,
      defaultValue,
      onChange,
      label,
      className,
      disabled = false,
      size = 'md',
      fullWidth = false,
      variant = 'default',
      onKeyDown,
      ...props
    }: SegmentedControlProps,
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const labelId = `${id}-label`;
    // `value` left out (undefined) means uncontrolled, as for every input; uncontrolled with no `defaultValue`, nothing
    // is chosen at first. The setter is only ever given an option's value
    const [value, setValue] = useControlled<string | undefined>(
      valueProp,
      defaultValue,
      onChange as ((v: string | undefined) => void) | undefined,
      'SegmentedControl'
    );
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);

    const enabled = (i: number) => !disabled && !options[i]?.disabled;
    const chosen = options.findIndex((o) => o.value === value);
    // the one Tab stop: the chosen option, else the first that can be chosen
    const stop =
      chosen >= 0 && enabled(chosen)
        ? chosen
        : options.findIndex((_, i) => enabled(i));

    const choose = (i: number) => {
      if (!enabled(i)) return;
      buttons.current[i]?.focus();
      if (options[i].value !== value) setValue(options[i].value);
    };

    // Arrows move and select, wrapping and skipping disabled options; Home and End go to the ends
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const from = buttons.current.findIndex(
        (b) => b === document.activeElement
      );
      if (from < 0) return;
      const n = options.length;
      const step = (start: number, dir: 1 | -1) => {
        for (let k = 1; k <= n; k++) {
          const i = (((start + dir * k) % n) + n) % n;
          if (enabled(i)) return i;
        }
        return -1;
      };
      const to =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? step(from, 1)
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? step(from, -1)
            : e.key === 'Home'
              ? step(-1, 1)
              : e.key === 'End'
                ? step(n, -1)
                : null;
      if (to === null) return;
      e.preventDefault();
      if (to >= 0) choose(to);
    };

    return (
      <div
        className={cn(
          'flex flex-col gap-2',
          fullWidth ? 'w-full' : 'w-fit',
          className
        )}
      >
        {label && (
          <span
            id={labelId}
            className={cn(
              size === 'xs' || size === 'sm' ? 'type-label-sm' : 'type-label',
              'text-[var(--color-text-default)]'
            )}
          >
            {label}
          </span>
        )}
        <div
          aria-labelledby={label ? labelId : undefined}
          aria-disabled={disabled || undefined}
          {...props}
          ref={ref}
          id={id}
          role="radiogroup"
          onKeyDown={handleKeyDown}
          className={cn(
            'flex overflow-hidden rounded-md',
            variantClasses[variant],
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {options.map((option, index) => {
            const isActive = value === option.value;
            const isDisabled = !enabled(index);

            return (
              <button
                key={option.value}
                ref={(el) => {
                  buttons.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isActive}
                tabIndex={index === stop ? 0 : -1}
                disabled={isDisabled}
                onClick={() => choose(index)}
                className={cn(
                  'relative transition-colors duration-200',
                  // the keyboard ring, inset: the group clips anything outside its options
                  'focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:outline-none focus-visible:ring-inset',
                  sizeClasses[size],
                  fullWidth ? 'flex-1' : '',
                  isActive
                    ? 'type-label font-semibold text-[var(--color-text-default)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-default)]',
                  isDisabled && 'cursor-not-allowed',
                  index !== 0 && 'border-l border-[var(--color-border-subtle)]'
                )}
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
