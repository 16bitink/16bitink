import type { CityEvent, MovePlay } from '../../sim/types';
import { playedAt, type MutablePose, type Played } from '../../sim/vehicle/played';
import { clamp, smooth } from '../geom';

/**
 * The pure half of the manoeuvre layer (no Phaser): which cars are turning into or out of their spaces, and where
 * each is drawn this frame. The city says `park in` the moment a car arrives (it is already listed in its space,
 * which stays hidden) or `park out` when it sets off from its space, and hands over the move the vehicle model
 * played (src/city/movePlan.ts): this draws those frames at the sim's clock, so what is drawn is what the city timed
 * and every frame keeps the vehicle's limits. `src/render/cars/manoeuvres.ts` dresses the pictures; the motion
 * tests drive this directly.
 */
type ParkEvent = Extract<CityEvent, { t: 'park' }>;
type GoEvent = Extract<CityEvent, { t: 'parkGo' }>;

/** The parked-car layer's hold on a car's picture while the move draws it. */
export interface Places {
  hold(uid: number): void;
  unhold(uid: number): void;
}

/** More than a city ever moves at once; past it a move is skipped. */
const MAX_ACTIVE = 1024;
/** A move into a mouth starts fading this far through. */
const FADE_FROM = 0.45;
const MAX_BLINKERS = 64;
/** Seconds a pull-out stands at its end in the lane (one sim step) before the moving car takes over. */
const HANDOFF = 0.1;

/** move: the played move (in), or the part to the lane edge (out); wait: at the edge for its `parkGo`; go: edge into the lane. */
export type Phase = 'move' | 'wait' | 'go';

export interface Move<T> {
  /** The renderer's picture (null in tests). */
  readonly tag: T;
  uid: number;
  dir: 'in' | 'out';
  kind: string;
  tint: number;
  /** The played parts: 'in' plays a; 'out' plays a to the edge and b into the lane. */
  a: Played;
  b: Played | null;
  fade: boolean;
  /** Seconds into the current phase (below zero: standing first, waiting for a gap). */
  at: number;
  phase: Phase;
  /** A `parkGo` that came while the car was still on its way to the edge. */
  go: boolean;
  /** The pose drawn this frame. */
  px: number;
  py: number;
  pa: number;
  alpha: number;
  blink: -1 | 0 | 1;
  /** Share of the whole move done (0..1), and where it ends (for the lab's checks). */
  done: number;
  endX: number;
  endY: number;
}

export interface Blinker { x: number; y: number; a: number; len: number; wid: number; side: -1 | 0 | 1 }

const STILL: Played = { frames: new Float64Array(3), n: 1, seconds: 0, end: { x: 0, y: 0, th: 0, u: 0, dir: 1, delta: 0, a: 0 }, fits: true, word: '' };

export class ManoeuvreCore<T> {
  private readonly pool: Move<T>[] = [];
  private live = 0;
  private readonly pose: MutablePose = { x: 0, y: 0, a: 0 };
  /** Fed to the lights: the blinkers of the cars moving now. */
  readonly blinkers: Blinker[] = [];
  private blinkCount = 0;

  constructor(private readonly places: Places, private readonly make: () => T, private readonly onEnd: (m: Move<T>) => void = () => {}) {}

  get active(): number { return this.live; }
  /** Move i of the active ones (0..active-1). */
  at(i: number): Move<T> { return this.pool[i]!; }

  /** A city event. One without a played move is skipped. */
  start(e: ParkEvent): void {
    const play: MovePlay | undefined = e.play;
    if (!play || play.a.n < 1) return;
    this.drop(e.car);
    if (this.live >= MAX_ACTIVE) return;
    const m = this.pool[this.live] ?? this.grow();
    m.uid = e.car;
    m.dir = e.dir;
    m.kind = e.kind;
    m.tint = e.tint;
    m.a = play.a;
    m.b = play.b ?? null;
    m.fade = play.fade === true;
    m.phase = 'move';
    m.go = false;
    // A car waiting for a gap across the road (or double-parked a while) stands first: its clock starts below zero.
    m.at = (e.dir === 'in' ? -Math.max(0, e.wait ?? 0) : 0) + Math.max(0, e.age ?? 0);
    const last = (m.b ?? m.a);
    const o = (last.n - 1) * 3;
    m.endX = last.frames[o]!; m.endY = last.frames[o + 1]!;
    this.live++;
    if (e.dir === 'in' && e.slot >= 0) this.places.hold(e.car);
    this.draw(m);
  }

