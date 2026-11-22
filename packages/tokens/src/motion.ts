/**
 * Motion tokens: the durations, easings and springs every levain transition uses.
 *
 * One source for both worlds: CSS reads the same values as custom properties (`--duration-base`, `--ease-out`, in
 * shared.css; a test keeps the two in step), and framer-motion takes the objects below directly
 * (`transition={spring.layout}`).
 *
 * The limits are rules in ui-react/docs/assembly.json: no transition outlasts 300 ms, nothing bounces visibly
 * (bounce at most 0.15, and 0 for anything that isn't released by a hand), and motion never delays input.
 * `prefers-reduced-motion` maps every recipe to an instant change (`reduced`).
 */

/** Durations in milliseconds. `instant` is a state change with no motion. */
export const duration = {
  instant: 0,
  /** Feedback: a press, a hover, a check mark. */
  quick: 150,
  /** Most UI: a list item entering, a tab's content, a tooltip. */
  base: 220,
  /** The largest moves: a dialog opening from its card, a drawer. */
  slow: 300,
} as const;
export type DurationName = keyof typeof duration;

/** Cubic-bézier easings, as [x1, y1, x2, y2] (framer-motion's `ease`) and as CSS (`css.ease`). */
export const ease = {
  /** Entering, leaving, and the default: fast start, soft landing. */
  out: [0.23, 1, 0.32, 1],
  /** Moving or morphing on screen, from one place to another. */
  inOut: [0.77, 0, 0.175, 1],
  /** Colour and opacity on hover. */
  standard: [0.25, 0.1, 0.25, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type EaseName = keyof typeof ease;

type SpringBounce = { type: 'spring'; duration: number; bounce: number };
type SpringPhysics = { type: 'spring'; stiffness: number; damping: number; mass: number };

/**
 * Named springs. `duration` is in seconds (framer-motion's perceptual duration).
 * - `layout`: things making room or closing a gap (list neighbours, a card growing into its dialog). No bounce.
 * - `lift`: a card picked up: scale and shadow step up. No bounce.
 * - `settle`: a dragged card released into its place. A trace of bounce, the only one in the system.
 * - `follow`: the lifted card trailing the pointer, a few frames behind (stiffness and damping, for `useSpring`).
 * - `tilt`: the lean a moving card takes from its velocity, eased back to upright.
 */
export const spring = {
  layout: { type: 'spring', duration: 0.28, bounce: 0 },
  lift: { type: 'spring', duration: 0.18, bounce: 0 },
  settle: { type: 'spring', duration: 0.3, bounce: 0.12 },
  follow: { type: 'spring', stiffness: 900, damping: 60, mass: 0.6 },
  tilt: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 },
} as const satisfies Record<string, SpringBounce | SpringPhysics>;
export type SpringName = keyof typeof spring;

/** A tween transition from the tokens, for framer-motion: `transition={tween('base')}`. */
export const tween = (d: DurationName = 'base', e: EaseName = 'out') => ({ duration: duration[d] / 1000, ease: ease[e] as unknown as number[] });

/** The drag recipe's numbers: how far a lifted card scales and leans, and how far a pointer moves before a drag starts. */
export const drag = {
  /** Scale of a lifted card. */
  liftScale: 1.03,
  /** The most a moving card leans, in degrees, and the pointer speed (px/s) that reaches it. */
  maxTilt: 5,
  tiltAtSpeed: 1600,
  /** Pixels a mouse moves before a press becomes a drag (so a click stays a click). */
  mouseSlop: 4,
  /** Milliseconds a finger holds still before a touch becomes a drag (so a swipe still scrolls). */
  touchHold: 180,
} as const;

/** What `prefers-reduced-motion: reduce` turns every transition into: an instant change. */
export const instant = { duration: 0 } as const;

/**
 * The transition to use: the named one, or an instant change when the reader asked for reduced motion.
 * `motion('layout', reduce)`, `motion(tween('quick'), reduce)`.
 */
export function motion<K extends SpringName>(t: K, reduce: boolean | null | undefined): (typeof spring)[K] | typeof instant;
export function motion<T extends object>(t: T, reduce: boolean | null | undefined): T | typeof instant;
export function motion(t: SpringName | object, reduce: boolean | null | undefined) {
  if (reduce) return instant;
  return typeof t === 'string' ? spring[t] : t;
}

/** The CSS custom properties shared.css declares, by name, as their values. */
export const css = {
  '--duration-instant': '0ms',
  '--duration-quick': `${duration.quick}ms`,
  '--duration-base': `${duration.base}ms`,
  '--duration-slow': `${duration.slow}ms`,
  '--ease-out': `cubic-bezier(${ease.out.join(', ')})`,
  '--ease-in-out': `cubic-bezier(${ease.inOut.join(', ')})`,
  '--ease-standard': `cubic-bezier(${ease.standard.join(', ')})`,
} as const;
