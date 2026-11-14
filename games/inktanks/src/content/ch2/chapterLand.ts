import { buildLand, type Land, type LandDef, type StructureDef } from '../../logic/land';
import type { StructPlace } from '../../logic/level/types';
import type { Pt } from '../../logic/vec';
import { blob, each, path, row } from '../ch1/levels/kit';
import { CH2_KINDS } from './kinds';

/**
 * Chapter 2's map: the Dust Flats as one land, the level select. A
 * PLACEHOLDER composed from the chapter's ground and desert kinds (the oil
 * town's edge, the canyon, the pipeline, the flats and the water depot, the
 * wells, the dunes, Rook's mesa, the town square, the prison and the
 * crawler's yard), until the chapter map is painted. Same frame as chapter
 * 1's: 2 × 2 screens with the ten spots inside SPOT_BOX.
 */
export const SPOTS: readonly Pt[] = [
  { x: 500, y: 680 }, { x: 650, y: 520 }, { x: 820, y: 620 }, { x: 960, y: 470 }, { x: 1080, y: 650 },
  { x: 1220, y: 520 }, { x: 1340, y: 680 }, { x: 1440, y: 540 }, { x: 1330, y: 380 }, { x: 1470, y: 340 },
];

export const SPOT_BOX = { x: 440, y: 290, w: 1080, h: 480 } as const;

const ROAD: readonly Pt[] = [{ x: 260, y: 760 }, ...SPOTS, { x: 1620, y: 300 }];

const STRUCTURES: readonly StructPlace[] = [
  // The oil town's edge (11) and the town square (18).
  { kind: 'adobeHouse', x: 420, y: 560 }, { kind: 'adobeHut', x: 560, y: 760 }, { kind: 'adobeHouse', x: 1380, y: 760 }, { kind: 'adobeHut', x: 1500, y: 680 },
  ...row('adobeWall', 360, 820, 3, 63), { kind: 'oilDerrick', x: 640, y: 640 }, { kind: 'oilDerrick', x: 1250, y: 760 },
  // The canyon (12) and Rook's mesa (17).
  ...row('mesaWall', 700, 400, 4, 63), ...row('mesaWall', 1180, 430, 3, 63), ...each('mesaRock', [[760, 450], [1150, 600], [1290, 450]]),
  // The pipeline valves (13) and the water depot (14).
  ...each('valve', [[880, 560], [930, 700]]), ...row('cementWall', 1000, 380, 3, 63), { kind: 'cementTower', x: 1190, y: 380 },
  // The wells (15) and the dunes (16).
  ...each('well', [[1060, 560], [1120, 720]]), { kind: 'dune', x: 1300, y: 600 }, { kind: 'duneV', x: 1560, y: 470 },
  // The prison (19) and the crawler's yard (20).
  ...row('adobeWall', 1380, 300, 3, 63), { kind: 'crowGate', x: 1580, y: 300 }, ...each('tent', [[1400, 420], [1520, 400]]),
  // The edges: cactus, palms, scrub and rocks all round, so the land runs on past the spots.
  ...each('cactus', [[120, 140], [300, 100], [80, 420], [180, 980], [420, 1020], [700, 980], [1000, 990], [1300, 1000], [1650, 960], [1850, 820], [1800, 120], [1400, 120], [1100, 120], [700, 140]]),
  ...each('palm', [[220, 640], [1750, 520], [560, 380]]),
  ...each('scrub', [[460, 860], [640, 860], [860, 860], [1180, 860], [1520, 860], [1700, 580], [300, 300], [1600, 160], [820, 200]]),
  ...each('boulder', [[640, 900], [1450, 960], [1880, 400], [260, 900]]),
];

function toStructures(list: readonly StructPlace[]): StructureDef[] {
  return list.flatMap((s, i) => {
    const k = CH2_KINDS[s.kind];
    return k ? [{ id: `${s.kind}${i}`, kind: s.kind, x: s.x, y: s.y, shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof, crest: k.crest }] : [];
  });
}

export const CHAPTER2_LAND_DEF: LandDef = {
  id: 'ch2-map', name: 'Dust Flats', cols: 2, rows: 2, base: 'sand',
  terrain: [
    blob('dirt', 500, 660, 220), blob('grassDry', 1500, 700, 220), blob('grassDry', 300, 300, 200), blob('dirt', 1460, 360, 180),
    path('dirt', ROAD, 54),
  ],
  structures: toStructures(STRUCTURES),
  roads: {},
  points: {},
};

let built: Land | null = null;
export function chapter2Land(): Land {
  built ??= buildLand(CHAPTER2_LAND_DEF);
  return built;
}
