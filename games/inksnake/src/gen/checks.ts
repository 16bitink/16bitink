/**
 * The cheap checks every candidate passes before the bot plays it
 * (docs/inksnake-daily.md "Generator" step 4): the validator, a clear
 * start, the board reachable from the start, cover and nests off the
 * solids, no long empty floor, and in the canopy, crowns a glide apart.
 */
import { parseLevel } from '../level/validate';
import { BOARD, type LevelDef, type SolidDef } from '../level/types';
import { solidGap } from './geometry';

export interface CheckResult {
  readonly ok: boolean;
  readonly why?: string;
}

const CELL = 20;
/** A snake's half width and a little: closer than this to a solid, a cell is blocked. */
const BODY = 10;
const REACH_SHARE = 0.85;
/** Floor further than this from anything (solid, cover, zone edge) is empty walking. */
const EMPTY_PX = 230;
/** Campaign boards run up to 21% (p90 13%): a pattern may have no more than 15%. */
const EMPTY_SHARE = 0.15;
const GLIDE_GAP = 135;

const fail = (why: string): CheckResult => ({ ok: false, why });

function nearSolid(x: number, y: number, solids: readonly SolidDef[], d: number): boolean {
  return solids.some((s) => solidGap({ x, y }, s) < d);
}

/** Share of open cells reachable from the start, 4-way through open cells. */
function reachable(level: LevelDef): number {
  const cols = Math.ceil(BOARD.w / CELL);
  const rows = Math.ceil(BOARD.h / CELL);
  const solids = level.solids ?? [];
  const open = new Uint8Array(cols * rows);
  let total = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!nearSolid((c + 0.5) * CELL, (r + 0.5) * CELL, solids, BODY)) {
      open[r * cols + c] = 1;
      total++;
    }
  }
  const s = Math.min(cols - 1, Math.floor(level.start.x / CELL)) + Math.min(rows - 1, Math.floor(level.start.y / CELL)) * cols;
  if (!open[s]) return 0;
  const seen = new Uint8Array(cols * rows);
  const stack = [s];
  seen[s] = 1;
  let n = 0;
  while (stack.length) {
    const i = stack.pop()!;
    n++;
    const c = i % cols;
    for (const j of [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, i - cols, i + cols]) {
      if (j >= 0 && j < open.length && open[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return n / Math.max(1, total);
}

/** Share of the board further than EMPTY_PX from any feature. */
export function emptyShare(level: LevelDef): number {
  const feats: { x: number; y: number; r: number }[] = [
    ...(level.solids ?? []).map((s) => (s.kind === 'circle' ? { x: s.x, y: s.y, r: s.r } : { x: s.x + s.w / 2, y: s.y + s.h / 2, r: Math.min(s.w, s.h) / 2 })),
    ...(level.cover ?? []),
    ...(level.zones ?? []).flatMap((z) => (z.shape === 'circle' && z.r < 400 ? [{ x: z.x, y: z.y, r: z.r }] : [])),
  ];
  let empty = 0;
  let all = 0;
  for (let y = CELL; y < BOARD.h; y += CELL * 2) for (let x = CELL; x < BOARD.w; x += CELL * 2) {
    all++;
    if (feats.every((f) => Math.hypot(f.x - x, f.y - y) - f.r > EMPTY_PX)) empty++;
  }
  return empty / all;
}

/** The canopy: the start in a crown, every crown a glide from another, all of them joined. */
function canopyOk(level: LevelDef): boolean {
  const crowns = (level.zones ?? []).flatMap((z) => (z.kind === 'tree' && z.shape === 'circle' ? [z] : []));
  if (crowns.length < 5) return false;
  if (!crowns.some((c) => Math.hypot(c.x - level.start.x, c.y - level.start.y) < c.r - 10)) return false;
  const gap = (a: (typeof crowns)[number], b: (typeof crowns)[number]) => Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop()!;
    crowns.forEach((c, j) => {
      if (!seen.has(j) && gap(crowns[i]!, c) <= GLIDE_GAP) {
        seen.add(j);
        stack.push(j);
      }
    });
  }
  return seen.size === crowns.length;
}

/** `pattern`: a generated board (remixes keep their campaign board's floor, so the empty-floor limit is for patterns). */
export function cheapCheck(level: LevelDef, pattern = true): CheckResult {
  try {
    parseLevel(JSON.parse(JSON.stringify(level)));
  } catch (e) {
    return fail(`validator: ${e instanceof Error ? e.message : String(e)}`);
  }
  const solids = level.solids ?? [];
  const { start, heading } = level;
  if (start.x < 40 || start.y < 40 || start.x > BOARD.w - 40 || start.y > BOARD.h - 40) return fail('start at the edge');
  if (nearSolid(start.x, start.y, solids, 14)) return fail('start on a solid');
  for (const d of [30, 55, 80]) {
    if (nearSolid(start.x + Math.cos(heading) * d, start.y + Math.sin(heading) * d, solids, 14)) return fail('solid ahead of the start');
  }
  if ((level.cover ?? []).some((c) => nearSolid(c.x, c.y, solids, 0))) return fail('cover on a solid');
  if ([...(level.nests ?? []), ...(level.spots ?? [])].some((p) => nearSolid(p.x, p.y, solids, 4))) return fail('nest or hole in a solid');
  if (reachable(level) < REACH_SHARE) return fail('board walled off');
  if (level.place === 'rainforest' && !canopyOk(level)) return fail('crowns too far apart');
  if (level.place !== 'rainforest' && level.place !== 'reef' && level.place !== 'flooded' && pattern && emptyShare(level) > EMPTY_SHARE) return fail('empty floor');
  return { ok: true };
}
