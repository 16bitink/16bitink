/** Every car, as struct of arrays, and the queue operations that keep lanes ordered. */
import { MAX_CARS } from './constants';
import { angleDiff } from './geom';
import { slideLength } from './kinematics';
import { LANE_T, poseAt, type Pose, type Track } from './track';
import { LENGTH_OF, SPEED_OF, isBus } from './tune';
import type { CarsView } from './types';
import type { OutOpt } from './world';

const f32 = (): Float32Array => new Float32Array(MAX_CARS);
const f64 = (): Float64Array => new Float64Array(MAX_CARS);
const i32 = (): Int32Array => new Int32Array(MAX_CARS);

export class CarStore implements CarsView {
  count = 0;
  active = 0;
  readonly alive = new Uint8Array(MAX_CARS);
  readonly x = f32();
  readonly y = f32();
  readonly heading = f32();
  readonly z = f32();
  readonly speed = f32();
  readonly kind = new Uint8Array(MAX_CARS);
  readonly tint = new Uint8Array(MAX_CARS);
  readonly anger = f32();
  readonly blinker = new Int8Array(MAX_CARS);
  /** The destination's lanes: 0 either way, 1 with the road's line, -1 against it. */
  readonly destDir = new Int8Array(MAX_CARS);
  readonly state = new Uint8Array(MAX_CARS);
  readonly uid = new Uint32Array(MAX_CARS);
  // driving
  readonly track: (Track | null)[] = new Array<Track | null>(MAX_CARS).fill(null);
  readonly s = f64();
  readonly v = f64();
  readonly nv = f64(); // speed wanted next
  readonly room = f64(); // hard limit on this step's travel
  readonly len = f32();
  readonly half = f32();
  readonly vf = f32(); // driver's speed factor
  readonly hw = f32(); // driver's headway factor
  readonly ahead = i32();
  readonly behind = i32();
  readonly opt: (OutOpt | null)[] = new Array<OutOpt | null>(MAX_CARS).fill(null);
  /** Link the car is on, or is leaving. */
  readonly link = i32();
  readonly granted = new Uint8Array(MAX_CARS);
  readonly outTo: (Track | null)[] = new Array<Track | null>(MAX_CARS).fill(null); // lane reserved beyond the junction
  readonly exitBy: (Track | null)[] = new Array<Track | null>(MAX_CARS).fill(null); // ring exit piece
  readonly ticket = f64();
  /** A left-turner held up on green long enough that the others let it go. */
  readonly courtesy = new Uint8Array(MAX_CARS);
  // sideways offset that fades as the car drives on
  readonly offX = f32();
  readonly offY = f32();
  readonly offH = f32();
  readonly offLeft = f32();
  readonly offLen = f32();
  // the trip
  readonly destRoad = i32(); // road id, or -1 for a gate
  readonly destNode = i32(); // gate node id, or -1
  readonly destS = f64(); // along the road
  readonly destLink = i32(); // index of the link being finished on, or -1
  readonly destAt = f64(); // s on that link's lane
  readonly field: string[] = new Array<string>(MAX_CARS).fill('');
  readonly tag: number[] = new Array<number>(MAX_CARS).fill(0);
  readonly value = f64();
  readonly born = f64();
  readonly waited = f64();
  readonly stuck = f64();
  readonly linkWait = f64();
  readonly tolls = f64();
  readonly until = f64(); // blocked or dwelling until
  readonly service = i32(); // service vehicle index, or -1
  readonly arrived = new Uint8Array(MAX_CARS);
  readonly bus = new Uint8Array(MAX_CARS);
  readonly rerouted = f64();
  readonly moved = new Uint8Array(MAX_CARS); // step parity, so nobody moves twice in one step
  private nextUid = 1;
  private readonly free: number[] = [];
  readonly slotOf = new Map<number, number>();

