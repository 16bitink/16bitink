/**
 * The one collision rule for every played move (docs/inkroad-vehicle-model.md "Phase B, round 3"): every move a
 * drawn car plays off the sim's lanes (parking in and out, a building's mouth, a stop on the road, a turn round on
 * the road) is put here with its frames and the sim time it starts. A new move is checked against all of them over
 * time, body box against body box, frame by frame: one that would touch any waits, is planned again, or goes another
 * way. A move can hold its last pose (a car waiting at the lane edge) until it is replaced. Pure but for its list.
 */
import { bodiesOverlap, type Body } from './vehicleSize';
import { PLAY_DT, playedAt, type MutablePose, type Played } from './vehicle/played';

export interface Sweep {
  readonly m: Played;
  /** Sim time of the first frame. */
  readonly t0: number;
  readonly len: number;
  readonly wid: number;
  /** It stands at its last pose after it ends, until it is replaced or dropped. */
  readonly hold: boolean;
  /** Its frames' bounding box, grown by half its diagonal. */
  readonly box: readonly [number, number, number, number];
  /** The move it will make after it has waited (a car at the lane edge: its way into the lane), reserved whatever the time. */
  readonly next?: Played;
  readonly nextBox?: readonly [number, number, number, number];
  /** Moving cars keep out of where it will still pass (a turn round or a join on the road), not only where it is. */
  readonly ahead: boolean;
}

/** Seconds a held last pose stays at most (a car that never got its gap is dropped by the city long before). */
const HOLD_MAX = 900;
/** Frames between two checks of a move (1/20 s), and px of clearance the bodies keep (sampling and paint). */
const EVERY = 3;
export const CLEAR = 0.3;

function boxOf(m: Played, len: number, wid: number): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < m.n; k++) {
    const x = m.frames[k * 3]!, y = m.frames[k * 3 + 1]!;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const r = Math.hypot(len, wid) / 2 + CLEAR;
  return [x0 - r, y0 - r, x1 + r, y1 + r];
}

const meet = (a: readonly number[], b: readonly number[]): boolean => a[0]! <= b[2]! && b[0]! <= a[2]! && a[1]! <= b[3]! && b[1]! <= a[3]!;

const AT: MutablePose = { x: 0, y: 0, a: 0 };
const AT2: MutablePose = { x: 0, y: 0, a: 0 };

/** Where a sweep's body is at sim time t (its first pose before it starts), or null once it is over. */
function bodyAt(w: Sweep, t: number, out: MutablePose): Body | null {
  const u = t - w.t0;
  if (u > w.m.seconds && (!w.hold || u > w.m.seconds + HOLD_MAX)) return null;
  playedAt(w.m, u, out);
  return { x: out.x, y: out.y, a: out.a, len: w.len, wid: w.wid };
}

export class Sweeps {
  private readonly list = new Map<number, Sweep>();

  /** Puts (or replaces) car `id`'s move: frames from sim time t0. */
  put(id: number, m: Played, t0: number, len: number, wid: number, hold: boolean, next?: Played, ahead = false): void {
    this.list.set(id, { m, t0, len, wid, hold, ahead, box: boxOf(m, len, wid), ...(next ? { next, nextBox: boxOf(next, len, wid) } : {}) });
  }

  drop(id: number): void { this.list.delete(id); }
  clear(): void { this.list.clear(); }

  /** Forgets the moves that are over. */
  prune(now: number): void {
    for (const [id, w] of this.list) if (now - w.t0 > w.m.seconds + (w.hold ? HOLD_MAX : 0)) this.list.delete(id);
  }

  /** Bodies of the moves under way round a box at time t (for drawing and for the stops on the road). */
  bodiesAt(t: number, box: readonly [number, number, number, number], self = -1): Body[] {
    const out: Body[] = [];
    for (const [id, w] of this.list) {
      if (id === self || !meet(w.box, box)) continue;
      const b = bodyAt(w, t, { x: 0, y: 0, a: 0 });
      if (b) out.push(b);
    }
    return out;
  }

