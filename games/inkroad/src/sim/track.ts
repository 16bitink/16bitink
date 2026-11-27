/** A track: one line cars follow (a lane, a turn, a piece of ring) and the queue of cars on it. */
import { angleDiff, resample, vertexHeadings } from './geom';
import { SAMPLE } from './tune';
import type { Pt } from './types';

export const LANE_T = 0, TURN_T = 1, ENTRY_T = 2, ARC_T = 3, SPAN_T = 4, EXIT_T = 5;
export type TrackKind = 0 | 1 | 2 | 3 | 4 | 5;

export interface Conflict {
  readonly other: Track;
  /** Where on the other track the crossing ends: a car whose tail is past it is out of the way. */
  readonly end: number;
}

export class Track {
  id = -1;
  readonly key: string;
  readonly kind: TrackKind;
  readonly len: number;
  readonly n: number;
  readonly inv: number;
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  readonly hs: Float32Array;
  readonly zs: Float32Array;
  vmax: number;
  /** Speed cap at each sample from the track's own curves (src/sim/trackCaps.ts), or null if it has none under vmax. */
  caps: Float32Array | null = null;
  /** Index of the link (lanes only) and lane number. */
  link = -1;
  lane = 0;
  /** Index of the node (everything but lanes). */
  node = -1;
  /** Ring: which arm this piece belongs to. */
  arm = -1;
  to: Track | null = null;
  from: Track | null = null;
  // queue, front (largest s) to back
  head = -1;
  tail = -1;
  count = 0;
  /** Pixels promised to cars already in the junction before this lane. */
  incoming = 0;
  lastOut = -1;
  lastOutUid = 0;
  /** Turns and entries: cars granted or on it. */
  occ: number[] = [];
  conflicts: Conflict[] = [];
  prio = 0;
  left = false;
  /** Yield junctions: has to all but stop first. */
  giveWay = false;
  /** Equal roads: drivers take turns, one at a time. */
  oneByOne = false;
  /** Tracks that end where this one ends and must zip together with it. */
  merge: Track[] = [];
  /** Right of way can be taken without asking (bends, ramps, slips). */
  free = false;
  /** Turning round at a dead end (src/sim/parkPaths.ts turnRound): one car at a time; a three-point turn reverses on it (`hs` is the body's heading). */
  turnRound: 'u' | 'three' | null = null;
  /** Px along a three-point turn where its gear changes: a car stops there before it backs up or sets off again. */
  cusps: readonly number[] = [];

  /** `ends.step`: px between the track's points (SAMPLE by default; finer for a walking-pace turn-round). */
  constructor(key: string, kind: TrackKind, line: readonly Pt[], vmax: number, ends: { h0?: number; h1?: number; z?: (t: number) => number; step?: number } = {}) {
    this.key = key;
    this.kind = kind;
    this.vmax = vmax;
    const pts = resample(line, ends.step ?? SAMPLE);
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    this.len = Math.max(len, 0.5);
    this.n = pts.length - 1;
    this.inv = this.n / this.len;
    this.xs = Float32Array.from(pts, (p) => p.x);
    this.ys = Float32Array.from(pts, (p) => p.y);
    const raw = vertexHeadings(pts);
    if (ends.h0 !== undefined) raw[0] = ends.h0;
    if (ends.h1 !== undefined) raw[raw.length - 1] = ends.h1;
    const hs = new Float32Array(raw.length);
    raw.forEach((h, i) => { hs[i] = i === 0 ? h : hs[i - 1]! + angleDiff(hs[i - 1]!, h); });
    this.hs = hs;
    this.zs = Float32Array.from(pts, (_, i) => (ends.z ? ends.z(i / this.n) : 0));
  }

  get h0(): number { return this.hs[0]!; }
  get h1(): number { return this.hs[this.n]!; }
  start(): Pt { return { x: this.xs[0]!, y: this.ys[0]! }; }
  end(): Pt { return { x: this.xs[this.n]!, y: this.ys[this.n]! }; }
  points(): Pt[] { return Array.from(this.xs, (x, i) => ({ x, y: this.ys[i]! })); }
}

export interface Pose { x: number; y: number; h: number; z: number }

/** Position at s, into `out` (no allocation). */
export function poseAt(t: Track, s: number, out: Pose): void {
  const u = Math.max(0, Math.min(t.n, s * t.inv));
  const i = Math.min(t.n - 1, u | 0), f = u - i;
  out.x = t.xs[i]! + (t.xs[i + 1]! - t.xs[i]!) * f;
  out.y = t.ys[i]! + (t.ys[i + 1]! - t.ys[i]!) * f;
  out.h = t.hs[i]! + (t.hs[i + 1]! - t.hs[i]!) * f;
  out.z = t.zs[i]! + (t.zs[i + 1]! - t.zs[i]!) * f;
}

/** Nearest point of a track to (x, y): s and distance. */
export function nearest(t: Track, x: number, y: number): { s: number; d: number; h: number; z: number } {
  let bi = 0, bd = Infinity;
  for (let i = 0; i <= t.n; i++) {
    const d = (t.xs[i]! - x) ** 2 + (t.ys[i]! - y) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  const i = Math.min(bi, t.n - 1) === bi ? bi : t.n - 1;
  const ax = t.xs[i]!, ay = t.ys[i]!, bx = t.xs[i + 1]!, by = t.ys[i + 1]!;
  const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
  let f = l2 > 0 ? ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2 : 0;
  if (i === bi && f < 0 && i > 0) f = Math.max(-1, f);
  f = Math.max(i === 0 ? 0 : -1, Math.min(1, f));
  const s = Math.max(0, Math.min(t.len, (i + f) / t.inv));
  const px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
  return { s, d: Math.hypot(px - x, py - y), h: t.hs[i]!, z: t.zs[i]! };
}

/** Scratch pose for callers outside the hot loop. */
export const POSE_ZERO: Pose = { x: 0, y: 0, h: 0, z: 0 };
