import type Phaser from 'phaser';
import { lotRect } from '../../city/geometry';
import { halfWidth } from '../../sim/roadGeom';
import type { CityView, Pt } from '../../sim/types';
import type { Selection } from '../../scenes/port';
import { ribbon } from '../geom';
import { TILT } from '../projection';
import { LINE_COLOURS } from '../style';

/** The outline of whatever is selected, and the transit lines when they matter. */
const COLOUR = 0x2f8f92;
const LIGHT = 0xfbf5e6;
const METRO_ALPHA = 0.5;

export class SelectLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Graphics;
  private clock = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.lines = scene.add.graphics().setDepth(depth).setScale(1, TILT);
    this.g = scene.add.graphics().setDepth(depth + 1).setScale(1, TILT);
  }

  update(dt: number, city: CityView, s: Selection, showLines: boolean): void {
    this.clock += dt;
    this.g.clear();
    this.g.setAlpha(0.75 + 0.25 * Math.sin(this.clock * 4));
    if (s) this.outline(city, s);
    this.drawLines(city, showLines, s?.kind === 'line' ? s.id : null);
  }

  private ring(pts: readonly Pt[], close: boolean): void {
    const v = pts as Phaser.Math.Vector2[];
    this.g.lineStyle(5, LIGHT, 0.8).strokePoints(v, close, close).lineStyle(2.4, COLOUR, 1).strokePoints(v, close, close);
  }

  private outline(city: CityView, s: NonNullable<Selection>): void {
    if (s.kind === 'junction') {
      const j = city.junctions.find((q) => q.id === s.id);
      if (j) this.g.lineStyle(5, LIGHT, 0.8).strokeCircle(j.x, j.y, j.radius + 7).lineStyle(2.4, COLOUR, 1).strokeCircle(j.x, j.y, j.radius + 7);
    } else if (s.kind === 'road') {
      const r = city.roads.find((q) => q.id === s.id);
      if (r) this.ring(ribbon(r.line, halfWidth(r) + 5), true);
    } else if (s.kind === 'lot' || s.kind === 'carPark') {
      const b = s.kind === 'lot' ? city.lots.find((l) => l.id === s.id) : city.carParks.find((p) => p.id === s.id);
      if (!b) return;
      const r = lotRect(b);
      this.ring([{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }], true);
    } else if ((s as { kind: string }).kind === 'beach') {
      const b = city.beaches[Number((s as unknown as { id: number | string }).id)];
      if (!b) return;
      const r = lotRect(b.rect);
      this.ring([{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }], true);
    } else if (s.kind === 'car') {
      const c = city.cars;
      if (s.slot < c.count && c.alive[s.slot] === 1 && (s.uid === undefined || c.uid[s.slot] === s.uid)) this.g.lineStyle(4, LIGHT, 0.9).strokeCircle(c.x[s.slot]!, c.y[s.slot]!, 13).lineStyle(2, COLOUR, 1).strokeCircle(c.x[s.slot]!, c.y[s.slot]!, 13);
    }
  }

  /** Metro and boat lines stay faintly visible; buses and trams show with the transit tools. */
  private drawLines(city: CityView, all: boolean, picked: number | null): void {
    const g = this.lines.clear();
    for (const l of city.lines) {
      const buried = l.mode === 'metro' || l.mode === 'boat';
      if (l.path.length < 2 || (!buried && !all && picked !== l.id)) continue;
      const strong = all || picked === l.id;
      const c = LINE_COLOURS[l.colour % LINE_COLOURS.length]!;
      const pts = l.path as Phaser.Math.Vector2[];
      g.lineStyle(strong ? 7 : 4, LIGHT, strong ? 0.7 : 0.25).strokePoints(pts, false, false);
      g.lineStyle(strong ? 4.5 : 2.4, c, strong ? 0.95 : METRO_ALPHA).strokePoints(pts, false, false);
      if (strong) for (const s of l.stops) g.fillStyle(LIGHT, 1).fillCircle(s.gx * 40, s.gy * 40, 6).lineStyle(2.5, c, 1).strokeCircle(s.gx * 40, s.gy * 40, 6);
    }
  }
}
