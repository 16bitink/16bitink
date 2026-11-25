// Drives the world view with real pointers: draws a road, builds it, taps a junction, pans, zooms, pinches. node dev/viewPlay.mjs OUT_DIR
import { chromium } from 'playwright-core';

const out = process.argv[2];
const base = 'http://localhost:5187/view.html?bare=1&warm=25&speed=0';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
let failed = 0;
const check = (name, ok, extra = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, extra); if (!ok) failed++; };
for (const [name, w, h, touch] of [['desk', 1440, 900, false], ['phone', 844, 390, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 3 : 1, hasTouch: touch });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => check(`${name} page error ${e.message}`, false));
  await page.goto(base);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const ev = (f, a) => page.evaluate(f, a);
  const cdp = await ctx.newCDPSession(page);
  const touchEv = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  const drag = async (pts) => {
    if (!touch) { await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down(); for (const p of pts) await page.mouse.move(p.x, p.y, { steps: 6 }); await page.mouse.up(); return; }
    await touchEv('touchStart', [pts[0]]);
    for (let k = 1; k < pts.length; k++) for (let i = 1; i <= 6; i++) await touchEv('touchMove', [{ x: pts[k - 1].x + ((pts[k].x - pts[k - 1].x) * i) / 6, y: pts[k - 1].y + ((pts[k].y - pts[k - 1].y) * i) / 6 }]);
    await touchEv('touchEnd', []);
  };
  const tap = (p) => (touch ? page.touchscreen.tap(p.x, p.y) : page.mouse.click(p.x, p.y));
  await ev(() => __ir.world.focusOn({ x: 34 * 40, y: 19.5 * 40 }, { zoom: 1.5, ms: 1 }));
  await page.waitForTimeout(300);
  const cell = (gx, gy) => ev(([x, y]) => __ir.cell(x, y), [gx, gy]);
  const money = await ev(() => __ir.city.money);
  await ev(() => __ir.world.setTool('street'));
  await drag([await cell(36, 18), await cell(36, 20), await cell(36, 21)]);
  await page.waitForTimeout(200);
  const g = await ev(() => ({ ok: __ir.world.ghost?.quote.ok, why: __ir.world.ghost?.quote.why, cells: __ir.world.ghost?.cmd.cells?.length }));
  check(`${name} road ghost`, g.ok === true, JSON.stringify(g));
  await page.screenshot({ path: `${out}/play-${name}-ghost.png` });
  await drag([await cell(36, 21), await cell(34, 23)]);
  const g2 = await ev(() => ({ ok: __ir.world.ghost?.quote.ok, why: __ir.world.ghost?.quote.why, cells: __ir.world.ghost?.cmd.cells?.length }));
  check(`${name} drag on from the end`, (g2.cells ?? 0) > (g.cells ?? 0), JSON.stringify(g2));
  const built = await ev(() => __ir.world.confirm());
  check(`${name} built`, built?.ok === true && (await ev(() => __ir.city.money)) < money, JSON.stringify(built));
  await ev(() => __ir.world.setTool(null));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/play-${name}-built.png` });
  await ev(() => __ir.world.focusOn({ x: 22 * 40, y: 18 * 40 }, { zoom: 1.8, ms: 1 }));
  await page.waitForTimeout(200);
  await tap(await cell(22, 18));
  await page.waitForTimeout(400);
  const s = await ev(() => __ir.world.selection);
  check(`${name} junction tap`, s?.kind === 'junction', JSON.stringify(s));
  await page.screenshot({ path: `${out}/play-${name}-arrows.png` });
  const before = await ev(() => __ir.at(0, 0));
  await drag([{ x: w * 0.6, y: h * 0.7 }, { x: w * 0.45, y: h * 0.6 }]);
  await page.waitForTimeout(600);
  const after = await ev(() => __ir.at(0, 0));
  check(`${name} pan`, Math.abs(after.x - before.x) > 60, `${before.x.toFixed()} to ${after.x.toFixed()}`);
  const z0 = await ev(() => __ir.zoom());
  if (touch) {
    const c = { x: w / 2, y: h / 2 };
    await touchEv('touchStart', [{ x: c.x - 30, y: c.y }, { x: c.x + 30, y: c.y }]);
    for (let i = 1; i <= 8; i++) await touchEv('touchMove', [{ x: c.x - 30 - i * 6, y: c.y }, { x: c.x + 30 + i * 6, y: c.y }]);
    await touchEv('touchEnd', []);
  } else { await page.mouse.move(w / 2, h / 2); for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -120); }
  await page.waitForTimeout(700);
  check(`${name} zoom`, (await ev(() => __ir.zoom())) > z0 * 1.2, `${z0} to ${await ev(() => __ir.zoom())}`);
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
