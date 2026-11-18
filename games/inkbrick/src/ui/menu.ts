import { shortDate } from '../app/dates';
import type { Look } from '../app/milestones';
import { artUrl } from '../render/art';
import { esc, render } from './dom';

/** The title screen: play the levels, today's daily, the calendar, Skip's looks. */
export interface MenuData {
  readonly today: string | null;
  readonly playedToday: boolean;
  readonly totalDays: number;
  readonly next: Look | null;
  readonly sound: boolean;
  readonly note: string | null;
  readonly started: boolean;
}

export interface MenuActs {
  play(): void;
  daily(): void;
  calendar(): void;
  looks(): void;
  sound(): void;
  exit(): void;
}

function milestoneLine(d: MenuData): string {
  const days = `${d.totalDays} ${d.totalDays === 1 ? 'day' : 'days'} played`;
  if (!d.next) return days;
  const left = d.next.days - d.totalDays;
  return `${days} · ${left} more for the ${esc(d.next.name)}`;
}

export function showMenu(root: HTMLElement, d: MenuData, a: MenuActs): void {
  const skip = artUrl('skip-cheer');
  const bg = artUrl('map');
  const daily = d.today
    ? `<button class="btn gold t32" data-act="daily">Daily · ${esc(shortDate(d.today))}${d.playedToday ? ' ✓' : ''}</button>
       <p class="t18">${milestoneLine(d)}</p>`
    : '';
  render(root, 'sea', `${bg ? `<div style="position:absolute;inset:0;background:url(${bg}) center/cover;filter:saturate(0.9) brightness(0.8)"></div>` : ''}<div class="col center panel menu-panel">
    ${skip ? `<img src="${skip}" alt="" style="width:min(260px,55vw)">` : ''}
    <h1 class="t64">InkBrick</h1>
    <p class="dim">Skip the sea otter versus Brumm's walls</p>
    ${d.note ? `<p class="coral">${esc(d.note)}</p>` : ''}
    <button class="btn go t32" data-act="play">${d.started ? 'Continue' : 'Play'}</button>
    ${daily}
    <div class="row wrap center">
      ${d.today ? '<button class="btn small sea" data-act="calendar">Calendar</button>' : ''}
      <button class="btn small sea" data-act="looks">Skip's looks</button>
      <button class="btn small" data-act="sound">Sound ${d.sound ? 'on' : 'off'}</button>
      <button class="btn small" data-act="exit">Exit</button>
    </div>
  </div>`, { play: a.play, daily: a.daily, calendar: a.calendar, looks: a.looks, sound: a.sound, exit: a.exit });
}
