import type Phaser from 'phaser';
import type { CityView, Id, Movement, Pt } from '../../sim/types';
import { boxOf, clamp, dist, lineLength, nearestOnLine, pointAt, resample, soften, subLine } from '../geom';
import { project, TILT } from '../projection';
import { css, HAND, heat, INK } from '../style';
import { ctxOf, makeCanvas } from '../tiles';

/**
 * The flow arrows of one junction: thickness is how many cars, colour is how
 * long they wait (calm ink to red), and the worst one pulses with its share
 * of the waiting. Painted on a canvas so they look drawn.
 */
const SCALE = 3;
const PAD = 16;
const MIN_W = 2.2;
const MAX_W = 8.5;
const WAIT_FULL = 26; // seconds of waiting that read as red
const HEAD = 2.1;
const WORST_SHARE = 0.12;
const TEXT_CSS = 22;
const TEXT_MIN_CSS = 18;
const PICK = 9;

export interface DrawnArrow { readonly m: Movement; readonly line: readonly Pt[]; readonly width: number; readonly colour: number; readonly heat: number }

/** Movements as arrows, calmest first so the worst lies on top. Pure. */
export function arrowsOf(moves: readonly Movement[]): DrawnArrow[] {
  const most = Math.max(1, ...moves.map((m) => m.cars));
  return moves
    .filter((m) => m.arrow.length > 1 && m.fromRoad !== m.toRoad)
    .map((m) => {
      const h = m.flyover ? 0 : clamp(m.wait / WAIT_FULL, 0, 1);
      return { m, line: soften(m.arrow, 1), width: MIN_W + (MAX_W - MIN_W) * Math.sqrt(m.cars / most), colour: heat(h), heat: h };
    })
    .sort((a, b) => a.m.share - b.m.share);
}

export const worstOf = (arrows: readonly DrawnArrow[]): DrawnArrow | null => {
  const w = arrows[arrows.length - 1];
  return w && w.m.share >= WORST_SHARE && w.heat > 0.15 && !w.m.flyover ? w : null;
};

