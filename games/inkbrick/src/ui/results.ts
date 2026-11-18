import type { Shells } from '../app/save';
import { clock, esc, render, shellsHtml } from './dom';

/** The win and lose cards of a campaign level, and the pause card. */
export type NextStep =
  | { readonly kind: 'level'; readonly n: number }
  | { readonly kind: 'offer'; readonly label: string }
  | { readonly kind: 'none'; readonly note: string | null };

export interface ResultsData {
  readonly title: string;
  readonly won: boolean;
  readonly seconds: number;
  readonly breakIn: number | null;
  readonly shells: Shells;
  /** Shells earned for the first time (they pop). */
  readonly fresh: readonly boolean[];
  readonly best: number | null;
  readonly next: NextStep;
}

export interface ResultsActs {
  retry(): void;
  map(): void;
  next(): void;
}

const LOSE_LINES = ['Brumm chuckles from behind his wall.', 'So close! The gap is still there.', 'Skip shakes off the water and grins.'];

export function showResults(root: HTMLElement, d: ResultsData, a: ResultsActs): void {
  const stats = d.won
    ? `<p>Cleared in ${clock(d.seconds)}${d.best !== null ? ` · best ${clock(d.best)}` : ''}</p>${d.breakIn !== null ? `<p class="dim">Broke in at ${clock(d.breakIn)}</p>` : ''}`
    : `<p>${esc(LOSE_LINES[Math.floor(d.seconds) % LOSE_LINES.length]!)}</p>`;
  const offer = d.next.kind === 'offer'
    ? '<p>That was the last free level. The rest of the coast is waiting: 40 more levels and four more places.</p><p class="dim">One-time purchase, no ads.</p>'
    : d.next.kind === 'none' && d.next.note ? `<p class="dim">${esc(d.next.note)}</p>` : '';
  const nextBtn = !d.won ? '' : d.next.kind === 'level'
    ? `<button class="btn go" data-act="next">Level ${d.next.n}</button>`
    : d.next.kind === 'offer' ? `<button class="btn gold" data-act="next">${esc(d.next.label)}</button>` : '';
  render(root, 'card', `<div class="panel col center">
    <h2 class="t44">${d.won ? 'Cleared!' : 'Out of hearts'}</h2>
    <p class="t32">${esc(d.title)}</p>
    <div>${shellsHtml(d.shells, d.fresh)}</div>
    ${stats}${offer}
    <div class="row wrap center"><button class="btn" data-act="map">Map</button><button class="btn ${d.won ? '' : 'go'}" data-act="retry">${d.won ? 'Play again' : 'Try again'}</button>${nextBtn}</div>
  </div>`, { retry: a.retry, map: a.map, next: a.next });
}

export interface PauseActs {
  resume(): void;
  retry(): void;
  leave(): void;
  sound(): void;
}

export function showPause(root: HTMLElement, sound: boolean, leaveLabel: string, a: PauseActs): void {
  render(root, 'card', `<div class="panel col center"><h2 class="t44">Paused</h2>
    <button class="btn go" data-act="resume">Resume</button>
    <div class="row wrap center"><button class="btn" data-act="retry">Restart</button><button class="btn" data-act="leave">${esc(leaveLabel)}</button><button class="btn small" data-act="sound">Sound ${sound ? 'on' : 'off'}</button></div>
  </div>`, { resume: a.resume, retry: a.retry, leave: a.leave, sound: a.sound });
}
