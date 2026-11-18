import { localDate } from '../dailyDates';
import { pickDaily } from '../dailyOpen';
import { readLocalDays } from './dailyStore';

const cardsIn = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[data-daily-game]')];
const isOpenHere = (card: HTMLElement, today: string): boolean => today >= (card.dataset.opens ?? '9999-12-31');

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Hides the cards whose daily hasn't opened yet at this player's midnight (the server kept every one open somewhere). */
export function hideUnopenedDailies(root: HTMLElement): void {
  const today = localDate(new Date());
  for (const card of cardsIn(root)) if (!isOpenHere(card, today)) card.hidden = true;
}

/**
 * The home page's one daily: keeps the server's pick while it's open here and unplayed in this
 * browser today, else shows a random unplayed one, else none (the whole strip hides).
 */
export function showOneDaily(root: HTMLElement): void {
  const today = localDate(new Date());
  const cards = cardsIn(root);
  const played = new Set(readLocalDays(browserStorage()).filter((d) => d.date === today).map((d) => d.game));
  const open = cards.filter((c) => isOpenHere(c, today)).map((c) => c.dataset.dailyGame ?? '');
  const current = cards.find((c) => !c.hidden)?.dataset.dailyGame;
  const pick = pickDaily(open, current, played, Math.random);
  for (const card of cards) card.hidden = card.dataset.dailyGame !== pick;
  root.hidden = pick === undefined;
}
