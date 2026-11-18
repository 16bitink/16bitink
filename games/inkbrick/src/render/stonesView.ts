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

/** The stone a Sticky Raft holds: resting on the deck, over the raft. */
function caughtOnRaft(b: { readonly x: number; readonly y: number; readonly vy: number }, v: BoardView): boolean {
  return Math.abs(b.vy) < 1 && Math.abs(b.x - v.paddleX) <= v.paddleW / 2 + v.ballR && b.y > 860;
}

export class StonesView {
  private readonly stones: Phaser.GameObjects.Image[] = [];
  private readonly shadows: Phaser.GameObjects.Image[] = [];
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private frame = 0;
  private radius = STONE_RADIUS;

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
      s = this.scene.add.image(0, 0, this.texture).setDisplaySize(this.radius * 2, this.radius * 2);
      this.layer.add(s);
      this.stones.push(s);
    }
    return s;
  }

  private shadow(i: number): Phaser.GameObjects.Image {
    let s = this.shadows[i];
    if (!s) {
      s = this.scene.add.image(0, 0, SHADOW_DOT).setDisplaySize(this.radius * SHADOW_SCALE, this.radius * SHADOW_SCALE);
      this.layer.add(s);
      this.shadows.push(s);
    }
    return s;
  }

  /** The stone's size follows the sim (the Big Stone rule): resize every stone made so far. */
  private resize(r: number): void {
    if (Math.abs(r - this.radius) < 0.01) return;
    this.radius = r;
    for (const s of this.stones) s.setDisplaySize(r * 2, r * 2);
    for (const s of this.shadows) s.setDisplaySize(r * SHADOW_SCALE, r * SHADOW_SCALE);
  }

  sync(v: BoardView): void {
    this.frame++;
    this.resize(v.ballR);
    const emit = this.frame % TRAIL_EVERY === 0;
    // While aiming, or holding a caught stone (Sticky Raft), Skip has it in his paws (his sprite
    // draws it); the sim's stone stays where it is.
    const shown = v.held ? [] : v.caught ? v.balls.filter((b) => !caughtOnRaft(b, v)) : v.balls;
    shown.forEach((b, i) => {
      if (i < SHADOWS) this.shadow(i).setPosition(b.x + SHADOW_OFFSET.x, b.y + SHADOW_OFFSET.y).setVisible(true);
      const s = this.stone(i).setPosition(b.x, b.y).setVisible(true);
      if (b.fire) s.setTint(FIRE_TINT);
      else s.clearTint();
      if (emit && i < TRAIL_BALLS) this.trail.emitParticleAt(b.x, b.y, 1);
    });
    for (let i = shown.length; i < this.stones.length; i++) this.stones[i]!.setVisible(false);
    for (let i = shown.length; i < this.shadows.length; i++) this.shadows[i]!.setVisible(false);
  }
}
