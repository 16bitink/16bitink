/**
 * The motion watch: plays a city season step by step and samples every drawn car at render-frame resolution, through
 * the renderer's own pure code (`drawnAt`, the vehicle model's frames, for moving cars as in carLayer.ts, `ManoeuvreCore` + `pathPose` for cars
 * turning in and out, `layoutPlace` for parked cars as in parkedCars.ts). It counts breaches of the car motion rules
 * (src/sim/kinematics.ts, docs/inkroad-build.md "Car motion rules").
 */
import { STEP, VEHICLES } from '../src/sim/constants';
import type { CityEvent, CityView, ParkingView, VehicleKind } from '../src/sim/types';
import { lotRect } from '../src/city/geometry';
import { layoutPlace, makeGeo, type ParkingGeo } from '../src/render/cars/parkingSlots';
import type { Placed } from '../src/render/cars/parkedCars';
import { ManoeuvreCore, type Move, type Places } from '../src/render/cars/manoeuvreCore';
import { drawnAt, turn, type DrawnPose } from '../src/render/cars/drawnPose';
import { PhysWatch } from './vehicle/frameRules';
import { bodiesOverlap, sizeOf, type Body } from '../src/sim/vehicleSize';
import { A_LAT_PLAYED as A_LAT, R_MIN, REVERSE_PLAYED as REVERSE_MAX } from '../src/sim/kinematics';
import { UNDER } from '../src/render/deckHeight';
import { halfWidth } from '../src/sim/roadGeom';
import { LANE } from '../src/sim/constants';
import { paramsOf } from '../src/sim/vehicle/params';
import type { Road } from '../src/sim/types';

/** Render frames per sim step (60 fps at 1x, 10 steps a second). */
export const FRAMES = 6;
const DT = STEP / FRAMES;
/** Below this a frame's move is standing still (px). */
const STILL = 0.05;
/** Heading off the line of travel (rad) that counts as sliding sideways. */
export const SLIP_TOL = 0.1;
/** Curvature slack: radius may be this share under R_MIN, plus a hair for rounding. */
const R_TEST = R_MIN * 0.9;
const TURN_EPS = 0.004;
/** Speed slack (px/s) over the reverse limit and the curve limit. */
const SPEED_EPS = 0.5;
const CURVE_SLACK = 1.25;
/** Bodies may touch this much (px) before they overlap (as the renderer's own hold). */
const TOUCH = 0.4;
/** A moving car closer than this many seconds to a manoeuvring car's body has been cut off. */
const CUT_S = 1;
const CUT_MIN_V = 2;
/** Faster than this (px/s) between two frames is a jump, not a drive (the fastest road is slower). */
const JUMP_V = 150;
/** A jump further than this is a new car (as carLayer.ts). */
const TELEPORT = 60;
const HOLDING = 4;
/** Reversing at most walking pace (the owner: 1.5 m/s at the game's pace), a hair of sampling slack. */
const REVERSE_LIMIT = REVERSE_MAX * 1.02;
/** Parking speeds (the owner, phase B): turning in 15 km/h (manoeuvres are driven at 9, under the 10 km/h of aisles), the last px into a space 5 km/h. */
const KMH = 3.55 * 1.25 / 3.6;
const TURN_IN_CAP = 15 * KMH, CREEP_CAP = 5 * KMH, CREEP_PX = 6, CREEP_S = 3, PARK_SLACK = 1.05;
/** A manoeuvring car within this of its start line (px, rad) is still braking in its lane. */
const ON_LINE = 2, ON_HEADING = 0.1;
/** A reversing body may reach this far past the inner edge of its lane (paint). */
const REVERSE_SLACK = 2;
/** Loops: a heading sweep over the net change + LOOP_SLACK (as the planner, src/sim/vehicle/planner.ts), every move (turns round too). */
const LOOP_SLACK = (120 * Math.PI) / 180;

/** A move that turns the car round (its net heading change over 130 degrees): reversing across the road is its design. */
const turnsRound = (m: Move<null>): boolean => {
  const last = m.b && m.b.n > 0 ? m.b : m.a;
  return Math.abs(turn(m.a.frames[2]!, last.frames[(last.n - 1) * 3 + 2]!)) > (130 * Math.PI) / 180;
};

