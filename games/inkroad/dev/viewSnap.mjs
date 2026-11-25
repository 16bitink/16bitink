// Screenshots of the world view: node dev/viewSnap.mjs OUT.png [--q "year=1&warm=20"] [--size desk|phone|se] [--js "code run in the page before the shot"] [--wait ms] [--base url]
import { chromium } from 'playwright-core';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const out = process.argv[2];
const SIZES = { desk: [1440, 900, 1], desk2: [1440, 900, 2], phone: [844, 390, 3], se: [667, 375, 2] };
const [w, h, dpr] = SIZES[arg('size', 'desk')];
const base = arg('base', 'http://localhost:5187/view.html');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: arg('size', 'desk') === 'phone' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text()); });
const t0 = Date.now();
await page.goto(`${base}?bare=1&${arg('q', '')}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: Number(arg("timeout", "60000")) }).catch(() => console.log('not ready'));
console.log('ready after', Date.now() - t0, 'ms');
await page.waitForTimeout(400);
const shots = (arg('js', '') || '').split('@@');
for (let i = 0; i < shots.length; i++) {
  if (shots[i].trim()) await page.evaluate(shots[i]);
  await page.waitForTimeout(Number(arg('wait', '1500')));
  await page.screenshot({ path: shots.length === 1 ? out : out.replace('.png', `-${i}.png`) });
}
console.log(JSON.stringify(await page.evaluate(() => ({ fps: window.__ir?.fps(), cars: window.__ir?.cars(), drawn: window.__ir?.drawn(), pending: window.__ir?.pending(), zoom: window.__ir?.zoom() }))));
await browser.close();
