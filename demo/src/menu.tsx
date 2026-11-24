// T41: Menu beside the board's project switcher (a copy, menuBoard.tsx), each in a bar with the same projects. The
// trigger is the board's .switcher-button and the "others" mark in both, and each row's end (the working ring and the
// marks) is the board's own content, so only the menu differs. ?only=menu shows only this section (for captures).
import { Menu } from '@levain/ui-react';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BOARD_SWITCHER_CSS, othersOf, OthersGlyph, onPick, RowMarks, StatusIcon, Switcher, type Project } from './menuBoard';

const PROJECTS: Project[] = [
  { name: 'levain', root: '', working: true },
  { name: 'portfolio', root: '', waiting: 1 },
  { name: 'ringmaster', root: '', working: true, blocked: 1 },
  { name: 'a-project-with-a-rather-long-name', root: '' },
  { name: 'notes', root: '' },
];

// the row's end in levain's menu: the board's ring and marks (its content, its styles), as Switcher.tsx draws them
const END_CSS = `
.rmb [data-demo-menu] .state { display: inline-flex; flex: none; width: 14px; color: var(--color-text-muted); }
.rmb [data-demo-menu] .state:not([data-working]) { opacity: 0.55; }
.rmb [data-demo-menu] .marks { display: inline-flex; flex: none; gap: 0.25rem; }
.rmb [data-demo-menu] .marks .ic { vertical-align: 0; }
.rmb [data-demo-menu] .marks .slot { display: inline-flex; flex: none; width: 14px; justify-content: center; }
.rmb [data-demo-menu] .marks .others-glyph { width: 0.875rem; height: 0.875rem; color: var(--color-text-link); }
`;

const Bar = ({ who, children }: { who: string; children: ReactNode }) => (
  <div className="flex min-w-0 items-center gap-[0.5rem]" data-demo={`menu-${who}`}>
    <span className="text-[var(--color-text-faint)]">{who} ·</span>
    {children}
  </div>
);

function LevainSwitcher() {
  const [current, setCurrent] = useState('levain');
  const [open, setOpen] = useState(false);
  const others = othersOf(PROJECTS, current);
  return (
    <>
      {others && (
        <button type="button" className="others" data-others={others.state} aria-label={others.label} title={others.label}
          aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} data-demo-mark="levain">
          <OthersGlyph state={others.state} />
        </button>
      )}
      <span className="switcher" data-open={open || undefined}>
        <Menu
          label="Project"
          portal={false}
          alignOffset={6}
          className="min-w-[13rem]"
          data-demo-menu="levain"
          open={open}
          onOpenChange={setOpen}
          value={current}
          onSelect={setCurrent}
          items={PROJECTS.map(p => ({
            value: p.name,
            label: p.name,
            end: (
              <>
                <span className="state" data-working={p.working ? '' : undefined}>
                  <StatusIcon status={p.working ? 'active' : 'idle'} label={p.working ? 'Working' : 'Idle'} />
                </span>
                <RowMarks p={p} />
              </>
            ),
          }))}
          trigger={p => (
            <button type="button" {...p} title="Switch project" className="switcher-button text-[13px]! leading-[20px]! font-semibold!" data-demo-trigger="levain">
              <span className="truncate">{current}</span>
              <ChevronDown aria-hidden size={14} className="chev" />
            </button>
          )}
        />
      </span>
    </>
  );
}

function BoardSwitcher() {
  const [current, setCurrent] = useState('levain');
  onPick(setCurrent);
  return <Switcher current={current} projects={PROJECTS} />;
}

export function MenuDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  return (
    <Section title="A menu" note="Menu: a list of choices that opens from a button, on Popover (role=menu), the chosen one checked. ArrowDown on the button opens it; arrows wrap; Home/End; Enter or Space picks; Escape, Tab or a press outside closes. Above: the board's project switcher (a copy); below: levain's Menu with the same button and rows.">
      <style>{BOARD_SWITCHER_CSS + END_CSS}</style>
      <div className="rmb flex max-w-md flex-col gap-[14rem] bg-transparent pb-[14rem]">
        <Bar who="board"><BoardSwitcher /></Bar>
        <Bar who="levain"><LevainSwitcher /></Bar>
      </div>
    </Section>
  );
}
