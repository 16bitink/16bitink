/**
 * Turning round on the road (docs/inkroad-vehicle-model.md "Phase B"): a car that must go back the way it came (at a
 * dead end, or redirected to a place behind it) makes a real turn, planned with Reeds–Shepp on the road's own ground
 * (its paved width and the junction discs, never a verge or a lot) and played once by the tracker. The sim holds the
 * car (no progress) for the played seconds while its drawn car plays the frames (src/sim/drawn.ts), then puts it on
 * the lane back where the turn ended. This is the one move that may reverse across the road (the owner's exception):
 * it waits for the road to be clear both ways and walks at the manoeuvre paces.
 */
import { GAP_S, GAME_PACE } from './kinematics';
import { LANE_T, poseAt, type Track } from './track';
import { halfWidth } from './roadGeom';
import type { Sim } from './sim';
import { POSE } from './store';
import type { World } from './vehicle/planner';
import { playTurn, type MiddlePose } from './vehicle/moves';
import { PLAY_DT, standingAt, type Played } from './vehicle/played';
import { delayed } from './sweeps';
import { paramsOfKind } from './drawn';
import { sizeOf, type Body } from './vehicleSize';
import { logMove } from './moveLog';
import { VEHICLES } from './constants';
import { IDM } from './tune';
import type { VehicleKind } from './types';

/** Px of kerb a body corner may touch, and the parking band streets and kerb roads have. */
const KERB = 1.5, PARK_BAND = 13;
/** Px round the move the ground is gathered from. */
const REACH = 80;
/** Goal offers along the lane back: every OFFER px up to AHEAD px past its start. */
const OFFER = 4, AHEAD = 48;
/** Seconds of clear road both ways a driver wants before turning round (3 s real, at the game's pace). */
export const TURN_GAP = GAP_S / GAME_PACE;

/** The roads and junction discs round a box: where a turning car may be. Bodies: cars standing near. */
export function roadWorld(sim: Sim, x0: number, y0: number, x1: number, y1: number, self: number): World {
  const segs: { ax: number; ay: number; dx: number; dy: number; l2: number; hw: number }[] = [];
  for (const r of sim.world.net.roads) {
    if (r.level !== 0 || r.flyover) continue;
    const hw = halfWidth(r) + KERB + (r.kerb || r.type === 'street' ? PARK_BAND : 0);
    for (let k = 1; k < r.line.length; k++) {
      const a = r.line[k - 1]!, b = r.line[k]!;
      if (Math.max(a.x, b.x) < x0 - REACH || Math.min(a.x, b.x) > x1 + REACH || Math.max(a.y, b.y) < y0 - REACH || Math.min(a.y, b.y) > y1 + REACH) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      segs.push({ ax: a.x, ay: a.y, dx, dy, l2: Math.max(1e-9, dx * dx + dy * dy), hw });
    }
  }
  const discs = sim.world.net.junctions.filter((j) => j.x > x0 - REACH - j.radius && j.x < x1 + REACH + j.radius && j.y > y0 - REACH - j.radius && j.y < y1 + REACH + j.radius);
  const drivable = (x: number, y: number): boolean => segs.some((s) => {
    const t = Math.max(0, Math.min(1, ((x - s.ax) * s.dx + (y - s.ay) * s.dy) / s.l2));
    return Math.hypot(s.ax + s.dx * t - x, s.ay + s.dy * t - y) <= s.hw;
  }) || discs.some((j) => Math.hypot(j.x - x, j.y - y) <= j.radius + KERB);
  // Moves under way stand where they are drawn too (a car waiting at a lane edge): the turn is planned round them.
  const box = [x0 - REACH, y0 - REACH, x1 + REACH, y1 + REACH] as const;
  const moving = sim.sweeps.bodiesAt(sim.time, box, -sim.cars.uid[self]!);
  return { drivable, bodies: [...standingNear(sim, x0, y0, x1, y1, self), ...moving, ...(sim.parked?.(...box) ?? [])] };
}

/**
 * Cars near the box (not the car itself): a standing one where it is drawn, a moving one stretched over the road it
 * needs to stop (a turn never starts in front of a car that could not stop short of it).
 */
