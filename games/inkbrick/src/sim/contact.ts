/**
 * Circle-vs-AABB contacts on the cell grid. Each solid cell is a box; a corner normal is
 * flattened when the neighbouring cell continues the surface (no false corner bounces on the
 * seams between bricks). Moving pieces (shutters, Brumm and his shield, spinners) are checked
 * directly. The deepest contact wins; the caller resolves and asks again.
 */
import { BALL_R, SPINNER_HALF_THICK } from './constants';
import { cellIndex, type Layer } from './grid';
import { CELL, COLS, ROWS } from './types';
import type { Ball, World } from './world';

export const C_NONE = -1;
export const C_BRICK = 0;
export const C_SHUTTER = 1;
export const C_SHIELD = 2;
export const C_BOSS = 3;
export const C_SPINNER = 4;

export interface Contact { kind: number; id: number; nx: number; ny: number; pen: number }

export function newContact(): Contact {
  return { kind: C_NONE, id: -1, nx: 0, ny: 0, pen: 0 };
}

const R2 = BALL_R * BALL_R;

function solidAt(layer: Layer, cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
  return layer.grid[cellIndex(cx, cy)]! >= 0;
}

function offer(c: Contact, kind: number, id: number, nx: number, ny: number, pen: number): void {
  if (pen > c.pen) {
    c.kind = kind;
    c.id = id;
    c.nx = nx;
    c.ny = ny;
    c.pen = pen;
  }
}

/** Box contact; returns false when apart. Writes the normal and depth into `out`. */
function boxContact(px: number, py: number, rx: number, ry: number, rw: number, rh: number, out: Contact): boolean {
  const qx = px < rx ? rx : px > rx + rw ? rx + rw : px;
  const qy = py < ry ? ry : py > ry + rh ? ry + rh : py;
  const dx = px - qx;
  const dy = py - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R2) return false;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    out.nx = dx / d;
    out.ny = dy / d;
    out.pen = BALL_R - d;
    return true;
  }
  // The centre is inside the box: leave by the nearest side.
  const left = px - rx;
  const right = rx + rw - px;
  const top = py - ry;
  const bottom = ry + rh - py;
  const m = Math.min(left, right, top, bottom);
  out.nx = m === left ? -1 : m === right ? 1 : 0;
  out.ny = out.nx !== 0 ? 0 : m === top ? -1 : 1;
  out.pen = BALL_R + m;
  return true;
}

const tmp = newContact();

function layerContacts(layer: Layer, b: Ball, c: Contact): void {
  const lx = b.x - layer.ox;
  const ly = b.y - layer.oy;
  const cx0 = Math.floor((lx - BALL_R) / CELL);
  const cx1 = Math.floor((lx + BALL_R) / CELL);
  const cy0 = Math.floor((ly - BALL_R) / CELL);
  const cy1 = Math.floor((ly + BALL_R) / CELL);
  for (let cy = cy0; cy <= cy1; cy++) {
    if (cy < 0 || cy >= ROWS) continue;
    for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cx >= COLS) continue;
      const bi = layer.grid[cy * COLS + cx]!;
      if (bi < 0) continue;
      const rx = cx * CELL;
      const ry = cy * CELL;
      if (!boxContact(lx, ly, rx, ry, CELL, CELL, tmp)) continue;
      let { nx, ny, pen } = tmp;
      if (nx !== 0 && ny !== 0) {
        const sx = nx > 0 ? 1 : -1;
        const sy = ny > 0 ? 1 : -1;
        const flatX = solidAt(layer, cx + sx, cy);
        const flatY = solidAt(layer, cx, cy + sy);
        if (flatX && !flatY) {
          nx = 0;
          ny = sy;
          pen = BALL_R - (sy > 0 ? ly - (ry + CELL) : ry - ly);
        } else if (flatY && !flatX) {
          nx = sx;
          ny = 0;
          pen = BALL_R - (sx > 0 ? lx - (rx + CELL) : rx - lx);
        }
      }
      offer(c, C_BRICK, bi, nx, ny, pen);
    }
  }
}

function spinnerContact(w: World, b: Ball, c: Contact): void {
  const reach = BALL_R + SPINNER_HALF_THICK;
  for (let i = 0; i < w.spinners.length; i++) {
    const s = w.spinners[i]!;
    const ex = s.x2 - s.x1;
    const ey = s.y2 - s.y1;
    const len2 = ex * ex + ey * ey;
    let t = len2 > 0 ? ((b.x - s.x1) * ex + (b.y - s.y1) * ey) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = b.x - (s.x1 + ex * t);
    const dy = b.y - (s.y1 + ey * t);
    const d2 = dx * dx + dy * dy;
    if (d2 >= reach * reach) continue;
    const d = Math.sqrt(d2);
    if (d > 1e-9) offer(c, C_SPINNER, i, dx / d, dy / d, reach - d);
    else offer(c, C_SPINNER, i, 0, -1, reach);
  }
}

function moverContacts(w: World, b: Ball, c: Contact): void {
  for (let i = 0; i < w.shutters.length; i++) {
    const s = w.shutters[i]!;
    if (s.closed && boxContact(b.x, b.y, s.x, s.y, s.w, s.h, tmp)) offer(c, C_SHUTTER, i, tmp.nx, tmp.ny, tmp.pen);
  }
  const boss = w.boss;
  if (boss) {
    if (boxContact(b.x, b.y, boss.shieldX, boss.shieldY, boss.shieldW, boss.shieldH, tmp)) offer(c, C_SHIELD, 0, tmp.nx, tmp.ny, tmp.pen);
    if (boss.hitsLeft > 0 && boxContact(b.x, b.y, boss.x, boss.y, boss.w, boss.h, tmp)) offer(c, C_BOSS, 0, tmp.nx, tmp.ny, tmp.pen);
  }
  if (w.spinners.length > 0) spinnerContact(w, b, c);
}

/** The deepest contact of the ball, or c.kind === C_NONE. */
export function findContact(w: World, b: Ball, c: Contact): void {
  c.kind = C_NONE;
  c.pen = 0;
  for (let i = 0; i < w.layers.length; i++) layerContacts(w.layers[i]!, b, c);
  moverContacts(w, b, c);
}
