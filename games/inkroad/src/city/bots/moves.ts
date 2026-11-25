import type { CityView, Command } from '../../sim/types';
import { specialMoves } from '../rules/botMoves';
import { buildMoves } from './movesBuild';
import { policyMoves, priceMoves, transitMoves } from './movesSoft';

/** Everything a thoughtful player might try tonight, as lists of commands. */
export type Family = 'build' | 'price' | 'transit' | 'policy';
/** `kind` says what sort of idea it is and where; `slow` is the seasons until it shows. */
export interface Move { readonly name: string; readonly kind: string; readonly family: Family; readonly cmds: readonly Command[]; readonly slow?: number }

export const FAMILIES: readonly Family[] = ['build', 'price', 'transit', 'policy'];
const MAKERS: Readonly<Record<Family, (city: CityView) => readonly Move[]>> = { build: buildMoves, price: priceMoves, transit: transitMoves, policy: policyMoves };

/** One of each kind first, then the second of each: no sort of idea crowds the others out. */
function mixed(lists: readonly (readonly Move[])[]): readonly Move[] {
  const out: Move[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) { const m = l[i]; if (m) out.push(m); }
  return out;
}

function byKind(moves: readonly Move[]): readonly Move[] {
  const piles = new Map<string, Move[]>();
  for (const m of moves) piles.set(m.kind, [...(piles.get(m.kind) ?? []), m]);
  return mixed([...piles.values()]);
}

export function movesTonight(city: CityView, families: readonly Family[]): readonly Move[] {
  const special = specialMoves(city);
  const lists = families.map((f) => byKind([...MAKERS[f](city), ...special.filter((m) => m.family === f)].filter((m) => m.cmds.every((cmd) => city.quote(cmd).ok))));
  return mixed(lists);
}
