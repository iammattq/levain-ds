import { useCallback, useState } from 'react';

/**
 * A form input's value, controlled or not (prop-conventions formInputs.points.controlledAndUncontrolled): controlled
 * when `value` is given, else its own state from `defaultValue`. `set` updates its own state only when uncontrolled and
 * calls `onChange` either way. The same shape as Popover's and Menu's `open` / `defaultOpen`.
 */
export function useControlled<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void
): [T, (next: T) => void] {
  const [own, setOwn] = useState(defaultValue);
  const controlled = value !== undefined;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setOwn(next);
      onChange?.(next);
    },
    [controlled, onChange]
  );
  return [controlled ? value : own, set];
}
