'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motion as motionFor } from '@levain/tokens';
import { Info, X } from 'lucide-react';

import { Button } from '../components/Button';
import { cn } from '../utils/cn';

/**
 * The note explaining what a tool does, behind a button.
 *
 * These notes are worth having and worth reading once. Printed under the
 * canvas they are read once and then occupy a third of a phone screen forever,
 * pushing the thing being explained out of view — which is a strange trade for
 * prose about how to look at it.
 *
 * A popover on a wide screen, where it can sit near its button; a sheet from
 * the bottom on a phone, where a popover anchored to a 32px control either
 * overflows the viewport or shrinks the text to fit it.
 */

export interface ToolInfoProps {
  /** The explanation. Prose, not controls. */
  children: ReactNode;
  /** Accessible name for the trigger. */
  label?: string;
}

export function ToolInfo({
  children,
  label = 'About this tool',
}: ToolInfoProps) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Escape should leave focus where it started, not on the document.
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // Tested against the panel and the trigger rather than the wrapper they
      // sit in. The scrim is a child of that wrapper, so a wrapper test counts
      // a tap on the scrim as a tap inside — which on a phone, where the scrim
      // also covers the trigger, leaves no way to close this at all.
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      {/* The same Button as the actions it sits beside, rather than one built
          to look like them. `iconOnly` rather than a squashed `sm`: the button
          sizes itself square and drops the margin the icon otherwise carries
          for a label, which is what leaves the glyph sitting off centre. */}
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        iconOnly
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        Icon={Info}
      />

      <AnimatePresence>
        {open && (
          <>
            {/* Below `md` the panel is a sheet, so it needs something behind it
                to read against and to catch the tap that closes it. */}
            <motion.button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionFor('quick', reduce)}
              className="fixed inset-0 z-40 cursor-default bg-[var(--color-surface-inverted)]/30 md:hidden"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label={label}
              // Rising from the bottom, which is where it comes from on a
              // phone and reads as a drop from the trigger on a wide screen.
              initial={{ opacity: 0, y: reduce ? 0 : 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : 40 }}
              transition={motionFor('contentIn', reduce)}
              className={cn(
                'z-50 border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-lg',
                // Phone: a sheet across the bottom, capped so a long note
                // scrolls rather than running off the screen.
                'fixed inset-x-2 bottom-2 max-h-[60dvh] overflow-y-auto rounded-[var(--radius-lg)] p-4',
                // Wide: a popover hung under its trigger.
                'md:absolute md:inset-x-auto md:top-full md:right-0 md:bottom-auto md:mt-2 md:max-h-none md:w-[380px]'
              )}
            >
              {/* An explicit close, because the other two ways out are a
                  keyboard a phone does not have and a scrim that is easy to
                  miss under a tall sheet. */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="float-right -mt-1 -mr-1 ml-2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-default)]"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
              <p className="type-caption text-[var(--color-text-muted)]">
                {children}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
