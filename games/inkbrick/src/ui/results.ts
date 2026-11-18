import type { Shells } from '../app/save';
import type { LevelDef } from '../sim/types';
import { clock, esc, render, shellsHtml } from './dom';
import { FRIEND_NAMES, shellLabels } from './rules';

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
  /** The level, for its goal's wording and shells. */
  readonly level: Pick<LevelDef, 'goal' | 'need' | 'par' | 'rescue' | 'pearls' | 'stones'>;
  /** Share of the breakable bricks broken (Few Stones). */
  readonly share: number;
}

export interface ResultsActs {
  retry(): void;
  map(): void;
  next(): void;
}

const LOSE_LINES = ['Brumm chuckles from behind his wall.', 'So close! The gap is still there.', 'Skip shakes off the water and grins.'];

const pct = (share: number): string => `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;

/** The card's heading and its first line, per goal (every goal ends in a set piece, never a bare counter). */
export function resultWords(d: Pick<ResultsData, 'won' | 'seconds' | 'level' | 'share'>): { readonly title: string; readonly line: string } {
  const g = d.level.goal ?? 'clear';
  const lose = LOSE_LINES[Math.floor(d.seconds) % LOSE_LINES.length]!;
  switch (g) {
    case 'rescue': {
      const who = FRIEND_NAMES[d.level.rescue?.who ?? 'pup'];
      const The = `T${who.slice(1)}`;
      return d.won ? { title: 'Rescued!', line: `${The} is safe on Skip’s raft.` } : { title: 'Out of hearts', line: `${The} is still waiting in the cage.` };
    }
    case 'pearls':
      return d.won ? { title: 'Every pearl!', line: `All ${d.level.pearls?.length ?? 0} pearls in ${clock(d.seconds)}.` } : { title: 'Out of hearts', line: lose };
    case 'stones':
      return d.won
        ? { title: `${pct(d.share)} broken!`, line: `With only ${d.level.stones ?? 0} stones. The goal was ${pct(d.level.need ?? 0)}.` }
        : { title: 'Out of stones', line: `${pct(d.share)} broken. The goal is ${pct(d.level.need ?? 0)}.` };
    case 'tide':
      return d.won ? { title: 'Beat the tide!', line: `Cleared in ${clock(d.seconds)}.` } : { title: 'The tide won', line: lose };
    default:
      return d.won ? { title: 'Cleared!', line: `Cleared in ${clock(d.seconds)}.` } : { title: 'Out of hearts', line: lose };
  }
}

/** The three shells with what each one asks for, under them. */
export function shellsWithLabels(shells: Shells | undefined, level: ResultsData['level'], fresh: readonly boolean[] = []): string {
  const labels = shellLabels(level, clock);
  return `<div>${shellsHtml(shells, fresh)}</div><div class="shell-labels">${labels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>`;
}

export function showResults(root: HTMLElement, d: ResultsData, a: ResultsActs): void {
  const words = resultWords(d);
  const timed = (d.level.goal ?? 'clear') !== 'stones';
  const stats = d.won
    ? `<p>${esc(words.line)}${timed && d.best !== null ? ` · best ${clock(d.best)}` : ''}</p>${d.breakIn !== null ? `<p class="dim">Broke in at ${clock(d.breakIn)}</p>` : ''}`
    : `<p>${esc(words.line)}</p>`;
  const offer = d.next.kind === 'offer'
    ? '<p>That was the last free level. The rest of the coast is waiting: 40 more levels and four more places.</p><p class="dim">One-time purchase, no ads.</p>'
    : d.next.kind === 'none' && d.next.note ? `<p class="dim">${esc(d.next.note)}</p>` : '';
  const nextBtn = !d.won ? '' : d.next.kind === 'level'
    ? `<button class="btn go" data-act="next">Level ${d.next.n}</button>`
    : d.next.kind === 'offer' ? `<button class="btn gold" data-act="next">${esc(d.next.label)}</button>` : '';
  render(root, 'card', `<div class="panel col center">
    <h2 class="t44">${esc(words.title)}</h2>
    <p class="t32">${esc(d.title)}</p>
    ${shellsWithLabels(d.shells, d.level, d.fresh)}
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
