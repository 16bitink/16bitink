import Phaser from 'phaser';
import { ART_STYLE } from '../art/style';
import { BOARD_W, type BrickKind } from '../sim/types';
import { C } from './ink/palette';

/**
 * The juice: chips when a brick breaks (its colour), a keg's blast ring,
 * a split's sparkle and "x3!", and the break-in shout. Shakes are asked of
 * the scene's camera by the caller. Chips are capped so a 300-ball cascade
 * stays smooth.
 */
const hex = (c: string): number => parseInt(c.slice(1), 16);
/** Ink set: the bricks' own muted fills (the chip's ink edge stays dark under the tint). */
const CHIP_COLOURS: Readonly<Record<BrickKind, number>> = ART_STYLE === 'ink'
  ? { soft: hex(C.sand), tough: hex(C.drift), stone: hex(C.stone), x3: hex(C.mauve), keg: hex(C.orange), pickup: hex(C.sage), ice: hex(C.ice), key: hex(C.teal), gate: hex(C.gate), lever: hex(C.drift) }
  : { soft: 0xe8c98a, tough: 0xa0703c, stone: 0x8a8e94, x3: 0xf0a0c8, keg: 0xff8040, pickup: 0x7ad0a0, ice: 0xd8f4ff, key: 0xf0d040, gate: 0x6a5a8a, lever: 0xa0703c };
/** Ink lettering: the words are inked on a paper outline, like the HUD's. */
const INK_TEXT = '#1b1a1f';
const PAPER_EDGE = '#f4eddc';
const MAX_CHIPS_PER_FRAME = 60;
const CHIPS_PER_BREAK = 5;
const BLAST_RADIUS = 45;
/** The shout never spans more than this share of the board. */
const SHOUT_MAX_W = 0.88;

export const SHOUTS = ['In we go!', 'Break in!', "Skip's in!", 'Through the gap!', 'Here we go!'] as const;

export class Fx {
  private readonly chips: Phaser.GameObjects.Particles.ParticleEmitter;
  private budget = MAX_CHIPS_PER_FRAME;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container, private readonly font: string) {
    this.chips = scene.add.particles(0, 0, 'chip', {
      lifespan: 450, speed: { min: 60, max: 200 }, angle: { min: 0, max: 360 }, rotate: { min: 0, max: 360 }, gravityY: 600, scale: { start: 0.9, end: 0.2 }, emitting: false,
    });
    layer.add(this.chips);
  }

  /** Call once per frame before the events: resets the chip budget. */
  frame(): void {
    this.budget = MAX_CHIPS_PER_FRAME;
  }

  breakAt(x: number, y: number, kind: BrickKind): void {
    if (this.budget <= 0) return;
    const n = Math.min(CHIPS_PER_BREAK, this.budget);
    this.budget -= n;
    this.chips.setParticleTint(CHIP_COLOURS[kind]);
    this.chips.explode(n, x, y);
  }

  blast(x: number, y: number): void {
    const ring = ART_STYLE === 'ink'
      ? this.scene.add.image(x, y, 'blast').setDisplaySize(BLAST_RADIUS * 2, BLAST_RADIUS * 2).setAngle(Math.random() * 360)
      : this.scene.add.circle(x, y, BLAST_RADIUS, 0xffc060, 0.55);
    this.layer.add(ring);
    const s = ring.scale;
    this.scene.tweens.add({ targets: ring, scale: { from: 0.3 * s, to: 1.3 * s }, alpha: { from: 0.95, to: 0 }, duration: 340, onComplete: () => ring.destroy() });
    this.chips.setParticleTint(CHIP_COLOURS.keg);
    this.chips.explode(14, x, y);
  }

  /** A floating word (split's "x3!", a pickup's name). */
  pop(x: number, y: number, text: string, colour = '#fff4c0', size = 22): void {
    const ink = ART_STYLE === 'ink';
    const t = this.scene.add.text(x, y, text, { fontFamily: this.font, fontSize: `${size}px`, fontStyle: 'bold', color: ink ? INK_TEXT : colour, stroke: ink ? PAPER_EDGE : '#2a1a08', strokeThickness: ink ? 6 : 5 }).setOrigin(0.5).setResolution(2);
    this.layer.add(t);
    this.scene.tweens.add({ targets: t, y: y - 40, alpha: { from: 1, to: 0 }, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  /** The break-in shout, big across the board. */
  shout(text: string, x: number, y: number): void {
    const ink = ART_STYLE === 'ink';
    const t = this.scene.add.text(x, y, text, { fontFamily: this.font, fontSize: '64px', fontStyle: 'bold', color: ink ? INK_TEXT : '#ffe680', stroke: ink ? PAPER_EDGE : '#2a1a08', strokeThickness: ink ? 12 : 10 }).setOrigin(0.5).setResolution(2);
    this.layer.add(t);
    const fit = Math.min(1, (BOARD_W * SHOUT_MAX_W) / t.width);
    this.scene.tweens.add({ targets: t, scale: { from: 0.3 * fit, to: fit }, angle: { from: -8, to: -3 }, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, y: y - 60, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }
}
