import type Phaser from 'phaser';
import type { CityView, Pt } from '../../sim/types';
import { fbm, hash2 } from '../noise';
import { fieldAt, fullExtent, scatter } from '../ground/terrain';
import { boxesMeet, nearestOnLine } from '../geom';
import { projectY } from '../projection';
import type { RoadScene } from '../ground/roadShape';
import type { PieceFrame, UprightAtlas } from './pieces';

/** Boats on the water: some at anchor, bobbing; some sailing slowly to and fro. */
const STEP = 150;
const SHARE = 0.34;
const SAIL_SHARE = 0.3;
const SAIL_REACH = 70;
const BRIDGE_GAP = 70;
const DEEP = 0.96;
const KINDS = ['prop/boat-1', 'prop/boat-2', 'prop/boat-1', 'prop/yacht'] as const;

interface Boat { readonly img: Phaser.GameObjects.Image; readonly at: Pt; readonly sails: boolean; readonly phase: number; last: number }

export class Boats {
  private boats: Boat[] = [];
  private clock = 0;

  constructor(scene: Phaser.Scene, atlas: UprightAtlas, city: CityView, roads: RoadScene, depth: number) {
    const rows = city.def.map;
    const deep = (p: Pt): boolean => fieldAt(rows, '~', p.x, p.y) > DEEP;
    for (const p of scatter(fullExtent(rows), STEP, 77, (q, r) => r < SHARE && deep(q) && !nearBridge(q, roads))) {
      const roll = hash2(p.x, p.y, 5);
      const sails = roll < SAIL_SHARE && [-1, 1].every((k) => deep({ x: p.x + SAIL_REACH * k, y: p.y }));
      const f: PieceFrame = atlas.sprite(KINDS[Math.floor(hash2(p.y, p.x, 6) * KINDS.length)]!);
      const img = scene.add.image(p.x, projectY(p.y), f.body.texture, f.body.frame).setOrigin(0.5, 0.6).setScale((0.85 + 0.2 * roll) / f.body.scale).setDepth(depth);
      this.boats.push({ img, at: p, sails, phase: roll * 60, last: p.x });
    }
  }

  update(dt: number): void {
    this.clock += dt;
    for (const b of this.boats) {
      const t = this.clock + b.phase;
      const x = b.at.x + (b.sails ? Math.sin(t * 0.07) * SAIL_REACH : fbm(t * 0.05, 3, 1, 4) * 3);
      if (b.sails && Math.abs(x - b.last) > 0.002) b.img.setFlipX(x < b.last);
      b.last = x;
      b.img.setPosition(x, projectY(b.at.y) + Math.sin(t * 1.3) * 0.8).setRotation(Math.sin(t * 0.9) * 0.03);
    }
  }

  clear(): void {
    this.boats.forEach((b) => b.img.destroy());
    this.boats = [];
  }
}

function nearBridge(p: Pt, roads: RoadScene): boolean {
  const box = { x0: p.x - 1, y0: p.y - 1, x1: p.x + 1, y1: p.y + 1 };
  return roads.roads.some((r) => r.road.bridge && boxesMeet({ x0: r.box.x0 - BRIDGE_GAP, y0: r.box.y0 - BRIDGE_GAP, x1: r.box.x1 + BRIDGE_GAP, y1: r.box.y1 + BRIDGE_GAP }, box) && nearestOnLine(r.line, p).d < BRIDGE_GAP);
}
