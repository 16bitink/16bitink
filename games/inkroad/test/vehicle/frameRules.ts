/**
 * The vehicle invariants (test/vehicle/invariants.ts) as per-frame rules for every moving car of a season or a lab
 * scenario: each drawn frame (the body's middle and heading) is turned into the rear axle by the kind's geometry and
 * checked against the kind's limits (src/sim/vehicle/params.ts). One finding per frame and rule.
 */
import { kappaMax, paramsOf, rearOf, type VehicleParams } from '../../src/sim/vehicle/params';
import type { VehicleKind } from '../../src/sim/types';

export type PhysRule = 'slip' | 'turns in place' | 'too tight' | 'too fast on a curve' | 'steers too fast' | 'pulls away too hard' | 'brakes too hard' | 'jerks';
export interface PhysHit { readonly rule: PhysRule; readonly value: number; readonly limit: number }

/** Px of rear-axle travel under which a frame stands (no curvature measured), and the pivot it may show. */
const STAND = 0.03, PIVOT = 0.002;
/** Px/s under which a frame's speed counts as zero for the speed rules, and the curve rule's floor. */
const MOVING = 0.05, SLOW = 2;
/** Slack over each limit (sampling): as invariants.ts PHYSICAL. */
export const SLACK = { slip: 0.01, kappa: 1.001, wheel: 1.05, accel: 1.01, brake: 1.01, jerk: 1.05, curve: 1.05 } as const;

interface Last { readonly x: number; readonly y: number; readonly a: number; readonly frame: number; readonly v: number | null; readonly k: number | null; readonly acc: number | null }

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class PhysWatch {
  private readonly last = new Map<string, Last>();

  /** Frame `frame` of body `id` (a moving car of `kind`), dt played s after its last one. */
  feed(id: string, kind: VehicleKind, frame: number, x: number, y: number, a: number, dt: number): PhysHit[] {
    const p = paramsOf(kind);
    const r = rearOf(p, x, y, a);
    const prev = this.last.get(id);
    const hits: PhysHit[] = [];
    if (!prev || prev.frame !== frame - 1) { this.last.set(id, { x: r.x, y: r.y, a, frame, v: null, k: null, acc: null }); return hits; }
    const dx = r.x - prev.x, dy = r.y - prev.y, ds = Math.hypot(dx, dy);
    const mid = prev.a + wrap(a - prev.a) / 2;
    const along = dx * Math.cos(mid) + dy * Math.sin(mid), side = -dx * Math.sin(mid) + dy * Math.cos(mid);
    const dth = wrap(a - prev.a);
    const v = along / dt;
    const k = ds > STAND ? dth / along : null;
    if (ds > STAND) {
      const slip = Math.abs(Math.atan2(side, Math.abs(along)));
      if (slip > SLACK.slip) hits.push({ rule: 'slip', value: slip, limit: SLACK.slip });
    } else if (Math.abs(dth) > PIVOT) hits.push({ rule: 'turns in place', value: Math.abs(dth), limit: PIVOT });
    if (k !== null) curveRules(hits, p, k, v, prev.k, dt);
    const acc = speedRules(hits, p, v, prev.v, prev.acc, dt);
    this.last.set(id, { x: r.x, y: r.y, a, frame, v, k, acc });
    return hits;
  }
}

function curveRules(hits: PhysHit[], p: VehicleParams, k: number, v: number, kPrev: number | null, dt: number): void {
  const lock = Math.abs(k) / kappaMax(p);
  if (lock > SLACK.kappa) hits.push({ rule: 'too tight', value: lock, limit: SLACK.kappa });
  const cap = Math.sqrt(p.aLat / Math.max(1e-9, Math.abs(k)));
  if (Math.abs(v) > SLOW && Math.abs(v) / cap > SLACK.curve) hits.push({ rule: 'too fast on a curve', value: Math.abs(v), limit: cap * SLACK.curve });
  if (kPrev === null) return;
  const rate = Math.abs(Math.atan(k * p.wheelbase) - Math.atan(kPrev * p.wheelbase)) / dt / p.steerRate;
  if (rate > SLACK.wheel) hits.push({ rule: 'steers too fast', value: rate, limit: SLACK.wheel });
}

/** Acceleration, braking and jerk against the limits; returns this frame's acceleration (null if not measured). */
function speedRules(hits: PhysHit[], p: VehicleParams, v: number, vPrev: number | null, accPrev: number | null, dt: number): number | null {
  if (vPrev === null || Math.abs(vPrev) <= MOVING || Math.abs(v) <= MOVING || Math.sign(v) !== Math.sign(vPrev)) return null;
  const acc = (Math.abs(v) - Math.abs(vPrev)) / dt;
  if (acc / p.accel > SLACK.accel) hits.push({ rule: 'pulls away too hard', value: acc / p.accel, limit: SLACK.accel });
  if (-acc / p.brake > SLACK.brake) hits.push({ rule: 'brakes too hard', value: -acc / p.brake, limit: SLACK.brake });
  if (accPrev !== null && Math.abs(acc - accPrev) / dt / p.jerk > SLACK.jerk) hits.push({ rule: 'jerks', value: Math.abs(acc - accPrev) / dt / p.jerk, limit: SLACK.jerk });
  return acc;
}
