import Phaser from 'phaser';
import { fairyLights, hasFireworks, type FairyLight } from '../../art/daily/decor';
import { treatKey } from '../../art/daily/treats';
import { BOIL } from '../../art/palette';
import { TEX } from '../../art/textures';
import { BOARD } from '../../level/types';
import type { World, WorldEvent } from '../../logic/world';
import type { FxView } from './fxView';
import type { NightLight } from './nightView';

/**
 * A daily's own layer over the board: its treats (bobbing, glinting), the
 * glitter round golden prey, the blizzard's snow streaks (and a light
 * snowfall on any winter day), Christmas fairy lights twinkling, New
 * Year's fireworks, and the bursts when a treat or a golden prey is caught
 * (the last catch showers sparkles all along the body).
 */

const GLOW = 'daily-glow';
const DEPTH = { treats: 2.6, glitter: 3.7, snow: 6.2, sky: 6.9, lights: 6.85 } as const;
const GOLD = 0xffd75e;
const FIREWORK_COLOURS = [0xffd25a, 0xff5a4e, 0x7ab8ff, 0x7fe08a, 0xd88aff] as const;
const FLAKES = 70;
/** Treats are drawn a little bigger than life, so they read as pickups. */
const TREAT_SCALE = 1.35;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly max: number;
  readonly colour: number;
  readonly size: number;
}

export class DailyView {
  private readonly treats = new Map<number, Phaser.GameObjects.Image>();
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly sky: Phaser.GameObjects.Graphics;
  private readonly lights: readonly FairyLight[];
  private readonly bulbs: Phaser.GameObjects.Image[];
  private readonly sparks: Spark[] = [];
  private readonly flakes: { x: number; y: number; s: number }[];
  private readonly bursts: { x: number; y: number; age: number }[] = [];
  private nextBurst = 1.2;
  private readonly snowy: boolean;
  private readonly fireworks: boolean;

  constructor(private readonly scene: Phaser.Scene, private readonly world: World, private readonly fx: FxView) {
    makeTextures(scene);
    const level = world.level;
    this.gfx = scene.add.graphics().setDepth(DEPTH.snow);
    this.sky = scene.add.graphics().setDepth(DEPTH.sky).setBlendMode(Phaser.BlendModes.ADD);
    this.lights = fairyLights(level);
    this.bulbs = this.lights.map((l) => scene.add.image(l.x, l.y, GLOW).setTint(l.colour).setDepth(DEPTH.lights).setBlendMode(Phaser.BlendModes.ADD).setScale(0.16));
    this.snowy = level.season === 'winter' || level.rule === 'blizzard';
    this.fireworks = hasFireworks(level);
    this.flakes = this.snowy ? Array.from({ length: FLAKES }, (_, i) => ({ x: (i * 137) % BOARD.w, y: (i * 251) % BOARD.h, s: 0.6 + ((i * 7) % 10) / 10 })) : [];
  }

  /** Lights this layer adds to the night (fairy lights, fireworks). */
  nightLights(time: number): readonly NightLight[] {
    const out: NightLight[] = this.lights.map((l, i) => ({ x: l.x, y: l.y, r: 34, alpha: 0.45 + 0.25 * Math.sin(time / 400 + i * 1.3) }));
    for (const b of this.bursts) out.push({ x: b.x, y: b.y, r: 300, alpha: Math.max(0, 1 - b.age / 1.4) * 0.9 });
    return out;
  }

  react(e: WorldEvent): void {
    if (e.type === 'treat') {
      this.burst(e.x, e.y, 10, [0xffffff, GOLD], 90);
      this.fx.word('Yum!', e.x, e.y - 16, 24, '#b3322b');
    } else if (e.type === 'golden') {
      this.burst(e.x, e.y, 16, [GOLD, 0xffffff], 140);
      this.fx.word(`Golden! ${e.caught}/${e.count}`, e.x, e.y - 20, 30, '#a0622c');
    } else if (e.type === 'goldenDone') {
      const s = this.world.snake;
      for (let i = 0; i < s.trail.count; i += 3) {
        const p = s.trail.pts[i]!;
        this.burst(p.x, p.y, 2, [GOLD, 0xffffff], 50, 1.4);
      }
    }
  }

  update(time: number, dt: number): void {
    this.drawTreats(time);
    const g = this.gfx;
    g.clear();
    this.glitter(time);
    if (this.snowy) this.snow(dt);
    this.twinkle(time);
    if (this.fireworks) this.launch(dt);
    this.drawSparks(dt);
  }

