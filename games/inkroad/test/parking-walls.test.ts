import { describe, expect, it } from 'vitest';
import { createCity } from '../src/city/city';
import { lotRect } from '../src/city/geometry';
import { PAID_CITIES } from '../content/paid';
import { pathPose, type Step } from '../src/render/cars/manoeuvrePath';
import { CAR_HALF_W, layoutPlace, makeGeo, modeOf } from '../src/render/cars/parkingSlots';
import { laneOffset, lanesPerLink } from '../src/sim/roadGeom';
import { pointAt } from '../src/render/geom';
import type { CityView, ParkingView } from '../src/sim/types';
import { cityAtYear, inner } from './city-helpers';

/**
 * "They drive into the walls": every home and private bay, and every frame of the move into it from the lane at the
 * lot's access (either way along the road), keeps the whole car out of every lot's footprint, and the move ends
 * exactly on the pose the parked picture uses.
 */
const HALF_LEN = 7;
/** Px a corner may touch a lot's edge (the painted wall line) without being inside it. */
const TOUCH = 0.5;
const FRAMES = 24;
const FILL = 24;

function harbourAt(year: number): CityView {
  const v = createCity(PAID_CITIES[0]!, 3);
  const c = inner(v);
  c.money = 9000;
  while (v.year < year) { c.phase = 'yearEnd'; v.apply({ t: 'next' }); }
  v.apply({ t: 'next' });
  return v;
}

const corners = (x: number, y: number, a: number): { x: number; y: number }[] => {
  const fx = Math.cos(a), fy = Math.sin(a);
  return [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([l, w]) => ({ x: x + fx * HALF_LEN * l! - fy * CAR_HALF_W * w!, y: y + fy * HALF_LEN * l! + fx * CAR_HALF_W * w! }));
};

function wallHits(v: CityView): string[] {
  const c = inner(v);
  const geo = makeGeo(v);
  const rects = v.lots.filter((l) => l.level > 0).map((l) => ({ id: l.id, r: lotRect(l) }));
  const inside = (p: { x: number; y: number }): number | null => rects.find(({ r }) => p.x > r.x + TOUCH && p.x < r.x + r.w - TOUCH && p.y > r.y + TOUCH && p.y < r.y + r.h - TOUCH)?.id ?? null;
  const out: string[] = [];
  const step: Step = { x: 0, y: 0, a: 0, alpha: 1, blink: 0 };
  for (const spot of c.day.spots.values()) {
    if (spot.kind !== 'home' && spot.kind !== 'private') continue;
    const lot = v.lots.find((l) => l.id === spot.id);
    const road = lot?.access ? geo.roads.get(lot.access.road) : undefined;
    if (!lot?.access || !road) continue;
    const view: ParkingView = { key: spot.key, kind: spot.kind, lot: lot.id, spaces: FILL, cars: Array.from({ length: FILL }, (_, k) => ({ uid: k + 1, tint: 0, kind: 'car' as const, slot: k })) };
    const slots = layoutPlace(view, geo);
    const p = pointAt(road.line, lot.access.s), q = pointAt(road.line, lot.access.s + 1);
    const along = Math.atan2(q.y - p.y, q.x - p.x);
    slots.forEach((s, k) => {
      if (!s) return;
      const bad = corners(s.x, s.y, s.a).map(inside).find((id) => id !== null);
      if (bad != null) out.push(`${spot.key}#${k} parked inside lot ${bad}`);
      // The car stands in the outer lane on its right, where the traffic stops it (the road's middle is nobody's lane).
      const outer = laneOffset(road, lanesPerLink(road) - 1);
      for (const a of [along, along + Math.PI]) {
        const lane = { x: p.x - Math.sin(a) * outer, y: p.y + Math.cos(a) * outer, a };
        for (let f = 0; f <= FRAMES; f++) {
          const at = pathPose(modeOf(spot.kind), lane, s, f / FRAMES, step, 0.3);
          const hit = corners(at.x, at.y, at.a).map(inside).find((id) => id !== null);
          if (hit != null) { out.push(`${spot.key}#${k} path frame ${f} inside lot ${hit}`); break; }
        }
        const end = pathPose(modeOf(spot.kind), lane, s, 1, step, 0.3);
        if (Math.hypot(end.x - s.x, end.y - s.y) > 0.01 || Math.abs(end.a - s.a) > 0.01) out.push(`${spot.key}#${k} ends off its picture`);
      }
    });
  }
  return out;
}

const CASES: readonly { readonly name: string; readonly make: () => CityView }[] = [
  ...[1, 3, 6, 10].map((y) => ({ name: `Saffron Bay year ${y}`, make: () => cityAtYear(y) })),
  ...[1, 5].map((y) => ({ name: `Old Harbour year ${y}`, make: () => harbourAt(y) })),
];

describe('cars keep out of the walls: home and private bays', () => {
  for (const k of CASES) {
    // Not yet green (see the counts with WALL_CHECK=1 WALL_LOG=1): the lane-to-bay curve cuts lot corners on narrow strips.
    it(`${k.name}: no bay and no frame of a move into it is inside a lot`, () => {
      const hits = wallHits(k.make());
      if (process.env.WALL_LOG) console.log(`WALLS ${k.name}: ${hits.length} hits, ${new Set(hits.map((h) => h.split('#')[0])).size} places, ${hits.filter((h) => h.includes('parked')).length} parked inside, ${hits.filter((h) => h.includes('ends off')).length} end off picture`);
      expect(hits).toEqual([]);
    }, 60_000);
  }
});
