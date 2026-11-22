'use client';

import { FC } from 'react';

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Switch: FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}) => {
  // Size-based styles
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
      dotChecked: 'translate-x-7.5 ',
      label: 'type-label',
    },
  };

  const styles = sizeStyles[size];

  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={`${styles.switch} ${
            checked
              ? 'bg-[var(--color-accent)]'
              : 'bg-[var(--color-surface-card)]'
          } rounded-full border border-[var(--color-border-default)] transition-colors peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--color-surface-canvas)] peer-focus:outline-none`}
        ></div>
        <div
          className={`absolute top-0.5 ${styles.dot} ${
            checked ? styles.dotChecked : ''
          } rounded-full bg-[var(--color-surface-inverted)] transition-transform`}
        ></div>
      </div>
      {label && (
        <span
          className={`ml-3 ${styles.label} leading-none text-[var(--color-text-default)]`}
        >
          {label}
        </span>
      )}
    </label>
  );
};

export default Switch;
