// Watch parking manoeuvres: node dev/parkSnap.mjs OUT.png [--q "year=3&warm=55"] [--pick kerb|street|park|home|sand] [--dir in|out] [--speed 0.15] [--shots 3] [--gap 900] [--zoom 5] [--base url]
import { chromium } from 'playwright-core';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const out = process.argv[2];
const base = arg('base', 'http://localhost:5187/view.html');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: Number(arg('w', '900')), height: Number(arg('h', '600')) }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text()); });
await page.goto(`${base}?bare=1&${arg('q', 'year=3&warm=55')}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const pick = arg('pick', 'kerb'), dir = arg('dir', 'in');
await page.evaluate(([pk, d, slow, z]) => {
  window.__ev = [];
  const w = __ir.world; const o = w.handleEvents.bind(w);
  let done = false;
  w.handleEvents = (l) => {
    for (const e of l) if (e.t === 'park') {
      window.__ev.push({ ...e, clock: __ir.city.clock });
      if (!done && e.dir === d && e.key.startsWith(pk)) { done = true; __ir.setSpeed(slow); w.focusOn({ x: e.lane.x, y: e.lane.y }, { zoom: z, ms: 0 }); }
    }
    o(l);
  };
}, [pick, dir, Number(arg('speed', '1')), Number(arg('zoom', '5'))]);
const kindOf = (e) => e.key.split(':')[0];
let ev = null;
for (let i = 0; i < 400 && !ev; i++) {
  await page.waitForTimeout(100);
  ev = await page.evaluate(([pk, d]) => window.__ev.find((e) => e.dir === d && e.key.startsWith(pk)) ?? null, [pick, dir]);
}
if (!ev) { console.log('no event', JSON.stringify(await page.evaluate(() => window.__ev.slice(0, 6)))); await browser.close(); process.exit(1); }
console.log('event', JSON.stringify(ev));
if (process.argv.includes('--trace')) {
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(250);
    console.log(JSON.stringify(await page.evaluate((uid) => { const m = __ir.scene.moves; const a = m.pool.slice(0, m.live).find((x) => x.uid === uid); return a ? { ph: a.phase, at: +a.at.toFixed(2), x: +a.img.x.toFixed(1), y: +a.img.y.toFixed(1), rot: +a.img.rotation.toFixed(2), mode: a.mode } : 'done'; }, ev.car)));
  }
}
const n = Number(arg('shots', '3'));
for (let i = 0; i < n; i++) {
  await page.waitForTimeout(Number(arg('gap', '900')));
  await page.screenshot({ path: out.replace('.png', `-${i}.png`) });
}
console.log(JSON.stringify(await page.evaluate(() => ({ n: window.__ev.length, kinds: [...new Set(window.__ev.map((e) => e.key.split(':')[0] + e.dir))] }))));
await browser.close();