/** Where a body's middle lies against a road's line, if beside its middle part (not past its ends). */
function projectOn(r: Road, b: { readonly x: number; readonly y: number }): { lat: number; h: number } | null {
  let best: { lat: number; h: number; d: number } | null = null;
  const line = r.line;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, e = line[i]!;
    const dx = e.x - a.x, dy = e.y - a.y, l2 = dx * dx + dy * dy;
    if (l2 < 1e-9) continue;
    const t = ((b.x - a.x) * dx + (b.y - a.y) * dy) / l2;
    if (t < 0 || t > 1) continue;
    const l = Math.sqrt(l2);
    const lat = (-(b.x - a.x) * dy + (b.y - a.y) * dx) / l;
    if (!best || Math.abs(lat) < best.d) best = { lat, h: Math.atan2(dy, dx), d: Math.abs(lat) };
  }
  return best;
}
const GRID = 32;

export type Rule = 'jumps' | 'slip' | 'turns in place' | 'too tight' | 'too fast on a curve' | 'reverse on the road' | 'reverse too fast' | 'bodies overlap' | 'cuts across without a gap'
  /** The owner's phase B rules: no backing across a lane of traffic, parking speeds, no loops. */
  | 'reverses across a lane' | 'too fast while parking' | 'loops'
  /** Moving cars only (the vehicle invariants, test/vehicle/frameRules.ts). */
  | 'steers too fast' | 'pulls away too hard' | 'brakes too hard' | 'jerks';
export interface Finding {
  readonly rule: Rule; readonly who: 'moving' | 'manoeuvre'; readonly uid: number; readonly clock: number; readonly detail: string;
  /** The render frame (count from the start) and the drawn pose at it (the motion lab's timeline and frames). */
  readonly frame?: number; readonly x?: number; readonly y?: number; readonly a?: number;
  /** The measured value against its limit (px, px/s or rad as the rule goes). */
  readonly value?: number; readonly limit?: number;
}

/** A drawn car as the watch saw it this frame: moving (`m`), turning in or out (`c`) or parked (`p`). */
export interface DrawnCar extends Body { readonly uid: number; readonly z: number; readonly v: number; readonly man: boolean; readonly id: string; readonly info?: string;
  /** A moving car in a three-point turn at a dead end (src/sim/parkPaths.ts turnRound): it may reverse, at walking pace. */
  readonly rev?: boolean }
/** Hooks for the motion lab (test/motion/): run something before each sim step, see every drawn frame. */
export interface WatchHooks {
  readonly before?: () => void;
  readonly onFrame?: (frame: number, clock: number, drawn: readonly DrawnCar[], parked: readonly DrawnCar[]) => void;
}
/** process.env in node, nothing in the browser (dev/motion.html runs this file too). */
const env = (k: string): string | undefined => (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env[k];

type Drawn = DrawnCar;
interface Track { x: number; y: number; a: number; frame: number }

/** Parked cars where the parked-car layer puts them (the same `layoutPlace`), and the slots each car stood in. */
class TestPlaces implements Places {
  private readonly poses = new Map<number, Placed>();
  readonly held = new Set<number>();
  geo: ParkingGeo | null = null;
  private key: readonly unknown[] = [];
  private last: CityView['parking'] = undefined;
  bodies: Drawn[] = [];

  sync(v: CityView): void {
    const key = [v.roads, v.lots, v.carParks, v.beaches];
    if (key.some((k, i) => k !== this.key[i])) { this.geo = makeGeo(v); this.key = key; this.last = undefined; }
    if (v.parking === this.last) return;
    this.last = v.parking;
    this.redo(v);
  }

  redo(v: CityView): void {
    const geo = this.geo!;
    const bodies: Drawn[] = [];
    for (const p of v.parking ?? []) {
      const slots = layoutPlace(p, geo);
      p.cars.forEach((c, i) => {
        const s = slots[i];
        if (!s) { this.mouth(p, c.uid); return; }
        this.poses.set(c.uid, { x: s.x, y: s.y, a: s.a });
        if (!this.held.has(c.uid)) bodies.push({ x: s.x, y: s.y, a: s.a, ...sizeOf(c.kind as VehicleKind), uid: c.uid, z: 0, v: 0, man: false, id: `p${c.uid}` });
      });
    }
    this.bodies = bodies;
  }

  private mouth(v: ParkingView, uid: number): void {
    const park = v.kind === 'park' && v.park !== undefined ? this.geo!.parks.get(v.park) : undefined;
    if (!park) return;
    const r = lotRect(park);
    this.poses.set(uid, { x: r.x + r.w / 2, y: r.y + r.h / 2, a: 0, rect: r });
  }

  poseOf(uid: number): Placed | undefined { return this.poses.get(uid); }
  door(key: string): Placed | undefined {
    const [kind, id] = key.split(':');
    const where = !this.geo || id === undefined ? undefined : kind === 'lot' ? this.geo.lots.get(Number(id)) : kind === 'park' ? this.geo.parks.get(Number(id)) : undefined;
    if (!where) return undefined;
    const r = lotRect(where);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, a: 0, rect: r };
  }
  hold(uid: number): void { this.held.add(uid); this.dirty = true; }
  unhold(uid: number): void { if (this.held.delete(uid)) this.dirty = true; }
  dirty = false;
}


