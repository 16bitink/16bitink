/**
 * The city-level teleport detector: follows every car the city shows (parked cars by uid, moving cars by traffic uid)
 * step by step through a season, and names every move that is not animated:
 * - a parked car appears without a 'park in' / disappears without a 'park out', or changes place while parked;
 * - a moving car appears or disappears away from a gate, except a pull-out that the 'parkGo' hands over, or a car
 *   whose 'park in' took it (it holds the lane, state 4, then goes);
 * - a moving car jumps further in one step than its speed allows.
 */
import { STEP } from '../src/sim/constants';
import type { CityEvent, CityView } from '../src/sim/types';
import { NIGHT_END, WEEKEND_AT } from '../src/city/clock';
import type { City } from '../src/city/state';
import { inner } from './city-helpers';

/** A gate's mouth: cars appear and go within this many px of the gate node. */
const GATE_REACH = 70;
/** Px a lane pose may differ from a car's pose and still be the same car. */
const SAME_POSE = 1.5;
/**
 * Px of slack in one step beyond what its speed allows. Lane polylines bend in corners: a slow car crossing one can
 * move up to ~8 px in a step, which the car layer glides over (a swerve, not a jump). A teleport is more than that.
 */
const JUMP_SLACK = 10;
/** px/s² a car may speed up within a step (more than any car can). */
const ACCEL = 120;
/** Px a double-parked block car may stand from the car it replaces. */
const SWAP_REACH = 60;
/** Seconds the parking view may lag a change that sets no event (it is rebuilt every half second). */
const VIEW_LAG = 0.6;

interface Moving { x: number; y: number; v: number; state: number; tag: number; matched: boolean }
type Park = Extract<CityEvent, { t: 'park' }>;
type Go = Extract<CityEvent, { t: 'parkGo' }>;

export interface Finding { readonly cause: string; readonly clock: number; readonly uid: number; readonly detail: string }

export class TeleportWatch {
  readonly found: Finding[] = [];
  private standing = new Map<number, string>();
  private moving = new Map<number, Moving>();
  /** Parked cars told 'in' and not yet listed, or 'out' and not yet gone from the list. */
  private comingIn = new Set<number>();
  private goingOut = new Set<number>();
  private readonly gates: { x: number; y: number }[];
  steps = 0;
  private gaveUp: { x: number; y: number }[] = [];
  events = 0;

  constructor(private readonly v: CityView) {
    const c = inner(v);
    this.gates = c.net.junctions.filter((j) => j.gate !== undefined).map((j) => ({ x: j.x, y: j.y }));
    this.standing = this.listed();
    this.moving = this.cars(new Map());
  }

  private get c(): City { return inner(this.v); }

  private flag(cause: string, uid: number, detail: string): void {
    this.found.push({ cause, clock: Math.round(this.c.clock * 10) / 10, uid, detail });
  }

  private listed(): Map<number, string> {
    const out = new Map<number, string>();
    for (const p of this.v.parking ?? []) for (const car of p.cars) out.set(car.uid, `${p.key}#${car.slot}`);
    return out;
  }

  private cars(prev: Map<number, Moving>): Map<number, Moving> {
    const t = this.c.traffic.cars;
    const out = new Map<number, Moving>();
    for (let i = 0; i < t.count; i++) {
      if (!t.alive[i]) continue;
      const uid = t.uid[i]!;
      out.set(uid, { x: t.x[i]!, y: t.y[i]!, v: t.speed[i]!, state: t.state[i]!, tag: (t as unknown as { tag: number[] }).tag[i]!, matched: prev.get(uid)?.matched ?? false });
    }
    return out;
  }

