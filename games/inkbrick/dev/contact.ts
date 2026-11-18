/** dev/contact.html: every frozen daily drawn small, with its numbers and layout, for the weekly review. */
import { DAILY_MONTHS } from '../content/daily/index';
import type { BrickKind, LevelDef } from '../src/sim/types';

interface Entry {
  readonly date: string;
  readonly level: LevelDef;
  readonly plan: { readonly weekday: number; readonly layout: string; readonly twist: string; readonly holeW: number; readonly goal?: string; readonly rule?: string | null };
  readonly metrics: Readonly<Record<string, number | null>>;
  readonly score: number;
}

const PX = 4;
const ROWS_SHOWN = 53;
const COLOURS: Readonly<Record<BrickKind, string>> = {
  soft: '#e3c58f', tough: '#9a6b3f', stone: '#6f6a66', x3: '#e0679a', keg: '#c0392b', pickup: '#3aa6a0',
  ice: '#9fd3e8', key: '#e8c33a', gate: '#3d3a36', lever: '#d4862b',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function draw(level: LevelDef): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36 * PX;
  c.height = ROWS_SHOWN * PX;
  const g = c.getContext('2d');
  if (!g) return c;
  for (const b of level.bricks) {
    g.fillStyle = b.armour ? '#5e3b1d' : COLOURS[b.kind];
    g.globalAlpha = b.hidden ? 0.35 : 1;
    g.fillRect(b.x * PX, b.y * PX, b.w * PX - (b.w > 1 ? 0.5 : 0), b.h * PX);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#7a4fb0';
  for (const f of level.flips ?? []) g.strokeRect(f.x * PX + 0.5, f.y * PX + 0.5, f.w * PX - 1, f.h * PX - 1);
  g.fillStyle = '#d04a8a';
  for (const b of level.bumpers ?? []) {
    g.beginPath();
    g.arc((b.x / 15) * PX, (b.y / 15) * PX, (b.r / 15) * PX, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#e2572b';
  for (const c of level.crabs ?? []) g.fillRect(c.x0 * PX, c.y * PX, 3 * PX, 2 * PX);
  if (level.tide) {
    g.fillStyle = '#2b6cb0';
    g.fillRect(0, level.tide.line * PX, c.width, 1);
  }
  if (level.rescue && level.goal === 'rescue') {
    g.fillStyle = '#18a558';
    g.fillRect(level.rescue.x * PX, level.rescue.y * PX, 2 * PX, 2 * PX);
  }
  g.fillStyle = '#f5f5f0';
  g.strokeStyle = '#222';
  for (const p of [...(level.goal === 'pearls' ? level.pearls ?? [] : []), ...(level.dailyPearl ? [level.dailyPearl] : [])]) {
    g.beginPath();
    g.arc((p.x + 0.5) * PX, (p.y + 0.5) * PX, PX * 0.8, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.fillStyle = 'rgba(40,40,40,0.5)';
  for (const s of level.shutters ?? []) g.fillRect(s.x * PX, s.y * PX, s.w * PX, s.h * PX);
  g.fillStyle = '#333';
  for (const s of level.spinners ?? []) g.fillRect((s.x - s.length / 2) * PX, s.y * PX + 1, s.length * PX, 1);
  g.fillStyle = '#2b6cb0';
  for (const p of level.whirlpools ?? []) for (const e of [p.a, p.b]) g.fillRect(e.x * PX - 1, e.y * PX - 1, PX + 2, PX + 2);
  if (level.dark) {
    g.fillStyle = 'rgba(10,10,30,0.35)';
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : `${Math.round(v * 100)}%`);
const sec = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : `${Math.round(v)}s`);

function card(e: Entry): HTMLElement {
  const div = document.createElement('div');
  div.className = `day ${e.plan.weekday === 0 ? 'sun' : e.plan.weekday === 6 ? 'sat' : ''}`;
  div.append(draw(e.level));
  const m = e.metrics;
  const info = document.createElement('div');
  const goal = e.level.goal ?? 'clear';
  const rule = e.level.rule ? `${e.level.rule}${e.level.rule === 'current' ? (e.level.ruleDir === -1 ? ' ←' : ' →') : ''}` : 'no rule';
  info.innerHTML = `<b>${e.date} ${DAYS[e.plan.weekday] ?? ''}</b>${e.level.name}<br>${e.plan.layout}${e.plan.twist !== 'none' ? ` + ${e.plan.twist}` : ''} · hole ${e.plan.holeW}<br>`
    + `<span class="goal">goal <b>${goal}</b> · rule <b>${rule}</b></span><br>`
    + `aim ${pct(m.aimWindow)} · novice ${pct(m.noviceClear)}<br>clear ${sec(m.clearSkilled)} · cascade ${pct(m.cascade)}<br>`
    + `${m.bricks ?? '?'} bricks · par ${e.level.par}s · <span class="${e.score > 3 ? 'miss' : ''}">score ${e.score.toFixed(1)}</span>`;
  div.append(info);
  return div;
}

const sheet = document.getElementById('sheet');
const entries = DAILY_MONTHS.flatMap((m) => Object.values((m as { days: Record<string, Entry> }).days)).sort((a, b) => a.date.localeCompare(b.date));
sheet?.append(...entries.map(card));