export class MotionWatch {
  readonly found: Finding[] = [];
  private readonly places = new TestPlaces();
  private readonly core: ManoeuvreCore<null>;
  private readonly seen: number[] = [];
  private readonly phys = new PhysWatch();
  private readonly tracks = new Map<string, Track>();
  private readonly touching = new Set<string>();
  private readonly cutting = new Set<string>();
  private readonly handed = new Map<number, number>();
  private readonly turning = new Map<number, { first: number; last: number; sum: number; th: number; lo: number; hi: number }>();
  private readonly across = new Set<string>();
  private frame = 0;
  steps = 0;
  frames = 0;
  /** The city's events of the last step (the motion lab logs them). */
  lastEvents: readonly CityEvent[] = [];
  private readonly at: DrawnPose = { x: 0, y: 0, z: 0, a: 0 };

  constructor(private readonly v: CityView, private readonly hooks: WatchHooks = {}) {
    this.core = new ManoeuvreCore<null>(this.places, () => null, (m) => this.ended(m));
    this.places.sync(v);
  }

  private flag(rule: Rule, who: Finding['who'], uid: number, detail: string, b?: Body, value?: number, limit?: number): void {
    const pose = b ? { x: b.x, y: b.y, a: b.a } : {};
    this.found.push({ rule, who, uid, clock: Math.round(this.v.clock * 10) / 10, detail, frame: this.frame, ...pose, ...(value !== undefined ? { value, limit } : {}) });
  }

  season(): void {
    while (this.v.phase === 'day') this.step();
  }

  step(): void {
    this.hooks.before?.();
    this.v.advance(STEP);
    this.steps++;
    const evs = this.v.drainEvents();
    this.lastEvents = evs;
    if (this.v.phase !== 'day') return;
    this.places.sync(this.v);
    this.play(evs);
    this.take();
    for (let f = 1; f <= FRAMES; f++) this.frameAt(f / FRAMES);
  }

  /** The scene's order: the season's end drops waiting cars, a release goes, a park starts (parked layer synced first). */
  private play(evs: readonly CityEvent[]): void {
    for (const e of evs) {
      if (env('MOTION_UID') && (e.t === 'park' || e.t === 'parkGo') && e.car === Number(env('MOTION_UID'))) console.log(`EV @${this.v.clock.toFixed(1)} ${JSON.stringify(e)}`);
      if (e.t === 'parkGo') { this.core.go(e); if (e.uid !== undefined) this.handed.set(e.uid, e.car); }
      else if (e.t === 'park') this.core.start(e);
    }
  }

  /** A new sim step: as carLayer.take (a new uid, or a first frame far from the last drawn one, is a new car). */
  private take(): void {
    const c = this.v.cars;
    for (let i = 0; i < Math.max(c.count, this.seen.length); i++) {
      const alive = i < c.count && c.alive[i] === 1;
      if (!alive || c.state[i] === HOLDING) { this.seen[i] = 0; continue; }
      const p = drawnAt(c, i, 0, this.at);
      const last = this.tracks.get(`m${c.uid[i]}`);
      if (this.seen[i] !== c.uid[i] || (last && Math.hypot(p.x - last.x, p.y - last.y) > TELEPORT)) {
        this.seen[i] = c.uid[i]!;
        this.tracks.delete(`m${c.uid[i]}`);
      }
    }
  }

