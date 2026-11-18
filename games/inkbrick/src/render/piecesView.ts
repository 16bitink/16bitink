import Phaser from 'phaser';
import { CELL, type LevelDef } from '../sim/types';
import type { BoardView } from './port';

/**
 * The moving pieces: Skip on the raft, the stones (a pool up to the 300-ball
 * cap), the chosen trail, falling pickups, shutters, spinners, whirlpools
 * and Brumm behind his shield. Synced from the view every frame.
 */
export const PADDLE_Y = 900;
/** The skip-* sprites are 97 x 52.5 board px with the raft's 90 px from x 0. */
const SKIP_W = 97;
const SKIP_H = 52.5;
const RAFT_SPRITE_W = 90;
/** The raft art's bottom edge below the hit line (the plain raft's deck top sits on it); taller rafts (sails) rise above. */
const RAFT_BOTTOM = 8;
/** Skip's own plain raft sits below this row of his sprite (image px); only the otter above it is drawn, over the chosen raft. */
const SKIP_BODY_PX = 80;
const SKIP_IMG_H = 105;
/** Skip settles this far into the deck so he lies on it, not above it. */
const SKIP_SINK = 4;
const SKIP_IMG_W = 194;
const PICKUP_SIZE = 26;
const BOSS_HIT_MS = 350;
const BOSS_SCALE = 1.4;
const BOSS_DROP = 6;
const WHIRL_SIZE = 40;

export interface Looks {
  /** '' for the plain raft, else raft-<n>. */
  readonly raft: string;
  /** '' for none, else trail-<n>. */
  readonly trail: string;
}

type Pose = 'aim' | 'idle' | 'cheer' | 'shrug';

export class PiecesView {
  private readonly raft: Phaser.GameObjects.Image;
  private readonly skip: Phaser.GameObjects.Image;
  private readonly pickups: Phaser.GameObjects.Image[] = [];
  private readonly shutters: Phaser.GameObjects.TileSprite[] = [];
  private readonly spinners: Phaser.GameObjects.Image[] = [];
  private readonly boss: Phaser.GameObjects.Image | null;
  private readonly shield: Phaser.GameObjects.Image | null;
  private poseFor = 0;
  private bossHitFor = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container, private readonly looks: Looks, level: LevelDef) {
    for (const w of level.whirlpools ?? []) {
      for (const p of [w.a, w.b]) {
        const img = scene.add.image(p.x * CELL, p.y * CELL, 'whirlpool').setDisplaySize(WHIRL_SIZE, WHIRL_SIZE);
        layer.add(img);
        scene.tweens.add({ targets: img, angle: 360, duration: 2400, repeat: -1 });
      }
    }
    this.boss = level.boss ? scene.add.image(0, 0, 'brumm-smug').setOrigin(0.5, 1) : null;
    this.shield = level.boss ? scene.add.image(0, 0, 'shield').setOrigin(0, 0) : null;
    if (this.boss && this.shield) layer.add([this.boss, this.shield]);
    this.skip = scene.add.image(270, PADDLE_Y, 'skip-aim').setOrigin(0, 1).setDisplaySize(SKIP_W, SKIP_H);
    this.skip.setCrop(0, 0, SKIP_IMG_W, SKIP_BODY_PX);
    this.raft = scene.add.image(270, PADDLE_Y, looks.raft || 'raft-plain').setOrigin(0.5, 1);
    // The raft first (its sails stay behind), Skip lying on it.
    layer.add([this.raft, this.skip]);
  }

  private pooled<T extends Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite>(pool: T[], i: number, make: () => T): T {
    let o = pool[i];
    if (!o) {
      o = make();
      this.layer.add(o);
      pool.push(o);
    }
    return o;
  }

  /** Skip strikes a pose for a while (the break-in's cheer, a lost heart's shrug). */
  pose(p: Pose, ms: number): void {
    this.poseFor = ms;
    this.skip.setTexture(`skip-${p}`);
    if (p === 'cheer') this.scene.tweens.add({ targets: this.skip, scaleY: this.skip.scaleY * 1.15, duration: 140, yoyo: true, repeat: 2 });
  }

  bossHit(): void {
    this.bossHitFor = BOSS_HIT_MS;
    this.boss?.setTexture('brumm-hit');
  }

  sync(v: BoardView, dtMs: number): void {
    this.syncRaft(v, dtMs);
    v.pickups.forEach((p, i) => this.pooled(this.pickups, i, () => this.scene.add.image(0, 0, `pu-${p.kind}`))
      .setTexture(`pu-${p.kind}`).setDisplaySize(PICKUP_SIZE, PICKUP_SIZE).setPosition(p.x, p.y).setVisible(true));
    for (let i = v.pickups.length; i < this.pickups.length; i++) this.pickups[i]!.setVisible(false);
    this.syncPieces(v, dtMs);
  }

  private syncRaft(v: BoardView, dtMs: number): void {
    const wide = v.paddleW > RAFT_SPRITE_W + 1;
    const key = wide && !this.looks.raft ? 'raft-wide' : this.looks.raft || 'raft-plain';
    if (this.raft.texture.key !== key) this.raft.setTexture(key);
    const h = (this.raft.height / this.raft.width) * v.paddleW;
    this.raft.setPosition(v.paddleX, PADDLE_Y + RAFT_BOTTOM).setDisplaySize(v.paddleW, h);
    // Skip lies along the raft; the sprite's own raft hides under the raft image.
    this.skip.setPosition(v.paddleX - RAFT_SPRITE_W / 2, PADDLE_Y + RAFT_BOTTOM + SKIP_SINK);
    if (this.poseFor > 0 && (this.poseFor -= dtMs) <= 0) this.skip.setTexture(v.held ? 'skip-aim' : 'skip-idle');
    else if (this.poseFor <= 0) {
      const want = v.held ? 'skip-aim' : 'skip-idle';
      if (this.skip.texture.key !== want) this.skip.setTexture(want);
    }
  }

  private syncPieces(v: BoardView, dtMs: number): void {
    v.shutters.forEach((s, i) => this.pooled(this.shutters, i, () => this.scene.add.tileSprite(0, 0, s.w, s.h, 'shutter').setOrigin(0, 0).setTileScale(0.5))
      .setPosition(s.x, s.y).setSize(s.w, s.h).setVisible(s.closed));
    v.spinners.forEach((s, i) => this.pooled(this.spinners, i, () => this.scene.add.image(0, 0, 'spinner'))
      .setPosition(s.x, s.y).setDisplaySize(s.length, 12).setRotation(s.angle));
    const b = v.boss;
    if (!b || !this.boss || !this.shield) return;
    if (this.bossHitFor > 0 && (this.bossHitFor -= dtMs) <= 0) this.boss.setTexture('brumm-smug');
    if (b.hitsLeft <= 0) this.boss.setTexture('brumm-defeated');
    // Brumm sits on his box's bottom edge, a little wider than the box, in the art's own proportions.
    const bw = b.w * BOSS_SCALE;
    this.boss.setPosition(b.x + b.w / 2, b.y + b.h + BOSS_DROP).setDisplaySize(bw, (this.boss.height / this.boss.width) * bw);
    this.shield.setPosition(b.shieldX, b.shieldY).setDisplaySize(b.shieldW, b.shieldH);
  }
}
