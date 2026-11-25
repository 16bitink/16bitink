// The InkRoad city lab: `npm run lab -- saffron [--bot nobody|beginner|planner|greedy|all] [--from 1 --to 10] [--seed n] [--runs n]`,
// or `npm run lab -- saffron --families [--from 4 --to 10] [--seeds 1,2,3]`, or `--last` (do good junctions go bad?).
// Loads dev/lab.ts through Vite's module runner, no build step. Seeds and families run side by side in child processes.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const here = fileURLToPath(import.meta.url);
const pkg = path.resolve(path.dirname(here), '..');
const args = process.argv.slice(2).filter((a) => a !== '--');
const flag = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] ?? fallback : fallback; };
const JOBS = Math.max(1, availableParallelism() - 1);

const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
/** The code's fingerprint: what was worked out before stays good until a rule changes. */
function cacheDir() {
  const hash = createHash('sha1');
  for (const f of ['src/sim', 'src/city', 'content'].flatMap((d) => files(path.join(pkg, d))).sort()) hash.update(readFileSync(f));
  const dir = path.join(pkg, 'node_modules/.cache/inkroad-lab', hash.digest('hex').slice(0, 12));
  mkdirSync(dir, { recursive: true });
  return dir;
}

const run = (more) => new Promise((resolve, reject) => {
  execFile(process.execPath, [here, ...more], { maxBuffer: 1 << 28 }, (e, out, err) => (e ? reject(new Error(err || String(e))) : resolve(out)));
});

/** Run jobs side by side, keeping each answer on disk. */
async function pool(jobs) {
  const dir = cacheDir();
  const out = [];
  let i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const at = i++;
      const file = path.join(dir, `${jobs[at].join('_').replace(/[^a-z0-9_]/gi, '')}.json`);
      if (!existsSync(file)) writeFileSync(file, await run([...jobs[at], '--save-to', file]));
      out[at] = readFileSync(file, 'utf8');
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  return { out, dir };
}

async function lab() {
  const { module } = await runnerImport(path.join(pkg, 'dev/lab.ts'), { configFile: false, root: pkg, logLevel: 'error' });
  const city = args[0] && !args[0].startsWith('--') ? args[0] : 'saffron';
  const seeds = flag('seeds', '1,2,3').split(',');
  if (args.includes('--families')) {
    const { out: saves, dir } = await pool(seeds.map((s) => [city, '--job', 'saves', '--seed', s]));
    if (saves.length === 0) return 'No seeds';
    const names = module.FAMILY_NAMES;
    const jobs = seeds.flatMap((s) => names.map((b) => [city, '--job', 'family', '--name', b, '--seed', s, '--from', flag('from', '4'), '--to', flag('to', '10'),
      '--saves', path.join(dir, `${[city, '--job', 'saves', '--seed', s].join('_').replace(/[^a-z0-9_]/gi, '')}.json`)]));
    const { out } = await pool(jobs);
    return module.familyTable(out.flatMap((x) => JSON.parse(x)), args.includes('--why'));
  }
  const bots = flag('bot', 'all') === 'all' ? 'nobody,beginner,planner,greedy' : flag('bot', 'all');
  if (args.includes('--bots')) {
    const { out } = await pool(seeds.flatMap((s) => bots.split(',').map((b) => [city, '--job', 'bot', '--name', b, '--seed', s, '--to', flag('to', '10')])));
    return module.botTable(out.map((x) => JSON.parse(x)));
  }
  if (args.includes('--last')) {
    const { out } = await pool(seeds.map((s) => [city, '--job', 'last', '--seed', s]));
    return module.lastTable(out.map((x) => JSON.parse(x)));
  }
  const saves = flag('saves', '');
  return module.main(args, saves ? JSON.parse(readFileSync(saves, 'utf8')) : []);
}

try {
  const text = await lab();
  const to = flag('save-to', '');
  if (!to) console.log(text);
  else process.stdout.write(text);
} catch (e) {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
}
