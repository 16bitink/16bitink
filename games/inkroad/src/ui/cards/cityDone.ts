import { YEARS_PER_CITY } from '../../sim/constants';
import { num, plateNumber } from '../format';
import { pic } from '../pics';
import type { UiEnv } from '../types';
import { buyBlock } from '../buyWall';
import { cardHtml } from './shell';

export const MAX_PLATES_CITY = YEARS_PER_CITY * 3;

/** City done: the ten years in plates, your number plate, and the offer for the next city. */
export function cityDoneCard(env: UiEnv, nextName: string | null): string {
  const { city } = env;
  const plates = city.plates.slice(0, YEARS_PER_CITY);
  const total = plates.reduce((a, b) => a + b, 0);
  const row = plates.map((p, i) => `<div class="ystamp" style="cursor:default"><span>${i + 1}</span><span class="pips">${[0, 1, 2].map((k) => `<i class="${k < p ? 'on' : ''}"></i>`).join('')}</span></div>`).join('');
  const offer = !env.owned && nextName ? buyBlock(nextName, env.price) : '';
  return cardHtml({
    title: `${city.def.name} is done`, sub: 'Ten years in office', cls: 'done',
    stamp: '<span class="stamp red big slam">Re-elected</span>',
    body: `${pic('end-done', 'endimg')}<div class="yrow">${row}</div><div class="row wrap"><span class="numplate">${plateNumber(total)}</span><span class="dim">${num(total)} of ${MAX_PLATES_CITY} plates. Replay any year for the rest.</span></div>${offer}`,
    foot: '<button class="btn go big" data-act="desk">Back to the desk</button>',
  });
}
