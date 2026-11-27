import { greensOf, spriteKeys, type Greens, type SpriteName } from '../../art/manifest';
import { lotRect } from '../../city/geometry';
import { CELL } from '../../sim/constants';
import type { CityView, Lot, Pt } from '../../sim/types';
import { boxesMeet, boxOf, dist, lineLength, nearestOnLine, pointAt, type Box } from '../geom';
import { coneSpots } from '../ground/roadExtras';
import { islandSpots } from '../ground/island';
import { kerbOf, type RoadScene, type RoadShape } from '../ground/roadShape';
import { fieldAt, fullExtent, scatter } from '../ground/terrain';
import { planned } from '../ground/lotsGround';
import { fbm, hash2 } from '../noise';
import { beachProps } from './beachProps';
import { extraPlants } from './greenery';
import type { Thing, Things } from './things';

/** Trees, shrubs and rocks where nothing is built, and what stands along the roads. */
const STEP = 44;
const APRON_STEP = 62;
const SHORE_STEP = 26;
const BEACH_STEP = 34;
const ROAD_GAP = 9;
const LOT_GAP = 7;
const KIOSK_KINDS: readonly string[] = ['park', 'school', 'market', 'stadium', 'mall'];
const OVERHANG = 20; // plan px of road a tree to its south would cover
const MEDIAN_STEP = 58;
const VERGE_STEP = 96;
const STREET_TREE_STEP = 52;

interface Plant { readonly name: SpriteName; readonly at: Pt; readonly size: number; thing: Thing | null }

const variantKey = (name: SpriteName, roll: number): string => {
  const keys = spriteKeys(name);
  return keys[Math.min(keys.length - 1, Math.floor(roll * keys.length))]!;
};

export class Scenery {
  private plants: Plant[] = [];
  private props: Thing[] = [];
  private taken: (p: Pt, gap?: number, ignore?: RoadShape) => boolean = () => false;
  /** Where the street lamps stand, for the night. */
  lampSpots: Pt[] = [];

  private readonly style: string;

  constructor(private readonly things: Things, city: CityView) {
    this.style = city.def.style;
    this.sow(city, greensOf(city.def.style));
  }

  private sow(city: CityView, greens: Greens): void {
    const rows = city.def.map;
    const e = fullExtent(rows);
    const inner = { x0: 0, y0: 0, x1: ((rows[0]?.length ?? 1) - 1) * CELL, y1: (rows.length - 1) * CELL };
    const inside = (p: Pt): boolean => p.x > inner.x0 && p.y > inner.y0 && p.x < inner.x1 && p.y < inner.y1;
    const dry = (p: Pt): boolean => fieldAt(rows, '~', p.x, p.y) < 0.16;
    const lush = (p: Pt): number => fbm(p.x / 210, p.y / 210, 3, 91);
    for (const p of scatter(e, STEP, 5, (q, r) => inside(q) && dry(q) && r < this.density(rows, q, lush(q)))) this.plant(rows, greens, p, lush(p));
    for (const p of scatter(e, APRON_STEP, 8, (q, r) => !inside(q) && dry(q) && r < (fieldAt(rows, '#', q.x, q.y) > 0.35 ? 0.9 : 0.12) + Math.max(0, lush(q) - 0.45) * 1.6)) this.plant(rows, greens, p, lush(p));
    if (greens.beach) for (const p of scatter(inner, BEACH_STEP, 31, (q, r) => r < 0.34 && beach(rows, q))) this.put('prop/sunshade', p, 0.95);
    extraPlants(city.def.style, { rows, extent: e, inside, dry }, greens, (n, at, size) => this.put(n, at, size));
    for (const p of scatter(e, SHORE_STEP, 12, (q, r) => r < 0.4 && shore(rows, q))) this.put(greens.rock, p, 0.55 + 0.5 * hash2(p.x, p.y, 2));
  }

  private density(rows: readonly string[], p: Pt, lush: number): number {
    if (fieldAt(rows, 'p', p.x, p.y) > 0.5) return 0.75;
    if (fieldAt(rows, '#', p.x, p.y) > 0.35) return 0.95;
    return 0.1 + Math.max(0, lush - 0.46) * 2.8;
  }

