import { FRONT_STREET_SETBACK } from '../../city/geometry';
import Phaser from 'phaser';
import type { CityView, Pt } from '../../sim/types';
import { projectY } from '../projection';
import { ctxOf, makeCanvas } from '../tiles';
import { plotSpots } from '../upright/lots';

/** Warm pools of light at night: windows and shop fronts, street lamps, roundabouts. */
const SIZE = 128;
const HOME = { size: 0.62, up: 16, alpha: 0.5 } as const;
const LAMP = { size: 0.5, up: 6, alpha: 0.55 } as const;

export class Glows {
  private readonly layer: Phaser.GameObjects.Layer;

  constructor(private readonly scene: Phaser.Scene, depth: number) {
    texture(scene);
    this.layer = scene.add.layer().setDepth(depth).setVisible(false);
  }

  rebuild(city: CityView, lamps: readonly Pt[]): void {
    this.layer.removeAll(true);
    for (const l of city.lots) {
      if (l.level === 0) continue;
      for (const s of plotSpots(l, city.def.frontStreets ? FRONT_STREET_SETBACK : 0)) this.add(s.x, s.y - 14, HOME.size * s.size * (1 + l.level * 0.08) * (s.kind === 'home' || s.kind === 'shops' || s.kind === 'office' ? 1 : 1.9), HOME.up, HOME.alpha);
    }
    for (const p of lamps) this.add(p.x, p.y, LAMP.size, LAMP.up, LAMP.alpha);
  }

  private add(x: number, y: number, size: number, up: number, alpha: number): void {
    const img = new Phaser.GameObjects.Image(this.scene, x, projectY(y, up), 'fx-glow').setScale(size, size * 0.8).setAlpha(alpha).setBlendMode(Phaser.BlendModes.ADD);
    this.layer.add(img);
  }

  update(night: number): void {
    const on = night > 0.04;
    if (this.layer.visible !== on) this.layer.setVisible(on);
    if (on) this.layer.setAlpha(night);
  }
}

function texture(scene: Phaser.Scene): void {
  if (scene.textures.exists('fx-glow')) return;
  const c = makeCanvas(SIZE, SIZE);
  const g = ctxOf(c);
  const r = SIZE / 2;
  const f = g.createRadialGradient(r, r, 2, r, r, r);
  f.addColorStop(0, 'rgba(255,206,128,0.62)');
  f.addColorStop(0.35, 'rgba(250,178,92,0.26)');
  f.addColorStop(1, 'rgba(240,150,70,0)');
  g.fillStyle = f;
  g.fillRect(0, 0, SIZE, SIZE);
  scene.textures.addCanvas('fx-glow', c);
}
