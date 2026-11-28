// The browser-level teleport detector. Records every drawn car each frame (car-layer cars by traffic uid, parked
// pictures by uid, manoeuvre pictures by uid) and flags any car drawn more than JUMP px plus its speed from where it
// was drawn last frame, across the hand-offs car layer -> manoeuvre -> parked picture and back, and any car that
// appears or vanishes away from a gate or a building entrance. Runs at 1x, with pauses, then at 4x.
//   node dev/teleSnap.mjs [--q "year=3&warm=20"] [--secs 30] [--base http://localhost:5187/view.html] [--zoom 1.6]
// Needs the dev server (vite on 5187: `npx vite dev --port 5187` in games/inkroad). Exit code 1 when anything jumps.
import { chromium } from 'playwright-core';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const base = arg('base', 'http://localhost:5187/view.html');
const secs = Number(arg('secs', '30'));
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`${base}?bare=1&${arg('q', 'year=3&warm=20')}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });

await page.evaluate((zoom) => {
  const JUMP = 3; // px a drawn car may be off its last frame's place, beyond what its speed allows
  const SPEED_SLACK = 1.6; // its speed this frame may be this much more than last step's (it speeds up)
  const FADED = 0.12; // the camera fade and covered road segments can hide cars
  const EDGE = 50; // px inside the camera view a car must be to count (the rest may leave the view)
  const GATE = 90;
  const ir = window.__ir, scene = ir.scene, city = ir.city;
  if (zoom > 0) scene.rig?.setZoom?.(zoom);
  const gates = city.junctions.filter((j) => j.gate !== undefined).map((j) => ({ x: j.x, y: j.y }));
  const tally = (window.__tele = { frames: 0, counts: {}, samples: [] });
  const flag = (why, d) => { tally.counts[why] = (tally.counts[why] ?? 0) + 1; if (tally.samples.length < 60) tally.samples.push({ why, clock: +city.clock.toFixed(2), ...d }); };
  let last = new Map(), lastClock = city.clock;
  const nearGate = (p) => gates.some((g) => Math.hypot(g.x - p.x, g.y * 0.8 - p.y) < GATE || Math.hypot(g.x - p.x, g.y - p.y) < GATE);
  function drawn() {
    const out = new Map();
    for (const s of scene.cars.slots) if (s && s.uid !== 0 && s.img.visible && !s.held) out.set(`c${s.uid}`, { x: s.img.x, y: s.img.y, a: s.img.alpha, v: s.speed });
    for (const sh of scene.parked.shown.values()) {
      let used = 0;
      for (const car of sh.view.cars) {
        if (car.indoor || scene.parked.held.has(car.uid) || !scene.parked.poses.has(car.uid)) continue;
        const img = sh.imgs[used++];
        if (img && img.visible) out.set(`p${car.uid}`, { x: img.x, y: img.y, a: img.alpha, v: 0 });
      }
    }
    const moves = scene.moves.core;
    for (let i = 0; i < moves.active; i++) {
      const move = moves.at(i);
      if (move.tag.visible) out.set(`m${move.uid}`, { x: move.tag.x, y: move.tag.y, a: move.tag.alpha, v: 30 });
    }
    return out;
  }
  scene.events.on('postupdate', () => {
    const cam = scene.cameras.main.worldView;
    const inView = (p) => p.x > cam.x + EDGE && p.x < cam.right - EDGE && p.y > cam.y + EDGE && p.y < cam.bottom - EDGE;
    const now = drawn();
    // Sim seconds this frame: the clock's step, or the frame's wall time at the game's speed (the clock moves in
    // whole sim steps while the cars glide every frame, and it restarts each drawn day), whichever is more.
    const byFrame = (scene.game.loop.delta / 1000) * (ir.getSpeed?.() ?? 1);
    const dtSim = Math.max(byFrame, city.clock >= lastClock ? city.clock - lastClock : 0);
    lastClock = city.clock;
    tally.frames++;
    // The first frame only learns where everything is.
    if (tally.frames === 1) { last = now; return; }
    const near = (p, set, reach) => { for (const q of set.values()) if (Math.hypot(q.x - p.x, q.y - p.y) <= reach) return true; return false; };
    const reachOf = (p) => JUMP + Math.max(p.v, 30) * SPEED_SLACK * dtSim;
    for (const [k, p] of now) {
      const was = last.get(k);
      if (was) {
        const d = Math.hypot(p.x - was.x, p.y - was.y);
        if (d > reachOf(was) && inView(p)) flag(`${k[0]} jumps`, { k, d: +d.toFixed(1), x: Math.round(p.x), y: Math.round(p.y) });
        continue;
      }
      if (!inView(p) || p.a < FADED || nearGate(p)) continue;
      if (!near(p, last, JUMP + 30 * SPEED_SLACK * dtSim + 2)) flag(`${k[0]} appears`, { k, x: Math.round(p.x), y: Math.round(p.y) });
    }
    for (const [k, p] of last) {
      if (now.has(k) || !inView(p) || p.a < FADED || nearGate(p)) continue;
      if (!near(p, now, reachOf(p) + 2)) flag(`${k[0]} vanishes`, { k, x: Math.round(p.x), y: Math.round(p.y) });
    }
    last = now;
  });
}, Number(arg('zoom', '0')));

const wait = (s) => page.waitForTimeout(s * 1000);
const say = async (label) => console.log(label, JSON.stringify(await page.evaluate(() => ({ frames: window.__tele.frames, counts: window.__tele.counts, clock: +window.__ir.city.clock.toFixed(1) }))));
await page.evaluate(() => window.__ir.setSpeed(1));
await wait(secs / 2);
await page.evaluate(() => window.__ir.setSpeed(0));
await wait(1.5);
await page.evaluate(() => window.__ir.setSpeed(1));
await wait(secs / 2);
await say('1x');
await page.evaluate(() => window.__ir.setSpeed(4));
await wait(secs / 2);
await page.evaluate(() => window.__ir.setSpeed(0));
await wait(1);
await page.evaluate(() => window.__ir.setSpeed(4));
await wait(secs / 2);
await say('1x+4x');
const result = await page.evaluate(() => window.__tele);
for (const s of result.samples.slice(0, 25)) console.log(' ', JSON.stringify(s));
await browser.close();
process.exit(Object.keys(result.counts).length > 0 ? 1 : 0);
