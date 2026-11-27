/**
 * Physics checks per drawn frame (docs/inkroad-vehicle-model.md "Invariants"): what a real car can't do, measured on
 * the drawn poses alone (the body's middle and heading each frame), so today's motion and the new model are judged
 * the same way. The rear axle is found from the middle by the kind's geometry (src/sim/vehicle/params.ts).
 */
import { bodiesOverlap, type Body } from '../../src/sim/vehicleSize';
import { kappaMax, rearOf, type VehicleParams } from '../../src/sim/vehicle/params';

/** One drawn frame of one car: the middle of its body and its heading. */
export interface Drawn { readonly t: number; readonly x: number; readonly y: number; readonly a: number }

export interface Maxima {
  /** Angle between the rear axle's move and the heading (rad), and its sideways speed (px/s). */
  readonly slip: number;
  readonly slipSpeed: number;
  /** Sharpest curvature over the kind's most (1 = full lock). */
  readonly kappa: number;
  /** Frames where the heading changed while the rear axle stood (a pivot). */
  readonly pivots: number;
  /** Fastest change of the road-wheel angle the curvature implies, over the steering rate (1 = the limit). */
  readonly kappaRate: number;
  /** Hardest acceleration and braking over the limits, and the largest jerk over its limit. */
  readonly accel: number;
  readonly brake: number;
  readonly jerk: number;
  /** Speed on a curve over √(aLat/|κ|) (1 = the limit). */
  readonly curve: number;
  /** Frames where the body overlaps another body. */
  readonly overlaps: number;
  /** Largest jump in one frame (px). */
  readonly jump: number;
  readonly frames: number;
}

/** Px of rear-axle travel under which a frame counts as standing (the curvature is not measured). */
const STAND = 0.03;
/** Heading change (rad) in a standing frame that counts as a pivot. */
const PIVOT = 0.002;
/** Px/s under which the curve rule is not checked (a creeping car). */
const SLOW = 2;

interface Step { readonly ds: number; readonly v: number; readonly dth: number; readonly k: number | null; readonly slip: number; readonly side: number; readonly dt: number }

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

function steps(fr: readonly Drawn[], p: VehicleParams): Step[] {
  const out: Step[] = [];
  for (let i = 1; i < fr.length; i++) {
    const f0 = fr[i - 1]!, f1 = fr[i]!;
    const dt = Math.max(1e-6, f1.t - f0.t);
    const r0 = rearOf(p, f0.x, f0.y, f0.a), r1 = rearOf(p, f1.x, f1.y, f1.a);
    const dx = r1.x - r0.x, dy = r1.y - r0.y;
    const ds = Math.hypot(dx, dy);
    const mid = f0.a + wrap(f1.a - f0.a) / 2;
    const along = dx * Math.cos(mid) + dy * Math.sin(mid);
    const side = -dx * Math.sin(mid) + dy * Math.cos(mid);
    const dth = wrap(f1.a - f0.a);
    const slip = ds > STAND ? Math.abs(Math.atan2(side, Math.abs(along))) : 0;
    out.push({ ds, v: along / dt, dth, k: ds > STAND ? dth / along : null, slip, side: Math.abs(side) / dt, dt });
  }
  return out;
}

/** Every check on one car's frames; `others(i)` gives the bodies around it at frame i (for overlaps). */
export function measure(fr: readonly Drawn[], p: VehicleParams, others?: (i: number) => readonly Body[]): Maxima {
  const st = steps(fr, p);
  const km = kappaMax(p);
  const wheel = (k: number): number => Math.atan(k * p.wheelbase);
  let slip = 0, slipSpeed = 0, kappa = 0, pivots = 0, kappaRate = 0, accel = 0, brake = 0, jerk = 0, curve = 0, overlaps = 0, jump = 0;
  for (let i = 0; i < st.length; i++) {
    const s = st[i]!;
    jump = Math.max(jump, s.ds);
    if (s.ds > STAND) { slip = Math.max(slip, s.slip); slipSpeed = Math.max(slipSpeed, s.side); }
    if (s.k === null && Math.abs(s.dth) > PIVOT) pivots++;
    if (s.k !== null) {
      kappa = Math.max(kappa, Math.abs(s.k) / km);
      if (Math.abs(s.v) > SLOW) curve = Math.max(curve, Math.abs(s.v) / Math.sqrt(p.aLat / Math.max(1e-9, Math.abs(s.k))));
    }
    const prev = st[i - 1];
    if (prev && prev.k !== null && s.k !== null) kappaRate = Math.max(kappaRate, Math.abs(wheel(s.k) - wheel(prev.k)) / s.dt / p.steerRate);
    if (prev && Math.abs(prev.v) > 0.05 && Math.abs(s.v) > 0.05 && Math.sign(prev.v) === Math.sign(s.v)) {
      const a = (Math.abs(s.v) - Math.abs(prev.v)) / s.dt;
      accel = Math.max(accel, a / p.accel);
      brake = Math.max(brake, -a / p.brake);
      const pp = st[i - 2];
      if (pp && Math.abs(pp.v) > 0.05 && Math.sign(pp.v) === Math.sign(s.v)) {
        const a0 = (Math.abs(prev.v) - Math.abs(pp.v)) / prev.dt;
        jerk = Math.max(jerk, Math.abs(a - a0) / s.dt / p.jerk);
      }
    }
  }
  if (others && fr.length > 0) {
    // Bodies it already touches where it starts or ends (slots drawn too close together) are the layout's fault, not the motion's.
    const at = (f: Drawn): Body => ({ x: f.x, y: f.y, a: f.a, len: p.len, wid: p.wid });
    const ends = [at(fr[0]!), at(fr[fr.length - 1]!)];
    const near = (b: Body): boolean => ends.some((e) => bodiesOverlap(e, b, 0.4));
    fr.forEach((f, i) => {
      if (others(i).some((b) => !near(b) && bodiesOverlap(at(f), b, 0.4))) overlaps++;
    });
  }
  return { slip, slipSpeed, kappa, pivots, kappaRate, accel, brake, jerk, curve, overlaps, jump, frames: fr.length };
}

/** Limits a real car meets (ratios are against the limits; small slack for sampling). */
export const PHYSICAL: Readonly<Record<keyof Omit<Maxima, 'frames' | 'jump'>, number>> = {
  slip: 0.01, slipSpeed: 0.05, kappa: 1.001, pivots: 0, kappaRate: 1.05, accel: 1.01, brake: 1.01, jerk: 1.05, curve: 1.05, overlaps: 0,
};

/** The checks a set of maxima breaks, as text. */
export function broken(m: Maxima): string[] {
  return (Object.keys(PHYSICAL) as (keyof typeof PHYSICAL)[]).filter((k) => m[k] > PHYSICAL[k]).map((k) => `${k} ${m[k].toFixed(3)} > ${PHYSICAL[k]}`);
}
