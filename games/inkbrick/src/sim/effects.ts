/** What breaking things does: x3 splits, keg blasts and chains, ice waves, keys opening gates, pickups. */
import {
  FIRE_SECONDS, ICE_DELAY, KEG_CHAIN_DELAY, KEG_RADIUS, MAX_BALLS, PADDLE_H, PADDLE_Y,
  PICKUP_FALL, PICKUP_H, PICKUP_W, PLUS3_SPREAD_DEG, SPLIT_DEG, WIDE_SECONDS,
} from './constants';
import { cellIndex, forEachCell } from './grid';
import { cosDeg, sinDeg } from './trig';
import { CELL, COLS, ROWS, STEP } from './types';
import { newBall, type Ball, type Brick, type World } from './world';

function clearCells(w: World, b: Brick): void {
  const grid = w.layers[b.layer]!.grid;
  forEachCell(b.def, (cx, cy) => {
    grid[cellIndex(cx, cy)] = -1;
  });
}

function centre(b: Brick): { x: number; y: number } {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Removes the brick; `effects` false for the crumble (no blasts, no drops). */
export function breakBrick(w: World, i: number, ball: Ball | null, effects = true): void {
  const b = w.bricks[i]!;
  if (!b.alive) return;
  b.alive = false;
  b.hp = 0;
  b.revealed = true;
  clearCells(w, b);
  const c = centre(b);
  w.events.push({ type: 'break', brick: i, kind: b.kind, x: c.x, y: c.y });
  if (!b.breakable) return;
  w.breakableLeft--;
  w.brokenShare = 1 - w.breakableLeft / w.breakableTotal;
  w.lastBreakAt = w.elapsed;
  if (!effects) return;
  switch (b.kind) {
    case 'x3':
      if (ball) splitBall(w, ball);
      break;
    case 'keg':
      blast(w, b);
      break;
    case 'pickup':
      w.pickups.push({ kind: b.def.drop ?? 'wide', x: c.x, y: c.y });
      break;
    case 'ice':
      crackNeighbours(w, i);
      break;
    case 'key':
      openGates(w, b.def.link);
      break;
    default:
      break;
  }
}

/** A ball's hit: one point of damage (fire breaks soft and tough outright). */
export function hitBrick(w: World, i: number, ball: Ball): void {
  const b = w.bricks[i]!;
  if (!b.alive || !b.breakable) return;
  b.hp--;
  if (b.hp <= 0) breakBrick(w, i, ball);
  else {
    const c = centre(b);
    w.events.push({ type: 'hit', brick: i, x: c.x, y: c.y });
    if (!b.revealed) {
      b.revealed = true;
      w.events.push({ type: 'reveal', brick: i });
    }
  }
}

function rotated(ball: Ball, deg: number): Ball {
  const c = cosDeg(deg);
  const s = sinDeg(deg);
  return newBall(ball.x, ball.y, ball.vx * c - ball.vy * s, ball.vx * s + ball.vy * c);
}

export function splitBall(w: World, ball: Ball): void {
  const before = w.balls.length;
  for (const deg of [-SPLIT_DEG, SPLIT_DEG]) {
    if (w.balls.length >= MAX_BALLS) break;
    w.balls.push(rotated(ball, deg));
  }
  if (w.balls.length > before) w.events.push({ type: 'split', balls: w.balls.length });
}

function schedule(w: World, i: number, delay: number): void {
  if (w.scheduled[i]) return;
  w.scheduled[i] = 1;
  w.delayed.push({ at: w.time + delay, brick: i });
}

function blast(w: World, keg: Brick): void {
  const { x, y } = centre(keg);
  w.events.push({ type: 'blast', x, y });
  w.stampId++;
  const hits: number[] = [];
  for (const layer of w.layers) {
    const cx0 = Math.max(0, Math.floor((x - KEG_RADIUS - layer.ox) / CELL));
    const cx1 = Math.min(COLS - 1, Math.floor((x + KEG_RADIUS - layer.ox) / CELL));
    const cy0 = Math.max(0, Math.floor((y - KEG_RADIUS - layer.oy) / CELL));
    const cy1 = Math.min(ROWS - 1, Math.floor((y + KEG_RADIUS - layer.oy) / CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const j = layer.grid[cellIndex(cx, cy)]!;
        if (j < 0 || w.stamp[j] === w.stampId) continue;
        const qx = Math.max(cx * CELL + layer.ox, Math.min(x, (cx + 1) * CELL + layer.ox));
        const qy = Math.max(cy * CELL + layer.oy, Math.min(y, (cy + 1) * CELL + layer.oy));
        if ((qx - x) * (qx - x) + (qy - y) * (qy - y) > KEG_RADIUS * KEG_RADIUS) continue;
        w.stamp[j] = w.stampId;
        hits.push(j);
      }
    }
  }
  for (const j of hits.sort((p, q) => p - q)) {
    const b = w.bricks[j]!;
    if (!b.alive || !b.breakable) continue;
    if (b.kind === 'keg') schedule(w, j, KEG_CHAIN_DELAY);
    else breakBrick(w, j, null);
  }
}

function crackNeighbours(w: World, i: number): void {
  for (const j of w.iceAdj[i]!) {
    const b = w.bricks[j]!;
    if (!b.alive || b.cracked) continue;
    b.cracked = true;
    schedule(w, j, ICE_DELAY);
  }
}

function openGates(w: World, link: string | undefined): void {
  if (!link) return;
  for (const g of w.gatesOf.get(link) ?? []) breakBrick(w, g, null);
}

/** Ice shatters and keg chains that are due. */
export function runDelayed(w: World): void {
  if (w.delayed.length === 0) return;
  const due = w.delayed.filter((d) => d.at <= w.time + 1e-9);
  if (due.length === 0) return;
  w.delayed = w.delayed.filter((d) => d.at > w.time + 1e-9);
  for (const d of due) breakBrick(w, d.brick, null);
}

function catchPickup(w: World, kind: 'wide' | 'plus3' | 'fireball'): void {
  w.events.push({ type: 'pickup', kind });
  if (kind === 'wide') w.wideLeft = WIDE_SECONDS;
  else if (kind === 'fireball') w.fireLeft = FIRE_SECONDS;
  else {
    const x = w.paddle.x;
    const y = PADDLE_Y - w.ballRadius;
    for (const deg of [-PLUS3_SPREAD_DEG, 0, PLUS3_SPREAD_DEG]) {
      if (w.balls.length >= MAX_BALLS) break;
      w.balls.push(newBall(x, y, w.speed * sinDeg(deg), -w.speed * cosDeg(deg)));
    }
  }
}

/** Falling pickups: caught by the raft, or gone off the bottom. Returns true if +3 was caught. */
export function movePickups(w: World): boolean {
  if (w.pickups.length === 0) return false;
  let plus3 = false;
  const keep = [];
  for (const p of w.pickups) {
    p.y += PICKUP_FALL * STEP;
    const caught = p.y + PICKUP_H / 2 >= PADDLE_Y && p.y - PICKUP_H / 2 <= PADDLE_Y + PADDLE_H
      && Math.abs(p.x - w.paddle.x) <= w.paddle.width / 2 + PICKUP_W / 2;
    if (caught) {
      catchPickup(w, p.kind);
      plus3 = plus3 || p.kind === 'plus3';
    } else if (p.y - PICKUP_H / 2 <= ROWS * CELL) keep.push(p);
  }
  w.pickups = keep;
  return plus3;
}
