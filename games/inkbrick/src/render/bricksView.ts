import Phaser from 'phaser';
import { CELL, type LevelDef } from '../sim/types';
import { brickKey, brickTexture, lockPairs, PICTURE_TINTS } from './art';
import { KEY_FLY_H } from './ink/lock';
import type { BoardView } from './port';

/**
 * One image per brick, made once when the level starts and hidden when it
 * breaks (the view's `alive` also hides bricks that go without an event,
 * such as an opened gate). Tough and ice bricks change image as they crack;
 * a lever leans the other way once its walls have flipped. A hidden brick
 * isn't drawn until its first hit; a faint glint hints at it every few
 * seconds. Floe bricks move, and on a Rising Tide level every brick does.
 */
const GLINT_EVERY_MS = 3600;
const GLINT_MS = 600;
const GLINT_SIZE = 18;
const REVEAL_MS = 220;
/** The unlock moment: the key flies to its gate, turns in the lock, the door slides up. */
const KEY_FLY_MS = 420;
const KEY_HALO_PAD = 9;
const KEY_HALO_TINT = 0xe2b04a;
const KEY_GLINT_EVERY_MS = 2400;
const KEY_GLINT_MS = 700;
const KEY_TURN_MS = 200;
const DOOR_MS = 320;
const KEY_FLY_W = 60;

