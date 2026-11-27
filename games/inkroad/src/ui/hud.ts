import type { Bar, CityView, Period } from '../sim/types';
import { Binder, Router } from './dom';
import { clockText, dateLine, num, shownYear, signed, trend } from './format';
import { pct } from './format';
import { goalReading } from './goal';
import { SPEEDS, type PlayActs, type Speed } from './types';

const BAR_LABELS: Readonly<Record<Bar, string>> = { trips: 'Trips', parking: 'Parking', cost: 'Cost', streets: 'Streets' };
const BAR_ORDER: readonly Bar[] = ['trips', 'parking', 'cost', 'streets'];
const PERIOD_NAMES: Readonly<Record<Period, string>> = { dawn: 'Dawn', am: 'Morning rush', mid: 'Midday', pm: 'Evening rush', night: 'Night' };
const PERIOD_FILL: Readonly<Record<Period, string>> = { dawn: '#f6d7b0', am: '#fff2c8', mid: '#fffbe6', pm: '#f3c98c', night: '#6c7690' };
const ARC_LEN = 100;
export const LOW_APPROVAL = 40;
const SPEED_LABEL: Readonly<Record<Speed, string>> = { 0: '<i class="pauseglyph"></i>', 1: '1x', 2: '2x', 4: '4x' };

function barRows(): string {
  return BAR_ORDER.map((b) => `<span>${BAR_LABELS[b]}</span><span class="meter" data-k="m-${b}"><i></i></span><i class="tri same" data-k="a-${b}"></i>`).join('');
}

const TEMPLATE = `
<button class="appr" data-act="bars" aria-label="Approval">
  <div class="dial"><svg viewBox="0 0 84 52"><path class="arc" d="M8 46 A34 34 0 0 1 76 46" pathLength="100" stroke="rgba(42,40,50,.18)"/>
    <path class="arc" data-k="arc" d="M8 46 A34 34 0 0 1 76 46" pathLength="100" stroke="#2c7a80" stroke-dasharray="0 100"/></svg><b data-k="appr">0</b></div>
  <div class="bars">${barRows()}</div>
</button>
<div class="money"><b class="coin" data-k="money">0</b><small data-k="forecast"></small></div>
<div class="when"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" data-k="face" fill="#fff2c8" stroke="#2a2832" stroke-width="2.5"/>
  <line data-k="hand" x1="22" y1="22" x2="22" y2="8" stroke="#2a2832" stroke-width="3" stroke-linecap="round" transform="rotate(0 22 22)"/><circle cx="22" cy="22" r="2.5" fill="#2a2832"/></svg>
  <div><b data-k="date"></b><small data-k="period"></small></div></div>
<div class="goalchip" data-act="goal" data-k="goal" role="button"><span class="tick"><svg viewBox="0 0 20 16"><path d="M2 8.5 7.5 14 18 2"/></svg></span><span><small data-k="goalname"></small><span><b data-k="goalnow"></b><span data-k="goaltarget"></span></span></span></div>
<div class="speed">${SPEEDS.map((s) => `<button class="btn" data-act="speed" data-v="${s}" data-k="sp${s}" aria-label="Speed ${s}">${SPEED_LABEL[s]}</button>`).join('')}<button class="btn" data-act="menu" aria-label="Menu">Menu</button></div>`;

/** The top bar: money and forecast, approval dial with its four bars, date and clock of the day, goal, speed. */
export class TopBar {
  private readonly bind: Binder;

  constructor(readonly el: HTMLElement, router: Router, acts: PlayActs, private readonly onBars: () => void, private readonly onGoal: () => void = () => undefined) {
    el.innerHTML = TEMPLATE;
    this.bind = new Binder(el);
    router.add({
      speed: (v) => acts.setSpeed(Number(v) as Speed),
      menu: () => acts.menu(),
      bars: () => this.onBars(),
      goal: () => this.onGoal(),
    });
  }

  update(city: CityView, speed: Speed): void {
    const b = this.bind;
    b.text('money', num(city.money));
    const f = city.forecast.nextMonth;
    b.text('forecast', `${signed(f)} next month`);
    b.cls('forecast', 'up', f >= 0);
    b.cls('forecast', 'down', f < 0);
    b.text('appr', String(Math.round(city.approval)));
    b.attr('arc', 'stroke-dasharray', `${Math.round((Math.min(100, Math.max(0, city.approval)) / 100) * ARC_LEN)} ${ARC_LEN}`);
    b.attr('arc', 'stroke', city.approval < LOW_APPROVAL ? '#a8691f' : '#2c7a80');
    this.bars(city);
    b.text('date', dateLine(shownYear(city), city.month));
    b.text('period', `${PERIOD_NAMES[city.period]} ${clockText(city.hour)}`);
    b.attr('hand', 'transform', `rotate(${Math.round((city.hour / 24) * 360)} 22 22)`);
    b.attr('face', 'fill', PERIOD_FILL[city.period]);
    const g = goalReading(city);
    b.text('goalname', g.name);
    b.text('goalnow', g.now);
    b.text('goaltarget', g.target);
    b.cls('goal', 'met', g.met);
    for (const s of SPEEDS) b.cls(`sp${s}`, 'on', s === speed);
  }

  private bars(city: CityView): void {
    const b = this.bind;
    for (const k of BAR_ORDER) {
      const v = city.bars[k];
      b.css(`m-${k}`, '--w', pct(v / 100));
      b.cls(`m-${k}`, 'low', v < LOW_APPROVAL);
      const t = trend(v, city.lastBars[k]);
      b.attr(`a-${k}`, 'class', `tri ${t}`);
    }
  }
}