  private plant(rows: readonly string[], greens: Greens, p: Pt, lush: number): void {
    const roll = hash2(p.x, p.y, 61);
    const size = 0.82 + 0.3 * hash2(p.y, p.x, 62);
    if (fieldAt(rows, '#', p.x, p.y) > 0.35) {
      this.put(greens.rock, p, size * 1.5);
      return this.put(greens.rock, { x: p.x + 17, y: p.y + 13 }, size * 0.8);
    }
    const park = fieldAt(rows, 'p', p.x, p.y) > 0.5;
    if (roll < (park ? 0.15 : 0.42)) return this.put(greens.shrub, p, size * 0.8);
    if (roll > 0.93 && !park) return this.put(greens.rock, p, size * 0.7);
    const set = park && roll > 0.5 ? greens.round : greens.tall;
    this.put(set[Math.floor(hash2(p.x, p.y, 63) * set.length)]!, p, size);
    if (lush > 0.6 && roll > 0.7) this.put(greens.shrub, { x: p.x + 9, y: p.y + 5 }, size * 0.7);
  }

  private put(name: SpriteName, at: Pt, size: number): void {
    this.plants.push({ name, at, size, thing: null });
  }

  /** Show the plants on free ground and rebuild what stands on the roads. */
  refresh(city: CityView, scene: RoadScene): void {
    const taken = takenBy(city, scene);
    for (const p of this.plants) {
      const free = !taken(p.at) && !taken({ x: p.at.x, y: p.at.y - OVERHANG * p.size });
      if (free && !p.thing) p.thing = this.things.add(this.things.atlas.sprite(variantKey(p.name, hash2(p.at.x, p.at.y, 64))), p.at.x, p.at.y, { size: p.size, flip: hash2(p.at.y, p.at.x, 65) > 0.5 });
      if (p.thing) this.things.show(p.thing, free);
    }
    this.taken = taken;
    this.props.forEach((t) => this.things.remove(t));
    this.props = [];
    this.lampSpots = [];
    const greens = greensOf(city.def.style);
    const rows = city.def.map;
    for (const b of city.beaches ?? []) beachProps(b, (q) => fieldAt(rows, '~', q.x, q.y) < 0.12, (n, p, z) => this.prop(n, p, z));
    for (const j of scene.joins) if (j.kind === 'ring') for (const s of islandSpots(j)) this.prop(greens.tall[0]!, s, s.big ? 0.62 : 0.5);
    for (const r of scene.roads) this.alongRoad(r, greens);
    for (const l of city.lots) {
      if (l.level === 0) continue;
      const r = lotRect(l);
      if (l.kind === 'park' || l.kind === 'square') this.inGarden(r, greens, l.id);
      if (KIOSK_KINDS.includes(l.kind)) this.prop('prop/kiosk', { x: r.x + r.w + 9, y: r.y + r.h - 4 }, 0.95);
      if (l.kind === 'fuel') this.prop('prop/fuel-sign', { x: r.x + r.w + 6, y: r.y + r.h - 2 }, 0.8);
      if (l.kind === 'park') this.prop('prop/sunshade', { x: r.x + r.w * 0.5 + 20, y: r.y + r.h * 0.5 + 4 }, 0.85);
    }
  }

  private alongRoad(r: RoadShape, greens: Greens): void {
    if (r.road.flyover || r.waits) return;
    for (const c of coneSpots(r)) this.prop('prop/cone', c, 1.1);
    if (r.road.works > 0) this.worksKit(r);
    if (r.road.toll) this.gantry(r);
    if (r.median >= 5 && !r.road.bridge) this.row(r, MEDIAN_STEP, 0, greens.tall[0]!, 0.55);
    if (r.road.type !== 'street' && !r.road.bridge) this.lamps(r);
    if (!r.road.bridge && r.len > 120) this.streetTrees(r, greens);
  }

  private row(r: RoadShape, step: number, off: number, name: SpriteName, size: number, free = false): void {
    const len = lineLength(r.inner);
    const n = Math.floor((len - 16) / step);
    for (let i = 0; i <= n; i++) {
      const p = pointAt(r.inner, 8 + (len - 16) * ((i + 0.5) / (n + 1)));
      const at = { x: p.x - Math.sin(p.a) * off, y: p.y + Math.cos(p.a) * off };
      if (free && (this.taken(at, 3, r) || (name !== 'prop/lamp' && this.taken({ x: at.x, y: at.y - OVERHANG * size }, 3, r)))) continue;
      this.prop(name, at, size);
    }
  }

  /** Lamps on the far walk, so none stands between you and the road. */
  private lamps(r: RoadShape): void {
    const p = pointAt(r.line, r.len / 2);
    const north = Math.cos(p.a) >= 0 ? -1 : 1;
    this.row(r, VERGE_STEP, north * (r.half + kerbOf(r.road) - 1.2), 'prop/lamp', 0.85);
  }

