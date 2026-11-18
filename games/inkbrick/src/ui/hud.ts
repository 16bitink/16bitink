import type { BoardLayout } from '../render/layout';
import { artUrl } from '../render/art';
import { inkUrl } from '../render/ink';
import type { HudState } from '../scenes/PlayScene';
import { CRUMBLE_SHARE } from '../sim/constants';
import type { LevelDef } from '../sim/types';
import { clock, esc, heartsHtml, shellIcon } from './dom';
import { goalIconUrl } from '../render/ink/ruleIcons';
import { friendShort, GOAL_NAMES, goalIcon, ruleBannerHtml, ruleIcon, RULES, shellLabels } from './rules';

/**
 * The play HUD, beside the board: landscape puts the level, time and the
 * rule of the day in the left band and hearts, the goal, progress and the
 * three shells in the right; phones get one strip above the board with only
 * the essentials, bigger: hearts, the goal's own readout (pearls n/N, stones
 * left and % broken, the tide's next step, the friend to free, or progress),
 * time and pause. Before the first throw a banner shows the goal and the rule.
 * Updated about ten times a second by the scene.
 */
export interface HudInfo {
  readonly title: string;
  readonly subtitle: string;
  readonly par: number;
  readonly tip: string | null;
  /** The challenge link's time to beat, seconds. */
  readonly beat: number | null;
  readonly cheats: boolean;
  /** The level, for its goal and rule. */
  readonly level: LevelDef;
}

export interface HudActs {
  pause(): void;
  cheatWin(): void;
}

/** Phones and tablets read "Tap"; a mouse reads "Click or press Space". */
const TOUCH = typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
const LAUNCH_HINT = TOUCH ? 'Tap to skip the stone' : 'Click or press Space to skip the stone';
const pctOf = (share: number): number => Math.max(0, Math.min(100, Math.round(share * 100)));

const img = (url: string | null, cls: string): string => (url ? `<img class="${cls}" src="${url}" alt="">` : '');

export class Hud {
  private layout: BoardLayout | null = null;
  private last = '';

  constructor(private readonly root: HTMLElement, private readonly info: HudInfo, private readonly acts: HudActs) {
    root.className = 'hud';
    root.hidden = false;
  }

  private get goal(): HudState['goal'] {
    return this.info.level.goal ?? 'clear';
  }

  /**
   * The share that passes the level, marked on the bar: Few Stones' target; on clear and tide
   * levels 95%, since the last 5% crumbles on its own (the crumble rule). None on boss levels.
   */
  private passShare(): number | null {
    if (this.goal === 'stones') return this.info.level.need ?? 0;
    if ((this.goal === 'clear' || this.goal === 'tide') && !this.info.level.boss) return 1 - CRUMBLE_SHARE;
    return null;
  }

  /** The progress bar, with the pass line marked on it. */
  private bar(): string {
    const pass = this.passShare();
    const mark = pass !== null ? `<b class="need" style="left:${pctOf(pass)}%" title="Enough to pass"></b>` : '';
    return `<div class="bar" data-k="barbox" style="flex:1"><i data-k="bar"></i>${mark}</div>`;
  }

