import type { BoardLayout } from '../render/layout';
import type { HudState } from '../scenes/PlayScene';
import { clock, esc, heartsHtml, shellIcon } from './dom';

/**
 * The play HUD, beside the board: landscape puts the level and time in the
 * left band and hearts, progress and the three shells in the right; phones
 * get one strip above the board with only hearts, progress, time and pause,
 * bigger. Updated about ten times a second by the scene.
 */
export interface HudInfo {
  readonly title: string;
  readonly subtitle: string;
  readonly par: number;
  readonly tip: string | null;
  /** The challenge link's time to beat, seconds. */
  readonly beat: number | null;
  readonly cheats: boolean;
}

export interface HudActs {
  pause(): void;
  cheatWin(): void;
}

const LAUNCH_HINT = 'Tap or press Space to skip the stone';

export class Hud {
  private layout: BoardLayout | null = null;
  private last = '';

  constructor(private readonly root: HTMLElement, private readonly info: HudInfo, private readonly acts: HudActs) {
    root.className = 'hud';
    root.hidden = false;
  }

  setLayout(l: BoardLayout): void {
    this.layout = l;
    this.last = '';
    const beat = this.info.beat !== null ? `<div class="beat">Time to beat: ${clock(this.info.beat)}</div>` : '';
    const cheat = this.info.cheats ? '<button class="btn small" data-act="cheat">Win (dev)</button>' : '';
    const pause = '<button class="btn small" data-act="pause">Pause</button>';
    const bar = '<div class="bar" style="flex:1"><i data-k="bar"></i></div>';
    this.root.innerHTML = l.mode === 'side'
      ? `<div class="side" style="left:0;width:${l.x}px;align-items:flex-end;text-align:right">
          <div class="t44">${esc(this.info.title)}</div><div>${esc(this.info.subtitle)}</div>
          <div class="t44" data-k="time"></div>${beat}<div class="row" style="justify-content:flex-end">${cheat}${pause}</div></div>
         <div class="side" style="left:${l.x + l.w}px;width:${Math.min(l.x, 340)}px"><div data-k="hearts"></div><div data-k="boss" class="t18"></div>
          <div class="row" style="max-width:260px">${bar}<span data-k="pct"></span></div>
          <div class="panel col" data-k="shells"></div></div><div data-k="hint"></div>`
      : `<div class="strip" style="top:${Math.max(4, l.y - 60)}px;height:56px"><div data-k="hearts"></div><span data-k="boss" class="t18"></span>${bar}
          <div><span data-k="time"></span>${this.info.beat !== null ? ` <span class="beat t18">/ ${clock(this.info.beat)}</span>` : ''}</div>${cheat}${pause}</div><div data-k="hint"></div>`;
    this.root.querySelector('[data-act="pause"]')?.addEventListener('click', () => this.acts.pause());
    this.root.querySelector('[data-act="cheat"]')?.addEventListener('click', () => this.acts.cheatWin());
  }

  private shellsLine(h: HudState, lostHeart: boolean): string {
    const overPar = h.t > this.info.par;
    const cell = (on: boolean, label: string): string => `<div class="row">${shellIcon(on)}${label}</div>`;
    return cell(true, 'Clear it') + cell(!lostHeart, 'Keep every heart') + cell(!overPar, `Under ${clock(this.info.par)}`);
  }

  /** Brumm's hits left as chunky pips (empty once he is down). */
  private bossLine(h: HudState): string {
    if (h.bossHits === null || h.bossTotal === null) return '';
    const left = Math.max(0, h.bossHits);
    const pips = '●'.repeat(left) + '○'.repeat(Math.max(0, h.bossTotal - left));
    return left > 0 ? `<span style="font-size:26px">Brumm ${pips}</span>` : '<span style="font-size:26px">Brumm is down!</span>';
  }

  private hint(h: HudState, l: BoardLayout): string {
    if (!h.held) return '';
    const tip = this.info.tip ? `<br><span class="t18">${esc(this.info.tip)}</span>` : '';
    return `<div class="hint" style="left:${l.x + l.w / 2}px;top:${l.y + l.h * 0.72}px">${LAUNCH_HINT}${tip}</div>`;
  }

  private set(k: string, html: string): void {
    const el = this.root.querySelector<HTMLElement>(`[data-k="${k}"]`);
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  update(h: HudState): void {
    const l = this.layout;
    if (!l) return;
    const pct = h.breakable > 0 ? Math.round((h.broken / h.breakable) * 100) : 0;
    const key = `${h.lives}|${h.bossHits}|${pct}|${Math.floor(h.t)}|${h.held}`;
    if (key === this.last) return;
    this.last = key;
    this.set('hearts', heartsHtml(h.lives));
    this.set('boss', this.bossLine(h));
    this.set('time', clock(h.t));
    this.set('pct', `${pct}%`);
    this.set('shells', this.shellsLine(h, h.lives < 3));
    this.set('hint', this.hint(h, l));
    const bar = this.root.querySelector<HTMLElement>('[data-k="bar"]');
    if (bar) bar.style.width = `${pct}%`;
  }

  destroy(): void {
    this.root.innerHTML = '';
    this.root.hidden = true;
  }
}