  /** The car at the lane edge is released: it plays its way into the lane, then drives off as a moving car. */
  go(e: GoEvent): void {
    const m = this.find(e.car);
    if (!m || m.dir !== 'out') return;
    if (m.phase === 'move') { m.go = true; return; }
    this.begin(m);
    m.at = Math.max(0, e.age ?? 0);
  }

  /** A day's end (or the weekend): nobody is left waiting at an edge. */
  dropWaiting(): void {
    for (let i = this.live - 1; i >= 0; i--) if (this.pool[i]!.phase === 'wait') this.finish(i);
  }

  /** `seconds`: sim seconds since last frame (zero while paused). */
  update(seconds: number): void {
    this.blinkCount = 0;
    for (let i = this.live - 1; i >= 0; i--) {
      const m = this.pool[i]!;
      if (m.phase !== 'wait') m.at += seconds;
      if (m.phase !== 'wait' && m.at >= this.length(m) && !this.next(m)) { this.finish(i); continue; }
      this.draw(m);
    }
    this.blinkers.length = this.blinkCount;
  }

  clear(): void {
    for (let i = this.live - 1; i >= 0; i--) this.finish(i);
    this.blinkers.length = 0;
  }

  private grow(): Move<T> {
    const m: Move<T> = { tag: this.make(), uid: 0, dir: 'in', kind: 'car', tint: 0, a: STILL, b: null, fade: false, at: 0, phase: 'move', go: false, px: 0, py: 0, pa: 0, alpha: 1, blink: 0, done: 0, endX: 0, endY: 0 };
    this.pool.push(m);
    return m;
  }

  /** The played part of the current phase. */
  private part(m: Move<T>): Played { return m.phase === 'go' ? m.b ?? STILL : m.a; }
  /** The 'go' part stands at its end one sim step more: the sim lets the moving car go on the step after its hold. */
  private length(m: Move<T>): number { return this.part(m).seconds + (m.phase === 'go' ? HANDOFF : 0); }

  private find(uid: number): Move<T> | undefined {
    for (let i = 0; i < this.live; i++) if (this.pool[i]!.uid === uid) return this.pool[i];
    return undefined;
  }

  private drop(uid: number): void {
    for (let i = 0; i < this.live; i++) if (this.pool[i]!.uid === uid) { this.finish(i); return; }
  }

  /** The 'out' move ends at the edge, where the car waits (or goes on at once if its release already came). */
  private next(m: Move<T>): boolean {
    if (m.phase !== 'move' || m.dir !== 'out') return false;
    if (m.go) { this.begin(m); return true; }
    m.phase = 'wait';
    m.at = m.a.seconds;
    return true;
  }

  private begin(m: Move<T>): void {
    m.phase = 'go';
    m.at = 0;
    m.go = false;
  }

  private finish(i: number): void {
    const m = this.pool[i]!;
    this.onEnd(m);
    if (m.dir === 'in') this.places.unhold(m.uid);
    const last = this.live - 1;
    if (i !== last) { this.pool[i] = this.pool[last]!; this.pool[last] = m; }
    this.live--;
  }

  private draw(m: Move<T>): void {
    const part = this.part(m);
    const s = m.phase === 'wait' ? part.seconds : clamp(m.at, 0, part.seconds);
    const q = playedAt(part, s, this.pose);
    m.px = q.x; m.py = q.y; m.pa = q.a;
    const total = m.a.seconds + (m.b?.seconds ?? 0);
    const so = m.phase === 'go' ? m.a.seconds + s : s;
    m.done = total > 0 ? so / total : 1;
    // A mouth: fading in as it comes out, out as it goes in.
    const k = m.dir === 'in' ? m.done : 1 - m.done;
    m.alpha = m.fade ? 1 - smooth((k - FADE_FROM) / (1 - FADE_FROM)) : 1;
    const moving = m.phase !== 'wait' && m.at > 0 && m.at < part.seconds;
    const side = (m.endX - q.x) * -Math.sin(q.a) + (m.endY - q.y) * Math.cos(q.a);
    m.blink = moving || m.phase === 'wait' ? (side >= 0 ? 1 : -1) : 0;
    if (m.blink === 0 || this.blinkCount >= MAX_BLINKERS) return;
    const b = (this.blinkers[this.blinkCount] ??= { x: 0, y: 0, a: 0, len: 14, wid: 7, side: 0 });
    b.x = q.x; b.y = q.y; b.a = q.a;
    b.side = m.blink;
    this.blinkCount++;
  }
}
