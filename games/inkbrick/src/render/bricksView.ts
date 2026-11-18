import Phaser from 'phaser';
import { CELL, type LevelDef } from '../sim/types';
import { brickTexture, PICTURE_TINTS } from './art';
import type { BoardView } from './port';

/**
 * One image per brick, made once when the level starts and hidden when it
 * breaks (the view's `alive` also hides bricks that go without an event,
 * such as an opened gate). Tough and ice bricks change image as they crack.
 * Only floe bricks move.
 */
export class BricksView {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly movers: number[] = [];
  private readonly shown: boolean[] = [];
  private readonly tex: string[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container, private readonly level: LevelDef) {
    level.bricks.forEach((b, i) => {
      const key = brickTexture(b, i, b.hp ?? 1, b.hp ?? 1, false);
      const img = scene.add.image(b.x * CELL, b.y * CELL, key).setOrigin(0, 0).setDisplaySize(b.w * CELL, b.h * CELL);
      if (b.tint !== undefined) img.setTint(PICTURE_TINTS[b.tint % PICTURE_TINTS.length]!);
      layer.add(img);
      this.images.push(img);
      this.shown.push(true);
      this.tex.push(key);
      if (b.floe) this.movers.push(i);
    });
  }

  /** A hit that didn't break it: a flash (the crack shows on the next sync). */
  hit(i: number): void {
    const img = this.images[i];
    if (img && this.shown[i]) this.scene.tweens.add({ targets: img, alpha: { from: 0.55, to: 1 }, duration: 120 });
  }

  hide(i: number): void {
    if (!this.shown[i]) return;
    this.shown[i] = false;
    this.images[i]?.setVisible(false);
  }

  /** The crumble: every brick left shakes before it goes. */
  shiver(): void {
    this.images.forEach((img, i) => {
      if (this.shown[i]) this.scene.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 60, yoyo: true, repeat: 3 });
    });
  }

  sync(v: BoardView): void {
    for (const i of this.movers) {
      const p = v.moved(i);
      if (p) this.images[i]?.setPosition(p.x, p.y);
    }
    const bricks = this.level.bricks;
    for (let i = 0; i < this.images.length; i++) {
      if (!this.shown[i]) continue;
      if (!v.alive(i)) {
        this.hide(i);
        continue;
      }
      const def = bricks[i]!;
      if (def.kind !== 'tough' && def.kind !== 'ice') continue;
      const key = brickTexture(def, i, v.hp(i), def.hp ?? 1, v.cracked(i));
      if (key !== this.tex[i]) {
        this.tex[i] = key;
        this.images[i]!.setTexture(key).setDisplaySize(def.w * CELL, def.h * CELL);
      }
    }
  }
}
