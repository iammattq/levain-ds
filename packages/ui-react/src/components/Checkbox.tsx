'use client';

import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../utils/cn';
import { useControlled } from '../utils/useControlled';

/**
 * Checkbox follows the form-input convention (docs/prop-conventions.json, formInputs): `checked` / `defaultChecked`
 * and `onChange(checked)`; a native checkbox (Space toggles it), which takes the ref and every prop the Checkbox
 * doesn't name (aria-label, name, data-*…).
 */
export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'checked' | 'defaultChecked' | 'id' | 'type' | 'size' | 'className'
> {
  /** The input's id; generated when left out */
  id?: string;
  /** Controlled: the state ('indeterminate' draws a dash; a click then sets a boolean). Leave out for uncontrolled */
  checked?: boolean | 'indeterminate';
  /** Uncontrolled: the state at first */
  defaultChecked?: boolean | 'indeterminate';
  /** Called with the new state, value first */
  onChange?: (checked: boolean) => void;
  /** Visible label (text or a node). Without it, pass `aria-label` or label it from outside with `<label htmlFor={id}>` */
  label?: ReactNode;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Size of the checkbox */
  size?: 'sm' | 'md' | 'lg';
  /** Class name for the root (merged with cn) */
  className?: string;
}

// Size-based classes; the label keeps the size scale's label type (sm: type-label-sm; md, lg: type-label)
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
    label: 'type-label',
  },
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
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
    const [checked, setChecked] = useControlled<boolean | 'indeterminate'>(
      checkedProp,
      defaultChecked,
      (next) => onChange?.(next === true),
      'Checkbox'
    );
    const isIndeterminate = checked === 'indeterminate';
    const isChecked = checked === true;
    const classes = sizeClasses[size];

    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    // indeterminate is a DOM property, not an attribute
    useLayoutEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = isIndeterminate;
    }, [isIndeterminate]);

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
            {...props}
            ref={inputRef}
            type="checkbox"
            id={id}
            className="peer sr-only"
            checked={isChecked}
            onChange={(e) => {
              if (!disabled) setChecked(e.target.checked);
            }}
            disabled={disabled}
          />
          <div
            className={cn(
              `${classes.container} relative flex items-center justify-center rounded border-2 transition-colors`,
              'border-[var(--color-border-default)] bg-[var(--color-surface-card)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-border-focus)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-surface-canvas)]',
              {
                'border-[var(--color-accent)] bg-[var(--color-accent)]':
                  isChecked || isIndeterminate,
                'border-[var(--color-border-default)] bg-[var(--color-surface-card)]':
                  !isChecked && !isIndeterminate,
                'group-hover:border-[var(--color-border-emphasis)]':
                  !disabled && !isChecked && !isIndeterminate,
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
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
