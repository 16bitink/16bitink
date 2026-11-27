import type { GameHost } from '@16bitink/game-sdk';
import type { Deps } from '../src/app/deps';
import { mountWith } from '../src/index';
import type { Command } from '../src/sim/types';
import { FAKE_DEF, FakeCity } from './fakeCity';
import { FakeWorld } from './fakeWorld';
import { loadFonts } from './fonts';

/**
 * Every InkRoad screen, with a fake city and a fake world (no traffic, no drawing).
 *   ?screen=menu|desk|wall|hud|junction|road|ghost|yearStart|review|yearEnd|letter|replaced|cityDone|esc
 *   ?owner=1  as an owner     ?year=N  start year    ?speed=N
 * window.__ready is true once the screen is up (dev/snap.mjs waits for it).
 */
const q = new URLSearchParams(location.search);
const owned = q.get('owner') === '1';
const worlds: FakeWorld[] = [];
const deps: Deps = {
  content: { free: () => [FAKE_DEF], installPaid: () => [], createCity: (_d, _s, snap) => new FakeCity(snap) as never, cityAtYear: (_d, _s, y) => new FakeCity({ year: y }) as never },
  createWorld: () => { const w = new FakeWorld(); worlds.push(w); return w; },
};
const host: GameHost = {
  unlocked: owned, storage: window.localStorage, price: '$4.99', loadContent: async () => ({}), onBuy: (w) => console.info('[buy]', w),
  onExit: () => console.info('[exit]'), track: (e) => console.info('[track]', e), allLevelsOpen: q.get('all') === '1',
};

async function show(): Promise<void> {
  await loadFonts();
  if (q.get('fresh') !== '0') window.localStorage.removeItem('inkroad.save');
  const { app } = mountWith(document.getElementById('game')!, host, deps);
  Object.assign(window, { __app: app });
  await app.ready;
  const screen = q.get('screen') ?? 'menu';
  const year = Number(q.get('year') ?? 1);
  if (screen === 'desk' || screen === 'wall') app.desk();
  if (screen === 'wall') (document.querySelector('[data-act="wall"]') as HTMLElement | null)?.click();
  if (!['menu', 'desk', 'wall'].includes(screen)) await play(app, screen, year);
  setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 900);
}

const frames = (n: number): Promise<void> => new Promise((r) => { let i = 0; const f = (): void => { if (++i >= n) r(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });

async function play(app: import('../src/app/app').App, screen: string, year: number): Promise<void> {
  app.devPlay(1, 1);
  await frames(3);
  const s = app.current!;
  const city = s.city as unknown as FakeCity;
  city.year = year;
  const go = async (cmd: Command = { t: 'next' }): Promise<void> => { s.apply(cmd); await frames(3); };
  if (screen === 'yearStart') return;
  await go();
  s.setSpeed(Number(q.get('speed') ?? 1) as 1);
  const w = worlds.at(-1)!;
  if (screen === 'junction') w.selection = { kind: 'junction', id: 1 };
  if (screen === 'road') w.selection = { kind: 'road', id: 1 };
  if (screen === 'ghost') w.ghost = { cmd: { t: 'next' }, quote: { ok: true, cost: 84, land: 12, works: 1, warn: 'Runs past 3 homes: noise' }, label: 'New avenue', at: { x: 0, y: 0 }, dragging: false };
  if (screen === 'letter') { city.year = 2; city.season = 1; }
  if (screen === 'review' || screen === 'letter') s.city.advance(200);
  if (q.get('bare') === '1') {
    city.commissions = [];
    for (const l of Object.values(city.priceLimits) as { open: boolean }[]) l.open = false;
    Object.defineProperty(city, 'vote', { get: () => null });
  }
  if (screen === 'yearEnd') { city.phase = 'yearEnd'; city.plates[0] = 2; }
  if (screen === 'replaced') { city.year = 3; city.season = 1; city.advance(200); }
  if (screen === 'cityDone') { city.year = 10; city.phase = 'cityDone'; city.plates = [3, 2, 3, 1, 2, 3, 2, 0, 1, 3]; }
  if (screen === 'esc') (document.querySelector('[data-act="menu"]') as HTMLElement).click();
}

void show();
