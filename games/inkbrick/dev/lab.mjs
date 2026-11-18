// The InkBrick level lab: `npm run lab -- <level id | number | YYYY-MM-DD> [--runs 20] [--file path.ts] [--quiet]`.
// Loads dev/lab.ts through Vite's module runner (as InkTanks does), no build step.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => a !== '--').map((a, i, all) => (all[i - 1] === '--file' ? path.resolve(a) : a));
try {
  // A bad level layout throws while loading (LevelError lists every problem).
  const opts = { configFile: false, root: pkg, logLevel: 'error' };
  const { module } = await runnerImport(path.join(pkg, 'dev/lab.ts'), opts);
  // A --file level is loaded here too: the runner is closed once runnerImport returns.
  const fi = args.indexOf('--file');
  const fileModule = fi >= 0 ? (await runnerImport(args[fi + 1], opts)).module : undefined;
  console.log(await module.main(args, fileModule));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
