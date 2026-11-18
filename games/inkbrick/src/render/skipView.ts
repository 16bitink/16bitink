import Phaser from 'phaser';
import { ART_STYLE } from '../art/style';
import { whapCanvas } from './ink/whap';
import type { BallView, BoardView } from './port';

/**
 * Skip on his raft, alive: drawing only (the raft's hitbox and the physics
 * are the sim's). He bobs with the raft, leans toward the stone coming down,
 * raises his paws when it gets close, swats it with a paw on the very frame
 * the sim bounces it (with a squash and an ink "whap"), flinches at a near
 * miss, holds the stone while aiming and throws it on launch. The frames are
 * the skip-* sprites; the paint set maps the ink-only frames to its four.
 */
export type SkipPose = 'aim' | 'idle' | 'cheer' | 'shrug' | 'ready' | 'swat-up' | 'swat-across' | 'throw';

/** The sprite: 194 x 105 image px, the raft's 180 from x 0; the otter is the rows above SKIP_BODY_PX. */
const IMG_W = 194;
const IMG_H = 105;
const RAFT_IMG_W = 180;
const SKIP_BODY_PX = 80;
/** Ink Skip is drawn this much bigger than the raft-sized sprite, so he reads on a phone. */
const INK_SCALE = 1.4;
const BASE = 0.5 * (ART_STYLE === 'ink' ? INK_SCALE : 1);
/** He settles this far into the deck (board px). */
const SINK = 4;

const READY_PX = 130;
const WATCH_PX = 340;
const NEAR_X = 70;
const LEAN_MAX = 0.08;
const LEAN_EASE = 0.18;
const SWAT_MS = 220;
const THROW_MS = 300;
const FLINCH_MS = 480;
const FLINCH_COOLDOWN_MS = 700;
const MISS_BAND = 40;
const MISS_X = 45;
const WHAP_MS = 200;
const BOB_HZ = 0.45;
const BOB_PX = 1.1;
const BLINK_MS = 110;
/** The open eye on the aim and ready frames, image px from the sprite's top-left. */
const EYE = { x: 50, y: 32, r: 3.4 };
const FACE = 0xf1e6d2;
const INK = 0x1b1a1f;

/** Frames the paint set lacks, shown with its own four. */
const PAINT_FRAME: Readonly<Record<SkipPose, string>> = {
  aim: 'aim', idle: 'idle', cheer: 'cheer', shrug: 'shrug', ready: 'idle', 'swat-up': 'cheer', 'swat-across': 'cheer', throw: 'cheer',
};
const frameKey = (p: SkipPose): string => `skip-${ART_STYLE === 'ink' ? p : PAINT_FRAME[p]}`;
const OPEN_EYED: ReadonlySet<SkipPose> = new Set<SkipPose>(['aim', 'ready']);

/** The stone Skip should watch: the nearest one on its way down, or null. */
export function watchedBall(balls: readonly BallView[], deckY: number): BallView | null {
  let best: BallView | null = null;
  let bestT = Infinity;
  for (const b of balls) {
    if (b.vy <= 0 || b.y >= deckY) continue;
    const t = (deckY - b.y) / b.vy;
    if (t < bestT) {
      bestT = t;
      best = b;
    }
  }
  return best;
}

export class SkipView {
  private readonly rig: Phaser.GameObjects.Container;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly lid: Phaser.GameObjects.Graphics;
  private readonly whap: Phaser.GameObjects.Image;
  private pose: SkipPose = 'aim';
  private override: SkipPose | null = null;
  private overrideFor = 0;
  private hop = 0;
  private squash = 0;
  private shake = 0;
  private lean = 0;
  private whapFor = 0;
  private flinchCooldown = 0;
  private blinkIn = 2600;
  private clock = 0;
  private wasHeld = true;

  constructor(private readonly scene: Phaser.Scene, layer: Phaser.GameObjects.Container, private readonly deckY: number) {
    if (!scene.textures.exists('whap')) scene.textures.addCanvas('whap', whapCanvas());
    this.sprite = scene.add.image(0, 0, frameKey('aim')).setOrigin(RAFT_IMG_W / 2 / IMG_W, SKIP_BODY_PX / IMG_H);
    this.sprite.setCrop(0, 0, IMG_W, SKIP_BODY_PX);
    this.lid = scene.add.graphics().setVisible(false);
    this.drawLid();
    this.rig = scene.add.container(0, deckY, [this.sprite, this.lid]);
    this.whap = scene.add.image(0, 0, 'whap').setOrigin(0.42, 0.86).setVisible(false);
    layer.add([this.rig, this.whap]);
  }

  /** A closed lid over the open eye, in the sprite's image px around the rig's origin. */
  private drawLid(): void {
    const ox = EYE.x - RAFT_IMG_W / 2;
    const oy = EYE.y - SKIP_BODY_PX;
    this.lid.fillStyle(FACE, 1).fillCircle(ox, oy, EYE.r);
    this.lid.lineStyle(1.4, INK, 1).beginPath().arc(ox, oy - 1, EYE.r * 0.9, 0.25, Math.PI - 0.25).strokePath();
  }

