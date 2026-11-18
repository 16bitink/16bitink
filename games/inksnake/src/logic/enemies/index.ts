import type { EnemyDef, LevelDef } from '../../level/types';
import { BOSS_ENTRIES, ENEMY_ENTRIES } from '../chapters/index';
import type { Boss, Enemy } from '../enemyTypes';

export { Crow } from './pecker';
export { Hawk } from './diver';
export { Hen } from './hen';
export { Tomcat } from './tomcat';
export type { Boss } from '../enemyTypes';

/** The level's enemies, waiting to arrive (each kind makes its own, see logic/chapters/). */
export function makeEnemies(level: LevelDef, nextId: () => number): Enemy[] {
  const out: Enemy[] = [];
  const defs = level.enemies ?? [];
  // A daily's Rival rule brings a rival of the player's own species, in any place.
  const rival = level.rule === 'rival' && !defs.some((d) => d.kind === 'rival') ? [{ kind: 'rival' } as EnemyDef] : [];
  for (const def of [...defs, ...rival]) {
    const entry = ENEMY_ENTRIES[def.kind];
    if (!entry) continue;
    for (let i = 0; i < (def.count ?? 1); i++) out.push(entry.make(nextId(), def, level, i));
  }
  return out;
}

export function makeBoss(level: LevelDef, nextId: () => number): Boss | null {
  const b = level.boss;
  const entry = b ? BOSS_ENTRIES[b.kind] : undefined;
  return b && entry ? entry.make(nextId(), b, level) : null;
}
