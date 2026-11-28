import Phaser from 'phaser';
import { VEHICLES } from '../../sim/constants';
import type { CarsView, VehicleKind } from '../../sim/types';
import { DECK_CAR_LIFT, tierLift, UNDER } from '../deckHeight';
import { clamp, type Box } from '../geom';
import type { AtlasFrame } from '../atlas';
import type { Pictures } from '../pictures';
import { projectAngle, projectY, TILT } from '../projection';
import { drawnAt, type DrawnPose } from './drawnPose';
import { buildCarAtlas, carOrigin, headingFrame, HEADINGS, paintOf, type CarFrames } from './carAtlas';

/**
 * Draws every car: one pooled image per slot of CarsView, played through the
 * vehicle model's frames of the sim's last step (src/sim/drawn.ts) at 60 fps
 * whatever the speed. Cars on a deck sort among the buildings; the rest lie on
 * the road under everything.
 */
export interface CarDepths { readonly ground: number; /** Uprights: base + plan y. */ readonly upright: number }

/** A jump further than this is a new car, not a move. */
const TELEPORT = 60;
/** Any higher than this and it is on a ramp: above the deck's first slice. */
const RAMP_FOOT = 0.03;
const MAX_STEP_S = 0.14;
const EASE_RATE = 0.2;
/** CarsView.state of a car parking or leaving a space. */
const HOLDING = 4;

interface Slot {
  img: Phaser.GameObjects.Image;
  /** Car slot in CarsView and where it was last drawn. */
  i: number;
  x1: number; y1: number; z1: number;
  uid: number;
  kind: number; tint: number; frame: number; deck: boolean;
  slowing: boolean; speed: number;
  /** In state 4 (parking or leaving): the manoeuvre layer draws it, this one waits where it is. */
  held: boolean;
}

/** Scratch pose (one frame at a time). */
const AT: DrawnPose = { x: 0, y: 0, z: 0, a: 0 };

export interface CarPose { readonly x: number; readonly y: number; readonly z: number; readonly a: number; readonly len: number; readonly wid: number; readonly slowing: boolean }

export class CarLayer {
  private readonly frames: readonly (readonly CarFrames[])[];
  private readonly origins: readonly { readonly x: number; readonly y: number }[];
  private readonly layer: Phaser.GameObjects.Layer;
  private slots: (Slot | null)[] = [];
  private lastClock = -1;
  private sinceStep = 0;
  private interval = 0.1;
  drawn = 0;
  private cars: CarsView | null = null;
  /** Cars here are inside a tunnel: not drawn. */
  private hidden: (x: number, y: number) => boolean = () => false;

  constructor(private readonly scene: Phaser.Scene, pics: Pictures, private readonly depths: CarDepths) {
    this.frames = buildCarAtlas(scene.textures, pics);
    this.origins = VEHICLES.map((k) => carOrigin(k as VehicleKind));
    this.layer = scene.add.layer().setDepth(depths.ground);
  }

  setHidden(fn: (x: number, y: number) => boolean): void {
    this.hidden = fn;
  }

