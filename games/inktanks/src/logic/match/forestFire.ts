import type { StructureDef } from '../land';
import type { ForestFireDef, Place } from '../level/types';
import { ignite } from './flame';
import type { Match } from './match';
import type { StructRt } from './types';

/**
 * Forest fire (chapter 5, level 42 "Wildfire"; design doc "Chapter 5"). Trees
 * (kinds with a canopy and `burns`) catch from a Flamer's stream, from burning
 * undergrowth, or from a level's `fire` (LevelDef.fire: at `at` s the burnable
 * structure nearest each `start` place is lit). A burning tree (flame.ts keeps
 * the list) burns `burn` s; every FIRE.tick it hurts every tank under its canopy
 * (heat, through counters and heat armour); after `spread` s it lights every
 * burnable structure within `reach` px, so a fire runs tree to tree; while it
 * burns the nav grids close round it (bots route round a blaze); then it is a
 * charred snag (state 0: its canopy no longer blocks, the way reopens).
 *
 * Bounded: each fire is a generation of its chain; a chain stops after `hops`
 * generations (a level's fire: its `hops`, default TREE_FIRE.hops; a tree a
 * Flamer lights: TREE_FIRE.flamerHops), and every tree burns once.
 */
export const TREE_FIRE = { burn: 14, spread: 3, reach: 120, damage: 14, hops: 60, flamerHops: 3, startNear: 240 } as const;
export const FOREST_FIRE_TEXT = 'The forest is on fire!';

/** The rule a level's tree fires burn by: its `fire` (if any) over TREE_FIRE. */
export function treeFireRule(m: Match): { readonly burn: number; readonly spread: number; readonly reach: number; readonly damage: number } {
  const f = m.level.def.fire;
  return { burn: f?.burn ?? TREE_FIRE.burn, spread: f?.every ?? TREE_FIRE.spread, reach: f?.spread ?? TREE_FIRE.reach, damage: f?.damage ?? TREE_FIRE.damage };
}

/** The id of a burning tree's blaze in the nav grids. */
const blazeId = (s: StructRt): string => `${s.def.id}#fire`;

/** A burning tree makes the cells round its canopy dear in every nav grid (bots go round, or through when it's the only way). */
export function blockFire(m: Match, s: StructRt): void {
  const r = s.def.canopy ?? 20;
  const blaze: StructureDef = { ...s.def, id: blazeId(s), shape: { kind: 'circle', r } };
  m.navs.block(blaze, true);
}

export function unblockFire(m: Match, s: StructRt): void {
  m.unblockNav(blazeId(s));
}

/** Where a level's fire starts: the burnable structure nearest the place (within TREE_FIRE.startNear), or none. */
function nearestBurnable(m: Match, p: { x: number; y: number }): number | null {
  let best: number | null = null;
  let bd: number = TREE_FIRE.startNear;
  m.structs.forEach((s, i) => {
    if (!s.def.burns || s.state === 0) return;
    const d = Math.hypot(s.def.x - p.x, s.def.y - p.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/** A level's fire, due between two steps: light its starts. */
export function stepForestFire(m: Match, t0: number, t1: number): void {
  const f = m.level.def.fire;
  if (!f) return;
  const at = f.at ?? 0;
  const due = at <= 0 ? t0 === 0 : t0 < at && at <= t1;
  if (!due) return;
  const limit = f.hops ?? TREE_FIRE.hops;
  let lit = 0;
  for (const place of f.start) {
    const i = nearestBurnable(m, placeOf(m, place));
    if (i !== null && ignite(m, i, null, { gen: 0, limit })) lit++;
  }
  if (lit > 0) m.emit({ kind: 'objective', text: f.text ?? FOREST_FIRE_TEXT });
}

const placeOf = (m: Match, p: Place): { x: number; y: number } => (typeof p === 'string' ? m.point(p) : p);
