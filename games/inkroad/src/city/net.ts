import { nearestAccess } from '../sim/network';
import type { Access, Network } from '../sim/trafficTypes';
import type { Cell, Id } from '../sim/types';
import type { Refusal } from '../sim/netGround';
import type { Block } from './geometry';
import { standingAt } from './standing';
import type { City } from './state';

/** `reach`: cells to the road, where a path may be longer than a driveway. `front`: only the road along the south edge. */
export const blockAccess = (net: Network, b: Block, reach?: number, front?: boolean): { readonly road: Id; readonly s: number } | null =>
  nearestAccess(net, { gx: b.gx, gy: b.gy, w: b.w, h: b.h }, reach, front);

/** Where no road may go: open blocks, car parks, and the plots drawn on the map. */
export const blockedBy = (c: City): ((cell: Cell) => Refusal | null) => standingAt(c);

export const accessExists = (net: Network, a: Access): boolean =>
  ('gate' in a ? net.junctions.some((j) => j.id === a.gate) : net.roads.some((r) => r.id === a.road));
