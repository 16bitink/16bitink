import { CELL } from '../../sim/constants';
import type { CityView, TransitLine } from '../../sim/types';
import { halfWidth } from '../../sim/roadGeom';
import { nearestOnLine } from '../geom';
import { kerbOf, type RoadScene } from '../ground/roadShape';
import type { Thing, Things } from './things';

/** Bus shelters beside their roads, metro stations, jetties and signal posts. */
export class Stops {
  private things: Thing[] = [];
  private lines: readonly TransitLine[] | null = null;
  private version = -1;

  constructor(private readonly all: Things) {}

  refresh(city: CityView, scene: RoadScene): void {
    if (city.lines === this.lines && city.version === this.version) return;
    this.lines = city.lines;
    this.version = city.version;
    this.things.forEach((t) => this.all.remove(t));
    this.things = [];
    const done = new Set<string>();
    for (const l of city.lines) {
      for (const s of l.stops) {
        const key = `${l.mode === 'metro' || l.mode === 'boat' ? l.mode : 'road'}:${s.gx},${s.gy}`;
        if (done.has(key)) continue;
        done.add(key);
        this.stop(l, s.gx * CELL, s.gy * CELL, scene);
      }
    }
    this.signals(scene);
  }

  private stop(l: TransitLine, x: number, y: number, scene: RoadScene): void {
    const side = this.beside(x, y, scene);
    const name = l.mode === 'metro' ? 'prop/metro' : l.mode === 'boat' ? 'prop/jetty' : 'prop/bus-stop';
    this.things.push(this.all.add(this.all.atlas.sprite(name), side.x, side.y, { size: l.mode === 'metro' ? 1.15 : 0.95 }));
  }

  /** On the walk of the road that passes here, or the place itself. */
  private beside(x: number, y: number, scene: RoadScene): { x: number; y: number } {
    for (const r of scene.roads) {
      if (r.road.flyover) continue;
      const near = nearestOnLine(r.line, { x, y });
      if (near.d > CELL / 2) continue;
      const i = Math.max(1, r.line.findIndex((p) => Math.hypot(p.x - x, p.y - y) < CELL));
      const a = r.line[Math.min(i, r.line.length - 1) - 1] ?? r.line[0]!;
      const b = r.line[Math.min(i, r.line.length - 1)] ?? a;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const off = r.half + kerbOf(r.road) + 4;
      // Stand on the north or west side, so the shelter never hides the road.
      const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
      const k = n.y < 0 || (n.y === 0 && n.x < 0) ? 1 : -1;
      return { x: x + n.x * off * k, y: y + n.y * off * k };
    }
    return { x, y };
  }

  private signals(scene: RoadScene): void {
    for (const j of scene.joins) {
      if (j.kind !== 'plain' || (j.j.control !== 'signal' && j.j.control !== 'smart')) continue;
      for (const arm of j.arms) {
        const s = j.j.radius + 1;
        const off = -(arm.half + 3.5);
        const x = j.j.x + Math.cos(arm.a) * s - Math.sin(arm.a) * off;
        const y = j.j.y + Math.sin(arm.a) * s + Math.cos(arm.a) * off;
        this.things.push(this.all.add(this.all.atlas.sprite('prop/signal'), x, y, { size: 1.05 }));
      }
    }
  }
}
