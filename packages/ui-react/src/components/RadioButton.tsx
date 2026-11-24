'use client';

import { FC, ReactNode } from 'react';

interface RadioButtonProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label?: ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RadioButton: FC<RadioButtonProps> = ({
  id,
  name,
  value,
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}) => {
  // Size-based classes
  const sizeClasses = {
    sm: {
      container: 'w-3.5 h-3.5',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      container: 'w-5 h-5',
      dot: 'w-2.5 h-2.5',
    },
    lg: {
      container: 'w-6 h-6',
      dot: 'w-3 h-3',
    },
  };

  const classes = sizeClasses[size];

  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="relative">
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          className="sr-only"
          checked={checked}
          onChange={() => onChange(value)}
          disabled={disabled}
        />
        <div
          className={`${classes.container} relative rounded-full border-2 transition-colors ${
            checked
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
              : 'border-[var(--color-border-default)] bg-[var(--color-surface-card)]'
          }`}
        >
          {checked && (
            <span
              className={`${classes.dot} absolute top-1/2 left-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]`}
            ></span>
          )}
        </div>
      </div>
      {label && (
        <span className="type-label ml-2 leading-none text-[var(--color-text-default)]">
          {label}
        </span>
      )}
    </label>
  );
};

export default RadioButton;