export class BricksView {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly movers: number[] = [];
  private readonly shown: boolean[] = [];
  private readonly tex: string[] = [];
  private readonly levers: number[] = [];
  /** Hidden bricks not yet revealed, each with its glint. */
  private readonly hidden = new Map<number, Phaser.GameObjects.Image>();
  /** Key bricks are small on a phone: a soft gold halo pulses behind each every couple of seconds. */
  private readonly keyGlints = new Map<number, Phaser.GameObjects.Ellipse>();
  private clockMs = 0;
  private readonly pairs: ReadonlyMap<string, number>;
  /** Gates in their unlock moment: the sim has opened them, the door is still swinging. */
  private readonly opening = new Set<number>();

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container, private readonly level: LevelDef) {
    const tide = (level.goal ?? 'clear') === 'tide';
    this.pairs = lockPairs(level.bricks);
    level.bricks.forEach((b, i) => {
      if (b.kind === 'key' && !b.hidden) {
        const halo = scene.add.ellipse((b.x + b.w / 2) * CELL, (b.y + b.h / 2) * CELL, b.w * CELL + KEY_HALO_PAD * 2, b.h * CELL + KEY_HALO_PAD * 2, KEY_HALO_TINT).setAlpha(0);
        layer.add(halo);
        this.keyGlints.set(i, halo);
      }
      const key = brickKey(scene, brickTexture(b, i, b.hp ?? 1, b.hp ?? 1, false, false, this.pairs), b.w, b.h);
      const img = scene.add.image(b.x * CELL, b.y * CELL, key).setOrigin(0, 0).setDisplaySize(b.w * CELL, b.h * CELL);
      if (b.tint !== undefined) img.setTint(PICTURE_TINTS[b.tint % PICTURE_TINTS.length]!);
      layer.add(img);
      this.images.push(img);
      this.shown.push(true);
      this.tex.push(key);
      if (b.floe || tide) this.movers.push(i);
      if (b.kind === 'lever') this.levers.push(i);
      if (b.hidden) {
        img.setVisible(false);
        const glint = scene.add.image(0, 0, 'shimmer').setDisplaySize(GLINT_SIZE, GLINT_SIZE).setAlpha(0);
        layer.add(glint);
        this.hidden.set(i, glint);
      }
    });
  }

  /** A hit that didn't break it: a flash (the crack shows on the next sync). */
  hit(i: number): void {
    const img = this.images[i];
    if (img && this.shown[i] && !this.hidden.has(i)) this.scene.tweens.add({ targets: img, alpha: { from: 0.55, to: 1 }, duration: 120 });
  }

  /** A hidden brick's first hit: it pops into view. */
  reveal(i: number): void {
    const glint = this.hidden.get(i);
    const img = this.images[i];
    if (!glint || !img) return;
    this.hidden.delete(i);
    glint.destroy();
    if (!this.shown[i]) return;
    const sx = img.scaleX;
    const sy = img.scaleY;
    img.setVisible(true);
    this.scene.tweens.add({ targets: img, scaleX: { from: sx * 1.25, to: sx }, scaleY: { from: sy * 1.25, to: sy }, alpha: { from: 0.3, to: 1 }, duration: REVEAL_MS, ease: 'Back.easeOut' });
  }

  /** A lever was hit: a little shake (its lean follows the walls on the next sync). */
  lever(i: number): void {
    const img = this.images[i];
    if (img) this.scene.tweens.add({ targets: img, y: img.y - 2, duration: 60, yoyo: true });
  }

  /**
   * A key broke at (x, y): its key flies to each of its gates, turns, and the door
   * slides up into the wall. Purely drawing; the sim opened the gates already.
   */
  unlock(keyIndex: number, x: number, y: number): void {
    const def = this.level.bricks[keyIndex];
    if (!def || def.kind !== 'key') return;
    const pair = this.pairs.get(def.link ?? '') ?? 0;
    this.level.bricks.forEach((g, i) => {
      if (g.kind !== 'gate' || g.link !== def.link || !this.shown[i]) return;
      const door = this.images[i]!;
      this.opening.add(i);
      const to = { x: door.x + door.displayWidth / 2, y: door.y + door.displayHeight / 2 };
      const flyer = this.scene.add.image(x, y, `key-fly-${pair}`).setDisplaySize(KEY_FLY_W, KEY_FLY_W * (KEY_FLY_H / 120));
      this.layer.add(flyer);
      this.scene.tweens.chain({
        targets: flyer,
        tweens: [
          { x: to.x, y: to.y, angle: 360, duration: KEY_FLY_MS, ease: 'Cubic.easeInOut' },
          { angle: 450, duration: KEY_TURN_MS, ease: 'Back.easeOut' },
          { alpha: 0, duration: 120 },
        ],
        onComplete: () => {
          flyer.destroy();
          this.openDoor(i);
        },
      });
    });
  }

  private openDoor(i: number): void {
    const door = this.images[i]!;
    const sy = door.scaleY;
    this.scene.tweens.add({
      targets: door, scaleY: { from: sy, to: sy * 0.05 }, alpha: { from: 1, to: 0.4 }, duration: DOOR_MS, ease: 'Quad.easeIn',
      onComplete: () => {
        this.opening.delete(i);
        door.setScale(door.scaleX, sy).setAlpha(1);
        this.hide(i);
      },
    });
  }

  hide(i: number): void {
    if (!this.shown[i]) return;
    this.shown[i] = false;
    this.images[i]?.setVisible(false);
    this.hidden.get(i)?.setVisible(false);
    this.keyGlints.get(i)?.destroy();
    this.keyGlints.delete(i);
  }

  /** The crumble: every brick left shakes before it goes. */
  shiver(): void {
    this.images.forEach((img, i) => {
      if (this.shown[i]) this.scene.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 60, yoyo: true, repeat: 3 });
    });
  }

  sync(v: BoardView, dtMs = 0): void {
    this.clockMs += dtMs;
    for (const i of this.movers) {
      const p = v.moved(i);
      if (p) this.images[i]?.setPosition(p.x, p.y);
    }
    const bricks = this.level.bricks;
    for (let i = 0; i < this.images.length; i++) {
      if (!this.shown[i]) continue;
      if (!v.alive(i)) {
        if (!this.opening.has(i)) this.hide(i);
        continue;
      }
      if (this.hidden.has(i) && v.revealed(i)) this.reveal(i);
      const def = bricks[i]!;
      if (def.kind !== 'tough' && def.kind !== 'ice') continue;
      this.retexture(i, brickTexture(def, i, v.hp(i), def.hp ?? 1, v.cracked(i)));
    }
    this.syncLevers(v);
    this.syncGlints();
  }

  private retexture(i: number, raw: string): void {
    const def = this.level.bricks[i]!;
    const key = brickKey(this.scene, raw, def.w, def.h);
    if (key === this.tex[i]) return;
    this.tex[i] = key;
    this.images[i]!.setTexture(key).setDisplaySize(def.w * CELL, def.h * CELL);
  }

  /** A lever leans right while its link's walls are flipped from where the level started them. */
  private syncLevers(v: BoardView): void {
    if (this.levers.length === 0) return;
    const defs = this.level.flips ?? [];
    for (const i of this.levers) {
      const def = this.level.bricks[i]!;
      const k = defs.findIndex((f) => f.link === def.link);
      const flipped = k >= 0 && v.flips[k] !== undefined && v.flips[k]!.solid !== defs[k]!.on;
      this.retexture(i, brickTexture(def, i, 1, 1, false, flipped, this.pairs));
    }
  }

  private syncGlints(): void {
    for (const [i, glint] of this.hidden) {
      const img = this.images[i]!;
      const t = (this.clockMs + i * 977) % GLINT_EVERY_MS;
      const on = t < GLINT_MS;
      glint.setPosition(img.x + img.displayWidth * (0.3 + ((i * 37) % 40) / 100), img.y + img.displayHeight / 2);
      glint.setAlpha(on ? Math.sin((t / GLINT_MS) * Math.PI) * 0.55 : 0);
    }
    for (const [i, halo] of this.keyGlints) {
      const img = this.images[i]!;
      const t = (this.clockMs + i * 613) % KEY_GLINT_EVERY_MS;
      const k = t < KEY_GLINT_MS ? Math.sin((t / KEY_GLINT_MS) * Math.PI) : 0;
      halo.setPosition(img.x + img.displayWidth / 2, img.y + img.displayHeight / 2).setScale(1 + 0.25 * k).setAlpha(0.55 * k);
    }
  }
}
