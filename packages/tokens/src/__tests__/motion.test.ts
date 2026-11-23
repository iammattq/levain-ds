import { readFileSync } from 'fs';
import { join } from 'path';
import { css, drag, duration, ease, instant, motion, recipe, springEase, springStops, tiltSpring } from '../motion';

const shared = readFileSync(join(__dirname, '../styles/shared.css'), 'utf8');
const root = shared.slice(shared.indexOf(':root {'), shared.indexOf('\n}', shared.indexOf(':root {')));
const flat = (v: string) => v.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/, /g, ', ').trim();
const bezierMax = (e: readonly number[]) => { let m = 0; for (let i = 0; i <= 100; i++) { const t = i / 100, y = 3 * (1 - t) ** 2 * t * e[1]! + 3 * (1 - t) * t ** 2 * e[3]! + t ** 3; m = Math.max(m, y); } return m; };

describe('motion tokens (baseline: the OS shell on mattquinn.ca)', () => {
  it('bigger things take longer: the roles are ordered by size and travel', () => {
    const order = ['instant', 'contentOut', 'quick', 'contentIn', 'shift', 'sheetOut', 'travel', 'morph', 'arrival'] as const;
    const ms = order.map(k => duration[k]);
    expect(ms).toEqual([...ms].sort((a, b) => a - b));
    expect(duration.arrival).toBe(620);
    expect(duration.morph).toBe(460);
  });

  it('leaving is quicker than arriving', () => {
    expect(recipe.depart.duration).toBeLessThan(recipe.arrive.duration);
    expect(recipe.collapse.duration).toBeLessThan(recipe.morph.duration);
    expect(recipe.sheetOut.duration).toBeLessThan(recipe.sheetIn.duration);
    expect(recipe.contentOut.duration).toBeLessThan(recipe.contentIn.duration);
  });

  it('only the spring overshoots, and only slightly; the eases never do', () => {
    const peak = Math.max(...springStops.map(([v]) => v));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(1.03);
    for (const e of Object.values(ease)) expect(bezierMax(e)).toBeLessThanOrEqual(1);
    for (const name of ['collapse', 'shift', 'sheetIn', 'sheetOut', 'travel', 'fadeIn', 'contentIn', 'contentOut', 'quick'] as const)
      expect(typeof recipe[name].ease).not.toBe('function');
  });

  it('the spring function follows its samples, from 0 to 1', () => {
    expect(springEase(0)).toBe(0);
    expect(springEase(1)).toBe(1);
    expect(springEase(0.36)).toBeCloseTo(1.024, 3);
    expect(springEase(0.066)).toBeCloseTo(0.263, 3);
  });

  it('the tilt spring is critically damped or more (no wobble)', () => {
    expect(tiltSpring.damping).toBeGreaterThanOrEqual(2 * Math.sqrt(tiltSpring.stiffness * tiltSpring.mass));
  });

  it('shared.css declares the same values as the TypeScript tokens', () => {
    for (const [name, value] of Object.entries(css)) {
      const m = new RegExp(`${name}:\\s*([^;]+);`).exec(root);
      expect(flat(m?.[1] ?? '')).toBe(flat(value));
    }
  });

  it('reduced motion turns every duration and recipe into an instant change', () => {
    const block = shared.slice(shared.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const name of Object.keys(css).filter(n => n.startsWith('--duration-') && n !== '--duration-instant')) expect(block).toMatch(new RegExp(`${name}:\\s*0ms`));
    expect(block).toMatch(/--stagger:\s*0ms/);
    for (const name of Object.keys(recipe) as (keyof typeof recipe)[]) expect(motion(name, true)).toBe(instant);
    expect(motion('morph', false)).toBe(recipe.morph);
  });

  it('a lifted card stays subtle', () => {
    expect(drag.liftScale).toBeGreaterThan(1);
    expect(drag.liftScale).toBeLessThanOrEqual(1.05);
    expect(drag.maxTilt).toBeLessThanOrEqual(6);
  });

  it('an ordinary drag leans visibly: about 6° by 600 px/s, a slow one gently', () => {
    const lean = (speed: number) => Math.min(speed / drag.tiltAtSpeed, 1) * drag.maxTilt;
    expect(lean(600)).toBeCloseTo(6, 5);
    expect(lean(150)).toBeGreaterThanOrEqual(1);
    expect(lean(150)).toBeLessThanOrEqual(2);
  });
});
