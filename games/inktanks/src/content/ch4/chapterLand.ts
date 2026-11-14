import { buildLand, type Land, type LandDef, type StructureDef } from '../../logic/land';
import type { StructPlace } from '../../logic/level/types';
import type { Pt } from '../../logic/vec';
import { blob, each, path, row } from '../ch1/levels/kit';
import { CH4_KINDS } from './kinds';

/**
 * Chapter 4's map: Frostridge as one land, the level select. A PLACEHOLDER
 * composed from the snow grounds and kinds (the frozen lake, the snowed-in
 * cabins, the laser lab, the blizzard pass, the ridge line, Ermine's woods,
 * the avalanche pass, the signal line, the rail depots and the rail-gun
 * train's line), until the chapter map is painted. Same frame as chapters
 * 1–3: 2 × 2 screens with the ten spots inside SPOT_BOX.
 */
export const SPOTS: readonly Pt[] = [
  { x: 500, y: 700 }, { x: 640, y: 540 }, { x: 800, y: 660 }, { x: 930, y: 500 }, { x: 1060, y: 640 },
  { x: 1200, y: 500 }, { x: 1330, y: 660 }, { x: 1450, y: 520 }, { x: 1320, y: 370 }, { x: 1470, y: 330 },
];

export const SPOT_BOX = { x: 440, y: 290, w: 1080, h: 480 } as const;

const ROAD: readonly Pt[] = [{ x: 260, y: 780 }, ...SPOTS, { x: 1620, y: 300 }];
/** The train's line along the north, under the last spots. */
const RAIL: readonly Pt[] = [{ x: 1000, y: 250 }, { x: 1900, y: 250 }];

const STRUCTURES: readonly StructPlace[] = [
  // The frozen lake's shore (31) and the snowed-in cabins (32).
  { kind: 'cabinSmall', x: 600, y: 470 }, { kind: 'cabinLarge', x: 760, y: 470 }, ...row('snowdriftH', 680, 600, 2, 92),
  // The laser lab (33) and its generators.
  { kind: 'labBuilding', x: 1110, y: 420 }, ...each('generator', [[1010, 560], [1220, 580]]),
  // The pass (34, 37) and the ridge line (35).
  ...row('ridgeEdge', 880, 760, 3, 128), ...row('ridgeEdge', 1180, 300, 2, 128), { kind: 'ridgeCorner', x: 1450, y: 700 },
  // The signal line (38) and the rail depots (39–40).
  { kind: 'signalMast', x: 1420, y: 420 }, { kind: 'signalBox', x: 1560, y: 600 }, ...row('railSnowH', 1032, 250, 14, 64),
  // Pines, firs and ice rocks all round, so the land runs on past the spots.
  ...each('snowPine', [[120, 140], [300, 100], [80, 420], [180, 980], [700, 980], [1300, 1000], [1850, 820], [1800, 120], [1400, 120], [700, 140]]),
  ...each('firSmall', [[220, 660], [1750, 520], [560, 300], [1650, 980], [400, 1020]]),
  ...each('iceRockA', [[420, 880], [980, 900]]), ...each('iceRockB', [[1250, 880], [1700, 700]]),
];

function toStructures(list: readonly StructPlace[]): StructureDef[] {
  return list.flatMap((s, i) => {
    const k = CH4_KINDS[s.kind];
    return k ? [{ id: `${s.kind}${i}`, kind: s.kind, x: s.x, y: s.y, shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof, deck: k.deck }] : [];
  });
}

export const CHAPTER4_LAND_DEF: LandDef = {
  id: 'ch4-map', name: 'Frostridge', cols: 2, rows: 2, base: 'snow',
  terrain: [
    blob('ice', 430, 760, 220), blob('thinIce', 470, 800, 90), blob('frozenDirt', 1150, 480, 160), blob('ice', 1650, 860, 170),
    path('snowTrackH', ROAD, 50), path('snowTrackH', RAIL, 40), blob('frozenDirt', 1400, 650, 100),
  ],
  structures: toStructures(STRUCTURES),
  roads: {},
  points: {},
};

let built: Land | null = null;
export function chapter4Land(): Land {
  built ??= buildLand(CHAPTER4_LAND_DEF);
  return built;
}
