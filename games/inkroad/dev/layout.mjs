// The layout of a city as text, with its layout problems: node dev/layout.mjs saffron [--year 10]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const at = args.indexOf('--year');
const { module } = await runnerImport(path.join(pkg, 'dev/layout.ts'), { configFile: false, root: pkg, logLevel: 'error' });
console.log(module.main(args[0] ?? 'saffron', at >= 0 ? Number(args[at + 1]) : 10));