  private drawTreats(time: number): void {
    const list = this.world.daily?.treats?.list ?? [];
    const seen = new Set<number>();
    const f = Math.floor(time / 150) % BOIL;
    for (const t of list) {
      seen.add(t.id);
      let img = this.treats.get(t.id);
      if (!img) {
        img = this.scene.add.image(t.x, t.y, TEX.critter(treatKey(t.kind), 'still', 0)).setDepth(DEPTH.treats);
        this.treats.set(t.id, img);
      }
      const bob = 1 + Math.sin(time / 300 + t.id) * 0.06;
      img.setTexture(TEX.critter(treatKey(t.kind), 'still', f)).setPosition(t.x, t.y).setAlpha(t.shown).setScale(((0.6 + 0.4 * t.shown) * bob * TREAT_SCALE) / 3).setRotation(Math.sin(time / 700 + t.id) * 0.15);
      // Now and then a glint catches the light.
      if ((time / 1000 + t.id * 0.37) % 1.6 < 0.02) this.burst(t.x - 6, t.y - 6, 1, [0xffffff], 10, 0.5);
    }
    for (const [id, img] of this.treats) {
      if (seen.has(id)) continue;
      img.destroy();
      this.treats.delete(id);
    }
  }

  /** Golden prey glitter: a warm glow and glints circling it. */
  private glitter(time: number): void {
    for (const p of this.world.prey) {
      if (!p.gold || p.mode === 'hidden') continue;
      const n = p.gold === 'goal' ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const a = time / 500 + (i / n) * Math.PI * 2 + p.id;
        const r = 12 + Math.sin(time / 300 + i) * 3;
        const gx = p.x + Math.cos(a) * r;
        const gy = p.y + Math.sin(a) * r;
        this.gfx.fillStyle(GOLD, 0.9).fillCircle(gx, gy, 2.4).fillStyle(0xffffff, 0.95).fillCircle(gx, gy, 1);
      }
      this.gfx.fillStyle(GOLD, 0.22).fillCircle(p.x, p.y, 19);
    }
  }

  /** Winter snowfall, blown into long streaks in a blizzard. */
  private snow(dt: number): void {
    const wind = this.world.daily?.wind ?? { x: 0, y: 0 };
    const blowing = Math.hypot(wind.x, wind.y) > 1;
    const vx = blowing ? wind.x * 6 : 8;
    const vy = blowing ? wind.y * 6 : 24;
    const g = this.gfx;
    for (const f of this.flakes) {
      f.x = (f.x + vx * f.s * dt + BOARD.w + 40) % (BOARD.w + 40) - 20;
      f.y = (f.y + vy * f.s * dt + BOARD.h + 40) % (BOARD.h + 40) - 20;
      if (blowing) {
        const k = 0.05 * f.s;
        g.lineStyle(1.4 * f.s, 0xffffff, 0.7).lineBetween(f.x, f.y, f.x - vx * k, f.y - vy * k);
      } else g.fillStyle(0xffffff, 0.85).fillCircle(f.x, f.y, 1.3 * f.s);
    }
  }

  private twinkle(time: number): void {
    this.bulbs.forEach((b, i) => {
      const on = 0.55 + 0.45 * Math.sin(time / 380 + i * 2.1);
      b.setAlpha(on).setScale(0.12 + on * 0.06);
      this.gfx.fillStyle(this.lights[i]!.colour, 0.95).fillCircle(b.x, b.y, 2.2);
    });
  }

  /** Fireworks: a rocket's burst every couple of seconds, somewhere over the board. */
  private launch(dt: number): void {
    for (const b of this.bursts) b.age += dt;
    while (this.bursts.length && this.bursts[0]!.age > 1.6) this.bursts.shift();
    this.nextBurst -= dt;
    if (this.nextBurst > 0) return;
    this.nextBurst = 1.6 + Math.random() * 1.6;
    const x = 120 + Math.random() * (BOARD.w - 240);
    const y = 90 + Math.random() * (BOARD.h - 180);
    this.bursts.push({ x, y, age: 0 });
    const colour = FIREWORK_COLOURS[Math.floor(Math.random() * FIREWORK_COLOURS.length)]!;
    this.burst(x, y, 40, [colour, colour, 0xffffff], 170, 1.3);
  }

  private burst(x: number, y: number, n: number, colours: readonly number[], speed: number, life = 0.7): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const v = speed * (0.5 + Math.random() * 0.5);
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, colour: colours[i % colours.length]!, size: 1.2 + Math.random() * 1.4 });
    }
  }

  private drawSparks(dt: number): void {
    const s = this.sky;
    s.clear();
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      p.vx *= 1 - dt * 1.6;
      p.vy = p.vy * (1 - dt * 1.6) + 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.life / p.max;
      s.lineStyle(p.size, p.colour, k).lineBetween(p.x, p.y, p.x - p.vx * 0.04, p.y - p.vy * 0.04);
    }
  }

  destroy(): void {
    for (const img of this.treats.values()) img.destroy();
    this.treats.clear();
    for (const b of this.bulbs) b.destroy();
    this.gfx.destroy();
    this.sky.destroy();
  }
}

function makeTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(GLOW)) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      scene.textures.addImage(GLOW, canvas as unknown as HTMLImageElement);
    }
  }
}
