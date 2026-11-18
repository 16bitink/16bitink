// The InkSnake daily generator (docs/inksnake-daily.md "Generator"):
//   npm run gen -- --from 2026-11-19 --days 74 [--candidates 40] [--enough 8] [--workers N] [--force]
//   npm run gen -- --redo 2026-12-03[,2026-12-09]   (vetoed days: new layout and cast; place, snake, rule and goal kept)
//   npm run gen -- --audit   (the variety audit of every frozen day)
//   npm run gen -- --tomorrow   (rewrite every frozen day's tomorrow teaser from the day after it)
// Frozen days (content/daily/YYYY-MM.json) are never regenerated without --force or --redo.
// --force plans the days afresh (ignoring yesterday's teaser, but not the frozen days after them); --redo keeps a day's dials.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async () => (await runnerImport(path.join(pkg, 'dev/genDays.ts'), { configFile: false, root: pkg, logLevel: 'error' })).module;
const dailyDir = path.join(pkg, 'content/daily');

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

function readFrozen() {
  const out = {};
  if (!fs.existsSync(dailyDir)) return out;
  for (const f of fs.readdirSync(dailyDir).filter((n) => /^\d{4}-\d{2}\.json$/.test(n))) {
    Object.assign(out, JSON.parse(fs.readFileSync(path.join(dailyDir, f), 'utf8')).days ?? {});
  }
  return out;
}

function writeFrozen(all) {
  fs.mkdirSync(dailyDir, { recursive: true });
  const months = {};
  for (const [date, entry] of Object.entries(all)) (months[date.slice(0, 7)] ??= {})[date] = entry;
  const names = Object.keys(months).sort();
  for (const m of names) {
    const days = Object.fromEntries(Object.entries(months[m]).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(path.join(dailyDir, `${m}.json`), `${JSON.stringify({ version: 1, days })}\n`);
  }
  const id = (m) => `m${m.replace('-', '_')}`;
  fs.writeFileSync(path.join(dailyDir, 'index.ts'), [
    '// Written by `npm run gen`: every frozen month of InkSnake dailies. Do not edit by hand.',
    ...names.map((m) => `import ${id(m)} from './${m}.json';`),
    '',
    `export const DAILY_MONTHS: readonly unknown[] = [${names.map(id).join(', ')}];`,
    '',
  ].join('\n'));
}

async function runPool(jobs, workers, onDone) {
  const queue = [...jobs];
  const pool = Array.from({ length: Math.min(workers, jobs.length) }, () => new Worker(fileURLToPath(import.meta.url)));
  await Promise.all(pool.map((w) => new Promise((resolve, reject) => {
    const next = () => {
      const job = queue.shift();
      if (!job) return void w.terminate().then(resolve);
      w.postMessage(job);
    };
    w.on('message', (msg) => {
      if (msg.ready) return next();
      // One day that can't be made doesn't lose the others: say so and go on.
      if (msg.error) console.error(`SKIPPED ${msg.error}`);
      else onDone(msg.entry, msg.seconds);
      next();
    });
    w.on('error', reject);
  })));
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const gen = await load();
  const frozen = readFrozen();
  if (args.includes('--audit')) return console.log(gen.audit(frozen));
  if (args.includes('--tomorrow')) {
    writeFrozen(gen.withTomorrow(frozen));
    return console.log(`rewrote tomorrow's teaser on ${Object.keys(frozen).length} frozen days`);
  }
  const redo = flag(args, '--redo');
  const force = args.includes('--force');
  const redoDates = redo ? redo.split(',') : [];
  for (const d of redoDates) if (!frozen[d]) throw new Error(`--redo ${d}: not frozen`);
  const dates = redo ? redoDates : gen.dateRange(flag(args, '--from', new Date().toISOString().slice(0, 10)), Number(flag(args, '--days', 60)));
  const todo = dates.filter((d) => redo || force || !frozen[d]);
  if (todo.length === 0) return console.log(`all ${dates.length} days already frozen (use --force or --redo <date>)`);
  const salts = Object.fromEntries(redoDates.map((d) => [d, (frozen[d]?.salt ?? 0) + 1]));
  const opts = Object.fromEntries(['candidates', 'enough'].map((k) => [k, flag(args, `--${k}`)]).filter(([, v]) => v !== undefined).map(([k, v]) => [k, Number(v)]));
  // Plans are sequential (limits and novelty against the days before); the days run in parallel.
  const base = force && !redo ? Object.fromEntries(Object.entries(frozen).filter(([d]) => !todo.includes(d))) : frozen;
  const plans = gen.planDates(todo, base, salts, new Set(redoDates), force && !redo);
  const workers = Number(flag(args, '--workers', Math.max(1, os.cpus().length - 1)));
  const t0 = performance.now();
  const done = { ...base };
  await runPool(plans.map((plan) => ({ plan, opts: { ...opts, salt: salts[plan.date] ?? 0 } })), workers, (entry, seconds) => {
    done[entry.date] = entry;
    console.log(gen.dayLine(entry, seconds));
  });
  writeFrozen(gen.withTomorrow(done));
  console.log(`froze ${plans.length} day(s) in ${((performance.now() - t0) / 1000).toFixed(0)}s with ${workers} workers -> content/daily/`);
}

if (!isMainThread) {
  const gen = await load();
  parentPort.on('message', ({ plan, opts }) => {
    const t0 = performance.now();
    try {
      parentPort.postMessage({ entry: gen.generateDay(plan, opts), seconds: (performance.now() - t0) / 1000 });
    } catch (e) {
      parentPort.postMessage({ error: `${plan.date}: ${e instanceof Error ? e.stack : e}` });
    }
  });
  parentPort.postMessage({ ready: true });
} else {
  await main();
}
