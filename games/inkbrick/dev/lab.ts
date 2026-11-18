/**
 * The InkBrick level lab (`npm run lab -- <level id | number | YYYY-MM-DD> [--runs N] [--file path.ts] [--quiet]`):
 * the board, the aim window and the bots' numbers against the targets, PASS/MISS each, in one call.
 */
import { inkbrickDaily } from '../content/daily';
import { INKBRICK_PAID_LEVELS } from '../content/paid';
import { CH1_LEVELS } from '../src/level/ch1/index';
import { ASCII_LEGEND, asciiBoard } from '../src/sim/ascii';
import { formatValue, judge, measureLevel, type RunResult } from '../src/sim/measure';
import { dailyTargets, levelTargets } from '../src/sim/targets';
import type { LevelDef } from '../src/sim/types';
import { checkLevel } from '../src/level/validate';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isLevel(v: unknown): v is LevelDef {
  return typeof v === 'object' && v !== null && Array.isArray((v as LevelDef).bricks) && typeof (v as LevelDef).id === 'string';
}

export async function findLevel(query: string, file?: string, preloaded?: Record<string, unknown>): Promise<LevelDef> {
  if (file) {
    const mod = preloaded ?? ((await import(/* @vite-ignore */ file)) as Record<string, unknown>);
    const found = Object.values(mod).find(isLevel);
    if (!found) throw new Error(`no LevelDef export in ${file}`);
    return found;
  }
  if (DATE.test(query)) {
    const daily = inkbrickDaily(query);
    if (!daily) throw new Error(`no frozen daily for ${query} (npm run gen -- --from ${query} --days 1)`);
    return daily;
  }
  const all = [...CH1_LEVELS, ...INKBRICK_PAID_LEVELS];
  const n = Number(query);
  const found = all.find((l) => l.id === query || (Number.isInteger(n) && n > 0 && l.number === n));
  if (!found) throw new Error(`no level '${query}'. Known: ${all.map((l) => `${l.number}:${l.id}`).join(', ') || 'none'}`);
  return found;
}

/** The goal's own column: share broken (Few Stones), floods (Rising Tide), daily pearl finds. */
function goalCell(level: LevelDef, of: readonly RunResult[]): string {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const parts: string[] = [];
  if (level.goal === 'stones') parts.push(`share ${(avg(of.map((r) => r.share)) * 100).toFixed(0)}%`);
  if (level.goal === 'tide') parts.push(`floods ${avg(of.map((r) => r.floods)).toFixed(1)}`);
  if (level.dailyPearl) parts.push(`$ ${of.filter((r) => r.pearlFound).length}/${of.length}`);
  return parts.join(' ');
}

function botRow(name: string, runs: readonly RunResult[], level: LevelDef): string {
  const of = runs.filter((r) => r.bot === name);
  if (of.length === 0) return '';
  const cleared = of.filter((r) => r.cleared);
  const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '-');
  const bi = of.filter((r) => r.breakInAt >= 0).map((r) => r.breakInAt);
  return [
    name.padEnd(8), `${cleared.length}/${of.length}`.padStart(6), avg(of.map((r) => r.heartsLost)).padStart(7),
    `${avg(bi)}s (${bi.length})`.padStart(12), `${avg(cleared.map((r) => r.time))}s`.padStart(9),
    avg(of.map((r) => r.drought)).padStart(8), String(Math.max(...of.map((r) => r.peakBalls))).padStart(6),
    goalCell(level, of),
  ].join(' ');
}

const GOAL_DONE: Readonly<Record<string, string>> = { clear: 'clear', rescue: 'rescue', pearls: 'pearls', stones: 'need', tide: 'clear' };