  setLayout(l: BoardLayout): void {
    this.layout = l;
    this.last = '';
    const beat = this.info.beat !== null ? `<div class="beat">Time to beat: ${clock(this.info.beat)}</div>` : '';
    const cheat = this.info.cheats ? '<button class="btn small" data-act="cheat">Win (dev)</button>' : '';
    const pause = '<button class="btn small" data-act="pause">Pause</button>';
    const rule = this.info.level.rule;
    const ruleSide = rule && RULES[rule] ? `<div class="row" style="justify-content:flex-end">${ruleIcon(rule, 'rule-ic big')}<span>${esc(RULES[rule].name)}</span></div>` : '';
    const goalHead = `<div class="row">${goalIcon(this.goal, 'rule-ic big')}<span class="t32">${esc(GOAL_NAMES[this.goal])}</span></div>`;
    // Few Stones has no hearts and no clock: the stones are the lives.
    const timed = this.goal !== 'stones';
    this.root.innerHTML = l.mode === 'side'
      ? `<div class="side" style="left:0;width:${l.x}px;align-items:flex-end;text-align:right">
          <div class="t44">${esc(this.info.title)}</div><div>${esc(this.info.subtitle)}</div>
          ${timed ? '<div class="t44" data-k="time"></div>' : ''}${beat}${ruleSide}<div class="row" style="justify-content:flex-end">${cheat}${pause}</div></div>
         <div class="side" style="left:${l.x + l.w}px;width:${Math.min(l.x, 340)}px">${goalHead}<div data-k="hearts"></div><div data-k="boss" class="t18"></div>
          <div class="goal-k" data-k="goal"></div>
          <div class="row" style="max-width:260px">${this.bar()}<span data-k="pct"></span></div>
          <div class="panel col" data-k="shells"></div></div><div data-k="hint"></div>`
      : `<div class="strip" style="top:${Math.max(4, l.y - 60)}px;height:56px"><div data-k="hearts"></div><span data-k="boss" class="t18"></span>
          <div class="goal-k" data-k="goal"></div>${this.showsBar() ? this.bar() : '<span style="flex:1"></span>'}${this.goal === 'stones' ? '<span data-k="pct"></span>' : ''}
          ${timed ? `<div><span data-k="time"></span>${this.info.beat !== null ? ` <span class="beat t18">/ ${clock(this.info.beat)}</span>` : ''}</div>` : ''}${cheat}${pause}</div><div data-k="hint"></div>`;
    this.root.querySelector('[data-act="pause"]')?.addEventListener('click', () => this.acts.pause());
    this.root.querySelector('[data-act="cheat"]')?.addEventListener('click', () => this.acts.cheatWin());
  }

  /** Phones keep the bar only where progress is the goal (clear, the tide, Few Stones). */
  private showsBar(): boolean {
    return this.goal === 'clear' || this.goal === 'tide' || this.goal === 'stones';
  }

  /** The goal's own readout. */
  private goalHtml(h: HudState): string {
    const lvl = this.info.level;
    switch (this.goal) {
      case 'pearls':
        return `${img(artUrl('pearl'), 'gk-ic')}<b>${h.pearlsTaken}/${h.pearlsTotal || (lvl.pearls?.length ?? 0)}</b>`;
      case 'stones': {
        const left = Math.max(0, h.stonesLeft);
        return `${img(goalIconUrl('stones'), 'gk-ic')}<b>×${left}</b>`;
      }
      case 'tide':
        return `${img(goalIconUrl('tide'), 'gk-ic')}<b>${Math.max(0, Math.ceil(h.tideNextIn))}s</b>`;
      case 'rescue': {
        const who = lvl.rescue?.who ?? 'pup';
        // Phones: the friend in its cage (or beaming once free); the side band adds the words.
        const pic = h.rescued
          ? img(artUrl(`friend-${who}-happy`), 'gk-ic big')
          : `<span class="gk-stack">${img(artUrl(`friend-${who}`), 'gk-ic big')}${img(inkUrl('cage'), 'gk-ic big')}</span>`;
        const words = this.layout?.mode === 'side' || h.rescued ? `<span>${h.rescued ? 'Free!' : `Free the ${esc(friendShort(who))}`}</span>` : '';
        return `${pic}${words}`;
      }
      default:
        return '';
    }
  }

