'use client';

/**
 * Menu (T41): a list of choices that opens from a button, the board's project switcher as one levain piece.
 *
 * A `<Popover role="menu">` (T39): Popover anchors it, grows it out of the trigger, closes it on Escape or a press
 * outside, and gives focus back to the trigger. Menu adds the menu's keys, as the switcher has them:
 * - ArrowDown on the trigger opens it;
 * - focus starts on the chosen row (`value`), else the first enabled one;
 * - ArrowDown / ArrowUp move through the enabled rows and wrap at both ends; Home / End go to the first and last;
 * - Enter or Space (the row button's own click) selects and closes;
 * - Tab, either way and from any row, closes it (Popover alone closes only on Tab past the last control);
 * - disabled rows (`aria-disabled`) are skipped by the keys and do nothing when pressed; with every row disabled,
 *   focus goes to the menu itself.
 *
 * Rows are MenuItem buttons with `tabIndex=-1` (focus moves by script, not by Tab). With a `value` the menu is a
 * pick-one menu: rows are `menuitemradio` with `aria-checked`, the chosen one checked (a check at the row's end, in a
 * slot every row keeps so the columns line up). Without one they are plain `menuitem`s.
 */
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { MenuItem } from './MenuItem';
import { Popover, type AnchorOptions, type PopoverTriggerProps } from './Popover';

export interface MenuOption {
  /** What onSelect gets, and what `value` matches. */
  value: string;
  /** The row's text; truncates when the menu is narrow. */
  label: ReactNode;
  /** Status content at the row's end, before the check (a ring, marks). Part of the row: a press on it selects. */
  end?: ReactNode;
  /** Skipped by the keys and inert. */
  disabled?: boolean;
}

export interface MenuTriggerProps extends PopoverTriggerProps {
  /** ArrowDown opens the menu. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

export interface MenuProps extends AnchorOptions {
  /** The trigger, given the props it needs (spread them onto a button). */
  trigger: (props: MenuTriggerProps) => ReactNode;
  /** The menu's accessible name. */
  label: string;
  items: MenuOption[];
  /** The chosen item: checked, and focused as the menu opens. Makes the rows menuitemradio. */
  value?: string;
  /** A row's click, Enter or Space; the menu closes after it. */
  onSelect?: (value: string) => void;
  /** Controlled: whether it's open. Leave out for uncontrolled. */
  open?: boolean;
  /** Uncontrolled: open at first. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Portalled to the body (the default), or beside the trigger (Popover's `portal`). */
  portal?: boolean;
  /** Classes for the menu's box: width, min width. Default padding 0.25rem. */
  className?: string;
  [data: `data-${string}`]: string | boolean | undefined;
}

export function Menu({
  trigger,
  label,
  items,
  value,
  onSelect,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  ...popover
}: MenuProps) {
  const [own, setOwn] = useState(defaultOpen);
  const open = openProp ?? own;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwn(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange]
  );

  const rows = useRef<(HTMLElement | null)[]>([]);
  const first = useRef<HTMLElement | null>(null);
  const start = value === undefined ? -1 : items.findIndex((it) => it.value === value && !it.disabled);
  const focusAt = start >= 0 ? start : items.findIndex((it) => !it.disabled);
  const pick = value !== undefined;

  // every row disabled: focus goes to the menu itself (not a row that does nothing), and Tab from there closes it,
  // as from a row (the rows' keys are on the list inside it, which doesn't see the menu's own keys)
  const list = useRef<HTMLDivElement>(null);
  const none = focusAt < 0;
  useLayoutEffect(() => {
    const panel = list.current?.closest<HTMLElement>('[role="menu"]');
    if (!open || !none || !panel) return;
    first.current = panel;
    const tab = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab' || e.target !== panel) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    panel.addEventListener('keydown', tab);
    return () => panel.removeEventListener('keydown', tab);
  }, [open, none, setOpen]);

  const select = (it: MenuOption) => {
    if (it.disabled) return;
    onSelect?.(it.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    const enabled = rows.current.filter((el, i): el is HTMLElement => !!el && !items[i]?.disabled);
    const n = enabled.length;
    if (!n) return;
    const at = enabled.indexOf(document.activeElement as HTMLElement);
    const to =
      e.key === 'ArrowDown' ? (at + 1) % n
      : e.key === 'ArrowUp' ? (at <= 0 ? n - 1 : at - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : -1;
    if (to < 0) return;
    e.preventDefault();
    enabled[to]!.focus({ preventScroll: true });
  };

  return (
    <Popover
      {...popover}
      role="menu"
      label={label}
      open={open}
      onOpenChange={setOpen}
      initialFocus={first}
      className={cn('p-3xs', className)}
      trigger={(p) =>
        trigger({
          ...p,
          onKeyDown: (e) => {
            if (!open && e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            }
          },
        })
      }
    >
      <div
        className="flex flex-col"
        onKeyDown={onKeyDown}
        ref={list}
      >
        {items.map((it, i) => {
          const checked = it.value === value;
          return (
            <MenuItem
              key={it.value}
              ref={(el) => {
                rows.current[i] = el;
                if (i === focusAt) first.current = el;
              }}
              role={pick ? 'menuitemradio' : 'menuitem'}
              aria-checked={pick ? checked : undefined}
              aria-disabled={it.disabled || undefined}
              tabIndex={-1}
              size="md"
              radius="md"
              onClick={() => select(it)}
              // the switcher's row: 0 0.5rem padding (MenuItem's px-xs / py-2xs aren't merged away by tailwind-merge,
              // so these win by importance), a state overlay for hover and keyboard focus rather than a ring
              className={cn(
                'px-2xs! py-0! text-left',
                'hover:bg-[var(--color-state-hover)] focus-visible:bg-[var(--color-state-active)] focus-visible:text-[var(--color-text-default)] focus-visible:ring-0 focus-visible:ring-offset-0',
                // font-semibold! over the type step's own weight (type-label sets it, and tailwind-merge doesn't know it)
                checked && 'font-semibold! text-[var(--color-text-default)]',
                it.disabled &&
                  'cursor-not-allowed text-[var(--color-text-disabled)] hover:bg-transparent hover:text-[var(--color-text-disabled)]'
              )}
              trailing={
                it.end != null || pick ? (
                  <span className="flex items-center gap-2xs">
                    {it.end}
                    {pick && (
                      <span className="inline-flex w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true">
                        {checked && <Check size={14} />}
                      </span>
                    )}
                  </span>
                ) : undefined
              }
            >
              {it.label}
            </MenuItem>
          );
        })}
      </div>
    </Popover>
  );
}

export default Menu;
