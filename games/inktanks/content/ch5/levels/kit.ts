import type { StructPlace } from '../../../src/logic/level/types';
import type { TerrainPatch } from '../../../src/logic/land';
import type { LootTable } from '../../../src/logic/loot';
import { path } from '../../../src/content/ch1/levels/kit';

/**
 * Helpers for chapter 5 (Deepwood) layouts, on top of chapters 1–4's kits
 * (at, row, each, patch, blob, path; depot, camp; depotEast; ridge, drifts).
 * Chapter 5 levels are paid content: they live here, outside src/, and reach
 * the game only through content/paid.ts on the server.
 */
export { at, blob, each, H, patch, path, row, W } from '../../../src/content/ch1/levels/kit';
export { camp, CEMENT_STEP, depot } from '../../ch2/levels/kit';
export { depotEast } from '../../ch3/levels/kit';
export { ridge } from '../../ch4/levels/kit';

/** Old trees closer than this leave no room for a Medium between their canopies (2 × 28 + 52). */
export const TREE_GAP = 110;

/** A map's size in px, for keeping scattered trees on it (default 4 × 2 screens). */
export interface MapSize {
  readonly w: number;
  readonly h: number;
}
const MAP_4X2: MapSize = { w: 3840, h: 1080 };
const onMap = (x: number, y: number, map: MapSize): boolean => x > 12 && y > 12 && x < map.w - 12 && y < map.h - 12;

/**
 * A stand of old trees: `n` oldTree / oldFir (alternating) on a fixed sunflower
 * spiral round (cx, cy) inside radius `r`, so a grove is the same every run.
 * `skip` leaves out spots within that radius of each point (a trail, a gap),
 * and trees off the map are left out.
 */
export function grove(cx: number, cy: number, r: number, n: number, skip: readonly (readonly [number, number, number])[] = [], map: MapSize = MAP_4X2): StructPlace[] {
  const out: StructPlace[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const d = r * Math.sqrt((i + 0.5) / n);
    const x = Math.round(cx + Math.cos(i * golden) * d);
    const y = Math.round(cy + Math.sin(i * golden) * d);
    if (!onMap(x, y, map) || skip.some(([sx, sy, sr]) => (x - sx) ** 2 + (y - sy) ** 2 < sr * sr)) continue;
    out.push({ kind: i % 3 === 2 ? 'oldFir' : 'oldTree', x, y });
  }
  return out;
}

/**
 * A thicket of young trees (youngTree / youngSpruce), `n` on a tight spiral
 * about 38 px apart round (cx, cy): Wheels and Half-tracks go round it,
 * Tracks and Heavy hulls plough straight through.
 */
export function thicket(cx: number, cy: number, n: number, map: MapSize = MAP_4X2): StructPlace[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const d = 38 * Math.sqrt(i + 0.3);
    return { kind: i % 2 ? 'youngSpruce' : 'youngTree', x: Math.round(cx + Math.cos(i * golden) * d), y: Math.round(cy + Math.sin(i * golden) * d) };
  }).filter((p) => onMap(p.x, p.y, map));
}

/** A felled tree across a road (level 45): a fallenLog (or fallenLogV across a north–south road), tagged for the escort's `clear`. */
export function felled(x: number, y: number, vertical = false, tag = 'felled', id?: string): StructPlace {
  return { kind: vertical ? 'fallenLogV' : 'fallenLog', x, y, tag, ...(id ? { id } : {}) };
}

/**
 * A log bridge over a river at (x, y): `.deck` (a 'bridge' strip to drive on:
 * paint it after the water) and `.span` (the logBridge, a raid target with
 * `tag`). `across` 'x' when the river runs north–south (the bridge spans
 * east–west). Blown, the strip turns back to water (match/spans.ts).
 */
export function logBridge(x: number, y: number, across: 'x' | 'y', id: string, tag?: string): { deck: TerrainPatch; span: StructPlace } {
  // A path, not a rect: a rect 'bridge' patch gets the stone bridge deck painted on it (render/ground.ts).
  const half = 70;
  const ends = across === 'x' ? [{ x: x - half, y }, { x: x + half, y }] : [{ x, y: y - half }, { x, y: y + half }];
  return { deck: path('bridge', ends, 56), span: { kind: across === 'x' ? 'logBridge' : 'logBridgeV', x, y, id, ...(tag ? { tag } : {}) } };
}

/** Loot for chapter 5's rolled crates: every family, the Rail too; mostly Mk II and III. */
export const LOOT_FOREST: LootTable = {
  families: ['machinegun', 'cannon', 'rockets', 'mortar', 'flamer', 'laser', 'rail', 'light', 'medium', 'heavy', 'wheels', 'halftracks', 'tracks', 'hover'],
  crateMk: [0.15, 0.55, 0.3],
  kitShare: 0.3,
};

/**
 * Common chapter 5 tanks. The Iron Hive (clan 'hive', the clans' old masters)
 * fields iron: Mk II–III Cannons and Heavies, and the Rail, which shoots
 * through the trees (its charge line is the only warning). The clans' veterans
 * come back too (`mixedClans: true`).
 */
export const TANK = {
  // The Iron Hive.
  drone: 'machinegun3/light2/wheels2',
  gunner: 'cannon2/medium2/halftracks2',
  gunner3: 'cannon3/medium2/halftracks2',
  heavy: 'cannon3/heavy2/tracks2',
  rail: 'rail1/medium2/halftracks2',
  rail2: 'rail2/heavy1/tracks2',
  logger: 'flamer2/medium2/tracks2',
  mortar: 'mortar2/medium2/tracks1',
  // The clans' veterans.
  boarHeavy: 'cannon3/heavy2/tracks2',
  skimmer: 'machinegun3/light2/hover2',
  crowMortar: 'mortar3/medium2/tracks2',
} as const;
