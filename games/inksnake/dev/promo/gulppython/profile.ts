/**
 * The Indian rock python's outline, side on: half its depth at each place
 * `a` along it (world units, snout 0 to tail tip PY_LEN). Long and heavy,
 * a head as deep as its neck, then a body half again as deep as the cobra's (story.ts
 * NECK_W 122), tapering to a fine tail. It lies on its belly, so the lump
 * it makes in the cobra is the same above the axis as below: long, not round.
 */
const KNOTS: readonly (readonly [number, number])[] = [
  [0, 4], [20, 34], [70, 54], [150, 68], [280, 72], [350, 68], [420, 74], [560, 88], [720, 95], [1000, 95], [1200, 80], [1340, 50], [1440, 20], [1500, 2],
];

export const PY_LEN = 1500;

/** Half the python's depth at `a` (0 outside it). */
export function pyHalf(a: number): number {
  if (a <= 0 || a >= PY_LEN) return 0;
  for (let i = 1; i < KNOTS.length; i++) {
    const k1 = KNOTS[i]!;
    if (a > k1[0]) continue;
    const k0 = KNOTS[i - 1]!;
    const s = (a - k0[0]) / (k1[0] - k0[0]);
    return k0[1] + (k1[1] - k0[1]) * (1 - Math.cos(Math.PI * s)) * 0.5;
  }
  return 0;
}

/** Where the head sprite's origin sits along the python, and world units per art unit (pythonArt.ts: snout at art x = 50). */
export const HEAD_A = 300;
export const PY_ART = 6;
