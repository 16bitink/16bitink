import { clamp, smooth } from './geom';

/** The light of the hour. Pure. */
const DAWN = [3.6, 5.6] as const;
const DUSK = [18.2, 20.4] as const;
const NIGHT = { r: 0x7c, g: 0x86, b: 0xbe } as const;
/** A touch of warmth: paper stays paper. */
const GOLD = { r: 0xff, g: 0xee, b: 0xd9 } as const;

/** 0 day .. 1 night. */
export function nightOf(hour: number): number {
  const up = smooth((hour - DAWN[0]) / (DAWN[1] - DAWN[0]));
  const down = smooth((hour - DUSK[0]) / (DUSK[1] - DUSK[0]));
  return 1 - up + down;
}

/** The multiply colour of the hour: white at noon, gold at the edges, blue at night. */
export function washOf(hour: number): number {
  const n = nightOf(hour);
  const edge = Math.exp(-(((hour - 5.8) / 1.2) ** 2)) + Math.exp(-(((hour - 18.4) / 1.3) ** 2));
  const mix = (c: 'r' | 'g' | 'b'): number => {
    const gold = 255 + (GOLD[c] - 255) * clamp(edge, 0, 1) * 0.8;
    return Math.round(gold + (NIGHT[c] - gold) * n);
  };
  return (mix('r') << 16) | (mix('g') << 8) | mix('b');
}
