import { buildLand, type Land, type LandDef, type StructureDef } from '../../logic/land';
import type { StructPlace } from '../../logic/level/types';
import type { Pt } from '../../logic/vec';
import { blob, each, path, row } from '../ch1/levels/kit';
import { CH3_KINDS } from './kinds';

/**
 * Chapter 3's map: Mirefen as one land, the level select. A PLACEHOLDER
 * composed from the swamp grounds and kinds (the hover marsh, the stilt
 * village, the river with the barge's depot, the reed watch, the dams, the mud
 * islands, Grim's channel, the sunken wreck, the last lock and the Ironclad's
 * lagoon), until the chapter map is painted. Same frame as chapters 1 and 2:
 * 2 × 2 screens with the ten spots inside SPOT_BOX.
 */
export const SPOTS: readonly Pt[] = [
  { x: 500, y: 700 }, { x: 640, y: 540 }, { x: 800, y: 660 }, { x: 930, y: 500 }, { x: 1060, y: 640 },
  { x: 1200, y: 500 }, { x: 1330, y: 660 }, { x: 1450, y: 520 }, { x: 1320, y: 370 }, { x: 1470, y: 330 },
];

export const SPOT_BOX = { x: 440, y: 290, w: 1080, h: 480 } as const;

const ROAD: readonly Pt[] = [{ x: 260, y: 780 }, ...SPOTS, { x: 1620, y: 300 }];
/** The river the barge runs up, west to east under the spots, and the lagoon in the north-east. */
const RIVER: readonly Pt[] = [{ x: 0, y: 900 }, { x: 600, y: 860 }, { x: 1100, y: 900 }, { x: 1500, y: 820 }, { x: 1920, y: 760 }];

const STRUCTURES: readonly StructPlace[] = [
  // The stilt village (22) and the reed watch (24).
  ...each('stiltHutSmall', [[600, 470], [700, 600], [1140, 430]]), { kind: 'stiltHutLarge', x: 760, y: 470 },
  ...each('reeds', [[420, 600], [470, 820], [880, 560], [980, 720], [1250, 620], [1380, 760], [560, 380], [1560, 600], [300, 520]]),
  // The dams (25) and the last lock (29).
  { kind: 'sluiceDam', x: 1000, y: 380 }, { kind: 'sluiceDam', x: 1400, y: 440 },
  // The barge's jetty (23) and the boardwalks.
  { kind: 'jetty', x: 820, y: 820 }, ...row('boardwalk', 1180, 560, 2, 128),
  // Dead trees, cypresses and posts all round, so the land runs on past the spots.
  ...each('deadTree', [[120, 140], [300, 100], [80, 420], [180, 980], [700, 980], [1300, 1000], [1850, 820], [1800, 120], [1400, 120], [1100, 120], [700, 140]]),
  ...each('cypress', [[220, 660], [1750, 520], [560, 300], [1650, 980], [400, 1020]]),
  ...each('mooringPost', [[860, 870], [1520, 860]]), ...each('fishRack', [[650, 760], [1260, 760]]),
];

function toStructures(list: readonly StructPlace[]): StructureDef[] {
  return list.flatMap((s, i) => {
    const k = CH3_KINDS[s.kind];
    return k ? [{ id: `${s.kind}${i}`, kind: s.kind, x: s.x, y: s.y, shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof, deck: k.deck, burns: k.burns }] : [];
  });
}

export const CHAPTER3_LAND_DEF: LandDef = {
  id: 'ch3-map', name: 'Mirefen', cols: 2, rows: 2, base: 'marsh',
  terrain: [
    blob('shallows', 500, 640, 200), blob('mud', 1200, 560, 160), blob('shallows', 1420, 700, 180), blob('swampWater', 1620, 280, 200),
    blob('swampWater', 300, 300, 150), path('swampWater', RIVER, 120), path('dirt', ROAD, 50), blob('mud', 1000, 440, 120),
  ],
  structures: toStructures(STRUCTURES),
  roads: {},
  points: {},
};

let built: Land | null = null;
export function chapter3Land(): Land {
  built ??= buildLand(CHAPTER3_LAND_DEF);
  return built;
}
