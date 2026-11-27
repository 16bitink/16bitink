/**
 * Reeds–Shepp port (src/sim/vehicle/reedsShepp.ts) against the reference: the KNOWN table was printed by
 * PythonRobotics' reeds_shepp_path_planning.py generate_path (step 0.05), lengths in units of length.
 */
import { describe, expect, it } from 'vitest';
import { rsCandidates, rsEnd, rsSample, rsShortest } from '../../src/sim/vehicle/reedsShepp';
import { pathOf } from '../../src/sim/vehicle/path';

const KNOWN = [
  { q0: [0, 0, 0], q1: [10, 0, 0], k: 0.1, n: 10, L: 10, word: 'LSL', lengths: [0, 10, 0] },
  { q0: [0, 0, 0], q1: [0, 0, Math.PI], k: 0.2, n: 8, L: 15.707963, word: 'LRL', lengths: [5.235988, -5.235988, 5.235988] },
  { q0: [0, 0, 0], q1: [-5, 3, 0], k: 0.25, n: 3, L: 7.231423, word: 'RLRL', lengths: [0.321872, -3.293839, -3.293839, 0.321872] },
  { q0: [0, 0, 0], q1: [4, 4, Math.PI / 2], k: 0.2, n: 7, L: 7.853982, word: 'LRL', lengths: [3.573142, -0.707697, 3.573142] },
  { q0: [1, 2, 0.3], q1: [-3, 7, -2], k: 0.3, n: 8, L: 8.072601, word: 'RLSL', lengths: [0.066901, -5.235988, -0.405934, -2.363778] },
  { q0: [0, 0, 0], q1: [0, -2.5, 0], k: 0.25, n: 4, L: 8.500756, word: 'LRLR', lengths: [1.8082, -2.442178, -2.442178, 1.8082] },
  { q0: [0, 0, 0], q1: [-1, 8, Math.PI / 2], k: 0.2, n: 6, L: 12.347621, word: 'RLR', lengths: [-2.622172, 7.478629, 2.24682] },
  { q0: [0, 0, Math.PI / 2], q1: [6, 1, -Math.PI / 2], k: 0.15, n: 2, L: 20.943951, word: 'LRL', lengths: [5.400212, -10.832568, 4.711171] },
] as const;

const pose = (q: readonly number[]) => ({ x: q[0]!, y: q[1]!, th: q[2]! });

describe('Reeds–Shepp, as PythonRobotics', () => {
  for (const c of KNOWN) {
    it(`${c.q0.join(',')} -> ${c.q1.join(',')} at k ${c.k}: ${c.word} ${c.L}`, () => {
      const all = rsCandidates(pose(c.q0), pose(c.q1), c.k, 0.05);
      expect(all.length).toBe(c.n);
      const best = rsShortest(pose(c.q0), pose(c.q1), c.k, 0.05)!;
      expect(best.total / c.k).toBeCloseTo(c.L, 4);
      // Symmetric goals tie (a U-turn's LRL and RLR): the reference's word is one of the shortest.
      const same = all.filter((p) => Math.abs(p.total - best.total) < 1e-6 && p.ctypes.join('') === c.word);
      expect(same.length).toBeGreaterThan(0);
      const match = same.find((p) => p.lengths.every((l, i) => Math.abs(l / c.k - c.lengths[i]!) < 1e-4)) ?? same[0]!;
      match.lengths.forEach((l, i) => expect(l / c.k).toBeCloseTo(c.lengths[i]!, 4));
    });
  }

  it('every candidate ends on the goal pose', () => {
    const goals = [[3, 1, 0.4], [-2, -3, 2.5], [0.5, 0.2, -1.2], [-6, 0, 3.1], [1, -9, -2]];
    for (const g of goals) {
      for (const p of rsCandidates({ x: 0, y: 0, th: 0 }, pose(g), 0.4)) {
        const e = rsEnd({ x: 0, y: 0, th: 0 }, p, 0.4);
        expect(Math.hypot(e.x - g[0]!, e.y - g[1]!)).toBeLessThan(1e-6);
        expect(Math.abs(Math.atan2(Math.sin(e.th - g[2]!), Math.cos(e.th - g[2]!)))).toBeLessThan(1e-6);
      }
    }
  });

  it('samples into legs split at every gear change, heading on the tangent', () => {
    const q0 = { x: 10, y: 20, th: 0.3 };
    const p = rsShortest(q0, { x: 0, y: 30, th: 0.3 }, 1 / 18)!;
    const path = pathOf(rsSample(q0, p, 1 / 18, { fwd: 10, rev: 5 }));
    const cusps = p.lengths.filter((l, i) => i > 0 && Math.sign(l) !== Math.sign(p.lengths[i - 1]!) && Math.abs(l) > 1e-9).length;
    expect(path.legs.length).toBe(cusps + 1);
    for (const l of path.legs) {
      for (let i = 1; i < l.xs.length; i++) {
        const mv = Math.atan2(l.ys[i]! - l.ys[i - 1]!, l.xs[i]! - l.xs[i - 1]!);
        const want = l.dir === 1 ? l.ths[i]! : l.ths[i]! + Math.PI;
        expect(Math.abs(Math.atan2(Math.sin(mv - want), Math.cos(mv - want)))).toBeLessThan(0.05);
      }
    }
  });
});
