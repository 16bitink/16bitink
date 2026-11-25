import type Phaser from 'phaser';
import type { CityView, TransitLine } from '../../sim/types';
import { lineLength, pointAt } from '../geom';
import type { Pictures } from '../pictures';
import { projectAngle, projectY } from '../projection';

/** Water buses on their lines, to and fro between the stops (the sim carries their riders, the view their boats). */
const KEY = 'ferry';
const PICTURE = 'v/boat';
const PICTURE_SCALE = 8;
const SIZE = 2.1;
const SPEED = 34; // plan px/s
const PAUSE = 3; // seconds at each end
const WAKE = 14;

interface Ferry { readonly img: Phaser.GameObjects.Image; readonly wake: Phaser.GameObjects.Ellipse; readonly line: TransitLine; readonly len: number; readonly phase: number }

export class Ferries {
  private ferries: Ferry[] = [];
  private lines: readonly TransitLine[] | null = null;
  private clock = 0;

  constructor(private readonly scene: Phaser.Scene, pics: Pictures, private readonly depth: number) {
    const pic = pics.painted(PICTURE, PICTURE_SCALE);
    if (!pic || scene.textures.exists(KEY)) return;
    if (pic.img instanceof HTMLImageElement) scene.textures.addImage(KEY, pic.img);
  }

  refresh(city: CityView): void {
    if (city.lines === this.lines) return;
    this.lines = city.lines;
    this.clear();
    if (!this.scene.textures.exists(KEY)) return;
    for (const line of city.lines) {
      if (line.mode !== 'boat' || line.works > 0 || line.path.length < 2) continue;
      for (let i = 0; i < line.vehicles; i++) {
        const wake = this.scene.add.ellipse(0, 0, WAKE * 2, WAKE, 0xfbf7ea, 0.35).setDepth(this.depth);
        const img = this.scene.add.image(0, 0, KEY).setScale(SIZE / PICTURE_SCALE).setDepth(this.depth + 1);
        this.ferries.push({ img, wake, line, len: lineLength(line.path), phase: i / line.vehicles });
      }
    }
  }

  update(dt: number): void {
    this.clock += dt;
    for (const f of this.ferries) {
      const trip = f.len / SPEED + PAUSE;
      const t = (this.clock / trip + f.phase * 2) % 2;
      const back = t >= 1;
      const run = Math.min(1, ((back ? t - 1 : t) * trip) / (f.len / SPEED));
      const p = pointAt(f.line.path, f.len * (back ? 1 - run : run));
      const a = projectAngle(p.a + (back ? Math.PI : 0));
      const y = projectY(p.y) + Math.sin(this.clock * 1.6 + f.phase * 9) * 0.7;
      f.img.setPosition(p.x, y).setRotation(a);
      f.wake.setPosition(p.x - Math.cos(a) * WAKE, y - Math.sin(a) * WAKE).setRotation(a).setAlpha(run < 1 ? 0.35 : 0);
    }
  }

  clear(): void {
    for (const f of this.ferries) { f.img.destroy(); f.wake.destroy(); }
    this.ferries = [];
  }
}
