/** Right of way: who may leave the stop line now. */
import { ENTRY_T, LANE_T, poseAt, type Track } from './track';
import { IDM, PATIENCE, RING, SIGNAL, YIELD } from './tune';
import { ringExitLane } from './ringBuild';
import type { NodeRt, OutOpt } from './world';
import type { Sim } from './sim';
import { MOTION_SWITCHES } from './switches';
import { GAME_PACE, GAP_S } from './kinematics';
import { POSE } from './store';

/** Distance from the front bumper to the stop line. */
export const toLine = (sim: Sim, i: number): number => sim.cars.track[i]!.len - sim.cars.s[i]! - sim.cars.half[i]!;

/** Far enough ahead to keep rolling if the answer is yes. */
export const askAt = (v: number): number => (v * v) / (2 * IDM.brake * 0.8) + v * 0.25 + 6;

/** Is there room behind the last car of a lane, after everyone already promised some? */
export function hasRoom(sim: Sim, i: number, lane: Track): boolean {
  const c = sim.cars;
  if (lane.tail < 0 && lane.incoming <= 0) return true;
  const q = lane.tail;
  const free = q < 0 ? lane.len : c.s[q]! - c.half[q]! + c.v[q]! * 0.5;
  return free >= lane.incoming + c.need(i);
}

const exitOf = (sim: Sim, i: number, conn: Track, o: OutOpt): { lane: Track; exit: Track | null } => {
  if (conn.kind !== ENTRY_T) return { lane: conn.to!, exit: null };
  const exit = ringExitLane(sim.world.nodes[conn.node]!.ring!.arms[o.exitArm]!);
  return { lane: exit.to!, exit };
};

function grant(sim: Sim, i: number, conn: Track, lane: Track, exit: Track | null): void {
  const c = sim.cars;
  c.granted[i] = 1;
  c.outTo[i] = lane;
  c.exitBy[i] = exit;
  lane.incoming += c.need(i);
  conn.occ.push(i);
}

/** Drivers without priority come nearly to a stop before they go; ring entries decide late. */
function askWhen(sim: Sim, i: number, conn: Track): number {
  const v = sim.cars.v[i]!;
  if (conn.kind === ENTRY_T) return RING.ask + v * RING.askTime;
  if (conn.giveWay) return YIELD.stop;
  return askAt(v);
}

/** Ask for the junction. True = the car may drive on. Only the first car of a lane asks. */
export function askWay(sim: Sim, i: number): boolean {
  const c = sim.cars;
  if (c.granted[i]) return true;
  const t = c.track[i]!;
  const o = c.opt[i];
  const conn = o?.conn[t.lane];
  if (!o || !conn) return false;
  const d = toLine(sim, i);
  if (conn.free && conn.node >= 0 && sim.world.nodes[conn.node]!.kind === 'free') return true;
  if (d > askWhen(sim, i, conn)) return false;
  if (c.ticket[i] === 0) c.ticket[i] = sim.time;
  const { lane, exit } = exitOf(sim, i, conn, o);
  if (!hasRoom(sim, i, lane)) return false;
  const n = sim.world.nodes[conn.node]!;
  const ok = conn.free || (n.kind === 'ring' ? ringClear(sim, i, conn, n, d) : turnClear(sim, i, conn, n, d));
  if (ok) {
    grant(sim, i, conn, lane, exit);
    n.lastWay = sim.time;
  }
  return ok;
}

// ---------------------------------------------------------------- crossings

function greenFor(n: NodeRt, t: Track, sim: Sim): boolean {
  return n.light === 0 && n.phases[n.phase]!.some((l) => l.i === t.link) && sim.world.links[t.link] !== undefined;
}

function lightAllows(sim: Sim, i: number, conn: Track, n: NodeRt, d: number): boolean {
  if (n.kind !== 'signal') return true;
  const lane = conn.from!;
  if (greenFor(n, lane, sim)) return true;
  // A driver who waited out the green for a gap turns on the amber.
  const mine = n.phases[n.phase]!.some((l) => l.i === lane.link);
  return mine && n.light === 1 && conn.left && d < SIGNAL.sneak && sim.cars.linkWait[i]! > 1;
}

/** Patience shrinks the gap a driver will take. */
function gapNow(wait: number, gap: number): number {
  const worn = Math.max(0, Math.min(1, (wait - PATIENCE.from) / (PATIENCE.to - PATIENCE.from)));
  return gap * (1 - (1 - PATIENCE.least) * worn);
}

