import type { AllyDef, StructPlace } from '../../../src/logic/level/types';
import type { LootTable } from '../../../src/logic/loot';
import type { Pt } from '../../../src/logic/vec';
import { row } from '../../../src/content/ch1/levels/kit';

/**
 * Helpers for chapter 2 (Dust Flats) layouts, on top of chapter 1's kit
 * (at, row, each, patch, blob, path). Chapter 2 levels are paid content:
 * they live here, outside src/, and reach the game only through
 * content/paid.ts on the server.
 */
export { at, blob, each, H, patch, path, row, W } from '../../../src/content/ch1/levels/kit';

/** One cement wall piece is 64 px: lay runs this far apart (design doc "Levels mean something"). */
export const CEMENT_STEP = 63;

/**
 * Our depot: a white cement compound with two gun towers either side of its
 * open gate, which faces west (the road comes in from the west). `x, y` is
 * the gate's centre; the yard runs east of it, `w` × `h` px.
 */
export function depot(x: number, y: number, w = 320, h = 260, guns: readonly [AllyDef['gun'], AllyDef['gun']] = ['cannon', 'machinegun']): { structures: StructPlace[]; allies: AllyDef[] } {
  const gap = 90;
  const top = y - h / 2;
  const bottom = y + h / 2;
  const n = Math.round(w / CEMENT_STEP);
  const side = Math.round((h / 2 - gap / 2) / CEMENT_STEP);
  return {
    structures: [
      ...row('cementWall', x + 32, top, n, CEMENT_STEP), ...row('cementWall', x + 32, bottom, n, CEMENT_STEP),
      ...row('cementWallV', x + w, top + 32, Math.round(h / CEMENT_STEP), 0, CEMENT_STEP),
      ...row('cementWallV', x, top + 32, side, 0, CEMENT_STEP), ...row('cementWallV', x, bottom - 32, side, 0, -CEMENT_STEP),
    ],
    allies: [{ kind: 'tower', at: { x: x - 10, y: y - gap / 2 - 50 }, gun: guns[0] }, { kind: 'tower', at: { x: x - 10, y: y + gap / 2 + 50 }, gun: guns[1] }],
  };
}

/** A Crow camp: tents in a ring of sandbags with a gap towards `open` (a recon camp, a guard post). */
export function camp(c: Pt, open: 'n' | 's' | 'e' | 'w' = 'w'): StructPlace[] {
  const bags: StructPlace[] = [];
  const r = 110;
  if (open !== 'n') bags.push({ kind: 'sandbags', x: c.x, y: c.y - r });
  if (open !== 's') bags.push({ kind: 'sandbags', x: c.x, y: c.y + r });
  if (open !== 'w') bags.push({ kind: 'sandbagsV', x: c.x - r, y: c.y });
  if (open !== 'e') bags.push({ kind: 'sandbagsV', x: c.x + r, y: c.y });
  return [{ kind: 'tent', x: c.x - 30, y: c.y - 20 }, { kind: 'tent', x: c.x + 40, y: c.y + 30 }, { kind: 'crate', x: c.x + 50, y: c.y - 40 }, ...bags];
}

/** Loot for chapter 2's rolled crates: chapter 1's families and the Mortar, more Mk II. */
export const LOOT_DESERT: LootTable = { families: ['machinegun', 'cannon', 'rockets', 'mortar', 'light', 'medium', 'heavy', 'wheels', 'halftracks', 'tracks'], crateMk: [0.45, 0.5, 0.05], kitShare: 0.3 };

/** Common chapter 2 tanks (the Crows field Mk I–II, mortars from level 11). */
export const TANK = {
  scout: 'machinegun2/light1/wheels2',
  gunner: 'cannon1/medium1/halftracks1',
  gunner2: 'cannon2/medium1/halftracks2',
  mortar: 'mortar1/medium1/halftracks1',
  mortar2: 'mortar2/medium1/tracks1',
  rocket: 'rockets1/medium1/tracks1',
  heavy: 'cannon2/heavy1/tracks1',
} as const;