  /** A timed pose: the break-in's cheer, a lost heart's shrug. */
  strike(p: SkipPose, ms: number): void {
    this.override = p;
    this.overrideFor = ms;
    if (p === 'cheer') this.hop = 1;
  }

  /** The sim bounced a stone off the raft at x: Skip swats it, on that side, this very frame. */
  swat(x: number, raftX: number): void {
    const left = x < raftX;
    this.strike(left ? 'swat-up' : 'swat-across', SWAT_MS);
    this.squash = 1;
    this.lean = (left ? -1 : 1) * LEAN_MAX;
    this.whapFor = WHAP_MS;
    this.whap.setPosition(x, this.deckY - 6).setFlipX(left).setVisible(true).setAlpha(1).setScale(0.5);
  }

  sync(v: BoardView, dtMs: number): void {
    this.clock += dtMs;
    // A caught stone (Sticky Raft) is held just like one waiting to be skipped.
    const holding = v.held || v.caught;
    if (this.wasHeld && !holding) this.strike('throw', THROW_MS);
    this.wasHeld = holding;
    this.tickTimers(dtMs);
    const target = holding ? null : watchedBall(v.balls, this.deckY);
    this.checkNearMiss(v);
    this.setPose(this.choose(v, target));
    this.place(v, target);
    this.blink(dtMs);
  }

  private tickTimers(dtMs: number): void {
    if (this.overrideFor > 0 && (this.overrideFor -= dtMs) <= 0) this.override = null;
    this.flinchCooldown -= dtMs;
    const k = Math.min(1, dtMs / 16.7);
    this.squash *= Math.pow(0.78, k);
    this.shake *= Math.pow(0.82, k);
    this.hop = Math.max(0, this.hop - dtMs / 1200);
    if (this.whapFor > 0) {
      this.whapFor -= dtMs;
      const t = 1 - Math.max(0, this.whapFor) / WHAP_MS;
      this.whap.setAlpha(1 - t * t).setScale(0.5 + 0.25 * t);
      if (this.whapFor <= 0) this.whap.setVisible(false);
    }
  }

  /** A stone that slipped just past the raft's end makes him flinch. */
  private checkNearMiss(v: BoardView): void {
    if (this.flinchCooldown > 0 || v.held || v.caught) return;
    const half = v.paddleW / 2;
    for (const b of v.balls) {
      if (b.vy <= 0 || b.y < this.deckY + 10 || b.y > this.deckY + 10 + MISS_BAND) continue;
      const off = Math.abs(b.x - v.paddleX) - half;
      if (off < 0 || off > MISS_X) continue;
      this.strike('shrug', FLINCH_MS);
      this.shake = 1;
      this.flinchCooldown = FLINCH_COOLDOWN_MS;
      return;
    }
  }

  private choose(v: BoardView, target: BallView | null): SkipPose {
    if (this.override) return this.override;
    if (v.held || v.caught) return 'aim';
    if (target && this.deckY - target.y < READY_PX && Math.abs(target.x - v.paddleX) < v.paddleW / 2 + NEAR_X) return 'ready';
    return 'idle';
  }

  private setPose(p: SkipPose): void {
    if (p === this.pose) return;
    this.pose = p;
    this.sprite.setTexture(frameKey(p));
    this.sprite.setCrop(0, 0, IMG_W, SKIP_BODY_PX);
  }

  private place(v: BoardView, target: BallView | null): void {
    const watching = target !== null && this.deckY - target.y < WATCH_PX;
    if (!this.override) {
      const want = watching ? Phaser.Math.Clamp((target.x - v.paddleX) / 90, -1, 1) * LEAN_MAX * (this.pose === 'ready' ? 1 : 0.5) : 0;
      this.lean += (want - this.lean) * LEAN_EASE;
    }
    const bob = Math.sin(this.clock * 0.001 * Math.PI * 2 * BOB_HZ) * BOB_PX;
    const hop = Math.abs(Math.sin(this.hop * Math.PI * 4)) * this.hop * 10;
    const jig = this.shake > 0.05 ? Math.sin(this.clock * 0.09) * 3 * this.shake : 0;
    const stretch = this.pose === 'ready' ? 0.05 : 0;
    this.rig
      .setPosition(v.paddleX + jig, this.deckY + SINK + bob - hop)
      .setRotation(this.lean)
      .setScale(BASE * (1 + 0.1 * this.squash), BASE * (1 - 0.14 * this.squash + stretch));
  }

  /** Now and then the open eye closes for a moment. */
  private blink(dtMs: number): void {
    this.blinkIn -= dtMs;
    if (this.blinkIn <= -BLINK_MS) this.blinkIn = 2200 + Math.random() * 2600;
    this.lid.setVisible(this.blinkIn <= 0 && OPEN_EYED.has(this.pose) && ART_STYLE === 'ink');
  }

  /** The bob, so the raft rides it too. */
  bobY(): number {
    return Math.sin(this.clock * 0.001 * Math.PI * 2 * BOB_HZ) * BOB_PX;
  }
}
