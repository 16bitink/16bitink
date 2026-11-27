// Trail pictures of motion-lab scenarios (dev/trailsCli.ts): SVGs, rendered to PNGs with playwright's Chromium.
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { module } = await runnerImport(path.join(pkg, 'dev/trailsCli.ts'), { configFile: false, root: pkg, logLevel: 'error' });
const pics = JSON.parse(module.main(process.argv.slice(2).filter((a) => a !== '--')));
const { chromium } = await import('playwright-core');
// Any Chrome will do: the system one, or PLAYWRIGHT_CHROME.
const exe = process.env.PLAYWRIGHT_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
for (const { file: f, svg } of pics) {
  writeFileSync(f, svg);
  const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg) ?? [];
  await page.setViewportSize({ width: Number(w), height: Number(h) });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: f.replace(/\.svg$/, '.png') });
  console.log(f.replace(/\.svg$/, '.png'));
}
await browser.close();
