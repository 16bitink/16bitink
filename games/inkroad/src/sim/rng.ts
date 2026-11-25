/** Seeded random numbers (mulberry32). The simulation uses nothing else. */
export interface Rng {
  /** 0 <= n < 1 */
  next(): number;
  range(min: number, max: number): number;
  /** Integer 0..n-1 */
  int(n: number): number;
  chance(p: number): boolean;
  pick<T>(list: readonly T[]): T;
  /** Independent generator, so one part of the game can't disturb another. */
  fork(label: number): Rng;
  /** For saves: feed back as the seed. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (list) => {
      if (list.length === 0) throw new Error('rng.pick: empty list');
      return list[Math.floor(next() * list.length)]!;
    },
    fork: (label) => createRng(hash2(a, label)),
    state: () => a,
  };
}

/** Stable hash of two integers, as an unsigned 32-bit number. */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Stable 0..1 from two integers. */
export const hash01 = (a: number, b: number): number => hash2(a, b) / 4294967296;
