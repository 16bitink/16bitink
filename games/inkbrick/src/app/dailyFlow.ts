import type { DailyDay, DailyHost, DailyStanding, GameEvent, OfferPlace } from '@16bitink/game-sdk';
import { checkLevel } from '../level/validate';
import type { PlayOutcome } from '../scenes/PlayScene';
import type { LevelDef } from '../sim/types';
import { showCalendar } from '../ui/calendar';
import { showDailyEnd, noteCopied, updateStanding, type DailyEndData } from '../ui/dailyEnd';
import { clear, showCard } from '../ui/dom';
import { longDate, parseDate } from './dates';
import { lookReachedAt } from './milestones';
import { shellsFor } from './playRun';

/**
 * The daily level's flow: load the date's level from the host, play it,
 * record the play and show the end card (standing, challenge link, tomorrow
 * teaser, days played), and InkBrick's calendar of daily days. Never talks
 * to the network itself: everything goes through host.daily.
 */
export interface DailyApp {
  readonly screen: HTMLElement;
  readonly card: HTMLElement;
  readonly owned: boolean;
  readonly price: string | null;
  /** Plays a level; `done` gets the outcome, `again` restarts it. */
  playDaily(level: LevelDef, date: string, beat: number | null, done: (o: PlayOutcome) => void): void;
  setTotalDays(n: number): void;
  totalDays(): number;
  menu(): void;
  looks(back: () => void): void;
  buy(where: OfferPlace): void;
  track(e: GameEvent): void;
  /** Ends any run and clears the screens (before a card that replaces the game). */
  endRun(): void;
  /** The daily's hidden pearl was found on `date` (saved with the day; counters only go up). */
  foundPearl(date: string): void;
  /** Dates whose hidden pearl was found. */
  pearls(): readonly string[];
}

export class DailyFlow {
  private month: { year: number; month0: number } | null = null;
  private cleanup: (() => void) | null = null;

  constructor(private readonly host: DailyHost, private readonly app: DailyApp) {}

  today(): string {
    return this.host.today();
  }

  private leave(): void {
    this.cleanup?.();
    this.cleanup = null;
  }

  /** Loads and plays the daily for `date` (today, a challenge's date, or an owner's archive day). */
  async open(date: string): Promise<void> {
    this.leave();
    clear(this.app.card);
    let level: LevelDef;
    try {
      const c = checkLevel(await this.host.load(date));
      if (!c.ok) throw new Error(c.problem);
      level = c.value;
    } catch (e) {
      console.error(`[inkbrick] could not load the daily for ${date}`, e);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const why = offline ? 'Check your connection and try again.' : 'Brumm is still building it. Try again a little later.';
      showCard(this.app.card, 'No daily here', [`The daily for ${longDate(date)} isn't ready.`, why], [
        { label: 'Menu', run: () => this.app.menu() },
        { label: 'Try again', run: () => void this.open(date), kind: 'go' },
      ]);
      return;
    }
    const ch = this.host.challenge;
    const beat = ch && ch.date === date ? ch.seconds : null;
    this.app.playDaily(level, date, beat, (o) => void this.ended(level, date, beat, o));
  }

