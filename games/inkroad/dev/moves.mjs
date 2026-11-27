// Parking and turning-round moves of three seasons: seconds by kind and lane time per season (dev/movesCli.ts).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { module } = await runnerImport(path.join(pkg, 'dev/movesCli.ts'), { configFile: false, root: pkg, logLevel: 'error' });
try {
  console.log(module.main(process.argv.slice(2).filter((a) => a !== '--')));
} catch (e) {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
}
