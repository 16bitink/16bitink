import type Phaser from 'phaser';
import { OIL_FIRE } from '../logic/gadgetTiers';
import type { Patch } from '../logic/match/gadgets';
import type { Match } from '../logic/match/match';

/**
 * Gadgets on the ground (Tactics §3): mines (two blink frames, and a soft
 * pulsing ring on your own armed ones, since the mine reads weakly on dirt),
 * the oil slick decal scaled to its 60 px radius, smoke as several
 * overlapping puffs at ≤ 0.8 alpha. Missing art falls back to drawn shapes.
 */
const pngs = import.meta.glob<string>('../art/pixel/world/gadgets/*.png', { eager: true, query: '?url', import: 'default' });
const key = (name: string): string => `gadget:${name}`;
const FILES: ReadonlyMap<string, string> = new Map(Object.entries(pngs).map(([p, u]) => [key(p.slice(p.lastIndexOf('/') + 1, -4)), u]));
const DEPTH = { oil: 20, mines: 30, ring: 31, fire: 40, smoke: 5200 } as const;
/** A Mk V slick alight: looping flames (PixelLab effect "InkTanks burning oil flame", 18×39, 8 frames @ 12 fps). */
const flameUrl = Object.values(import.meta.glob<string>('../art/pixel/world/fx/flame.png', { eager: true, query: '?url', import: 'default' }))[0] ?? null;
const FLAME = { key: 'fx:flame', anim: 'fx:flame-loop', w: 18, h: 39, frames: 8, fps: 12, originY: 35 / 39 } as const;
/** Scattered Mk V mines are drawn this much smaller. */
const SMALL_MINE = 0.7;
const SMOKE_PUFFS = 7;
const SMOKE_ALPHA = 0.78;

export function preloadGadgets(scene: Phaser.Scene): void {
  for (const [k, url] of FILES) scene.load.image(k, url);
  if (flameUrl) scene.load.spritesheet(FLAME.key, flameUrl, { frameWidth: FLAME.w, frameHeight: FLAME.h });
}

/** Flame spots inside a slick of radius r: a ring and the middle, fixed per slick so they don't jump. */
function flameSpots(p: Patch): { dx: number; dy: number; s: number; f: number }[] {
  const n = Math.max(5, Math.round(p.r / 11));
  return Array.from({ length: n }, (_, i) => {
    const a = i * 2.39996 + p.id;
    const d = p.r * 0.75 * Math.sqrt((i + 0.5) / n);
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.85, s: 1.2 + ((i * 7 + p.id) % 5) * 0.12, f: (i * 3 + p.id) % FLAME.frames };
  });
}

interface Puffs {
  readonly imgs: (Phaser.GameObjects.Image | Phaser.GameObjects.Arc)[];
  readonly offs: readonly { dx: number; dy: number; s: number; drift: number }[];
}

