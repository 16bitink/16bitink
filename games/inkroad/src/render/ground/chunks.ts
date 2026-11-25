import type Phaser from 'phaser';
import type { CityView } from '../../sim/types';
import { boxesMeet, boxOf, type Box } from '../geom';
import type { Pictures } from '../pictures';
import { TILT } from '../projection';
import { PAPER } from '../style';
import { ctxOf, makeCanvas } from '../tiles';
import { Land } from './land';
import { paintDress } from './dress';
import { beachSig } from './beachGround';
import { lotRect } from '../../city/geometry';
import { lotBox, lotScene, lotSig, paintLots, parkSig, planPts, planSig, type LotScene } from './lotsGround';
import { paintRoads, type Brush } from './roadPaint';
import { roadScene, type RoadScene } from './roadShape';
import type { Extent } from './terrain';

/**
 * The ground as square textures, each baked from the land, the lots and the
 * roads that touch it. Two layers: the whole map and its scenery at a modest
 * scale, always there; and, zoomed in, sharp squares only where the camera
 * looks, from a small pool. A change re-bakes only the squares it touches.
 */
const PX = 1024; // texture size: a power of two, so it gets mipmaps
const BLEED = 8; // texture px painted past the edge (the texture repeats, and mipmaps reach far)
const OVERLAP = 1; // texture px of that shown over the neighbour
/**
 * Squares are painted on a bigger canvas and cut out of it: Chrome's GPU canvas
 * drops a pattern stroke that shows only as a sliver at the canvas edge (a
 * road's kerb just inside a square). Wider than the widest road at the sharpest scale.
 */
const MARGIN = 160;
const DETAIL_AT = 1.25; // device px per base texel: past this the sharp squares come in
const FADE_IN_MS = 160;

export interface GroundScale {
  /** Texture px per plan px: the whole map, the scenery round it, the sharp squares. */
  readonly base: number;
  readonly outer: number;
  readonly detail: number;
  /** How many sharp squares are kept. */
  readonly pool: number;
}

interface Chunk { readonly box: Box; readonly scale: number; readonly kind: 'base' | 'outer' | 'detail'; sig: string; baked: string; slot: Slot | null; seen: number }
interface Slot { readonly key: string; readonly texture: Phaser.Textures.CanvasTexture; readonly image: Phaser.GameObjects.Image }

export class Ground {
  readonly land: Land;
  private net: RoadScene;
  private lots: LotScene;
  private readonly rows: readonly string[];
  private readonly style: string;
  private readonly chunks: Chunk[] = [];
  private free: Slot[] = [];
  private made = 0;
  private queue: Chunk[] = [];
  private tick = 0;
  private readonly easel = makeCanvas(PX + MARGIN * 2, PX + MARGIN * 2);

  constructor(private readonly scene: Phaser.Scene, private readonly pics: Pictures, city: CityView, private readonly scale: GroundScale, private readonly depth: number) {
    this.rows = city.def.map;
    this.style = city.def.style;
    this.land = new Land(city.def.map, pics, PAPER);
    this.net = roadScene(city);
    this.lots = lotScene(city);
    this.layOut();
    this.refresh(city);
  }

  /** Roads and junctions as shapes, for everything else that draws along them. */
  get roads(): RoadScene { return this.net; }
  get pending(): number { return this.queue.length; }

  private layOut(): void {
    this.grid(this.land.map, this.scale.base, 'base');
    const e = this.land.extent;
    const m = this.land.map;
    const ring: Extent[] = [
      { x0: e.x0, y0: e.y0, x1: e.x1, y1: m.y0 }, { x0: e.x0, y0: m.y1, x1: e.x1, y1: e.y1 },
      { x0: e.x0, y0: m.y0, x1: m.x0, y1: m.y1 }, { x0: m.x1, y0: m.y0, x1: e.x1, y1: m.y1 },
    ];
    for (const r of ring) this.grid(r, this.scale.outer, 'outer');
    this.grid(m, this.scale.detail, 'detail');
  }

  private grid(e: Extent, scale: number, kind: Chunk['kind']): void {
    const size = (PX - BLEED * 2) / scale;
    for (let y = e.y0; y < e.y1 - 1; y += size) {
      for (let x = e.x0; x < e.x1 - 1; x += size) {
        this.chunks.push({ box: { x0: x, y0: y, x1: Math.min(e.x1, x + size), y1: Math.min(e.y1, y + size) }, scale, kind, sig: '', baked: '', slot: null, seen: 0 });
      }
    }
  }

  /** Work out what changed and queue it. Sharp squares wait until they are looked at. */
  refresh(city: CityView): void {
    this.net = roadScene(city);
    this.lots = lotScene(city);
    for (const c of this.chunks) {
      c.sig = this.signature(c);
      if (c.kind !== 'detail' || c.slot) this.want(c);
    }
  }

  private want(c: Chunk): void {
    if (c.sig !== c.baked && !this.queue.includes(c)) this.queue.push(c);
  }

  private signature(c: Chunk): string {
    const near = (b: Box): boolean => boxesMeet(b, c.box);
    const out: string[] = ['land'];
    for (const r of this.net.roads) if (near(r.box)) out.push(r.sig);
    for (const j of this.net.joins) if (near(j.box)) out.push(j.sig);
    for (const l of this.lots.lots) if (near(lotBox(l))) out.push(lotSig(l, this.lots.year));
    for (const p of this.lots.parks) if (near(lotBox(p))) out.push(parkSig(p));
    for (const b of this.lots.beaches) if (near(boxOf(rectPts(b), 60))) out.push(beachSig(b));
    for (const pr of this.lots.plans) if (near(boxOf(planPts(pr), 40))) out.push(planSig(pr));
    return out.join('|');
  }

