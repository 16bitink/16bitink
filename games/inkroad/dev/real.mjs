// Drives the real game: node dev/real.mjs OUT_DIR [desk|phone]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2];
const mode = process.argv[3] ?? 'desk';
const [w, h, dpr] = mode === 'phone' ? [844, 390, 3] : [1440, 900, 1];
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mode === 'phone' });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
p.on('console', (m) => { const t = m.text(); if (m.type() !== 'debug') console.log(`[${m.type()}]`, t.slice(0, 300)); });
const shot = (n) => p.screenshot({ path: `${out}/real-${mode}-${n}.png` });
const title = () => p.evaluate(() => document.querySelector('.cards:not([hidden]) h2')?.textContent ?? null);
await p.goto('http://localhost:5183/index.html?owner=1');
await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
await p.evaluate(() => localStorage.removeItem('inkroad.save'));
await p.reload();
await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
await shot('1-menu');
await p.evaluate(() => { const a = window.__app; const o = a.leaveCity.bind(a); a.leaveCity = () => { console.log('LEAVE', new Error().stack); o(); }; });
await p.click('[data-act=cont]');
await p.waitForTimeout(2500);
console.log('card:', await title());
await shot('2-yearstart');
await p.click('.cards [data-act=next]');
await p.waitForTimeout(3000);
await shot('3-day');
// a roundabout through the real UI: junction tool, tap the worst junction on the map, pick Roundabout
if (mode === 'phone') await p.click('.tgrp[data-g=Junctions] .gbtn').catch(() => {});
await p.click('[data-act=tool][data-v=junction]');
await p.waitForTimeout(300);
const at = await p.evaluate(() => {
  const s = window.__app.current; const c = s.city;
  const j = [...c.junctions].filter((q) => c.roads.length && q.arms.length > 2).sort((x, y) => c.junctionStats(y.id).wait - c.junctionStats(x.id).wait)[0];
  return { ...s.world.screenOf({ x: j.x, y: j.y }), control: j.control, n: c.junctions.length };
});
console.log('junction at', JSON.stringify(at));
await p.mouse.click(at.x, at.y);
await p.waitForTimeout(500);
await shot('4-junction');
console.log('selection:', await p.evaluate(() => JSON.stringify(window.__app.current.world.selection)));
await p.click('[data-act=control][data-v=roundabout]').catch((e) => console.log('no roundabout button', e.message.slice(0, 60)));
await p.waitForTimeout(500);
await shot('5-built');
console.log('control now:', await p.evaluate(() => window.__app.current.city.junctions.map((j) => j.control).join()));
await p.evaluate(() => window.__app.current.setSpeed(4));
const seen = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 420000) {
  const t = await title();
  if (t && t.startsWith('Year 2')) { await shot('9-year2'); break; }
  if (t) {
    const key = t + await p.evaluate(() => window.__app.current.city.season);
    if (!seen.has(key)) { seen.add(key); await p.waitForTimeout(3500); await shot(`6-${seen.size}-${t.replace(/\W+/g, '_').slice(0, 20)}`); console.log('card:', t); }
    await p.click('.cards [data-act=tab][data-v="1"]', { timeout: 500 }).catch(() => {});
    await p.waitForTimeout(300);
    if (!seen.has(key + 'tech') && await p.$('.cards [data-act=tech]')) { seen.add(key + 'tech'); await shot('7-tech'); }
    await p.click('.cards [data-act=tech]', { timeout: 500 }).catch(() => {});
    await p.click('.cards [data-act=next]').catch(() => {});
  }
  await p.waitForTimeout(1500);
}
console.log(JSON.stringify(await p.evaluate(() => { const c = window.__app.current.city; return { year: c.year, season: c.season, money: c.money, approval: c.approval, plates: c.plates }; })));
await b.close();
