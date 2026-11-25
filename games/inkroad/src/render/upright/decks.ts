import type Phaser from 'phaser';
import { DECK_Z } from '../../sim/constants';
import { halfWidth } from '../../sim/roadGeom';
import type { CityView, Project, Pt, Road } from '../../sim/types';
import { buildAtlas, type Piece } from '../atlas';
import { deckPoints, tierLift, type DeckPoint } from '../deckHeight';
import { lineLength, nearestOnLine, pointAt, smooth } from '../geom';
import { TILE } from '../ground/land';
import type { Pictures } from '../pictures';
import { projectY, RISE } from '../projection';
import { INK, PAINT } from '../style';
import { ctxOf, makeCanvas } from '../tiles';
import { TEXTURE_SIZE, type TextureName } from '../../art/manifest';
import type { Thing, Things } from './things';

/**
 * Flyovers: a deck cut into short slices, each an upright picture sorted among
 * the buildings by its south edge, so traffic and houses pass in front and
 * behind correctly. Piers stand wherever no road runs below.
 */
const SLICE = 15;
const SCALE = 3;
const STEP = 5;
const KERB = 2.4; // concrete beside the lane
const THICK = 7.5; // the deck's side, height px: the ramp is a solid wedge until the deck is this high
const RAIL = 4;
const GROW_Z = 9; // the kerb and the parapet grow to full size by this height, so a ramp starts as a clean wedge
const PIER_EVERY = 46;
const PIER_MIN_Z = 15;
const PIER_GAP = 3.5; // clear of a road's edge
const PIER_W = 7.5;
const PAD = 6;
const OVERLAP = 0.6;
const CAP = '#f6eddb';

/** A cross-section: outer edges, the lane's edges, the parapet's height. */
interface Edge { readonly p: DeckPoint; readonly l: Pt; readonly r: Pt; readonly il: Pt; readonly ir: Pt; readonly rail: number }

function edgeAt(p: DeckPoint, lane: number): Edge {
  const grow = smooth(p.z / GROW_Z);
  const half = lane + KERB * grow;
  const off = (by: number): Pt => ({ x: p.x - Math.sin(p.a) * by, y: p.y + Math.cos(p.a) * by });
  return { p, l: off(-half), r: off(half), il: off(-lane), ir: off(lane), rail: RAIL * grow };
}

export class Decks {
  private images: Phaser.GameObjects.Image[] = [];
  private piers: Thing[] = [];
  private sig = '';

  constructor(private readonly scene: Phaser.Scene, private readonly things: Things, private readonly pics: Pictures, private readonly depth: number) {}

