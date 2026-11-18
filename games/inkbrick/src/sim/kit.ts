/**
 * Small helpers for writing levels by hand or in the generator (docs/inkbrick-level-kit.md).
 * All positions in cells (36 x 64 grid, bricks in rows 3-50).
 */
import type { BrickDef, BrickKind, PickupKind } from './types';

export interface FillOptions {
  /** Brick size in cells (default 3 x 1; dense = 1 x 1). */
  readonly bw?: number;
  readonly bh?: number;
  readonly hp?: number;
  readonly drop?: PickupKind;
  readonly tint?: number;
  readonly floe?: string;
  readonly link?: string;
  /** Skip a brick whose top-left cell is (cx, cy). */
  readonly skip?: (cx: number, cy: number) => boolean;
}

/** Fills the area x..x+w-1, y..y+h-1 with bricks of one kind (partial bricks at the edges are dropped). */
export function fill(x: number, y: number, w: number, h: number, kind: BrickKind, o: FillOptions = {}): BrickDef[] {
  const bw = o.bw ?? 3;
  const bh = o.bh ?? 1;
  const out: BrickDef[] = [];
  for (let cy = y; cy + bh <= y + h; cy += bh) {
    for (let cx = x; cx + bw <= x + w; cx += bw) {
      if (o.skip?.(cx, cy)) continue;
      out.push({
        x: cx, y: cy, w: bw, h: bh, kind,
        ...(o.hp !== undefined ? { hp: o.hp } : {}),
        ...(o.drop ? { drop: o.drop } : {}),
        ...(o.tint !== undefined ? { tint: o.tint } : {}),
        ...(o.floe ? { floe: o.floe } : {}),
        ...(o.link ? { link: o.link } : {}),
      });
    }
  }
  return out;
}

/** One stone block. */
export function stone(x: number, y: number, w: number, h: number): BrickDef {
  return { x, y, w, h, kind: 'stone' };
}

export interface Hole {
  readonly side: 'top' | 'bottom' | 'left' | 'right';
  /** First cell of the hole along that side, counted from the shell's x (top/bottom) or y (left/right). */
  readonly at: number;
  readonly width: number;
}

function segment(x: number, y: number, len: number, horizontal: boolean, thick: number, holes: readonly Hole[], side: Hole['side']): BrickDef[] {
  const cuts = holes.filter((h) => h.side === side).map((h) => [h.at, h.at + h.width] as const).sort((a, b) => a[0] - b[0]);
  const out: BrickDef[] = [];
  let from = 0;
  for (const [a, b] of [...cuts, [len, len] as const]) {
    if (a > from) out.push(horizontal ? stone(x + from, y, a - from, thick) : stone(x, y + from, thick, a - from));
    from = Math.max(from, b);
  }
  return out;
}

/** A stone shell (the outline of x, y, w, h, `thick` cells thick) with holes cut in its sides. */
export function shell(x: number, y: number, w: number, h: number, holes: readonly Hole[], thick = 1): BrickDef[] {
  return [
    ...segment(x, y, w, true, thick, holes, 'top'),
    ...segment(x, y + h - thick, w, true, thick, holes, 'bottom'),
    ...segment(x, y + thick, h - 2 * thick, false, thick, holes.map((o) => ({ ...o, at: o.at - thick })), 'left'),
    ...segment(x + w - thick, y + thick, h - 2 * thick, false, thick, holes.map((o) => ({ ...o, at: o.at - thick })), 'right'),
  ];
}

/** Drops bricks that overlap any of `blockers` (so fills can be poured, then carved). */
export function minus(bricks: readonly BrickDef[], blockers: readonly BrickDef[]): BrickDef[] {
  const taken = new Set<string>();
  for (const b of blockers) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) taken.add(`${x},${y}`);
  return bricks.filter((b) => {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (taken.has(`${x},${y}`)) return false;
    return true;
  });
}

/** Replaces the bricks at the given top-left cells with another kind (e.g. a few kegs in a fill). */
export function swapKind(bricks: readonly BrickDef[], at: readonly (readonly [number, number])[], kind: BrickKind, extra: Partial<BrickDef> = {}): BrickDef[] {
  const keys = new Set(at.map(([x, y]) => `${x},${y}`));
  return bricks.map((b) => (keys.has(`${b.x},${b.y}`) ? { ...b, ...extra, kind } : b));
}