function turnClear(sim: Sim, i: number, conn: Track, n: NodeRt, d: number): boolean {
  const c = sim.cars;
  if (!lightAllows(sim, i, conn, n, d)) return false;
  if (conn.oneByOne && sim.time - n.lastWay < YIELD.oneByOne) return false;
  // Somebody on the bigger road lets a forgotten driver out.
  if (n.kind === 'yield' && conn.giveWay && d < YIELD.stop && sim.time - c.ticket[i]! > YIELD.courtesy) c.courtesy[i] = 1;
  for (const x of conn.conflicts) {
    const occ = x.other.occ;
    for (let k = 0; k < occ.length; k++) {
      const q = occ[k]!;
      if (c.track[q]!.kind === LANE_T || c.s[q]! - c.half[q]! < x.end) return false;
    }
  }
  if (n.kind === 'signal' && conn.left && d < YIELD.stop && Math.min(n.lightFor, sim.time - c.ticket[i]!) > (n.j.control === 'smart' ? SIGNAL.smartCourtesy : SIGNAL.courtesy)) c.courtesy[i] = 1;
  const gap = n.kind === 'signal' ? SIGNAL.leftGap : gapNow(sim.time - c.ticket[i]!, YIELD.gap);
  for (const x of conn.conflicts) if (yieldsTo(sim, i, conn, x.other, n, d, gap)) return false;
  if (conn.left && MOTION_SWITCHES.GAP_ACCEPT && !oncomingGap(sim, i, conn, n, d)) return false;
  return true;
}

/** Seconds of clear oncoming traffic a left turner wants: 3 s real, at the game's pace (src/sim/kinematics.ts). */
export const LEFT_GAP = GAP_S / GAME_PACE;
/** Oncoming: the other movement's lane runs within this cosine of straight at us. */
const ONCOMING_COS = -0.7;
/** Oncoming cars further off than this (seconds) never matter. */
const LOOK_S = 8;

const endHeading = (t: Track): number => { poseAt(t, t.len, POSE); return POSE.h; };
/** The two movements come from lanes facing each other across the junction. */
const oncoming = (a: Track, b: Track): boolean => Math.cos(endHeading(b.from!) - endHeading(a.from!)) < ONCOMING_COS;

/**
 * A left turn across the oncoming lanes: every oncoming car (not only the first of its lane, which `yieldsTo` asks)
 * must be at least LEFT_GAP behind the moment this car reaches the line. Patience shrinks it as it does a yield's.
 */
function oncomingGap(sim: Sim, i: number, conn: Track, n: NodeRt, d: number): boolean {
  const c = sim.cars;
  const mine = Math.max(0, d) / Math.max(20, c.v[i]!);
  const gap = gapNow(sim.time - c.ticket[i]!, LEFT_GAP);
  for (const x of conn.conflicts) {
    const other = x.other, from = other.from!;
    if (other.left || other.prio < conn.prio || !oncoming(conn, other)) continue;
    if (n.kind === 'signal' && !greenFor(n, from, sim)) continue;
    for (let q = from.head; q >= 0; q = c.behind[q]!) {
      if (c.granted[q]) continue;
      const o = c.opt[q];
      if (o && o.conn[from.lane] !== other) continue;
      const theirs = Math.max(0, toLine(sim, q)) / Math.max(14, c.v[q]!);
      if (theirs > mine + LOOK_S) break;
      if (q === from.head && c.courtesy[i]) continue;
      if (theirs < mine + gap) return false;
    }
  }
  return true;
}

/** Does i have to wait for the first car of the other movement's lane? */
function yieldsTo(sim: Sim, i: number, conn: Track, other: Track, n: NodeRt, d: number, gap: number): boolean {
  const c = sim.cars;
  const from = other.from!;
  const q = from.head;
  if (q < 0 || (other.prio < conn.prio && !c.courtesy[q]) || c.granted[q] || c.opt[q]?.conn[from.lane] !== other) return false;
  if (n.kind === 'signal' && !greenFor(n, from, sim)) return false;
  const dq = toLine(sim, q);
  if (other.prio < conn.prio) return dq < YIELD.stop && hasRoom(sim, q, other.to!);
  if (other.prio > conn.prio) {
    if (c.courtesy[i]) return false;
    const mine = Math.max(0, d) / Math.max(20, c.v[i]!);
    const theirs = dq / Math.max(14, c.v[q]!);
    return theirs < mine + gap && hasRoom(sim, q, other.to!);
  }
  // Same priority: straight-ahead traffic goes before an oncoming left turner (who waits for its gap, oncomingGap).
  if (MOTION_SWITCHES.GAP_ACCEPT && conn.left !== other.left && oncoming(conn, other)) return conn.left;
  return dq < YIELD.near && c.ticket[q]! > 0 && (c.ticket[q]! < c.ticket[i]! || (c.ticket[q] === c.ticket[i] && q < i)) && hasRoom(sim, q, other.to!);
}