export class GadgetLayer {
  private readonly mines = new Map<number, Phaser.GameObjects.Image | Phaser.GameObjects.Arc>();
  private readonly oils = new Map<number, Phaser.GameObjects.Image | Phaser.GameObjects.Arc>();
  private readonly smokes = new Map<number, Puffs>();
  private readonly fires = new Map<number, Phaser.GameObjects.Sprite[]>();
  private readonly ring: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.ring = scene.add.graphics().setDepth(DEPTH.ring);
  }

  private has(name: string): boolean {
    return this.scene.textures.exists(key(name));
  }

  update(m: Match): void {
    const g = m.gadgets;
    this.ring.clear();
    const liveMines = new Set<number>();
    for (const mine of g.mines) {
      if (!mine.alive) continue;
      liveMines.add(mine.id);
      const armed = m.t >= mine.armAt;
      const frame = armed && Math.floor(m.t * 2.5) % 2 === 1 ? 'mine-1' : 'mine-0';
      let img = this.mines.get(mine.id);
      if (!img) {
        img = this.has('mine-0') ? this.scene.add.image(mine.x, mine.y, key('mine-0')) : this.scene.add.circle(mine.x, mine.y, 8, 0x2a2620);
        img.setDepth(DEPTH.mines);
        if (mine.small) img.setScale(SMALL_MINE);
        this.mines.set(mine.id, img);
      }
      if ('setTexture' in img && this.has(frame)) img.setTexture(key(frame));
      img.setAlpha(armed ? 1 : 0.6);
      if (armed && mine.team === 0) {
        const k = (m.t * 1.4) % 1;
        this.ring.lineStyle(2, 0xf0c040, 0.55 * (1 - k)).strokeCircle(mine.x, mine.y, 12 + k * 14);
      }
    }
    drop(this.mines, liveMines);
    const liveOil = new Set<number>();
    for (const p of g.oils) {
      liveOil.add(p.id);
      let img = this.oils.get(p.id);
      if (!img) {
        img = this.has('oil') ? this.scene.add.image(p.x, p.y, key('oil')) : this.scene.add.circle(p.x, p.y, p.r, 0x14110c, 0.55);
        if ('setTexture' in img) img.setScale((p.r * 2.1) / Math.max(img.width, img.height));
        img.setDepth(DEPTH.oil);
        this.oils.set(p.id, img);
      }
      const burning = p.burnUntil > m.t;
      img.setAlpha(fade(p, m.t, 0.95));
      if ('setTint' in img) {
        if (burning) img.setTint(0x6a3a1c);
        else img.clearTint();
      }
      if (burning) this.burn(p, m.t);
      // A Mk V slick you can light: a faint hot rim, so you know to shoot it.
      else if (p.team === 0 && p.mk >= 5) this.ring.lineStyle(2, 0xff8a3a, 0.35 + 0.2 * Math.sin(m.t * 5)).strokeCircle(p.x, p.y, p.r * 0.92);
    }
    drop(this.oils, liveOil);
    for (const [id, flames] of this.fires) {
      const p = g.oils.find((o) => o.id === id);
      if (p && p.burnUntil > m.t) continue;
      for (const f of flames) f.destroy();
      this.fires.delete(id);
    }
    const liveSmoke = new Set<number>();
    for (const p of g.smokes) {
      liveSmoke.add(p.id);
      let s = this.smokes.get(p.id);
      if (!s) {
        s = this.makeSmoke(p);
        this.smokes.set(p.id, s);
      }
      const a = fade(p, m.t, SMOKE_ALPHA);
      const age = m.t - p.at;
      s.imgs.forEach((img, i) => {
        const o = s!.offs[i]!;
        // Puffs swell in over the first half second and drift slowly.
        const grow = Math.min(1, 0.4 + age * 1.2);
        img.setPosition(p.x + o.dx * grow + Math.cos(o.drift) * age * 3, p.y + o.dy * grow + Math.sin(o.drift) * age * 3);
        img.setAlpha(a);
        if ('setTexture' in img) img.setScale(o.s * grow);
      });
    }
    for (const [id, s] of this.smokes) {
      if (liveSmoke.has(id)) continue;
      for (const img of s.imgs) img.destroy();
      this.smokes.delete(id);
    }
  }

  /** Lights a slick's flames once, and fades them over its last half second. */
  private burn(p: Patch, now: number): void {
    if (!this.scene.textures.exists(FLAME.key)) return;
    let flames = this.fires.get(p.id);
    if (!flames) {
      if (!this.scene.anims.exists(FLAME.anim)) this.scene.anims.create({ key: FLAME.anim, frames: this.scene.anims.generateFrameNumbers(FLAME.key, {}), frameRate: FLAME.fps, repeat: -1 });
      flames = flameSpots(p).map((o) => this.scene.add.sprite(p.x + o.dx, p.y + o.dy, FLAME.key).setOrigin(0.5, FLAME.originY).setScale(o.s).setDepth(DEPTH.fire + (p.y + o.dy) / 10000).play({ key: FLAME.anim, startFrame: o.f }));
      this.fires.set(p.id, flames);
    }
    const a = Math.min(1, (now - (p.burnUntil - OIL_FIRE.burn)) / 0.2, (p.burnUntil - now) / 0.5);
    for (const f of flames) f.setAlpha(Math.max(0, a));
  }

  private makeSmoke(p: Patch): Puffs {
    const offs = Array.from({ length: SMOKE_PUFFS }, (_, i) => {
      const a = (i / SMOKE_PUFFS) * Math.PI * 2 + p.id;
      const r = i === 0 ? 0 : p.r * 0.5;
      return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8, s: 1.3 + ((p.id + i) % 3) * 0.15, drift: a };
    });
    const imgs = offs.map((o, i) => {
      const name = `smoke-${(p.id + i) % 3}`;
      const img = this.has(name) ? this.scene.add.image(p.x + o.dx, p.y + o.dy, key(name)) : this.scene.add.circle(p.x + o.dx, p.y + o.dy, p.r * 0.55, 0xe8e4da, 1);
      return img.setDepth(DEPTH.smoke + i * 0.01);
    });
    return { imgs, offs };
  }

  destroy(): void {
    for (const img of [...this.mines.values(), ...this.oils.values()]) img.destroy();
    for (const s of this.smokes.values()) for (const img of s.imgs) img.destroy();
    for (const flames of this.fires.values()) for (const f of flames) f.destroy();
    this.ring.destroy();
  }
}

/** Fades in over 0.3 s and out over the last second. */
function fade(p: Patch, now: number, top: number): number {
  return top * Math.min(1, (now - p.at) / 0.3, Math.max(0, p.until - now));
}

function drop(map: Map<number, { destroy: () => void }>, live: ReadonlySet<number>): void {
  for (const [id, img] of map) {
    if (live.has(id)) continue;
    img.destroy();
    map.delete(id);
  }
}
