import { FREE_CITIES } from '../src/city/cities';
import { beginner, greedy, nobody } from '../src/city/bots/beginner';
import { beginnerSaves, familyRows } from '../src/city/bots/families';
import { lasting } from '../src/city/bots/lasting';
import { planner } from '../src/city/bots/planner';
import { probe } from '../src/city/bots/probe';
import { play, type YearRow } from '../src/city/bots/play';
import type { Bot } from '../src/city/bots/tools';
import { PAID_CITIES } from '../content/paid';
import { rowText } from './labTables';

export { botTable, familyTable, lastTable } from './labTables';
export { FAMILY_NAMES } from '../src/city/bots/families';

/** The city lab: plays the bots and prints a row a year. */
const BOTS: readonly Bot[] = [nobody, beginner, planner, greedy];
const CITIES = [...FREE_CITIES, ...PAID_CITIES];
const RETRIES = 6;

function flag(args: readonly string[], name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
}

type Def = (typeof CITIES)[number];
const retriesOf = (bot: Bot): number => (bot.name === 'beginner' ? RETRIES : 0);

/** One piece of work for a child process: prints JSON. */
function job(args: readonly string[], def: Def, seed: number, saves: readonly unknown[]): string {
  const name = flag(args, 'name', '');
  const what = flag(args, 'job', '');
  if (what === 'saves') return JSON.stringify(beginnerSaves(def, seed));
  if (what === 'last') return JSON.stringify(lasting(def, seed));
  if (what === 'family') {
    return JSON.stringify(familyRows(def, seed, name, saves, Number(flag(args, 'from', '4')), Number(flag(args, 'to', '10'))));
  }
  const bot = BOTS.find((b) => b.name === name);
  if (!bot) throw new Error(`No bot '${name}'`);
  const t0 = performance.now();
  const rows = play(def, seed, bot, { to: Number(flag(args, 'to', '10')), retries: retriesOf(bot) });
  return JSON.stringify({ bot: name, seed, secs: (performance.now() - t0) / 1000, rows });
}

export function main(args: readonly string[], saves: readonly unknown[] = []): string {
  const id = args[0] && !args[0].startsWith('--') ? args[0] : 'saffron';
  const def = CITIES.find((c) => c.id === id);
  if (!def) return `No city '${id}'. Cities: ${CITIES.map((c) => c.id).join(', ')}`;
  const seed = Number(flag(args, 'seed', '1'));
  if (args.includes('--job')) return job(args, def, seed, saves);
  const which = flag(args, 'bot', 'all').split(',');
  const bots = BOTS.filter((b) => which[0] === 'all' || which.includes(b.name));
  const to = Number(flag(args, 'to', '10'));
  if (args.includes('--probe')) return bots.flatMap((b) => [b.name, ...probe(def, seed, b, to)]).join('\n');
  const runs = Number(flag(args, 'runs', '1'));
  const from = Number(flag(args, 'from', '1'));
  return bots.flatMap((bot) => Array.from({ length: runs }, (_, k) => report(bot, def, seed + k, from, to, args.includes('--seasons')).join('\n'))).join('\n');
}

function report(bot: Bot, def: Def, seed: number, from: number, to: number, seasons: boolean): string[] {
  const t0 = performance.now();
  const rows: readonly YearRow[] = play(def, seed, bot, { to, retries: retriesOf(bot) });
  const secs = (performance.now() - t0) / 1000;
  const won = rows.filter((r) => !r.replaced);
  const plates = won.reduce((s, r) => s + r.plates, 0) / Math.max(1, won.length);
  const last = rows[rows.length - 1];
  const end = last?.replaced ? `REPLACED in year ${last.year}` : `reached the end of year ${last?.year}`;
  return [
    `${bot.name} seed ${seed}: ${end}, ${plates.toFixed(2)} plates a year, ${rows.filter((r) => r.replaced).length} losses, ${secs.toFixed(1)} s for ${rows.length} years`,
    ...rows.filter((r) => r.year >= from).flatMap((r) => [rowText(r), ...(seasons ? [`        ${r.seasons.join('  ')}`] : [])]),
  ];
}
