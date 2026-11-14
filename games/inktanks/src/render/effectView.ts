import type Phaser from 'phaser';
import { WORLD, type EffectArt } from '../art/pixel/world/world';
import type { Match } from '../logic/match/match';
import type { MatchEvent, Tank } from '../logic/match/types';
import { footDepth } from './tankView';
import { WORLD_URLS, worldKey } from './worldArt';

/**
 * Effects from the world manifest's `effects` and decals (chapters 3–4):
 * - the Laser's beam (laserBeam, a strip even along x: stretched from the
 *   muzzle to where the beam stopped, flickering) and its hit spark (laserHit);
 * - thin ice (match/ice.ts): crack decals (decals.iceCrack) under a Heavy as
 *   it cracks the ice, then iceBreak where it gives way (the ground repaints
 *   as water on the 'flood' event the same step);
 * - the wake (wake: foam at the anchor, streaks trailing to −x) behind a
 *   moving barge and under the Ironclad's paddle wheels.
 * - the Rail's slug (chapter 5, match/railgun.ts): a drawn trail, a white-hot
 *   core in a hot-orange glow, fading over SLUG_SHOW (no strip for it yet).
 * Without the art a beam is a drawn line and the rest is skipped.
 */
const EFFECTS: Readonly<Record<string, EffectArt>> = WORLD.effects ?? {};
const CRACKS = WORLD.decals.iceCrack ?? [];
const NAMES = ['laserBeam', 'laserHit', 'iceBreak', 'wake'] as const;
type Name = (typeof NAMES)[number];
const key = (n: Name): string => `fx:${n}`;
const animKey = (n: Name): string => `fx:${n}-play`;
/** A beam shows this long, fading. */
const BEAM_SHOW = 0.14;
/** A Rail slug's trail shows this long, fading. */
const SLUG_SHOW = 0.3;
const DEPTH_BEAM = 5160;
/** Where the foam sits on each vessel, body frame (dx forward, dy right) at its draw scale: a barge's stern, the Ironclad's two paddle wheels (from the art). */
const WAKE_AT: Readonly<Record<string, readonly (readonly [number, number])[]>> = { barge: [[-58, 0]], ironclad: [[-24, -55], [-24, 54]] };
/** A vessel slower than this, px/s, leaves no wake. */
const WAKE_MIN = 4;

export function preloadEffects(scene: Phaser.Scene): void {
  for (const n of NAMES) {
    const e = EFFECTS[n];
    const url = e ? WORLD_URLS.get(worldKey(e.file)) : undefined;
    if (e && url && !scene.textures.exists(key(n))) scene.load.spritesheet(key(n), url, { frameWidth: e.frame[0], frameHeight: e.frame[1] });
  }
  for (const d of CRACKS) {
    const url = WORLD_URLS.get(worldKey(d.file));
    if (url && !scene.textures.exists(worldKey(d.file))) scene.load.image(worldKey(d.file), url);
  }
}

interface Beam {
  readonly obj: Phaser.GameObjects.Sprite | null;
  readonly line: readonly [number, number, number, number];
  readonly at: number;
}

