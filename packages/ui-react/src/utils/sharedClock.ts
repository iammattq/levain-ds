// One clock for every live time on the page. All instances read the same `now`; one interval drives it. The interval
// ticks every second while any instance is under 90 s old (seconds are showing), every minute otherwise, and stops when
// the last instance unmounts.
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

const FAST = 1000;
const SLOW = 60_000;
/** Below this age (ms) a time reads in seconds, so it needs the fast tick. Future times count as young. */
const SECONDS_SHOWING = 90_000;

type Sub = { notify: () => void; at: () => number };

const subs = new Set<Sub>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
let cadence = 0;

const wanted = () => {
  const t = Date.now();
  for (const s of subs) if (t - s.at() < SECONDS_SHOWING) return FAST;
  return SLOW;
};

function tick() {
  now = Date.now();
  for (const s of subs) s.notify();
  // the youngest may have grown past 90 s, or a new young one arrived: re-pick the cadence
  schedule();
}

/** Starts, re-paces or stops the one interval to suit the instances mounted now. */
function schedule() {
  const next = subs.size ? wanted() : 0;
  if (next === cadence) return;
  if (timer !== null) clearInterval(timer);
  timer = null;
  cadence = next;
  if (next) timer = setInterval(tick, next);
}

/** Re-picks the cadence; when it changes (the clock was stopped, or slow and a young time arrived), ticks at once. */
function repace() {
  const before = cadence;
  schedule();
  if (cadence !== before) tick();
}

function subscribe(sub: Sub) {
  subs.add(sub);
  repace();
  return () => {
    subs.delete(sub);
    schedule();
  };
}

// While stopped, `now` goes stale; the first instance to mount reads a fresh one. Refreshed at most once a second so
// React's back-to-back snapshot reads agree.
const getNow = () => {
  if (timer === null && Date.now() - now >= FAST) now = Date.now();
  return now;
};

/**
 * The page's shared `now` in ms, live. `at` (ms since the epoch) is the moment this caller shows; a young one (under
 * 90 s, or in the future) asks the shared clock for a tick every second.
 */
export function useSharedNow(at: number): number {
  const atRef = useRef(at);
  atRef.current = at;
  const sub = useCallback((notify: () => void) => subscribe({ notify, at: () => atRef.current }), []);
  // a new, younger `at` may need the fast tick now rather than at the next slow one
  useEffect(repace, [at]);
  return useSyncExternalStore(sub, getNow, getNow);
}

/** For tests: whether the clock is running and how often. */
export const clockState = () => ({ running: timer !== null, cadence, subscribers: subs.size });