  /** `stamp` changes whenever the sim has stepped (the city's clock). */
  update(cars: CarsView, stamp: number, dt: number, view: Box, alpha: number): void {
    this.cars = cars;
    this.sinceStep += dt;
    if (stamp !== this.lastClock) this.take(cars, stamp);
    const t = clamp(this.sinceStep / this.interval, 0, 1);
    this.layer.setVisible(alpha > 0.02);
    this.drawn = 0;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s) this.draw(s, t, view, alpha);
    }
  }

  /** A new sim step: its frames are played from now on. */
  private take(cars: CarsView, stamp: number): void {
    if (this.lastClock >= 0) this.interval += (clamp(this.sinceStep, 1 / 120, MAX_STEP_S) - this.interval) * EASE_RATE;
    this.lastClock = stamp;
    this.sinceStep = 0;
    for (let i = 0; i < Math.max(cars.count, this.slots.length); i++) {
      const alive = i < cars.count && cars.alive[i] === 1;
      const s = this.slots[i] ?? null;
      if (!alive) { if (s && s.uid !== 0) { s.uid = 0; s.held = false; s.img.setVisible(false); } continue; }
      if (cars.state[i] === HOLDING) {
        const h = s ?? this.make(i);
        h.uid = cars.uid[i]!;
        h.held = true;
        h.img.setVisible(false);
        continue;
      }
      this.takeSlot(cars, i, s ?? this.make(i));
    }
  }

  private make(i: number): Slot {
    const img = new Phaser.GameObjects.Image(this.scene, 0, 0, 'cars-0').setVisible(false);
    this.layer.add(img);
    const s: Slot = { img, i, uid: 0, x1: 0, y1: 0, z1: 0, kind: -1, tint: -1, frame: -1, deck: false, slowing: false, speed: 0, held: false };
    while (this.slots.length <= i) this.slots.push(null);
    this.slots[i] = s;
    return s;
  }

  private takeSlot(c: CarsView, i: number, s: Slot): void {
    const start = drawnAt(c, i, 0, AT);
    const resumed = s.held && s.uid === c.uid[i];
    s.held = false;
    const fresh = resumed || s.uid !== c.uid[i] || Math.hypot(start.x - s.x1, start.y - s.y1) > TELEPORT;
    if (fresh) {
      s.uid = c.uid[i]!;
      s.kind = c.kind[i]!;
      s.tint = c.tint[i]!;
      s.frame = -1;
      const o = this.origins[s.kind]!;
      s.img.setOrigin(o.x, o.y);
    }
    s.x1 = c.x[i]!; s.y1 = c.y[i]!; s.z1 = c.z[i]!;
    const v = c.speed[i]!;
    s.slowing = v < s.speed - 1.2 || (v < 3 && s.speed < 3);
    s.speed = v;
  }

  private draw(s: Slot, t: number, view: Box, alpha: number): void {
    if (s.uid === 0 || s.held || !this.cars) return;
    const { x, y, z, a } = drawnAt(this.cars, s.i, t, AT);
    const seen = z > UNDER && x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1 && !(z < 0.5 && this.hidden(x, y));
    if (s.img.visible !== seen) s.img.setVisible(seen);
    if (!seen) return;
    this.drawn++;
    const { index, rest } = headingFrame(a);
    if (index !== s.frame) this.setFrame(s, index);
    const step = (index * Math.PI * 2) / HEADINGS;
    s.img.setPosition(x, projectY(y, Math.max(0, z)));
    s.img.rotation = projectAngle(step + rest) - projectAngle(step);
    s.img.alpha = alpha * (z < 0 ? clamp(1 - z / UNDER, 0, 1) : 1);
    this.lift(s, z > RAMP_FOOT, y, z);
  }

  private setFrame(s: Slot, index: number): void {
    const byTint = this.frames[s.kind] ?? this.frames[0]!;
    const f = byTint[paintOf(VEHICLES[s.kind] as VehicleKind, s.tint, byTint.length)]!.frames[index]!;
    s.img.setTexture(f.texture, f.frame).setScale(1 / f.scale);
    const o = this.origins[s.kind]!;
    s.img.setOrigin(o.x, o.y);
    s.frame = index;
  }

  /** Onto a deck: out of the road layer, sorted with the uprights just above its stretch of deck. */
  private lift(s: Slot, deck: boolean, y: number, z: number): void {
    if (deck !== s.deck) {
      s.deck = deck;
      if (deck) { this.layer.remove(s.img); s.img.addToDisplayList(); }
      else { s.img.removeFromDisplayList(); this.layer.add(s.img); }
    }
    if (deck) s.img.setDepth(this.depths.upright + y + DECK_CAR_LIFT + tierLift(z));
  }

  /** Every car drawn, where it is drawn (for lights and puffs). */
  pose(i: number, out: { x: number; y: number; z: number; a: number; len: number; wid: number; slowing: boolean }): boolean {
    const s = this.slots[i];
    if (!s || s.uid === 0 || !s.img.visible) return false;
    const t = clamp(this.sinceStep / this.interval, 0, 1);
    const f = this.frames[s.kind]?.[0];
    if (this.cars) drawnAt(this.cars, s.i, t, AT);
    out.x = AT.x; out.y = AT.y; out.z = AT.z; out.a = AT.a;
    out.len = f?.len ?? 14;
    out.wid = f?.wid ?? 7;
    out.slowing = s.slowing;
    return true;
  }

  /** The picture of a vehicle at a heading (parked cars borrow it). */
  frame(kind: number, tint: number, heading: number): AtlasFrame {
    const byTint = this.frames[kind] ?? this.frames[0]!;
    // The same paint rule as moving cars, so a vehicle never changes look as it parks.
    return byTint[paintOf((VEHICLES[kind] ?? 'car') as VehicleKind, tint, byTint.length)]!.frames[heading]!;
  }

  get size(): number { return this.slots.length; }

  /** The car nearest a plan point, within `reach`. */
  pick(x: number, y: number, reach: number): { readonly slot: number; readonly uid: number } | null {
    let best = -1;
    let d = reach;
    this.slots.forEach((s, i) => {
      if (!s || s.uid === 0 || !s.img.visible) return;
      const k = Math.hypot(s.x1 - x, (projectY(s.y1, Math.max(0, s.z1)) - y * TILT) / TILT);
      if (k < d) { d = k; best = i; }
    });
    return best < 0 ? null : { slot: best, uid: this.slots[best]!.uid };
  }

  /** A departing vehicle is still reserved in traffic while the manoeuvre layer draws it. */
  holdingLane(uid: number): boolean {
    return this.slots.some((s) => s?.uid === uid && s.held);
  }

  /** Is this still the same car? */
  holds(i: number, uid: number): boolean {
    return this.slots[i]?.uid === uid;
  }

  /** Up to n cars drawn within reach of a place. */
  near(x: number, y: number, reach: number, n: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (const s of this.slots) {
      if (out.length >= n) break;
      if (s && s.uid !== 0 && s.img.visible && Math.hypot(s.x1 - x, s.y1 - y) < reach) out.push({ x: s.x1, y: s.y1 });
    }
    return out;
  }

  clear(): void {
    for (const s of this.slots) s?.img.destroy();
    this.slots = [];
    this.lastClock = -1;
  }
}
