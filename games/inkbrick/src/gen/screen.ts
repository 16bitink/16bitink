/**
 * The launch screen: the stone starts at x = 270, so any way in that a shot from there finds is a
 * free break-in for a skilled player in the first second. Driftwood (3 hits) is laid across those
 * shots low in the open water, so the first shot breaks something and the way in has to be found.
 */
import { BALL_R, LAUNCH_X, MAX_BOUNCE_DEG, PADDLE_Y } from '../sim/constants';
import { minus } from '../sim/kit';
import { hasGates, launchWindow, traceInside, traceWorld } from '../sim/trace';
import { BOARD_W, CELL, COLS, type BrickDef, type LevelDef } from '../sim/types';

/** Rows the screen may use, tried in order (each pass covers the shots still free). */
// Row 50 last: under a whirlpool low in the open water (rows 46-49).
const SCREEN_ROWS: readonly number[] = [41, 38, 44, 50];
/**
 * A layers board's way in is its bottom floor's gap (row 36-38): driftwood right under it blocks
 * every shot at the gap, not just the launch spot's, so its screen goes low, near the raft.
 */
export const LOW_SCREEN_ROWS: readonly number[] = [50, 47, 44];
const SCREEN_HP = 3;
const SCREEN_DIRECTIONS = 240;
/** Most of a launch fan a level may leave open (under the skilled bot's aim noise). */
export const LAUNCH_MAX = 0.01;

/** Where a straight shot from the launch spot at `deg` crosses row y (px), side-wall bounces folded in. */
function crossX(deg: number, y: number): number {
  const span = BOARD_W - 2 * BALL_R;
  let x = LAUNCH_X - BALL_R + Math.tan((deg * Math.PI) / 180) * (PADDLE_Y - BALL_R - y);
  x = ((x % (2 * span)) + 2 * span) % (2 * span);
  if (x > span) x = 2 * span - x;
  return x + BALL_R;
}

function freeShots(level: LevelDef): number[] {
  const w = traceWorld(level);
  const keys = hasGates(level);
  const out: number[] = [];
  for (let k = 0; k < SCREEN_DIRECTIONS; k++) {
    const deg = -MAX_BOUNCE_DEG + (2 * MAX_BOUNCE_DEG * (k + 0.5)) / SCREEN_DIRECTIONS;
    if (traceInside(w, LAUNCH_X, deg, keys)) out.push(deg);
  }
  return out;
}

/** The level with driftwood across every free launch shot (at most a few passes), never over the `keep` cells (pearls, the friend). */
export function screenLaunch(level: LevelDef, keep: readonly { readonly x: number; readonly y: number }[] = [], rows: readonly number[] = SCREEN_ROWS): LevelDef {
  let out = level;
  for (const row of rows) {
    if (launchWindow(out, LAUNCH_X) <= LAUNCH_MAX) return out;
    const y = (row + 0.5) * CELL;
    const starts = new Set<number>();
    for (const deg of freeShots(out)) {
      const c = Math.floor(crossX(deg, y) / CELL);
      starts.add(Math.max(0, Math.min(COLS - 3, c - 1)));
    }
    const screen: BrickDef[] = [];
    // Never over a wall, a key, gate or lever, armour, a flip wall or a shutter (only plain bricks give way).
    const fixed = [
      ...out.bricks.filter((b) => (b.kind !== 'soft' && b.kind !== 'tough') || b.armour || b.floe !== undefined),
      ...(out.flips ?? []).map((f) => ({ ...f, kind: 'stone' as const })), ...(out.shutters ?? []).map((f) => ({ ...f, kind: 'stone' as const })),
    ];
    const blocked = (x: number) => fixed.some((b) => b.y <= row && row < b.y + b.h && x < b.x + b.w && b.x < x + 3);
    for (const x of [...starts].sort((a, b) => a - b)) {
      if (blocked(x)) continue;
      if (screen.some((b) => x < b.x + b.w)) continue;
      if (keep.some((k) => k.y === row && k.x >= x && k.x < x + 3)) continue;
      screen.push({ x, y: row, w: 3, h: 1, kind: 'tough', hp: SCREEN_HP });
    }
    out = { ...out, bricks: [...minus(out.bricks, screen), ...screen] };
  }
  return out;
}