  private frameAt(t: number): void {
    this.frame++;
    this.frames++;
    const c = this.v.cars;
    this.core.update(DT, (uid) => {
      const i = c.uid.indexOf(uid);
      return i >= 0 && c.alive[i] === 1 && c.state[i] === HOLDING;
    });
    if (this.places.dirty) { this.places.redo(this.v); this.places.dirty = false; }
    const drawn: Drawn[] = [];
    for (let i = 0; i < this.seen.length; i++) {
      const uid = this.seen[i];
      if (!uid) continue;
      const p = drawnAt(c, i, t, this.at);
      if (p.z <= UNDER) continue;
      const kind = VEHICLES[c.kind[i]!] as VehicleKind;
      this.note = this.why(i);
      const sim = c as unknown as { track: ({ turnRound: string | null } | null)[]; play: (unknown | null)[] };
      const rev = sim.track[i]?.turnRound === 'three' || !!sim.play[i];
      drawn.push(this.motion({ x: p.x, y: p.y, a: p.a, ...sizeOf(kind), uid, z: p.z, v: 0, man: false, id: `m${uid}`, info: this.note, ...(rev ? { rev } : {}) }, undefined, kind));
    }
    for (let i = 0; i < this.core.active; i++) {
      const m = this.core.at(i);
      drawn.push(this.motion({ x: m.px, y: m.py, a: m.pa, ...sizeOf(m.kind as VehicleKind), uid: m.uid, z: 0, v: 0, man: true, id: `c${m.uid}`, info: `${m.dir}/${m.phase}/${m.a.word}` }, m, m.kind as VehicleKind));
      this.turned(m);
    }
    this.overlaps(drawn);
    this.hooks.onFrame?.(this.frame, this.v.clock - STEP * (1 - t), drawn, this.places.bodies);
  }

  private note = '';
  /** What a moving car is doing (for the log): its track kind, a slide under way, its state. */
  private why(i: number): string {
    if (!env('MOTION_LOG') && !this.hooks.onFrame) return '';
    const c = this.v.cars as unknown as { track: ({ kind: number; key: string } | null)[]; offEnd: Float64Array; state: Uint8Array; s: Float64Array };
    const t = c.track[i];
    return `[track ${t?.kind ?? '-'} ${t?.key ?? ''} s ${c.s[i]?.toFixed(1)} slide ${Math.max(0, c.offEnd[i]! - c.s[i]!).toFixed(0)} state ${c.state[i]}]`;
  }

  /**
   * Every drawn car against the vehicle invariants (slip and curvature at the rear axle, wheel rate, acceleration,
   * braking, jerk, curve speed: test/vehicle/frameRules.ts), plus jumps, reversing (only in a manoeuvre or a turn
   * round, at walking pace, never across a lane of traffic) and the parking speeds. Returns the body with its speed.
   */
  private motion(b: Drawn, m?: Move<null>, kind?: VehicleKind): Drawn {
    const last = this.tracks.get(b.id);
    const who = b.man ? 'manoeuvre' : 'moving';
    const what = m ? `${m.dir}/${m.phase}/${m.a.word}` : this.note;
    if (kind) for (const h of this.phys.feed(b.id, kind, this.frame, b.x, b.y, b.a, DT)) this.flag(h.rule, who, b.uid, `${h.value.toFixed(3)} over ${h.limit.toFixed(3)} ${what}`, b, h.value, h.limit);
    this.tracks.set(b.id, { x: b.x, y: b.y, a: b.a, frame: this.frame });
    if (!last || last.frame !== this.frame - 1) return b;
    const dx = b.x - last.x, dy = b.y - last.y, ds = Math.hypot(dx, dy);
    const v = ds / DT;
    if (v > JUMP_V) { this.flag('jumps', who, b.uid, `${ds.toFixed(1)} px in a frame ${what}`, b, v, JUMP_V); return { ...b, v: 0 }; }
    if (ds < STILL) return { ...b, v: 0 };
    const along = (dx * Math.cos(b.a) + dy * Math.sin(b.a)) / ds;
    const back = along < -0.5;
    if (back && !b.man && !b.rev) this.flag('reverse on the road', who, b.uid, `${v.toFixed(1)} px/s ${what}`, b, v, 0);
    if (back && (b.man || b.rev)) {
      if (v > REVERSE_LIMIT) this.flag('reverse too fast', who, b.uid, `${v.toFixed(1)} px/s ${what}`, b, v, REVERSE_LIMIT);
      if (!b.rev && !(m && turnsRound(m))) this.acrossLane(b, what);
    }
    if (!back && m) this.parkingSpeed(b, m, v, what);
    return { ...b, v: back ? -v : v };
  }

