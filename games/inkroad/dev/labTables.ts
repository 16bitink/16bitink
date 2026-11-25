import type { FamilyRow } from '../src/city/bots/families';
import type { Lasting } from '../src/city/bots/lasting';
import type { YearRow } from '../src/city/bots/play';

/** The lab's printed tables. */
const n = (v: number, w: number): string => String(Math.round(v)).padStart(w);
const mean = (list: readonly number[]): number => (list.length === 0 ? 0 : list.reduce((a, b) => a + b, 0) / list.length);
const signed = (v: number, w = 6): string => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`.padStart(w);

export function rowText(r: YearRow): string {
  const b = r.bars;
  return `  Y${String(r.year).padEnd(2)}${r.attempt ? `r${r.attempt}` : '  '} appr${n(r.approval, 4)} | T${n(b.trips!, 3)} P${n(b.parking!, 3)} C${n(b.cost!, 3)} S${n(b.streets!, 3)} | $${n(r.money, 5)} in${n(r.income, 5)} | plates ${r.plates} letters ${r.letters} | pop${n(r.population, 6)} cars${n(r.peakCars, 4)} | goal ${r.goal.padEnd(12)} | ${r.worst.join(', ')}${r.replaced ? '  REPLACED' : ''}`;
}

const BARS = ['trips', 'parking', 'cost', 'streets'] as const;
const GOOD = 3;
const BEST = 6;

/** A row a year: what nothing loses, what each family is worth over nothing. */
export function familyTable(rows: readonly FamilyRow[], why: boolean): string {
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const bots = [...new Set(rows.map((r) => r.bot))].filter((b) => b !== 'nobody');
  const out = [`year  start  nothing | ${bots.map((b) => b.padStart(8)).join(' ')} | best     good | bars with nothing      | bars under the best    | money: ${bots.join(' ')}`];
  for (const year of years) {
    const of = (b: string): readonly FamilyRow[] => rows.filter((r) => r.year === year && r.bot === b);
    const idle = mean(of('nobody').map((r) => r.to));
    const start = mean(of('nobody').map((r) => r.from));
    const gains = bots.map((b) => mean(of(b).map((r) => r.to)) - idle);
    const top = gains.indexOf(Math.max(...gains));
    const barsOf = (b: string): string => BARS.map((k) => `${k[0]!.toUpperCase()}${n(mean(of(b).map((r) => r.bars[k])), 3)}`).join(' ');
    const ok = gains.filter((g) => g >= GOOD).length;
    out.push(`Y${String(year).padEnd(3)} ${start.toFixed(1).padStart(6)} ${signed(idle - start, 8)} | ${gains.map((g) => signed(g, 8)).join(' ')} | ${bots[top]!.padEnd(8)} ${ok}${gains[top]! >= BEST && ok >= 3 ? ' ok' : '   '} | ${barsOf('nobody')} | ${barsOf(bots[top]!)} | ${bots.map((b) => n(mean(of(b).map((r) => r.money)), 5)).join('')}`);
    if (why) for (const b of bots) for (const r of of(b)) out.push(`        ${b} s${r.seed} ${r.from.toFixed(0)}>${r.to.toFixed(0)}: ${r.did.join(', ')}`);
  }
  return out.join('\n');
}

interface BotRun { readonly bot: string; readonly seed: number; readonly secs: number; readonly rows: readonly YearRow[] }

/** Every bot over the seeds: approvals by year, money in hand against a season's income, plates. */
export function botTable(runs: readonly BotRun[]): string {
  const out: string[] = [];
  for (const bot of [...new Set(runs.map((r) => r.bot))]) {
    for (const r of runs.filter((x) => x.bot === bot)) {
      const won = r.rows.filter((x) => !x.replaced);
      const last = r.rows[r.rows.length - 1]!;
      const cell = (x: YearRow): string => `${x.replaced ? 'X' : ''}${n(x.approval, 2)}`.padStart(4);
      out.push(`${bot.padEnd(9)} s${r.seed} ${last.replaced ? `lost Y${last.year}` : `end Y${last.year} `} plates ${mean(won.map((x) => x.plates)).toFixed(2)} losses ${r.rows.filter((x) => x.replaced).length} | approval ${r.rows.map(cell).join('')} | purse/season ${won.map((x) => (x.money / Math.max(1, x.income / 4)).toFixed(1).padStart(4)).join('')} | ${r.secs.toFixed(0)} s`);
    }
  }
  return out.join('\n');
}

export function lastTable(list: readonly Lasting[]): string {
  const sum = (f: (x: Lasting) => number): number => list.reduce((s, x) => s + f(x), 0);
  const pc = (v: number): string => `${v} (${Math.round((100 * v) / Math.max(1, sum((x) => x.good)))}%)`;
  return [
    ...list.map((x) => `seed ${x.seed}: of ${x.good} good junctions of year 3, by year 7 ${x.alone} bad untouched, ${x.kept} bad or rebuilt in a played city | ${x.detail.join('; ')}`),
    `all: ${sum((x) => x.good)} good, untouched bad ${pc(sum((x) => x.alone))}, played ${pc(sum((x) => x.kept))}`,
  ].join('\n');
}
