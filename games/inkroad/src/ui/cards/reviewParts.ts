import type { Commission, Ledger, Prices } from '../../sim/types';
import { esc } from '../dom';
import { monthName, num, pct, shownYear, signed } from '../format';
import { pic } from '../pics';
import type { UiEnv } from '../types';
import { section } from './shell';

const INCOME: Readonly<Record<keyof Ledger['income'], string>> = {
  parking: 'Parking fees', fines: 'Fines', tolls: 'Tolls', fares: 'Fares', zone: 'Zone charge', grant: 'Matching grant', auction: 'Plate auction', float: 'Company float', budget: 'Council budget',
};
const COSTS: Readonly<Record<keyof Ledger['costs'], string>> = {
  building: 'Building', land: 'Land', repairs: 'Repairs', parks: 'Car parks', transit: 'Buses and trains', staff: 'Inspectors', interest: 'Interest',
};
export const PRICE_NAMES: Readonly<Record<keyof Prices, string>> = {
  park: 'Parking, off-peak', parkPeak: 'Parking, peak', fine: 'Parking fine', toll: 'Toll, off-peak', tollPeak: 'Toll, peak', fare: 'Fare', zone: 'Zone charge',
};

const lines = (rec: Readonly<Record<string, number>>, names: Readonly<Record<string, string>>, sign: 1 | -1): string =>
  Object.entries(names).filter(([k]) => Math.round(rec[k] ?? 0) !== 0)
    .map(([k, n]) => `<span>${n}</span><span class="r coin">${num(sign * (rec[k] ?? 0))}</span>`).join('');

const add = <T extends Readonly<Record<string, number>>>(a: T, b: T): T => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, v + (b[k] ?? 0)])) as T;

/** The season's three months, and what was spent tonight on top. */
export function seasonBooks(city: { readonly books: readonly Ledger[]; readonly ledger: Ledger }): Ledger {
  return city.books.reduce((s, l) => ({ income: add(s.income, l.income), costs: add(s.costs, l.costs) }), city.ledger);
}

export function ledgerHtml(l: Ledger, title = 'The books'): string {
  const inc = Object.values(l.income).reduce((a, b) => a + b, 0);
  const out = Object.values(l.costs).reduce((a, b) => a + b, 0);
  const net = inc - out;
  return section(title, `<div class="ledger">${lines(l.income, INCOME, 1)}<span class="t">Coming in</span><span class="t r coin">${num(inc)}</span>
    ${lines(l.costs, COSTS, -1)}<span class="t">Going out</span><span class="t r coin">${num(-out)}</span>
    <span class="t">This season</span><span class="t r ${net >= 0 ? 'up' : 'down'}">${signed(net)}</span></div>`);
}

const complaintList = (env: UiEnv): string => {
  const worst = [...env.city.complaints].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const list = worst.map((c) => `<div class="complaint" style="cursor:default">${pic(`resident-${c.animal}`)}<div><p>${esc(c.text)}</p><small>${esc(c.who)}</small></div></div>`).join('');
  return worst.length ? `<h3>Top complaints</h3>${list}` : '<p class="hand dim">Nobody is shouting. Suspicious.</p>';
};

const approvalScore = (env: UiEnv): string => {
  const { city } = env;
  const d = Math.round(city.approval - city.lastBars.approval);
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
  return `<div class="cmp"><b>${Math.round(city.approval)}</b><span class="${cls}">${d === 0 ? 'no change' : signed(d)}</span></div>`;
};

/** The score and the worst complaints together (phone tab, or a wide card with no second column). */
export const approvalHtml = (env: UiEnv): string => section('Approval', approvalScore(env) + complaintList(env));
/** Just the score, when the complaints sit in their own column. */
export const scoreHtml = (env: UiEnv): string => section('Approval', approvalScore(env));
/** Just the complaints, as a column of their own. */
export const complaintsHtml = (env: UiEnv): string => `<div class="sec bigcomplaints">${complaintList(env)}</div>`;

export function priceRow(key: keyof Prices, env: UiEnv): string {
  const lim = env.city.priceLimits[key];
  const v = env.city.prices[key];
  const off = !lim.open;
  return `<div class="stepper${off ? ' closed' : ''}"><span>${PRICE_NAMES[key]}</span>
    <button class="btn" data-act="price" data-v="${key}:-1" ${off || v - lim.step < lim.min ? 'disabled' : ''} aria-label="Lower ${PRICE_NAMES[key]}">-</button>
    <b class="v coin">${num(v)}</b><button class="btn" data-act="price" data-v="${key}:1" ${off || v + lim.step > lim.max ? 'disabled' : ''} aria-label="Raise ${PRICE_NAMES[key]}">+</button></div>`;
}

