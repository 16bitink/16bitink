import Phaser from 'phaser';
import type { CarsView, CityView } from '../../sim/types';
import type { CarLayer } from '../cars/carLayer';
import type { Blinker } from '../cars/manoeuvres';
import { nightOf, washOf } from '../daylight';
import { clamp } from '../geom';
import { projectAngle, projectY } from '../projection';
import { ctxOf, makeCanvas } from '../tiles';

/** Night and dusk: one wash over the scene, headlights, brake lights, blinkers and anger puffs. */
const MAX_PUFFS = 14;
const PUFF_FROM = 0.55;
const BEAM = { w: 64, h: 40 } as const;
const NONE: readonly Blinker[] = [];

export class Lights {
  private readonly wash: Phaser.GameObjects.Rectangle;
  private readonly beams: Phaser.GameObjects.Image[] = [];
  private readonly tails: Phaser.GameObjects.Image[] = [];
  private readonly blinks: Phaser.GameObjects.Image[] = [];
  private readonly puffs: Phaser.GameObjects.Image[] = [];
  private clock = 0;
  private readonly pose = { x: 0, y: 0, z: 0, a: 0, len: 14, wid: 7, slowing: false };

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number, nightDepth: number) {
    drawTextures(scene);
    this.wash = scene.add.rectangle(0, 0, 10, 10, 0xffffff).setOrigin(0.5).setDepth(nightDepth).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  /** Cover the screen; scene px. */
  frame(x: number, y: number, w: number, h: number): void {
    this.wash.setPosition(x, y).setSize(w * 1.1, h * 1.1);
  }

  update(dt: number, city: CityView, cars: CarLayer, close: number, moving: readonly Blinker[] = NONE): void {
    this.clock += dt;
    const colour = washOf(city.hour);
    this.wash.setVisible(colour !== 0xffffff).setFillStyle(colour);
    const night = nightOf(city.hour);
    const c = city.cars;
    let beams = 0, tails = 0, blinks = 0, puffs = 0;
    if (close > 0.05) {
      for (let i = 0; i < cars.size; i++) {
        if (!cars.pose(i, this.pose)) continue;
        if (night > 0.15) this.beam(beams++, night * close);
        if (this.pose.slowing) this.tail(tails++, close);
        if (c.blinker[i] !== 0 && this.clock % 0.8 < 0.4) this.blink(blinks++, c.blinker[i]!, close);
        if (c.anger[i]! > PUFF_FROM && c.uid[i]! % 2 === 0 && puffs < MAX_PUFFS) this.puff(puffs++, i, c, close);
      }
    }
    if (close > 0.05 && this.clock % 0.8 < 0.4) {
      for (const b of moving) {
        this.pose.x = b.x; this.pose.y = b.y; this.pose.z = 0; this.pose.a = b.a; this.pose.len = b.len; this.pose.wid = b.wid;
        this.blink(blinks++, b.side, close);
      }
    }
    rest(this.beams, beams);
    rest(this.tails, tails);
    rest(this.blinks, blinks);
    rest(this.puffs, puffs);
  }

  /** Each kind at its own depth, so the additive beams and the plain lights batch apart. */
  private get(pool: Phaser.GameObjects.Image[], i: number, key: string, add: boolean): Phaser.GameObjects.Image {
    let img = pool[i];
    if (!img) {
      img = this.scene.add.image(0, 0, key).setDepth(this.depth + (pool === this.beams ? 0 : pool === this.tails ? 1 : pool === this.blinks ? 2 : 3));
      if (add) img.setBlendMode(Phaser.BlendModes.ADD);
      pool.push(img);
    }
    return img.setVisible(true);
  }

  private beam(i: number, alpha: number): void {
    const p = this.pose;
    const f = p.len / 2 - 1;
    this.get(this.beams, i, 'fx-beam', true).setOrigin(0, 0.5)
      .setPosition(p.x + Math.cos(p.a) * f, projectY(p.y + Math.sin(p.a) * f, Math.max(0, p.z)))
      .setRotation(projectAngle(p.a)).setScale(0.36, 0.26).setAlpha(alpha * 0.34);
  }

  private tail(i: number, alpha: number): void {
    const p = this.pose;
    const f = -p.len / 2 + 0.6;
    this.get(this.tails, i, 'fx-tail', false)
      .setPosition(p.x + Math.cos(p.a) * f, projectY(p.y + Math.sin(p.a) * f, Math.max(0, p.z) + 1))
      .setRotation(projectAngle(p.a)).setScale(0.2 * (p.wid / 7)).setAlpha(alpha * 0.9);
  }

  private blink(i: number, side: number, alpha: number): void {
    const p = this.pose;
    const f = p.len / 2 - 1.5;
    const s = (p.wid / 2 - 0.4) * side;
    this.get(this.blinks, i, 'fx-dot', false)
      .setPosition(p.x + Math.cos(p.a) * f - Math.sin(p.a) * s, projectY(p.y + Math.sin(p.a) * f + Math.cos(p.a) * s, Math.max(0, p.z) + 1))
      .setScale(0.2).setTint(0xf2a63a).setAlpha(alpha);
  }

  /** A scribbled cloud over a driver who has waited too long. */
  private puff(i: number, slot: number, c: CarsView, alpha: number): void {
    const p = this.pose;
    const k = clamp((c.anger[slot]! - 0.5) * 2, 0, 1);
    const bob = Math.sin(this.clock * 4 + slot) * 1.2;
    this.get(this.puffs, i, 'fx-puff', false).setOrigin(0.5, 1)
      .setPosition(p.x + 2, projectY(p.y, Math.max(0, p.z) + 8) + bob).setScale(0.17 + 0.13 * k).setAlpha(alpha * (0.7 + 0.3 * k)).setRotation(Math.sin(this.clock * 6 + slot) * 0.12);
  }
}