  private shellsLine(h: HudState): string {
    const labels = shellLabels(this.info.level, clock);
    const lostHeart = h.lives < (this.info.level.rule === 'oneHeart' ? 1 : 3);
    const on: readonly boolean[] = this.goal === 'stones'
      ? [h.share >= (this.info.level.need ?? 0) - 1e-6, h.share >= ((this.info.level.need ?? 0) + 1) / 2 - 1e-6, h.share >= 1 - 1e-6]
      : [true, !lostHeart, h.t <= this.info.par];
    return labels.map((label, i) => `<div class="row">${shellIcon(on[i] === true)}${esc(label)}</div>`).join('');
  }

  /** Brumm's hits left as chunky pips (empty once he is down). */
  private bossLine(h: HudState): string {
    if (h.bossHits === null || h.bossTotal === null) return '';
    const left = Math.max(0, h.bossHits);
    const pips = '●'.repeat(left) + '○'.repeat(Math.max(0, h.bossTotal - left));
    return left > 0 ? `<span style="font-size:26px">Brumm ${pips}</span>` : '<span style="font-size:26px">Brumm is down!</span>';
  }

  /** A banner only says something when the level has a goal of its own or a rule of the day. */
  private get hasBanner(): boolean {
    return this.goal !== 'clear' || this.info.level.rule !== undefined;
  }

  private hint(h: HudState, l: BoardLayout): string {
    if (!h.held) return '';
    const banner = h.fresh && this.hasBanner;
    const tip = this.info.tip ? `<br><span class="t18${banner ? ' tip' : ''}">${esc(this.info.tip)}</span>` : '';
    if (!banner) return `<div class="hint" style="left:${l.x + l.w / 2}px;top:${l.y + l.h * 0.72}px">${LAUNCH_HINT}${h.fresh ? tip : ''}</div>`;
    // Before the first throw: the goal and the rule of the day, then how to throw. Low on the
    // board, under where the bricks usually are.
    return `<div class="hint fresh" style="left:${l.x + l.w / 2}px;top:${l.y + l.h * 0.7}px;width:${Math.min(l.w * 0.94, 460)}px">${ruleBannerHtml(this.info.level)}<span>${LAUNCH_HINT}</span>${tip.replace('<br>', '')}</div>`;
  }

  private set(k: string, html: string): void {
    const el = this.root.querySelector<HTMLElement>(`[data-k="${k}"]`);
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  update(h: HudState): void {
    const l = this.layout;
    if (!l) return;
    const share = this.goal === 'stones' || this.goal === 'tide' ? h.share : h.breakable > 0 ? h.broken / h.breakable : 0;
    const pct = pctOf(share);
    const key = `${h.lives}|${h.bossHits}|${pct}|${Math.floor(h.t)}|${h.held}|${h.fresh}|${h.pearlsTaken}|${h.stonesLeft}|${Math.ceil(h.tideNextIn)}|${h.rescued}`;
    if (key === this.last) return;
    this.last = key;
    this.set('hearts', this.goal === 'stones' ? '' : heartsHtml(h.lives, this.info.level.rule === 'oneHeart' ? 1 : 3));
    this.set('boss', this.bossLine(h));
    this.set('goal', this.goalHtml(h));
    this.set('time', clock(h.t));
    // The clock stops while Skip aims: dim it so it reads as paused.
    const time = this.root.querySelector<HTMLElement>('[data-k="time"]');
    if (time) {
      time.style.opacity = h.held ? '0.4' : '';
      time.title = h.held ? 'Paused until you skip the stone' : '';
    }
    this.set('pct', `${pct}%`);
    this.set('shells', this.shellsLine(h));
    this.set('hint', this.hint(h, l));
    const bar = this.root.querySelector<HTMLElement>('[data-k="bar"]');
    if (bar) bar.style.width = `${pct}%`;
    // Past the pass line the bar turns gold: the rest is a bonus (or crumbles on its own).
    const pass = this.passShare();
    this.root.querySelector<HTMLElement>('[data-k="barbox"]')?.classList.toggle('passed', pass !== null && share >= pass - 1e-6);
  }

  destroy(): void {
    this.root.innerHTML = '';
    this.root.hidden = true;
  }
}
