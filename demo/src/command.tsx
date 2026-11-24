// T4: CommandBlock beside a copy of the Ringmaster board's run-item commands (board/src/items.tsx, the run branch of
// the item body): one command, three, and a long one that wraps. Each row: the board's markup on the left, copied
// below as BoardCommands, levain's CommandBlock and CommandBlockCopyAll on the right. Both sit on the card surface, as
// in the board's dialog, with the board's button row (Done, then Copy all) under the list.
import { Button, CommandBlock, CommandBlockCopyAll } from '@levain/ui-react';
import { Copy } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

/** The board's run-item commands and button row, as items.tsx writes them (Media and the Comment box left out). */
function BoardCommands({ commands }: { commands: string[] }) {
  return (
    <>
      <ol className="space-y-2xs">
        {commands.map((c, i) => (
          <li key={i} className="flex items-start gap-2xs">
            <code className="type-code min-w-0 flex-1 overflow-x-auto rounded-[var(--radius-md)] bg-[var(--color-surface-section)] px-xs py-2xs">
              {c.split(' ').map((w, j) => <Fragment key={j}>{j ? ' ' : ''}<span className="whitespace-nowrap">{w}</span></Fragment>)}
            </code>
            <Button size="icon" variant="ghost" Icon={Copy} iconOnly aria-label={'Copy command ' + (i + 1)} onClick={() => void navigator.clipboard?.writeText(c)} />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2xs">
        <Button size="sm" variant="outline">Done</Button>
        {commands.length > 1 && <Button size="sm" variant="ghost" Icon={Copy} onClick={() => void navigator.clipboard?.writeText(commands.join('\n'))}>Copy all</Button>}
      </div>
    </>
  );
}

function LevainCommands({ commands }: { commands: string[] }) {
  return (
    <>
      <CommandBlock commands={commands} />
      <div className="flex flex-wrap gap-2xs">
        <Button size="sm" variant="outline">Done</Button>
        <CommandBlockCopyAll commands={commands} />
      </div>
    </>
  );
}

const CASES: { name: string; commands: string[] }[] = [
  { name: 'One command', commands: ['pnpm install --frozen-lockfile'] },
  { name: 'Three commands', commands: ['cd ~/Projects/levain-ds', 'git fetch origin', 'git checkout feature/t4-command-block'] },
  {
    name: 'A long one that wraps',
    commands: ['ringmaster heavy t4 --kind capture --on pc --out captures/T4 bash demo/scripts/capture-command.sh captures/T4', 'pnpm --filter @levain/ui-react exec jest --maxWorkers=2 src/components/tests/CommandBlock.test.tsx'],
  },
];

const card = (children: ReactNode) => (
  <div className="space-y-sm rounded-[var(--radius-xl)] bg-[var(--color-surface-card)] p-sm shadow-[var(--elevation-1)]">{children}</div>
);

export function CommandDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="CommandBlock beside the board's run-item commands" note="Left: a copy of the board's markup (items.tsx). Right: levain's CommandBlock, with CommandBlockCopyAll in the same button row. Press a Copy: levain's icon turns to a check for a moment.">
      <div className="grid grid-cols-1 gap-x-md gap-y-sm sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]" data-demo="command">
        <span className="hidden sm:block" />
        <span className="type-label text-[var(--color-text-muted)]">Board</span>
        <span className="type-label text-[var(--color-text-muted)]">levain CommandBlock</span>
        {CASES.map(c => (
          <div key={c.name} className="contents">
            <span className="type-caption text-[var(--color-text-muted)]">{c.name}</span>
            <div data-side="board">{card(<BoardCommands commands={c.commands} />)}</div>
            <div data-side="levain">{card(<LevainCommands commands={c.commands} />)}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}
