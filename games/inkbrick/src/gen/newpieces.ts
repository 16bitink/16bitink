/**
 * The four pieces of 2026-11-18 on a generated board: bumpers in the open water, levers working
 * flip walls over the way in, hidden bricks (a few of them secret x3 shells) in the field, and a
 * crab walking under the bricks. Also the `layers` floors' gap variants (trap doors, flip walls).
 */
import { CRAB_H, CRAB_W } from '../sim/types';
import { minus } from '../sim/kit';
import { randInt, type Rng } from '../sim/rng';
import { CELL, COLS, type BrickDef, type LevelDef } from '../sim/types';
import type { Rect, Shell } from './shells';

const CENTRE_X = (COLS * CELL) / 2;
/** Rows of open water the bumpers and crabs use (under the field, over the raft's reach). */
const WATER_ROWS: readonly [number, number] = [42, 47];
export const BUMPER_R: readonly [number, number] = [16, 22];
const HIDDEN: readonly [number, number] = [6, 10];
const HIDDEN_X3 = 2;
export const CRAB_SPEED: readonly [number, number] = [3, 5];

export interface PieceExtras {
  bumpers?: LevelDef['bumpers'];
  flips?: LevelDef['flips'];
  crabs?: LevelDef['crabs'];
  shutters?: LevelDef['shutters'];
}

function lowestRow(bricks: readonly BrickDef[]): number {
  return Math.max(0, ...bricks.map((b) => b.y + b.h - 1));
}

/** Two bumpers mirrored about the middle (open: a field of four), the bricks under them cleared. */
export function addBumpers(bricks: BrickDef[], rng: Rng, many: boolean): { bricks: BrickDef[]; extras: PieceExtras } {
  const r = randInt(rng, BUMPER_R[0], BUMPER_R[1]);
  const row = Math.max(WATER_ROWS[0], Math.min(WATER_ROWS[1], lowestRow(bricks.filter((b) => b.y < 40)) + 4));
  const pairs = many ? 2 : 1;
  const bumpers: { x: number; y: number; r: number }[] = [];
  for (let p = 0; p < pairs; p++) {
    const dx = randInt(rng, 70, 200);
    const y = (row + 0.5 + p * 3) * CELL - (p === 0 ? 0 : 2 * CELL);
    bumpers.push({ x: CENTRE_X - dx, y, r }, { x: CENTRE_X + dx, y, r });
  }
  const clear = bumpers.map((b) => ({ x: Math.floor((b.x - b.r) / CELL) - 1, y: Math.floor((b.y - b.r) / CELL) - 1, w: Math.ceil((2 * b.r) / CELL) + 2, h: Math.ceil((2 * b.r) / CELL) + 2, kind: 'stone' as const }));
  return { bricks: minus(bricks, clear), extras: { bumpers } };
}

/** A few field bricks hidden until their first hit; two of them secret x3 shells. */
export function addHidden(bricks: BrickDef[], rng: Rng): BrickDef[] {
  const field = bricks.map((b, i) => ({ b, i })).filter(({ b }) => (b.kind === 'soft' || b.kind === 'tough') && !b.armour && !b.floe);
  const want = randInt(rng, HIDDEN[0], HIDDEN[1]);
  const chosen = new Map<number, boolean>();
  for (let n = 0; n < want * 4 && chosen.size < Math.min(want, field.length); n++) {
    const { i } = field[Math.floor(rng() * field.length)]!;
    if (!chosen.has(i)) chosen.set(i, chosen.size < HIDDEN_X3);
  }
  return bricks.map((b, i) => {
    const x3 = chosen.get(i);
    if (x3 === undefined) return b;
    return x3 ? { x: b.x, y: b.y, w: b.w, h: b.h, kind: 'x3' as const, hidden: true } : { ...b, hidden: true };
  });
}

/** A crab walking the open water under the bricks, its track cleared. */
export function addCrab(bricks: BrickDef[], rng: Rng): { bricks: BrickDef[]; extras: PieceExtras } {
  const y = randInt(rng, WATER_ROWS[0] + 2, WATER_ROWS[1]);
  const x0 = randInt(rng, 1, 5);
  const x1 = COLS - CRAB_W - x0;
  const track: BrickDef = { x: x0, y, w: x1 + CRAB_W - x0, h: CRAB_H, kind: 'stone' };
  return { bricks: minus(bricks, [track]), extras: { crabs: [{ y, x0, x1, speed: randInt(rng, CRAB_SPEED[0], CRAB_SPEED[1]), phase: Math.round(rng() * 100) / 100 }] } };
}

/** A lever low by one side wall (never over the launch spot), like a key, on rows y0..y1. */
function leverBrick(rng: Rng, link: string, y0: number, y1: number): BrickDef {
  return { x: rng() < 0.5 ? randInt(rng, 1, 4) : randInt(rng, 29, 32), y: randInt(rng, y0, y1), w: 3, h: 1, kind: 'lever', link };
}

/**
 * Flip walls over the way in, shut at the start, and a lever outside that opens them (layers: one
 * wall over every floor's gap, and a second lever in the first corridor, which shuts them again:
 * a stone that pulls it is trapped in the corridor until it pulls it once more).
 */
export function addLevers(bricks: BrickDef[], shell: Shell, rng: Rng): { bricks: BrickDef[]; extras: PieceExtras } {
  const link = 'a';
  const gaps: readonly Rect[] = shell.gaps ?? (shell.window ? [shell.window] : []);
  if (gaps.length === 0) return { bricks, extras: {} };
  const flips = gaps.map((g) => ({ x: g.x, y: g.y, w: g.w, h: g.h, link, on: true }));
  // Under a layers board's bottom floor (in the open water), else where a vault's key would go.
  const low = shell.gaps ? shell.gaps[0]!.y : 0;
  const levers = [shell.gaps ? leverBrick(rng, link, low + 3, Math.min(48, low + 6)) : leverBrick(rng, link, 36, 42)];
  if (shell.gaps && shell.fills[0]) {
    const band = shell.fills[0];
    const lx = gaps[0]!.x < COLS / 2 ? COLS - 7 : 4;
    levers.push({ x: lx, y: band.y, w: 3, h: 1, kind: 'lever', link });
  }
  const blockers = [...levers, ...flips.map((f) => ({ ...f, kind: 'stone' as const }))];
  return { bricks: [...minus(bricks, blockers), ...levers], extras: { flips } };
}

/** layers with trap doors: a shutter on every floor's gap, staggered so the floors open in turn. */
export function addTrapDoors(shell: Shell, rng: Rng): PieceExtras {
  const open = 1.6 + Math.round(rng() * 10) / 10;
  const closed = 1.2 + Math.round(rng() * 10) / 10;
  return { shutters: (shell.gaps ?? []).map((g, i) => ({ x: g.x, y: g.y, w: g.w, h: g.h, open, closed, phase: (i * (open + closed)) / 3 })) };
}
