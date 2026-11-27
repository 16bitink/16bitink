import Phaser from 'phaser';
import { VEHICLES } from '../../sim/constants';
import type { CarsView, VehicleKind } from '../../sim/types';
import { DECK_CAR_LIFT, tierLift, UNDER } from '../deckHeight';
import { clamp, type Box } from '../geom';
import type { AtlasFrame } from '../atlas';
import type { Pictures } from '../pictures';
import { projectAngle, projectY, TILT } from '../projection';
import { glideAt, type Glide, type GlidePose } from './glide';
import { buildCarAtlas, carOrigin, headingFrame, HEADINGS, paintOf, type CarFrames } from './carAtlas';

/**
 * Draws every car: one pooled image per slot of CarsView, eased between the
 * sim's 10 Hz steps so it glides at 60 fps whatever the speed. Cars on a deck
 * sort among the buildings; the rest lie on the road under everything.
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

interface Slot extends Glide {
  img: Phaser.GameObjects.Image;
  uid: number;
  kind: number; tint: number; frame: number; deck: boolean; born: number;
  slowing: boolean; speed: number;
  /** In state 4 (parking or leaving): the manoeuvre layer draws it, this one waits where it is. */
  held: boolean;
}

/** Scratch pose of the glide (one frame at a time). */
const AT: GlidePose = { x: 0, y: 0, z: 0, a: 0 };

export interface CarPose { readonly x: number; readonly y: number; readonly z: number; readonly a: number; readonly len: number; readonly wid: number; readonly slowing: boolean }

export class CarLayer {
  private readonly frames: readonly (readonly CarFrames[])[];
  private readonly origins: readonly { readonly x: number; readonly y: number }[];
  private readonly layer: Phaser.GameObjects.Layer;
  private slots: (Slot | null)[] = [];
  private lastClock = -1;
  private sinceStep = 0;
  private interval = 0.1;
  private now = 0;
  drawn = 0;
  /** Traffic uids handed over by a pull-out: drawn at once, without fading in. */
  private readonly expected = new Set<number>();
  /** Cars here are inside a tunnel: not drawn. */
  private hidden: (x: number, y: number) => boolean = () => false;

  constructor(private readonly scene: Phaser.Scene, pics: Pictures, private readonly depths: CarDepths) {
    this.frames = buildCarAtlas(scene.textures, pics);
    this.origins = VEHICLES.map((k) => carOrigin(k as VehicleKind));
    this.layer = scene.add.layer().setDepth(depths.ground);
  }

  /** A car pulling out of a space (drawn by the manoeuvre layer until now) joins the road as this traffic uid. */
  expect(uid: number): void {
    this.expected.add(uid);
  }

  setHidden(fn: (x: number, y: number) => boolean): void {
    this.hidden = fn;
  }

  /** `stamp` changes whenever the sim has stepped (the city's clock). */
  update(cars: CarsView, stamp: number, dt: number, view: Box, alpha: number): void {
    this.now += dt;
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

  /** A new sim step: where each car is drawn now becomes the start of its next glide. */
  private take(cars: CarsView, stamp: number): void {
    if (this.lastClock >= 0) this.interval += (clamp(this.sinceStep, 1 / 120, MAX_STEP_S) - this.interval) * EASE_RATE;
    const t = clamp(this.sinceStep / this.interval, 0, 1);
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
      this.takeSlot(cars, i, s ?? this.make(i), t);
    }
  }

  private make(i: number): Slot {
    const img = new Phaser.GameObjects.Image(this.scene, 0, 0, 'cars-0').setVisible(false);
    this.layer.add(img);
    const s: Slot = { img, uid: 0, x0: 0, y0: 0, z0: 0, a0: 0, x1: 0, y1: 0, z1: 0, a1: 0, kind: -1, tint: -1, frame: -1, deck: false, born: 0, slowing: false, speed: 0, held: false };
    while (this.slots.length <= i) this.slots.push(null);
    this.slots[i] = s;
    return s;
  }

  private takeSlot(c: CarsView, i: number, s: Slot, t: number): void {
    const x = c.x[i]!, y = c.y[i]!, z = c.z[i]!, a = c.heading[i]!;
    const resumed = s.held && s.uid === c.uid[i];
    s.held = false;
    const fresh = resumed || s.uid !== c.uid[i] || Math.hypot(x - s.x1, y - s.y1) > TELEPORT;
    if (fresh) {
      s.uid = c.uid[i]!;
      s.x0 = x; s.y0 = y; s.z0 = z; s.a0 = a;
      // A car that stood in its space (drawn by the manoeuvre layer) picks up from the lane without fading in.
      s.born = resumed || this.expected.delete(c.uid[i]!) ? this.now - 1 : this.now;
      s.kind = c.kind[i]!;
      s.tint = c.tint[i]!;
      s.frame = -1;
      const o = this.origins[s.kind]!;
      s.img.setOrigin(o.x, o.y);
    } else {
      glideAt(s, t, AT);
      s.x0 = AT.x; s.y0 = AT.y; s.z0 = AT.z; s.a0 = AT.a;
    }
    s.x1 = x; s.y1 = y; s.z1 = z; s.a1 = a;
    const v = c.speed[i]!;
    s.slowing = v < s.speed - 1.2 || (v < 3 && s.speed < 3);
    s.speed = v;
  }

  private draw(s: Slot, t: number, view: Box, alpha: number): void {
    if (s.uid === 0 || s.held) return;
    const { x, y, z, a } = glideAt(s, t, AT);
    const seen = z > UNDER && x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1 && !(z < 0.5 && this.hidden(x, y));
    if (s.img.visible !== seen) s.img.setVisible(seen);
    if (!seen) return;
    this.drawn++;
    const { index, rest } = headingFrame(a);
    if (index !== s.frame) this.setFrame(s, index);
    const step = (index * Math.PI * 2) / HEADINGS;
    s.img.setPosition(x, projectY(y, Math.max(0, z)));
    s.img.rotation = projectAngle(step + rest) - projectAngle(step);
    s.img.alpha = alpha * Math.min(1, (this.now - s.born) * 5) * (z < 0 ? clamp(1 - z / UNDER, 0, 1) : 1);
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
    glideAt(s, t, AT);
    out.x = AT.x; out.y = AT.y; out.z = AT.z; out.a = AT.a;
    out.len = f?.len ?? 14;
    out.wid = f?.wid ?? 7;
    out.slowing = s.slowing;
    return true;
  }

  /** The picture of a vehicle at a heading (parked cars borrow it). */
  frame(kind: number, tint: number, heading: number): AtlasFrame {
    const byTint = this.frames[kind] ?? this.frames[0]!;
    return byTint[tint % byTint.length]!.frames[heading]!;
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