export function pricesHtml(env: UiEnv): string {
  const keys = (Object.keys(PRICE_NAMES) as (keyof Prices)[]).filter((k) => env.city.priceLimits[k].open);
  return keys.length ? section('Prices', keys.map((k) => priceRow(k, env)).join('') + '<p class="small dim">One step a season.</p>') : '';
}

const stepRow = (label: string, key: string, v: number, max: number): string =>
  `<div class="stepper"><span>${label}</span><button class="btn" data-act="pol" data-v="${key}:-1" ${v <= 0 ? 'disabled' : ''}>-</button><b class="v">${v}</b><button class="btn" data-act="pol" data-v="${key}:1" ${v >= max ? 'disabled' : ''}>+</button></div>`;
const toggle = (label: string, key: string, on: boolean): string => `<button class="toggle${on ? ' on' : ''}" data-act="pol" data-v="${key}:t"><span>${label}</span><i></i></button>`;
export const MAX_INSPECTORS = 5;
export const MAX_TAXI_RANKS = 3;

/** Policies appear when the city opens them, so year 1 shows none. */
export function policiesHtml(env: UiEnv): string {
  const { policies: p, openPolicies: open } = env.city;
  const on = (k: keyof typeof p): boolean => open.includes(k);
  const rows = [
    on('inspectors') ? stepRow('Meerkat inspectors', 'inspectors', p.inspectors, MAX_INSPECTORS) : '',
    on('permits') ? toggle('Residents park free at home', 'permits', p.permits) : '',
    on('truckHours') ? toggle('Trucks only at night hours', 'truckHours', p.truckHours) : '',
    on('nightWorks') ? toggle('Road works by night', 'nightWorks', p.nightWorks) : '',
    on('taxis') ? stepRow('Taxi ranks', 'taxis', p.taxis, MAX_TAXI_RANKS) : '',
  ].join('');
  return rows ? section('Policies', rows) : '';
}

function commissionHtml(c: Commission, year: number): string {
  const taken = c.state === 'taken';
  const buttons = c.state === 'offered'
    ? `<div class="row"><button class="btn go sm" data-act="commission" data-v="${esc(c.id)}:1">Take it</button><button class="btn sm" data-act="commission" data-v="${esc(c.id)}:0">Not now</button></div>`
    : `<div class="meter" style="--w:${pct(c.progress)}"><i></i></div>`;
  return `<div class="commission${taken ? ' taken' : ''}"><b>${esc(c.title)}</b><span class="small">${esc(c.text)}</span><span class="small dim">${esc(c.goal)}</span>
    <span class="small">Upfront <span class="coin">${num(c.upfront)}</span>, reward <span class="coin">${num(c.reward)}</span>, by the end of ${monthName(c.endsMonth)}, year ${year}</span>${buttons}</div>`;
}

export function commissionsHtml(env: UiEnv): string {
  const open = env.city.commissions.filter((c) => c.state === 'offered' || c.state === 'taken');
  return open.length ? section('Council commissions', open.map((c) => commissionHtml(c, shownYear(env.city, c.endsYear))).join('')) : '';
}

export const VOTE_WIN = 50;

/** The zone charge vote: a support line, then Vote now or Wait. Shown only when the city has one. */
export function voteHtml(env: UiEnv, waited: boolean): string {
  const v = env.city.vote;
  if (!v) return '';
  const can = env.city.quote({ t: 'vote', keep: true });
  const body = v.kept !== null
    ? `<span class="stamp ${v.kept ? 'teal' : 'red'}">${v.kept ? 'Charge kept' : 'Charge scrapped'}</span>`
    : v.running ? '<p class="hand">The votes are being counted tonight.</p>'
      : `<div class="supportline" style="--s:${Math.round(v.support)}%"><i></i><b style="left:${VOTE_WIN}%"></b></div>
        <p class="small">${Math.round(v.support)}% support after ${v.seasons} ${v.seasons === 1 ? 'season' : 'seasons'}. It needs ${VOTE_WIN}%.</p>
        ${waited ? '<p class="hand dim">Waiting. People are still making up their minds.</p>' : ''}
        ${can.ok ? '' : `<p class="small warn">${esc(can.why ?? 'Not yet')}.</p>`}
        <div class="row"><button class="btn go sm" data-act="vote" ${can.ok ? '' : 'disabled'}>Vote now</button><button class="btn sm" data-act="wait">Wait</button></div>`;
  return section('Zone charge vote', body);
}
