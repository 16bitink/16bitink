import Phaser from 'phaser';
import type { CityEvent } from '../../sim/types';
import { clamp } from '../geom';
import { dressCar } from './carDress';
import { bodiesOverlap, sizeOf } from './carSize';
import type { VehicleKind } from '../../sim/types';
import { pathPose, type Pose, type Step } from './manoeuvrePath';
import type { CarLayer } from './carLayer';
import type { ParkedCars, Placed } from './parkedCars';

/**
 * Cars turning into and out of their spaces. The city says `park in` the moment a car arrives (it is
 * already in its slot, which stays hidden) or `park out` when its pull-out succeeds (the car is gone
 * from the list); this draws the move in between, over the sim seconds the city holds the lane.
 * Pooled; nothing is allocated per frame.
 */
type ParkEvent = Extract<CityEvent, { t: 'park' }>;
type GoEvent = Extract<CityEvent, { t: 'parkGo' }>;

/** More than a city ever moves at once; past it a move is skipped (and the car would jump). */
const MAX_ACTIVE = 1024;
/** A car park's mouth: the point it drives to is this far inside the edge. */
const MOUTH_IN = 5;
/** An 'in' that names no move time still takes this long. */
const MIN_MOVE = 0.6;
const MIN_PHASE = 0.05;
/** Two moving cars never show on top of each other: the later one holds back along its path, this much of its progress at a time. */
const BACK_OFF = 0.04;
/** A car held back catches up at most this many times its normal pace, so it never leaps forward when let go. */
const CATCH_UP = 1.6;
/** Sim seconds a held-back car may run late before its move is called over. */
const HELD_MAX = 3;
/** Bodies may touch this much (px) before they count as overlapping. */
const TOUCH = 0.4;

/** move: slot and lane edge by the parking path; wait: standing at the edge for its `parkGo`; go: edge into the lane. */
type Phase = 'move' | 'wait' | 'go';

interface Active {
  img: Phaser.GameObjects.Image;
  on: boolean;
  uid: number;
  dir: 'in' | 'out';
  kind: string;
  tint: number;
  mode: Placed['mode'];
  via: Placed['via'];
  seconds: number;
  at: number;
  from: Pose;
  to: Pose;
  phase: Phase;
  /** Share of the whole move spent in the lane; the rest is off the road. */
  h: number;
  /** A `parkGo` that came while the car was still on its way to the edge. */
  go: { seconds: number; x: number; y: number; a: number } | null;
  /** The pose last drawn, and the frame it was drawn in (to keep two moving cars apart). */
  px: number;
  py: number;
  pa: number;
  drawn: number;
  /** Share of this phase last drawn (a held-back car is behind its clock). */
  shown: number;
}

export interface Blinker { x: number; y: number; a: number; len: number; wid: number; side: -1 | 0 | 1 }

const blank = (): Pose => ({ x: 0, y: 0, a: 0 });

