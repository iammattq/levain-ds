import { useCallback, useEffect, useRef, useState } from 'react';

const isDev = () =>
  (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV !== 'production';

/**
 * A form input's value, controlled or not (prop-conventions formInputs.points.controlledAndUncontrolled): controlled
 * when `value` is given, else its own state from `defaultValue`. `value` undefined always means uncontrolled, so an
 * input can't use undefined to mean "nothing chosen" while controlled; it passes its own empty value instead. `set`
 * updates its own state only when uncontrolled and calls `onChange` either way. The same shape as Popover's and Menu's
 * `open` / `defaultOpen`. Switching between controlled and uncontrolled after the first render warns in development.
 */
export function useControlled<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
  name = 'A form input'
): [T, (next: T) => void] {
  const [own, setOwn] = useState(defaultValue);
  const controlled = value !== undefined;
  const wasControlled = useRef(controlled);
  useEffect(() => {
    if (wasControlled.current !== controlled && isDev()) {
      console.warn(
        `${name} changed from ${wasControlled.current ? 'controlled' : 'uncontrolled'} to ${controlled ? 'controlled' : 'uncontrolled'}: its \`value\` went ${controlled ? 'from undefined to defined' : 'from defined to undefined'}. Keep one for its whole life.`
      );
    }
    wasControlled.current = controlled;
  }, [controlled, name]);
  const set = useCallback(
    (next: T) => {
      if (!controlled) setOwn(next);
      onChange?.(next);
    },
    [controlled, onChange]
  );
  return [controlled ? value : own, set];
}
