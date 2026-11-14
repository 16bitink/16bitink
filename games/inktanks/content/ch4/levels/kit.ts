import type { AvalancheDef, StructPlace } from '../../../src/logic/level/types';
import type { LootTable } from '../../../src/logic/loot';
import type { Pt } from '../../../src/logic/vec';
import { row } from '../../../src/content/ch1/levels/kit';

/**
 * Helpers for chapter 4 (Frostridge) layouts, on top of chapters 1–3's kits
 * (at, row, each, patch, blob, path; depot, camp; depotEast). Chapter 4
 * levels are paid content: they live here, outside src/, and reach the game
 * only through content/paid.ts on the server.
 */
export { at, blob, each, H, patch, path, row, W } from '../../../src/content/ch1/levels/kit';
export { camp, CEMENT_STEP, depot } from '../../ch2/levels/kit';
export { depotEast } from '../../ch3/levels/kit';

/** One ridge cliff piece (ridgeEdge, ridgeEdgeV) is 128 px: lay runs this far apart (ends join). */
export const RIDGE_STEP = 128;
/** One rail piece (railSnowH, railSnowV) is 64 px. */
export const RAIL_STEP = 64;
/** A snowdrift is 96 px: laid this far apart they make an unbroken bank. */
export const DRIFT_STEP = 92;

/** A ridge cliff of `n` pieces from (x, y) east (or south with `vertical`): unbreakable, blocks sight, shots and driving. */
export function ridge(x: number, y: number, n: number, vertical = false): StructPlace[] {
  return vertical ? row('ridgeEdgeV', x, y, n, 0, RIDGE_STEP) : row('ridgeEdge', x, y, n, RIDGE_STEP);
}

/** A bank of `n` snowdrifts from (x, y) east (or south): low cover any gun digs through. `tag` them for a rescue ('drift'). */
export function drifts(x: number, y: number, n: number, vertical = false, tag?: string): StructPlace[] {
  return Array.from({ length: n }, (_, i) => ({ kind: vertical ? 'snowdriftV' : 'snowdriftH', x: vertical ? x : x + i * DRIFT_STEP, y: vertical ? y + i * DRIFT_STEP : y, ...(tag ? { tag } : {}) }));
}

/**
 * An avalanche: when the structure `by` breaks (place a `cornice` with that
 * id on the cliff, on the side you shoot from), a bank of `n` drifts falls
 * from (x, y) east (or south), burying whoever is under it. Pass it in the
 * level's `avalanches`.
 */
export function avalanche(by: string, x: number, y: number, n: number, vertical = false, damage?: number): AvalancheDef {
  return { by, drifts: drifts(x, y, n, vertical), ...(damage ? { damage } : {}) };
}

/**
 * Rail track along a line of axis-aligned points (a train's road): railSnowH
 * and railSnowV pieces every 64 px. They're ground pieces: they block nothing.
 */
export function railLine(pts: readonly Pt[]): StructPlace[] {
  const out: StructPlace[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const horiz = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(len / RAIL_STEP));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      out.push({ kind: horiz ? 'railSnowH' : 'railSnowV', x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) });
    }
  }
  return out;
}

/** Loot for chapter 4's rolled crates: every family so far, the Laser too, more Mk II and III. */
export const LOOT_SNOW: LootTable = {
  families: ['machinegun', 'cannon', 'rockets', 'mortar', 'flamer', 'laser', 'light', 'medium', 'heavy', 'wheels', 'halftracks', 'tracks', 'hover'],
  crateMk: [0.25, 0.55, 0.2],
  kitShare: 0.3,
};

/**
 * Common chapter 4 tanks: all three clans pushed north (levels set
 * `mixedClans: true`). Boars bring the heavies, Weasels the skimmers and
 * Flamers, Crows the mortars and scouts, and everyone has started fielding the Laser.
 */
export const TANK = {
  // Boars.
  boarHeavy: 'cannon2/heavy1/tracks2',
  boarRocket: 'rockets2/heavy1/tracks1',
  boarGunner: 'cannon2/medium2/tracks1',
  // Weasels.
  skimmer: 'machinegun2/light1/hover2',
  flamer: 'flamer2/medium1/halftracks2',
  // Crows.
  scout: 'machinegun2/light1/wheels2',
  mortar: 'mortar2/medium1/tracks1',
  gunner: 'cannon2/medium1/halftracks2',
  // Lasers: long, instant, telegraphed.
  laser: 'laser1/medium1/halftracks1',
  laser2: 'laser2/medium2/halftracks2',
} as const;
