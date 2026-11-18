import type { DailyDay } from '@16bitink/game-sdk';
import { monthGrid, monthName, parseDate } from '../app/dates';
import { MILESTONE_DAYS } from '../app/milestones';
import { artUrl } from '../render/art';
import { esc, render } from './dom';

/**
 * InkBrick's own view of the daily calendar: this game's days as a month
 * grid (played: a filled mark, played late: an outlined one, today ringed),
 * "N days played" (a total, never a streak) and the milestones. Owners tap
 * any past day to play it; others are told the full game opens missed days.
 */
export const FIRST_DAILY = '2026-11-17';
const WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export interface CalendarData {
  readonly today: string;
  readonly year: number;
  readonly month0: number;
  readonly days: readonly DailyDay[];
  readonly totalDays: number;
  readonly owned: boolean;
}

export interface CalendarActs {
  play(date: string): void;
  locked(date: string): void;
  month(delta: number): void;
  back(): void;
}

function cellHtml(date: string | null, d: CalendarData, played: ReadonlyMap<string, DailyDay>): string {
  if (!date) return '<td></td>';
  const day = played.get(date);
  const future = date > d.today;
  const tooEarly = date < FIRST_DAILY;
  const cls = ['day', day ? (day.late ? 'late' : 'played') : '', date === d.today ? 'today' : '', future || tooEarly ? 'future' : 'pick'].filter(Boolean).join(' ');
  return `<td class="${cls}" ${future || tooEarly ? '' : `data-act="d${date}"`}>${parseDate(date).getDate()}</td>`;
}

function milestonesHtml(total: number): string {
  const stamp = artUrl('stamp');
  return MILESTONE_DAYS.map((n) => {
    const got = n <= total;
    const mark = got && stamp ? `<img src="${stamp}" alt="" style="width:28px;height:28px;vertical-align:middle">` : '';
    return `<span class="btn small ${got ? 'gold' : ''}" style="cursor:default">${mark}${n}</span>`;
  }).join('');
}

export function showCalendar(root: HTMLElement, d: CalendarData, a: CalendarActs): void {
  const played = new Map(d.days.map((x) => [x.date, x]));
  const acts: Record<string, () => void> = { back: a.back, prev: () => a.month(-1), next: () => a.month(1) };
  const grid = monthGrid(d.year, d.month0);
  for (const week of grid) for (const date of week) {
    if (!date) continue;
    acts[`d${date}`] = () => (date === d.today || d.owned ? a.play(date) : a.locked(date));
  }
  const first = parseDate(FIRST_DAILY);
  const now = parseDate(d.today);
  const canPrev = d.year * 12 + d.month0 > first.getFullYear() * 12 + first.getMonth();
  const canNext = d.year * 12 + d.month0 < now.getFullYear() * 12 + now.getMonth();
  const rows = grid.map((w) => `<tr>${w.map((date) => cellHtml(date, d, played)).join('')}</tr>`).join('');
  render(root, 'card', `<div class="panel col center">
    <div class="row spread" style="width:100%"><button class="btn small" data-act="prev" ${canPrev ? '' : 'disabled'}>‹</button>
      <h2 class="t32">${monthName(d.month0)} ${d.year}</h2><button class="btn small" data-act="next" ${canNext ? '' : 'disabled'}>›</button></div>
    <table class="cal"><tr>${WEEK.map((w) => `<th>${w}</th>`).join('')}</tr>${rows}</table>
    <p class="t32">${d.totalDays} ${d.totalDays === 1 ? 'day' : 'days'} played</p>
    <p class="t18 dim">Every game's dailies count. Gaps are days you can still fill${d.owned ? ': tap one to play it' : ' with the full game'}.</p>
    <p class="t18">Days played that give Skip a new raft and trail:</p><div class="row wrap center" style="gap:4px">${milestonesHtml(d.totalDays)}</div>
    <button class="btn" data-act="back">Back</button>
  </div>`, acts);
}
