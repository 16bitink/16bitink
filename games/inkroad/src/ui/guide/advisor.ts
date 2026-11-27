import { lookAhead } from '../../guide/advisor/ahead';
import { answersFor } from '../../guide/advisor/answers';
import { redCount, topProblems } from '../../guide/advisor/problems';
import { RED_SCORE, type Answer, type Problem } from '../../guide/advisor/types';
import { BUILD, joins, lineOf, look, ui } from '../../guide/parts';
import { ptOf } from '../../guide/places';
import type { GuideView } from '../../guide/types';
import type { CityView, ToolId } from '../../sim/types';
import { div, esc, Router } from '../dom';
import { num } from '../format';
import { pic } from '../pics';
import type { UiEnv } from '../types';
import type { Tip } from './controller';

/** Dewy's button and his list: the three worst things now, where, why, and what may be done. */
const EVERY_MS = 1500;
const PANEL_MS = 3000;
const IDLE_MS = 25_000;
const TIP_MS = 25_000;
const SHOW_MS = 7000;

interface Pin { readonly note: string; readonly sel: string; readonly tab: string }

export class Advisor {
  private readonly btn: HTMLElement;
  private readonly panel: HTMLElement;
  private list: readonly Problem[] = [];
  private answers: readonly (readonly Answer[])[] = [];
  private readAt = 0;
  private drawnAt = 0;
  private idleFrom = 0;
  private city: CityView | null = null;
  private pins: readonly Pin[] = [];
  private open = false;

  constructor(hud: HTMLElement, router: Router, private readonly env: () => UiEnv, private readonly tip: (t: Tip) => void) {
    this.btn = div(hud, 'advbtn paper');
    this.btn.dataset.act = 'adv';
    this.btn.setAttribute('role', 'button');
    this.btn.setAttribute('aria-label', 'What now?');
    this.btn.innerHTML = `${pic('portrait-dewy')}<span class="t">What now?</span><span class="n" hidden></span>`;
    this.panel = div(hud, 'adv paper');
    this.panel.hidden = true;
    router.add({
      adv: () => this.toggle(), advx: () => this.close(),
      advshow: (v) => this.showMe(Number(v)),
      advdo: (v) => { const [p, a] = v.split(':').map(Number); this.act(p ?? 0, a ?? 0); },
    });
    const poke = (): void => { this.idleFrom = performance.now(); };
    for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) addEventListener(ev, poke, { passive: true });
  }

  toggle(): void {
    if (this.open) return this.close();
    this.env().world?.select(null);
    this.open = true;
    this.read(performance.now(), true);
    this.draw();
  }

  close(): void {
    this.open = false;
    this.panel.hidden = true;
  }

  /** `quiet`: the guide is talking. */
  update(nowMs: number, quiet: boolean): void {
    const { city, world, speed } = this.env();
    if (city !== this.city) { this.city = city; this.pins = []; this.list = []; this.close(); }
    if (world?.selection || world?.tool) this.close();
    if (city.phase !== 'day') this.close();
    if (nowMs - this.readAt > EVERY_MS) this.read(nowMs, false);
    if (this.open && nowMs - this.drawnAt > PANEL_MS && !this.panel.matches(':active')) { this.read(nowMs, true); this.draw(); }
    const n = redCount(this.list);
    const label = this.btn.querySelector<HTMLElement>('.n')!;
    label.hidden = n === 0;
    label.textContent = String(n);
    const idle = city.phase === 'day' && speed > 0 && n > 0 && !quiet && !this.open && nowMs - this.idleFrom > IDLE_MS;
    this.btn.classList.toggle('wiggle', idle);
    this.remind();
  }

  private read(nowMs: number, deep: boolean): void {
    this.readAt = nowMs;
    const { city } = this.env();
    if (city.phase !== 'day') return;
    this.list = topProblems(city);
    if (deep) this.answers = this.list.map((p) => answersFor(city, p));
  }

  private draw(): void {
    this.drawnAt = performance.now();
    const { city } = this.env();
    this.panel.hidden = false;
    const top = this.panel.scrollTop;
    this.panel.innerHTML = `<button class="btn x" data-act="advx" aria-label="Close">x</button><h2>What now?</h2>${this.list.length ? this.list.map((p, i) => this.problem(p, i)).join('') : calm(city)}`;
    this.panel.scrollTop = top;
  }

  private problem(p: Problem, i: number): string {
    const ans = (this.answers[i] ?? []).map((a, k) => `<button class="btn" data-act="advdo" data-v="${i}:${k}"><span>${esc(a.label)}</span>${a.price !== null ? `<span class="coin">${num(a.price)}</span>` : '<em>at night</em>'}</button>`).join('');
    const icon = p.bar === 'money' ? 'ov-money' : `bar-${p.bar}`;
    return `<div class="prob${p.score >= RED_SCORE ? ' red' : ''}"><div class="ph">${pic(icon)}<div><b>${esc(p.place)}</b><p>${esc(p.cause)}</p></div>${p.at ? `<button class="btn sm" data-act="advshow" data-v="${i}">Show me</button>` : ''}</div>
      <div class="ans">${ans}</div></div>`;
  }

  private showMe(i: number): void {
    const p = this.list[i];
    if (!p?.at) return;
    const at = p.at;
    this.close();
    this.tip({ why: p.place, say: () => p.cause, target: () => ({ t: 'spot', at, r: p.r }), until: () => false, look: [at], ms: SHOW_MS });
  }

  private act(i: number, k: number): void {
    const a = this.answers[i]?.[k];
    const { world, acts } = this.env();
    if (!a || !world) return;
    this.close();
    if (a.act.t === 'night') {
      this.pins = [...this.pins, a.act];
      return acts.toast('Noted. I will remind you at the review.', 'dewy');
    }
    const t = startAnswer(a, this.env());
    if (t) this.tip(t);
  }

  /** At the review: what the player meant to do. */
  private remind(): void {
    const { card, city } = this.env();
    const pin = this.pins[0];
    if (!pin || card !== 'review' || city.phase !== 'review') return;
    this.pins = this.pins.slice(1);
    const before = JSON.stringify([city.prices, city.policies, city.commissions.map((c) => c.state)]);
    this.tip({ why: pin.note, say: () => 'Here it is.', target: () => ui(pin.sel, `[data-act=tab][data-tab=${pin.tab}]`), until: (v) => v.card !== 'review' || JSON.stringify([v.city.prices, v.city.policies, v.city.commissions.map((c) => c.state)]) !== before, ms: TIP_MS });
  }

  get showing(): boolean {
    return this.open;
  }
}