  private nearGate(p: { x: number; y: number }): boolean {
    return this.gates.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < GATE_REACH);
  }

  /** One step: advance the city by STEP and check everything that changed. */
  step(): void {
    this.v.advance(STEP);
    this.steps++;
    const evs = this.v.drainEvents();
    if (this.v.phase !== 'day') return; // the season's end: the review card covers the map
    this.gaveUp = evs.flatMap((e) => (e.t === 'gaveUp' ? [e.at] : []));
    const now = this.cars(this.moving);
    const parks = evs.filter((e): e is Park => e.t === 'park');
    const gos = evs.filter((e): e is Go => e.t === 'parkGo');
    this.events += parks.length + gos.length;
    for (const e of parks) this.onPark(e, now);
    this.checkStanding();
    this.checkMoving(now, gos);
    this.moving = now;
  }

  private phaseWhy(): string {
    const c = this.c;
    const just = (at: number): boolean => c.clock >= at - STEP / 2 && c.clock < at + VIEW_LAG;
    if (just(NIGHT_END)) return 'night sweep';
    if (just(WEEKEND_AT)) return 'workday close';
    return '';
  }

  private onPark(e: Park, now: Map<number, Moving>): void {
    if (e.dir === 'out') { this.goingOut.add(e.car); return; }
    this.goingOut.delete(e.car);
    if (e.slot >= 0) this.comingIn.add(e.car);
    if (e.seconds <= 0 && e.slot >= 0) return; // back into its slot from the edge
    // The car it was: holding its lane now, or (a door, at once) gone from the road this step.
    for (const m of now.values()) if (m.state === 4 && Math.hypot(m.x - e.lane.x, m.y - e.lane.y) < SAME_POSE) m.matched = true;
    for (const [uid, m] of this.moving) if (!now.has(uid) && (uid === e.car || Math.hypot(m.x - e.lane.x, m.y - e.lane.y) < m.v * STEP + SAME_POSE)) m.matched = true;
  }

  private checkStanding(): void {
    const next = this.listed();
    const why = this.phaseWhy();
    const keys = new Set([...this.c.day.spots.keys()]);
    for (const [uid, at] of next) {
      const was = this.standing.get(uid);
      if (was === undefined) {
        if (this.comingIn.delete(uid)) continue;
        this.flag(why || 'parked car appears', uid, at);
      } else if (was !== at) this.flag(why || (keys.has(was.split('#')[0]!) ? 'parked car changes slot' : 'place gone: moved'), uid, `${was} -> ${at}`);
    }
    for (const [uid, at] of this.standing) {
      if (next.has(uid)) continue;
      if (this.goingOut.delete(uid)) continue;
      this.flag(why || (keys.has(at.split('#')[0]!) ? 'parked car disappears' : 'place gone: removed'), uid, at);
    }
    this.standing = next;
  }

  private legOf(m: Moving): string {
    const leg = this.c.day.legs[m.tag];
    if (!leg) return 'no leg';
    const t = leg.tour;
    const to = 'gate' in leg.target ? 'gate' : leg.spot?.kind ?? 'none';
    return `${leg.mode}/${t.purpose}/${leg.car === null ? 'visitor' : 'household'}/${leg.out ? 'out' : 'home'}/to ${to}`;
  }

  private checkMoving(now: Map<number, Moving>, gos: readonly Go[]): void {
    const why = this.phaseWhy();
    for (const [uid, m] of now) {
      const was = this.moving.get(uid);
      if (!was) {
        if (this.nearGate(m) || m.state === 4) continue; // state 4 is never drawn by the car layer
        if (gos.some((g) => g.uid === uid || (m.state === 4 && Math.hypot(g.lane.x - m.x, g.lane.y - m.y) < SAME_POSE))) continue;
        const swap = m.state >= 2 && m.state <= 3 && [...this.moving].some(([u, o]) => !now.has(u) && Math.hypot(o.x - m.x, o.y - m.y) < SWAP_REACH);
        this.flag(why || (m.state === 2 ? (swap ? 'double-park: block car appears' : 'block car appears') : m.state === 3 ? 'breakdown appears' : `moving car appears (${this.legOf(m)})`), uid, `${m.x.toFixed(0)},${m.y.toFixed(0)}`);
        continue;
      }
      if (m.state === 4) continue; // holding its lane: the manoeuvre draws it, from the pose the 'park' event gave
      const d = Math.hypot(m.x - was.x, m.y - was.y);
      const allowed = (Math.max(m.v, was.v) + ACCEL * STEP) * STEP * Math.max(1, this.c.weather.speed) + JUMP_SLACK;
      if (d > allowed) this.flag(why || 'moving car jumps', uid, `${d.toFixed(1)}px > ${allowed.toFixed(1)} state ${was.state}->${m.state}`);
    }
    for (const [uid, m] of this.moving) {
      if (now.has(uid) || this.nearGate(m) || m.state === 4) continue;
      if (m.matched) continue;
      if (this.gaveUp.some((g) => Math.hypot(g.x - m.x, g.y - m.y) < SAME_POSE * 4)) { this.flag(why || `gave up in a jam (${this.legOf(m)})`, uid, `${m.x.toFixed(0)},${m.y.toFixed(0)}`); continue; }
      this.flag(why || (m.state === 2 ? 'block car vanishes' : m.state === 3 ? 'breakdown vanishes' : `moving car vanishes (${this.legOf(m)})`), uid, `${m.x.toFixed(0)},${m.y.toFixed(0)} state ${m.state}`);
    }
  }

  /** Steps until the day phase ends (the season's review). */
  season(): void {
    while (this.v.phase === 'day') this.step();
  }

  counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const f of this.found) out[f.cause] = (out[f.cause] ?? 0) + 1;
    return out;
  }
}
