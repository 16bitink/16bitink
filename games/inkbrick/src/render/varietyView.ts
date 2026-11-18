import Phaser from 'phaser';
import { BOARD_W, type LevelDef } from '../sim/types';
import { brickKey } from './art';
import { BUMPER_DISC, linkColour } from './ink/variety';
import type { BoardView } from './port';

/**
 * The variety pieces on the board (docs/inkbrick-design.md, "New pieces" and
 * "Goals"): bumpers that flash when kicked, flip walls (solid, or a dashed
 * outline when open), walking crabs, the goal's pearls, the daily's hidden
 * pearl, the caged friend of a rescue (freed, it swims or flies to Skip and
 * bounces on the raft) and the tide's danger line. Synced from the view.
 */
const KICK_S = 0.16;
const BUMP_POP_MS = 160;
/** A crab is drawn wider than its 3 x 2 box (claws and legs reach out), so it reads on a phone. */
const CRAB_DRAW = 1.5;
const CRAB_FPS = 7;
const CRAB_FAST_FPS = 18;
const PEARL_SIZE = 40;
const PEARL_BOB_PX = 2.5;
const DAILY_PEARL_SIZE = 20;
const DAILY_PEARL_ALPHA = 0.8;
const GLINT_EVERY_MS = 4200;
const GLINT_MS = 520;
/** A friend is drawn bigger than its 2 x 2 cells so it reads on a phone. */
const FRIEND_MIN = 62;
const FRIEND_TRIP_MS = 1300;
const FRIEND_HOP_MS = 380;
/** Where a freed friend sits on the raft: share of the raft's half-width right of centre, and above the deck. */
const ABOARD_X = 0.72;
const ABOARD_Y = 20;
const RAFT_Y = 900;

type Trip = 'caged' | 'going' | 'aboard';