  take(kind: number): number {
    if (this.active >= MAX_CARS) return -1;
    const i = this.free.pop() ?? this.count++;
    this.active++;
    const uid = this.nextUid++;
    this.slotOf.set(uid, i);
    this.alive[i] = 1;
    this.uid[i] = uid;
    this.kind[i] = kind;
    this.len[i] = LENGTH_OF[kind]!;
    this.half[i] = LENGTH_OF[kind]! / 2;
    this.vf[i] = SPEED_OF[kind]!;
    this.bus[i] = isBus(kind) ? 1 : 0;
    this.hw[i] = 1;
    this.track[i] = null;
    this.opt[i] = this.outTo[i] = this.exitBy[i] = null;
    this.field[i] = '';
    for (const a of [this.s, this.v, this.nv, this.waited, this.stuck, this.linkWait, this.tolls, this.until, this.ticket, this.destS, this.destAt, this.rerouted]) a[i] = 0;
    for (const a of [this.offX, this.offY, this.offH, this.offLeft, this.anger, this.z, this.speed]) a[i] = 0;
    this.offLen[i] = 1;
    this.ahead[i] = this.behind[i] = this.service[i] = this.destLink[i] = this.destRoad[i] = this.destNode[i] = this.link[i] = -1;
    this.courtesy[i] = this.granted[i] = this.arrived[i] = this.state[i] = this.tint[i] = this.destDir[i] = 0;
    this.blinker[i] = 0;
    return i;
  }

  /** Forget a car: out of its queue, its promises taken back. */
  drop(i: number): void {
    if (!this.alive[i]) return;
    this.revoke(i);
    this.unlink(i);
    this.alive[i] = 0;
    this.active--;
    this.slotOf.delete(this.uid[i]!);
    this.free.push(i);
  }

  /** Take back a right of way and the room it reserved. */
  revoke(i: number): void {
    const to = this.outTo[i];
    if (to) to.incoming = Math.max(0, to.incoming - this.need(i));
    const t = this.track[i], o = this.opt[i];
    if (this.granted[i] && t && o && t.kind === LANE_T && t.link === o.from.i) {
      const conn = o.conn[t.lane];
      if (conn) dropFrom(conn.occ, i);
    }
    this.outTo[i] = null;
    this.exitBy[i] = null;
    this.granted[i] = this.courtesy[i] = 0;
  }

  /** Pixels a car needs to stand in. */
  need(i: number): number { return this.len[i]! + STAND; }

  unlink(i: number): void {
    const t = this.track[i];
    if (!t) return;
    const a = this.ahead[i]!, b = this.behind[i]!;
    if (a >= 0) this.behind[a] = b; else t.head = b;
    if (b >= 0) this.ahead[b] = a; else t.tail = a;
    t.count--;
    this.ahead[i] = this.behind[i] = -1;
    this.track[i] = null;
    if (t.kind !== LANE_T) dropFrom(t.occ, i);
  }

  /** Put a car on a track at s, keeping the queue in order. */
  insert(i: number, t: Track, s: number): void {
    let b = t.head, a = -1;
    while (b >= 0 && this.s[b]! >= s) { a = b; b = this.behind[b]!; }
    this.ahead[i] = a;
    this.behind[i] = b;
    if (a >= 0) this.behind[a] = i; else t.head = i;
    if (b >= 0) this.ahead[b] = i; else t.tail = i;
    t.count++;
    this.track[i] = t;
    this.s[i] = s;
  }

  /** Put a car at the back of a track's queue. */
  push(i: number, t: Track, s: number): void {
    const a = t.tail;
    this.ahead[i] = a;
    this.behind[i] = -1;
    if (a >= 0) this.behind[a] = i; else t.head = i;
    t.tail = i;
    t.count++;
    this.track[i] = t;
    this.s[i] = s;
  }

  /** Start a sideways slide from where the car is drawn now to its new place. */
  slideFrom(i: number, x: number, y: number, h: number, over: number): void {
    poseAt(this.track[i]!, this.s[i]!, POSE);
    this.offX[i] = x - POSE.x;
    this.offY[i] = y - POSE.y;
    this.offH[i] = angleDiff(POSE.h, h);
    // Never a sideways move tighter than a car turns (a lane change, a redirect, a kerb swing).
    const len = Math.max(over, slideLength(Math.hypot(this.offX[i]!, this.offY[i]!)));
    this.offLeft[i] = len;
    this.offLen[i] = len;
  }
}

export const STAND = 3.5;
export const POSE: Pose = { x: 0, y: 0, h: 0, z: 0 };

export function dropFrom(list: number[], i: number): void {
  const k = list.indexOf(i);
  if (k >= 0) list.splice(k, 1);
}
