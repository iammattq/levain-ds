// T18: ProgressRing and ProgressBar, every size by every tone, and the xs pair beside the Ringmaster board's
// hand-drawn stand-ins (its T47 context ring and bar, copied here as drawn) so the two can be compared.
import { ProgressBar, ProgressRing, SegmentedControl, type ProgressSize, type ProgressTone } from '@levain/ui-react';
import { useState } from 'react';

const SIZES: ProgressSize[] = ['xs', 'sm', 'md', 'lg'];
const TONES: ProgressTone[] = ['default', 'caution', 'danger'];
const toneVar: Record<ProgressTone, string> = { default: 'var(--color-text-muted)', caution: 'var(--color-caution-fg)', danger: 'var(--color-error-fg)' };
const k = (n: number) => `${Math.round(n / 1000)}k`;

/** The board's ContextRing as drawn: .ic.ctx-ring, 0.875rem, stroke 1.5 non-scaling, round caps, r 6 in 16. */
function StandInRing({ pct, tone }: { pct: number; tone: ProgressTone }) {
  const c = { cx: 8, cy: 8, r: 6, fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
  return (
    <svg viewBox="0 0 16 16" aria-hidden style={{ width: '0.875rem', height: '0.875rem', verticalAlign: '-0.16em', overflow: 'visible', color: toneVar[tone] }}>
      <circle {...c} stroke="var(--color-border-default)" />
      {pct > 0 && <circle {...c} stroke="currentColor" pathLength={100} strokeDasharray={`${pct} 100`} transform="rotate(-90 8 8)" />}
    </svg>
  );
}

/** The board's ContextBar as drawn: a 0.25rem track, min 3rem, the number beside it at 0.75rem. */
function StandInBar({ pct, tone, text }: { pct: number; tone: ProgressTone; text: string }) {
  return (
    <span aria-hidden style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, color: toneVar[tone] }}>
      <span style={{ position: 'relative', flex: '1 1 auto', minWidth: '3rem', height: '0.25rem', borderRadius: 999, overflow: 'hidden', backgroundColor: 'var(--color-border-default)' }}>
        <span style={{ position: 'absolute', inset: '0 auto 0 0', width: pct + '%', borderRadius: 'inherit', backgroundColor: 'currentColor' }} />
      </span>
      <span className="tabular-nums" style={{ flex: 'none', fontSize: '0.75rem' }}>{text}</span>
    </span>
  );
}

export function ProgressDemo({ Section }: { Section: (p: { title: string; note: string; children: React.ReactNode }) => React.ReactNode }) {
  const [used, setUsed] = useState('372000');
  const n = Number(used), cap = 500_000, pct = (n / cap) * 100, text = `${k(n)} of ${k(cap)}`;
  return (
    <Section title="Progress: ring and bar" note="How full something is, xs to lg, in three tones. Pick an amount: the arc and the fill travel to it (at once under reduced motion).">
      <SegmentedControl id="progress-amount" size="sm" value={used} onChange={setUsed}
        options={[0, 137_000, 372_000, 500_000].map(v => ({ label: k(v), value: String(v) }))} />

      <div data-compare className="space-y-2xs rounded-[var(--radius-xl)] bg-[var(--color-surface-section)] p-sm">
        <h3 className="type-label">xs beside the board's stand-ins</h3>
        {TONES.map(tone => (
          <div key={tone} data-compare-row={tone} className="grid grid-cols-[5rem_auto_auto_1fr_1fr] items-center gap-sm type-caption text-[var(--color-text-muted)]">
            <span>{tone}</span>
            <span className="flex items-center gap-3xs">board <StandInRing pct={pct} tone={tone} /></span>
            <span className="flex items-center gap-3xs">levain <ProgressRing size="xs" value={n} max={cap} tone={tone} label="Context" aria-valuetext={text} /></span>
            <StandInBar pct={pct} tone={tone} text={text} />
            <ProgressBar size="xs" value={n} max={cap} tone={tone} label="Context" valueLabel={text} />
          </div>
        ))}
      </div>

      <div data-grid className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-x-sm border-spacing-y-xs">
          <thead className="type-caption text-left text-[var(--color-text-muted)]">
            <tr><th>size</th>{TONES.map(t => <th key={t} colSpan={2}>{t}</th>)}</tr>
          </thead>
          <tbody>
            {SIZES.map(size => (
              <tr key={size} data-size-row={size}>
                <td className="type-caption text-[var(--color-text-muted)]">{size}</td>
                {TONES.map(tone => [
                  <td key={tone + 'r'}><ProgressRing size={size} value={n} max={cap} tone={tone} label={`${tone} ${size} ring`} aria-valuetext={text} /></td>,
                  <td key={tone + 'b'} className="w-1/4"><ProgressBar size={size} value={n} max={cap} tone={tone} label={`${tone} ${size} bar`} valueLabel={text} /></td>,
                ])}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