  /** Bake the whole map now (the first time). */
  bakeBase(): void {
    for (const c of this.queue.splice(0).filter((q) => q.kind !== 'detail')) this.bakeChunk(c);
  }

  /** Once a frame: hide what is off screen, bring in sharp squares, bake up to `n`. `texel` = device px per plan px. */
  update(view: Box, texel: number, n: number): void {
    this.tick++;
    const inView = this.chunks.filter((c) => c.kind === 'detail' && boxesMeet(c.box, view)).length;
    const sharp = texel > this.scale.base * DETAIL_AT && inView <= this.scale.pool;
    for (const c of this.chunks) {
      const on = boxesMeet(c.box, view) && (c.kind !== 'detail' || sharp);
      if (on) c.seen = this.tick;
      if (on && c.kind === 'detail' && !c.slot) this.lend(c);
      if (on) this.want(c);
      c.slot?.image.setVisible(on && c.baked !== '');
    }
    this.queue = this.queue.filter((c) => c.kind !== 'detail' || c.seen === this.tick || c.baked !== '');
    if (this.queue.length === 0) return;
    const rank = (c: Chunk): number => (c.seen === this.tick ? 2 : 0) + (c.kind === 'detail' ? 0 : 1);
    this.queue.sort((a, b) => rank(b) - rank(a));
    for (const c of this.queue.splice(0, n)) this.bakeChunk(c);
  }

  /** A texture for a sharp square: a new one, a spare, or the one unseen longest. */
  private lend(c: Chunk): void {
    const spare = this.free.pop();
    if (spare) { c.slot = spare; return; }
    if (this.made < this.scale.pool) { this.made++; c.slot = this.slot(`ground-d${this.made}`); return; }
    const old = this.chunks.filter((q) => q.kind === 'detail' && q.slot && q.seen < this.tick).sort((a, b) => a.seen - b.seen)[0];
    if (!old) return;
    c.slot = old.slot;
    c.slot!.image.setVisible(false);
    old.slot = null;
    old.baked = '';
  }

  private slot(key: string): Slot {
    const texture = this.scene.textures.createCanvas(key, PX, PX);
    if (!texture) throw new Error(`InkRoad: no ground texture ${key}`);
    return { key, texture, image: this.scene.add.image(0, 0, key).setOrigin(0).setVisible(false) };
  }

  private bakeChunk(c: Chunk): void {
    if (c.kind !== 'detail') c.slot ??= this.slot(`ground-${c.kind}-${this.chunks.indexOf(c)}`);
    if (!c.slot) return;
    const g = ctxOf(this.easel);
    const pad = (BLEED + MARGIN) / c.scale;
    const span = (PX + MARGIN * 2) / c.scale;
    const box = { x0: c.box.x0 - pad, y0: c.box.y0 - pad, x1: c.box.x0 - pad + span, y1: c.box.y0 - pad + span };
    g.globalAlpha = 1;
    g.setTransform(c.scale, 0, 0, c.scale, -box.x0 * c.scale, -box.y0 * c.scale);
    const brush: Brush = { g, apron: this.land.apron, pattern: (name) => this.land.pattern(g, name), pics: this.pics, onSea: (draw) => this.land.onSea(g, draw) };
    this.land.paint(g, box);
    paintDress(g, this.style, this.rows, this.net, this.lots, box);
    paintLots(brush, this.lots, box);
    paintRoads(brush, this.net, box);
    if (c.kind === 'outer') this.land.paintFade(g);
    else this.frame(g);
    const out = c.slot.texture.getContext();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.drawImage(this.easel, -MARGIN, -MARGIN);
    c.slot.texture.refresh();
    const fresh = c.baked === '';
    c.baked = c.sig;
    this.place(c, fresh);
  }

  /** A faint pen border round the playable area. */
  private frame(g: CanvasRenderingContext2D): void {
    const m = this.land.map;
    g.strokeStyle = 'rgba(58,50,43,0.16)';
    g.lineWidth = 1.2;
    g.setLineDash([10, 12]);
    g.strokeRect(m.x0 + 1, m.y0 + 1, m.x1 - m.x0 - 2, m.y1 - m.y0 - 2);
    g.setLineDash([]);
  }

  private place(c: Chunk, fresh: boolean): void {
    const { texture, image } = c.slot!;
    if (!fresh) return;
    const lap = OVERLAP / c.scale;
    const w = Math.ceil((c.box.x1 - c.box.x0 + lap * 2) * c.scale);
    const h = Math.ceil((c.box.y1 - c.box.y0 + lap * 2) * c.scale);
    const name = `${w}x${h}`;
    if (!texture.has(name)) texture.add(name, 0, BLEED - OVERLAP, BLEED - OVERLAP, w, h);
    image.setFrame(name).setOrigin(0).setPosition(c.box.x0 - lap, (c.box.y0 - lap) * TILT).setScale(1 / c.scale, TILT / c.scale)
      .setDepth(this.depth + (c.kind === 'outer' ? 0 : c.kind === 'base' ? 0.1 : 0.2)).setVisible(true);
    if (c.kind === 'detail') this.scene.tweens.add({ targets: image, alpha: { from: 0, to: 1 }, duration: FADE_IN_MS });
  }

  destroy(): void {
    for (const c of this.chunks) if (c.slot) this.drop(c.slot);
    this.free.forEach((s) => this.drop(s));
    this.chunks.length = 0;
    this.free = [];
    this.queue = [];
  }

  private drop(s: Slot): void {
    this.scene.tweens.killTweensOf(s.image);
    s.image.destroy();
    this.scene.textures.remove(s.key);
  }
}

const rectPts = (b: { readonly rect: { gx: number; gy: number; w: number; h: number } }): { x: number; y: number }[] => {
  const r = lotRect(b.rect);
  return [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y + r.h }];
};
