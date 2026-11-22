// The motion rules in docs/assembly.json that a reviewer can check mechanically, checked over every component.
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'tests' || f === '__mocks__' ? [] : files(p);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}
const sources = files(SRC).map(p => ({ p: p.slice(SRC.length + 1), s: readFileSync(p, 'utf8') }));
const animated = sources.filter(f => /from 'framer-motion'/.test(f.s));
const assembly = JSON.parse(readFileSync(join(SRC, '../docs/assembly.json'), 'utf8'));

describe('motion rules (assembly.json)', () => {
  it('the motion rules are written down, with why and how to check, morph-not-swap first', () => {
    const ids = assembly.rules.map((r: { id: string }) => r.id);
    const motion = ['morph-not-swap', 'motion-from-tokens', 'arrive-on-the-spring', 'arrive-from-somewhere', 'content-follows-container', 'lists-close-gaps', 'motion-never-blocks', 'live-updates-ease-in', 'drag-physics', 'reduced-motion'];
    for (const id of motion) expect(ids).toContain(id);
    expect(ids.filter((id: string) => motion.includes(id))[0]).toBe('morph-not-swap');
    for (const r of assembly.rules.filter((r: { id: string }) => motion.includes(r.id))) {
      expect(r.why.length).toBeGreaterThan(40);
      expect(r.check.length).toBeGreaterThan(40);
    }
  });

  it('motion-from-tokens: no framer-motion transition carries literal timing (continuous indicators excepted, by marker)', () => {
    const bad: string[] = [];
    for (const f of animated) {
      const lines = f.s.split('\n');
      lines.forEach((line, i) => {
        if (/\b(duration|stiffness|damping|bounce|delay):\s*[0-9.]/.test(line) || /\bease:\s*\[/.test(line)) {
          const near = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
          if (!/motion: continuous indicator/.test(near)) bad.push(`${f.p}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it('reduced-motion: every file that animates with framer-motion reads the reader\'s preference', () => {
    const missing = animated.filter(f => !/useReducedMotion|motion\(|motionFor\(/.test(f.s)).map(f => f.p);
    expect(missing).toEqual([]);
  });

  it('CSS timing in components never exceeds the arrival duration (620 ms) for new classes', () => {
    const over = sources.flatMap(f => [...f.s.matchAll(/\bduration-(\d+)\b/g)].map(m => Number(m[1])).filter(ms => ms > 620).map(ms => `${f.p}: duration-${ms}`));
    expect(over).toEqual([]);
  });
});
