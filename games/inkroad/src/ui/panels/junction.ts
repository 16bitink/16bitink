import { signalPhases } from '../../sim/network';
import type { Network } from '../../sim/trafficTypes';
import type { Control, Junction, Movement } from '../../sim/types';
import { esc } from '../dom';
import { num, pct } from '../format';
import { advised, CONTROL_ICONS, CONTROL_NAMES, CONTROL_ORDER, CONTROL_WORDS, EFFECT_WORDS, effectOf, inflow, type Inflow } from './controls';
import { kv, quoted, rebalance, type PanelCtx } from './shared';

const COMPASS = ['East', 'South', 'West', 'North'] as const;
export const TOP_MOVEMENTS = 3;
const FEW = 4; // cars seen before anyone can judge

const PICK_YEAR = 1; // of the first city: Zaza points at one

function choices(c: PanelCtx, j: Junction): string {
  const open = CONTROL_ORDER.filter((id) => id === j.control || c.city.controls.includes(id));
  const f = inflow(c.city.movements(j.id));
  const pick = c.city.def.number === 1 && c.city.year === PICK_YEAR ? advised(j.control, open, f) : null;
  return open.map((id) => choice(c, j, id, f, pick === id)).join('');
}

function choice(c: PanelCtx, j: Junction, id: Control, f: Inflow, pick: boolean): string {
  const q = quoted(c.city, { t: 'control', node: j.id, control: id });
  const cur = j.control === id;
  const eff = effectOf(j.control, id, f);
  const works = q.works > 0 ? `<em class="works">${q.works} ${q.works === 1 ? 'season' : 'seasons'} of works</em>` : '';
  const right = cur ? '<em class="now">Here now</em>' : q.cost > 0 ? `<span class="coin">${num(q.cost)}</span>` : '<em>free</em>';
  const told = cur || f.cars < FEW ? '' : `<span class="eff ${eff}">${q.ok ? EFFECT_WORDS[eff] : esc(q.why ?? 'Not yet')}</span>`;
  return `<button class="btn choice${cur ? ' on' : ''}${pick ? ' pick' : ''}" data-act="control" data-v="${id}" ${cur || !q.ok ? 'disabled' : ''}>
    ${CONTROL_ICONS[id]}<span class="ctext"><span class="cname"><b>${CONTROL_NAMES[id]}</b><span class="cprice">${right}</span></span><span>${CONTROL_WORDS[id]}</span>${told}${works}</span>${pick ? '<span class="ribbon">Zaza: this one!</span>' : ''}</button>`;
}

/** The compass side of a road as it leaves a junction. */
function side(c: PanelCtx, j: Junction, roadId: number): string {
  const r = c.city.roads.find((x) => x.id === roadId);
  const pts = r?.line ?? [];
  const far = pts.length ? (Math.hypot(pts[0]!.x - j.x, pts[0]!.y - j.y) < Math.hypot(pts[pts.length - 1]!.x - j.x, pts[pts.length - 1]!.y - j.y) ? pts[Math.min(3, pts.length - 1)]! : pts[Math.max(0, pts.length - 4)]!) : null;
  if (!far) return '';
  const q = Math.round(Math.atan2(far.y - j.y, far.x - j.x) / (Math.PI / 2));
  return COMPASS[((q % 4) + 4) % 4]!;
}

/** Names for the green phases, in the order of Junction.split: who gets green together (sim's signalPhases). */
export function phaseNames(c: PanelCtx, j: Junction): string[] {
  try {
    const net = { roads: c.city.roads, links: c.city.links, junctions: c.city.junctions } as unknown as Network;
    return signalPhases(net, j.id).map((arms, i) => [...new Set(arms.map((a) => side(c, j, a)).filter(Boolean))].join(' and ') || `Green ${i + 1}`);
  } catch {
    return [];
  }
}

