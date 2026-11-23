// T6: RelativeTime beside a copy of the Ringmaster board's meta line and late flag (board.css .meta, .flag.you; its
// time.ts span() and its own one-second useNow), so the two can be compared. The times are set back from page load.
import { RelativeTime, formatSpan } from '@levain/ui-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const LOADED = Date.now();
const MIN = 60, HOUR = 3600;

// board.css: .meta (12px, line-height 1.5, faint, space-between), .lead (500, muted), .flag.you (--rm-amber, hand-picked)
const meta: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' };
const lead: CSSProperties = { fontWeight: 500, color: 'var(--color-text-muted)' };
const body: CSSProperties = { margin: '0.5rem 0 0', color: 'var(--color-text-muted)' };

/** The board's own clock: an interval per use, every second. */
function useBoardNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

// whole: the consumer colours the whole phrase like the board's flag, from the time's data-state (styles.css :has)
type Row = { who: string; code: string; ago: number; flag?: (t: ReactNode) => ReactNode; warnAfter?: number; whole?: boolean };
const ROWS: Row[] = [
  { who: 'eng3', code: 'T6', ago: 45 },
  { who: 'Question', code: 'Q25', ago: 12 * MIN },
  { who: 'Question', code: 'Q18', ago: 20 * MIN, warnAfter: 15 * MIN, flag: (t) => <>Waiting {t}</> },
  { who: 'eng1', code: 'T22', ago: 3 * HOUR + 20 * MIN, warnAfter: 15 * MIN, flag: (t) => <>Asked {t} ago</>, whole: true },
  { who: 'PM', code: 'T4', ago: 2 * HOUR },
  { who: 'PM', code: 'T2', ago: 50 * HOUR },
];

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2xs">
      <h4 className="type-caption text-[var(--color-text-muted)]">{label}</h4>
      <div className="space-y-xs">{children}</div>
    </div>
  );
}

export function RelativeTimeDemo({ Section }: { Section: (p: { title: string; note: string; children: ReactNode }) => ReactNode }) {
  const boardNow = useBoardNow();
  const board = (r: Row) => formatSpan((boardNow - (LOADED - r.ago * 1000)) / 1000);
  return (
    <Section title="Relative time" note="RelativeTime beside a copy of the board's meta line. The top row ticks every second; past 90 s the shared clock ticks once a minute. Past warnAfter the time takes the caution colour.">
      <div data-compare className="grid grid-cols-1 gap-md rounded-[var(--radius-xl)] bg-[var(--color-surface-section)] p-sm sm:grid-cols-2">
        <Card label="Board (hand-built)">
          {ROWS.map((r) => (
            <div key={r.code} data-board-row={r.code} className="rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] px-sm py-xs">
              <div style={meta}><span><span style={lead}>{r.who}</span> · {r.code}</span><span>{board(r)}</span></div>
              {r.flag && <p style={body} className="type-body-sm"><span style={{ whiteSpace: 'nowrap', color: 'var(--rm-amber)' }}>{r.flag(board(r))}</span>: on the board's own amber</p>}
            </div>
          ))}
        </Card>
        <Card label="levain RelativeTime">
          {ROWS.map((r) => {
            const at = LOADED - r.ago * 1000;
            return (
              <div key={r.code} data-levain-row={r.code} className="rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] px-sm py-xs">
                <div style={meta}><span><span style={lead}>{r.who}</span> · {r.code}</span><RelativeTime at={at} /></div>
                {r.flag && (
                  <p style={body} className="type-body-sm">
                    <span className={r.whole ? 'late-phrase' : undefined}>{r.flag(<RelativeTime at={at} warnAfter={r.warnAfter} />)}</span>
                    : caution past {formatSpan(r.warnAfter!)}{r.whole ? ', the phrase via :has' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </Card>
      </div>
    </Section>
  );
}
