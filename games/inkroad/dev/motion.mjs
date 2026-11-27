// The InkRoad motion lab: `npm run motion -- <scenario|all> [--switch ROOMY_CORNERS=on GAP_ACCEPT=on] [--frame n] [--log n]`.
// One line per scenario; a named one also prints its violation timeline and an ASCII top-down frame at the first
// violation (or at --frame n). Loads dev/motionCli.ts through Vite's module runner, no build step.
// docs/inkroad-motion-lab.md.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { module } = await runnerImport(path.join(pkg, 'dev/motionCli.ts'), { configFile: false, root: pkg, logLevel: 'error' });
try {
  console.log(module.main(process.argv.slice(2).filter((a) => a !== '--'), process.env));
} catch (e) {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
}