function rest(pool: Phaser.GameObjects.Image[], from: number): void {
  for (let i = from; i < pool.length; i++) pool[i]!.setVisible(false);
}

function texture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(w, h);
  draw(ctxOf(c));
  scene.textures.addCanvas(key, c);
}

function drawTextures(scene: Phaser.Scene): void {
  texture(scene, 'fx-beam', BEAM.w, BEAM.h, (g) => {
    const f = g.createRadialGradient(0, BEAM.h / 2, 1, 0, BEAM.h / 2, BEAM.w);
    f.addColorStop(0, 'rgba(255,236,186,0.95)');
    f.addColorStop(0.5, 'rgba(255,226,160,0.28)');
    f.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = f;
    g.beginPath();
    g.moveTo(0, BEAM.h * 0.38);
    g.lineTo(BEAM.w, 0);
    g.lineTo(BEAM.w, BEAM.h);
    g.lineTo(0, BEAM.h * 0.62);
    g.closePath();
    g.fill();
  });
  texture(scene, 'fx-tail', 8, 28, (g) => {
    for (const y of [4, 24]) {
      const f = g.createRadialGradient(4, y, 0.5, 4, y, 4);
      f.addColorStop(0, 'rgba(238,72,48,1)');
      f.addColorStop(0.55, 'rgba(214,52,38,0.9)');
      f.addColorStop(1, 'rgba(201,58,43,0)');
      g.fillStyle = f;
      g.fillRect(0, y - 4, 8, 8);
    }
  });
  texture(scene, 'fx-dot', 16, 16, (g) => {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(8, 8, 6, 0, Math.PI * 2);
    g.fill();
  });
  texture(scene, 'fx-puff', 64, 52, (g) => {
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.strokeStyle = '#4a3a34';
    g.fillStyle = 'rgba(245,236,218,0.94)';
    g.beginPath();
    for (const [x, y, r] of [[20, 30, 14], [34, 20, 15], [46, 30, 13], [32, 34, 15]] as const) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }
    g.fill();
    g.beginPath();
    for (let a = 0; a < 15; a += 0.25) g.lineTo(32 + Math.cos(a) * (3 + a), 27 + Math.sin(a) * (2 + a * 0.75));
    g.stroke();
  });
}
