// Traffic bench: `node dev/simbench.mjs [bench|cap|all]`. Runs dev/simbench.ts through Vite, no build step.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const { module } = await runnerImport(path.join(pkg, 'dev/simbench.ts'), { configFile: false, root: pkg, logLevel: 'error' });
  console.log(module.main(process.argv[2] ?? 'all'));
} catch (e) {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
}
