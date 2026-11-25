import type { Control, Movement } from '../../sim/types';

/**
 * What each kind of junction is good for, and what it would do here, in plain
 * words. Judged from who comes in from where: no promises in seconds.
 */
export const CONTROL_ORDER: readonly Control[] = ['yield', 'roundabout', 'signal', 'smart'];
export const CONTROL_NAMES: Readonly<Record<Control, string>> = { yield: 'Give way', roundabout: 'Roundabout', signal: 'Signals', smart: 'Smart signals' };
export const CONTROL_WORDS: Readonly<Record<Control, string>> = {
  yield: 'Good on quiet corners.',
  roundabout: 'Good when all sides are similar.',
  signal: 'Good when one side is heavy.',
  smart: 'Signals that watch the queues. Good nearly everywhere.',
};

export type Effect = 'much' | 'better' | 'same' | 'worse';
export const EFFECT_WORDS: Readonly<Record<Effect, string>> = { much: 'Would help a lot here', better: 'Would help here', same: 'Not much change here', worse: 'Would hurt here' };

/** The share of cars from the busiest side, how many sides have cars, and how long they wait. */
export interface Inflow { readonly top: number; readonly sides: number; readonly cars: number; readonly wait: number }

const SIDE_FLOOR = 0.06;
const HEAVY = 0.52;
const EVEN = 0.42;
const BUSY_WAIT = 7; // seconds: the junction has a problem
const CALM_WAIT = 4;

/** How cars come in. Pure. */
export function inflow(moves: readonly Movement[]): Inflow {
  const by = new Map<number, number>();
  let cars = 0;
  let wait = 0;
  for (const m of moves) {
    if (m.flyover) continue;
    by.set(m.fromRoad, (by.get(m.fromRoad) ?? 0) + m.cars);
    cars += m.cars;
    wait += m.wait * m.cars;
  }
  if (cars === 0) return { top: 0, sides: 0, cars: 0, wait: 0 };
  const shares = [...by.values()].map((n) => n / cars);
  return { top: Math.max(...shares), sides: shares.filter((s) => s > SIDE_FLOOR).length, cars, wait: wait / cars };
}

/** What changing to `to` would do, given what stands here now. Pure. */
export function effectOf(now: Control, to: Control, f: Inflow): Effect {
  const gain = score(to, f) - score(now, f);
  if (f.wait < CALM_WAIT && gain > 0) return 'same'; // nothing here needs help
  if (gain > 1.4) return 'much';
  if (gain > 0.3) return 'better';
  return gain < -0.3 ? 'worse' : 'same';
}

/** How well a control suits this inflow; only the differences matter. */
function score(c: Control, f: Inflow): number {
  const busy = f.wait >= BUSY_WAIT;
  const calm = f.wait < CALM_WAIT;
  const heavy = f.top >= HEAVY;
  const even = f.top > 0 && f.top <= EVEN;
  switch (c) {
    case 'yield': return calm ? 0.6 : busy ? -1 : -0.3;
    case 'roundabout': return (heavy ? -0.4 : even ? 1.2 : 0.5) + (calm ? -0.4 : 0);
    case 'signal': return (heavy ? 0.9 : 0.2) + (calm ? -1 : 0);
    case 'smart': return (heavy ? 1.6 : 1) + (calm ? -0.8 : 0);
  }
}

/** The best of what is open, if it beats what is here. Pure. */
export function advised(now: Control, open: readonly Control[], f: Inflow): Control | null {
  if (f.wait < CALM_WAIT) return null;
  const best = [...open].sort((a, b) => score(b, f) - score(a, f))[0];
  return best && best !== now && score(best, f) > score(now, f) + 0.3 ? best : null;
}

export type Icon = Control;
const INK = '#2a2832';
/** Small drawn signs: the give-way triangle, the ring, the lamps. */
export const CONTROL_ICONS: Readonly<Record<Icon, string>> = {
  yield: `<svg viewBox="0 0 40 40"><path d="M5 8h30L20 35z" fill="#fffaf0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M11 12h18l-9 16z" fill="none" stroke="#c8962a" stroke-width="3" stroke-linejoin="round"/></svg>`,
  roundabout: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#8b898f" stroke="${INK}" stroke-width="2.5"/><circle cx="20" cy="20" r="6.5" fill="#9fae6e" stroke="${INK}" stroke-width="2"/><path d="M20 8.5a11.5 11.5 0 0 1 10.6 7M20 31.5a11.5 11.5 0 0 1-10.6-7" fill="none" stroke="#fffaf0" stroke-width="2.6" stroke-linecap="round"/><path d="m32 11-.8 6-5.4-2.2zM8 29l.8-6 5.4 2.2z" fill="#fffaf0"/></svg>`,
  signal: `<svg viewBox="0 0 40 40"><rect x="13" y="3" width="14" height="34" rx="5" fill="#4b4a55" stroke="${INK}" stroke-width="2.5"/><circle cx="20" cy="10.5" r="4" fill="#7d5a52"/><circle cx="20" cy="20" r="4" fill="#e2b84f"/><circle cx="20" cy="29.5" r="4" fill="#67b26f"/></svg>`,
  smart: `<svg viewBox="0 0 40 40"><rect x="8" y="3" width="14" height="34" rx="5" fill="#4b4a55" stroke="${INK}" stroke-width="2.5"/><circle cx="15" cy="10.5" r="4" fill="#7d5a52"/><circle cx="15" cy="20" r="4" fill="#e2b84f"/><circle cx="15" cy="29.5" r="4" fill="#67b26f"/><path d="M27 14a9 9 0 0 1 0 12M31 10a15 15 0 0 1 0 20" fill="none" stroke="#2c7a80" stroke-width="3" stroke-linecap="round"/></svg>`,
};

