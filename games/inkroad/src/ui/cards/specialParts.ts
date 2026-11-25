import type { CityView } from '../../sim/types';
import { num } from '../format';
import type { UiEnv } from '../types';
import { section } from './shell';

/** The year-end licence quota and the review's speed-toll limit, for cities 3 to 5. */

/** Car licences: the quota, what it would do at the next auction, and last year. */
export function licencesHtml(env: UiEnv): string {
  const l = env.city.special?.licences;
  if (!l) return '';
  const f = l.forecast;
  const stepper = `<div class="stepper${l.open ? '' : ' closed'}"><span>Licences to sell</span>
    <button class="btn" data-act="quota" data-v="-1" ${!l.open || l.quota - l.step < l.min ? 'disabled' : ''} aria-label="Fewer licences">-</button>
    <b class="v">${num(l.quota)}</b><button class="btn" data-act="quota" data-v="1" ${!l.open || l.quota + l.step > l.max ? 'disabled' : ''} aria-label="More licences">+</button></div>`;
  const price = f.sold > 0 ? `At the next auction about <b>${num(f.sold)}</b> would sell, at <span class="coin">${num(f.price)}</span> each: <span class="coin">${num(f.income)}</span> for the Council.` : 'With none for sale nobody can buy a car.';
  const grumble = f.dear ? '<p class="warn small">At this price drivers will grumble: licences are dear.</p>' : '';
  const last = l.lastSold > 0 ? `<p class="small dim">Last auction: ${num(l.lastSold)} sold at ${num(l.lastPrice)}, <span class="coin">${num(l.lastIncome)}</span> in all.</p>` : '';
  return section('Car licences', `<p class="small">${num(l.cars)} cars on the islands, ${num(l.expiring)} licences run out at year end. Residents want about ${num(l.wanted)}.</p>${stepper}<p class="small">${price}</p>${grumble}${last}${l.open ? '' : '<p class="small dim">The quota is set at the year-end review.</p>'}`);
}

/** The dearest a speed toll may get, with how well the gates kept the speed. */
export function tollLimitHtml(city: CityView): string {
  const t = city.special?.speedTolls;
  if (!t || t.gates.length === 0) return '';
  const open = city.phase === 'review';
  const [min, max] = [t.maxRange.min, t.maxRange.max];
  return section('Speed tolls', `<div class="stepper${open ? '' : ' closed'}"><span>Never dearer than</span>
    <button class="btn" data-act="tollmax" data-v="-1" ${!open || t.max <= min ? 'disabled' : ''} aria-label="Lower the limit">-</button>
    <b class="v coin">${num(t.max)}</b><button class="btn" data-act="tollmax" data-v="1" ${!open || t.max >= max ? 'disabled' : ''} aria-label="Raise the limit">+</button></div>
    <p class="small dim">${t.gates.length} ${t.gates.length === 1 ? 'gate watches' : 'gates watch'} the speed. Price now ${num(t.price)}. They kept the speed in ${Math.round(t.kept * 100)}% of the rush hours.</p>`);
}
