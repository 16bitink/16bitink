import type Phaser from 'phaser';
import { FOOTPRINTS, GARDEN_KIND, GROUND_KINDS, PLOT_KINDS, VARIANTS } from '../../art/manifest';
import { lotRect } from '../../city/geometry';
import { CELL } from '../../sim/constants';
import { gardenPlan, gardenVariant, isGarden } from '../gardenLayout';
import type { CarPark, CityView, Id, Lot } from '../../sim/types';
import type { Thing, Things } from './things';

/** Buildings on their lots: 2 x 2 plots for homes, shops and offices, one picture for the rest; they pop as they grow. */
const POP_MS = 620;
const POP_STAGGER_MS = 90;
const POP_FROM = 0.55;
const PLOT = 2; // cells

export interface PlotSpot { readonly x: number; readonly y: number; readonly size: number; readonly kind: string; readonly variant: number }

/** Where a lot's buildings stand (the middle of each footprint's south edge). */
export function plotSpots(l: Pick<Lot, 'id' | 'kind' | 'gx' | 'gy' | 'w' | 'h' | 'variant' | 'garden'>): PlotSpot[] {
  if (GROUND_KINDS.includes(l.kind)) return [];
  // A garden lot builds only its north two rows; the rest is front garden.
  const built = isGarden(l) && PLOT_KINDS.includes(l.kind) ? { ...l, h: PLOT } : l;
  const r = lotRect(built);
  if (!PLOT_KINDS.includes(l.kind)) {
    const [fw, fh] = FOOTPRINTS[l.kind] ?? [2, 2];
    const size = Math.min(1, l.w / fw, l.h / fh);
    return [{ x: r.x + r.w / 2, y: r.y + r.h / 2 + (fh * CELL * size) / 2, size, kind: l.kind, variant: l.variant }];
  }
  const cols = Math.max(1, Math.floor(built.w / PLOT));
  const rows = Math.max(1, Math.floor(built.h / PLOT));
  const size = Math.min(1, built.w / PLOT, built.h / PLOT);
  const cw = r.w / cols;
  const ch = r.h / rows;
  const out: PlotSpot[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out.push({ x: r.x + cw * (i + 0.5), y: r.y + ch * (j + 0.5) + (PLOT * CELL * size) / 2, size, kind: l.kind, variant: l.variant + l.id + i + j * 2 });
    }
  }
  return out;
}

/** A garden lot's front gardens: one painted piece under each plot column, standing on the lot's south edge. */
export function gardenSpots(l: Pick<Lot, 'id' | 'kind' | 'gx' | 'gy' | 'w' | 'h' | 'variant' | 'garden'>): PlotSpot[] {
  if (!isGarden(l) || !PLOT_KINDS.includes(l.kind)) return [];
  const n = VARIANTS[GARDEN_KIND] ?? 1;
  return gardenPlan(l).pieces.map((p, i) => ({ x: p.x, y: p.y, size: 1, kind: GARDEN_KIND, variant: gardenVariant(l, i, n) }));
}

interface Stand { level: number; things: Thing[] }

export class LotsView {
  private readonly lots = new Map<Id, Stand>();
  private readonly parks = new Map<Id, Thing[]>();
  private lastLots: readonly Lot[] | null = null;
  private lastParks: readonly CarPark[] | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly things: Things) {}

  /** Bring the buildings up to date. The first time nothing pops. */
  sync(city: CityView): void {
    const first = this.lastLots === null;
    if (city.lots !== this.lastLots) { this.lastLots = city.lots; this.syncLots(city.lots, first); }
    if (city.carParks !== this.lastParks) { this.lastParks = city.carParks; this.syncParks(city.carParks, first); }
  }

  private syncLots(lots: readonly Lot[], quiet: boolean): void {
    const seen = new Set<Id>();
    for (const l of lots) {
      seen.add(l.id);
      const s = this.lots.get(l.id);
      if (s?.level === l.level) continue;
      s?.things.forEach((t) => this.things.remove(t));
      const things = l.level === 0 ? [] : [...plotSpots(l), ...gardenSpots(l)].map((p) => this.things.add(this.things.atlas.building(p.kind, p.kind === GARDEN_KIND ? 1 : l.level, p.variant), p.x, p.y, { size: p.size }));
      this.lots.set(l.id, { level: l.level, things });
      if (!quiet) things.forEach((t, i) => this.pop(t, i));
    }
    this.drop(this.lots, seen, (s) => s.things);
  }

  private syncParks(parks: readonly CarPark[], quiet: boolean): void {
    const seen = new Set<Id>();
    for (const p of parks) {
      seen.add(p.id);
      if (this.parks.has(p.id)) continue;
      const r = lotRect(p);
      const tall = p.kind === 'multi' || p.kind === 'under';
      const things = tall ? [this.things.add(this.things.atlas.building(`park-${p.kind}`, 1, 0), r.x + r.w / 2, r.y + r.h, { size: Math.min(1, p.w / PLOT) })] : [];
      this.parks.set(p.id, things);
      if (!quiet) things.forEach((t, i) => this.pop(t, i));
    }
    this.drop(this.parks, seen, (t) => t);
  }

  private drop<T>(map: Map<Id, T>, keep: ReadonlySet<Id>, thingsOf: (v: T) => readonly Thing[]): void {
    for (const [id, v] of map) {
      if (keep.has(id)) continue;
      thingsOf(v).forEach((t) => this.things.remove(t));
      map.delete(id);
    }
  }

  private pop(t: Thing, i: number): void {
    const { scaleX, scaleY } = t.img;
    t.img.setScale(scaleX * POP_FROM, scaleY * 0.1).setAlpha(0);
    this.scene.tweens.add({ targets: t.img, scaleX, scaleY, alpha: this.things.fade, duration: POP_MS, delay: i * POP_STAGGER_MS, ease: 'Back.easeOut' });
  }

  clear(): void {
    this.lots.clear();
    this.parks.clear();
    this.lastLots = null;
    this.lastParks = null;
  }
}
