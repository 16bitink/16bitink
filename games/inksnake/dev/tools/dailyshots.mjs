// Screenshots the daily hunt's screens: node dev/tools/dailyshots.mjs <url> <outDir> <hunt...>
// For each sample (ice, xmas, rival, golden, newyear) as today's: the card before, the board mid-hunt, and the end card.
// Also the calendar and the album once. Reports page errors.
import { chromium } from 'playwright-core';

const [url, out, ...hunts] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const wait = (page, ms) => page.waitForTimeout(ms);
try {
  const viewport = process.env.PHONE ? { width: 390, height: 844 } : { width: 1280, height: 760 };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const hunt of hunts) {
    await page.goto(`${url}?hunt=${hunt}`, { waitUntil: 'networkidle' });
    await page.evaluate((src) => { window.__inksnakeSrc = src; }, new URL('../../src', import.meta.url).pathname);
    await page.waitForFunction(() => (window.__game?.scene?.getScenes(true).length ?? 0) > 0, null, { timeout: 30000 });
    await wait(page, 1500);
    const start = (mode) => page.evaluate((m) => {
      const g = window.__game;
      for (const k of ['Result', 'Hud', 'Game', 'Menu', 'Daily']) if (g.scene.isActive(k) || g.scene.isPaused(k)) g.scene.stop(k);
      g.scene.start('Daily', m);
    }, mode);
    const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    await start({ mode: 'intro', date: today });
    await wait(page, 1500);
    await page.screenshot({ path: `${out}/${hunt}-intro.png` });
    await page.evaluate(() => {
      const g = window.__game;
      const daily = g.scene.getScene('Daily');
      const btn = daily.children.list.find((c) => c.list).list.find((c) => c.list && c.list[1]?.text === 'Hunt!');
      btn?.emit('pointerup', { downX: 0, downY: 0, x: 0, y: 0 });
    });
    await wait(page, 300);
    const playing = await page.evaluate(() => window.__game.scene.isActive('Game'));
    if (!playing) {
      // The painted button fires on its own press logic: start the hunt directly instead.
      await page.evaluate(async (date) => {
        const g = window.__game;
        const level = await g.registry.get('host').daily.load(date);
        g.scene.stop('Daily');
        const { parseLevel } = await import(`/@fs${location.pathname.includes('@fs') ? '' : ''}${window.__inksnakeSrc}/level/validate.ts`);
        g.scene.start('Game', { daily: { date, level: parseLevel(level), beat: null } });
      }, today);
    }
    await wait(page, 4000);
    await page.screenshot({ path: `${out}/${hunt}-play.png` });
    await page.evaluate(() => window.__game.scene.getScene('Game').finish(true));
    await wait(page, 2600);
    await page.screenshot({ path: `${out}/${hunt}-end.png` });
  }
  if (process.env.EXTRA) {
    await page.evaluate(() => { const g = window.__game; g.scene.stop('Game'); g.scene.stop('Daily'); g.scene.start('Daily', { mode: 'calendar' }); });
    await wait(page, 1500);
    await page.screenshot({ path: `${out}/calendar.png` });
    await page.evaluate(() => { const g = window.__game; g.scene.stop('Daily'); g.scene.start('Daily', { mode: 'album' }); });
    await wait(page, 1500);
    await page.screenshot({ path: `${out}/album.png` });
    await page.evaluate(() => { const g = window.__game; g.scene.stop('Daily'); g.scene.start('Menu'); });
    await wait(page, 2500);
    await page.screenshot({ path: `${out}/menu.png` });
  }
} finally {
  if (errors.length) console.error('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
}
