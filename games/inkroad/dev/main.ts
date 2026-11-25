import type { GameEvent } from '@16bitink/game-sdk';
import { mount } from '../src/index';
import { PAID_CITIES } from '../content/paid';
import { loadFonts } from './fonts';

// Set by vite.config.ts from DEV_UNLOCK / DEV_ALL_LEVELS when the dev server starts.
declare const __DEV_UNLOCK__: boolean;
declare const __DEV_ALL_LEVELS__: boolean;

/**
 * The whole game, as the website mounts it.
 *   ?city=N&year=N   straight into that city and year
 *   ?owner=1 / ?all=1   play as an owner / with every year open
 *   ?speed=N   starting speed (0, 1, 2, 4)
 * window.__app is the App; window.__ready turns true once the asked-for screen is up.
 */
const q = new URLSearchParams(location.search);
const owned = __DEV_UNLOCK__ || q.get('owner') === '1';
const allOpen = __DEV_ALL_LEVELS__ || q.get('all') === '1';

await loadFonts();
const handle = mount(document.getElementById('game')!, {
  unlocked: owned, allLevelsOpen: allOpen, cheats: allOpen, storage: window.localStorage, price: '$4.99',
  loadContent: async () => JSON.parse(JSON.stringify(PAID_CITIES)) as unknown,
  onBuy: (where) => alert(`Checkout would open here (${where ?? 'unknown'})`),
  onExit: () => alert('Exit to catalog'),
  track: (e: GameEvent) => console.info('[track]', e),
}) as unknown as { app: import('../src/app/app').App };
const app = handle.app;
await app.ready;
const city = Number(q.get('city'));
if (city > 0) {
  app.devPlay(city, Number(q.get('year') ?? 1));
  if (q.has('speed')) app.current?.setSpeed(Number(q.get('speed')) as 1);
}
(window as unknown as { __app: unknown }).__app = app;
setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 800);