// ---------------------------------------------------------------- roundabouts

/** Cars on the ring or promised a place: a full ring would lock. */
function ringLoad(n: NodeRt): number {
  let sum = 0;
  for (const a of n.ring!.arms) {
    sum += a.arc.count + a.span.count;
    for (const e of a.entries) sum += e.occ.length;
  }
  return sum;
}

/** A driver who has just come lets in one who has waited far too long at another entry. */
function waitsForStarved(sim: Sim, i: number, n: NodeRt): boolean {
  const c = sim.cars;
  const enough = Math.max(RING.starving, sim.time - c.ticket[i]! + RING.fresh);
  for (const a of n.ring!.arms) {
    for (const e of a.entries) {
      const q = e.from!.head;
      if (q < 0 || q === i || c.granted[q] || c.ticket[q] === 0 || sim.time - c.ticket[q]! < enough) continue;
      const o = c.opt[q];
      if (o && o.exitArm >= 0 && o.conn[e.from!.lane] === e && hasRoom(sim, q, ringExitLane(n.ring!.arms[o.exitArm]!).to!)) return true;
    }
  }
  return false;
}

/** Nothing on the ring near enough to be cut up, going back RING.back px from the entry. */
function ringClear(sim: Sim, i: number, conn: Track, n: NodeRt, d: number): boolean {
  const c = sim.cars;
  const arms = n.ring!.arms;
  const arm = arms[conn.arm]!;
  if (ringLoad(n) >= n.ring!.max || waitsForStarved(sim, i, n)) return false;
  for (const e of arm.entries) if (e !== conn && e.occ.length > 0) return false;
  const tail = arm.arc.tail;
  if (tail >= 0 && c.s[tail]! - c.half[tail]! + c.v[tail]! * 0.6 < c.len[i]! * 0.7) return false;
  const gap = gapNow(sim.time - c.ticket[i]!, RING.gap);
  const mine = (Math.max(0, d) + conn.len) / 30;
  let back = 0;
  for (let k = 0; k < arms.length && back < RING.back; k++) {
    const at = arms[(conn.arm - k + arms.length) % arms.length]!;
    if (k > 0) {
      if (anyBlocks(sim, at.arc, back, k, arms.length, mine, gap)) return false;
      back += at.arc.len;
      for (const e of at.entries) if (entering(sim, e, back, k, arms.length, mine, gap)) return false;
    }
    if (anyBlocks(sim, at.span, back, k, arms.length, mine, gap)) return false;
    back += at.span.len;
  }
  return true;
}

/** The same for cars already on their way in at an earlier arm. */
function entering(sim: Sim, e: Track, back: number, hops: number, arms: number, mine: number, gap: number): boolean {
  const c = sim.cars;
  for (let k = 0; k < e.occ.length; k++) {
    const q = e.occ[k]!;
    const exit = c.exitBy[q];
    const leavesIn = exit ? (exit.arm - e.arm + arms) % arms || arms : arms;
    const d = c.track[q] === e ? e.len - c.s[q]! : e.len + c.track[q]!.len - c.s[q]!;
    if (leavesIn > hops && blocks(sim, q, back + d, mine, gap)) return true;
  }
  return false;
}

/** Does a car on this piece of ring, `back` px + its distance to the piece's end before our entry, get in the way? */
function anyBlocks(sim: Sim, t: Track, back: number, hops: number, arms: number, mine: number, gap: number): boolean {
  const c = sim.cars;
  for (let q = t.head; q >= 0; q = c.behind[q]!) {
    const exit = c.exitBy[q];
    const leavesIn = exit ? (exit.arm - t.arm + arms) % arms || arms : arms;
    if (leavesIn > hops && blocks(sim, q, back + t.len - c.s[q]!, mine, gap)) return true;
  }
  return false;
}

/** A ring car `dq` px before our entry: would it reach it close to when we do? */
function blocks(sim: Sim, q: number, dq: number, mine: number, gap: number): boolean {
  const c = sim.cars;
  const v = Math.max(RING.assume, c.v[q]!);
  return (dq - c.half[q]!) / v < mine + gap * RING.ahead && (dq + c.half[q]!) / v > mine - gap * RING.behind;
}
