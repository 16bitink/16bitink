import { DRIFT, pathAt, PERIOD, TILT } from '../gulphen/path';
import type { Pt } from '../sprites';

/**
 * Where the moray lies: its "rail", world units, s from where its nose is on
 * frame 1. Up to JOIN the rail is the snake's own path (the chicken short's
 * serpentine, gulphen/path.ts), so what is in the jaws lies along the snake;
 * past it the rail bends down and away, into the eel's hole in a coral head
 * below the snake's row, and runs on straight inside it. The eel slides
 * along its rail like a train: pulled out of the hole into the jaws, and
 * (the next one) poking out of its own hole one period on.
 */
export { DRIFT, pathAt, PERIOD, TILT };

export const JOIN = 330;
const ARC = 330;
/** How far the rail turns, down, from the snake's heading. */
const BEND = (62 * Math.PI) / 180;
/** The hole's mouth, along the rail. */
export const HOLE_S = JOIN + ARC + 30;
const STEP = 4;
const ROW = Math.PI - TILT;

const ease = (u: number): number => u * u * (3 - 2 * u);
const headingAt = (s: number): number => (s <= JOIN ? ROW : ROW - BEND * ease(Math.min(1, (s - JOIN) / ARC)));

/** The bent part, as a table from JOIN on. */
const BENT: readonly Pt[] = (() => {
  const start = pathAt(JOIN);
  const out: Pt[] = [{ x: start.x, y: start.y }];
  for (let i = 0; i < Math.ceil((ARC + 2000) / STEP); i++) {
    const h = headingAt(JOIN + (i + 0.5) * STEP);
    const p = out[i]!;
    out.push({ x: p.x + Math.cos(h) * STEP, y: p.y + Math.sin(h) * STEP });
  }
  return out;
})();

export interface RailPoint extends Pt {
  readonly heading: number;
}

/** Eel k's rail (k = 0 the first, 1 the next, one period on) at s. */
export function railAt(s: number, k = 0): RailPoint {
  if (s <= JOIN) {
    const p = pathAt(s + k * PERIOD);
    return { x: p.x, y: p.y, heading: ROW };
  }
  const f = Math.min(BENT.length - 1.001, (s - JOIN) / STEP);
  const i = Math.floor(f);
  const [a, b] = [BENT[i]!, BENT[i + 1]!];
  return { x: a.x + (b.x - a.x) * (f - i) + k * DRIFT.x, y: a.y + (b.y - a.y) * (f - i) + k * DRIFT.y, heading: headingAt(s) };
}

/** The hole's mouth for eel k, and the way into it. */
export const holeAt = (k: number): RailPoint => railAt(HOLE_S, k);

/** The coral head round the hole: its centre past the mouth, its radius. */
export const CORAL_R = 175;
export function coralAt(k: number): Pt {
  const h = holeAt(k);
  return { x: h.x + Math.cos(h.heading) * CORAL_R * 0.5, y: h.y + Math.sin(h.heading) * CORAL_R * 0.5 };
}
