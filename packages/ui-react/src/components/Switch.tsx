'use client';

import { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';

/**
 * Switch follows the form-input convention (docs/prop-conventions.json, formInputs): `checked` / `defaultChecked` and
 * `onChange(checked)`; a native checkbox with role="switch" (Space toggles it), which takes the ref and every prop the
 * Switch doesn't name (aria-label, name, data-*…).
 */
export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'className'
> {
  /** The input's id; generated when left out */
  id?: string;
  /** Controlled: on or off. Leave out for uncontrolled */
  checked?: boolean;
  /** Uncontrolled: on at first */
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Visible label. Without it, pass `aria-label` or label it from outside with `<label htmlFor={id}>` */
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Class name for the root */
  className?: string;
}

// Typography: Uses semantic .type-label-sm (sm) and .type-label (md/lg)
const sizeStyles = {
  sm: {
    switch: 'w-[30px] h-4',
    dot: 'w-3 h-3 translate-x-0.5',
    dotChecked: 'translate-x-4',
    label: 'type-label-sm',
  },
  md: {
    switch: 'w-11 h-6',
    dot: 'w-5 h-5 translate-x-0.5',
    dotChecked: 'translate-x-5.5',
    label: 'type-label',
  },
  lg: {
    switch: 'w-14 h-7',
    dot: 'w-6 h-6 translate-x-0.5',
    dotChecked: 'translate-x-7.5',
    label: 'type-label',
  },
};

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      id: idProp,
      checked: checkedProp,
      defaultChecked = false,
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
    const [checked, setChecked] = useControlled(
      checkedProp,
      defaultChecked,
      onChange,
      'Switch'
    );
    const styles = sizeStyles[size];

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
            type="checkbox"
            role="switch"
            id={id}
            className="peer sr-only"
            checked={checked}
            onChange={(e) => {
              if (!disabled) setChecked(e.target.checked);
            }}
            disabled={disabled}
          />
          <div
            className={cn(
              styles.switch,
              checked
                ? 'bg-[var(--color-accent)]'
                : 'bg-[var(--color-surface-card)]',
              'rounded-full border border-[var(--color-border-default)] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-border-focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface-canvas)] peer-focus-visible:outline-none'
            )}
          ></div>
          <div
            className={cn(
              'absolute top-0.5',
              styles.dot,
              checked && styles.dotChecked,
              'rounded-full bg-[var(--color-surface-inverted)] transition-transform'
            )}
          ></div>
        </div>
        {label && (
          <span
            className={cn(
              'ml-3',
              styles.label,
              'leading-none text-[var(--color-text-default)]'
            )}
          >
            {label}
          </span>
        )}
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export default Switch;
