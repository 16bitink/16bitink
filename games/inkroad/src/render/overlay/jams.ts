import type Phaser from 'phaser';
import { LANE } from '../../sim/constants';
import type { CityView, Id, Link } from '../../sim/types';
import { clamp, lerp, pointAt, smooth, type Box, type OnLine } from '../geom';
import { fbm, hash2 } from '../noise';
import { projectAngle, TILT } from '../projection';
import { ctxOf, makeCanvas } from '../tiles';
import { heats, LaneMap, PIECE } from './queues';

/**
 * The live jam reading: a soft watercolour wash on the lane behind stopped
 * cars, amber at first and red when they stay, and a green wave down every arm
 * when a junction clears. Painted blots, stamped along the lanes.
 */
const EVERY_S = 0.3;
const RISE = 0.34; // heat per second
const FALL = 0.95;
const SEEN = 0.03;
const BLOTS = 4;
const BLOT_PX = 96;
const BLOT_LONG = 34; // plan px along the lane
const BLOT_WIDE = 1.7; // of the lanes' width
const ALPHA = 0.62;
const AMBER = [232, 160, 52] as const;
const RED = [206, 44, 34] as const;
const RED_FROM = 0.4;
const RED_TO = 0.68;
const GREEN = 0x58b368;
const WAVE_S = 1.9;
const WAVE_REACH = 250;
const WAVE_WIDE = 62;
const KEEP_OFF = 2.2; // how far past the stop line the wash goes, stretches

interface Row { readonly heat: Float32Array; readonly pts: readonly OnLine[]; readonly link: Link }
interface Wave { readonly pts: readonly { readonly p: OnLine; readonly d: number; readonly wide: number }[]; t: number }

export class JamLayer {
  private map: LaneMap | null = null;
  private version = -1;
  private city: CityView | null = null;
  private want = new Map<number, Float32Array>();
  private readonly rows = new Map<number, Row>();
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private wait = 0;
  private waves: Wave[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {
    for (let i = 0; i < BLOTS; i++) blotTexture(scene, `fx-blot-${i}`, i + 1);
  }

  /** `dt` is the day's own time as it runs: 0 while paused, so a queue does not redden on its own. */
  update(dt: number, real: number, city: CityView, view: Box): void {
    if (!this.map || city !== this.city || city.version !== this.version) this.remap(city);
    this.wait -= real;
    if (this.wait <= 0) {
      this.wait = EVERY_S;
      this.want = city.phase === 'day' ? heats(this.map!, city.cars) : new Map();
      for (const lane of this.want.keys()) if (!this.rows.has(lane)) this.rows.set(lane, this.row(lane));
    }
    this.ease(dt, real);
    this.used = 0;
    for (const row of this.rows.values()) this.draw(row, view);
    this.drawWaves(real, view);
    for (let i = this.used; i < this.pool.length; i++) this.pool[i]!.setVisible(false);
  }

  private remap(city: CityView): void {
    this.map = new LaneMap(city.links, city.roads);
    this.version = city.version;
    this.city = city;
    this.rows.clear();
    this.want.clear();
    this.wait = 0;
  }

  private row(lane: number): Row {
    const l = this.map!.lanes[lane]!;
    const pts = Array.from({ length: l.pieces }, (_, k) => pointAt(l.link.line, Math.min(l.len, (k + 0.5) * PIECE)));
    return { heat: new Float32Array(l.pieces), pts, link: l.link };
  }

  private ease(dt: number, real: number): void {
    for (const [lane, row] of this.rows) {
      const goal = this.want.get(lane);
      let any = false;
      for (let k = 0; k < row.heat.length; k++) {
        const g = goal?.[k] ?? 0;
        const h = row.heat[k]!;
        row.heat[k] = h < g ? Math.min(g, h + RISE * dt) : Math.max(g, h - FALL * real);
        any ||= row.heat[k]! > SEEN;
      }
      if (!any && !goal) this.rows.delete(lane);
    }
  }

  private draw(row: Row, view: Box): void {
    const n = row.heat.length;
    for (let k = 0; k < n; k++) {
      const h = row.heat[k]!;
      if (h <= SEEN) continue;
      const p = row.pts[k]!;
      if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue;
      const end = clamp((n - k + KEEP_OFF) / 3, 0.4, 1);
      this.stamp(p, row.link, k, tone(h), ALPHA * end * Math.min(1, h * 1.5));
    }
  }

  private stamp(p: OnLine, link: Link, k: number, tint: number, alpha: number, wide = link.lanes * LANE * BLOT_WIDE): void {
    const img = this.blot();
    const r = hash2(link.id, k, 5);
    img.setTexture(`fx-blot-${Math.floor(r * BLOTS)}`).setPosition(p.x, p.y * TILT)
      .setRotation(projectAngle(p.a)).setScale((BLOT_LONG * (0.92 + r * 0.25)) / BLOT_PX, (wide * TILT * (0.9 + r * 0.2)) / BLOT_PX)
      .setTint(tint).setAlpha(alpha);
  }

  private blot(): Phaser.GameObjects.Image {
    let img = this.pool[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, 'fx-blot-0').setDepth(this.depth);
      this.pool.push(img);
    }
    this.used++;
    return img.setVisible(true);
  }

