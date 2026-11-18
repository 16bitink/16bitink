/** The generator's cheap checks: valid, in budget, every breakable brick reachable, an aim window. */
import { MAX_BRICKS } from '../sim/constants';
import { cellIndex, forEachCell } from '../sim/grid';
import { LAUNCH_X } from '../sim/constants';
import { aimWindow, launchWindow } from '../sim/trace';
import { LAUNCH_MAX } from './screen';
import { COLS, ROWS, type LevelDef } from '../sim/types';
import { levelProblems } from '../sim/validate';

/** A ball-sized flood from the raft's area through everything but still stone. */
export function unreachableBricks(level: LevelDef): number {
  const blocked = new Uint8Array(COLS * ROWS);
  for (const b of level.bricks) if (b.kind === 'stone' && b.floe === undefined) forEachCell(b, (x, y) => (blocked[cellIndex(x, y)] = 1));
  const seen = new Uint8Array(COLS * ROWS);
  const stack: number[] = [];
  for (let x = 0; x < COLS; x++) {
    const c = cellIndex(x, ROWS - 1);
    seen[c] = 1;
    stack.push(c);
  }
  while (stack.length > 0) {
    const c = stack.pop()!;
    const x = c % COLS;
    const y = (c - x) / COLS;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const n = cellIndex(nx, ny);
      if (seen[n] || blocked[n]) continue;
      seen[n] = 1;
      stack.push(n);
    }
  }
  let missing = 0;
  for (const b of level.bricks) {
    if (b.kind === 'stone' || b.kind === 'gate' || b.floe !== undefined) continue;
    let any = false;
    forEachCell(b, (x, y) => (any = any || seen[cellIndex(x, y)] === 1));
    if (!any) missing++;
  }
  return missing;
}

export interface CheapResult {
  readonly ok: boolean;
  readonly reason: string;
  readonly aim: number;
}

export const CHEAP_DIRECTIONS = 360;

/** The design's floor for every level: under 2% of launch directions reach the hole, it's rejected. */
export const AIM_FLOOR = 0.02;
const AIM_CEILING_SLACK = 1.6;

/** `launch: false` (the generator's last resort) skips the launch-window check. */
export function cheapCheck(level: LevelDef, aimLo: number, aimHi: number, launch = true): CheapResult {
  const problems = levelProblems(level);
  if (problems.length > 0) return { ok: false, reason: problems[0]!, aim: 0 };
  if (level.bricks.length > MAX_BRICKS) return { ok: false, reason: 'over budget', aim: 0 };
  const missing = unreachableBricks(level);
  if (missing > 0) return { ok: false, reason: `${missing} bricks unreachable`, aim: 0 };
  const aim = aimWindow(level, CHEAP_DIRECTIONS);
  // Hard floor: the cheap trace has fewer directions, so it must clear 2% outright.
  const floor = Math.max(AIM_FLOOR, aimLo * 0.75);
  if (aim < floor || aim > aimHi * AIM_CEILING_SLACK) return { ok: false, reason: `aim ${(aim * 100).toFixed(1)}%`, aim };
  // No free way in from the launch spot (a skilled player would be inside in the first second).
  const free = launch ? launchWindow(level, LAUNCH_X) : 0;
  if (free > LAUNCH_MAX) return { ok: false, reason: `launch window ${(free * 100).toFixed(1)}%`, aim };
  return { ok: true, reason: '', aim };
}
