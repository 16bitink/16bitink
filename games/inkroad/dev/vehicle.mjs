// The vehicle-model comparison table: `node dev/vehicle.mjs [situation ...] [--json] [--bench]` (docs/inkroad-vehicle-model.md).
// Loads dev/vehicleCli.ts through Vite's module runner, no build step.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { module } = await runnerImport(path.join(pkg, 'dev/vehicleCli.ts'), { configFile: false, root: pkg, logLevel: 'error' });
try {
  console.log(module.main(process.argv.slice(2).filter((a) => a !== '--')));
} catch (e) {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
}
