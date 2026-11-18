import { milestoneStates, totalDaysPlayed, type GameDay } from '../daily';
import { MONTHS, monthGrid } from '../dailyCalendar';
import { localDate } from '../dailyDates';
import { loadAllDays } from './dailyHost';

interface GameInfo {
  readonly slug: string;
  readonly title: string;
  readonly icon?: string;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function mark(info: GameInfo | undefined, slug: string, late: boolean): HTMLElement {
  const m = el('span', late ? 'mark late' : 'mark');
  m.title = `${info?.title ?? slug}${late ? ' (played late)' : ''}`;
  if (info?.icon) {
    const img = el('img');
    img.src = info.icon;
    img.alt = '';
    img.width = 28;
    img.height = 28;
    m.append(img);
  } else {
    m.textContent = (info?.title ?? slug).slice(0, 1);
  }
  return m;
}

const plural = (n: number): string => `${n} ${n === 1 ? 'day' : 'days'} played`;

function renderSummary(root: HTMLElement, days: readonly GameDay[]): void {
  const total = totalDaysPlayed(days);
  const { states, next } = milestoneStates(total);
  const count = root.querySelector<HTMLElement>('[data-daily-count]');
  if (count) count.textContent = plural(total);
  const nextEl = root.querySelector<HTMLElement>('[data-daily-next]');
  if (nextEl) nextEl.textContent = next === null ? 'Every stamp collected. Thank you for playing.' : `Next stamp at ${next} days played (${next - total} to go).`;
  const stamps = root.querySelector<HTMLElement>('[data-daily-stamps]');
  stamps?.replaceChildren(
    ...states.map((s) => {
      const li = el('li', s.earned ? 'stamp earned' : s.days === next ? 'stamp next' : 'stamp');
      li.append(el('span', 'stamp-n', String(s.days)), el('span', 'stamp-l', s.earned ? 'earned' : s.days === next ? 'next' : 'to come'));
      return li;
    }),
  );
}

function renderToday(root: HTMLElement, days: readonly GameDay[], today: string): void {
  for (const card of root.querySelectorAll<HTMLElement>('[data-daily-game]')) {
    const played = days.find((d) => d.game === card.dataset.dailyGame && d.date === today);
    const state = card.querySelector<HTMLElement>('[data-daily-state]');
    if (!state) continue;
    state.hidden = !played;
    if (played) state.textContent = played.result === 'win' ? 'Cleared today. Play again to beat your time.' : 'Played today. Try again for a clear.';
    const btn = card.querySelector<HTMLElement>('.play');
    if (btn && played) btn.textContent = 'Play again';
  }
}

function renderMonth(root: HTMLElement, days: readonly GameDay[], games: ReadonlyMap<string, GameInfo>, year: number, month: number, today: string): void {
  const title = root.querySelector<HTMLElement>('[data-cal-title]');
  if (title) title.textContent = `${MONTHS[month]} ${year}`;
  const body = root.querySelector<HTMLElement>('[data-cal-body]');
  const order = [...games.keys()];
  body?.replaceChildren(
    ...monthGrid(year, month, days, order).flat().map((cell) => {
      const td = el('div', cell.date === null ? 'cell blank' : 'cell');
      if (cell.date === null) return td;
      if (cell.date === today) td.classList.add('today');
      if (cell.games.length > 0) td.classList.add('played');
      td.append(el('span', 'num', String(cell.day)));
      const marks = el('span', 'marks');
      marks.append(...cell.games.map((g) => mark(games.get(g.game), g.game, g.late)));
      td.append(marks);
      td.setAttribute('aria-label', `${cell.date}${cell.games.length ? `, played: ${cell.games.map((g) => games.get(g.game)?.title ?? g.game).join(', ')}` : ''}`);
      return td;
    }),
  );
}

/** Fills the Daily page from this player's days (the account's when signed in, and this browser's). */
export async function bootDailyPage(root: HTMLElement, games: readonly GameInfo[], firstDate: string): Promise<void> {
  const byGame = new Map(games.map((g) => [g.slug, g] as const));
  const today = localDate(new Date());
  const [ty, tm] = today.split('-').map(Number) as [number, number];
  const [fy, fm] = firstDate.split('-').map(Number) as [number, number];
  let view = { year: ty, month: tm - 1 };
  const earliest = { year: fy, month: fm - 1 };
  let days: readonly GameDay[] = [];

  const prev = root.querySelector<HTMLButtonElement>('[data-cal-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-cal-next]');
  const draw = (): void => {
    renderMonth(root, days, byGame, view.year, view.month, today);
    if (prev) prev.disabled = view.year === earliest.year && view.month === earliest.month;
    if (nextBtn) nextBtn.disabled = view.year === ty && view.month === tm - 1;
  };
  const step = (delta: number): void => {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    view = { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    draw();
  };
  prev?.addEventListener('click', () => step(-1));
  nextBtn?.addEventListener('click', () => step(1));

  const show = (): void => {
    renderSummary(root, days);
    renderToday(root, days, today);
    draw();
  };
  show();
  days = await loadAllDays(browserStorage());
  show();
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
