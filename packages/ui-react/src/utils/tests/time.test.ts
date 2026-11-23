/**
 * @jest-environment node
 */
import { formatSpan } from '../time';

// The board's span() (ringmaster board/src/time.ts), copied verbatim: formatSpan must agree with it everywhere.
function boardSpan(secs: number) {
  if (!Number.isFinite(secs)) return '';
  const s = Math.max(0, secs);
  if (s < 90) return Math.round(s) + 's';
  if (s < 5400) return Math.round(s / 60) + 'm';
  if (s >= 172_800) return Math.floor(s / 86_400) + 'd';
  const mins = Math.round(s / 60), h = Math.floor(mins / 60), m = mins % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}

const MIN = 60, HOUR = 3600, DAY = 86_400;

describe('formatSpan', () => {
  it.each([
    [0, '0s'],
    [45, '45s'],
    [89, '89s'],
    [90, '2m'], // 90 s: minutes from here
    [12 * MIN, '12m'],
    [89 * MIN, '89m'],
    [90 * MIN, '1h 30m'], // 90 min: hours and minutes from here
    [2 * HOUR, '2h'], // an exact hour: no "2h 0m"
    [3 * HOUR + 20 * MIN, '3h 20m'],
    [47 * HOUR, '47h'],
    [47 * HOUR + 59 * MIN, '47h 59m'],
    [48 * HOUR, '2d'], // 48 h: days from here
    [3 * DAY - 1, '2d'], // days round down
    [10 * DAY, '10d'],
  ])('%p s reads %p', (secs, want) => {
    expect(formatSpan(secs)).toBe(want);
  });

  it('reads a future time (negative seconds) as 0s', () => {
    expect(formatSpan(-30)).toBe('0s');
    expect(formatSpan(-5 * DAY)).toBe('0s');
  });

  it('reads an invalid time as nothing', () => {
    expect(formatSpan(NaN)).toBe('');
    expect(formatSpan(Infinity)).toBe('');
    expect(formatSpan(-Infinity)).toBe('');
  });

  it('agrees with the board on every second of the first three days, and on fractions near each boundary', () => {
    const odd: string[] = [];
    for (let s = 0; s <= 3 * DAY; s++) if (formatSpan(s) !== boardSpan(s)) odd.push(String(s));
    for (const b of [90, 90 * MIN, 48 * HOUR]) for (const d of [-0.6, -0.5, -0.4, -0.01, 0.01, 0.5]) {
      if (formatSpan(b + d) !== boardSpan(b + d)) odd.push(String(b + d));
    }
    expect(odd).toEqual([]);
  });
});
