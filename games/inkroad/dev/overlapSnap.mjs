// A PNG of the drawn bodies at one frame of a season (dev/overlapsCli.ts --snap frame,x,y[,r]): node dev/overlapSnap.mjs OUT.png "year 3" --snap f,x,y
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
import { chromium } from 'playwright-core';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { module } = await runnerImport(path.join(pkg, 'dev/overlapsCli.ts'), { configFile: false, root: pkg, logLevel: 'error' });
const [out, ...rest] = process.argv.slice(2).filter((a) => a !== '--');
const svgs = JSON.parse(module.main(rest));
const exe = process.env.PLAYWRIGHT_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
const svg = svgs[0];
const [, w, h] = /width="(\d+)" height="(\d+)"/.exec(svg) ?? [];
await page.setViewportSize({ width: Number(w), height: Number(h) });
await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
