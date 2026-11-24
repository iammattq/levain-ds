'use client';

import { forwardRef, InputHTMLAttributes, ReactNode, useId } from 'react';
import { cn } from '../utils/cn';

/**
 * RadioButton follows the form-input convention (docs/prop-conventions.json, formInputs): `checked` / `defaultChecked`
 * and `onChange(value)` (this radio's value, when it becomes the chosen one); a native radio, which takes the ref and
 * every prop the RadioButton doesn't name. Radios sharing a `name` are one native group: one Tab stop, the arrows move
 * and select.
 *
 * Uncontrolled radios keep their state in the DOM, not in React: choosing one unchecks its siblings without a change
 * event, so the ring and dot are drawn from the input's :checked (peer-checked) rather than from state (T53, PM).
 */
export interface RadioButtonProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'checked' | 'defaultChecked' | 'type' | 'size' | 'className' | 'value' | 'name' | 'id'
> {
  /** The input's id; generated when left out */
  id?: string;
  /** The group's name; radios sharing it are one group */
  name: string;
  /** This radio's value, passed to onChange when it is chosen */
  value: string;
  /** Controlled: whether this radio is the chosen one. Leave out for uncontrolled */
  checked?: boolean;
  /** Uncontrolled: chosen at first */
  defaultChecked?: boolean;
  /** Called with this radio's value when it becomes the chosen one */
  onChange?: (value: string) => void;
  /** Visible label (text or a node). Without it, pass `aria-label` */
  label?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Class name for the root (merged with cn) */
  className?: string;
}

// Size-based classes; the label keeps the size scale's label type (sm: type-label-sm; md, lg: type-label)
const sizeClasses = {
  sm: {
    container: 'w-3.5 h-3.5',
    dot: 'w-1.5 h-1.5',
    label: 'type-label-sm',
  },
  md: {
    container: 'w-5 h-5',
    dot: 'w-2.5 h-2.5',
    label: 'type-label',
  },
  lg: {
    container: 'w-6 h-6',
    dot: 'w-3 h-3',
    label: 'type-label',
  },
};

const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  (
    {
      id: idProp,
      name,
      value,
      checked,
      defaultChecked,
      onChange,
      label,
      disabled = false,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = idProp ?? autoId;
    const classes = sizeClasses[size];

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex cursor-pointer items-center',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="relative">
          <input
            {...props}
            ref={ref}
            type="radio"
            id={id}
            name={name}
            value={value}
            className="peer sr-only"
            checked={checked}
            defaultChecked={checked === undefined ? defaultChecked : undefined}
            onChange={(e) => {
              if (!disabled && e.target.checked) onChange?.(value);
            }}
            disabled={disabled}
          />
          <div
            aria-hidden="true"
            className={cn(
              classes.container,
              'relative rounded-full border-2 border-[var(--color-border-default)] bg-[var(--color-surface-card)] transition-colors',
              'peer-checked:border-[var(--color-accent)] peer-checked:bg-[var(--color-accent)]/10',
              // A3: the keyboard ring it lacked
              'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-border-focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface-canvas)]'
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              classes.dot,
              'absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] peer-checked:block'
            )}
          />
        </div>
        {label && (
          <span
            className={cn(
              classes.label,
              'ml-2 leading-none text-[var(--color-text-default)]'
            )}
          >
            {label}
          </span>
        )}
      </label>
    );
  }
);

RadioButton.displayName = 'RadioButton';

export default RadioButton;
