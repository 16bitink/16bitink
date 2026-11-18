/** dev/contact.html: every frozen InkSnake daily drawn small, with its dials and the bot's numbers, for the owner's weekly veto. */
import { EVENTS } from '@16bitink/game-sdk';
import { DAILY_MONTHS } from '../content/daily/index';
import { ruleLine } from '../src/level/daily';
import { BOARD, type LevelDef, type ZoneDef } from '../src/level/types';
import { SNAKE_SPECS } from '../src/logic/species';

interface Entry {
  readonly date: string;
  readonly level: LevelDef;
  readonly layout: string;
  readonly plan: { readonly weekday: number; readonly season: string; readonly guest: boolean; readonly goal: string };
  readonly bot: { readonly wins: number; readonly times: readonly number[]; readonly mean: number; readonly causes: readonly string[] };
  readonly band: readonly [number, number];
  readonly ok: boolean;
}

const SCALE = 0.25;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ZONE_FILL: Readonly<Record<string, string>> = { water: '#8fc3e0', land: '#e6d3a3', sand: '#ecdcae', tree: '#2f7a3a', sun: '#f3d36b', grass: '#c9dd8a' };
const GROUND: Readonly<Record<string, string>> = { winter: '#f4f6f8', autumn: '#d9c99a', spring: '#cfdca0', summer: '#e2d49a' };

function zonePath(g: CanvasRenderingContext2D, z: ZoneDef): void {
  g.beginPath();
  if (z.shape === 'circle') g.arc(z.x, z.y, z.r, 0, Math.PI * 2);
  else if (z.shape === 'rect') g.rect(z.x, z.y, z.w, z.h);
  else z.points.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
}

function draw(level: LevelDef): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BOARD.w * SCALE * 2;
  c.height = BOARD.h * SCALE * 2;
  const g = c.getContext('2d');
  if (!g) return c;
  g.scale(SCALE * 2, SCALE * 2);
  g.fillStyle = GROUND[level.season ?? 'autumn'] ?? '#d9c99a';
  g.fillRect(0, 0, BOARD.w, BOARD.h);
  for (const z of level.zones ?? []) {
    zonePath(g, z);
    g.globalAlpha = z.kind === 'tree' ? 0.75 : 0.9;
    g.fillStyle = ZONE_FILL[z.kind] ?? '#ccc';
    g.fill();
  }
  g.globalAlpha = 0.85;
  g.fillStyle = '#5f9e4f';
  for (const cv of level.cover ?? []) {
    g.beginPath();
    g.arc(cv.x, cv.y, cv.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  for (const s of level.solids ?? []) {
    g.fillStyle = s.look === 'present' ? '#c0392b' : '#6b4a2b';
    if (s.kind === 'circle') {
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      g.fill();
    } else g.fillRect(s.x, s.y, s.w, s.h);
  }
  g.fillStyle = '#222';
  for (const p of level.spots ?? []) g.fillRect(p.x - 6, p.y - 6, 12, 12);
  g.fillStyle = '#e8c33a';
  for (const p of level.nests ?? []) {
    g.beginPath();
    g.arc(p.x, p.y, 9, 0, Math.PI * 2);
    g.fill();
  }
  // The start: a red dot and its heading.
  g.strokeStyle = '#d33';
  g.fillStyle = '#d33';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(level.start.x, level.start.y, 12, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(level.start.x, level.start.y);
  g.lineTo(level.start.x + Math.cos(level.heading) * 60, level.start.y + Math.sin(level.heading) * 60);
  g.stroke();
  if (level.dark) {
    g.fillStyle = 'rgba(10,10,40,0.35)';
    g.fillRect(0, 0, BOARD.w, BOARD.h);
  }
  return c;
}

function goalText(l: LevelDef): string {
  const g = l.goal;
  if (!g) return 'grow';
  if (g.kind === 'rush') return `rush ${g.seconds}s`;
  if (g.kind === 'feast') return `feast ${g.count} ${g.food}`;
  if (g.kind === 'golden') return `golden ×${g.count}`;
  return `boss ${l.boss?.kind ?? ''} hp ${l.boss?.hp ?? '?'}`;
}

function card(e: Entry): HTMLElement {
  const l = e.level;
  const div = document.createElement('div');
  div.className = `day ${e.plan.weekday === 0 ? 'sun' : e.plan.weekday === 6 ? 'sat' : ''} ${l.event ? 'event' : ''}`;
  div.append(draw(l));
  const info = document.createElement('div');
  const snake = SNAKE_SPECS[l.snake]?.name ?? l.snake;
  const prey = l.prey.map((p) => `${p.kind}×${p.count}`).join(', ');
  const enemies = (l.enemies ?? []).map((x) => `${x.kind}${x.count ? `×${x.count}` : ''}`).join(', ') || 'none';
  info.innerHTML = `<b>${e.date} ${DAYS[e.plan.weekday] ?? ''} · ${e.plan.season}${l.event ? ` · ${EVENTS[l.event].name}` : ''}</b>`
    + `"${l.name}"<br>${l.place} · <span class="${e.plan.guest ? 'guest' : ''}">${snake}${e.plan.guest ? ' (guest)' : ''}</span><br>`
    + `goal <b style="display:inline">${goalText(l)}</b> · ${ruleLine(l.rule!)}<br>`
    + `${e.layout}<br>prey ${prey}<br>enemies ${enemies}${l.treats ? ` · treats ${l.treats.kind}×${l.treats.count}` : ''}<br>`
    + `length ${l.length}→${l.target} · par ${l.par}s${l.lives ? ` · ${l.lives} life` : ''}<br>`
    + `<span class="${e.ok ? '' : 'miss'}">bot ${e.bot.wins}/3 wins: ${e.bot.times.map((t) => `${Math.round(t)}s`).join(', ')} (mean ${Math.round(e.bot.mean)}s, band ${e.band[0]}–${e.band[1]})${e.bot.causes.length ? ` · lost: ${e.bot.causes.join(', ')}` : ''}</span><br>`
    + `tomorrow: ${l.tomorrow ? `${l.tomorrow.place}, ${l.tomorrow.snake}, ${l.tomorrow.rule}` : '—'}`;
  div.append(info);
  return div;
}

const sheet = document.getElementById('sheet');
const entries = DAILY_MONTHS.flatMap((m) => Object.values((m as { days: Record<string, Entry> }).days)).sort((a, b) => a.date.localeCompare(b.date));
sheet?.append(...entries.map(card));
