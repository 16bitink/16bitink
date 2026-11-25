import { vertexRect, type Refusal } from '../../sim/netGround';
import type { BeachDef, CarParkKind, Cell } from '../../sim/types';
import type { Block } from '../geometry';
import type { City } from '../state';
import { beachDefs, publicBeaches, recordOf } from './beach';

/** Beach parking: the only building allowed beside a public beach, on its landward edge or within three cells of it. */
export const BEACH_PARKING = { within: 3, kind: 'lot' } as const;

/** Cells of empty ground between two blocks. */
function gap(a: Block, b: Block): number {
  const dx = Math.max(b.gx - (a.gx + a.w), a.gx - (b.gx + b.w), 0);
  const dy = Math.max(b.gy - (a.gy + a.h), a.gy - (b.gy + b.h), 0);
  return Math.hypot(dx, dy);
}

const nearBeach = (list: readonly BeachDef[], b: Block): BeachDef | undefined =>
  [...list].sort((p, q) => gap(p, b) - gap(q, b)).find((x) => gap(x, b) <= BEACH_PARKING.within);

/** The public beach a surface car park here would serve. */
export const beachServed = (c: City, kind: CarParkKind, b: Block): BeachDef | undefined =>
  (kind === BEACH_PARKING.kind ? nearBeach(publicBeaches(c), b) : undefined);

const byWater = (c: City, x: Cell): boolean =>
  [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => c.net.terrain[x.gy + dy]?.[x.gx + dx] === '~'));

/** Why a car park can't stand with this vertex on the sand, or null. */
export function sandProblem(c: City, kind: CarParkKind, b: Block, x: Cell): Refusal | null {
  const no = (why: string): Refusal => ({ why, at: vertexRect(x) });
  if (beachServed(c, kind, b)) return byWater(c, x) ? no('Too close to the water: keep to the landward edge') : null;
  const near = nearBeach(beachDefs(c), b);
  const state = near && (recordOf(c, near.id)?.state ?? 'open');
  if (near && state === 'public') return no('Beside the beach only a surface car park fits');
  if (near && state === 'sold') return no(`${near.name} is private now`);
  return no(near ? `The beach is protected: the Council has not decided about ${near.name}` : 'The beach is protected');
}
