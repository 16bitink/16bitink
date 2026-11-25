import type { Pt } from '../../sim/types';
import { fbm } from '../noise';
import { polyPath, wobble } from '../pen';
import type { Pictures } from '../pictures';
import { INK, WATER_DEEP } from '../style';
import { ctxOf, makeCanvas } from '../tiles';
import { TEXTURE_SIZE, type TextureName } from '../../art/manifest';
import { boxesMeet, boxOf, type Box } from '../geom';
import { lookOf, type Layer, type Look } from './looks';
import { fieldAt, fullExtent, mapExtent, outlines, type Extent } from './terrain';

/**
 * Everything on the ground that never changes: the sand and its washes, parks,
 * old town, rock, the sea with its shore, and the paper the map fades into.
 */
const LOW = 16; // plan px per pixel of the soft layers
const DEEP_SCALE = 1; // canvas px per plan px of the deep water layer
const FADE = 240; // plan px over which the scenery fades to paper

/** How many plan px one tile of each texture covers. */
export const TILE: Readonly<Record<TextureName, number>> = {
  sand: 420, grass: 170, water: 210, deep: 260, asphalt: 110, concrete: 120, paving: 62, buslane: 110, rock: 170, plaza: 92, works: 120, cobble: 96, beach: 300, shallow: 220,
};
/** Seabed tones: many faint strokes, so no step shows. */
const BEACH = { steps: 12, reach: 52, alpha: 0.05 } as const;
const SHALLOW = { steps: 14, reach: 76, alpha: 0.055 } as const;

interface Shape { readonly path: Path2D; readonly ink: Path2D; readonly box: Box }

const shapesOf = (loops: readonly (readonly Pt[])[]): Shape[] =>
  loops.map((l) => ({ path: polyPath(l), ink: polyPath(wobble(l, 0.7, 20, 3)), box: boxOf(l, 60) }));

export class Land {
  readonly extent: Extent;
  readonly map: Extent;
  private readonly water: readonly Shape[];
  private readonly park: readonly Shape[];
  private readonly rock: readonly Shape[];
  private readonly old: readonly Shape[];
  private readonly sea: Path2D;
  private readonly wash: HTMLCanvasElement;
  private readonly depth: HTMLCanvasElement | null;
  private readonly fade: HTMLCanvasElement;
  private readonly look: Look;
  get apron(): TextureName | undefined { return this.look.apron; }

  constructor(private readonly rows: readonly string[], private readonly pics: Pictures, private readonly paper: string) {
    this.look = lookOf(pics.style);
    this.extent = fullExtent(rows);
    this.map = mapExtent(rows);
    this.water = shapesOf(outlines(rows, '~'));
    this.park = shapesOf(outlines(rows, 'p'));
    this.rock = shapesOf(outlines(rows, '#'));
    this.old = shapesOf(outlines(rows, 'h'));
    this.sea = new Path2D();
    for (const w of this.water) this.sea.addPath(w.path);
    this.wash = this.soft((x, y) => washPixel(x, y, this.look));
    this.depth = this.water.length > 0 ? this.soft((x, y) => this.depthPixel(x, y)) : null;
    this.fade = this.soft((x, y) => this.fadePixel(x, y));
  }

  /** Paint the part of the land in `box`. The canvas is already in plan px. */
  paint(g: CanvasRenderingContext2D, box: Box): void {
    this.fillLayer(g, box, this.look.base);
    if (this.look.grain) this.fillLayer(g, box, this.look.grain);
    this.stretch(g, this.wash);
    this.area(g, box, this.old, this.look.old.tex, this.look.old.alpha, 10);
    this.area(g, box, this.park, 'grass', this.look.park, 14);
    this.area(g, box, this.rock, 'rock', 0.5, 26);
    this.paintSea(g, box);
  }

  /** Fade to paper past the map; drawn after the roads. */
  paintFade(g: CanvasRenderingContext2D): void {
    this.stretch(g, this.fade);
  }

  /** A pattern in plan px. */
  pattern(g: CanvasRenderingContext2D, name: TextureName): CanvasPattern {
    const p = g.createPattern(this.pics.texture(name), 'repeat');
    if (!p) throw new Error(`InkRoad: no pattern ${name}`);
    p.setTransform(new DOMMatrix().scale(TILE[name] / TEXTURE_SIZE));
    return p;
  }

  private fillBox(g: CanvasRenderingContext2D, b: Box, name: TextureName): void {
    g.fillStyle = this.pattern(g, name);
    g.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  }

  private fillLayer(g: CanvasRenderingContext2D, b: Box, l: Layer): void {
    const p = g.createPattern(this.pics.calm(l.tex, l.keep, l.tint ?? null, l.tintAlpha ?? 0), 'repeat');
    if (!p) throw new Error(`InkRoad: no pattern ${l.tex}`);
    p.setTransform(new DOMMatrix().scale(l.tile / TEXTURE_SIZE));
    g.save();
    g.globalAlpha = l.alpha ?? 1;
    g.fillStyle = p;
    g.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    g.restore();
  }

  private area(g: CanvasRenderingContext2D, box: Box, shapes: readonly Shape[], name: TextureName, alpha: number, edge: number): void {
    const near = shapes.filter((s) => boxesMeet(s.box, box));
    if (near.length === 0) return;
    const path = new Path2D();
    for (const s of near) path.addPath(s.path);
    g.save();
    g.lineJoin = 'bevel'; // not round: see roadPaint
    g.fillStyle = this.pattern(g, name);
    g.strokeStyle = g.fillStyle;
    g.globalAlpha = alpha * 0.3;
    g.lineWidth = edge * 2;
    g.stroke(path);
    g.lineWidth = edge;
    g.stroke(path);
    g.globalAlpha = alpha;
    g.fill(path, 'evenodd');
    g.globalAlpha = 0.4;
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.setLineDash([9, 5, 3, 6]);
    for (const s of near) g.stroke(s.ink);
    g.restore();
  }

