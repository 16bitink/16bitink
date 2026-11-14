import { buildLand, type Land, type LandDef, type StructureDef } from '../../logic/land';
import type { StructPlace } from '../../logic/level/types';
import type { Pt } from '../../logic/vec';
import { blob, each, path, row } from '../ch1/levels/kit';
import { CH5_KINDS } from './kinds';

/**
 * Chapter 5's map: Deepwood as one land, the level select. A PLACEHOLDER
 * composed from the forest grounds and kinds (the pines at the forest's edge,
 * the burnt trail, the Hive's works, the timber bridges, the convoy road to
 * our forest fort, the three clearings, the rivals' glade, the Hive cells,
 * the Brigade camp and the Harvester's logging front), until the chapter map
 * is painted. Same frame as chapters 1–4: 2 × 2 screens with the ten spots
 * inside SPOT_BOX.
 */
export const SPOTS: readonly Pt[] = [
  { x: 480, y: 720 }, { x: 620, y: 560 }, { x: 790, y: 680 }, { x: 920, y: 520 }, { x: 1060, y: 660 },
  { x: 1200, y: 520 }, { x: 1340, y: 670 }, { x: 1460, y: 520 }, { x: 1330, y: 380 }, { x: 1480, y: 330 },
];

export const SPOT_BOX = { x: 440, y: 290, w: 1080, h: 480 } as const;

const ROAD: readonly Pt[] = [{ x: 260, y: 790 }, ...SPOTS, { x: 1640, y: 300 }];

const STRUCTURES: readonly StructPlace[] = [
  // The logging camp at the forest's edge (41) and the Hive's works (43).
  { kind: 'sawmill', x: 640, y: 440 }, ...each('logPile', [[760, 470], [560, 620]]), { kind: 'hiveTower', x: 1000, y: 420 },
  // The timber bridges (44) over the river, and the felled road to the fort (45).
  { kind: 'logBridge', x: 1060, y: 760 }, ...each('fallenLog', [[1150, 600], [1260, 590]]),
  // The Hive cells (48) and the logging front (50).
  { kind: 'hiveTower', x: 1420, y: 640 }, ...row('logPile', 1240, 300, 2, 90), ...each('stump', [[1380, 260], [1560, 420], [1180, 420]]),
  // The old forest all round, so the land runs on past the spots.
  ...each('oldTree', [[120, 140], [300, 100], [80, 420], [180, 980], [700, 980], [1300, 1000], [1850, 820], [1800, 120], [1400, 120], [700, 140], [380, 300], [1700, 980]]),
  ...each('oldFir', [[220, 260], [900, 160], [1100, 120], [1900, 400], [1650, 140], [500, 1000], [1000, 1010], [60, 700]]),
  ...each('youngTree', [[300, 560], [860, 860], [1550, 860], [1750, 560]]), ...each('youngSpruce', [[420, 420], [960, 900], [1640, 700]]),
  ...each('undergrowth', [[220, 660], [1750, 520], [560, 300], [1650, 980], [400, 1020], [880, 350]]),
];

function toStructures(list: readonly StructPlace[]): StructureDef[] {
  return list.flatMap((s, i) => {
    const k = CH5_KINDS[s.kind];
    return k ? [{ id: `${s.kind}${i}`, kind: s.kind, x: s.x, y: s.y, shape: k.shape, material: k.material, hp: k.hp, flattenable: k.flattenable, cover: k.cover, roof: k.roof, deck: k.deck, canopy: k.canopy, span: k.span }] : [];
  });
}

export const CHAPTER5_LAND_DEF: LandDef = {
  id: 'ch5-map', name: 'Deepwood', cols: 2, rows: 2, base: 'forestFloor',
  terrain: [
    blob('clearing', 640, 540, 170), blob('clearing', 1300, 330, 160), blob('clearing', 1400, 640, 110),
    path('water', [{ x: 1060, y: 0 }, { x: 1020, y: 500 }, { x: 1080, y: 1080 }], 60), path('bridge', [{ x: 960, y: 760 }, { x: 1160, y: 760 }], 56),
    path('forestTrailH', ROAD, 46),
  ],
  structures: toStructures(STRUCTURES),
  roads: {},
  points: {},
};

let built: Land | null = null;
export function chapter5Land(): Land {
  built ??= buildLand(CHAPTER5_LAND_DEF);
  return built;
}
