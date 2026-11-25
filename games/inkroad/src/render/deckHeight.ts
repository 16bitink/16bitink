import { DECK_Z } from '../sim/constants';
import { deckZ } from '../sim/roadGeom';
import type { Pt, Road } from '../sim/types';
import { clamp, lineLength, pointAt, resample, subLine } from './geom';

/** How high a flyover (or how deep an underpass) is along its line, and which parts count as ground. */
/** Above this a car is on the deck, sorted with the buildings. */
export const ON_DECK = 0.9;
/** Below this it is in the tunnel, out of sight. */
export const UNDER = -DECK_Z * 0.34;
/** A deck car draws this far (plan px of depth) above its own stretch of deck. */
export const DECK_CAR_LIFT = 32;
const TIER_LIFT = 2.6;
/** Decks over decks sort above them. */
export const tierLift = (z: number): number => Math.max(0, z - DECK_Z) * TIER_LIFT;

const FIND = 2;

/** Distances between which |z| is at least `z`. */
export function raisedSpan(road: Road, z: number): readonly [number, number] | null {
  const len = lineLength(road.line);
  let from = -1;
  let to = -1;
  for (let s = 0; s <= len; s += FIND) {
    if (Math.abs(deckZ(road, s, len)) < z) continue;
    if (from < 0) from = s;
    to = s;
  }
  return from < 0 ? null : [from, to];
}

/** The feet of a flyover's ramps: drawn on the ground like any road. */
export function groundParts(road: Road): Pt[][] {
  const span = raisedSpan(road, ON_DECK);
  const len = lineLength(road.line);
  if (!span) return [[...road.line]];
  return [subLine(road.line, 0, span[0] + FIND), subLine(road.line, span[1] - FIND, len)].filter((l) => l.length > 1);
}

export { deckZ };

export interface DeckPoint extends Pt { readonly a: number; readonly z: number; readonly s: number }

/** Points along the raised part of a flyover. */
export function deckPoints(road: Road, step: number): DeckPoint[] {
  const span = raisedSpan(road, ON_DECK);
  if (!span) return [];
  const len = lineLength(road.line);
  const part = subLine(road.line, span[0], span[1]);
  const n = resample(part, step).length - 1;
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = clamp(span[0] + ((span[1] - span[0]) * i) / n, 0, len);
    return { ...pointAt(road.line, s), z: deckZ(road, s, len), s };
  });
}
