import type Phaser from 'phaser';
import { GROUND_KINDS } from '../../art/manifest';
import type { CityView } from '../../sim/types';
import { boxesMeet, clamp, offsetLine, ribbon, subLine, type Box } from '../geom';
import type { RoadScene, RoadShape } from '../ground/roadShape';
import { TILT } from '../projection';
import { heat } from '../style';
import { lotRect } from '../../city/geometry';
import type { Overlay } from '../../scenes/port';

/** Coloured washes on the ground: flow along the roads, parking, anger and money on lots. */
const EVERY_S = 0.5;
const FAR_ALPHA = 0.95;
const WEAR_ALPHA = 0.85;
/** How faint an unused road is on the repairs map. */
const WEAR_QUIET = 0.25;
const BLOCK = { parking: 0x3f9fb0, money: 0xc99a2e } as const;

export class FlowLayer {
  private readonly roads: Phaser.GameObjects.Graphics;
  private readonly blocks: Phaser.GameObjects.Graphics;
  private wait = 0;
  private lastFar = false;

  constructor(scene: Phaser.Scene, depth: number) {
    this.blocks = scene.add.graphics().setDepth(depth).setScale(1, TILT);
    this.roads = scene.add.graphics().setDepth(depth + 1).setScale(1, TILT);
  }

  /** `far` 0..1: how much of the cars' place the flow lines take. */
  update(dt: number, city: CityView, scene: RoadScene, overlay: Overlay, far: number, view: Box): void {
    this.wait -= dt;
    const flow = overlay === 'flow' || overlay === 'condition' ? 1 : far;
    this.roads.setAlpha(flow).setVisible(flow > 0.02);
    const isFar = far > 0.5;
    if (this.wait > 0 && isFar === this.lastFar) return;
    this.lastFar = isFar;
    this.wait = EVERY_S;
    if (flow > 0.02) this.drawRoads(city, scene, far, view, overlay === 'condition');
    this.drawBlocks(city, overlay);
  }

  private drawRoads(city: CityView, scene: RoadScene, far: number, view: Box, worn: boolean): void {
    const g = this.roads.clear();
    if (worn) { this.drawWear(g, city, scene, view); return; }
    const alpha = far > 0.3 ? FAR_ALPHA : 0.62;
    for (const r of scene.roads) {
      if (r.waits || !boxesMeet(r.box, view)) continue;
      const s = city.roadStats(r.road.id);
      const colour = heat(clamp(1 - s.speedRatio, 0, 1) * 1.15);
      for (const side of r.road.oneWay ? [0] : [-1, 1]) this.strip(g, r, side, colour, alpha, s.flow);
    }
  }

  /**
   * Repairs: each road in one colour, green when new, red when falling apart, and strong where many drive it,
   * faint where nobody does: the worn roads that hurt stand out.
   */
  private drawWear(g: Phaser.GameObjects.Graphics, city: CityView, scene: RoadScene, view: Box): void {
    const cars = (id: number): number => city.roadStats(id).cars ?? 0;
    const busiest = Math.max(1, ...scene.roads.map((r) => cars(r.road.id)));
    for (const r of scene.roads) {
      if (r.waits || !boxesMeet(r.box, view)) continue;
      const line = subLine(r.road.line, r.cut[0] - r.lead, r.cut[1] - r.lead);
      if (line.length < 2) continue;
      const used = WEAR_QUIET + (1 - WEAR_QUIET) * Math.min(1, cars(r.road.id) / busiest);
      g.fillStyle(heat(clamp(1 - (r.road.condition ?? 1), 0, 1) * 1.1), WEAR_ALPHA * used).fillPoints(ribbon(line, r.half * 0.7) as Phaser.Math.Vector2[], true, true);
    }
  }

  /** One direction's colour, between its junctions. */
  private strip(g: Phaser.GameObjects.Graphics, r: RoadShape, side: number, colour: number, alpha: number, flow: number): void {
    const line = subLine(r.road.line, r.cut[0] - r.lead, r.cut[1] - r.lead);
    if (line.length < 2) return;
    const room = side === 0 ? r.half * 0.8 : r.half * 0.42;
    const half = Math.max(2.2, Math.min(room, 2 + Math.sqrt(Math.max(0, flow)) * 0.9));
    const mid = side === 0 ? line : offsetLine(line, side * (r.half / 2 + r.median / 4));
    g.fillStyle(colour, alpha).fillPoints(ribbon(mid, half) as Phaser.Math.Vector2[], true, true);
  }

  private drawBlocks(city: CityView, overlay: Overlay): void {
    const g = this.blocks.clear();
    if (overlay !== 'parking' && overlay !== 'anger' && overlay !== 'money') return;
    for (const l of city.lots) {
      if (l.level === 0 || GROUND_KINDS.includes(l.kind)) continue;
      const r = lotRect(l);
      const mood = city.lotMood(l.id);
      const v = overlay === 'anger' ? mood.trips : overlay === 'parking' ? mood.parking : 0;
      if (overlay === 'money') continue;
      g.fillStyle(heat(clamp(v, 0, 1)), 0.5).fillRoundedRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 8);
    }
    for (const p of overlay === 'anger' ? [] : city.carParks) {
      const r = lotRect(p);
      const full = p.spaces > 0 ? p.used / p.spaces : 0;
      g.fillStyle(overlay === 'parking' ? heat(clamp((full - 0.5) * 2, 0, 1)) : BLOCK.money, 0.55).fillRoundedRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 6);
    }
    if (overlay === 'money') this.drawMoney(g, city);
    if (overlay === 'parking') for (const r of city.roads) if (r.kerb) g.fillStyle(BLOCK.parking, 0.4).fillPoints(ribbon(r.line, 12) as Phaser.Math.Vector2[], true, true);
  }

  /** What earns: tolled roads and paid kerbs. */
  private drawMoney(g: Phaser.GameObjects.Graphics, city: CityView): void {
    for (const r of city.roads) {
      if (!r.toll && !r.kerb) continue;
      g.fillStyle(r.toll ? BLOCK.money : BLOCK.parking, 0.6);
      g.fillPoints(ribbon(r.line, 12) as Phaser.Math.Vector2[], true, true);
    }
  }

  /** Draw again on the next frame (the network or the overlay changed). */
  dirty(): void { this.wait = 0; }

  destroy(): void { this.roads.destroy(); this.blocks.destroy(); }
}
