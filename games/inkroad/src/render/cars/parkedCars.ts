import type Phaser from 'phaser';
import { lotRect } from '../../city/geometry';
import type { CarPark, CityView, Id } from '../../sim/types';
import { hash2 } from '../noise';
import { projectY } from '../projection';
import { CAR_TINTS } from '../style';
import { carOrigin, HEADINGS } from './carAtlas';
import type { CarLayer } from './carLayer';

/** Cars standing in open car parks, as many as the sim says are used. */
const BAY = 13.2;
const EDGE = 17;
const ROW_IN = 18;
const UP = Math.round(HEADINGS * 0.75);
const DOWN = Math.round(HEADINGS * 0.25);

export interface Bay { readonly x: number; readonly y: number; readonly up: boolean }

/** Bays along the north and south edges. Pure. */
export function baysOf(p: Pick<CarPark, 'gx' | 'gy' | 'w' | 'h'>): Bay[] {
  const r = lotRect(p);
  const n = Math.floor((r.w - EDGE * 2) / BAY);
  const out: Bay[] = [];
  for (let i = 0; i < n; i++) {
    const x = r.x + EDGE + (i + 0.5) * ((r.w - EDGE * 2) / n);
    out.push({ x, y: r.y + ROW_IN, up: false }, { x, y: r.y + r.h - ROW_IN, up: true });
  }
  return out;
}

export class ParkedCars {
  private readonly shown = new Map<Id, Phaser.GameObjects.Image[]>();
  private last: readonly CarPark[] | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly cars: CarLayer, private readonly depth: number) {}

  sync(city: CityView): void {
    if (city.carParks === this.last) return;
    this.last = city.carParks;
    const keep = new Set<Id>();
    for (const p of city.carParks) {
      if (p.kind !== 'lot' && p.kind !== 'ride') continue;
      keep.add(p.id);
      this.fill(p);
    }
    for (const [id, imgs] of this.shown) {
      if (keep.has(id)) continue;
      imgs.forEach((i) => i.destroy());
      this.shown.delete(id);
    }
  }

  private fill(p: CarPark): void {
    const bays = baysOf(p);
    const want = Math.round(bays.length * Math.min(1, p.spaces > 0 ? p.used / p.spaces : 0));
    const imgs = this.shown.get(p.id) ?? [];
    this.shown.set(p.id, imgs);
    const order = bays.map((b, i) => ({ b, k: hash2(i, p.id, 9) })).sort((a, b) => a.k - b.k);
    while (imgs.length < want) {
      const { b, k } = order[imgs.length]!;
      imgs.push(this.car(b, Math.floor(k * 997) % CAR_TINTS.length));
    }
    while (imgs.length > want) imgs.pop()!.destroy();
  }

  private car(b: Bay, tint: number): Phaser.GameObjects.Image {
    const f = this.cars.frame(0, tint, b.up ? UP : DOWN);
    const o = carOrigin('car');
    return this.scene.add.image(b.x, projectY(b.y), f.texture, f.frame).setOrigin(o.x, o.y).setScale(1 / f.scale).setDepth(this.depth);
  }

  clear(): void {
    for (const imgs of this.shown.values()) imgs.forEach((i) => i.destroy());
    this.shown.clear();
    this.last = null;
  }
}
