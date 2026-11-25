import type Phaser from 'phaser';
import type { Box } from '../geom';
import { projectY, TILT } from '../projection';
import type { PieceFrame, UprightAtlas } from './pieces';

/**
 * Standing things (trees, props, buildings): an image sorted by the plan y of
 * its foot, and its shadow on the ground. Hidden in squares the camera can't
 * see.
 */
const BUCKET = 320;
const SHADOW_ALPHA = 0.26;

export interface ThingDepths { readonly shadow: number; readonly upright: number }

export interface Thing {
  readonly x: number;
  readonly y: number;
  readonly img: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image | null;
  /** Drawn this much bigger than its picture. */
  readonly size: number;
  shown: boolean;
}

export interface ThingOptions { readonly size?: number; readonly flip?: boolean; readonly shadow?: boolean; readonly z?: number; readonly lift?: number }

export class Things {
  private readonly buckets = new Map<string, Set<Thing>>();
  private live = new Set<string>();
  fade = 1;

  constructor(private readonly scene: Phaser.Scene, readonly atlas: UprightAtlas, private readonly depths: ThingDepths) {}

  add(frame: PieceFrame, x: number, y: number, o: ThingOptions = {}): Thing {
    const size = o.size ?? 1;
    const k = size / frame.body.scale;
    const img = this.scene.add.image(x, projectY(y, o.z ?? 0), frame.body.texture, frame.body.frame).setOrigin(0.5, 1).setScale(k).setFlipX(o.flip ?? false).setDepth(this.depths.upright + y + (o.lift ?? 0));
    let shadow: Phaser.GameObjects.Image | null = null;
    if (frame.shadow && o.shadow !== false) {
      shadow = this.scene.add.image(x, y * TILT, frame.shadow.texture, frame.shadow.frame)
        .setOrigin(frame.shadowAt.x, frame.shadowAt.y).setScale(size / frame.shadow.scale).setAlpha(SHADOW_ALPHA).setDepth(this.depths.shadow);
    }
    const t: Thing = { x, y, img, shadow, size, shown: true };
    const key = bucketOf(x, y);
    const set = this.buckets.get(key) ?? new Set<Thing>();
    set.add(t);
    this.buckets.set(key, set);
    this.apply(t, this.live.has(key));
    return t;
  }

  remove(t: Thing): void {
    this.buckets.get(bucketOf(t.x, t.y))?.delete(t);
    t.img.destroy();
    t.shadow?.destroy();
  }

  show(t: Thing, on: boolean): void {
    if (t.shown === on) return;
    t.shown = on;
    this.apply(t, this.live.has(bucketOf(t.x, t.y)));
  }

  private apply(t: Thing, seen: boolean): void {
    t.img.setVisible(seen && t.shown);
    t.shadow?.setVisible(seen && t.shown);
  }

  cull(view: Box): void {
    const now = new Set<string>();
    for (let j = Math.floor(view.y0 / BUCKET); j <= Math.floor(view.y1 / BUCKET); j++) {
      for (let i = Math.floor(view.x0 / BUCKET); i <= Math.floor(view.x1 / BUCKET); i++) now.add(`${i},${j}`);
    }
    for (const key of this.live) if (!now.has(key)) for (const t of this.buckets.get(key) ?? []) this.apply(t, false);
    for (const key of now) if (!this.live.has(key)) for (const t of this.buckets.get(key) ?? []) this.apply(t, true);
    this.live = now;
  }

  /** Build mode: everything standing goes faint. */
  setFade(f: number): void {
    if (Math.abs(f - this.fade) < 0.005) return;
    this.fade = f;
    for (const set of this.buckets.values()) {
      for (const t of set) { t.img.setAlpha(f); t.shadow?.setAlpha(SHADOW_ALPHA * f); }
    }
  }

  /** Whatever stands near a place springs up from the ground. */
  popNear(x: number, y: number, reach: number): void {
    for (const t of [...this.buckets.values()].flatMap((b) => [...b])) {
      if (!t.shown || Math.hypot(t.x - x, t.y - y) > reach) continue;
      const { scaleX, scaleY } = t.img;
      t.img.setScale(scaleX * 0.5, scaleY * 0.05);
      this.scene.tweens.add({ targets: t.img, scaleX, scaleY, duration: 480, delay: 60 + Math.hypot(t.x - x, t.y - y) * 5, ease: 'Back.easeOut' });
    }
  }

  clear(): void {
    for (const set of this.buckets.values()) for (const t of set) { t.img.destroy(); t.shadow?.destroy(); }
    this.buckets.clear();
  }
}

const bucketOf = (x: number, y: number): string => `${Math.floor(x / BUCKET)},${Math.floor(y / BUCKET)}`;
