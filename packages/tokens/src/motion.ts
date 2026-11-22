/**
 * Motion tokens: the durations, easings and recipes every levain transition uses.
 *
 * Taken from the motion of mattquinn.ca's OS shell (its menu, windows and dock), whose comments are the rules: a real
 * spring that overshoots and settles on arrival; bigger things take longer; leaving is quicker than arriving, and
 * without overshoot; things arrive from somewhere; content follows its container. The portfolio now reads these
 * tokens, so the two can't drift.
 *
 * One source for both worlds: CSS reads them as custom properties (`--duration-morph`, `--ease-spring`, in shared.css;
 * a test keeps the two equal), and framer-motion takes the `recipe` objects directly (`transition={recipe.morph}`).
 * `prefers-reduced-motion` maps every recipe to an instant change (`motion(name, reduce)`).
 */

/** Durations in milliseconds, named by role. Bigger and further-travelling things take longer. */
export const duration = {
  instant: 0,
  /** A container's contents leaving ahead of it. */
  contentOut: 90,
  /** Feedback: a press, a hover, a check mark. */
  quick: 150,
  /** A container's contents fading in once there is room; a tab's content. */
  contentIn: 220,
  /** Neighbours moving aside to make room; a small shape collapsing (the menu closing to its button). */
  shift: 260,
  /** A bottom sheet dropping away. */
  sheetOut: 280,
  /** A box travelling across the screen to a new home (a window to the dock); an arrival's opacity leg. */
  travel: 300,
  /** A small object changing shape (the menu button becoming the menu); a large one leaving; a sheet rising. */
  morph: 460,
  /** A large object arriving (a window rising into place). */
  arrival: 620,
} as const;
export type DurationName = keyof typeof duration;

/** Delay between siblings entering one after another (menu rows), in ms. */
export const stagger = 28;

/**
 * The spring, sampled: points past 1 are the overshoot, the tail is the settle. A cubic-bézier can't overshoot and
 * settle, which is the whole character of the motion, so CSS uses it as `linear()` and framer-motion as a function.
 * [value, at %] pairs.
 */
export const springStops = [
  [0, 0], [0.008, 1.1], [0.034, 2.3], [0.263, 6.6], [0.552, 11.1], [0.777, 15.6], [0.914, 20.3], [0.984, 25.2],
  [1.016, 30.4], [1.024, 36], [1.017, 42.3], [1.004, 55.4], [0.999, 76], [1, 100],
] as const;

/** The sampled spring as an easing function (0 → 1, overshooting to ~1.024), for framer-motion's `ease`. */
export function springEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x = t * 100;
  for (let i = 1; i < springStops.length; i++) {
    const [v1, p1] = springStops[i]!, [v0, p0] = springStops[i - 1]!;
    if (x <= p1) return v0 + ((v1 - v0) * (x - p0)) / (p1 - p0);
  }
  return 1;
}

/** Cubic-bézier easings as [x1, y1, x2, y2]. None of them overshoots: overshoot belongs to arrivals, on the spring. */
export const ease = {
  /** Collapsing back, sheets rising: deliberate rather than bouncy. */
  springOut: [0.4, 0, 0.2, 1],
  /** Travelling away: leans into the travel, eases out at the destination. */
  away: [0.5, 0, 0.2, 1],
  /** Fades: opacity in and out (CSS's `ease-out`). */
  out: [0, 0, 0.58, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type EaseName = keyof typeof ease;

const t = (ms: number, e: ((x: number) => number) | readonly number[]) => ({ duration: ms / 1000, ease: e as never });

/**
 * framer-motion transitions by role. Arrivals ride the spring (they may overshoot); departures and making room don't.
 */
export const recipe = {
  /** A small object changing shape: a card growing into its dialog, a button into its menu. */
  morph: t(duration.morph, springEase),
  /** A large object arriving: a window or full dialog rising into place. Pair its opacity with `fadeIn`. */
  arrive: t(duration.arrival, springEase),
  /** A large object leaving (quicker than it came). */
  depart: t(duration.morph, springEase),
  /** A small shape collapsing back: the dialog returning to its card. */
  collapse: t(duration.shift, ease.springOut),
  /** Neighbours moving aside or closing a gap. */
  shift: t(duration.shift, ease.springOut),
  /** A sheet rising from the bottom edge (no overshoot: it would lift clear of the edge). */
  sheetIn: t(duration.morph, ease.springOut),
  /** A sheet dropping away. */
  sheetOut: t(duration.sheetOut, ease.away),
  /** A box travelling to a new home. */
  travel: t(duration.travel, ease.away),
  /** An arrival's opacity. */
  fadeIn: t(duration.travel, ease.out),
  /** Contents fading in after their container. */
  contentIn: t(duration.contentIn, ease.out),
  /** Contents leaving ahead of their container. */
  contentOut: t(duration.contentOut, ease.out),
  /** A press, a hover; a dragged card lifting. */
  quick: t(duration.quick, ease.out),
  /** A dragged card landing in its slot: a small arrival, on the spring. */
  settle: t(duration.morph, springEase),
} as const;
export type RecipeName = keyof typeof recipe;

/** The lean a dragged card takes from its velocity, eased back to upright (a critically damped spring, for `useSpring`). */
export const tiltSpring = { stiffness: 380, damping: 40, mass: 0.8 } as const;

/** The drag recipe's numbers. A drag tracks the finger exactly (no lag, transitions off); only the lean is sprung. */
export const drag = {
  /** Scale of a lifted card. */
  liftScale: 1.03,
  /** The most a moving card leans, in degrees, and the pointer speed (px/s) that reaches it. */
  maxTilt: 4,
  tiltAtSpeed: 1600,
  /** Pixels a mouse moves before a press becomes a drag (so a click stays a click). */
  mouseSlop: 4,
  /** Milliseconds a finger holds a card before the touch becomes a drag (so a swipe still scrolls). */
  touchHold: 250,
  /** Pixels a finger may wander during the hold; past this it's a scroll and the hold is off. */
  touchSlop: 8,
  /** Pixels from the top or bottom of the window where a held card scrolls the page, and the most it scrolls a frame. */
  edgeZone: 56,
  edgeSpeed: 14,
} as const;

/** What `prefers-reduced-motion: reduce` turns every transition into: an instant change. */
export const instant = { duration: 0 } as const;

/** The transition to use: the named recipe (or any transition), or an instant change under reduced motion. */
export function motion<K extends RecipeName>(r: K, reduce: boolean | null | undefined): (typeof recipe)[K] | typeof instant;
export function motion<T extends object>(r: T, reduce: boolean | null | undefined): T | typeof instant;
export function motion(r: RecipeName | object, reduce: boolean | null | undefined) {
  if (reduce) return instant;
  return typeof r === 'string' ? recipe[r] : r;
}

const bezier = (e: readonly number[]) => `cubic-bezier(${e.join(', ')})`;
/** The CSS custom properties shared.css declares, by name, as their values. */
export const css: Record<string, string> = {
  ...Object.fromEntries(Object.entries(duration).map(([k, ms]) => [`--duration-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}`, `${ms}ms`])),
  '--stagger': `${stagger}ms`,
  '--ease-spring': `linear(${springStops.map(([v, p]) => (p === 0 || p === 100 ? `${v}` : `${v} ${p}%`)).join(', ')})`,
  '--ease-spring-out': bezier(ease.springOut),
  '--ease-away': bezier(ease.away),
  '--ease-out': bezier(ease.out),
};
