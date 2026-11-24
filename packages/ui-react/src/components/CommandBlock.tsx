'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

// T4: shell commands as the Ringmaster board's run items show them (board/src/items.tsx): an ordered list, each command
// in type-code on the section surface, wrapping only at spaces so every word stays whole, with an icon-only ghost Copy
// beside it. Copy all is its own export, CommandBlockCopyAll, because the board puts it in the item's button row beside
// Done / Allow, which stay the caller's.

/** How long a Copy shows its check after a copy that worked. */
export const COPIED_MS = 1500;

/**
 * Writes text to the clipboard and holds `copied` for COPIED_MS. No clipboard (an insecure page, an old browser) or a
 * refused write does nothing: no throw, no check.
 */
function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (text: string) => {
    const clip = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    if (!clip?.writeText) return;
    try {
      await clip.writeText(text);
    } catch {
      return;
    }
    clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };
  return { copied, copy };
}

/** A polite live region, always mounted so screen readers hear its text change. */
const Announce = ({ text }: { text: string }) => (
  <span role="status" aria-live="polite" className="sr-only">
    {text}
  </span>
);

function CommandRow({ command, n }: { command: string; n: number }) {
  const { copied, copy } = useCopy();
  return (
    <li className="flex items-start gap-2xs">
      <code className="type-code min-w-0 flex-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface-section)] px-xs py-2xs">
        {/* wraps only at spaces: every word stays whole */}
        {command.split(' ').map((w, j) => (
          <Fragment key={j}>
            {j ? ' ' : ''}
            <span className="whitespace-nowrap">{w}</span>
          </Fragment>
        ))}
      </code>
      <Button
        size="icon"
        variant="ghost"
        Icon={copied ? Check : Copy}
        iconOnly
        aria-label={'Copy command ' + n}
        data-copied={copied || undefined}
        onClick={() => void copy(command)}
      />
      <Announce text={copied ? 'Copied command ' + n : ''} />
    </li>
  );
}

export interface CommandBlockProps {
  /** One shell command per entry, shown in order. */
  commands: string[];
  className?: string;
}

export function CommandBlock({ commands, className }: CommandBlockProps) {
  return (
    <ol data-command-block="" className={cn('space-y-2xs', className)}>
      {commands.map((c, i) => (
        <CommandRow key={i} command={c} n={i + 1} />
      ))}
    </ol>
  );
}

export default CommandBlock;