function standingNear(sim: Sim, x0: number, y0: number, x1: number, y1: number, self: number): Body[] {
  const c = sim.cars, out: Body[] = [];
  for (let q = 0; q < c.count; q++) {
    if (q === self || !c.alive[q] || c.state[q] === 4 || c.z[q] !== 0) continue;
    const x = c.x[q]!, y = c.y[q]!;
    if (x < x0 - REACH || x > x1 + REACH || y < y0 - REACH || y > y1 + REACH) continue;
    const v = c.speed[q]!, a = c.heading[q]!, z = sizeOf(kindName(c.kind[q]!));
    const stop = v > 3 ? (v * v) / (2 * IDM.brake) + IDM.standGap : 0;
    out.push({ x: x + Math.cos(a) * stop / 2, y: y + Math.sin(a) * stop / 2, a, len: z.len + stop, wid: z.wid });
  }
  return out;
}

/** Middle poses on a lane from s0 on, every OFFER px. */
function laneGoals(t: Track, s0: number): { s: number; pose: MiddlePose; cost: number }[] {
  const out: { s: number; pose: MiddlePose; cost: number }[] = [];
  for (let d = 0; d <= AHEAD; d += OFFER) {
    const s = s0 + d;
    if (s > t.len - 2) break;
    poseAt(t, s, POSE);
    out.push({ s, pose: { x: POSE.x, y: POSE.y, a: POSE.h }, cost: d * 0.25 });
  }
  return out;
}

/** The drawn pose of car i now (its body's middle). */
const drawnPose = (sim: Sim, i: number): MiddlePose => ({ x: sim.cars.x[i]!, y: sim.cars.y[i]!, a: sim.cars.heading[i]! });

/** Plans and starts a turn round for car i onto lane `to` from px `s0` on (after `wait` seconds standing). Null: no turn found. */
export function startTurn(sim: Sim, i: number, to: Track, s0: number, wait: number): { s: number; played: Played } | null {
  const c = sim.cars;
  const from = drawnPose(sim, i);
  const goals = laneGoals(to, Math.max(1, s0));
  if (goals.length === 0) return null;
  const xs = [from.x, ...goals.map((g) => g.pose.x)], ys = [from.y, ...goals.map((g) => g.pose.y)];
  const w = roadWorld(sim, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), i);
  const m = playTurn(paramsOfKind(c.kind[i]!), from, goals, w);
  // A turn that would sweep through a car (or off the road) is not made: the car waits and looks again.
  if (!m || !m.played.fits) return null;
  // Nor one that would touch another move under way (the one collision rule, src/sim/sweeps.ts).
  const z = sizeOf(kindName(c.kind[i]!));
  // A waiting car's reserved way into the lane is no wall for a turn that only passes (it is checked when that car goes).
  if (sim.sweeps.hit(m.played, sim.time + wait, z.len, z.wid, -c.uid[i]!, false, false) >= 0) return null;
  sim.sweeps.put(-c.uid[i]!, m.played, sim.time + wait, z.len, z.wid, false, undefined, true);
  c.play[i] = m.played;
  c.playAt[i] = sim.time + wait;
  logMove({ what: 'turn', kind: kindName(c.kind[i]!), seconds: m.played.seconds, lane: wait + m.played.seconds, fits: m.played.fits, ms: 0, word: m.played.word });
  return { s: goals[m.goal]!.s, played: m.played };
}

/** Seconds a waiting car's reservation stands before it is renewed (it lapses by itself if the car is gone). */
const RESERVE_S = 3;

/**
 * A car waiting at a dead end to turn round reserves the turn it will make (planned on the road alone): pull-outs and
 * moves keep out of it, and followers keep their gap to its whole sweep (src/sim/drawn.ts), so nothing creeps into it.
 */
export function reserveTurn(sim: Sim, i: number, to: Track): void {
  const c = sim.cars;
  const from = drawnPose(sim, i);
  const goals = laneGoals(to, 1);
  if (goals.length === 0) return;
  if (!c.reserve[i]) {
    const xs = [from.x, ...goals.map((g) => g.pose.x)], ys = [from.y, ...goals.map((g) => g.pose.y)];
    const w = roadWorld(sim, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), i);
    c.reserve[i] = playTurn(paramsOfKind(c.kind[i]!), from, goals, { ...w, bodies: [] })?.played ?? null;
  }
  const z = sizeOf(kindName(c.kind[i]!));
  const stand = delayed(standingAt(paramsOfKind(c.kind[i]!), from), RESERVE_S);
  sim.sweeps.put(-c.uid[i]!, stand, sim.time, z.len, z.wid, false, c.reserve[i] ?? undefined, false);
}

/** Px past a junction's line the goals of a reverse out of a dead end are offered. */
const OUT_FROM = 6;