/** The goal, the rule and the new pieces, one line. */
function goalLine(level: LevelDef): string {
  const goal = level.goal ?? 'clear';
  const what =
    goal === 'rescue' && level.rescue ? `rescue the ${level.rescue.who} at ${level.rescue.x},${level.rescue.y}`
      : goal === 'pearls' ? `${level.pearls?.length ?? 0} pearls`
        : goal === 'stones' ? `Few Stones: ${level.stones} stones, need ${Math.round((level.need ?? 0) * 100)}%`
          : goal === 'tide' && level.tide ? `Rising Tide: a row every ${level.tide.every}s, line row ${level.tide.line}` : 'clear';
  const rule = level.rule ? `${level.rule}${level.rule === 'current' ? (level.ruleDir === -1 ? ' (left)' : ' (right)') : ''}` : 'none';
  const pieces = [
    level.bumpers?.length ? `${level.bumpers.length} bumpers` : '', level.flips?.length ? `${level.flips.length} flip walls` : '',
    level.crabs?.length ? `${level.crabs.length} crabs` : '', level.bricks.some((b) => b.hidden) ? `${level.bricks.filter((b) => b.hidden).length} hidden` : '',
    level.bricks.some((b) => b.armour) ? `${level.bricks.filter((b) => b.armour).length} armour` : '',
    level.dailyPearl ? `daily pearl at ${level.dailyPearl.x},${level.dailyPearl.y}` : '',
    level.tomorrow ? `tomorrow ${level.tomorrow.goal} + ${level.tomorrow.rule}` : '',
  ].filter(Boolean);
  return `goal ${what} · rule ${rule}${pieces.length ? ` · ${pieces.join(' · ')}` : ''}`;
}

export async function main(args: readonly string[], fileModule?: Record<string, unknown>): Promise<string> {
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const query = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--') && args[i - 1] !== '--quiet')) ?? '';
  const file = flag('--file');
  if (!query && !file) return 'usage: npm run lab -- <level id | number | YYYY-MM-DD> [--runs 20] [--file path.ts] [--quiet]';
  const level = await findLevel(query, file, fileModule);
  // The same check the game runs on the paid payload: one bad level there stops every paid level loading.
  const checked = checkLevel(level);
  if (!checked.ok) return `INVALID ${checked.problem} (the game would refuse to load the paid levels)`;
  const runs = Number(flag('--runs') ?? 20);
  const t0 = performance.now();
  const m = measureLevel(level, { runs });
  const targets = DATE.test(query) ? dailyTargets(weekday(query), level) : levelTargets(level);
  const verdicts = judge(m.metrics, targets);
  const out: string[] = [];
  const tag = level.number > 0 ? `L${level.number}` : query;
  out.push(`${tag} ${level.id} "${level.name}" · layout ${level.layout ?? '?'} · ${level.bricks.length} bricks · par ${level.par}s`);
  out.push(goalLine(level));
  if (!args.includes('--quiet')) out.push(asciiBoard(level), ASCII_LEGEND, '');
  out.push(`bot      ${GOAL_DONE[level.goal ?? 'clear']!.padStart(6)}  hearts  break-in(n)  ${(level.goal === 'rescue' || level.goal === 'pearls' ? 'done' : 'clear').padStart(6)}  drought  balls  goal`);
  for (const b of ['novice', 'decent', 'skilled']) out.push(botRow(b, m.runs, level));
  out.push('', 'target             value      want            verdict');
  for (const v of verdicts) {
    const want = `${formatValue(v.target, v.target.lo)}–${formatValue(v.target, v.target.hi)}`;
    out.push(`${v.target.label.padEnd(18)} ${formatValue(v.target, v.value).padStart(7)}    ${want.padEnd(15)} ${v.pass === null ? 'n/a' : v.pass ? 'PASS' : 'MISS'}`);
  }
  const judged = verdicts.filter((v) => v.pass !== null);
  const misses = judged.filter((v) => !v.pass).map((v) => `${v.target.label} ${formatValue(v.target, v.value)}`);
  out.push('', `SUMMARY ${tag} ${level.layout ?? ''}: ${judged.length - misses.length}/${judged.length} PASS${misses.length ? ` · MISS ${misses.join(', ')}` : ''} · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  return out.join('\n');
}