  /** Street trees on the far walk (never between you and the road), and lamps on the streets of the old cities. */
  private streetTrees(r: RoadShape, greens: Greens): void {
    const p = pointAt(r.line, r.len / 2);
    const north = Math.cos(p.a) >= 0 ? -1 : 1;
    const off = north * (r.half + kerbOf(r.road) + 5);
    if (r.road.type !== 'street' || this.style === 'oldtown' || this.style === 'islands') this.row(r, STREET_TREE_STEP, off, greens.round[0]!, 0.6, true);
    if (r.road.type === 'street' && this.style !== 'gulf') this.row(r, VERGE_STEP * 1.3, north * (r.half + kerbOf(r.road) - 1.2), 'prop/lamp', 0.85, true);
  }

  private worksKit(r: RoadShape): void {
    const len = lineLength(r.inner);
    if (len < 40) return;
    const p = pointAt(r.inner, len / 2);
    const side = r.half * 0.5;
    this.prop('prop/digger', { x: p.x - Math.sin(p.a) * side, y: p.y + Math.cos(p.a) * side }, 0.9);
    for (const s of [len * 0.12, len * 0.88]) {
      const q = pointAt(r.inner, s);
      this.prop('prop/barrier', { x: q.x - Math.sin(q.a) * side, y: q.y + Math.cos(q.a) * side }, 0.9);
    }
  }

  /** Two posts of a toll gantry (the beam is drawn by the fx layer). */
  private gantry(r: RoadShape): void {
    const p = pointAt(r.road.line, lineLength(r.road.line) / 2);
    for (const side of [-1, 1]) {
      const off = side * (r.half + kerbOf(r.road));
      this.prop('prop/toll', { x: p.x - Math.sin(p.a) * off, y: p.y + Math.cos(p.a) * off }, 1);
    }
  }

  private inGarden(r: { x: number; y: number; w: number; h: number }, greens: Greens, seed: number): void {
    const box = { x0: r.x + 10, y0: r.y + 12, x1: r.x + r.w - 10, y1: r.y + r.h - 6 };
    const mid = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    for (const p of scatter(box, 21, seed + 40, (q, roll) => roll < 0.55 && dist(q, mid) > Math.min(r.w, r.h) * 0.22)) {
      const round = hash2(p.x, p.y, seed) > 0.45;
      const set = round ? greens.round : greens.tall;
      this.prop(hash2(p.y, p.x, seed) > 0.75 ? greens.shrub : set[0]!, p, 0.72);
    }
  }

  private prop(name: SpriteName, at: Pt, size: number): void {
    if (name === 'prop/lamp') this.lampSpots.push(at);
    this.props.push(this.things.add(this.things.atlas.sprite(variantKey(name, hash2(Math.round(at.x), Math.round(at.y), 71))), at.x, at.y, { size, shadow: name !== 'prop/lamp' }));
  }
}

/** Dry sand just above the water line, in patches. */
const beach = (rows: readonly string[], p: Pt): boolean => {
  const f = fieldAt(rows, '~', p.x, p.y);
  return f > 0.04 && f < 0.24 && fbm(p.x / 190, p.y / 190, 2, 51) > 0.52;
};

const shore = (rows: readonly string[], p: Pt): boolean => {
  const f = fieldAt(rows, '~', p.x, p.y);
  return f > 0.4 && f < 0.62 && fbm(p.x / 130, p.y / 130, 2, 17) > 0.5;
};

/** Is a spot under a road, a building lot or a car park? */
function takenBy(city: CityView, scene: RoadScene): (p: Pt, gap?: number, ignore?: RoadShape) => boolean {
  const roads = scene.roads.map((r) => ({ r, box: boxOf(r.line, r.half + kerbOf(r.road) + ROAD_GAP + 4) }));
  const joins = scene.joins.filter((j) => j.kind !== 'ramp');
  const blocks: Box[] = [
    ...city.lots.filter((l) => l.level > 0 || planned(l, city.year)).map((l) => lotRect(l)),
    ...city.carParks.map((p) => lotRect(p)),
  ].map((r) => ({ x0: r.x - LOT_GAP, y0: r.y - LOT_GAP, x1: r.x + r.w + LOT_GAP, y1: r.y + r.h + LOT_GAP }));
  return (p, gap = ROAD_GAP, ignore) => {
    const b = { x0: p.x, y0: p.y, x1: p.x + 0.1, y1: p.y + 0.1 };
    if (blocks.some((k) => boxesMeet(k, b))) return true;
    if (joins.some((j) => Math.hypot(j.j.x - p.x, j.j.y - p.y) < j.j.radius + gap + 8)) return true;
    return roads.some(({ r, box }) => r !== ignore && boxesMeet(box, b) && nearestOnLine(r.line, p).d < r.half + kerbOf(r.road) + gap);
  };
}
