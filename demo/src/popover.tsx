// T39: Popover beside the board's HeadPopover (a copy, compare/BoardHeadPopover.tsx), each at the end of an "In progress"
// head with the board's worker count panel (a Slider and its caption). The trigger is the board's .pool-button in both,
// so only the panel differs. ?only=popover shows only this section, with a third head pinned to the window's bottom
// whose levain Popover flips above its trigger (for captures).
import { Popover, Slider } from '@levain/ui-react';
import { Settings2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { BOARD_POPOVER_CSS, HeadPopover } from './compare/BoardHeadPopover';
import { BENCH } from './bench';

function Fields() {
  const [n, setN] = useState(3);
  return (
    <>
      <Slider label="Workers" size="sm" value={n} min={1} max={10} step={1} onChange={v => setN(Math.round(v))} showValue showMinMax />
      <p className="type-caption m-0 text-[var(--color-text-muted)]">{n === 1 ? 'eng1' : `eng1–eng${n}`} take new tasks, a fresh conversation each.</p>
    </>
  );
}

const Head = ({ who, children }: { who: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-2xs" data-demo={`popover-${who}`}>
    <span className="font-medium">In progress <span className="text-[var(--color-text-faint)]">· {who}</span></span>
    {children}
  </div>
);

const levain = (who: string) => (
  <Head who={who}>
    <Popover
      label="Workers"
      align="end"
      alignOffset={4}
      className="flex w-60 flex-col gap-[0.5rem]"
      data-demo-panel={who}
      trigger={p => (
        <button type="button" {...p} aria-label="Workers" title="Workers" className="pool-button" data-demo-trigger={who}>
          <Settings2 aria-hidden size={16} />
        </button>
      )}
    >
      <Fields />
    </Popover>
  </Head>
);

export function PopoverDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const only = new URLSearchParams(location.search).get('only') === 'popover';
  return (
    <Section title="A popover" note="Popover: a panel anchored to its trigger that grows out of it (the morph recipe), flips when there's no room, and closes on Escape, a press outside or Tab past its last control. Above: the board's HeadPopover (a copy); below: levain's, with the same trigger and panel.">
      <style>{BOARD_POPOVER_CSS}</style>
      <div className={'rmb flex max-w-md flex-col bg-transparent ' + (BENCH ? 'gap-[12rem] pb-[10rem]' : 'gap-md')}>
        {BENCH && <Head who="board">
          <HeadPopover icon={<Settings2 aria-hidden size={16} />} label="Workers" title="Workers">
            <Fields />
          </HeadPopover>
        </Head>}
        {levain('levain')}
        {only && <div className="fixed inset-x-[1rem] bottom-[1rem]">{levain('flip')}</div>}
      </div>
    </Section>
  );
}
