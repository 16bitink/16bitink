import type Phaser from 'phaser';
import { CELL, DECK_Z } from '../../sim/constants';
import type { CarParkKind, Cell, Pt, Quote, RoadType } from '../../sim/types';
import { halfWidth } from '../../sim/roadGeom';
import { lineLength, pointAt, ribbon, smooth } from '../geom';
import { project } from '../projection';
import { HAND, INK_HEX } from '../style';

/** What the player is about to build, drawn over everything: the road, the deck, the footprint, the stops, the price. */
const OK_HEX = 0x2f8f92;
const NO_HEX = 0x5a4c40;
const PAPER_HEX = 0xfbf5e6;
const TEXT_PX = 44;
const TAG_CSS = 22;
const RAMP_SHARE = 0.3;

/** Footprints in cells. */
export const PARK_CELLS: Readonly<Record<CarParkKind, readonly [number, number]>> = { lot: [3, 2], ride: [4, 3], multi: [2, 2], under: [2, 2] };

export class GhostLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly tag: Phaser.GameObjects.Text;
  private tagAt: Pt = { x: 0, y: 0 };
  private clock = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.g = scene.add.graphics().setDepth(depth);
    this.tag = scene.add.text(0, 0, '', { fontFamily: HAND, fontSize: `${TEXT_PX}px`, fontStyle: '700', color: '#2b3a3c', stroke: '#fbf5e6', strokeThickness: 12, align: 'center' })
      .setOrigin(0.5, 1.5).setDepth(depth + 1).setVisible(false);
  }

  clear(): void {
    this.g.clear();
    this.tag.setVisible(false);
  }

  private colour(ok: boolean): number { return ok ? OK_HEX : NO_HEX; }

  private fillPlan(pts: readonly Pt[], colour: number, alpha: number, z = 0): void {
    this.g.fillStyle(colour, alpha).fillPoints(pts.map((p) => project(p, z)) as Phaser.Math.Vector2[], true, true);
  }

  private strokePlan(pts: readonly Pt[], colour: number, width: number, alpha = 1, close = false): void {
    this.g.lineStyle(width, colour, alpha).strokePoints(pts.map((p) => project(p)) as Phaser.Math.Vector2[], close, close);
  }

  road(line: readonly Pt[], type: RoadType, oneWay: boolean, q: Quote | null): void {
    if (line.length < 2) return;
    const ok = q?.ok ?? true;
    const half = halfWidth({ type, oneWay });
    this.fillPlan(ribbon(line, half + 6), PAPER_HEX, 0.45);
    this.fillPlan(ribbon(line, half), this.colour(ok), 0.55);
    this.strokePlan(ribbon(line, half + 1), INK_HEX, 1.2, 0.8, true);
    this.dashes(line, PAPER_HEX, 1.4);
    if (oneWay) this.heads(line);
    this.say(q, line[line.length - 1]!);
  }

  /** A deck or a tunnel for one movement. */
  flyover(line: readonly Pt[], level: 1 | -1, q: Quote | null): void {
    if (line.length < 2) return;
    const ok = q?.ok ?? true;
    const len = lineLength(line);
    const z = (s: number): number => (level > 0 ? DECK_Z * smooth(Math.min(s, len - s) / (len * RAMP_SHARE)) : 0);
    const n = Math.max(8, Math.round(len / 8));
    const at = (half: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
      const s = (len * i) / n;
      const p = pointAt(line, s);
      return project({ x: p.x - Math.sin(p.a) * half, y: p.y + Math.cos(p.a) * half }, z(s));
    });
    const flat = ribbon(line, 5);
    this.fillPlan(flat, INK_HEX, level > 0 ? 0.28 : 0.1);
    const deck = [...at(-6.5), ...at(6.5).reverse()];
    this.g.fillStyle(this.colour(ok), level > 0 ? 0.8 : 0.4).fillPoints(deck as Phaser.Math.Vector2[], true, true);
    this.g.lineStyle(1.3, INK_HEX, 0.9).strokePoints(deck as Phaser.Math.Vector2[], true, true);
    this.say(q, pointAt(line, len / 2));
  }

  /** An existing road picked by a tool. */
  pick(line: readonly Pt[], half: number, q: Quote | null): void {
    const ok = q?.ok ?? true;
    this.fillPlan(ribbon(line, half + 3), this.colour(ok), 0.35);
    this.strokePlan(ribbon(line, half + 4), this.colour(ok), 2.2, 0.95, true);
    this.say(q, pointAt(line, lineLength(line) / 2));
  }

  block(at: Cell, kind: CarParkKind, q: Quote | null): void {
    const [w, h] = PARK_CELLS[kind];
    const ok = q?.ok ?? true;
    const x = at.gx * CELL;
    const y = at.gy * CELL;
    const r = [{ x: x + 3, y: y + 3 }, { x: x + w * CELL - 3, y: y + 3 }, { x: x + w * CELL - 3, y: y + h * CELL - 3 }, { x: x + 3, y: y + h * CELL - 3 }];
    this.fillPlan(r, this.colour(ok), 0.5);
    this.strokePlan(r, INK_HEX, 1.4, 0.9, true);
    for (let i = 14; i < w * CELL - 8; i += 11) this.strokePlan([{ x: x + i, y: y + 8 }, { x: x + i, y: y + 24 }], PAPER_HEX, 1.2, 0.8);
    this.say(q, { x: x + (w * CELL) / 2, y: y + 6 });
  }

  stops(stops: readonly Pt[], path: readonly Pt[], colour: number, q: Quote | null, next: Pt | null): void {
    if (path.length > 1) {
      this.strokePlan(path, PAPER_HEX, 8, 0.85);
      this.strokePlan(path, colour, 5, 0.95);
    }
    const last = stops[stops.length - 1];
    if (next && last) this.strokePlan([last, next], colour, 2, 0.5);
    for (const s of stops) {
      const p = project(s);
      this.g.fillStyle(PAPER_HEX, 1).fillCircle(p.x, p.y, 7).lineStyle(3, colour, 1).strokeCircle(p.x, p.y, 7);
    }
    if (next) { const p = project(next); this.g.lineStyle(2, colour, 0.8).strokeCircle(p.x, p.y, 6); }
    if (last && q) this.say(q, last);
  }

  /** The vertex under the pointer, before anything is drawn. */
  dot(at: Pt, onRoad: boolean): void {
    const p = project(at);
    this.g.fillStyle(PAPER_HEX, 0.9).fillCircle(p.x, p.y, 5.5).lineStyle(2, onRoad ? OK_HEX : INK_HEX, 0.9).strokeCircle(p.x, p.y, 5.5);
  }

  /** The grid near the pointer, faint. */
  grid(at: Pt, reach: number): void {
    const gx = Math.round(at.x / CELL);
    const gy = Math.round(at.y / CELL);
    for (let j = -reach; j <= reach; j++) {
      for (let i = -reach; i <= reach; i++) {
        const d = Math.hypot(i, j);
        if (d > reach) continue;
        const p = project({ x: (gx + i) * CELL, y: (gy + j) * CELL });
        this.g.fillStyle(INK_HEX, 0.32 * (1 - d / (reach + 1))).fillCircle(p.x, p.y, 1.7);
      }
    }
  }

  private dashes(line: readonly Pt[], colour: number, width: number): void {
    const len = lineLength(line);
    for (let s = 4; s < len - 4; s += 16) this.strokePlan([pointAt(line, s), pointAt(line, Math.min(len, s + 8))], colour, width, 0.9);
  }

  private heads(line: readonly Pt[]): void {
    const len = lineLength(line);
    for (let s = 20; s < len; s += 45) {
      const p = pointAt(line, s);
      const at = (f: number, r: number): Pt => ({ x: p.x + Math.cos(p.a) * f - Math.sin(p.a) * r, y: p.y + Math.sin(p.a) * f + Math.cos(p.a) * r });
      this.fillPlan([at(6, 0), at(-4, 5), at(-4, -5)], PAPER_HEX, 0.95);
    }
  }

  private say(q: Quote | null, at: Pt): void {
    if (!q) return;
    const text = q.ok ? `${Math.round(q.cost)} coins${q.works > 0 ? `\n${q.works} ${q.works === 1 ? 'season' : 'seasons'} of works` : ''}` : wrap(q.why ?? 'Not here', 26);
    this.tag.setText(text).setColor(q.ok ? '#1f5a5c' : '#5b4a3a').setVisible(true);
    this.tagAt = !q.ok && q.at ? this.flash(q.at) : at;
  }

  /** What blocks a refusal, washed red-brown; returns where its words go. */
  private flash(r: { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }): Pt {
    const x = r.gx * CELL, y = r.gy * CELL, w = r.w * CELL, h = r.h * CELL;
    const box = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
    this.fillPlan(box, NO_HEX, 0.3);
    this.strokePlan(box, NO_HEX, 3, 0.9, true);
    return { x: x + w / 2, y };
  }

  update(dt: number, zoom: number): void {
    this.clock += dt;
    this.g.setAlpha(0.86 + 0.14 * Math.sin(this.clock * 4));
    if (!this.tag.visible) return;
    const p = project(this.tagAt);
    this.tag.setPosition(p.x, p.y - 4).setScale(TAG_CSS / TEXT_PX / zoom);
  }
}

/** Break a sentence into short lines. */
export function wrap(text: string, width: number): string {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + word).length < width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.join('\n');
}
