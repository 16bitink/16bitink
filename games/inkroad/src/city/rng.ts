import { createRng, type Rng } from '../sim/rng';

/** Seeded dice whose state can be saved (feed state() back as the seed). */
export type Dice = Rng;
export const createDice = createRng;

/** Mix numbers into one seed (FNV-1a over their 32 bits). */
export function mixSeed(...parts: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
  }
  return h >>> 0;
}