  /**
   * Every move's body at time t and where it will still be (every FUTURE_EVERY frames of the rest of its move), with
   * its car's id, whether it only stands at its end (waiting) and whether the pose is still to come.
   */
  bodiesNow(t: number): SweepBody[] {
    const out: SweepBody[] = [];
    for (const [id, w] of this.list) {
      const b = bodyAt(w, t, { x: 0, y: 0, a: 0 });
      if (!b) continue;
      const u = t - w.t0;
      out.push({ ...b, id, held: u > w.m.seconds, future: false });
      if (!w.ahead) continue;
      for (let k = Math.max(0, Math.ceil(u / PLAY_DT)) + FUTURE_EVERY; k < w.m.n; k += FUTURE_EVERY) {
        out.push({ x: w.m.frames[k * 3]!, y: w.m.frames[k * 3 + 1]!, a: w.m.frames[k * 3 + 2]!, len: w.len, wid: w.wid, id, held: false, future: true });
      }
    }
    return out;
  }

  /** Is any pose of `m` on another waiting car's reserved way into the lane? That car's id, or -1. */
  private reserved(m: Played, box: readonly number[], len: number, wid: number, self: number): number {
    for (const [id, w] of this.list) {
      if (id === self || !w.next || !w.nextBox || !meet(w.nextBox, box)) continue;
      const nb = w.nextBox, pad = (len + wid) / 2;
      for (let k = 0; k < m.n; k += EVERY) {
        const mx = m.frames[k * 3]!, my = m.frames[k * 3 + 1]!;
        if (mx < nb[0]! - pad || mx > nb[2]! + pad || my < nb[1]! - pad || my > nb[3]! + pad) continue;
        const me: Body = { x: mx, y: my, a: m.frames[k * 3 + 2]!, len, wid };
        for (let j = 0; j < w.next.n; j += RESERVE_EVERY) {
          const o: Body = { x: w.next.frames[j * 3]!, y: w.next.frames[j * 3 + 1]!, a: w.next.frames[j * 3 + 2]!, len: w.len + 2 * CLEAR, wid: w.wid + 2 * CLEAR };
          if (Math.abs(o.x - me.x) < 30 && Math.abs(o.y - me.y) < 30 && bodiesOverlap(me, o)) return id;
        }
      }
    }
    return -1;
  }

  /**
   * The first move (its car's id) whose body touches `m` played from sim time t0, frame by frame; -1: none. With
   * `hold`, m's last pose is checked on while any other move still runs. `reserve`: the ways waiting cars will take
   * count too (a move that will wait itself must not stand in them; one that only passes is checked against them when they go).
   */
  hit(m: Played, t0: number, len: number, wid: number, self: number, hold = false, reserve = true): number {
    const box = boxOf(m, len, wid);
    const ahead = reserve ? this.reserved(m, box, len, wid, self) : -1;
    if (ahead >= 0) return ahead;
    const near = [...this.list].filter(([id, w]) => id !== self && meet(w.box, box));
    if (near.length === 0) return -1;
    let until = t0 + m.seconds;
    if (hold) for (const [, w] of near) until = Math.max(until, w.t0 + w.m.seconds);
    for (let t = t0; t <= until + 1e-9; t += EVERY * PLAY_DT) {
      playedAt(m, t - t0, AT);
      const me: Body = { x: AT.x, y: AT.y, a: AT.a, len, wid };
      for (const [id, w] of near) {
        const o = bodyAt(w, t, AT2);
        if (o && bodiesOverlap(me, { ...o, len: o.len + 2 * CLEAR, wid: o.wid + 2 * CLEAR })) return id;
      }
    }
    return -1;
  }
}

/** A move's body now or still to come. */
export interface SweepBody extends Body { readonly id: number; readonly held: boolean; readonly future: boolean }
/** Frames between two poses still to come that moving cars keep out of. */
const FUTURE_EVERY = 6;

/** Frames between two poses of a reserved way checked. */
const RESERVE_EVERY = 6;

/** A played move that stands `s` seconds at its first pose before it plays. */
export function delayed(m: Played, s: number): Played {
  const k = Math.round(s / PLAY_DT);
  if (k <= 0) return m;
  const frames = new Float64Array((k + m.n) * 3);
  for (let i = 0; i < k; i++) frames.set(m.frames.subarray(0, 3), i * 3);
  frames.set(m.frames, k * 3);
  return { ...m, frames, n: k + m.n, seconds: m.seconds + k * PLAY_DT };
}