  /** A reversing body reaching past the inner edge of the outermost lane on its side of a road: it backs across a lane of traffic. */
  private acrossLane(b: Drawn, what: string): void {
    const geo = this.places.geo;
    if (!geo) return;
    for (const r of geo.ground) {
      const n = projectOn(r, b);
      if (!n) continue;
      const hw = halfWidth(r);
      const ext = (b.len * Math.abs(Math.sin(b.a - n.h)) + b.wid * Math.abs(Math.cos(b.a - n.h))) / 2;
      const inner = Math.abs(n.lat) - ext;
      const edge = hw - LANE - REVERSE_SLACK;
      if (Math.abs(n.lat) - ext > hw + 1 || inner >= edge) continue;
      const key = `${b.id}|across`;
      if (!this.across.has(key)) this.flag('reverses across a lane', 'manoeuvre', b.uid, `${(edge - inner).toFixed(1)} px past its lane on road ${r.id} ${what}`, b, edge - inner, 0);
      this.across.add(key);
      return;
    }
  }

  /**
   * Forward in a manoeuvre: still on its lane line it is only braking in its lane (the road's own rules); once it has
   * left the line, never over the turn-in pace (15 km/h), and the last px into a space at a creep (5 km/h).
   */
  private parkingSpeed(b: Drawn, m: Move<null>, v: number, what: string): void {
    const x0 = m.a.frames[0]!, y0 = m.a.frames[1]!, a0 = m.a.frames[2]!;
    const lat = Math.abs(-(b.x - x0) * Math.sin(a0) + (b.y - y0) * Math.cos(a0));
    if (m.dir === 'in' && m.phase === 'move' && lat < ON_LINE && Math.abs(turn(a0, b.a)) < ON_HEADING) return;
    // The final creep: near its space at the very end of the move (a car passing by its space on the way to the aisle is not creeping in).
    const end = m.dir === 'in' && m.at > m.a.seconds - CREEP_S && Math.hypot(m.endX - b.x, m.endY - b.y) < CREEP_PX;
    const cap = (end ? CREEP_CAP : TURN_IN_CAP) * PARK_SLACK;
    if (v > cap) this.flag('too fast while parking', 'manoeuvre', b.uid, `${v.toFixed(1)} px/s ${end ? 'creeping in' : 'manoeuvring'} ${what}`, b, v, cap);
  }

  /** Heading turned so far by each manoeuvring car (for the loops rule), from its first drawn frame. */
  private turned(m: Move<null>): void {
    const t = this.turning.get(m.uid);
    if (!t) { this.turning.set(m.uid, { first: m.pa, last: m.pa, sum: 0, th: 0, lo: 0, hi: 0 }); return; }
    t.th += turn(t.last, m.pa);
    t.lo = Math.min(t.lo, t.th); t.hi = Math.max(t.hi, t.th);
    t.sum = t.hi - t.lo;
    t.last = m.pa;
  }

  /** A move whose heading swept far beyond its net change looped (the owner: no loops, ever; an S sweeps one bend, a circle all of it). */
  private ended(m: Move<null>): void {
    const t = this.turning.get(m.uid);
    this.turning.delete(m.uid);
    for (const k of [...this.across]) if (k.startsWith(`c${m.uid}|`)) this.across.delete(k);
    if (!t) return;
    const net = Math.abs(turn(t.first, t.last));
    const most = net + LOOP_SLACK;
    if (t.sum > most) this.flag('loops', 'manoeuvre', m.uid, `swept ${((t.sum * 180) / Math.PI).toFixed(0)} deg for a net ${((net * 180) / Math.PI).toFixed(0)} deg ${m.dir}/${m.a.word}`, { x: m.px, y: m.py, a: m.pa, ...sizeOf(m.kind as VehicleKind) }, t.sum, most);
  }