function sliders(c: PanelCtx, j: Junction): string {
  if (j.control !== 'signal' && j.control !== 'smart') return '';
  const names = phaseNames(c, j);
  const rows = j.split.map((s, i) => `<div class="split"><span>${esc(names[i] ?? `Green ${i + 1}`)}</span><b data-k="split-${i}">${pct(s)}</b><input type="range" min="10" max="90" value="${Math.round(s * 100)}" data-act="split" data-i="${i}"></div>`);
  return `<h3>Green time</h3>${rows.join('')}`;
}

export const HINT_SHARE = 0.4;

const TURN_NAMES = ['straight on', 'right', 'back', 'left'] as const;

/** 'From the north, left': a movement as a driver would say it. */
function turnName(c: PanelCtx, j: Junction, m: Movement): string {
  const a = m.arrow[0];
  const b = m.arrow[1];
  const y = m.arrow[m.arrow.length - 2];
  const z = m.arrow[m.arrow.length - 1];
  const from = side(c, j, m.fromRoad).toLowerCase();
  if (!a || !b || !y || !z || !from) return 'One turn';
  const turn = Math.atan2(z.y - y.y, z.x - y.x) - Math.atan2(b.y - a.y, b.x - a.x);
  const q = ((Math.round(turn / (Math.PI / 2)) % 4) + 4) % 4;
  return `From the ${from}, ${TURN_NAMES[q]}`;
}

function sortedMovements(c: PanelCtx, j: Junction): readonly Movement[] {
  return [...c.city.movements(j.id)].sort((a, b) => b.share - a.share);
}

function movements(c: PanelCtx, j: Junction): string {
  const top = sortedMovements(c, j).filter((m) => m.cars > 0).slice(0, TOP_MOVEMENTS);
  if (!top.length) return '';
  return `<h3>Who waits most</h3>${top.map((m) => kv(turnName(c, j, m), m.flyover ? 'flyover' : `${Math.round(m.wait)} s`)).join('')}`;
}

/** The worst turn eats most of the delay and has no flyover yet: go straight to its deck. */
function flyoverHint(c: PanelCtx, j: Junction, canFly: boolean): string {
  if (!canFly) return '';
  const worst = sortedMovements(c, j)[0];
  if (!worst || worst.flyover || worst.share < HINT_SHARE) return '<button class="btn gold" data-act="flyover">Flyover for one turn</button>';
  return `<div class="flyhint hint-row"><span class="small"><b>${pct(worst.share)} of the waiting</b> is one turn: ${turnName(c, j, worst).toLowerCase()}.</span><button class="btn gold" data-act="flyover" data-v="${worst.fromRoad}:${worst.toRoad}">Build a flyover for this turn</button></div>`;
}

const GRADE_WORDS = { A: 'Flowing', B: 'Flowing', C: 'Busy', D: 'Jammed', E: 'Badly jammed', F: 'Stuck' } as const;

/** The junction panel: how it runs, what could stand here instead, green split, who waits, a flyover. */
export function junctionPanel(c: PanelCtx, id: number): string {
  const j = c.city.junctions.find((x) => x.id === id);
  if (!j) return '<h2>Junction</h2><p class="dim">Gone.</p>';
  const s = c.city.junctionStats(id);
  const canFly = c.city.tools.includes('flyover') || c.city.tools.includes('underpass');
  return `<h2>${j.gate ? esc(j.gate) : 'Junction'} <span class="grade ${s.grade}">${s.grade}</span></h2>
    <p class="status g${s.grade}"><b>${GRADE_WORDS[s.grade]}.</b> ${Math.round(s.wait)} s of waiting for each car.</p>
    ${flyoverHint(c, j, canFly)}<div class="choices">${choices(c, j)}</div>${sliders(c, j)}${movements(c, j)}`;
}

/** Applies a green split slider move; returns the new shares. */
export function moveSplit(c: PanelCtx, id: number, i: number, percent: number): number[] | null {
  const j = c.city.junctions.find((x) => x.id === id);
  if (!j) return null;
  const split = rebalance(j.split, i, percent / 100);
  c.acts.apply({ t: 'split', node: id, split });
  return split;
}
