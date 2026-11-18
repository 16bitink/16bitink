/**
 * The level agents' starting point (`npm run gen -- --propose --chapter N --number K --layout L
 * [--twist T] --out path.ts`): compose candidates from the generator's parts using only the pieces
 * the design allows up to chapter N, score them against level K's own targets (levels 1-3 easier,
 * boss levels as the design says), and return the best as a ready level file with its lab summary.
 */
import { distance, formatValue, judge, measureLevel, type Metrics } from '../sim/measure';
import { levelTargets } from '../sim/targets';
import type { BrickDef, LevelDef } from '../sim/types';
import type { Layout, Twist } from './calendar';
import { cheapCheck } from './checks';
import { compose } from './compose';
import { PICTURES } from './pictures';
import type { DayPlan } from './plan';

/** The design's chapter table: what each chapter adds (layouts and twists). */
const CHAPTER_LAYOUTS: readonly (readonly Layout[])[] = [
  ['vault', 'wall', 'core', 'fuse'], ['hourglass', 'picture'], ['guarded', 'maze'], [], ['nested'],
];
const CHAPTER_TWISTS: readonly (readonly Twist[])[] = [['none'], ['ice', 'floe'], ['keyGate', 'shutter'], ['whirlpool', 'spinner', 'dark'], []];

export function allowedLayouts(chapter: number): Layout[] {
  return CHAPTER_LAYOUTS.slice(0, chapter).flat();
}
export function allowedTwists(chapter: number): Twist[] {
  return CHAPTER_TWISTS.slice(0, chapter).flat();
}

export interface ProposeOptions {
  readonly chapter: number;
  readonly number: number;
  readonly layout: Layout;
  readonly twist?: Twist;
  /** Candidates composed (default 80), finalists the bots play (default 6), runs per bot (default 6). */
  readonly candidates?: number;
  readonly finalists?: number;
  readonly runs?: number;
}

export interface Proposal {
  readonly level: LevelDef;
  readonly metrics: Metrics;
  readonly summary: string;
  readonly table: readonly string[];
}

const WEIGHTS = { aimWindow: 2, noviceClear: 2, clearSkilled: 1.5, cascade: 1.5, breakInNovice: 1.5, luckCV: 1 } as const;
const FINAL_RUNS = 20;
const PAR_SLACK = 1.3;

/** The difficulty dial from the level's place in its chapter: hole width and a weekday-like rhythm. */
function planFor(o: ProposeOptions, twist: Twist): DayPlan {
  const local = ((o.number - 1) % 10) + 1;
  const holeW = local <= 3 ? 4 : local <= 7 ? 3 : 2;
  const weekday = local <= 3 ? 1 : local <= 6 ? 3 : 5;
  return {
    date: `level-${o.number}`, weekday, layout: o.layout, twist,
    picture: o.layout === 'picture' ? PICTURES[o.number % PICTURES.length]!.id : null,
    // Campaign levels run 60-120 s for a skilled player: bigger boards than most dailies.
    holeW, size: local <= 3 ? 'normal' : 'big', density: local <= 6 ? 'normal' : 'dense',
  };
}

function check(o: ProposeOptions, twist: Twist): void {
  if (o.chapter < 1 || o.chapter > 5) throw new Error(`--chapter must be 1-5, got ${o.chapter}`);
  if (!Number.isInteger(o.number) || o.number < 1 || o.number > 50) throw new Error(`--number must be 1-50, got ${o.number}`);
  if (o.number % 10 === 0) throw new Error(`level ${o.number} is a boss level: start from src/level/ch1/boss.ts instead`);
  if (!allowedLayouts(o.chapter).includes(o.layout)) throw new Error(`layout '${o.layout}' isn't allowed in chapter ${o.chapter} (allowed: ${allowedLayouts(o.chapter).join(', ')})`);
  if (!allowedTwists(o.chapter).includes(twist)) throw new Error(`twist '${twist}' isn't allowed in chapter ${o.chapter} (allowed: ${allowedTwists(o.chapter).join(', ')})`);
  if (o.layout === 'guarded' && twist !== 'shutter' && twist !== 'spinner') throw new Error(`a guarded gate needs --twist shutter or spinner`);
}

export function summaryOf(level: LevelDef, metrics: Metrics): { summary: string; table: string[] } {
  const verdicts = judge(metrics, levelTargets(level)).filter((v) => v.pass !== null);
  const misses = verdicts.filter((v) => !v.pass).map((v) => `${v.target.label} ${formatValue(v.target, v.value)}`);
  const table = verdicts.map((v) => `${v.target.label.padEnd(18)} ${formatValue(v.target, v.value).padStart(7)}  ${v.pass ? 'PASS' : 'MISS'}`);
  return { summary: `${verdicts.length - misses.length}/${verdicts.length} PASS${misses.length ? ` · MISS ${misses.join(', ')}` : ''}`, table };
}