  /** Every moving or manoeuvring body against every other drawn body, each frame they overlap. Plus cut-offs. */
  private overlaps(drawn: readonly Drawn[]): void {
    const grid = new Map<number, Drawn[]>();
    const put = (b: Drawn): void => {
      const k = Math.floor(b.x / GRID) * 4096 + Math.floor(b.y / GRID);
      (grid.get(k) ?? grid.set(k, []).get(k)!).push(b);
    };
    for (const b of this.places.bodies) put(b);
    for (const b of drawn) put(b);
    const now = new Set<string>();
    const cuts = new Set<string>();
    for (const b of drawn) {
      const gx = Math.floor(b.x / GRID), gy = Math.floor(b.y / GRID);
      for (let ix = gx - 1; ix <= gx + 1; ix++) for (let iy = gy - 1; iy <= gy + 1; iy++) {
        for (const o of grid.get(ix * 4096 + iy) ?? []) {
          if (o === b || Math.abs(o.z - b.z) > 0.5 || (o.id[0] !== 'p' && o.id < b.id)) continue;
          if (this.same(b, o)) continue;
          if (bodiesOverlap(b, o, TOUCH)) {
            const key = b.id < o.id ? `${b.id}|${o.id}` : `${o.id}|${b.id}`;
            now.add(key);
            // Every frame two bodies overlap counts (the owner: one car drawn through another for a second is 60, not 1).
            this.flag('bodies overlap', b.man || o.man ? 'manoeuvre' : 'moving', b.uid, `${key} at ${b.x.toFixed(0)},${b.y.toFixed(0)}`, b);
          }
        }
      }
      if (b.man) this.cuts(b, grid, cuts);
    }
    this.touching.clear();
    for (const k of now) this.touching.add(k);
    this.cutting.clear();
    for (const k of cuts) this.cutting.add(k);
  }

  /** A moving car heading at a manoeuvring car's body, nearer than CUT_S at its speed: the manoeuvre cut it off. */
  private cuts(b: Drawn, grid: Map<number, Drawn[]>, cuts: Set<string>): void {
    const gx = Math.floor(b.x / GRID), gy = Math.floor(b.y / GRID);
    for (let ix = gx - 2; ix <= gx + 2; ix++) for (let iy = gy - 2; iy <= gy + 2; iy++) {
      for (const o of grid.get(ix * 4096 + iy) ?? []) {
        if (o.man || !o.id.startsWith('m') || o.v < CUT_MIN_V || o.uid === b.uid) continue;
        const fx = Math.cos(o.a), fy = Math.sin(o.a);
        const rx = b.x - o.x, ry = b.y - o.y;
        const along = rx * fx + ry * fy, lat = Math.abs(-rx * fy + ry * fx);
        const ext = Math.abs(Math.cos(b.a - o.a)), side = Math.abs(Math.sin(b.a - o.a));
        const halfAlong = (b.len * ext + b.wid * side) / 2, halfLat = (b.len * side + b.wid * ext) / 2;
        if (along <= 0 || lat > halfLat + o.wid / 2) continue;
        const clear = along - halfAlong - o.len / 2;
        if (clear > o.v * CUT_S) continue;
        const key = `${b.id}|${o.id}`;
        cuts.add(key);
        if (!this.cutting.has(key)) this.flag('cuts across without a gap', 'manoeuvre', b.uid, `${o.id} at ${o.v.toFixed(0)} px/s, ${clear.toFixed(1)} px`, b, clear, o.v * CUT_S);
      }
    }
  }

  /** A pull-out and the moving car it becomes (the 'parkGo' names both). */
  private same(a: Drawn, b: Drawn): boolean {
    return (a.man && b.id[0] === 'm' && this.handed.get(b.uid) === a.uid) || (b.man && a.id[0] === 'm' && this.handed.get(a.uid) === b.uid);
  }

  counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const f of this.found) { const k = `${f.rule} (${f.who})`; out[k] = (out[k] ?? 0) + 1; }
    return out;
  }
}
