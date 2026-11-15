import type { AllyDef, StructPlace } from '../../../src/logic/level/types';
import type { TerrainPatch } from '../../../src/logic/land';
import type { LootTable } from '../../../src/logic/loot';
import type { Pt } from '../../../src/logic/vec';
import { path, row } from '../../../src/content/ch1/levels/kit';
import { CEMENT_STEP } from '../../ch2/levels/kit';

/**
 * Helpers for chapter 3 (Mirefen) layouts, on top of chapters 1 and 2's kits
 * (at, row, each, patch, blob, path; depot, camp). Chapter 3 levels are paid
 * content: they live here, outside src/, and reach the game only through
 * content/paid.ts on the server.
 */
export { at, blob, each, H, patch, path, row, W } from '../../../src/content/ch1/levels/kit';
export { camp, CEMENT_STEP, depot } from '../../ch2/levels/kit';

/** One boardwalk piece is 128 px; lay runs this far apart (ends join). */
export const WALK_STEP = 128;

/**
 * A boardwalk across water from (x, y), `n` pieces east (or south with
 * `vertical`): a 'bridge' strip to drive on (a path, so the stone bridge deck
 * isn't painted) and the boardwalk pieces drawn on it. Paint it after the water.
 */
/**
 * The drivable strip under a boardwalk (the art's width). The nav grid is 60 px:
 * keep a walk's y (or a vertical walk's x) at 30 mod 60, a cell centre, or the
 * strip paints no cell and the walk doesn't exist for driving (level 22).
 */
const DECK_W = 44;

export function boardwalk(x: number, y: number, n: number, vertical = false): { deck: TerrainPatch; pieces: StructPlace[] } {
  const len = n * WALK_STEP;
  const end: Pt = vertical ? { x, y: y + len - WALK_STEP } : { x: x + len - WALK_STEP, y };
  return {
    deck: path('bridge', [{ x: vertical ? x : x - WALK_STEP / 2, y: vertical ? y - WALK_STEP / 2 : y }, vertical ? { x, y: end.y + WALK_STEP / 2 } : { x: end.x + WALK_STEP / 2, y }], DECK_W),
    pieces: vertical ? row('boardwalkV', x, y, n, 0, WALK_STEP) : row('boardwalk', x, y, n, WALK_STEP),
  };
}

/**
 * A reed bed: `n` clumps round (x, y), about 60 px apart (closer than the
 * 85 px a fire jumps, so a Flamer lights the whole bed). Laid on a fixed
 * spiral, so a layout reads the same every time.
 */
export function reedBed(x: number, y: number, n: number, spread = 60): StructPlace[] {
  return Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996;
    const d = i === 0 ? 0 : spread * Math.sqrt(i) * 0.75;
    return { kind: 'reeds', x: Math.round(x + Math.cos(a) * d), y: Math.round(y + Math.sin(a) * d * 0.8) };
  });
}

/**
 * Our river quay at the end of a barge's road: cement walls along both banks
 * of a basin (x .. x + w, centred on y, the water `h` wide), a gun tower on
 * each bank at its mouth, and a jetty at its head. Paint `basin` (deep water)
 * after the river; end the barge's road at `berth`.
 */
export function quay(x: number, y: number, w = 320, h = 220, guns: readonly [AllyDef['gun'], AllyDef['gun']] = ['cannon', 'machinegun']): { basin: TerrainPatch; structures: StructPlace[]; allies: AllyDef[]; berth: Pt } {
  const n = Math.round(w / CEMENT_STEP);
  const north = y - h / 2 - 20;
  const south = y + h / 2 + 20;
  return {
    basin: { ground: 'swampWater', shape: { kind: 'rect', x, y: y - h / 2, w: w + 40, h } },
    structures: [...row('cementWall', x + 40, north, n, CEMENT_STEP), ...row('cementWall', x + 40, south, n, CEMENT_STEP), { kind: 'jetty', x: x + w + 60, y }],
    allies: [{ kind: 'tower', at: { x: x + 20, y: north - 60 }, gun: guns[0] }, { kind: 'tower', at: { x: x + 20, y: south + 60 }, gun: guns[1] }],
    berth: { x: x + w - 40, y },
  };
}

/**
 * Our depot with its gate facing east (chapter 2's `depot` faces west): a
 * white cement yard running west of the gate at (x, y), `w` × `h`, a gun
 * tower either side of the gate. For a run that ends on the west side.
 */
export function depotEast(x: number, y: number, w = 300, h = 260, guns: readonly [AllyDef['gun'], AllyDef['gun']] = ['cannon', 'machinegun']): { structures: StructPlace[]; allies: AllyDef[] } {
  const gap = 90;
  const top = y - h / 2;
  const bottom = y + h / 2;
  const n = Math.round(w / CEMENT_STEP);
  const side = Math.round((h / 2 - gap / 2) / CEMENT_STEP);
  return {
    structures: [
      ...row('cementWall', x - 32, top, n, -CEMENT_STEP), ...row('cementWall', x - 32, bottom, n, -CEMENT_STEP),
      ...row('cementWallV', x - w, top + 32, Math.round(h / CEMENT_STEP), 0, CEMENT_STEP),
      ...row('cementWallV', x, top + 32, side, 0, CEMENT_STEP), ...row('cementWallV', x, bottom - 32, side, 0, -CEMENT_STEP),
    ],
    allies: [{ kind: 'tower', at: { x: x + 10, y: y - gap / 2 - 50 }, gun: guns[0] }, { kind: 'tower', at: { x: x + 10, y: y + gap / 2 + 50 }, gun: guns[1] }],
  };
}

/** Loot for chapter 3's rolled crates: every family so far, the Flamer and Hover too; Mk III–IV, the chapter's gear grade. */
export const LOOT_SWAMP: LootTable = {
  families: ['machinegun', 'cannon', 'rockets', 'mortar', 'flamer', 'light', 'medium', 'heavy', 'wheels', 'halftracks', 'tracks', 'hover'],
  crateMk: [0, 0, 0.35, 0.55, 0.1],
  kitShare: 0.3,
};

/** Common chapter 3 tanks (the Weasels: Hover skimmers and Flamers from level 21). */
export const TANK = {
  skimmer: 'machinegun3/light3/hover3',
  skimmer2: 'machinegun4/light3/hover4',
  flamer: 'flamer3/medium3/halftracks3',
  flamerHover: 'flamer3/light4/hover3',
  gunner: 'cannon3/medium3/halftracks3',
  gunner2: 'cannon4/medium3/halftracks4',
  mortar: 'mortar3/medium3/tracks3',
  rocket: 'rockets4/medium3/tracks3',
  heavy: 'cannon4/heavy3/tracks4',
} as const;
