// The InkBrick daily generator (docs/inkbrick-design.md "The daily level"):
//   npm run gen -- --from 2026-11-20 --days 60 [--candidates 200] [--enough 24] [--finalists 6] [--runs 4] [--verify 2] [--verify-runs 12] [--rounds 2] [--workers N] [--force]
//   npm run gen -- --redo 2026-12-03[,2026-12-09] [--relayout 2026-12-09]   (vetoed days: new candidates, the rest untouched; goal and rule kept, layout too unless --relayout)
//   npm run gen -- --report [--from 2026-11-20 --days 73] [--runs 20]   (every frozen day measured as the lab does)
//   npm run gen -- --tomorrow   (rewrite every frozen day's tomorrow: { rule, goal } from the day after it)
//   npm run gen -- --propose --chapter 2 --number 14 --layout hourglass [--twist ice] [--goal rescue] [--rule current] --out content/ch2/neck.ts
// Frozen days (content/daily/YYYY-MM.json) are never regenerated without --force or --redo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async () => (await runnerImport(path.join(pkg, 'dev/gen.ts'), { configFile: false, root: pkg, logLevel: 'error' })).module;

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

const dailyDir = path.join(pkg, 'content/daily');

function readFrozen() {
  const out = {};
  if (!fs.existsSync(dailyDir)) return out;
  for (const f of fs.readdirSync(dailyDir).filter((n) => /^\d{4}-\d{2}\.json$/.test(n))) {
    const month = JSON.parse(fs.readFileSync(path.join(dailyDir, f), 'utf8'));
    Object.assign(out, month.days ?? {});
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
  const index = [
    '// Written by `npm run gen`: every frozen month of InkBrick dailies. Do not edit by hand.',
    ...names.map((m) => `import ${id(m)} from './${m}.json';`),
    '',
    `export const DAILY_MONTHS: readonly unknown[] = [${names.map(id).join(', ')}];`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dailyDir, 'index.ts'), index);
}

async function runPool(jobs, workers, onDone) {
  const queue = [...jobs];
  const pool = Array.from({ length: Math.min(workers, jobs.length) }, () => new Worker(fileURLToPath(import.meta.url)));
  await Promise.all(pool.map((w) => new Promise((resolve, reject) => {
    const next = () => {
      const job = queue.shift();
      if (!job) {
        w.terminate().then(resolve);
        return;
      }
      w.postMessage(job);
    };
    w.on('message', (msg) => {
      if (msg.ready) return next();
      // One day that can't be made doesn't lose the others: say so and go on.
      if (msg.error) {
        console.error(`SKIPPED ${msg.error}`);
        return next();
      }
      onDone(msg.entry ?? msg.report, msg.seconds);
      next();
    });
    w.on('error', reject);
  })));
}

async function proposeLevel(gen, args) {
  const out = flag(args, '--out');
  if (!out) throw new Error('--propose needs --out <path.ts>');
  const o = { chapter: Number(flag(args, '--chapter')), number: Number(flag(args, '--number')), layout: flag(args, '--layout'), twist: flag(args, '--twist'), goal: flag(args, '--goal'), rule: flag(args, '--rule') };
  const t0 = performance.now();
  const p = gen.propose(o);
  const file = path.resolve(pkg, out);
  let rel = path.relative(path.dirname(file), path.join(pkg, 'src/sim/types')).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  const command = `npm run gen -- ${args.join(' ')}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, gen.levelSource(p, rel, command));
  console.log(`${path.relative(pkg, file)}: L${p.level.number} ${p.level.layout} ${p.level.bricks.length} bricks · ${p.summary} · ${((performance.now() - t0) / 1000).toFixed(0)}s`);
}

async function report(gen, args, frozen) {
  const from = flag(args, '--from');
  const dates = from ? gen.dateRange(from, Number(flag(args, '--days', 73))) : Object.keys(frozen).sort();
  const jobs = dates.filter((d) => frozen[d]).map((date) => ({ measure: { date, level: frozen[date].level, runs: Number(flag(args, '--runs', 20)) } }));
  const rows = [];
  await runPool(jobs, Number(flag(args, '--workers', Math.max(1, os.cpus().length - 1))), (r) => rows.push(r));
  console.log(gen.reportTable(rows));
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const gen = await load();
  if (args.includes('--propose')) return proposeLevel(gen, args);
  const frozen = readFrozen();
  if (args.includes('--report')) return report(gen, args, frozen);
  if (args.includes('--tomorrow')) {
    writeFrozen(gen.withTomorrow(frozen));
    console.log(`rewrote tomorrow's teaser on ${Object.keys(frozen).length} frozen days`);
    return;
  }
  const redo = flag(args, '--redo');
  const force = args.includes('--force');
  const redoDates = redo ? redo.split(',') : [];
  const dates = redo ? redoDates : gen.dateRange(flag(args, '--from', new Date().toISOString().slice(0, 10)), Number(flag(args, '--days', 60)));
  const salts = Object.fromEntries(redoDates.map((d) => [d, (frozen[d]?.salt ?? 0) + 1]));
  const todo = dates.filter((d) => redo || force || !frozen[d]);
  if (todo.length === 0) {
    console.log(`all ${dates.length} days already frozen (use --force or --redo <date>)`);
    return;
  }
  // Unset flags fall back to generateDay's defaults (src/gen/generate.ts).
  const opts = Object.fromEntries(
    ['candidates', 'enough', 'finalists', 'runs', 'verify', 'verifyRuns', 'rounds']
      .map((k) => [k, flag(args, `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`)])
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, Number(v)]),
  );

  // Plans are sequential (novelty against the days before); the days themselves run in parallel.
  const relayout = (flag(args, '--relayout') ?? '').split(',').filter(Boolean);
  const keep = Object.fromEntries(redoDates.map((d) => [d, gen.keepOf(frozen[d], relayout.includes(d))]).filter(([, k]) => k));
  const plans = gen.planDates(dates, force && !redo ? {} : frozen, salts, keep).filter((p) => todo.includes(p.date));
  const workers = Number(flag(args, '--workers', Math.max(1, os.cpus().length - 1)));
  const t0 = performance.now();
  const done = { ...frozen };
  await runPool(plans.map((plan) => ({ plan, opts: { ...opts, salt: salts[plan.date] ?? 0 } })), workers, (entry, seconds) => {
    done[entry.date] = entry;
    console.log(gen.dayLine(entry, seconds));
    if (redoDates.length === 1) console.log(gen.board(entry));
  });
  writeFrozen(gen.withTomorrow(done));
  console.log(`froze ${plans.length} day(s) in ${((performance.now() - t0) / 1000).toFixed(0)}s with ${workers} workers -> content/daily/`);
}

if (!isMainThread) {
  const gen = await load();
  parentPort.on('message', ({ plan, opts, measure }) => {
    const t0 = performance.now();
    if (measure) {
      parentPort.postMessage({ report: gen.measureDay(measure.date, measure.level, measure.runs), seconds: (performance.now() - t0) / 1000 });
      return;
    }
    try {
      const entry = gen.generateDay(plan, opts);
      parentPort.postMessage({ entry, seconds: (performance.now() - t0) / 1000 });
    } catch (e) {
      parentPort.postMessage({ error: `${plan.date}: ${e instanceof Error ? e.message : e}` });
    }
  });
  parentPort.postMessage({ ready: true });
} else {
  await main();
}