  private async ended(level: LevelDef, date: string, beat: number | null, o: PlayOutcome): Promise<void> {
    const today = this.today();
    const shells = shellsFor(o, level);
    const before = this.app.totalDays();
    const won = o.result === 'win';
    if (o.dailyPearl) this.app.foundPearl(date);
    let d: DailyEndData = {
      date, isToday: date === today, won, seconds: o.seconds, breakIn: o.breakIn, shells, standing: undefined,
      challenge: beat, totalDays: before, newLook: null, canShare: typeof navigator.share === 'function',
      tomorrow: level.tomorrow ?? null, pearl: level.dailyPearl ? (this.app.pearls().includes(date) ? (o.dailyPearl ? 'new' : 'had') : 'missed') : null,
      monthPearls: this.monthPearls(date),
    };
    this.cleanup = showDailyEnd(this.app.card, d, {
      share: () => void this.share(date, o.seconds),
      again: () => void this.open(date),
      calendar: () => void this.calendar(),
      looks: () => this.app.looks(() => this.app.menu()),
      menu: () => this.app.menu(),
    });
    const standing = await this.record({ date, result: o.result, seconds: Math.round(o.seconds * 10) / 10, ...(o.breakIn !== null ? { breakIn: Math.round(o.breakIn * 10) / 10 } : {}), shells: shells.filter(Boolean).length });
    const total = await this.fetchTotal(before);
    this.app.setTotalDays(total);
    d = { ...d, standing, totalDays: total, newLook: total > before ? lookReachedAt(total) : null };
    if (d.newLook || total !== before) {
      this.leave();
      this.cleanup = showDailyEnd(this.app.card, d, {
        share: () => void this.share(date, o.seconds),
        again: () => void this.open(date),
        calendar: () => void this.calendar(),
        looks: () => this.app.looks(() => this.app.menu()),
        menu: () => this.app.menu(),
      });
    } else updateStanding(this.app.card, d);
  }

  /** Pearls found this month (the month of `date`). */
  private monthPearls(date: string): number {
    const prefix = date.slice(0, 8);
    return this.app.pearls().filter((p) => p.startsWith(prefix)).length;
  }

  private async record(play: Parameters<DailyHost['record']>[0]): Promise<DailyStanding | null> {
    try {
      return await this.host.record(play);
    } catch (e) {
      console.warn('[inkbrick] could not record the daily', e);
      return null;
    }
  }

  async fetchTotal(fallback: number): Promise<number> {
    try {
      return await this.host.totalDays();
    } catch (e) {
      console.warn('[inkbrick] could not count days played', e);
      return fallback;
    }
  }

  async playedToday(): Promise<boolean> {
    const today = this.today();
    return (await this.history()).some((d) => d.date === today);
  }

  private async history(): Promise<readonly DailyDay[]> {
    try {
      return await this.host.history();
    } catch (e) {
      console.warn('[inkbrick] could not read the daily history', e);
      return [];
    }
  }

  private async share(date: string, seconds: number): Promise<void> {
    const url = this.host.challengeLink(date, Math.round(seconds));
    const text = `I cleared the InkBrick daily in ${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}. Can you beat it?`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'InkBrick daily', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      noteCopied(this.app.card, 'Link copied. Send it to a friend!');
    } catch (e) {
      // Sharing cancelled, or no clipboard: show the link to copy by hand.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      noteCopied(this.app.card, url);
    }
  }

  /** InkBrick's calendar: this game's daily days by month. */
  async calendar(): Promise<void> {
    this.leave();
    this.app.endRun();
    const today = this.today();
    const t = parseDate(today);
    this.month ??= { year: t.getFullYear(), month0: t.getMonth() };
    const [days, total] = await Promise.all([this.history(), this.fetchTotal(this.app.totalDays())]);
    this.app.setTotalDays(total);
    const m = this.month;
    showCalendar(this.app.card, { today, year: m.year, month0: m.month0, days, totalDays: total, owned: this.app.owned, pearls: this.app.pearls() }, {
      play: (date) => void this.open(date),
      locked: () => this.missed(),
      month: (delta) => {
        const d = new Date(m.year, m.month0 + delta, 1);
        this.month = { year: d.getFullYear(), month0: d.getMonth() };
        void this.calendar();
      },
      back: () => this.app.menu(),
    });
  }

  private missed(): void {
    this.app.track({ type: 'offer_view', where: 'locked' });
    const close = (): void => void this.calendar();
    showCard(this.app.card, 'A missed day', ['Play missed days with the full game.', 'Every one you fill gets an outlined mark on your calendar.', 'One-time purchase, no ads.'], [
      { label: 'Not now', run: close },
      { label: `Unlock${this.app.price ? ` · ${this.app.price}` : ''}`, run: () => this.app.buy('locked'), kind: 'gold' },
    ], close);
  }
}
