/** The moving pieces as pure functions of the level clock: floes, shutters, spinners, Brumm's shield. */
import { cosDeg, sinDeg } from './trig';
import { CELL } from './types';
import type { World } from './world';

/** 0 -> 1 -> 0 over one period (back and forth on a track). */
export function triangle(u: number): number {
  const f = u - Math.floor(u);
  return 1 - Math.abs(1 - 2 * f);
}

function moveFloes(w: World): void {
  const defs = w.level.floes ?? [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const t = def.period > 0 ? triangle(w.time / def.period) : 0;
    const floe = w.floes[i]!;
    floe.ox = def.dx * CELL * t;
    floe.oy = def.dy * CELL * t;
    const layer = w.layers[i + 1]!;
    layer.ox = floe.ox;
    layer.oy = floe.oy;
  }
  if (defs.length === 0) return;
  for (const b of w.bricks) {
    if (b.layer === 0) continue;
    const layer = w.layers[b.layer]!;
    b.x = b.def.x * CELL + layer.ox;
    b.y = b.def.y * CELL + layer.oy;
  }
}

function moveShutters(w: World): void {
  const defs = w.level.shutters ?? [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const cycle = def.open + def.closed;
    const s = w.shutters[i]!;
    if (cycle <= 0) {
      s.closed = def.closed > 0;
      s.switchIn = 0;
      continue;
    }
    let local = (w.time + def.phase) % cycle;
    if (local < 0) local += cycle;
    s.closed = local >= def.open;
    s.switchIn = s.closed ? cycle - local : def.open - local;
  }
}

function moveSpinners(w: World): void {
  const defs = w.level.spinners ?? [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const s = w.spinners[i]!;
    const turn = def.period !== 0 ? (w.time + def.phase) / def.period : 0;
    s.angle = 360 * (turn - Math.floor(turn));
    const half = (def.length * CELL) / 2;
    const c = cosDeg(s.angle) * half;
    const sn = sinDeg(s.angle) * half;
    s.x1 = s.x - c;
    s.y1 = s.y - sn;
    s.x2 = s.x + c;
    s.y2 = s.y + sn;
  }
}

function moveShield(w: World): void {
  const boss = w.boss;
  const def = w.level.boss;
  if (!boss || !def) return;
  const x0 = def.trackX0 ?? boss.x / CELL - def.shieldW;
  const x1 = def.trackX1 ?? (boss.x + boss.w) / CELL;
  const travel = x1 - x0;
  if (travel <= 0 || def.speed <= 0) {
    boss.shieldX = x0 * CELL;
    return;
  }
  const period = (2 * travel) / def.speed;
  boss.shieldX = (x0 + travel * triangle(w.time / period)) * CELL;
}

export function movePieces(w: World): void {
  moveFloes(w);
  moveShutters(w);
  moveSpinners(w);
  moveShield(w);
}
