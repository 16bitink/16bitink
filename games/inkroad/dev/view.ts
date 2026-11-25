import { SAFFRON } from '../src/city/defs/saffron';
import { createCity } from '../src/city/city';
import { nobody } from '../src/city/bots/beginner';
import { planner } from '../src/city/bots/planner';
import { playYear } from '../src/city/bots/play';
import { PERIODS } from '../src/sim/constants';
import type { CityView, ToolId } from '../src/sim/types';
import { createWorld } from '../src/scenes/world';
import type { Overlay, WorldPort } from '../src/scenes/port';
import { loadFonts } from './fonts';
import { galleryCity } from './gallery';
import { stressCity } from './stress';

/**
 * The world view alone, on the real city.
 *   ?year=N       a bot plays up to year N first (seconds each)
 *   ?warm=S       run S seconds of the day before showing (default 0)
 *   ?gallery=1 every kind of road    ?stress=700 that many dummy cars
 *   ?tilt= ?rise= other camera angles    ?bare=1 no buttons    ?speed=0|1|2|4   ?bot=nobody
 * window.__ir: probe, city, world. window.__ready when drawn.
 */
const q = new URLSearchParams(location.search);
const num = (k: string, d: number): number => (Number.isFinite(Number(q.get(k))) && q.has(k) ? Number(q.get(k)) : d);
const TOOLS: readonly (ToolId | null)[] = [null, 'street', 'avenue', 'boulevard', 'highway', 'remove', 'junction', 'flyover', 'underpass', 'kerb', 'parking', 'toll', 'bus', 'buslane', 'metro', 'oneway', 'square'];
const OVERLAYS: readonly Overlay[] = ['none', 'flow', 'parking', 'anger', 'money'];

function makeCity(): CityView {
  const city = createCity(SAFFRON, 7);
  for (let y = 1; y < num('year', 1) && city.phase !== 'replaced'; y++) {
    playYear(city, q.get('bot') === 'nobody' ? nobody : planner, 0);
    if (city.phase === 'yearEnd') city.apply({ t: 'next' });
  }
  if (city.phase === 'yearStart') city.apply({ t: 'next' });
  for (let s = 0; s < num('warm', 0) && city.phase === 'day'; s += 1) city.advance(1);
  return city;
}

await loadFonts().catch((e: unknown) => console.warn('[view] fonts', e));
const real = makeCity();
const city = q.get('gallery') === '1' ? galleryCity(real) : q.has('stress') ? stressCity(real, num('stress', 700)) : real;
let speed = num('speed', 1);
const say = document.getElementById('say')!;
let hint = '';
const world: WorldPort = createWorld(document.getElementById('game')!, city, {
  frame: (dt) => {
    if (city.phase === 'day') city.advance(dt * speed);
    else if (speed > 0) city.apply({ t: 'next' });
    world.handleEvents(city.drainEvents());
  },
  onHint: (t) => { hint = t; },
  onGhost: (g) => { hint = g ? `${g.label}: ${g.quote.ok ? g.quote.cost : g.quote.why}` : ''; },
  onSelect: (s) => { hint = s ? `${s.kind} ${s.kind === 'car' ? s.slot : s.id}` : ''; },
  onBuilt: (c, r) => { hint = `${c.t}: ${r.ok ? 'built' : r.why}`; },
}, { probe: true });

const bar = document.getElementById('bar')!;
const button = (text: string, f: () => void): void => {
  const b = document.createElement('button');
  b.textContent = text;
  b.onclick = f;
  bar.append(b);
};
TOOLS.forEach((t) => button(t ?? 'hand', () => world.setTool(t)));
OVERLAYS.forEach((o) => button(`view ${o}`, () => world.setOverlay(o)));
[0, 1, 2, 4].forEach((s) => button(`${s}x`, () => { speed = s; }));
button('BUILD', () => world.confirm());
button('cancel', () => world.cancel());
button('whole map', () => world.overview());
if (q.get('bare') === '1') document.body.classList.add('bare');

await world.ready;
Object.assign((window as unknown as { __ir: object }).__ir, { city, world, setSpeed: (s: number) => { speed = s; }, PERIODS });
(window as unknown as { __ready: boolean }).__ready = true;
setInterval(() => {
  const p = (window as unknown as { __ir: { fps(): { avg: number; p95ms: number }; cars(): number } }).__ir;
  say.textContent = `${city.def.name} y${city.year} s${city.season} ${city.period} ${city.hour.toFixed(1)}h  ${p.cars()} cars  ${p.fps().avg} fps (p95 ${p.fps().p95ms} ms)\n${city.money} coins\n${hint}`;
}, 500);