  /** A junction cleared: green runs out along every lane that meets it. */
  wave(node: Id): void {
    const lanes = this.map?.lanes ?? [];
    const pts = lanes.filter((l) => l.link.to === node || l.link.from === node).flatMap((l) => {
      const reach = Math.min(l.len, WAVE_REACH);
      return Array.from({ length: Math.floor(reach / PIECE) }, (_, k) => {
        const d = (k + 0.5) * PIECE;
        return { p: pointAt(l.link.line, l.link.from === node ? d : l.len - d), d, wide: l.link.lanes * LANE * BLOT_WIDE };
      });
    });
    if (pts.length > 0) this.waves.push({ pts, t: 0 });
  }

  private drawWaves(real: number, view: Box): void {
    for (const w of this.waves) {
      w.t += real / WAVE_S;
      const front = w.t * (WAVE_REACH + WAVE_WIDE);
      const fade = 1 - smooth((w.t - 0.55) / 0.45);
      w.pts.forEach(({ p, d, wide }, k) => {
        const a = Math.exp(-(((d - front) / WAVE_WIDE) ** 2)) * 0.8 + (d < front ? 0.22 : 0);
        if (a * fade < SEEN || p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) return;
        this.stampAt(p, k, wide, a * fade * 0.8);
      });
    }
    this.waves = this.waves.filter((w) => w.t < 1);
  }

  private stampAt(p: OnLine, k: number, wide: number, alpha: number): void {
    this.blot().setTexture(`fx-blot-${k % BLOTS}`).setPosition(p.x, p.y * TILT).setRotation(projectAngle(p.a))
      .setScale(BLOT_LONG / BLOT_PX, (wide * TILT) / BLOT_PX).setTint(GREEN).setAlpha(alpha);
  }

  /** How hot a junction's approaches are drawn now, for tests and probes. */
  get hot(): number {
    let n = 0;
    for (const r of this.rows.values()) for (const h of r.heat) if (h > RED_FROM) n++;
    return n;
  }
}

function tone(h: number): number {
  const t = smooth((h - RED_FROM) / (RED_TO - RED_FROM));
  const c = (i: 0 | 1 | 2): number => Math.round(lerp(AMBER[i], RED[i], t));
  return (c(0) << 16) | (c(1) << 8) | c(2);
}

/** A watercolour blot, white so it can be tinted: uneven inside, pigment gathered at a ragged edge. */
function blotTexture(scene: Phaser.Scene, key: string, seed: number): void {
  if (scene.textures.exists(key)) return;
  const c = makeCanvas(BLOT_PX, BLOT_PX);
  const g = ctxOf(c);
  const img = g.createImageData(BLOT_PX, BLOT_PX);
  for (let y = 0; y < BLOT_PX; y++) {
    for (let x = 0; x < BLOT_PX; x++) {
      const u = (x + 0.5) / BLOT_PX - 0.5;
      const v = (y + 0.5) / BLOT_PX - 0.5;
      const rag = (fbm(x / 17, y / 17, 3, seed * 13) - 0.5) * 0.16;
      const long = 1 - smooth((Math.abs(u) - 0.16) / 0.33);
      const edge = 0.36 + rag;
      const cross = 1 - smooth((Math.abs(v) - edge + 0.1) / 0.1);
      const rim = Math.exp(-(((Math.abs(v) - edge + 0.1) / 0.045) ** 2)) * 0.35;
      const pool = 0.62 + 0.5 * (fbm(x / 26, y / 26, 3, seed * 29) - 0.5) * 2 * 0.6;
      const a = clamp(cross * (pool + rim), 0, 1) * long;
      img.data.set([255, 255, 255, Math.round(a * 255)], (y * BLOT_PX + x) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, c);
}
