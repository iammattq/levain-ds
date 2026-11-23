// The Ringmaster board's way of writing a length of time, one format everywhere: "45s", "12m", "2h", "3h 20m", "2d".
// Its rules are the board's `span()` (board/src/time.ts), kept exactly so the two read the same side by side.

/**
 * A length of time in seconds as "45s", "12m", "3h 20m" or "2d": seconds under 90 s, minutes under 90 min, hours and
 * minutes under 48 h (no "2h 0m"), whole days from 48 h. Negative counts as 0 ("0s"); NaN or infinite gives "".
 */
export function formatSpan(seconds: number): string {
  if (!Number.isFinite(seconds)) return '';
  const s = Math.max(0, seconds);
  if (s < 90) return Math.round(s) + 's';
  if (s < 5400) return Math.round(s / 60) + 'm';
  if (s >= 172_800) return Math.floor(s / 86_400) + 'd';
  const mins = Math.round(s / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h' + (m ? ' ' + m + 'm' : '');
}