export class EffectLayer {
  private beams: Beam[] = [];
  private slugs: { readonly line: readonly [number, number, number, number]; readonly at: number }[] = [];
  private readonly drawn: Phaser.GameObjects.Graphics;
  private cracks: { x: number; y: number; img: Phaser.GameObjects.Image }[] = [];
  private readonly wakes = new Map<string, Phaser.GameObjects.Sprite>();
  private now = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.drawn = scene.add.graphics().setDepth(DEPTH_BEAM);
  }

  private ready(n: Name): EffectArt | null {
    const e = EFFECTS[n];
    if (!e || !this.scene.textures.exists(key(n))) return null;
    if (!this.scene.anims.exists(animKey(n))) this.scene.anims.create({ key: animKey(n), frames: this.scene.anims.generateFrameNumbers(key(n), {}), frameRate: e.fps, repeat: e.loop ? -1 : 0 });
    return e;
  }

  /** A sprite of an effect at its anchor; one-shots remove themselves when they end. */
  private play(n: Name, x: number, y: number, depth: number): Phaser.GameObjects.Sprite | null {
    const e = this.ready(n);
    if (!e) return null;
    const s = this.scene.add.sprite(x, y, key(n)).setOrigin(e.anchor[0] / e.frame[0], e.anchor[1] / e.frame[1]).setDepth(depth).play(animKey(n));
    if (!e.loop) s.once('animationcomplete', () => s.destroy());
    return s;
  }

  onEvent(e: MatchEvent): void {
    if (e.kind === 'beam') this.beam(e);
    else if (e.kind === 'slug') this.slugs.push({ line: [e.x0, e.y0, e.x1, e.y1], at: this.now });
    else if (e.kind === 'ice') this.ice(e);
  }

  private beam(e: Extract<MatchEvent, { kind: 'beam' }>): void {
    const len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
    const art = this.ready('laserBeam');
    let obj: Phaser.GameObjects.Sprite | null = null;
    if (art && len > 2) {
      obj = this.play('laserBeam', e.x0, e.y0, DEPTH_BEAM);
      // Stretched along x from the muzzle (its left edge) to the hit; anchored on its centre line.
      obj?.setOrigin(0, art.anchor[1] / art.frame[1]).setRotation(Math.atan2(e.y1 - e.y0, e.x1 - e.x0)).setScale(len / art.frame[0], 1);
    }
    this.beams.push({ obj, line: [e.x0, e.y0, e.x1, e.y1], at: this.now });
    if (e.hit) this.play('laserHit', e.x1, e.y1, DEPTH_BEAM + 1);
  }

  private ice(e: Extract<MatchEvent, { kind: 'ice' }>): void {
    if (e.what === 'crack') {
      const d = CRACKS[Math.floor(Math.abs(e.x * 7 + e.y * 13)) % Math.max(1, CRACKS.length)];
      if (!d || !this.scene.textures.exists(worldKey(d.file))) return;
      const img = this.scene.add.image(e.x, e.y, worldKey(d.file)).setDepth(2).setScale(1.6).setRotation((e.x + e.y) % 6);
      this.cracks.push({ x: e.x, y: e.y, img });
      return;
    }
    // It gave way: the cracks round the hole go with it.
    this.cracks = this.cracks.filter((c) => {
      const gone = Math.hypot(c.x - e.x, c.y - e.y) < e.r + 40;
      if (gone) c.img.destroy();
      return !gone;
    });
    this.play('iceBreak', e.x, e.y, footDepth(e.y + 30));
  }

  update(m: Match): void {
    this.now = m.t;
    const g = this.drawn.clear();
    this.beams = this.beams.filter((b) => {
      const k = (m.t - b.at) / BEAM_SHOW;
      if (k >= 1) {
        b.obj?.destroy();
        return false;
      }
      if (b.obj) b.obj.setAlpha(1 - k * k);
      else g.lineStyle(3, 0xff5a8a, 0.9 * (1 - k)).lineBetween(...b.line).lineStyle(1, 0xffffff, 1 - k).lineBetween(...b.line);
      return true;
    });
    this.slugs = this.slugs.filter((s) => {
      const k = (m.t - s.at) / SLUG_SHOW;
      if (k >= 1) return false;
      const a = 1 - k;
      g.lineStyle(7 * (1 - k * 0.5), 0xe0661f, 0.45 * a).lineBetween(...s.line).lineStyle(3, 0xffd8a0, 0.8 * a).lineBetween(...s.line).lineStyle(1, 0xffffff, a).lineBetween(...s.line);
      return true;
    });
    this.updateWakes(m);
  }

  private updateWakes(m: Match): void {
    const live = new Set<string>();
    if (this.ready('wake')) {
      for (const t of m.tanks) {
        const at = t.alive && t.keel && Math.abs(t.speed) > WAKE_MIN ? WAKE_AT[t.body ?? ''] : undefined;
        if (!at) continue;
        at.forEach((p, i) => this.wake(t, p, `${t.id}:${i}`, live));
      }
    }
    for (const [id, s] of this.wakes) {
      if (live.has(id)) continue;
      s.destroy();
      this.wakes.delete(id);
    }
  }

  private wake(t: Tank, [dx, dy]: readonly [number, number], id: string, live: Set<string>): void {
    live.add(id);
    const c = Math.cos(t.heading);
    const s = Math.sin(t.heading);
    const x = t.x + dx * c - dy * s;
    const y = t.y + dx * s + dy * c;
    let w = this.wakes.get(id);
    if (!w) {
      const made = this.play('wake', x, y, footDepth(t.y + 20) - 0.5);
      if (!made) return;
      w = made;
      this.wakes.set(id, w);
    }
    // −x of the strip points astern: rotate it to the heading; under the hull.
    w.setPosition(x, y).setRotation(t.heading).setDepth(footDepth(t.y + 20) - 0.5).setAlpha(Math.min(1, Math.abs(t.speed) / 25));
  }

  destroy(): void {
    for (const b of this.beams) b.obj?.destroy();
    for (const c of this.cracks) c.img.destroy();
    for (const w of this.wakes.values()) w.destroy();
    this.drawn.destroy();
  }
}
