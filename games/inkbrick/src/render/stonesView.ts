import Phaser from 'phaser';
import * as T from '../sim/types';
import { FIRE_TINT } from './art';
import type { BoardView } from './port';
import { SHADOW_DOT, SOFT_DOT } from './softTextures';

/**
 * The stones: one image each (a pool up to the 300-ball cap), a faint
 * shadow under the first SHADOWS so they read on any background, and a
 * trail. The default trail is a plain soft one; a milestone trail replaces it.
 */
/** The sim's stone radius in board px (engine export; 8 until it lands). */
export const STONE_RADIUS: number = (T as unknown as { BALL_RADIUS?: number }).BALL_RADIUS ?? 8;
const SHADOWS = 120;
const SHADOW_OFFSET = { x: 2, y: 3 };
const SHADOW_SCALE = 2.2;
const TRAIL_BALLS = 40;
const TRAIL_EVERY = 2;
const TRAIL_LIFE_MS = 320;
const TRAIL_SCALE = (STONE_RADIUS * 2.2) / 64;

export class StonesView {
  private readonly stones: Phaser.GameObjects.Image[] = [];
  private readonly shadows: Phaser.GameObjects.Image[] = [];
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private frame = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container, trailKey: string, private readonly texture: string) {
    const custom = trailKey !== '';
    this.trail = scene.add.particles(0, 0, custom ? trailKey : SOFT_DOT, {
      lifespan: TRAIL_LIFE_MS,
      scale: custom ? { start: 0.45, end: 0.1 } : { start: TRAIL_SCALE * 1.6, end: TRAIL_SCALE * 0.3 },
      alpha: { start: custom ? 0.9 : 0.55, end: 0 },
      emitting: false,
    });
    layer.add(this.trail);
  }

  private stone(i: number): Phaser.GameObjects.Image {
    let s = this.stones[i];
    if (!s) {
      s = this.scene.add.image(0, 0, this.texture).setDisplaySize(STONE_RADIUS * 2, STONE_RADIUS * 2);
      this.layer.add(s);
      this.stones.push(s);
    }
    return s;
  }

  private shadow(i: number): Phaser.GameObjects.Image {
    let s = this.shadows[i];
    if (!s) {
      s = this.scene.add.image(0, 0, SHADOW_DOT).setDisplaySize(STONE_RADIUS * SHADOW_SCALE, STONE_RADIUS * SHADOW_SCALE);
      this.layer.add(s);
      this.shadows.push(s);
    }
    return s;
  }

  sync(v: BoardView): void {
    this.frame++;
    const emit = this.frame % TRAIL_EVERY === 0;
    v.balls.forEach((b, i) => {
      if (i < SHADOWS) this.shadow(i).setPosition(b.x + SHADOW_OFFSET.x, b.y + SHADOW_OFFSET.y).setVisible(true);
      const s = this.stone(i).setPosition(b.x, b.y).setVisible(true);
      if (b.fire) s.setTint(FIRE_TINT);
      else s.clearTint();
      if (emit && i < TRAIL_BALLS) this.trail.emitParticleAt(b.x, b.y, 1);
    });
    for (let i = v.balls.length; i < this.stones.length; i++) this.stones[i]!.setVisible(false);
    for (let i = v.balls.length; i < this.shadows.length; i++) this.shadows[i]!.setVisible(false);
  }
}