function calm(city: CityView): string {
  const a = lookAhead(city);
  return `<div class="prob"><div class="ph">${pic('portrait-dewy')}<div><b>${esc(a.title)}</b></div></div><ul>${a.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
}

const hasGhost = (v: GuideView): boolean => !!v.ghost && !v.ghost.dragging && v.ghost.quote.ok;
const buildOr = (say: string) => (v: GuideView): string => (hasGhost(v) ? 'Tap Build.' : say);

/** Put the right tool in the player's hand, at the right place; the tip leads to Build. */
function startAnswer(a: Answer, env: UiEnv): Tip | null {
  const world = env.world!;
  const { city } = env;
  const x = a.act;
  const base = { ms: TIP_MS, why: a.label };
  const drew = (tool: ToolId) => { const shape = shapeOf(city); return (v: GuideView): boolean => shapeOf(v.city) !== shape || (v.tool !== tool && !v.ghost); };
  switch (x.t) {
    case 'control': {
      const j = city.junctions.find((q) => q.id === x.node);
      if (!j) return null;
      world.setTool(null);
      world.select({ kind: 'junction', id: j.id, at: { x: j.x, y: j.y } });
      return { ...base, say: () => 'Tap it here.', target: () => ui(`.sel [data-act=control][data-v=${x.control}]`), until: (v) => v.city.junctions.find((q) => q.id === x.node)?.control === x.control || v.selection === null, look: [j] };
    }
    case 'flyover': {
      world.startFlyover(x.node, x.move);
      return { ...base, say: () => 'Tap Build.', target: () => BUILD, until: drew('flyover') };
    }
    case 'street': {
      world.setTool('street');
      return { ...base, say: buildOr('Click or tap one ring, then the other. Click it again to finish.'), target: (v) => (hasGhost(v) && v.ghost?.cmd.t === 'road' && joins(v.ghost.cmd.cells, x.plan) ? BUILD : { t: 'drag', line: lineOf(x.plan) }), until: drew('street'), look: lineOf(x.plan) };
    }
    case 'park': {
      world.setTool('parking', { park: x.kind });
      return { ...base, say: buildOr('Tap the marked place.'), target: (v) => (hasGhost(v) ? BUILD : { t: 'spot', at: x.at, r: 56, tap: true }), until: drew('parking'), look: [x.at] };
    }
    case 'roadTool': {
      world.setTool(x.tool);
      return { ...base, say: buildOr('Tap the marked road.'), target: (v) => (hasGhost(v) ? BUILD : { t: 'spot', at: x.at, r: 44, tap: true }), until: drew(x.tool), look: [x.at] };
    }
    case 'upgrade': {
      world.setTool(null);
      world.select({ kind: 'road', id: x.road, at: x.at });
      return { ...base, say: () => 'Tap Widen.', target: () => ui('.sel [data-act=upgrade]'), until: (v) => v.city.roads.find((r) => r.id === x.road)?.type === x.type || v.selection === null, look: [x.at] };
    }
    case 'line': {
      const tool = x.mode === 'express' ? 'bus' : x.mode;
      world.setTool(tool);
      return { ...base, say: buildOr('Tap the stops one after another.'), target: (v) => { const s = x.stops[Math.min(v.stops, x.stops.length - 1)]; return hasGhost(v) && v.stops >= x.stops.length ? BUILD : s ? { t: 'spot', at: ptOf(s), r: 26, tap: true } : null; }, until: drew(tool), look: x.stops.map(ptOf) };
    }
    case 'vehicles': {
      world.select({ kind: 'line', id: x.line });
      return { ...base, say: () => 'Tap the plus.', target: () => ui('.sel [data-act=veh][data-v="1"]'), until: (v) => v.selection === null };
    }
    case 'repair': {
      world.setTool(null);
      world.select({ kind: 'road', id: x.road, at: x.at });
      return { ...base, say: () => 'Tap Repair.', target: () => look('.sel [data-act=mend]'), until: (v) => v.selection === null, look: [x.at] };
    }
    default: return null;
  }
}

const shapeOf = (c: CityView): string => `${c.version}|${c.carParks.length}|${c.lines.length}|${c.projects.length}`;