export class Manoeuvres {
  private readonly pool: Active[] = [];
  private live = 0;
  private readonly step: Step = { x: 0, y: 0, a: 0, alpha: 1, blink: 0 };
  /** Fed to the lights: the blinkers of the cars moving now. */
  readonly blinkers: Blinker[] = [];
  private blinkCount = 0;
  private frame = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly cars: CarLayer, private readonly parked: ParkedCars, private readonly depth: number) {}

  get active(): number { return this.live; }

  /** A city event. Anything that cannot be laid out is skipped quietly. */
  start(e: ParkEvent): void {
    if (!(e.seconds >= 0)) return;
    // slot -1: a car with no space drawn turns into (or comes out of) a building's entrance.
    const placed = e.slot < 0 ? this.parked.door(e.key) : this.parked.poseOf(e.car);
    if (!placed) return;
    this.drop(e.car);
    if (this.live >= MAX_ACTIVE) return;
    const slot = this.pool[this.live] ?? this.make();
    if (!this.aim(slot, e, placed)) return;
    slot.on = true;
    slot.uid = e.car;
    slot.dir = e.dir;
    slot.kind = e.kind;
    slot.tint = e.tint;
    slot.mode = placed.mode;
    slot.via = placed.via;
    slot.phase = 'move';
    slot.go = null;
    slot.at = 0;
    slot.shown = 0;
    slot.drawn = -1;
    const move = e.move ?? e.seconds;
    slot.h = move > 0 ? Math.min(1, e.seconds / move) : 0.5;
    slot.seconds = e.dir === 'in' ? (move > 0 ? move : MIN_MOVE) : Math.max(MIN_PHASE, move - e.seconds);
    this.live++;
    if (e.dir === 'in' && e.slot >= 0) this.parked.hold(e.car);
    this.draw(slot, 0);
  }

  /** The car at the lane edge is released: it moves into the lane, then drives off as a moving car. */
  go(e: GoEvent): void {
    const m = this.find(e.car);
    if (!m || m.dir !== 'out' || !(e.seconds >= 0)) return;
    if (m.phase === 'move') { m.go = { seconds: e.seconds, x: e.lane.x, y: e.lane.y, a: e.lane.a }; return; }
    this.begin(m, e.lane, e.seconds);
  }

  /** A day's end (or the weekend): nobody is left waiting at an edge. */
  dropWaiting(): void {
    for (let i = this.live - 1; i >= 0; i--) if (this.pool[i]!.phase === 'wait') this.finish(i);
  }

  /** `seconds`: sim seconds since last frame (zero while paused). */
  update(seconds: number): void {
    this.blinkCount = 0;
    this.frame++;
    for (let i = this.live - 1; i >= 0; i--) {
      const m = this.pool[i]!;
      if (m.phase === 'wait') { this.draw(m, 0); continue; }
      m.at += seconds;
      // Over only once the drawn car got there too (a held-back one finishes its path first).
      if (m.at >= m.seconds && (m.shown >= 1 || m.at >= m.seconds + HELD_MAX) && !this.next(m)) { this.finish(i); continue; }
      this.draw(m, seconds);
    }
    this.blinkers.length = this.blinkCount;
  }

  clear(): void {
    for (let i = this.live - 1; i >= 0; i--) this.finish(i);
    this.blinkers.length = 0;
  }

  private make(): Active {
    const img = new Phaser.GameObjects.Image(this.scene, 0, 0, '__DEFAULT').setVisible(false).setDepth(this.depth);
    this.scene.add.existing(img);
    const m: Active = { img, on: false, uid: 0, dir: 'in', kind: 'car', tint: 0, mode: 'parallel', via: undefined, seconds: 1, at: 0, from: blank(), to: blank(), phase: 'move', h: 0.5, go: null, px: 0, py: 0, pa: 0, drawn: -1, shown: 0 };
    this.pool.push(m);
    return m;
  }

  /** Sets the two ends: the lane pose and the slot pose (a car park's mouth when it has no bays). */
  private aim(m: Active, e: ParkEvent, p: Placed): boolean {
    const lane = e.lane;
    if (!Number.isFinite(lane.x) || !Number.isFinite(lane.y)) return false;
    m.from.x = lane.x; m.from.y = lane.y; m.from.a = lane.a;
    if (p.mode !== 'enter') { m.to.x = p.x; m.to.y = p.y; m.to.a = p.a; return true; }
    if (!p.rect) return false;
    const r = p.rect;
    const ex = clamp(lane.x, r.x, r.x + r.w), ey = clamp(lane.y, r.y, r.y + r.h);
    const heading = Math.atan2(r.y + r.h / 2 - ey, r.x + r.w / 2 - ex);
    m.to.x = ex + Math.cos(heading) * MOUTH_IN; m.to.y = ey + Math.sin(heading) * MOUTH_IN; m.to.a = heading;
    return true;
  }

  private find(uid: number): Active | undefined {
    for (let i = 0; i < this.live; i++) if (this.pool[i]!.uid === uid) return this.pool[i];
    return undefined;
  }

  private drop(uid: number): void {
    for (let i = 0; i < this.live; i++) if (this.pool[i]!.uid === uid) { this.finish(i); return; }
  }

  /** The 'out' move ends at the edge, where the car waits (or goes at once if its release already came). */
  private next(m: Active): boolean {
    if (m.phase !== 'move' || m.dir !== 'out') return false;
    if (m.go) { this.begin(m, m.go, m.go.seconds); m.go = null; return m.seconds > 0; }
    m.phase = 'wait';
    m.at = 0;
    m.shown = 0;
    return true;
  }

  /** From the edge into the lane pose `lane` over `seconds` (zero: the car is there at once). */
  private begin(m: Active, lane: Pose, seconds: number): void {
    m.from.x = lane.x; m.from.y = lane.y; m.from.a = lane.a;
    m.phase = 'go';
    m.at = 0;
    m.shown = 0;
    m.seconds = seconds;
  }

  private finish(i: number): void {
    const m = this.pool[i]!;
    m.on = false;
    m.img.setVisible(false);
    if (m.dir === 'in') this.parked.unhold(m.uid);
    const last = this.live - 1;
    if (i !== last) { this.pool[i] = this.pool[last]!; this.pool[last] = m; }
    this.live--;
  }

  /** Progress along the whole path at share `k` of the current phase. 'out': slot to the lane edge (the off-road share of the path, backwards), wait there, then edge to lane. */
  private progress(m: Active, k: number): number {
    return m.dir === 'in' ? k : m.phase === 'move' ? 1 - k * (1 - m.h) : m.phase === 'wait' ? m.h : m.h * (1 - k);
  }

  /** Is the pose in `s` on top of another moving car drawn this frame? */
  private blocked(m: Active, s: Step): boolean {
    const me = { x: s.x, y: s.y, a: s.a, ...sizeOf(m.kind as VehicleKind) };
    for (let i = 0; i < this.live; i++) {
      const n = this.pool[i]!;
      if (n === m || n.drawn !== this.frame) continue;
      if (bodiesOverlap(me, { x: n.px, y: n.py, a: n.pa, ...sizeOf(n.kind as VehicleKind) }, TOUCH)) return true;
    }
    return false;
  }

  private draw(m: Active, seconds: number): void {
    let k = Math.min(clamp(m.at / m.seconds, 0, 1), m.shown + (CATCH_UP * seconds) / m.seconds);
    let s = pathPose(m.mode, m.from, m.to, this.progress(m, k), this.step, m.h, m.via);
    // Draw-time safeguard (the engine may let neighbours move at once): hold back along the path until clear.
    if (m.phase !== 'wait') {
      while (k > 0 && this.blocked(m, s)) {
        k = Math.max(0, k - BACK_OFF);
        s = pathPose(m.mode, m.from, m.to, this.progress(m, k), this.step, m.h, m.via);
      }
    }
    m.px = s.x; m.py = s.y; m.pa = s.a; m.drawn = this.frame;
    if (m.phase !== 'wait') m.shown = k;
    dressCar(m.img, this.cars, m.kind, m.tint, s.x, s.y, s.a);
    m.img.setAlpha(s.alpha);
    if (s.blink === 0 || this.blinkCount >= 64) return;
    const b = (this.blinkers[this.blinkCount] ??= { x: 0, y: 0, a: 0, len: 14, wid: 7, side: 0 });
    b.x = s.x; b.y = s.y; b.a = s.a;
    // Backing up swings the nose the other way; a car pulling out signals to the lane.
    b.side = m.dir === 'in' ? s.blink : (-s.blink as -1 | 1);
    this.blinkCount++;
  }
}
