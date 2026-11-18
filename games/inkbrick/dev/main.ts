import type { GameEvent } from '@16bitink/game-sdk';
import caveatUrl from '../../../apps/web/src/assets/fonts/caveat.woff2?url';
import { mount } from '../src/index';
import { devDailyHost } from './dailyHost';
import { SCRATCH } from './scratch';

// Set by vite.config.ts from DEV_UNLOCK / DEV_ALL_LEVELS when the dev server starts.
declare const __DEV_UNLOCK__: boolean;
declare const __DEV_ALL_LEVELS__: boolean;

/**
 * The whole game, as the website mounts it, with a local daily host.
 *   ?level=N             straight into level N
 *   ?daily=YYYY-MM-DD    straight into that day's daily (?beat=SECONDS: as a challenge link)
 *   ?scratch=dark|boss|pieces   a scratch level (dev/scratch.ts)
 *   ?bot=novice|decent|skilled   the engine's bot plays (window.__ib: frame stats and event marks)
 *   ?screen=map|calendar|looks   open that screen
 *   ?today=YYYY-MM-DD    fake today's date; ?days=N extra days played (milestones)
 *   ?owner=1 / ?all=1    play as an owner / with every level open (as DEV_UNLOCK / DEV_ALL_LEVELS)
 * window.__ready turns true once the asked-for screen is up (dev/snap.mjs waits for it).
 */
const query = new URLSearchParams(location.search);
const owned = __DEV_UNLOCK__ || query.get('owner') === '1';
const allOpen = __DEV_ALL_LEVELS__ || query.get('all') === '1';

async function loadFont(): Promise<void> {
  try {
    const face = new FontFace('Caveat', `url(${caveatUrl}) format('woff2')`, { weight: '400 700' });
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    console.warn('[dev] Caveat did not load', e);
  }
}

await loadFont();
const handle = mount(document.getElementById('game')!, {
  unlocked: owned,
  allLevelsOpen: allOpen,
  cheats: allOpen,
  storage: window.localStorage,
  loadContent: async () => JSON.parse(JSON.stringify((await import('../content/paid')).INKBRICK_PAID_LEVELS)) as unknown,
  onBuy: (where) => alert(`Checkout would open here (${where ?? 'unknown'})`),
  price: '$4.99',
  onExit: () => alert('Exit to catalog'),
  track: (e: GameEvent) => console.info('[track]', e),
  daily: devDailyHost(query, owned),
});
const app = handle.app;
await app.ready;
const level = Number(query.get('level'));
const screen = query.get('screen');
const daily = query.get('daily');
const scratch = SCRATCH[query.get('scratch') ?? ''];
if (scratch) app.play(scratch);
else if (daily && !query.has('beat')) await app.daily?.open(daily);
else if (Number.isInteger(level) && level > 0) app.devPlay(level);
else if (screen === 'map') app.map();
else if (screen === 'calendar') await app.daily?.calendar();
else if (screen === 'looks') app.wardrobe(() => app.menu());
(window as unknown as { __app: unknown }).__app = app;
setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 800);
