import type Phaser from 'phaser';
import type { CityEvent, CityView, Id, Pt } from '../../sim/types';
import type { RoadScene } from '../ground/roadShape';
import { lotRect } from '../../city/geometry';
import { hash2 } from '../noise';
import { project, TILT } from '../projection';
import { resample } from '../geom';
import { HAND } from '../style';
import { wrap } from './ghostLayer';
import { drawFxTextures } from './fxTextures';

/** One-shot effects: money pops, honks, sparkles when a junction clears, dust when something grows, incident markers, the coach's ring. */
const MAX_POPS = 18;
const HONK_GAP_S = 0.12;
const POP_CSS = 19;
const FONT_PX = 40;
const INCIDENT_S = 9;
const INCIDENT_LINE = 26;
const CLEARED_CSS = 46;
const CLEARED_UP = 44; // css px, to the left of the tag
const TOOTS = 6;
const TOOT_REACH = 190;
const THUMP_MS = 520;
const SHAKE = { ms: 170, by: 0.0015 } as const;
const UNROLL_STEP = 26;
const UNROLL_MS = 45;

export interface FxHooks {
  /** The green wave down a cleared junction's arms. */
  wave(node: Id): void;
  /** Cars drawn near a place. */
  carsNear(at: Pt, reach: number, n: number): readonly Pt[];
  /** Standing things at a place spring up. */
  popThings(at: Pt, reach: number): void;
}

