'use client';

import { FC, ReactNode, InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react'; // Import icons
import { cn } from '../utils/cn'; // Import cn utility

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'checked' | 'id' | 'type' | 'size'
> {
  /** Unique identifier for the input */
  id: string;
  /** The current checked state */
  checked: boolean | 'indeterminate';
  /** Callback when the state changes */
  onChange: (checked: boolean) => void;
  /** Optional text label or React node */
  label?: ReactNode;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Size of the checkbox */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

const Checkbox: FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className,
  ...props // Pass rest of the props to the input
}) => {
  const isIndeterminate = checked === 'indeterminate';
  const isChecked = checked === true;

  // Size-based classes
  // Typography: Uses semantic .type-label-sm (sm), .type-label (md), .type-body (lg)
  const sizeClasses = {
    sm: {
      container: 'w-3.5 h-3.5',
      icon: 'w-2.5 h-2.5',
      label: 'type-label-sm',
    },
    md: {
      container: 'w-5 h-5',
      icon: 'w-3.5 h-3.5',
      label: 'type-label',
    },
    lg: {
      container: 'w-6 h-6',
      icon: 'w-4 h-4',
      label: 'type-body',
    },
  };

  const classes = sizeClasses[size];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        'group inline-flex cursor-pointer items-center',
        { 'cursor-not-allowed opacity-50': disabled },
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          className="peer sr-only"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          ref={(input) => {
            // Handle indeterminate state via ref
            if (input) {
              input.indeterminate = isIndeterminate;
            }
          }}
          {...props}
        />
        <div
          className={cn(
            `${classes.container} relative flex items-center justify-center rounded border-2 transition-colors`,
            'border-[var(--color-border)] bg-[var(--color-surface-2)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface-1)]',
            {
              'border-[var(--color-accent)] bg-[var(--color-accent)]':
                isChecked || isIndeterminate,
              'border-[var(--color-border)] bg-[var(--color-surface-2)]':
                !isChecked && !isIndeterminate,
              'group-hover:border-[var(--color-border-hover)]':
                !disabled && !isChecked && !isIndeterminate,
              // Optional: Add hover state for checked/indeterminate if desired
              // 'group-hover:border-[var(--color-accent-hover)] group-hover:bg-[var(--color-accent-hover)]': !disabled && (isChecked || isIndeterminate)
            }
          )}
          aria-hidden="true" // Hide decorative element from screen readers
        >
          {(isChecked || isIndeterminate) && (
            <span
              className={cn(
                `${classes.icon} flex items-center justify-center text-white` // White icon for contrast on accent bg
              )}
            >
              {isIndeterminate ? (
                <Minus strokeWidth={3} />
              ) : (
                <Check strokeWidth={3} />
              )}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span
          className={cn(
            'ml-2 leading-none text-[var(--color-text-default)]',
            classes.label
          )}
        >
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
