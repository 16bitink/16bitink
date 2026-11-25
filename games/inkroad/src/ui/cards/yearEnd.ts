import { APPROVAL_GOOD } from '../../sim/constants';
import type { CityView } from '../../sim/types';
import { esc } from '../dom';
import { num, plateNumber, shownYear } from '../format';
import { pic } from '../pics';
import type { UiEnv } from '../types';
import { panesHtml, type Pane } from './panes';
import { cardHtml, section } from './shell';
import { licencesHtml } from './specialParts';

export const STAMP_GAP_S = 0.75;
export const STAMP_START_S = 0.5;
const VERDICTS = ['Noted', 'Approved', 'Well done', 'Splendid'] as const;
const FLOAT_STREAMS = [{ stream: 'parking', name: 'parking' }, { stream: 'tolls', name: 'tolls' }] as const;

/** Which of the year's three plates were won: survived, approval 60 or more, the year's own target. */
export function platesEarned(city: CityView): readonly [boolean, boolean, boolean] {
  const count = city.plates[city.year - 1] ?? 0;
  const flags: [boolean, boolean, boolean] = [true, city.approval >= APPROVAL_GOOD, city.goal.met];
  if (flags.filter(Boolean).length === count) return flags;
  return [count >= 1, count >= 2, count >= 3];
}

function plateRow(city: CityView, animate: boolean): string {
  const got = platesEarned(city);
  const names = ['Survived', `Approval ${APPROVAL_GOOD}+`, 'Year goal'];
  return `<div class="plates">${names.map((n, i) => `<div class="plate${got[i] ? ' got' : ''}${animate ? '' : ' still'}" style="--d:${(STAMP_START_S + i * STAMP_GAP_S).toFixed(2)}s">
    <span class="ptxt">${n}</span>${got[i] ? `<span class="pstamp">${pic('mat-stamp', 'ring')}<b>OK</b></span>` : ''}</div>`).join('')}</div>`;
}

function techsHtml(env: UiEnv): string {
  const { city } = env;
  if (!city.techChoices.length) return '';
  const chosen = city.techChoices.some((t) => city.techs.includes(t.id));
  const cards = city.techChoices.map((t) => `<button class="tech${city.techs.includes(t.id) ? ' on' : ''}" data-act="tech" data-v="${esc(t.id)}" ${chosen && !city.techs.includes(t.id) ? 'disabled' : ''}>${pic(`tech-${t.icon}`)}<b>${esc(t.name)}</b><span>${esc(t.text)}</span></button>`).join('');
  return section(chosen ? 'Technology chosen' : 'Pick one technology', `<div class="techs">${cards}</div>`);
}

function floatHtml(env: UiEnv): string {
  const open = FLOAT_STREAMS.filter((f) => env.city.quote({ t: 'float', stream: f.stream }).ok);
  if (!open.length) return '';
  return section('Float a company', `<p class="small dim">A lump sum now, and you keep a quarter of that income for good.</p><div class="row wrap">${open.map((f) => {
    const q = env.city.quote({ t: 'float', stream: f.stream });
    return `<button class="btn sm" data-act="float" data-v="${f.stream}">Float ${f.name} <span class="coin">${num(q.cost)}</span></button>`;
  }).join('')}</div>`);
}

/** Year end: the Council's verdict, plates stamped one by one, the plate auction, one technology, floating a company. */
export function yearEndCard(env: UiEnv, animate: boolean, tab = 0): string {
  const { city } = env;
  const count = city.plates[city.year - 1] ?? 0;
  const needTech = city.techChoices.length > 0 && !city.techChoices.some((t) => city.techs.includes(t.id));
  const total = city.plates.reduce((a, b) => a + b, 0);
  const auction = Math.round(city.ledger.income.auction);
  const panes: Pane[] = [
    { id: 'plates', label: 'Plates', col: 0, full: false, html: `${plateRow(city, animate)}${section('Your number plate', `<div class="row wrap"><span class="numplate">${plateNumber(total)}</span><span class="small dim">${total} of 30 plates. Shorter is prouder.</span></div>`)}
      ${auction > 0 ? section('Plate auction', `<p>The Council sold number plates for <span class="coin">${num(auction)}</span>.</p>`) : ''}${floatHtml(env)}` },
    { id: 'tech', label: 'Technology', col: 1, html: techsHtml(env) },
    { id: 'licences', label: 'Licences', col: 1, html: licencesHtml(env) },
  ];
  return cardHtml({
    title: `Year ${shownYear(city)} review`, sub: city.def.years[city.year - 1]?.name ?? '', cls: 'yearend',
    stamp: `<span class="stamp red big${animate ? ' slam' : ''}" style="animation-delay:${(STAMP_START_S + 3 * STAMP_GAP_S).toFixed(2)}s">${VERDICTS[Math.min(3, count)]}</span>`,
    body: panesHtml(panes, env.phone, tab),
    foot: `${needTech && env.phone && tab === 0 ? '<button class="btn gold big" data-act="tab" data-v="1">Pick a technology</button>' : needTech ? '<span class="small warn">Pick a technology first.</span>' : ''}<button class="btn go big${needTech && env.phone && tab === 0 ? ' hidden' : ''}" data-act="next" ${needTech ? 'disabled' : ''}>${city.year >= city.def.years.length ? 'See your city' : `On to year ${shownYear(city) + 1}`}</button>`,
  });
}