export class VarietyView {
  private readonly bumpers: Phaser.GameObjects.Image[] = [];
  private readonly bumpPop: number[] = [];
  private readonly flipsOn: Phaser.GameObjects.Image[] = [];
  private readonly flipsOff: Phaser.GameObjects.Image[] = [];
  private readonly crabs: Phaser.GameObjects.Image[] = [];
  private readonly crabLastX: number[] = [];
  private readonly pearls: Phaser.GameObjects.Image[] = [];
  private readonly pearlTaken: boolean[] = [];
  private readonly dailyPearl: Phaser.GameObjects.Image | null = null;
  private readonly glint: Phaser.GameObjects.Image | null = null;
  private dailyFound = false;
  private readonly friend: Phaser.GameObjects.Image | null = null;
  private readonly cage: Phaser.GameObjects.Image | null = null;
  private readonly who: string;
  private trip: Trip = 'caged';
  private tripT = 0;
  private tripFrom = { x: 0, y: 0 };
  private friendScale = 1;
  private readonly tide: Phaser.GameObjects.Image | null = null;
  private clockMs = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly layer: Phaser.GameObjects.Container, level: LevelDef, first: BoardView) {
    const tideY = first.tideLineY;
    if (tideY !== null) {
      this.tide = scene.add.image(BOARD_W / 2, tideY, 'tide-line').setOrigin(0.5, 0.32).setDisplaySize(BOARD_W, 28);
      layer.add(this.tide);
    }
    first.flips.forEach((f) => {
      const c = linkColour(f.link);
      const wc = f.w / 15;
      const hc = f.h / 15;
      const on = scene.add.image(f.x, f.y, brickKey(scene, `flip-on-${c}`, wc, hc)).setOrigin(0, 0).setDisplaySize(f.w, f.h);
      const off = scene.add.image(f.x, f.y, brickKey(scene, `flip-off-${c}`, wc, hc)).setOrigin(0, 0).setDisplaySize(f.w, f.h);
      layer.add([off, on]);
      this.flipsOn.push(on);
      this.flipsOff.push(off);
    });
    first.bumpers.forEach((b) => {
      const img = scene.add.image(b.x, b.y, 'bumper').setDisplaySize((b.r * 2) / BUMPER_DISC, (b.r * 2) / BUMPER_DISC);
      layer.add(img);
      this.bumpers.push(img);
      this.bumpPop.push(0);
    });
    first.crabs.forEach((k) => {
      const img = scene.add.image(k.x + k.w / 2, k.y + k.h, 'crab-1').setOrigin(0.5, 0.86).setDisplaySize(k.w * CRAB_DRAW, k.w * CRAB_DRAW * 0.7);
      layer.add(img);
      this.crabs.push(img);
      this.crabLastX.push(k.x);
    });
    first.pearls.forEach((p) => {
      const img = scene.add.image(p.x, p.y, 'pearl').setDisplaySize(PEARL_SIZE, PEARL_SIZE);
      layer.add(img);
      this.pearls.push(img);
      this.pearlTaken.push(false);
    });
    if (first.dailyPearl) {
      this.dailyPearl = scene.add.image(first.dailyPearl.x, first.dailyPearl.y, 'pearl-daily').setDisplaySize(DAILY_PEARL_SIZE, DAILY_PEARL_SIZE).setAlpha(DAILY_PEARL_ALPHA);
      this.glint = scene.add.image(first.dailyPearl.x + 5, first.dailyPearl.y - 5, 'shimmer').setDisplaySize(16, 16).setAlpha(0);
      layer.add([this.dailyPearl, this.glint]);
    }
    this.who = first.rescue?.who ?? level.rescue?.who ?? 'pup';
    if (first.rescue) {
      const r = first.rescue;
      const size = Math.max(FRIEND_MIN, r.w * 1.4);
      this.friend = scene.add.image(r.x + r.w / 2, r.y + r.h / 2, `friend-${this.who}`).setDisplaySize(size, size);
      this.cage = scene.add.image(r.x + r.w / 2, r.y + r.h / 2, 'cage').setDisplaySize(size, size);
      layer.add([this.friend, this.cage]);
      scene.tweens.add({ targets: this.friend, angle: { from: -4, to: 4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /** Dark levels: lift the daily pearl's glint above the darkness (call after the Lantern is made) and light it. */
  aboveDark(layer: Phaser.GameObjects.Container): void {
    if (!this.glint) return;
    layer.bringToTop(this.glint);
    this.glint.setTint(0xfff1c8).setTintMode(Phaser.TintModes.FILL);
  }

  /** The sim kicked a stone off bumper i: a flash and a pop. */
  bump(i: number): void {
    if (this.bumpers[i]) this.bumpPop[i] = BUMP_POP_MS;
  }

  /** The field sank a step: the danger line throbs. */
  tideStep(): void {
    if (this.tide) this.scene.tweens.add({ targets: this.tide, alpha: { from: 0.35, to: 1 }, duration: 260, repeat: 1 });
  }

  /** A crab was hit: it jumps. */
  crabHit(i: number): void {
    const c = this.crabs[i];
    if (c) this.scene.tweens.add({ targets: c, y: c.y - 6, duration: 90, yoyo: true });
  }

  sync(v: BoardView, dtMs: number): void {
    this.clockMs += dtMs;
    this.syncBumpers(v, dtMs);
    v.flips.forEach((f, i) => {
      this.flipsOn[i]?.setPosition(f.x, f.y).setVisible(f.solid);
      this.flipsOff[i]?.setPosition(f.x, f.y).setVisible(!f.solid);
    });
    this.syncCrabs(v);
    this.syncPearls(v);
    this.syncDailyPearl(v);
    this.syncFriend(v, dtMs);
  }

  private syncBumpers(v: BoardView, dtMs: number): void {
    v.bumpers.forEach((b, i) => {
      const img = this.bumpers[i];
      if (!img) return;
      const kicked = (b.kickAt >= 0 && v.clock - b.kickAt < KICK_S) || this.bumpPop[i]! > 0;
      this.bumpPop[i] = Math.max(0, this.bumpPop[i]! - dtMs);
      const d = (b.r * 2) / BUMPER_DISC;
      const pop = kicked ? 1.12 : 1;
      img.setTexture(kicked ? 'bumper-lit' : 'bumper').setPosition(b.x, b.y).setDisplaySize(d * pop, d * pop);
    });
  }

  private syncCrabs(v: BoardView): void {
    v.crabs.forEach((k, i) => {
      const img = this.crabs[i];
      if (!img) return;
      const fast = k.fastLeft > 0;
      const moving = Math.abs(k.x - (this.crabLastX[i] ?? k.x)) > 0.01 || fast;
      this.crabLastX[i] = k.x;
      const step = Math.floor((this.clockMs / 1000) * (fast ? CRAB_FAST_FPS : CRAB_FPS)) % 2;
      const frame = fast ? (step ? 'crab-3' : 'crab-2') : moving ? (step ? 'crab-2' : 'crab-1') : 'crab-1';
      const wobble = moving ? Math.sin(this.clockMs * 0.03) * 0.04 : 0;
      img.setTexture(frame).setPosition(k.x + k.w / 2, k.y + k.h).setRotation(wobble);
    });
  }

  private syncPearls(v: BoardView): void {
    v.pearls.forEach((p, i) => {
      const img = this.pearls[i];
      if (!img || this.pearlTaken[i]) return;
      if (p.taken) {
        this.pearlTaken[i] = true;
        this.popAway(img, 1.8);
        return;
      }
      img.setPosition(p.x, p.y + Math.sin(this.clockMs * 0.003 + i * 1.7) * PEARL_BOB_PX);
    });
  }

  private syncDailyPearl(v: BoardView): void {
    if (!this.dailyPearl || !this.glint || this.dailyFound) return;
    if (v.dailyPearlFound) {
      this.dailyFound = true;
      this.glint.setVisible(false);
      this.popAway(this.dailyPearl, 2.6);
      return;
    }
    if (v.dailyPearl) {
      this.dailyPearl.setPosition(v.dailyPearl.x, v.dailyPearl.y);
      this.glint.setPosition(v.dailyPearl.x + 5, v.dailyPearl.y - 5);
    }
    // Now and then a glint, so a sharp eye finds it.
    const t = this.clockMs % GLINT_EVERY_MS;
    this.glint.setAlpha(t < GLINT_MS ? Math.sin((t / GLINT_MS) * Math.PI) * 0.9 : 0);
  }

  private popAway(img: Phaser.GameObjects.Image, grow: number): void {
    this.scene.tweens.add({ targets: img, scaleX: img.scaleX * grow, scaleY: img.scaleY * grow, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => img.setVisible(false) });
  }

  private syncFriend(v: BoardView, dtMs: number): void {
    const f = this.friend;
    if (!f || !this.cage) return;
    if (this.trip === 'caged') {
      if (v.rescue) {
        f.setPosition(v.rescue.x + v.rescue.w / 2, v.rescue.y + v.rescue.h / 2);
        this.cage.setPosition(f.x, f.y);
      }
      if (v.rescued) this.free(f);
      return;
    }
    const to = { x: v.paddleX + (v.paddleW / 2) * ABOARD_X, y: RAFT_Y - ABOARD_Y };
    if (this.trip === 'going') {
      this.tripT = Math.min(1, this.tripT + dtMs / FRIEND_TRIP_MS);
      const t = this.tripT;
      const e = t * t * (3 - 2 * t);
      // A swim dips and weaves; a flight (the puffin chick) arcs up and flaps.
      const flying = this.who === 'puffin';
      const arc = flying ? -Math.sin(t * Math.PI) * 120 : Math.sin(t * Math.PI * 3) * 14;
      f.setPosition(this.tripFrom.x + (to.x - this.tripFrom.x) * e + (flying ? 0 : Math.sin(t * Math.PI * 4) * 10), this.tripFrom.y + (to.y - this.tripFrom.y) * e + arc);
      const k = this.friendScale;
      f.setScale(k, flying ? k * (0.8 + 0.2 * Math.abs(Math.sin(this.clockMs * 0.03))) : k);
      f.setRotation(flying ? 0 : Math.sin(this.clockMs * 0.02) * 0.2);
      if (t >= 1) {
        this.trip = 'aboard';
        f.setScale(this.friendScale).setRotation(0);
      }
      return;
    }
    // Aboard: a happy bounce on the raft, riding along with it.
    const hop = Math.abs(Math.sin((this.clockMs / FRIEND_HOP_MS) * Math.PI)) * 9;
    f.setPosition(to.x, to.y - hop);
  }

  private free(f: Phaser.GameObjects.Image): void {
    this.trip = 'going';
    this.tripT = 0;
    this.tripFrom = { x: f.x, y: f.y };
    this.friendScale = f.scaleX;
    this.scene.tweens.killTweensOf(f);
    f.setAngle(0).setTexture(`friend-${this.who}-happy`);
    // Brought to the front: it travels over the bricks to Skip.
    this.layer.bringToTop(f);
    const cage = this.cage!;
    this.scene.tweens.add({ targets: cage, scaleX: cage.scaleX * 1.5, scaleY: cage.scaleY * 1.5, alpha: 0, angle: 12, duration: 380, ease: 'Quad.easeOut', onComplete: () => cage.setVisible(false) });
  }
}
