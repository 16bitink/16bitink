/**
 * Moves into and out of a car park bay by its aisle (the owner, rule 22 of docs/inkroad-build.md "Car motion rules"):
 * in through the gate, along the aisle at manoeuvre pace (9 km/h, under the 10 km/h of car parks) and nose first into
 * the bay; out by backing into the aisle at walking pace, then forward along it and out through the gate. Each move is
 * planned in two Reeds–Shepp stages on the aisle's ground (src/city/moveGround.ts `aisleRects`), through a waypoint on
 * the aisle, so a car never wanders across the bays or loops. Pure.
 */
import { inPlan, type Aisle } from '../sim/slotGeometry';
import type { LanePose } from '../sim/trafficTypes';
import type { VehicleParams } from '../sim/vehicle/params';
import { joinPlayed, lastPose, PLAY_STRIDE, type Band, type Played } from '../sim/vehicle/played';
import { playInto, playOutOf, type MiddlePose, type OutMove } from '../sim/vehicle/moves';
import { LOOP_SLACK, type World } from '../sim/vehicle/planner';

/** Px along the aisle before a bay's column the car turns in from (several offered, the quickest that fits wins). */
const LEADS = [22, 30, 38, 46] as const;
/** Px along the aisle past the gate lane a car is first lined up on the aisle (it has turned out of the gate lane). */
const PAST_GATE = 21, PAST_SIDE_GATE = 10;
/** Px the waypoint keeps off the aisle's line, away from the bay's row: room for the swing in. */
const AWAY = 3;
/** Px past the bay's column a car backing out stops in the aisle (several offered). */
const BACKS = [8, 14, 20, 26] as const;

const sign = (v: number): 1 | -1 => (v >= 0 ? 1 : -1);
const along = (way: 1 | -1): number => (way > 0 ? 0 : Math.PI);
/** Does the gate open onto the aisle itself (a gate on a side edge)? */
const sideGate = (a: Aisle): boolean => Math.abs(a.gate.y - a.y) < 1;
const endOf = (m: Played): MiddlePose => { const q = lastPose(m); return { x: q.x, y: q.y, a: q.th }; };
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** No loops (the owner): over the moves played one after another, the heading sweeps at most its net change + LOOP_SLACK. */
function loops(...ms: readonly Played[]): boolean {
  let th = 0, lo = 0, hi = 0, last: number | null = null, first: number | null = null;
  for (const m of ms) for (let i = 0; i < m.n; i++) {
    const a = m.frames[i * PLAY_STRIDE + 2]!;
    if (last !== null) { th += wrap(a - last); lo = Math.min(lo, th); hi = Math.max(hi, th); }
    first ??= a;
    last = a;
  }
  return first !== null && last !== null && hi - lo > Math.abs(wrap(last - first)) + LOOP_SLACK;
}

/** Waypoints on the aisle before the bay, heading toward it, that a car out of the gate lane can reach driving forward. */
function wayIn(a: Aisle, bay: MiddlePose): MiddlePose[] {
  const way = sign(bay.x - a.join.x);
  const least = sideGate(a) ? PAST_SIDE_GATE : PAST_GATE;
  const y = a.y + (bay.y < a.y ? AWAY : -AWAY);
  const xs = LEADS.map((d) => bay.x - way * d).filter((x) => way * (x - a.join.x) >= least && x > a.x0 + 8 && x < a.x1 - 8);
  const first = a.join.x + way * least;
  return (xs.length ? xs : [first]).map((x) => ({ x, y, a: along(way) }));
}

/** A far-row bay straight across the aisle from the gate lane: driven into straight from the gate. */
const straightAcross = (a: Aisle, bay: MiddlePose): boolean =>
  !sideGate(a) && Math.abs(bay.x - a.join.x) < a.lane && sign(bay.y - a.y) !== sign(a.gate.y - a.y);

/**
 * Lane to bay: to a waypoint on the aisle (forward, standing first for `wait` s), then nose first into the bay. The
 * quickest pair that fits; null when none does.
 */
export function aisleIn(p: VehicleParams, lane: LanePose, bay: MiddlePose, a: Aisle, w: World, wait: number): Played | null {
  const roll = [lane.v ?? 0, lane.acc ?? 0, lane.delta ?? 0] as const;
  // Waypoints are found in the aisle's frame (x along it) and planned in plan.
  const local = inPlan(a, bay);
  if (straightAcross(a, local)) {
    const m = playInto(p, lane, bay, w, true, { pause: wait, forwardOnly: true }, ...roll);
    if (m.fits && !loops(m)) return m;
  }
  let best: Played | null = null;
  for (const wp of wayIn(a, local).map((q) => inPlan(a, q))) {
    const first = playInto(p, lane, wp, w, false, { pause: wait, forwardOnly: true }, ...roll);
    if (!first.fits) continue;
    const second = playInto(p, endOf(first), bay, w, true, {});
    if (second.fits && !loops(first, second) && (!best || first.seconds + second.seconds < best.seconds)) best = joinPlayed(first, second);
  }
  return best;
}

/** Does the car stand nose out, facing the aisle (it reversed in when nothing else fitted)? */
const facesAisle = (a: Aisle, at: MiddlePose): boolean => Math.sin(at.a) * (a.y - at.y) > 0;

/** Waypoints on the aisle past the bay's column, facing the gate, from which a forward turn into the gate lane fits. */
function wayOut(a: Aisle, bay: MiddlePose): MiddlePose[] {
  const toGate = a.join.x - bay.x;
  const ways: (1 | -1)[] = Math.abs(toGate) < a.lane ? [1, -1] : [sign(toGate)];
  const least = sideGate(a) ? 0 : PAST_GATE;
  return ways.flatMap((g) => BACKS.map((d) => ({ x: bay.x - g * d, y: a.y, a: along(g) })).filter((q) => g * (a.join.x - q.x) >= least && q.x > a.x0 + 8 && q.x < a.x1 - 8));
}

export interface AisleOut { readonly back: Played; readonly out: OutMove }

/**
 * Bay to lane: back out into the aisle (inside the park only, at walking pace), then forward along it, through the
 * gate lane and out of the gate to one of the lane goals (cut at the lane band `b`). Null when none fits.
 */
export function aisleOut(p: VehicleParams, from: MiddlePose, a: Aisle, goals: readonly { readonly pose: MiddlePose; readonly cost: number }[], w: World, b: Band): AisleOut | null {
  const local = inPlan(a, from);
  if (facesAisle(a, local)) return null;
  let best: { back: Played; out: OutMove; s: number } | null = null;
  for (const wp of wayOut(a, local).map((q) => inPlan(a, q))) {
    const back = playInto(p, from, wp, w, false, { reverseOnly: true });
    if (!back.fits) continue;
    const out = playOutOf(p, endOf(back), goals, w, b, { forwardOnly: true });
    if (!out?.fits || loops(back, out.toEdge, out.join)) continue;
    const s = back.seconds + out.toEdge.seconds + out.join.seconds;
    if (!best || s < best.s) best = { back, out, s };
  }
  return best ? { back: best.back, out: best.out } : null;
}
