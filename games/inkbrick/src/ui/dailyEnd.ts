import type { DailyStanding } from '@16bitink/game-sdk';
import { countdown, longDate, msToMidnight, tomorrowTeaser } from '../app/dates';
import type { Look } from '../app/milestones';
import type { Shells } from '../app/save';
import { ART_STYLE } from '../art/style';
import { artUrl } from '../render/art';
import { teaserWallUrl } from '../render/ink/teaser';
import { clock, esc, render, shellsHtml } from './dom';

/**
 * The daily's end card, the screen that brings players back: the result,
 * the standing among today's players, a challenge link, the tomorrow teaser
 * with a countdown to local midnight, days played and any new look, and the
 * site's calendar. Returns a cleanup (the countdown's timer).
 */
export interface DailyEndData {
  readonly date: string;
  readonly isToday: boolean;
  readonly won: boolean;
  readonly seconds: number;
  readonly breakIn: number | null;
  readonly shells: Shells;
  /** undefined: still asking the host; null: offline. */
  readonly standing: DailyStanding | null | undefined;
  readonly challenge: number | null;
  readonly totalDays: number;
  readonly newLook: Look | null;
  readonly canShare: boolean;
}

export interface DailyEndActs {
  share(): void;
  again(): void;
  calendar(): void;
  looks(): void;
  menu(): void;
}

/** Where the site's calendar lives. */
export const SITE_CALENDAR = '/daily';

const PERCENT_MAX = 100;

/** A standing percent as shown: whole, 0–100 (the host's value is untrusted). */
function pct(value: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), PERCENT_MAX) : 0;
}

function standingHtml(d: DailyEndData): string {
  const s = d.standing;
  if (s === undefined) return '<p class="dim">Comparing with today’s players…</p>';
  if (s === null) return '<p class="dim">Saved on this device. The standings need a connection.</p>';
  const lines: string[] = [];
  if (s.breakInBetterThan !== undefined && d.breakIn !== null) lines.push(`You broke in faster than <b>${pct(s.breakInBetterThan)}%</b> of ${d.isToday ? 'today’s' : 'that day’s'} players`);
  if (s.clearBetterThan !== undefined && d.won) lines.push(`You cleared it faster than <b>${pct(s.clearBetterThan)}%</b> of the winners`);
  lines.push(`<span class="dim">${s.players} ${s.players === 1 ? 'player' : 'players'} so far</span>`);
  return lines.map((l) => `<p>${l}</p>`).join('');
}

function challengeHtml(d: DailyEndData): string {
  if (d.challenge === null || !d.won) return '';
  const diff = Math.round(d.challenge - d.seconds);
  return diff >= 0 ? `<p class="gold t32">You beat the challenge by ${clock(diff)}!</p>` : `<p>${clock(-diff)} slower than the challenge. Again?</p>`;
}

function teaserHtml(d: DailyEndData): string {
  if (!d.isToday) return '';
  const brumm = artUrl('brumm-smug');
  // Ink: Brumm peeks over a wall with a "?" on it (a tease; nothing of tomorrow's layout).
  const pic = ART_STYLE === 'ink' && brumm ? `<div class="tz-pic"><img class="tz-brumm" src="${brumm}" alt=""><img class="tz-wall" src="${teaserWallUrl()}" alt=""></div>` : null;
  const sil = pic ?? '<div style="border:3px solid var(--ink);border-radius:8px;background:repeating-linear-gradient(0deg,#2a1d10 0 6px,transparent 6px 12px);opacity:0.55"></div>';
  return `<div class="row teaser" style="background:#ece0c4;border-radius:14px;padding:8px 14px;gap:14px"><div class="tz">${sil}</div><div class="col" style="gap:2px;text-align:left">
    <b>${esc(tomorrowTeaser(d.date))}</b><span style="white-space:nowrap">New daily in <span data-k="cd">${countdown(msToMidnight(new Date()))}</span></span></div></div>`;
}

export function showDailyEnd(root: HTMLElement, d: DailyEndData, a: DailyEndActs): () => void {
  const look = d.newLook ? `<p class="gold look-line">${d.totalDays} days played: a new look for Skip, the ${esc(d.newLook.name)}! <button class="btn small gold" data-act="looks">Wear it</button></p>` : `<p>${d.totalDays} ${d.totalDays === 1 ? 'day' : 'days'} played</p>`;
  const share = d.won ? `<button class="btn sea" data-act="share">${d.canShare ? 'Challenge a friend' : 'Copy challenge link'}</button>` : '';
  render(root, 'card', `<div class="panel col center">
    <p class="dim">Daily · ${esc(longDate(d.date))}${d.isToday ? '' : ' (played late)'}</p>
    <h2 class="t44">${d.won ? `Cleared in ${clock(d.seconds)}` : 'Out of hearts'}</h2>
    <div>${shellsHtml(d.shells)}</div>
    ${d.breakIn !== null ? `<p>Broke in at ${clock(d.breakIn)}</p>` : ''}
    ${challengeHtml(d)}<div data-k="standing">${standingHtml(d)}</div>
    ${teaserHtml(d)}${look}
    <div class="row wrap center btns">${share}<button class="btn" data-act="again">Play again</button><button class="btn" data-act="calendar">Calendar</button><button class="btn small menu" data-act="menu">Menu</button></div>
    <a href="${SITE_CALENDAR}" target="_top" class="t18 cal-link" style="color:var(--sea)">Every game's dailies on the 16bit.ink calendar</a>
    <p class="t18 dim" data-k="copied"></p>
  </div>`, { share: a.share, again: a.again, calendar: a.calendar, looks: a.looks, menu: a.menu });
  const cd = root.querySelector<HTMLElement>('[data-k="cd"]');
  const timer = cd ? setInterval(() => (cd.textContent = countdown(msToMidnight(new Date()))), 1000) : null;
  return () => {
    if (timer !== null) clearInterval(timer);
  };
}

/** Fills in the standing once the host answers (the card stays as it is otherwise). */
export function updateStanding(root: HTMLElement, d: DailyEndData): void {
  const el = root.querySelector<HTMLElement>('[data-k="standing"]');
  if (el) el.innerHTML = standingHtml(d);
}

export function noteCopied(root: HTMLElement, text: string): void {
  const el = root.querySelector<HTMLElement>('[data-k="copied"]');
  if (el) el.textContent = text;
}