/** `--layout keyGate` (a twist, not a layout) means a vault with a key and gate. */
function normalized(o: ProposeOptions): ProposeOptions {
  return (o.layout as string) === 'keyGate' ? { ...o, layout: 'vault', twist: 'keyGate' } : o;
}

export function propose(given: ProposeOptions): Proposal {
  const o = normalized(given);
  const twist = o.twist ?? 'none';
  check(o, twist);
  const plan = planFor(o, twist);
  const id = `ch${o.chapter}-${String(o.number).padStart(2, '0')}-${o.layout}`;
  const asLevel = (l: LevelDef): LevelDef => ({ ...l, id, number: o.number, chapter: o.chapter });
  const probe = asLevel(compose(plan, 0));
  const aimT = levelTargets(probe).find((t) => t.key === 'aimWindow')!;
  const pool: { level: LevelDef; aim: number }[] = [];
  for (let k = 0; k < (o.candidates ?? 80); k++) {
    const level = asLevel(compose(plan, k));
    const c = cheapCheck(level, aimT.lo, aimT.hi);
    if (c.ok) pool.push({ level, aim: c.aim });
  }
  if (pool.length === 0) throw new Error(`no candidate passed the cheap checks for ${o.layout}${twist !== 'none' ? ` + ${twist}` : ''}; try another layout or twist`);
  const mid = (aimT.lo + aimT.hi) / 2;
  const finalists = [...pool].sort((a, b) => Math.abs(a.aim - mid) - Math.abs(b.aim - mid)).slice(0, o.finalists ?? 6);
  let best: { level: LevelDef; score: number } | null = null;
  for (const [i, f] of finalists.entries()) {
    const m = measureLevel(f.level, { runs: o.runs ?? 6, seed: i + 1 });
    const score = distance(judge(m.metrics, levelTargets(f.level)), WEIGHTS);
    if (!best || score < best.score) best = { level: f.level, score };
  }
  const chosen = best!.level;
  const final = measureLevel(chosen, { runs: FINAL_RUNS });
  const t = final.metrics.clearSkilled;
  const level = { ...chosen, par: t === null ? 90 : Math.max(30, Math.round((t * PAR_SLACK) / 5) * 5) };
  return { level, metrics: final.metrics, ...summaryOf(level, final.metrics) };
}

function brickLiteral(b: BrickDef): string {
  const extra = Object.entries(b).filter(([k]) => !['x', 'y', 'w', 'h', 'kind'].includes(k)).map(([k, v]) => `, ${k}: ${JSON.stringify(v).replace(/"/g, "'")}`).join('');
  return `{ x: ${b.x}, y: ${b.y}, w: ${b.w}, h: ${b.h}, kind: '${b.kind}'${extra} }`;
}

/** The level as a ready TypeScript file (bricks one board row per line). */
export function levelSource(p: Proposal, typesImport: string, command: string): string {
  const l = p.level;
  const rows = new Map<number, BrickDef[]>();
  for (const b of l.bricks) rows.set(b.y, [...(rows.get(b.y) ?? []), b]);
  const brickLines = [...rows.keys()].sort((a, b) => a - b).map((y) => `    ${rows.get(y)!.map(brickLiteral).join(', ')},`);
  const { bricks: _bricks, ...rest } = l;
  const fields = Object.entries(rest).map(([k, v]) => `  ${k}: ${JSON.stringify(v).replace(/"/g, "'").replace(/'([a-zA-Z]+)':/g, '$1: ')},`);
  return [
    '/**',
    ` * Level ${l.number}, "${l.name}". Signature: ${l.layout}. PROPOSED by the generator; hand-tune it, then`,
    ' * rewrite this header (what it teaches, its pieces) and rename the export.',
    ` *   ${command}`,
    ` * Lab (${FINAL_RUNS} runs per bot): ${p.summary}`,
    ...p.table.map((r) => ` *   ${r}`),
    ' */',
    `import type { LevelDef } from '${typesImport}';`,
    '',
    `export const LEVEL_${l.number}: LevelDef = {`,
    ...fields,
    `  tip: 'TODO: one line shown before the level.',`,
    '  bricks: [',
    ...brickLines,
    '  ],',
    '};',
    '',
  ].join('\n');
}