/** The lanes leaving the junction a lane starts at (not the lane itself): where a car backing out of a dead end may end. */
function lanesOut(sim: Sim, lane: Track): Track[] {
  const into = sim.world.tracks.find((t) => t.kind !== LANE_T && t.to === lane);
  if (!into) return [];
  const out = new Set<Track>();
  for (const t of sim.world.tracks) if (t.kind !== LANE_T && t.node === into.node && t.to && t.to.kind === LANE_T && t.to.link !== lane.link) out.add(t.to);
  return [...out];
}

/**
 * The last resort of a car that cannot turn round at a dead end (the owner, round 5: a car never waits forever): it
 * reverses out at walking pace along its lane to the junction and on into another road there, as real drivers do.
 * Planned on the road's ground clear of every body; true when it starts.
 */
export function reverseOut(sim: Sim, i: number, lane: Track): boolean {
  const c = sim.cars;
  const from = drawnPose(sim, i);
  const offers = lanesOut(sim, lane).flatMap((t) => laneGoals(t, OUT_FROM).map((g) => ({ ...g, t })));
  if (offers.length === 0) return false;
  const xs = [from.x, ...offers.map((g) => g.pose.x)], ys = [from.y, ...offers.map((g) => g.pose.y)];
  const w = roadWorld(sim, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), i);
  const m = playTurn(paramsOfKind(c.kind[i]!), from, offers, w);
  if (!m || !m.played.fits) return false;
  const z = sizeOf(kindName(c.kind[i]!));
  if (sim.sweeps.hit(m.played, sim.time, z.len, z.wid, -c.uid[i]!, false, false) >= 0) return false;
  sim.sweeps.put(-c.uid[i]!, m.played, sim.time, z.len, z.wid, false, undefined, true);
  c.play[i] = m.played;
  c.playAt[i] = sim.time;
  c.playGoal[i] = offers[m.goal]!.s;
  c.playTo[i] = offers[m.goal]!.t;
  c.reserve[i] = null;
  logMove({ what: 'turn', kind: kindName(c.kind[i]!), seconds: m.played.seconds, lane: m.played.seconds, fits: true, ms: 0, word: `out ${m.played.word}` });
  return true;
}

/** Is car i still in its played turn? */
export const turning = (sim: Sim, i: number): boolean => {
  const p = sim.cars.play[i];
  return !!p && sim.time < sim.cars.playAt[i]! + p.seconds;
};

/** Seconds car i stands in or plays its turn from now. */
export const turnLeft = (sim: Sim, i: number): number => {
  const p = sim.cars.play[i];
  return p ? Math.max(0, sim.cars.playAt[i]! + p.seconds - sim.time) : 0;
};

/**
 * Px a turning car's body reaches behind a point on a track, over the frames of its turn from `t` seconds on, beyond
 * `body` (half the drawn length): followers on that track keep their gap to the whole sweep, never to the sim's point
 * alone (a three-point turn backs up over the lane behind it).
 */
export function sweepBehind(m: Played, t: number, track: Track, s: number, len: number, wid: number, body: number): number {
  poseAt(track, s, POSE);
  const ux = Math.cos(POSE.h), uy = Math.sin(POSE.h), px = POSE.x, py = POSE.y;
  let most = 0;
  for (let k = Math.max(0, Math.floor(t / PLAY_DT)); k < m.n; k += 3) {
    const o = k * 3, x = m.frames[o]!, y = m.frames[o + 1]!, a = m.frames[o + 2]!;
    const reach = (len * Math.abs(Math.cos(a - POSE.h)) + wid * Math.abs(Math.sin(a - POSE.h))) / 2;
    most = Math.max(most, (px - x) * ux + (py - y) * uy + reach);
  }
  return Math.max(0, most - body);
}

/** A hidden stand-in holds lane t at s for `seconds` (the road a turning car's body sweeps), `lag` px of sweep behind it. */
export function standIn(sim: Sim, t: Track, s: number, seconds: number, kind: number, lag = 0): void {
  const c = sim.cars;
  if (t.kind !== LANE_T) return;
  const q = c.take(kind);
  if (q < 0) return;
  if (s < c.half[q]! || s > t.len - c.half[q]!) { c.drop(q); return; }
  c.state[q] = 4;
  c.until[q] = sim.time + seconds;
  c.born[q] = sim.time;
  c.insert(q, t, s);
  c.link[q] = t.link;
  c.lag[q] = lag;
}

const kindName = (k: number): VehicleKind => VEHICLES[k] as VehicleKind;
