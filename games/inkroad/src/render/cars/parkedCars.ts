import type Phaser from 'phaser';
import type { CityView, ParkingView, Pt } from '../../sim/types';
import { lotRect } from '../../city/geometry';
import { dressCar } from './carDress';
import type { CarLayer } from './carLayer';
import { layoutPlace, makeGeo, type ParkingGeo } from './parkingSlots';

export { baysOf } from './parkingSlots';

interface Shown { view: ParkingView; imgs: Phaser.GameObjects.Image[]; uids: number[] }

/** Where a parked car stands (or, for a car park with no bays, its mouth), kept after it leaves so its pull-out can start there. */
export interface Placed {
  readonly x: number; readonly y: number; readonly a: number;
  readonly rect?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  /** A car park bay reached by the aisle: gate, aisle, the bay's column. */
  readonly via?: readonly Pt[];
}

/** A car that left stays known this many list changes, so an event that comes late still finds it. */
const KEEP_CHANGES = 2000;

/**
 * Every car the city says is standing somewhere (`city.parking`), drawn at its own slot.
 * Images are pooled; only places whose view object changed are laid out again.
 * A car in `held` is mid-manoeuvre: its image waits until `reveal`.
 */
export class ParkedCars {
  private readonly shown = new Map<string, Shown>();
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly poses = new Map<number, Placed>();
  private readonly retired = new Map<number, number>();
  private readonly held = new Set<number>();
  private changes = 0;
  private last: CityView['parking'] = undefined;
  private geoKey: readonly unknown[] = [];
  private geo: ParkingGeo | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly cars: CarLayer, private readonly depth: number) {}

  sync(city: CityView): void {
    const list = city.parking;
    if (!list) { if (this.last) this.clear(); return; }
    const key = [city.roads, city.lots, city.carParks, city.beaches];
    const moved = key.some((k, i) => k !== this.geoKey[i]);
    if (list === this.last && !moved) return;
    if (moved) { this.geo = makeGeo(city); this.geoKey = key; }
    const geo = this.geo ?? (this.geo = makeGeo(city));
    this.changes++;
    const seen = new Set<string>();
    for (const v of list) {
      seen.add(v.key);
      const had = this.shown.get(v.key);
      if (had && had.view === v && !moved) continue;
      this.place(v, had, geo);
    }
    for (const [k, s] of this.shown) {
      if (seen.has(k)) continue;
      this.release(s.imgs, 0);
      s.uids.forEach((u) => this.retire(u));
      this.shown.delete(k);
    }
    this.last = list;
    this.purge();
  }

  /** Where this car stands (or stood a moment ago). */
  poseOf(uid: number): Placed | undefined {
    return this.poses.get(uid);
  }

  /** A building's entrance, for a car that turns into it (or comes out) with no space of its own drawn: `lot:ID` or `park:ID`. */
  door(key: string): Placed | undefined {
    const geo = this.geo;
    const [kind, id] = key.split(':');
    const where = !geo || id === undefined ? undefined : kind === 'lot' ? geo.lots.get(Number(id)) : kind === 'park' ? geo.parks.get(Number(id)) : undefined;
    if (!where) return undefined;
    const r = lotRect(where);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, a: 0, rect: r };
  }

  /** Its picture waits while the manoeuvre draws it. */
  hold(uid: number): void {
    if (this.held.has(uid)) return;
    this.held.add(uid);
    this.redo(uid);
  }

  /** The manoeuvre is over: the car stands in its slot. */
  unhold(uid: number): void {
    if (this.held.delete(uid)) this.redo(uid);
  }

  private redo(uid: number): void {
    if (!this.geo) return;
    for (const s of this.shown.values()) if (s.uids.includes(uid)) { this.place(s.view, s, this.geo); return; }
  }

  private place(v: ParkingView, had: Shown | undefined, geo: ParkingGeo): void {
    const slots = layoutPlace(v, geo);
    const imgs = had?.imgs ?? [];
    const old = had?.uids ?? [];
    const uids: number[] = [];
    let used = 0;
    v.cars.forEach((c, i) => {
      const s = slots[i];
      if (!s) { this.mouth(v, c.uid, geo); uids.push(c.uid); return; }
      uids.push(c.uid);
      this.poses.set(c.uid, s.via ? { x: s.x, y: s.y, a: s.a, via: s.via } : { x: s.x, y: s.y, a: s.a });
      this.retired.delete(c.uid);
      if (this.held.has(c.uid)) return;
      const img = imgs[used] ?? this.take();
      imgs[used++] = img;
      dressCar(img, this.cars, c.kind, c.tint, s.x, s.y, s.a);
    });
    this.release(imgs, used);
    const kept = new Set(uids);
    for (const u of old) if (!kept.has(u)) this.retire(u);
    this.shown.set(v.key, { view: v, imgs, uids });
  }

  /** A multi-storey or underground car park draws no bays: its cars drive into the mouth. */
  private mouth(v: ParkingView, uid: number, geo: ParkingGeo): void {
    const park = v.kind === 'park' && v.park !== undefined ? geo.parks.get(v.park) : undefined;
    if (!park) return;
    const r = lotRect(park);
    this.poses.set(uid, { x: r.x + r.w / 2, y: r.y + r.h / 2, a: 0, rect: r });
    this.retired.delete(uid);
  }

  private retire(uid: number): void {
    this.retired.set(uid, this.changes);
  }

  private purge(): void {
    for (const [u, at] of this.retired) {
      if (this.changes - at < KEEP_CHANGES) continue;
      this.retired.delete(u);
      this.poses.delete(u);
      this.held.delete(u);
    }
  }

  private take(): Phaser.GameObjects.Image {
    return this.pool.pop() ?? this.scene.add.image(0, 0, '__DEFAULT').setDepth(this.depth);
  }

  /** Hands back the images beyond `keep` to the pool. */
  private release(imgs: Phaser.GameObjects.Image[], keep: number): void {
    while (imgs.length > keep) this.pool.push(imgs.pop()!.setVisible(false));
  }

  clear(): void {
    for (const s of this.shown.values()) this.release(s.imgs, 0);
    this.shown.clear();
    this.poses.clear();
    this.retired.clear();
    this.held.clear();
    this.last = undefined;
    this.geo = null;
    this.geoKey = [];
  }
}
