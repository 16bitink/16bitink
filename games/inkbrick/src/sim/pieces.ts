/**
 * The moving pieces as pure functions of the level clock: floes, shutters, spinners, Brumm's
 * shield; crabs from their walk's progress (a hit speeds it up); and on a Rising Tide level
 * everything the tide carries, offset by the cells it has sunk.
 */
import { CRAB_FAST_MUL } from './constants';
import { cosDeg, sinDeg } from './trig';
import { CELL, STEP } from './types';
import type { World } from './world';

/** 0 -> 1 -> 0 over one period (back and forth on a track). */
export function triangle(u: number): number {
  const f = u - Math.floor(u);
  return 1 - Math.abs(1 - 2 * f);
}

function moveFloes(w: World): void {
  const defs = w.level.floes ?? [];
  const tide = w.goal === 'tide';
  const ty = tide ? w.tideOffset * CELL : 0;
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const t = def.period > 0 ? triangle(w.time / def.period) : 0;
    const floe = w.floes[i]!;
    floe.ox = def.dx * CELL * t;
    floe.oy = def.dy * CELL * t;
    const layer = w.layers[i + 1]!;
    layer.ox = floe.ox;
    layer.oy = tide ? floe.oy + ty : floe.oy;
  }
  if (tide) w.layers[defs.length + 1]!.oy = ty;
  if (defs.length === 0 && !tide) return;
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

/** The crab's back-and-forth walk: x from its progress, y on its row (plus the tide). */
function moveCrabs(w: World): void {
  const defs = w.level.crabs ?? [];
  const ty = w.tideOffset * CELL;
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const k = w.crabs[i]!;
    const u = k.cycle - Math.floor(k.cycle);
    k.x = (def.x0 + (def.x1 - def.x0) * triangle(k.cycle)) * CELL;
    k.y = def.y * CELL + ty;
    k.dir = u < 0.5 ? 1 : -1;
  }
}

/** Seconds a crab takes there and back at its own speed (0: it stands still). */
export function crabPeriod(def: { readonly x0: number; readonly x1: number; readonly speed: number }): number {
  const travel = def.x1 - def.x0;
  return travel > 0 && def.speed > 0 ? (2 * travel) / def.speed : 0;
}

/** One step of the crabs' walks (the Sim only; the trace places them with `crabsAt`). */
export function walkCrabs(w: World): void {
  const defs = w.level.crabs ?? [];
  for (let i = 0; i < defs.length; i++) {
    const k = w.crabs[i]!;
    const period = crabPeriod(defs[i]!);
    if (period > 0) k.cycle += (STEP * (k.fastLeft > 0 ? CRAB_FAST_MUL : 1)) / period;
    if (k.fastLeft > 0) k.fastLeft = Math.max(0, k.fastLeft - STEP);
  }
}

/** The crabs where an unhurried walk puts them at level time t (the aim trace's samples). */
export function crabsAt(w: World, t: number): void {
  const defs = w.level.crabs ?? [];
  for (let i = 0; i < defs.length; i++) {
    const period = crabPeriod(defs[i]!);
    w.crabs[i]!.cycle = defs[i]!.phase + (period > 0 ? t / period : 0);
  }
}

/** Rising Tide: shutters, spinner pivots, flip walls, bumpers, the friend and the pearls ride the field down. */
function moveTideAnchors(w: World): void {
  const ty = w.tideOffset * CELL;
  const shutters = w.level.shutters ?? [];
  for (let i = 0; i < shutters.length; i++) w.shutters[i]!.y = shutters[i]!.y * CELL + ty;
  const spinners = w.level.spinners ?? [];
  for (let i = 0; i < spinners.length; i++) w.spinners[i]!.y = (spinners[i]!.y + 0.5) * CELL + ty;
  for (const f of w.flips) f.y = f.y0 + ty;
  for (const b of w.bumpers) b.y = b.y0 + ty;
  const pools = w.level.whirlpools ?? [];
  for (let i = 0; i < pools.length; i++) {
    w.whirlpools[i]!.ay = (pools[i]!.a.y + 0.5) * CELL + ty;
    w.whirlpools[i]!.by = (pools[i]!.b.y + 0.5) * CELL + ty;
  }
  if (w.rescue) w.rescue.y = w.rescue.y0 + ty;
  for (const p of w.pearls) p.y = (p.cy + 0.5) * CELL + ty;
  if (w.dailyPearl) w.dailyPearl.y = (w.dailyPearl.cy + 0.5) * CELL + ty;
}

export function movePieces(w: World): void {
  if (w.goal === 'tide') moveTideAnchors(w);
  moveFloes(w);
  moveShutters(w);
  moveSpinners(w);
  moveShield(w);
  if (w.crabs.length > 0) moveCrabs(w);
}
