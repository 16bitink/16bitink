import type Phaser from 'phaser';
import { lotRect } from '../../city/geometry';
import type { CityView } from '../../sim/types';
import { TILT } from '../projection';

/**
 * In build mode the buildings go faint, so each real lot keeps a clear
 * outline and a soft fill: you see what blocks. Fades in as they fade out.
 */
const EDGE = 0x3a322b;
const PAPER = 0xfbf5e6;
const SINK_FULL = 1; // the things' alpha with nothing sunk
const SINK_DEEP = 0.13; // and with build mode fully on (WorldScene SINK)

export class FootprintLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private lots: CityView['lots'] | null = null;
  private parks: CityView['carParks'] | null = null;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth).setScale(1, TILT).setVisible(false);
  }

  /** `fade` is the things' alpha, 1 when nothing is sunk. */
  update(city: CityView, fade: number): void {
    const k = Math.min(1, Math.max(0, (SINK_FULL - fade) / (SINK_FULL - SINK_DEEP)));
    this.g.setVisible(k > 0.02);
    if (k <= 0.02) return;
    this.g.setAlpha(k);
    if (this.lots === city.lots && this.parks === city.carParks) return;
    this.lots = city.lots;
    this.parks = city.carParks;
    this.g.clear();
    for (const b of [...city.lots.filter((l) => l.level > 0), ...city.carParks]) {
      const r = lotRect(b);
      this.g.fillStyle(PAPER, 0.3).fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
      this.g.lineStyle(4.5, PAPER, 0.8).strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
      this.g.lineStyle(1.8, EDGE, 0.85).strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    }
  }

  destroy(): void { this.g.destroy(); }
}
