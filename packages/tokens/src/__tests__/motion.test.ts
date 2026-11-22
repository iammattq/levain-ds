import { readFileSync } from 'fs';
import { join } from 'path';
import { css, drag, duration, ease, instant, motion, spring, tween } from '../motion';

const shared = readFileSync(join(__dirname, '../styles/shared.css'), 'utf8');
const root = shared.slice(shared.indexOf(':root {'), shared.indexOf('\n}', shared.indexOf(':root {')));

describe('motion tokens', () => {
  it('no duration outlasts 300 ms', () => {
    for (const ms of Object.values(duration)) expect(ms).toBeLessThanOrEqual(300);
    for (const s of Object.values(spring)) if ('duration' in s) expect(s.duration * 1000).toBeLessThanOrEqual(300);
  });

  it('nothing bounces visibly: only settle has any bounce, and at most 0.15', () => {
    for (const [name, s] of Object.entries(spring)) {
      if (!('bounce' in s)) continue;
      if (name === 'settle') expect(s.bounce).toBeLessThanOrEqual(0.15);
      else expect(s.bounce).toBe(0);
    }
  });

  it('springs given as physics are critically damped or more (no oscillation)', () => {
    for (const s of Object.values(spring)) {
      if (!('stiffness' in s)) continue;
      expect(s.damping).toBeGreaterThanOrEqual(2 * Math.sqrt(s.stiffness * s.mass) * 0.9);
    }
  });

  it('shared.css declares the same values as the TypeScript tokens', () => {
    for (const [name, value] of Object.entries(css)) {
      const m = new RegExp(`${name}:\\s*([^;]+);`).exec(root);
      expect(m?.[1]?.trim()).toBe(value);
    }
  });

  it('reduced motion turns every duration and recipe into an instant change', () => {
    const block = shared.slice(shared.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const d of ['quick', 'base', 'slow']) expect(block).toMatch(new RegExp(`--duration-${d}:\\s*0ms`));
    for (const name of Object.keys(spring) as (keyof typeof spring)[]) expect(motion(name, true)).toBe(instant);
    expect(motion(tween('slow'), true)).toBe(instant);
    expect(motion('layout', false)).toBe(spring.layout);
  });

  it('tween reads the tokens in seconds', () => {
    expect(tween('base', 'inOut')).toEqual({ duration: 0.22, ease: [...ease.inOut] });
  });

  it('a lifted card stays subtle', () => {
    expect(drag.liftScale).toBeGreaterThan(1);
    expect(drag.liftScale).toBeLessThanOrEqual(1.05);
    expect(drag.maxTilt).toBeLessThanOrEqual(6);
  });
});
