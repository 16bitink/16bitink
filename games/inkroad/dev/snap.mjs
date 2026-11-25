// Screenshots of the UI dev page: node dev/snap.mjs OUT_DIR [screens,comma] [base url]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2];
const screens = (process.argv[3] ?? 'menu,desk,wall,yearStart,hud,junction,road,ghost,review,letter,yearEnd,replaced,cityDone,esc').split(',');
const base = process.argv[4] ?? 'http://localhost:5183/ui.html';
const sizes = [['desk', 1440, 900, 1], ['phone', 844, 390, 3], ['se', 667, 375, 2]];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const audit = `(() => { const MIN=14; return {
  small: [...document.querySelectorAll('.ikr button, .ikr [data-act]')].filter((b) => b.offsetWidth && !b.closest('[hidden]') && (b.offsetWidth < 44 || b.offsetHeight < 44)).map((b) => b.className + ':' + b.textContent.trim().slice(0,12)),
  tiny: [...document.querySelectorAll('.ikr *')].filter((e) => e.offsetWidth && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < MIN).map((e) => e.className + ':' + e.textContent.trim().slice(0,12)) }; })()`;
for (const [name, w, h, dpr] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: name !== 'desk' });
  for (const s of screens) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`[${name}/${s}] pageerror`, e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log(`[${name}/${s}] console`, m.text()); });
    const extra = s === 'cityDone' || s === 'wall' ? '' : '';
    await page.goto(`${base}?screen=${s}${extra}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }).catch(() => console.log(`[${name}/${s}] not ready`));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}-${s}.png` });
    if (name !== 'desk' && process.env.AUDIT) console.log(name, s, JSON.stringify(await page.evaluate(audit)));
    await page.close();
  }
  await ctx.close();
}
await browser.close();
