import { mixSeed } from '../city/rng';

/**
 * Kerb bays and small-street spaces along a road: the city puts each slot's place (`s`, `side`) and the renderer
 * draws the car there. Even slots on side 1 (right of the line's direction), odd ones on side -1, the k-th pair at
 * the k-th place along the road. Pure.
 */
export interface RoadSlot { readonly s: number; readonly side: -1 | 1 }

/** Px of one painted kerb bay (mirrors BAY in src/render/ground/roadExtras.ts). */
export const BAY_PX = 17;
/** Px kept clear of cars at each end of a road, by the junction corners (mirrors JUNCTION_CLEAR in src/render/cars/parkingSlots.ts). */
export const ROAD_END_CLEAR = 36;
/** Unmarked cars stand nearer the corners than painted bays reach: px kept clear at each end of a small street. */
export const STREET_END_CLEAR = 24;
/** A car left on a small street takes this many bay lengths: unmarked parking is sparser than a kerb place's bays. */
export const STREET_BAYS = 3.5;
/** Each street slot sits up to this share of its pitch off its even place along the road (fixed per slot). */
export const STREET_JITTER = 0.22;
const KIN_JITTER = 931;

/** Px of the road where cars may stand, and where it starts. Short roads use what they have. */
function standable(len: number, end = ROAD_END_CLEAR): { readonly from: number; readonly length: number } {
  const clear = len >= end * 2 + BAY_PX ? end : Math.max(0, (len - BAY_PX) / 2);
  return { from: clear, length: Math.max(BAY_PX, len - clear * 2) };
}

/** Painted bays along one side of a road of this length. */
export const baysPerSide = (len: number): number => Math.max(1, Math.floor(standable(len).length / BAY_PX));

/** A kerb place has the spaces the balance gives it, never more than its painted bays. */
export const kerbSlotCount = (len: number, wanted: number): number => Math.max(1, Math.min(wanted, baysPerSide(len) * 2));

/** Cars left along a small street: one per STREET_BAYS bay lengths a side. */
export const streetSlotCount = (len: number): number => 2 * Math.max(1, Math.floor(standable(len, STREET_END_CLEAR).length / (BAY_PX * STREET_BAYS)));

const sideOf = (k: number): -1 | 1 => (k % 2 === 0 ? 1 : -1);

/** Where slot k of a kerb place stands: spread over the painted bays, on a bay's middle. */
export function kerbSlot(len: number, count: number, k: number): RoadSlot {
  const { from } = standable(len);
  const n = baysPerSide(len);
  const side = sideOf(k);
  const per = side === 1 ? Math.ceil(count / 2) : Math.floor(count / 2);
  const bay = Math.min(n - 1, Math.floor(((Math.floor(k / 2) + 0.5) * n) / Math.max(1, per)));
  return { s: from + (bay + 0.5) * BAY_PX, side };
}

/** Where slot k of a street place stands: evenly along the road, each pushed its own fixed way. */
export function streetSlot(len: number, count: number, k: number, road: number): RoadSlot {
  const { from, length } = standable(len, STREET_END_CLEAR);
  const pitch = length / (count / 2);
  const push = ((mixSeed(KIN_JITTER, road, k) % 1000) / 1000 - 0.5) * 2 * STREET_JITTER * pitch;
  return { s: from + (Math.floor(k / 2) + 0.5) * pitch + push, side: sideOf(k) };
}

/** Every slot of a road place. */
export const roadSlotsOf = (kind: 'kerb' | 'street', len: number, count: number, road: number): RoadSlot[] =>
  Array.from({ length: count }, (_, k) => (kind === 'kerb' ? kerbSlot(len, count, k) : streetSlot(len, count, k, road)));
