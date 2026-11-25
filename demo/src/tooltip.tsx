// T42: Tooltip beside a copy of the board's two (tooltipBoard.tsx): the stage strip's (a card's strip, Building step 2
// of 4; the trigger is there for its tooltip, so levain's has `toggle`) and Restart PM's (an icon button with its own
// action). Each pair has the same trigger, styled by the board's CSS; only the tooltip differs. The strip's rows are the
// consumer's content inside levain's box ([data-stage-rows]). ?only=tooltip shows only this section, with a third strip
// pinned to the window's foot whose tooltip flips above it (for captures).
import { Tooltip } from '@levain/ui-react';
import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { BOARD_TIP_CSS, STAGE_MEANS, STAGE_WORD, STAGES, Strip, Tip, stageWord, tipRows, type StageOf } from './tooltipBoard';

const S: StageOf = { stage: 'building', step: 2, steps: 4 };

/** The board's strip button, its tooltip levain's. */
function LevainStrip({ s, who }: { s: StageOf; who: string }) {
  const at = STAGES.indexOf(s.stage), word = stageWord(s);
  return (
    <Tooltip
      toggle
      data-stage={s.stage}
      data-stage-rows=""
      data-demo-tip={who}
      content={
        <>
          <ol>{tipRows(s).map(r => <li key={r.stage} data-state={r.state} aria-current={r.state === 'now' ? 'step' : undefined}><i aria-hidden />{r.text}</li>)}</ol>
          <p>{STAGE_MEANS[s.stage]}</p>
        </>
      }
    >
      <button type="button" className="strip" data-stage={s.stage} data-demo-strip={who}
        aria-label={`stage: ${word} (${STAGES.map(x => STAGE_WORD[x]).join(', ')})`}
        onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <span className="pips" aria-hidden>{STAGES.map((x, i) => <i key={x} data-on={i < at ? '' : undefined} data-at={i === at ? '' : undefined} />)}</span>
        <span aria-hidden><span className="word">{word}</span></span>
      </button>
    </Tooltip>
  );
}

const Card = ({ who, children }: { who: string; children: ReactNode }) => (
  <div className="flex flex-col gap-[0.25rem] rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] p-[0.75rem] shadow-[inset_0_0_0_1px_var(--color-border-subtle)]" data-demo={`tooltip-${who}`}>
    <span className="type-caption text-[var(--color-text-faint)]">T42 · {who}</span>
    <span className="font-medium">Tooltip</span>
    {children}
  </div>
);

const Restart = ({ who, children }: { who: string; children: ReactNode }) => (
  <div className="flex items-center gap-2xs" data-demo={`restart-${who}`}>
    <span className="type-body-sm text-[var(--color-text-muted)]">PM · context 91% · {who}</span>
    <span className="pm-restart">{children}</span>
  </div>
);
const restartButton = (who: string) => (
  <button type="button" className="pm-restart-icon" data-short aria-label="Restart PM" aria-haspopup="dialog" data-demo-restart={who}>
    <RotateCcw aria-hidden size={15} />
  </button>
);

export function TooltipDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const only = new URLSearchParams(location.search).get('only') === 'tooltip';
  return (
    <Section title="A tooltip" note="Tooltip: a short hint for one control, after a 300 ms hover or at once on keyboard focus, placed like Popover; it closes on leave, blur, Escape or a press. Each pair: the board's (a copy) first, then levain's, with the same trigger. The strip's is a toggle: a tap or Enter shows it.">
      <style>{BOARD_TIP_CSS}</style>
      <div className="rmb flex max-w-md flex-col gap-[10rem] bg-transparent pb-[48rem]">
        <Card who="board"><Strip s={S} /></Card>
        <Card who="levain"><LevainStrip s={S} who="levain" /></Card>
        <Restart who="board"><Tip text="Restart PM">{restartButton('board')}</Tip></Restart>
        <Restart who="levain"><Tooltip content="Restart PM" data-demo-tip="restart">{restartButton('levain')}</Tooltip></Restart>
        {only && <div className="fixed inset-x-[1rem] bottom-[1rem]"><Card who="flip"><LevainStrip s={S} who="flip" /></Card></div>}
      </div>
    </Section>
  );
}