export class Arrows {
  node: Id | null = null;
  private drawn: DrawnArrow[] = [];
  private images: Phaser.GameObjects.Image[] = [];
  private text: Phaser.GameObjects.Text | null = null;
  private textAt: Pt = { x: 0, y: 0 };
  private picked: Movement | null = null;
  private clock = 0;
  private serial = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly depth: number) {}

  show(city: CityView, node: Id): void {
    this.node = node;
    this.refresh(city);
  }

  hide(): void {
    this.node = null;
    this.picked = null;
    this.drawn = [];
    this.wipe();
  }

  /** Highlight one movement (the flyover tool's pick). */
  setPicked(m: Movement | null, city: CityView): void {
    this.picked = m;
    if (this.node !== null) this.refresh(city);
  }

  refresh(city: CityView): void {
    if (this.node === null) return;
    const all = arrowsOf(city.movements(this.node));
    this.drawn = all;
    this.wipe();
    if (all.length === 0) return;
    const worst = worstOf(all);
    const rest = all.filter((a) => a !== worst);
    if (rest.length > 0) this.paint(rest, false);
    if (worst) {
      this.paint([worst], true);
      if (this.picked === null) this.label(worst); // a picked turn has its price there
    }
  }

  private wipe(): void {
    for (const i of this.images) {
      const key = i.texture.key;
      i.destroy();
      this.scene.textures.remove(key);
    }
    this.images = [];
    this.text?.destroy();
    this.text = null;
  }

  private paint(arrows: readonly DrawnArrow[], worst: boolean): void {
    const box = boxOf(arrows.flatMap((a) => [...a.line]), PAD);
    const c = makeCanvas((box.x1 - box.x0) * SCALE, (box.y1 - box.y0) * SCALE);
    const g = ctxOf(c);
    g.setTransform(SCALE, 0, 0, SCALE, -box.x0 * SCALE, -box.y0 * SCALE);
    g.lineJoin = 'round';
    for (const a of arrows) this.arrow(g, a);
    const key = `arrows-${this.scene.sys.settings.key}-${this.serial++}`;
    this.scene.textures.addCanvas(key, c);
    const img = this.scene.add.image(box.x0, box.y0 * TILT, key).setOrigin(0).setScale(1 / SCALE, TILT / SCALE).setDepth(this.depth + (worst ? 1 : 0));
    img.setData('worst', worst);
    this.images.push(img);
  }

  private arrow(g: CanvasRenderingContext2D, a: DrawnArrow): void {
    const faint = this.picked !== null && this.picked !== a.m && !(this.picked.fromRoad === a.m.fromRoad && this.picked.toRoad === a.m.toRoad);
    const path = arrowPath(a.line, a.width);
    g.globalAlpha = faint ? 0.35 : 1;
    g.lineWidth = a.m.flyover ? 1 : 2.4;
    g.strokeStyle = 'rgba(250,244,230,0.9)';
    g.stroke(path);
    g.fillStyle = css(a.colour);
    g.globalAlpha = faint ? 0.25 : a.m.flyover ? 0.4 : 0.9;
    g.fill(path);
    g.globalAlpha = faint ? 0.3 : 0.9;
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    if (a.m.flyover) g.setLineDash([4, 3]);
    g.stroke(path);
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  private label(a: DrawnArrow): void {
    this.textAt = pointAt(a.line, lineLength(a.line) * 0.42);
    const pct = Math.round(a.m.share * 100);
    this.text = this.scene.add.text(0, 0, `${pct}% of the waiting`, { fontFamily: HAND, fontSize: `${TEXT_CSS * 2}px`, fontStyle: '700', color: '#7d1f15', stroke: '#fbf5e6', strokeThickness: 10 })
      .setOrigin(0.5, 1.25).setDepth(this.depth + 2);
  }

  /** `zoom` is CSS px per plan px. */
  update(dt: number, zoom: number): void {
    this.clock += dt;
    const pulse = 0.72 + 0.28 * Math.sin(this.clock * 5.2);
    for (const i of this.images) i.setAlpha(i.getData('worst') ? pulse : 0.94);
    if (!this.text) return;
    const p = project(this.textAt);
    this.text.setPosition(p.x, p.y).setScale(Math.max(TEXT_MIN_CSS, TEXT_CSS) / (TEXT_CSS * 2) / zoom);
  }

  /** The movement whose arrow is nearest a plan point. */
  pick(p: Pt): Movement | null {
    let best: Movement | null = null;
    let d = Infinity;
    for (const a of this.drawn) {
      const k = nearestOnLine(a.line, p).d - a.width / 2;
      if (k < PICK && k < d) { d = k; best = a.m; }
    }
    return best;
  }

  /** The movement whose tail and head best match a drag. */
  pickDrag(from: Pt, to: Pt): Movement | null {
    let best: Movement | null = null;
    let d = Infinity;
    for (const a of this.drawn) {
      const k = dist(a.line[0]!, from) + dist(a.line[a.line.length - 1]!, to);
      if (k < d) { d = k; best = a.m; }
    }
    return best;
  }
}

/** A tapering body with a head, as one outline. */
export function arrowOutline(line: readonly Pt[], width: number): Pt[] {
  const len = lineLength(line);
  const head = Math.min(len * 0.45, width * HEAD);
  const body = resample(subLine(line, 0, len - head * 0.8), 6);
  const left: Pt[] = [];
  const right: Pt[] = [];
  body.forEach((p, i) => {
    const w = (width / 2) * (0.62 + 0.38 * (i / Math.max(1, body.length - 1)));
    left.push({ x: p.x + Math.sin(p.a) * w, y: p.y - Math.cos(p.a) * w });
    right.push({ x: p.x - Math.sin(p.a) * w, y: p.y + Math.cos(p.a) * w });
  });
  const n = body[body.length - 1]!;
  const wing = Math.max(width * 1.05, 4);
  const tip = pointAt(line, len);
  return [
    ...left, { x: n.x + Math.sin(n.a) * wing, y: n.y - Math.cos(n.a) * wing }, { x: tip.x, y: tip.y },
    { x: n.x - Math.sin(n.a) * wing, y: n.y + Math.cos(n.a) * wing }, ...right.reverse(),
  ];
}

function arrowPath(line: readonly Pt[], width: number): Path2D {
  const p = new Path2D();
  arrowOutline(line, width).forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  p.closePath();
  return p;
}
