// T67: the default page is the catalogue. The test bench (the page as it was: the board copies beside levain's pieces,
// the room the captures need) shows under ?bench=1 and on every ?only= address, so their frames don't change.
const q = new URLSearchParams(location.search);
export const BENCH = q.get('bench') === '1' || q.has('only');

// The bench's sample words are the team's own (task codes, PM, names); the catalogue is public, so off the bench they
// read as plain samples: T50 → #50, PM → Lead, eng2 → Dev, Matt → Design. On the bench the text is unchanged.
const PLAIN: [RegExp, string][] = [[/\b[TLDQRBC](\d{1,3})\b/g, '#$1'], [/\bPM\b/g, 'Lead'], [/\beng\d\b/g, 'Dev'], [/\bMatt\b/g, 'Design']];
export const plain = (s: string) => (BENCH ? s : PLAIN.reduce((t, [re, to]) => t.replace(re, to), s));

/** plain() over every string in plain data (arrays and object literals), except `id` and `key` (they name DOM ids and drag
 *  keys; show them through plain()); anything else (icons, elements) is left as is. */
export function sample<T>(v: T): T {
  if (BENCH) return v;
  if (typeof v === 'string') return plain(v) as T;
  if (Array.isArray(v)) return v.map(sample) as T;
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype && !('$$typeof' in v))
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'id' || k === 'key' ? x : sample(x)])) as T;
  return v;
}
