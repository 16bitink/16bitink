import Phaser from 'phaser';
import { INK } from '../../art/palette';
import { snakeJobs, TEX } from '../../art/textures';
import { releaseScratch } from '../../art/pen';
import { snakeArt } from '../../art/snakes/index';
import type { SnakeId } from '../../logic/species';
import { inkButton, inkText, type ButtonOpts } from '../ui';
import { albumFrame } from './albumFrame';
import { freePaper, paperCard } from '../uiPaint';
import { screenSize, toView, uiScaleOf, viewSize } from '../hidpi';
import { isPhone, PHONE_CARD_CSS, phoneCardFit, sizer, type Sizer } from '../uiSizes';

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
/** Room kept round a card, layout units. */
const ROOM = { x: 16, y: 24 } as const;

export class CardBuilder {
  readonly root: Phaser.GameObjects.Container;
  y = 30;
  /** Album page tier (0..6): a decorative frame on the paper. */
  frameTier = 0;
  private readonly seed: number;
  /** Sizes at the smallest the card will draw (phone minimums, see uiSizes). */
  readonly z: Sizer;
  /** The smallest fit the card takes on a phone (0 elsewhere). */
  private readonly minFit: number;

  /** `minCss`: the least CSS px per unit the card draws at on a phone (more for a grid of day targets). */
  constructor(private readonly scene: Phaser.Scene, seed: number, minCss = PHONE_CARD_CSS) {
    this.root = scene.add.container(0, 0);
    this.seed = seed;
    const phone = isPhone(screenSize(scene));
    const ui = uiScaleOf(scene);
    this.minFit = phone ? phoneCardFit(viewSize(scene).width, CARD_W, ui, ROOM.x, minCss) : 0;
    this.z = sizer(phone, ui * (phone ? this.minFit : 1));
  }

  /** Whether the card is laid out for a phone. */
  get phone(): boolean {
    return this.z.phone;
  }

  /** A line (or a wrapped paragraph) of hand lettering, centred. */
  text(s: string, size: number, color?: string, gap = 6): Phaser.GameObjects.Text {
    const t = inkText(this.scene, 0, this.y, s, this.z.text(size), color).setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(TEXT_W);
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
    const between = this.z.gap(10);
    const w = Math.min(200, (TEXT_W + 20 - (list.length - 1) * between) / list.length);
    const bh = this.z.tap(h);
    this.block(bh, (cy) => list.map((b, i) => inkButton(this.scene, (i - (list.length - 1) / 2) * (w + between), cy, b.label, b.run, { width: w, height: bh, size, ...(b.kind ? { kind: b.kind } : {}) })), this.z.gap(gap));
  }

  /** Puts the paper under everything built, sized to it, and fits the card on screen. */
  finish(view: { readonly width: number; readonly height: number }, upright: boolean): Phaser.GameObjects.Container {
    const h = Math.ceil((this.y + 18) / 10) * 10;
    const paper = paperCard(this.scene, 0, h / 2, CARD_W, h, this.seed, { tapes: ['tl', 'tr'], rule: true });
    const body = this.scene.add.zone(0, h / 2, CARD_W, h).setInteractive();
    this.root.addAt([body, paper, ...(this.frameTier > 0 ? [albumFrame(this.scene, CARD_W, h, this.frameTier)] : [])], 0);
    const fits = Math.min(upright ? 1.5 : 1.15, (view.height - ROOM.y) / h, (view.width - ROOM.x) / CARD_W);
    // A phone keeps the card legible: one taller than the screen scrolls (drag or wheel) instead of shrinking.
    const fit = Math.max(0.3, this.z.phone ? Math.max(fits, this.minFit) : fits);
    const tall = h * fit > view.height - ROOM.y;
    const y = tall ? ROOM.y / 2 : view.height / 2 - (h / 2) * fit;
    this.root.setPosition(view.width / 2, y).setScale(fit * 0.94).setAlpha(0);
    this.scene.tweens.add({ targets: this.root, scale: fit, alpha: 1, duration: 200, ease: 'Back.Out' });
    if (tall) this.scrolls(view.height - ROOM.y / 2 - h * fit, ROOM.y / 2);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => freePaper(this.scene, CARD_W, h, this.seed));
    return this.root;
  }

  /** Lets the card be dragged (or wheeled) up and down between `minY` and `maxY`. */
  private scrolls(minY: number, maxY: number): void {
    const input = this.scene.input;
    let from: { y: number; rootY: number } | null = null;
    const clamp = (v: number): number => Math.min(maxY, Math.max(minY, v));
    const down = (p: Phaser.Input.Pointer): void => {
      from = { y: toView(p.x, p.y, this.scene).y, rootY: this.root.y };
    };
    const move = (p: Phaser.Input.Pointer): void => {
      if (!from || !p.isDown) return;
      this.root.setY(clamp(from.rootY + toView(p.x, p.y, this.scene).y - from.y));
    };
    const up = (): void => {
      from = null;
    };
    const wheel = (_p: unknown, _o: unknown, _dx: number, dy: number): void => {
      this.root.setY(clamp(this.root.y - dy));
    };
    input.on('pointerdown', down).on('pointermove', move).on('pointerup', up).on('wheel', wheel);
    this.root.once(Phaser.GameObjects.Events.DESTROY, () => {
      input.off('pointerdown', down).off('pointermove', move).off('pointerup', up).off('wheel', wheel);
    });
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
