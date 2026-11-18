import Phaser from 'phaser';
import { INK } from '../../art/palette';
import { snakeJobs, TEX } from '../../art/textures';
import { releaseScratch } from '../../art/pen';
import { snakeArt } from '../../art/snakes/index';
import type { SnakeId } from '../../logic/species';
import { inkButton, inkText, type ButtonOpts } from '../ui';
import { freePaper, paperCard } from '../uiPaint';

/**
 * The daily's cards share this: a paper card built top-down with a cursor
 * (each piece says how tall it is), centred on the screen and fitted to
 * it, big on an upright phone. Text wraps to the card.
 */

export const SOFT_INK = '#4a463e';
export const GOLD_INK = '#a0622c';
export const CARD_W = 440;
const PAD = 34;
export const TEXT_W = CARD_W - PAD * 2;

export class CardBuilder {
  readonly root: Phaser.GameObjects.Container;
  y = 30;
  private readonly seed: number;

  constructor(private readonly scene: Phaser.Scene, seed: number) {
    this.root = scene.add.container(0, 0);
    this.seed = seed;
  }

  /** A line (or a wrapped paragraph) of hand lettering, centred. */
  text(s: string, size: number, color?: string, gap = 6): Phaser.GameObjects.Text {
    const t = inkText(this.scene, 0, this.y, s, size, color).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(TEXT_W);
    this.root.add(t);
    this.y += t.height + gap;
    return t;
  }

  /** Room for something `h` tall, placed by `put` at its centre line. */
  block(h: number, put: (cy: number) => Phaser.GameObjects.GameObject | readonly Phaser.GameObjects.GameObject[], gap = 10): void {
    const objs = put(this.y + h / 2);
    this.root.add(Array.isArray(objs) ? [...objs] : [objs as Phaser.GameObjects.GameObject]);
    this.y += h + gap;
  }

  /** A row of buttons, side by side, sharing the card's width. */
  buttons(list: readonly { readonly label: string; readonly run: () => void; readonly kind?: ButtonOpts['kind'] }[], h = 54, size = 26, gap = 10): void {
    const w = Math.min(200, (TEXT_W + 20 - (list.length - 1) * 10) / list.length);
    this.block(h, (cy) => list.map((b, i) => inkButton(this.scene, (i - (list.length - 1) / 2) * (w + 10), cy, b.label, b.run, { width: w, height: h, size, ...(b.kind ? { kind: b.kind } : {}) })), gap);
  }

  /** Puts the paper under everything built, sized to it, and fits the card on screen. */
  finish(view: { readonly width: number; readonly height: number }, upright: boolean): Phaser.GameObjects.Container {
    const h = Math.ceil((this.y + 18) / 10) * 10;
    const paper = paperCard(this.scene, 0, h / 2, CARD_W, h, this.seed, { tapes: ['tl', 'tr'], rule: true });
    const body = this.scene.add.zone(0, h / 2, CARD_W, h).setInteractive();
    this.root.addAt([body, paper], 0);
    const fit = Math.max(0.3, Math.min(upright ? 1.5 : 1.15, (view.height - 24) / h, (view.width - 16) / CARD_W));
    this.root.setPosition(view.width / 2, view.height / 2 - (h / 2) * fit).setScale(fit * 0.94).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, scale: fit, alpha: 1, duration: 200, ease: 'Back.Out' });
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => freePaper(this.scene, CARD_W, h, this.seed));
    return this.root;
  }
}

/** Bakes a snake's drawings if they aren't yet (album cards, the teaser). */
export function bakeSnake(scene: Phaser.Scene, id: SnakeId): void {
  if (scene.textures.exists(TEX.head(id, 'shut', 0))) return;
  for (const job of snakeJobs(scene, id)) job();
  releaseScratch();
}

/** A snake's head, looking up the card, `size` units long. */
export function snakeHead(scene: Phaser.Scene, id: SnakeId, x: number, y: number, size: number): Phaser.GameObjects.Image {
  bakeSnake(scene, id);
  const art = snakeArt(id);
  return scene.add.image(x, y, TEX.head(id, 'shut', 0)).setAngle(-90).setScale(size / (art.head.frame * art.head.res));
}

/** A snake's head as an ink silhouette (tomorrow's snake: a secret until midnight). */
export function snakeSilhouette(scene: Phaser.Scene, id: SnakeId, x: number, y: number, size: number): Phaser.GameObjects.Image {
  bakeSnake(scene, id);
  const key = `${TEX.head(id, 'shut', 0)}-silhouette`;
  if (!scene.textures.exists(key)) {
    const src = scene.textures.get(TEX.head(id, 'shut', 0)).getSourceImage() as HTMLCanvasElement | HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = src.width;
    canvas.height = src.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(src, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    scene.textures.addImage(key, canvas as unknown as HTMLImageElement);
  }
  const art = snakeArt(id);
  return scene.add.image(x, y, key).setAngle(-90).setAlpha(0.8).setScale(size / (art.head.frame * art.head.res));
}

/** A soft wash panel behind a part of the card (the teaser), `w` × `h` at its centre. */
export function panel(scene: Phaser.Scene, cy: number, w: number, h: number, colour = 0xece0c4): Phaser.GameObjects.Graphics {
  return scene.add.graphics().fillStyle(colour, 0.85).fillRoundedRect(-w / 2, cy - h / 2, w, h, 14);
}
