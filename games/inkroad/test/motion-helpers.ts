/**
 * The motion watch: plays a city season step by step and samples every drawn car at render-frame resolution, through
 * the renderer's own pure code (`drawnAt`, the vehicle model's frames, for moving cars as in carLayer.ts, `ManoeuvreCore` + `pathPose` for cars
 * turning in and out, `layoutPlace` for parked cars as in parkedCars.ts). It counts breaches of the car motion rules
 * (src/sim/kinematics.ts, docs/inkroad-build.md "Car motion rules").
 */
import { STEP, VEHICLES } from '../src/sim/constants';
import type { CityEvent, CityView, ParkingView, VehicleKind } from '../src/sim/types';
import { lotRect } from '../src/city/geometry';
import { layoutPlace, makeGeo, modeOf, type ParkingGeo } from '../src/render/cars/parkingSlots';
import type { Placed } from '../src/render/cars/parkedCars';
import { ManoeuvreCore, type Move, type Places } from '../src/render/cars/manoeuvreCore';
import { drawnAt, turn, type DrawnPose } from '../src/render/cars/drawnPose';
import { PhysWatch } from './vehicle/frameRules';
import { bodiesOverlap, sizeOf, type Body } from '../src/sim/vehicleSize';
import { A_LAT_PLAYED as A_LAT, R_MIN, REVERSE_PLAYED as REVERSE_MAX } from '../src/sim/kinematics';
import { UNDER } from '../src/render/deckHeight';
import { moveSeconds, planMove } from '../src/sim/parkMove';

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
const GRID = 32;

