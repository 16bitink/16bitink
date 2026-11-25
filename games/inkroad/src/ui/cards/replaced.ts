import { esc } from '../dom';
import { shownYear } from '../format';
import { pic } from '../pics';
import type { UiEnv } from '../types';
import { cardHtml } from './shell';

/** Replaced: why, three spots on the map, and the way back (this year again, or an earlier one). */
export function replacedCard(env: UiEnv, peek: boolean, pickYear: boolean): string {
  const { city } = env;
  const why = city.replacedWhy;
  const spots = (why?.spots ?? []).slice(0, 3);
  const spotBtns = spots.map((s, i) => `<button class="btn spot" data-act="spot" data-v="${i}"><b>${i + 1}</b><span>${esc(s.text)}</span></button>`).join('');
  if (peek) {
    return `<div class="card paper peek"><div class="col">${spotBtns}<button class="btn go" data-act="unpeek">Back to the letter</button></div></div>`;
  }
  const years = env.savedYears.filter((y) => y <= city.year)
    .map((y) => `<button class="btn" data-act="retry" data-v="${y}">${shownYear(city, y)}</button>`).join('');
  return cardHtml({
    title: 'You have been replaced', sub: `Year ${shownYear(city)}, ${city.def.name}`, cls: 'replaced',
    stamp: '<span class="stamp red big slam">Replaced</span>',
    body: `${pic('end-replaced', 'endimg')}<p class="hand" style="font-size:26px">${esc(why?.text ?? 'The residents have had enough.')}</p>
      ${spots.length ? `<div class="sec"><h3>The three worst spots</h3>${spotBtns}</div>` : ''}
      ${pickYear ? `<div class="sec"><h3>Go back to year</h3><div class="years">${years}</div></div>` : ''}`,
    foot: `<button class="btn" data-act="desk">City desk</button><button class="btn" data-act="pickyear">An earlier year</button><button class="btn go big" data-act="retry" data-v="${city.year}">Try year ${shownYear(city)} again</button>`,
  });
}
