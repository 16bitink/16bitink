/**
 * The bicycle model and its tracker (src/sim/vehicle/): the car follows lanes, junction turns, lane changes and
 * Reeds–Shepp manoeuvres within a few px, and every drawn frame meets the physics checks (test/vehicle/invariants.ts).
 */
import { describe, expect, it } from 'vitest';
import { middleOf, paramsOf, type VehicleParams } from '../../src/sim/vehicle/params';
import { pathOf, poseAt, projectNear, samplePolyline, type Pose, type RefPath } from '../../src/sim/vehicle/path';
import { rsShortest, rsSample } from '../../src/sim/vehicle/reedsShepp';
import { junctionTurn, laneShift, shiftLength, straight } from '../../src/sim/vehicle/turns';
import { playPlan, type DriveState, type PlanItem } from '../../src/sim/vehicle/tracker';
import type { CarState } from '../../src/sim/vehicle/bicycle';
import { broken, measure, type Drawn } from './invariants';

const DT = 1 / 60;
const car = paramsOf('car');

const at = (p: Pose, u = 0, dir: 1 | -1 = 1): CarState => ({ x: p.x, y: p.y, th: p.th, u, dir, delta: 0, a: 0 });
const drawn = (fr: readonly DriveState[], p: VehicleParams): Drawn[] => fr.map((d, i) => ({ t: i * DT, ...middleOf(p, d.car.x, d.car.y, d.car.th), a: d.car.th }));

/** Largest distance from the rear axle to the reference, px (each frame against the leg it is on). */
function worstError(fr: readonly DriveState[], path: RefPath): number {
  let worst = 0;
  for (const d of fr) {
    const l = path.legs[d.leg];
    if (!l || d.phase === 'done') continue;
    const s = projectNear(l, d.car.x, d.car.y, d.s, 10);
    const q = poseAt(l, Math.max(0, Math.min(l.len, s)));
    worst = Math.max(worst, Math.hypot(q.x - d.car.x, q.y - d.car.y));
  }
  return worst;
}

function play(path: RefPath, start: CarState, p = car, seconds = 60): DriveState[] {
  const plan: PlanItem[] = [{ kind: 'path', path }];
  return playPlan(start, plan, p, DT, seconds);
}

describe('vehicle limits', () => {
  it('a car turns the game\'s R_MIN at its middle and steers at most 37.5°/s played', () => {
    expect(car.steerMax).toBeGreaterThan(0.45);
    expect(car.steerMax).toBeLessThan(0.55);
    expect(Math.hypot(car.rMin, car.toMiddle) / (car.len / 4.5)).toBeCloseTo(5.2, 2);
    expect(paramsOf('truck').rMin).toBeGreaterThan(car.rMin);
  });
});

describe('tracking', () => {
  it('drives a straight lane and stops at its end', () => {
    const path = pathOf([{ dir: 1, pts: straight({ x: 0, y: 0, th: 0 }, 200, 62) }]);
    const fr = play(path, at({ x: 0, y: 0, th: 0 }, 40));
    expect(fr[fr.length - 1]!.phase).toBe('done');
    expect(Math.abs(fr[fr.length - 1]!.car.x - 200)).toBeLessThan(1.5);
    expect(broken(measure(drawn(fr, car), car))).toEqual([]);
  });

  it('takes a right-angle junction turn within 2 px (the road lag), curvature continuous', () => {
    const turn = junctionTurn({ x: 0, y: 0, th: 0 }, { x: 30, y: 30, th: Math.PI / 2 }, car.rPlan, 62)!;
    expect(turn.radius).toBeGreaterThanOrEqual(car.rPlan - 1e-9);
    const lane0 = straight({ x: -120, y: -turn.trimIn * 0, th: 0 }, 120 - turn.trimIn, 62);
    const path = pathOf([{ dir: 1, pts: lane0 }, { dir: 1, pts: turn.pts }, { dir: 1, pts: samplePolyline([{ x: 30, y: 30 + turn.trimOut }, { x: 30, y: 150 }], 62) }]);
    const fr = play(path, at({ x: -120, y: 0, th: 0 }, 50));
    expect(worstError(fr, path)).toBeLessThan(2);
    expect(broken(measure(drawn(fr, car), car))).toEqual([]);
  });

  it('changes lane with a quintic shift', () => {
    const len = Math.max(shiftLength(9, car.rPlan), 3 * 50);
    const path = pathOf([{ dir: 1, pts: straight({ x: 0, y: 0, th: 0 }, 60, 62) }, { dir: 1, pts: laneShift({ x: 60, y: 0, th: 0 }, len, 9, 62) }, { dir: 1, pts: straight({ x: 60 + len, y: 9, th: 0 }, 80, 62) }]);
    const fr = play(path, at({ x: 0, y: 0, th: 0 }, 50));
    expect(worstError(fr, path)).toBeLessThan(1.5);
    expect(broken(measure(drawn(fr, car), car))).toEqual([]);
  });

  it('parks parallel with Reeds–Shepp (stops at the cusp, reverses at walking pace)', () => {
    const q0 = { x: 0, y: 0, th: 0 }, q1 = { x: -22, y: 9, th: 0 };
    const rs = rsShortest(q0, q1, 1 / car.rPlan)!;
    const path = pathOf(rsSample(q0, rs, 1 / car.rPlan, { fwd: car.manoeuvre, rev: car.reverse }));
    const fr = play(path, at(q0));
    const end = fr[fr.length - 1]!.car;
    expect(Math.hypot(end.x - q1.x, end.y - q1.y)).toBeLessThan(2);
    // Within 7°: the lag at the S swing (scenes end their moves with a settling straight: within 1° there, test/vehicle/scene.ts).
    expect(Math.abs(end.th - q1.th)).toBeLessThan(0.12);
    expect(worstError(fr, path)).toBeLessThan(2.5);
    const m = measure(drawn(fr, car), car);
    expect(broken(m)).toEqual([]);
    expect(Math.max(...fr.filter((d) => d.car.dir === -1).map((d) => d.car.u))).toBeLessThanOrEqual(car.reverse + 1e-9);
  });

  it('a van and a lorry follow the same parking move at their own radius', () => {
    for (const kind of ['van', 'truck'] as const) {
      const p = paramsOf(kind);
      const q0 = { x: 0, y: 0, th: 0 }, q1 = { x: 40, y: 40, th: Math.PI / 2 };
      const rs = rsShortest(q0, q1, 1 / p.rPlan)!;
      const path = pathOf(rsSample(q0, rs, 1 / p.rPlan, { fwd: p.manoeuvre, rev: p.reverse }));
      const fr = play(path, at(q0), p);
      expect(worstError(fr, path)).toBeLessThan(3);
      expect(broken(measure(drawn(fr, p), p))).toEqual([]);
    }
  });
});