export type Rule = 'jumps' | 'slip' | 'turns in place' | 'too tight' | 'too fast on a curve' | 'reverse on the road' | 'reverse too fast' | 'bodies overlap' | 'cuts across without a gap'
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
        this.poses.set(c.uid, s.via ? { x: s.x, y: s.y, a: s.a, mode: 'aisle', via: s.via } : { x: s.x, y: s.y, a: s.a, mode: modeOf(p.kind) });
        if (!this.held.has(c.uid)) bodies.push({ x: s.x, y: s.y, a: s.a, ...sizeOf(c.kind as VehicleKind), uid: c.uid, z: 0, v: 0, man: false, id: `p${c.uid}` });
      });
    }
    this.bodies = bodies;
  }

  private mouth(v: ParkingView, uid: number): void {
    const park = v.kind === 'park' && v.park !== undefined ? this.geo!.parks.get(v.park) : undefined;
    if (!park) return;
    const r = lotRect(park);
    this.poses.set(uid, { x: r.x + r.w / 2, y: r.y + r.h / 2, a: 0, mode: 'enter', rect: r });
  }

  poseOf(uid: number): Placed | undefined { return this.poses.get(uid); }
  door(key: string): Placed | undefined {
    const [kind, id] = key.split(':');
    const where = !this.geo || id === undefined ? undefined : kind === 'lot' ? this.geo.lots.get(Number(id)) : kind === 'park' ? this.geo.parks.get(Number(id)) : undefined;
    if (!where) return undefined;
    const r = lotRect(where);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, a: 0, mode: 'enter', rect: r };
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
  private frame = 0;
  steps = 0;
  frames = 0;
  /** The city's events of the last step (the motion lab logs them). */
  lastEvents: readonly CityEvent[] = [];
  private readonly at: DrawnPose = { x: 0, y: 0, z: 0, a: 0 };

  constructor(private readonly v: CityView, private readonly hooks: WatchHooks = {}) {
    this.core = new ManoeuvreCore<null>(this.places, () => null);
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
      if (e.t === 'phase') this.core.dropWaiting();
      else if (e.t === 'parkGo') { this.core.go(e); if (e.uid !== undefined) this.handed.set(e.uid, e.car); }
      else if (e.t === 'park') { this.core.start(e); this.compare(e); }
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
    this.core.update(DT);
    if (this.places.dirty) { this.places.redo(this.v); this.places.dirty = false; }
    const drawn: Drawn[] = [];
    const c = this.v.cars;
    for (let i = 0; i < this.seen.length; i++) {
      const uid = this.seen[i];
      if (!uid) continue;
      const p = drawnAt(c, i, t, this.at);
      if (p.z <= UNDER) continue;
      const kind = VEHICLES[c.kind[i]!] as VehicleKind;
      this.note = this.why(i);
      const rev = (c as unknown as { track: ({ turnRound: string | null } | null)[] }).track[i]?.turnRound === 'three';
      drawn.push(this.motion({ x: p.x, y: p.y, a: p.a, ...sizeOf(kind), uid, z: p.z, v: 0, man: false, id: `m${uid}`, info: this.note, ...(rev ? { rev } : {}) }, undefined, kind));
    }
    for (let i = 0; i < this.core.active; i++) {
      const m = this.core.at(i);
      drawn.push(this.motion({ x: m.px, y: m.py, a: m.pa, ...sizeOf(m.kind as VehicleKind), uid: m.uid, z: 0, v: 0, man: true, id: `c${m.uid}`, info: `${m.mode}/${m.dir}/${m.phase}` }, m));
    }
    this.overlaps(drawn);
    this.hooks.onFrame?.(this.frame, this.v.clock - STEP * (1 - t), drawn, this.places.bodies);
  }

  /** MOTION_PLAN=1: the city's seconds against the drawn plan's (a mismatch rushes the drawn car). */
  private compare(e: Extract<CityEvent, { t: 'park' }>): void {
    if (!env('MOTION_PLAN') || e.slot < 0) return;
    const p = this.places.poseOf(e.car);
    if (!p) return;
    const t = moveSeconds(planMove(p.via ? "aisle" : p.mode, e.lane, p, e.dir, p.via), e.dir, e.split);
    const move = e.move ?? e.seconds;
    if (t.lane > e.seconds * 1.05 || t.lane + t.off > move * 1.05) console.log(`plan ${e.dir} ${p.mode} ${e.key}: lane ${t.lane.toFixed(1)}/${e.seconds.toFixed(1)} all ${(t.lane + t.off).toFixed(1)}/${move.toFixed(1)} from ${e.lane.x.toFixed(0)},${e.lane.y.toFixed(0)},${e.lane.a.toFixed(2)} to ${p.x.toFixed(0)},${p.y.toFixed(0)},${p.a.toFixed(2)}`);
  }

  private note = '';
  /** What a moving car is doing (for the log): its track kind, a slide under way, its state. */
  private why(i: number): string {
    if (!env('MOTION_LOG') && !this.hooks.onFrame) return '';
    const c = this.v.cars as unknown as { track: ({ kind: number; key: string } | null)[]; offEnd: Float64Array; state: Uint8Array; s: Float64Array };
    const t = c.track[i];
    return `[track ${t?.kind ?? '-'} ${t?.key ?? ''} s ${c.s[i]?.toFixed(1)} slide ${Math.max(0, c.offEnd[i]! - c.s[i]!).toFixed(0)} state ${c.state[i]}]`;
  }

  /** Slip, curvature and reversing against the car's last drawn frame. Returns the body with its speed. */
  private motion(b: Drawn, m?: Move<null>, kind?: VehicleKind): Drawn {
    const last = this.tracks.get(b.id);
    if (kind && !b.rev) for (const h of this.phys.feed(b.id, kind, this.frame, b.x, b.y, b.a, DT)) this.flag(h.rule, 'moving', b.uid, `${h.value.toFixed(3)} over ${h.limit.toFixed(3)} ${this.note}`, b, h.value, h.limit);
    this.tracks.set(b.id, { x: b.x, y: b.y, a: b.a, frame: this.frame });
    if (!last || last.frame !== this.frame - 1) return b;
    const dx = b.x - last.x, dy = b.y - last.y, ds = Math.hypot(dx, dy);
    const da = Math.abs(turn(last.a, b.a));
    const who = b.man ? 'manoeuvre' : 'moving';
    const v = ds / DT;
    const model = !!kind && !b.rev;
    if (model) {
      if (v > JUMP_V) { this.flag('jumps', who, b.uid, `${ds.toFixed(1)} px in a frame ${this.note}`, b, v, JUMP_V); return { ...b, v: 0 }; }
      const along = ds > 0 ? (dx * Math.cos(b.a) + dy * Math.sin(b.a)) / ds : 1;
      if (along < -0.5 && ds > STILL) this.flag('reverse on the road', who, b.uid, `${v.toFixed(1)} px/s ${this.note}`, b, v, 0);
      return { ...b, v: along < 0 ? -v : v };
    }
    if (ds < STILL) {
      if (da > TURN_EPS) this.flag('turns in place', who, b.uid, `${da.toFixed(3)} rad ${m ? `${m.mode}/${m.dir}/${m.phase}` : this.note}`, b, da, TURN_EPS);
      return { ...b, v };
    }
    if (v > JUMP_V) { this.flag('jumps', who, b.uid, `${ds.toFixed(1)} px in a frame ${m ? `${m.mode}/${m.dir}/${m.phase}` : this.note}`, b, v, JUMP_V); return { ...b, v: 0 }; }
    const along = (dx * Math.cos(b.a) + dy * Math.sin(b.a)) / ds;
    const slip = Math.acos(Math.min(1, Math.abs(along)));
    if (slip > SLIP_TOL) this.flag('slip', who, b.uid, `${slip.toFixed(2)} rad at ${b.x.toFixed(0)},${b.y.toFixed(0)} ${m ? `${m.mode}/${m.dir}/${m.phase}` : this.note}`, b, slip, SLIP_TOL);
    if (da > ds / R_TEST + TURN_EPS) this.flag('too tight', who, b.uid, `r ${(ds / da).toFixed(1)} px ${m ? `${m.mode}/${m.dir}/${m.phase}` : this.note}`, b, ds / da, R_TEST);
    else if (da > TURN_EPS && v > Math.sqrt(A_LAT * (ds / da)) * CURVE_SLACK + SPEED_EPS) this.flag('too fast on a curve', who, b.uid, `${v.toFixed(0)} px/s on r ${(ds / da).toFixed(0)}`, b, v, Math.sqrt(A_LAT * (ds / da)) * CURVE_SLACK + SPEED_EPS);
    if (along < -0.5) {
      if (!b.man && !b.rev) this.flag('reverse on the road', who, b.uid, `${v.toFixed(1)} px/s ${this.note}`, b, v, 0);
      else if (v > REVERSE_MAX + SPEED_EPS) this.flag('reverse too fast', who, b.uid, `${v.toFixed(1)} px/s ${m ? `${m.mode}/${m.dir}/${m.phase}` : this.note}`, b, v, REVERSE_MAX + SPEED_EPS);
    }
    return { ...b, v: along < 0 ? -v : v };
  }

  /** Every moving or manoeuvring body against every other drawn body; new touches only. Plus cut-offs. */
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
            if (!this.touching.has(key)) this.flag('bodies overlap', b.man || o.man ? 'manoeuvre' : 'moving', b.uid, `${key} at ${b.x.toFixed(0)},${b.y.toFixed(0)}`, b);
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
