/**
 * Level 36, "The Lamplit Pods". Signature: Open (no stone), goal Rescue, in the dark. Two pods of
 * packed bricks stand flush with the cave walls, shut in by 3-hit driftwood (their bottom planks
 * and the tall driftwood on the open side); between them runs an empty lane up to a roof band.
 * A crab is trapped in a cage in the left pod and glows through the dark.
 * Teaches: touch the friend to set it free; dig into the pods (no stone, so every hit counts).
 * Pieces: dark, rescue, soft, tough, x3, keg. Rebuilt 2026-11-18 (was the picture "The Lantern
 * Cave"): old replay pins go.
 * Lab (30 runs): see report.
 */
import { fill, minus } from '../../src/sim/kit';
import type { BrickDef, LevelDef } from '../../src/sim/types';

const arm = (bs: BrickDef[]): BrickDef[] => bs.map((b) => ({ ...b, armour: true }));
const POD_W = 14;
const POD_TOP = 10;
const POD_BOTTOM = 34;
// Armour for the left pod (x 0-13) and its mirror (x 22-35): a floor in 7-wide planks and the open side in tall 5-row bars.
const podArmour = (x0: number, sideX: number): BrickDef[] => arm([
  ...fill(x0, POD_BOTTOM, POD_W, 1, 'tough', { hp: 3, bw: 7 }),
  ...fill(x0, POD_TOP - 1, POD_W, 1, 'tough', { hp: 3, bw: 7 }),
  ...fill(sideX, POD_TOP, 2, POD_BOTTOM - POD_TOP, 'tough', { hp: 3, bw: 2, bh: 6 }),
]);
// A pod's payload, in 1 x 1 bricks over x0..x1: the face against the armour is a column of keg, x3, sandcastle by rows
// (kegs every 3 rows chain), a second column two cells in has x3 every other row, tough rows sit under the roof.
const podPayload = (x0: number, x1: number, face: number, second: number): BrickDef[] => {
  const out: BrickDef[] = [];
  for (let y = 11; y < 34; y++) {
    for (let x = x0; x < x1; x++) {
      let b: BrickDef = { x, y, w: 1, h: 1, kind: 'soft', tint: 4 };
      if (x === face) b = { ...b, kind: (['keg', 'x3', 'soft'] as const)[y % 3]! };
      else if (x === second && y % 2 === 0) b = { ...b, kind: 'x3' };
      else if (y >= 11 && y < 13) b = { ...b, kind: 'tough', hp: 2, tint: 5 };
      out.push(b);
    }
  }
  return out;
};
const FRIEND = { x: 3, y: 12, who: 'crab' as const };
// The cage: 3-hit bars round the friend's 2 x 2 pen in the left pod's top corner.
const CAGE: BrickDef[] = [
  ...fill(2, 11, 4, 1, 'tough', { hp: 3, bw: 2 }), ...fill(2, 14, 4, 1, 'tough', { hp: 3, bw: 2 }),
  ...fill(2, 12, 1, 2, 'tough', { hp: 3, bw: 1, bh: 2 }), ...fill(5, 12, 1, 2, 'tough', { hp: 3, bw: 1, bh: 2 }),
];
const LEFT_X1 = 12; // payload x 0-9; the gallery x 10-11 stays empty
const LEFT = [...minus(podPayload(0, LEFT_X1 - 2, 9, 7), [...CAGE, { x: 3, y: 12, w: 2, h: 2, kind: 'soft' as const }]), ...CAGE];
const RIGHT = podPayload(26, 36, 26, 28);
// The roof band over the empty lane and the pods.
const ROOF = [...fill(0, 4, 36, 2, 'tough', { hp: 2, tint: 6 }), ...fill(0, 6, 36, 3, 'soft', { tint: 6 })];
// Teasers low at the sides, under the pods; the middle lane stays open.
const TEASERS = [...fill(0, 38, 9, 1, 'soft'), ...fill(27, 38, 9, 1, 'tough', { hp: 2 }), ...fill(0, 42, 7, 1, 'tough', { hp: 2 }), ...fill(29, 42, 7, 1, 'soft')];

export const LANTERN_CAVE: LevelDef = {
  id: 'ch4-36-lantern',
  name: 'The Lamplit Pods',
  number: 36,
  chapter: 4,
  layout: 'open',
  goal: 'rescue',
  par: 110,
  dark: true,
  tip: 'Dig into a pod in the dark and free the glowing crab.',
  rescue: FRIEND,
  bricks: [...podArmour(0, 12), ...podArmour(22, 22), ...LEFT, ...RIGHT, ...ROOF, ...TEASERS],
};
