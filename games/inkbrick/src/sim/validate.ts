/** Level checks: a bad layout throws while loading, listing every problem. */
import { BRICK_ROW_MAX, BRICK_ROW_MIN, MAX_BRICKS } from './constants';
import { COLS, ROWS, type LevelDef } from './types';

const MAX_LISTED = 12;

export class LevelError extends Error {
  constructor(readonly levelId: string, readonly problems: readonly string[]) {
    super(`level ${levelId}:\n  ${problems.slice(0, MAX_LISTED).join('\n  ')}${problems.length > MAX_LISTED ? `\n  ...and ${problems.length - MAX_LISTED} more` : ''}`);
    this.name = 'LevelError';
  }
}

function isCellInt(n: number): boolean {
  return Number.isInteger(n);
}

export function levelProblems(level: LevelDef): string[] {
  const problems: string[] = [];
  if (level.bricks.length > MAX_BRICKS) problems.push(`${level.bricks.length} bricks (budget ${MAX_BRICKS})`);
  const floeIds = new Set((level.floes ?? []).map((f) => f.id));
  const owner = new Map<string, number>();
  const links = new Map<string, { key: number; gate: number }>();
  level.bricks.forEach((b, i) => {
    const where = `brick ${i} (${b.kind} at ${b.x},${b.y})`;
    if (![b.x, b.y, b.w, b.h].every(isCellInt) || b.w < 1 || b.h < 1) problems.push(`${where}: x/y/w/h must be whole cells, w/h >= 1`);
    if (b.x < 0 || b.x + b.w > COLS) problems.push(`${where}: outside columns 0-${COLS - 1}`);
    if (b.y < BRICK_ROW_MIN || b.y + b.h - 1 > BRICK_ROW_MAX) problems.push(`${where}: outside rows ${BRICK_ROW_MIN}-${BRICK_ROW_MAX}`);
    if (b.floe !== undefined && !floeIds.has(b.floe)) problems.push(`${where}: unknown floe '${b.floe}'`);
    if ((b.kind === 'key' || b.kind === 'gate') && !b.link) problems.push(`${where}: ${b.kind} needs a link`);
    if (b.link) {
      const l = links.get(b.link) ?? { key: 0, gate: 0 };
      links.set(b.link, b.kind === 'key' ? { ...l, key: l.key + 1 } : b.kind === 'gate' ? { ...l, gate: l.gate + 1 } : l);
    }
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        const k = `${b.floe ?? ''}:${x},${y}`;
        const other = owner.get(k);
        if (other !== undefined) problems.push(`${where}: overlaps brick ${other} at ${x},${y}`);
        else owner.set(k, i);
      }
    }
  });
  for (const [link, n] of links) {
    if (n.key === 0 || n.gate === 0) problems.push(`link '${link}' needs a key and a gate`);
  }
  if (!(level.par > 0)) problems.push('par must be > 0 seconds');
  if (level.boss && (level.boss.hits < 1 || level.boss.speed < 0)) problems.push('boss needs hits >= 1 and speed >= 0');
  if (level.bricks.length === 0 && !level.boss) problems.push('no bricks');
  if (ROWS < BRICK_ROW_MAX) problems.push('grid too small');
  return problems;
}

export function assertLevel(level: LevelDef): void {
  const problems = levelProblems(level);
  if (problems.length > 0) throw new LevelError(level.id, problems);
}