  refresh(city: CityView): void {
    const decks = city.roads.filter((r) => r.flyover && r.level === 1);
    const sig = `${decks.map((r) => r.id).join('|')}#${decks.length > 0 ? city.version : 0}#${city.projects.map((p) => `${p.id}:${p.left}`).join('|')}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.clear();
    for (const p of city.projects) this.site(p, city);
    if (decks.length === 0) return;
    const pieces: (Piece & { readonly x: number; readonly y: number; readonly depth: number })[] = [];
    for (const r of decks) {
      pieces.push(...this.slices(r));
      this.stand(r, city);
    }
    const frames = buildAtlas(this.scene.textures, 'decks', pieces);
    for (const p of pieces) {
      const f = frames.get(p.name)!;
      this.images.push(this.scene.add.image(p.x, p.y, f.texture, f.frame).setOrigin(0).setScale(1 / SCALE).setDepth(this.depth + p.depth));
    }
  }

  private slices(road: Road): (Piece & { x: number; y: number; depth: number })[] {
    const edges = deckPoints(road, STEP).map((p) => edgeAt(p, halfWidth(road)));
    const out = [];
    const per = Math.max(1, Math.round(SLICE / STEP));
    for (let i = 0; i < edges.length - 1; i += per) {
      const part = edges.slice(i, Math.min(edges.length, i + per + 1));
      if (part.length > 1) out.push(this.slice(`${road.id}/${i}`, part));
    }
    return out;
  }

  /** One stretch of deck: its side, its surface, its lines and its parapets. */
  private slice(name: string, part: readonly Edge[]): Piece & { x: number; y: number; depth: number } {
    const all = part.flatMap((e) => [scr(e.l, e.p.z + e.rail), scr(e.r, e.p.z + e.rail), scr(e.l, bottom(e.p.z)), scr(e.r, bottom(e.p.z))]);
    const x0 = Math.min(...all.map((p) => p.x)) - PAD;
    const y0 = Math.min(...all.map((p) => p.y)) - PAD;
    const x1 = Math.max(...all.map((p) => p.x)) + PAD;
    const y1 = Math.max(...all.map((p) => p.y)) + PAD;
    const c = makeCanvas((x1 - x0) * SCALE, (y1 - y0) * SCALE);
    const g = ctxOf(c);
    g.setTransform(SCALE, 0, 0, SCALE, -x0 * SCALE, -y0 * SCALE);
    g.lineJoin = 'round';
    const fill = (name2: TextureName): CanvasPattern => {
      const p = g.createPattern(this.pics.texture(name2), 'repeat')!;
      p.setTransform(new DOMMatrix().scale(TILE[name2] / TEXTURE_SIZE));
      return p;
    };
    const south = southSide(part);
    this.side(g, part, south === 'l' ? 'r' : 'l', fill, false);
    this.side(g, part, south, fill, true);
    this.top(g, part, fill);
    this.parapet(g, part, south === 'l' ? 'r' : 'l', fill, false);
    this.parapet(g, part, south, fill, true);
    return { name, img: c, scale: SCALE, x: x0, y: y0, depth: Math.max(...part.map((e) => Math.max(e.l.y, e.r.y) + tierLift(e.p.z))) };
  }

  private side(g: CanvasRenderingContext2D, part: readonly Edge[], which: 'l' | 'r', fill: (n: TextureName) => CanvasPattern, lit: boolean): void {
    const up = part.map((e) => scr(e[which], e.p.z));
    const down = part.map((e) => scr(e[which], bottom(e.p.z)));
    const path = poly([...up, ...down.reverse()]);
    g.fillStyle = fill('concrete');
    g.fill(path);
    g.fillStyle = lit ? 'rgba(52,42,40,0.34)' : 'rgba(40,32,36,0.6)';
    g.fill(path);
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.stroke(line(part.map((e) => scr(e[which], bottom(e.p.z)))));
  }

  private top(g: CanvasRenderingContext2D, part: readonly Edge[], fill: (n: TextureName) => CanvasPattern): void {
    const z = (pick: (e: Edge) => Pt): Pt[] => part.map((e) => scr(pick(e), e.p.z));
    const face = (left: Pt[], right: Pt[], paint: CanvasPattern): void => {
      const path = poly([...left, ...right.reverse()]);
      g.fillStyle = paint;
      g.strokeStyle = paint;
      g.lineWidth = OVERLAP;
      g.fill(path);
      g.stroke(path);
    };
    face(z((e) => e.l), z((e) => e.r), fill('concrete'));
    face(z((e) => e.il), z((e) => e.ir), fill('asphalt'));
    g.strokeStyle = 'rgba(44,40,50,0.1)';
    g.lineWidth = 3;
    g.stroke(line(z((e) => e.p)));
    g.strokeStyle = PAINT;
    g.globalAlpha = 0.9;
    g.lineWidth = 0.75;
    for (const k of [0.1, 0.9]) g.stroke(line(z((e) => mix(e.il, e.ir, k))));
    g.globalAlpha = 1;
  }

  /** A low wall with a lit cap. */
  private parapet(g: CanvasRenderingContext2D, part: readonly Edge[], which: 'l' | 'r', fill: (n: TextureName) => CanvasPattern, near: boolean): void {
    const foot = part.map((e) => scr(e[which], e.p.z));
    const head = part.map((e) => scr(e[which], e.p.z + e.rail));
    const path = poly([...head, ...[...foot].reverse()]);
    g.fillStyle = fill('concrete');
    g.fill(path);
    g.fillStyle = near ? 'rgba(52,42,40,0.16)' : 'rgba(52,42,40,0.3)';
    g.fill(path);
    g.strokeStyle = INK;
    g.lineWidth = 1.9;
    g.stroke(line(head));
    g.strokeStyle = CAP;
    g.lineWidth = 0.95;
    g.stroke(line(head));
    g.strokeStyle = INK;
    g.globalAlpha = 0.4;
    g.lineWidth = 0.5;
    g.stroke(line(foot));
    g.globalAlpha = 1;
  }

  /** Piers under the deck, clear of the roads and junctions below (a roundabout's island will do). */
  private stand(road: Road, city: CityView): void {
    let since = PIER_EVERY * 0.6;
    for (const p of deckPoints(road, 4)) {
      since += 4;
      if (since < PIER_EVERY || p.z < PIER_MIN_Z || !clearOf(city, p)) continue;
      since = 0;
      this.pier(p, p.z);
    }
  }

  private pier(at: Pt, z: number): void {
    const t = this.things.add(this.things.atlas.sprite('prop/pier'), at.x, at.y + 2, { shadow: false, lift: -10 });
    t.img.setDisplaySize(PIER_W, Math.max(6, (z - THICK * 0.5) * RISE + 2));
    this.piers.push(t);
  }

  /** A flyover being built: bare piers, a crane over the middle, barriers at its feet. */
  private site(p: Project, city: CityView): void {
    const len = lineLength(p.line);
    const put = (name: string, at: Pt, size: number): void => { this.piers.push(this.things.add(this.things.atlas.sprite(name), at.x, at.y, { size })); };
    if (p.level === 1) {
      for (let s = PIER_EVERY * 0.7; s < len - PIER_EVERY * 0.5; s += PIER_EVERY) {
        const q = pointAt(p.line, s);
        if (clearOf(city, q)) this.pier(q, DECK_Z * (0.55 + 0.35 * Math.sin(s)));
      }
    }
    const mid = pointAt(p.line, len * 0.5);
    const a = mid.a - Math.PI / 2;
    put('prop/crane', { x: mid.x + Math.cos(a) * 30, y: mid.y + Math.sin(a) * 30 }, 1.9);
    for (const s of [6, len - 6]) put('prop/barrier', pointAt(p.line, s), 0.9);
    for (let s = 16; s < len - 10; s += 22) put('prop/cone', pointAt(p.line, s), 1);
  }

  clear(): void {
    this.images.forEach((i) => i.destroy());
    this.piers.forEach((t) => this.things.remove(t));
    this.images = [];
    this.piers = [];
  }
}

/** Nothing drives here. */
function clearOf(city: CityView, p: Pt): boolean {
  if (city.roads.some((r) => r.level === 0 && nearestOnLine(r.line, p).d < halfWidth(r) + PIER_GAP)) return false;
  return !city.junctions.some((j) => !j.ramp && j.arms.length > 2 && Math.hypot(j.x - p.x, j.y - p.y) < j.radius + PIER_GAP);
}

const scr = (p: Pt, z: number): Pt => ({ x: p.x, y: projectY(p.y, z) });
const bottom = (z: number): number => Math.max(0, z - THICK);
const mix = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The edge that faces the viewer. */
function southSide(part: readonly Edge[]): 'l' | 'r' {
  const sum = part.reduce((n, e) => n + (e.r.y - e.l.y), 0);
  return sum >= 0 ? 'r' : 'l';
}

function poly(pts: readonly Pt[]): Path2D {
  const p = line(pts);
  p.closePath();
  return p;
}

function line(pts: readonly Pt[]): Path2D {
  const p = new Path2D();
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  return p;
}