export class Fx {
  private pops = 0;
  private honkWait = 0;
  private clock = 0;
  private zoom = 1;
  private serial = 0;
  private ring: { img: Phaser.GameObjects.Image; at: Pt } | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number, private readonly hooks: FxHooks) {
    drawFxTextures(scene);
  }

  update(dt: number, zoom: number): void {
    this.clock += dt;
    this.honkWait -= dt;
    this.zoom = zoom;
    if (!this.ring) return;
    const p = project(this.ring.at);
    const k = (this.clock * 0.9) % 1;
    this.ring.img.setPosition(p.x, p.y).setScale((0.25 + 0.6 * k) / zoom, ((0.25 + 0.6 * k) * 0.87) / zoom).setAlpha(1 - k);
  }

  play(list: readonly CityEvent[], city: CityView, scene: RoadScene): void {
    for (const e of list) this.one(e, city, scene);
  }

  private one(e: CityEvent, city: CityView, scene: RoadScene): void {
    const node = (id: number): Pt | null => scene.joins.find((j) => j.j.id === id)?.j ?? null;
    switch (e.t) {
      case 'money': return this.money(e.at, `+${Math.round(e.amount)}`, '#7a5a12');
      case 'fine': return this.money(e.at, `fine +${Math.round(e.amount)}`, '#7a5a12');
      case 'honk': return this.honk(e.at);
      case 'gaveUp': return this.money(e.at, 'gave up', '#8a2a1e');
      case 'cleared': { const p = node(e.node); if (p) this.cleared(p, e.node); return; }
      case 'built': return e.what === 'control' ? this.thump(e.at, joinNear(scene, e.at)) : this.dust(e.at, 9);
      case 'opened': return this.sparkle(e.at, 10, 0xe2b84f);
      case 'grew': { const l = city.lots.find((q) => q.id === e.lot); if (l) { const r = lotRect(l); this.dust({ x: r.x + r.w / 2, y: r.y + r.h / 2 }, 12); } return; }
      case 'incident': return this.incident(e.at, e.text);
      default: return;
    }
  }

  private text(at: Pt, words: string, colour: string): Phaser.GameObjects.Text {
    const p = project(at);
    return this.scene.add.text(p.x, p.y - 8, words, { fontFamily: HAND, fontSize: `${FONT_PX}px`, fontStyle: '700', color: colour, stroke: '#fbf5e6', strokeThickness: 9 })
      .setOrigin(0.5, 1).setScale(POP_CSS / FONT_PX / this.zoom).setDepth(this.depth + 1);
  }

  private money(at: Pt, words: string, colour: string): void {
    if (this.pops >= MAX_POPS) return;
    this.pops++;
    const t = this.text(at, words, colour);
    this.scene.tweens.add({ targets: t, y: t.y - 26 / this.zoom, alpha: { from: 1, to: 0 }, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => { t.destroy(); this.pops--; } });
  }

  private honk(at: Pt): void {
    if (this.honkWait > 0) return;
    this.honkWait = HONK_GAP_S;
    this.mark('fx-honk', at);
  }

  /** A drawn mark by a car's roof: it pops, wobbles and goes. */
  private mark(key: string, at: Pt, delay = 0): void {
    const p = project(at);
    const k = 0.24 / Math.max(0.8, Math.sqrt(this.zoom));
    const img = this.scene.add.image(p.x + 4, p.y - 6, key).setDepth(this.depth).setScale(k * 0.3).setOrigin(0.1, 0.95).setAlpha(0);
    this.scene.tweens.chain({
      targets: img, delay, onComplete: () => img.destroy(),
      tweens: [
        { scale: k, alpha: 1, duration: 130, ease: 'Back.easeOut' },
        { angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 1 },
        { y: img.y - 7, alpha: 0, duration: 320, ease: 'Sine.easeIn' },
      ],
    });
  }

  /** The game's reward: the word, the sparkle, a green wave down the arms and happy horns. */
  private cleared(at: Pt, node: Id): void {
    this.sparkle(at, 26, 0x8fc98a);
    this.hooks.wave(node);
    const t = this.text({ x: at.x, y: at.y - CLEARED_UP / this.zoom }, 'Cleared!', '#2f6b3a').setAngle(-5).setOrigin(0.85, 1);
    const k = CLEARED_CSS / FONT_PX / this.zoom;
    t.setScale(k * 0.3);
    this.scene.tweens.chain({
      targets: t, onComplete: () => t.destroy(),
      tweens: [
        { scale: k, duration: 260, ease: 'Back.easeOut' },
        { y: t.y - 18 / this.zoom, duration: 900, ease: 'Sine.easeOut' },
        { y: t.y - 44 / this.zoom, alpha: 0, duration: 620, ease: 'Sine.easeIn' },
      ],
    });
    this.hooks.carsNear(at, TOOT_REACH, TOOTS).forEach((p, i) => this.mark('fx-toot', p, 200 + i * 170));
  }

  /** Something was built at a junction: a stamp of ink strokes, a ring of dust, its signs and palms spring up. */
  private thump(at: Pt, radius: number): void {
    const p = project(at);
    const img = this.scene.add.image(p.x, p.y, 'fx-thump').setDepth(this.depth);
    const k = (radius * 2.6) / 256;
    img.setScale(k * 0.55, k * 0.55 * TILT);
    this.scene.tweens.add({ targets: img, scaleX: k * 1.25, scaleY: k * 1.25 * TILT, alpha: { from: 1, to: 0 }, duration: THUMP_MS, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + hash2(i, this.serial++, 8) * 0.3;
      const r = radius * (0.5 + 0.5 * hash2(i, this.serial, 9));
      this.puff({ x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r }, { x: Math.cos(a) * 24, y: Math.sin(a) * 20 }, 0.5 + 0.5 * hash2(i, 2, 9));
    }
    this.scene.cameras.main.shake(SHAKE.ms, SHAKE.by);
    this.hooks.popThings(at, radius + 14);
  }

  /** Dust runs along a road as it is laid. */
  unroll(line: readonly Pt[], half: number): void {
    if (line.length < 2) return;
    resample(line, UNROLL_STEP).forEach((p, i) => {
      this.scene.time.delayedCall(i * UNROLL_MS, () => {
        for (const side of [-1, 1]) this.puff({ x: p.x - Math.sin(p.a) * half * side, y: p.y + Math.cos(p.a) * half * side }, { x: -Math.sin(p.a) * 13 * side, y: Math.cos(p.a) * 13 * side - 4 }, 0.45);
      });
    });
  }

  private puff(at: Pt, go: Pt, size: number): void {
    const p = project(at);
    const img = this.scene.add.image(p.x, p.y, 'fx-cloud').setDepth(this.depth - 1).setScale(size * 0.14).setAlpha(1).setAngle(360 * hash2(this.serial++, 7, 7));
    this.scene.tweens.add({ targets: img, x: p.x + go.x, y: p.y + go.y, scale: size * 0.42, alpha: { from: 1, to: 0 }, angle: img.angle + 30, duration: 820, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
  }

  private sparkle(at: Pt, n: number, tint: number): void {
    const p = project(at);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 26 + 22 * hash2(i, this.serial++, 1);
      const img = this.scene.add.image(p.x, p.y, 'fx-star').setDepth(this.depth).setTint(tint).setScale(0.18 + 0.14 * hash2(i, 3, 2));
      this.scene.tweens.add({ targets: img, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.8 - 8, angle: 160, alpha: { from: 1, to: 0 }, duration: 900 + 300 * hash2(i, 5, 2), ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
    }
  }

  private dust(at: Pt, n: number): void {
    const p = project(at);
    for (let i = 0; i < n; i++) {
      const a = hash2(i, this.serial++, 4) * Math.PI * 2;
      const r = 10 + 26 * hash2(i, this.serial, 5);
      const img = this.scene.add.image(p.x, p.y, 'fx-dust').setDepth(this.depth).setScale(0.2).setAlpha(0.8);
      this.scene.tweens.add({ targets: img, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.6, scale: 0.6, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => img.destroy() });
    }
  }

  private incident(at: Pt, text: string): void {
    const p = project(at);
    const img = this.scene.add.image(p.x, p.y - 6, 'fx-warn').setOrigin(0.5, 1).setDepth(this.depth).setScale(0.3);
    const t = this.text({ x: at.x, y: at.y - 24 }, wrap(text, INCIDENT_LINE), '#5b4a1a').setAlign('center');
    this.scene.tweens.add({ targets: img, y: img.y - 5, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.easeInOut' });
    this.scene.time.delayedCall(INCIDENT_S * 1000, () => { this.scene.tweens.killTweensOf(img); img.destroy(); t.destroy(); });
  }

  point(at: Pt | null): void {
    if (!at) { this.ring?.img.destroy(); this.ring = null; return; }
    if (this.ring) this.ring.at = at;
    else this.ring = { img: this.scene.add.image(0, 0, 'fx-ring').setDepth(this.depth + 2), at };
  }
}

const DEFAULT_RADIUS = 24;
/** The radius of the junction at a place. */
function joinNear(scene: RoadScene, at: Pt): number {
  const j = scene.joins.find((q) => Math.hypot(q.j.x - at.x, q.j.y - at.y) < DEFAULT_RADIUS);
  return Math.max(DEFAULT_RADIUS, j?.j.radius ?? 0);
}
