import { YEARS_PER_CITY } from '../sim/constants';
import { citySave, isFinished, totalPlates, type SaveData } from '../app/save';
import { buyBlock } from './buyWall';
import { CITY_META, SAFFRON_YEARS, statusOf, type CityMeta } from './cityMeta';
import { esc, Router } from './dom';
import { plateNumber } from './format';
import { pic } from './pics';

export interface DeskData {
  readonly save: SaveData;
  readonly owned: boolean;
  readonly price: string | null;
  readonly sound: boolean;
  /** Dev: every year of an open city can be played. */
  readonly allOpen?: boolean;
  /** A line under the title, e.g. why a year could not open. */
  readonly note?: string | null;
  /** Year names by city number, when its content is loaded. */
  readonly yearNames: Readonly<Record<number, readonly string[]>>;
  /** Shown over the desk: the buy wall for this city number. */
  readonly wall: number | null;
}
export interface DeskActs { play(city: number, year: number): void; buy(city: number): void; wall(city: number | null): void; menu(): void; sound(): void }

/** The card's meta, with its status settled from the content that is loaded. */
const settled = (m: CityMeta, d: DeskData): CityMeta => ({ ...m, status: statusOf(m, Object.keys(d.yearNames).map(Number), d.owned) });
const locked = (m: CityMeta, owned: boolean): boolean => m.status === 'soon' || (m.status === 'paid' && !owned);

function stamps(m: CityMeta, d: DeskData): string {
  const c = citySave(d.save, m.no);
  const names = d.yearNames[m.no] ?? (m.no === 1 ? SAFFRON_YEARS : []);
  return Array.from({ length: YEARS_PER_CITY }, (_, i) => {
    const y = i + 1;
    const open = d.allOpen === true || y <= Math.min(c.reached, YEARS_PER_CITY);
    const pips = [0, 1, 2].map((k) => `<i class="${k < (c.plates[i] ?? 0) ? 'on' : ''}"></i>`).join('');
    const now = !isFinished(c) && y === c.reached;
    return `<button class="ystamp${now ? ' now' : ''}" data-act="year" data-v="${m.no}:${y}" ${open ? '' : 'disabled'} title="${esc(names[i] ?? `Year ${y}`)}" aria-label="Year ${(m.no - 1) * YEARS_PER_CITY + y}"><span>${(m.no - 1) * YEARS_PER_CITY + y}</span><span class="pips">${pips}</span></button>`;
  }).join('');
}

function card(base: CityMeta, d: DeskData): string {
  const m = settled(base, d);
  const c = citySave(d.save, m.no);
  const lock = locked(m, d.owned);
  const badge = m.status === 'soon' ? '<span class="stamp badge">Coming</span>' : lock ? '<span class="stamp red badge">Full game</span>' : isFinished(c) ? '<span class="stamp teal badge">Done</span>' : '';
  const body = m.status === 'soon' ? '<p class="hand dim">The survey team is still packing.</p>'
    : lock ? `<button class="btn gold" data-act="wall" data-v="${m.no}">Unlock${d.price ? ` for ${esc(d.price)}` : ''}</button>`
      : `<div class="yrow">${stamps(m, d)}</div><div class="row small dim"><span class="numplate" style="font-size:16px;padding:3px 8px">${plateNumber(totalPlates(c))}</span><span>${totalPlates(c)} of ${YEARS_PER_CITY * 3} plates. Tap a year to play it.</span></div>`;
  return `<div class="paper taped citycard${lock ? ' locked' : ''}">${pic(`city-${m.no}`, 'cimg')}<div class="row" style="justify-content:space-between"><h2>${m.no}. ${esc(m.name)}</h2>${badge}</div><p class="blurb">${esc(m.blurb)}</p>${body}</div>`;
}

/** The city desk: five cities as cards; ten years each as a row of stamps with 0 to 3 plates. */
export function showDesk(el: HTMLElement, router: Router, d: DeskData, a: DeskActs): void {
  const wall = d.wall ? CITY_META.find((m) => m.no === d.wall) : undefined;
  el.hidden = false;
  el.innerHTML = `<div class="deskhead"><div><h2>City desk</h2><div class="sub">${d.note ? esc(d.note) : 'Pick a city, or replay a year.'}</div></div>
    <div class="row"><button class="btn sm" data-act="sound">Sound ${d.sound ? 'on' : 'off'}</button><button class="btn" data-act="menu">Menu</button></div></div>
    <div class="cities">${CITY_META.map((m) => card(m, d)).join('')}</div>
    ${wall ? `<div class="cards" style="position:fixed"><div class="card paper taped wall">${buyBlock(wall.name, d.price)}<button class="btn" data-act="wallclose">Not now</button></div></div>` : ''}`;
  router.set({
    year: (v) => { const [c, y] = v.split(':').map(Number); a.play(c!, y!); },
    wall: (v) => a.wall(Number(v)),
    wallclose: () => a.wall(null),
    buy: () => a.buy(d.wall ?? 2),
    menu: a.menu,
    sound: a.sound,
  });
}