  private paintSea(g: CanvasRenderingContext2D, box: Box): void {
    const near = this.water.filter((s) => boxesMeet(s.box, box));
    if (near.length === 0) return;
    g.save();
    g.lineJoin = 'round';
    this.halo(g, BEACH, this.look.shore);
    this.paintBeach(g);
    g.save();
    g.clip(this.sea, 'evenodd');
    this.fillLayer(g, box, this.look.water);
    this.paintDeep(g, box);
    this.halo(g, SHALLOW, this.look.shallow);
    g.restore();
    this.foam(g);
    g.strokeStyle = INK;
    g.globalAlpha = 0.7;
    g.lineWidth = 1.2;
    for (const s of near) g.stroke(s.ink);
    g.restore();
  }

  /** A strip of sand between the green and the water. */
  private paintBeach(g: CanvasRenderingContext2D): void {
    if (this.look.beach <= 0) return;
    g.save();
    g.strokeStyle = this.pattern(g, 'beach');
    for (const [wide, alpha] of [[1.5, 0.3], [1.2, 0.5], [1, 0.95]] as const) {
      g.globalAlpha = alpha;
      g.lineWidth = this.look.beach * wide;
      g.stroke(this.sea);
    }
    g.restore();
  }

  /** A soft band along the shore. */
  private halo(g: CanvasRenderingContext2D, band: { readonly steps: number; readonly reach: number; readonly alpha: number }, rgb: string): void {
    g.strokeStyle = `rgba(${rgb},${band.alpha})`;
    for (let i = 1; i <= band.steps; i++) {
      g.lineWidth = (band.reach * i) / band.steps;
      g.stroke(this.sea);
    }
  }

  /** Runs `draw` with the canvas clipped to the sea. */
  onSea(g: CanvasRenderingContext2D, draw: () => void): void {
    if (this.water.length === 0) return;
    g.save();
    g.clip(this.sea, 'evenodd');
    draw();
    g.restore();
  }

  /** The deep texture, let in by the depth layer. */
  private paintDeep(g: CanvasRenderingContext2D, box: Box): void {
    if (!this.depth) return;
    const c = makeCanvas((box.x1 - box.x0) * DEEP_SCALE, (box.y1 - box.y0) * DEEP_SCALE);
    const d = ctxOf(c);
    d.setTransform(DEEP_SCALE, 0, 0, DEEP_SCALE, -box.x0 * DEEP_SCALE, -box.y0 * DEEP_SCALE);
    this.fillBox(d, box, 'deep');
    d.globalCompositeOperation = 'destination-in';
    this.stretch(d, this.depth);
    g.drawImage(c, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  }

  private foam(g: CanvasRenderingContext2D): void {
    g.save();
    g.clip(this.sea, 'evenodd');
    g.globalAlpha = 0.75;
    g.strokeStyle = '#fbf7ea';
    g.lineWidth = 5;
    g.setLineDash([34, 12, 10, 18]);
    g.stroke(this.sea);
    g.restore();
  }

  /** A soft, low-resolution layer over the whole extent. */
  private soft(pixel: (x: number, y: number) => readonly [number, number, number, number]): HTMLCanvasElement {
    const e = this.extent;
    const c = makeCanvas((e.x1 - e.x0) / LOW, (e.y1 - e.y0) / LOW);
    const g = ctxOf(c);
    const img = g.createImageData(c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) img.data.set(pixel(e.x0 + (x + 0.5) * LOW, e.y0 + (y + 0.5) * LOW), (y * c.width + x) * 4);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  private stretch(g: CanvasRenderingContext2D, c: HTMLCanvasElement): void {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, this.extent.x0, this.extent.y0, c.width * LOW, c.height * LOW);
  }

  private depthPixel(x: number, y: number): readonly [number, number, number, number] {
    const n = parseInt(WATER_DEEP.slice(1), 16);
    let wet = 0;
    for (const r of [0, 55, 110]) for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) wet += fieldAt(this.rows, '~', x + i * r, y + j * r);
    const k = Math.max(0, wet / 12 - 0.5) * 2;
    const blot = 0.75 + 0.5 * fbm(x / 180, y / 180, 3, 5);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.min(235, k * k * 185 * blot * this.look.deep)];
  }

  private fadePixel(x: number, y: number): readonly [number, number, number, number] {
    const n = parseInt(this.paper.slice(1), 16);
    const e = this.extent;
    const edge = Math.min(x - e.x0, e.x1 - x, y - e.y0, e.y1 - y) + (fbm(x / 90, y / 90, 4, 77) - 0.5) * 220;
    const t = Math.min(1, Math.max(0, 1 - (edge - 40) / FADE));
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(255 * t * t * (3 - 2 * t))];
  }
}

/** The blooms of a watercolour wash: warmer and cooler patches. */
function washPixel(x: number, y: number, look: Look): readonly [number, number, number, number] {
  const a = fbm(x / 260, y / 260, 4, 21) - 0.5;
  const b = fbm(x / 90, y / 90, 3, 33) - 0.5;
  const v = (a * 1.5 + b * 0.6) * look.wash;
  return v > 0 ? [...look.warm, Math.min(46, v * 110)] : [...look.cool, Math.min(95, -v * 190)];
}
