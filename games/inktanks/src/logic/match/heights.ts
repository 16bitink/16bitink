import type { HeightDef } from '../level/types';
import type { Match } from './match';
import type { Tank } from './types';

/**
 * High ground (chapter 4, level 35 "Ridge Line"): a level's `heights` are
 * circles (ridge tops; ring them with ridgeEdge cliffs and leave a ramp). A
 * tank inside one sees HEIGHT.range × as far (its eyes, and the stand-in's)
 * and its shots and beams carry HEIGHT.range × as far, so whoever holds a
 * ridge out-ranges whoever is below. A storm still caps sight. Lobs and the
 * Flamer's stream are unchanged.
 */
export const HEIGHT = { range: 1.2 } as const;

export function onHeight(heights: readonly HeightDef[] | undefined, x: number, y: number): boolean {
  if (!heights) return false;
  for (const h of heights) if ((x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r) return true;
  return false;
}

/** × on a tank's sight and reach: HEIGHT.range on high ground, else 1. */
export function heightMult(m: Match, t: Tank): number {
  return onHeight(m.level.def.heights, t.x, t.y) ? HEIGHT.range : 1;
}
