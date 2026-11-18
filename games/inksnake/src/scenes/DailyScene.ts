import type { DailyStanding } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { PAPER, PAPER_HEX } from '../art/palette';
import { addToAlbum } from '../daily/album';
import { stampReached } from '../daily/milestones';
import { commitProgress } from '../logic/accountSave';
import { loadProgress } from '../logic/save';
import { DailyClient, type DailyOutcome, type DailyStart } from '../daily/client';
import { getHost, getSound, trackOffer } from '../host';
import { albumCard } from './daily/albumCard';
import { calendarCard } from './daily/calendarCard';
import { CardBuilder, SOFT_INK } from './daily/cardKit';
import { endCard } from './daily/endCard';
import { introCard } from './daily/introCard';
import { screenScene, screenSize, viewSize } from './hidpi';
import { inkText } from './ui';
import { uprightScreen } from './uiLayout';
import { softenBoard } from './uiPaint';

/** What the daily's screen shows: the card before a hunt, the end card, the calendar or the album. */
export type DailyData =
  | { readonly mode: 'intro'; readonly date: string }
  | { readonly mode: 'end'; readonly start: DailyStart; readonly outcome: DailyOutcome }
  | { readonly mode: 'calendar'; readonly month?: { readonly year: number; readonly month0: number } }
  | { readonly mode: 'album'; readonly page?: number };

/** The host's daily as the game uses it, or null where the host has none. */
export function dailyClient(scene: Phaser.Scene): DailyClient | null {
  const daily = getHost(scene).daily;
  return daily ? new DailyClient(daily) : null;
}

/** Each hunt's play, recorded once (a resized screen lays the end card out again without recording twice). */
const records = new Map<string, Promise<DailyStanding | null>>();

/** Days played, as last heard from the host this session (the end card counts on from it). */
const TOTAL = 'dailyTotalDays';

/**
 * Today's Hunt, InkSnake's daily level: the card before it, the end card
 * (over the stilled board), the calendar of hunts and the snake album.
 * Everything goes through host.daily (see DailyClient); a daily never
 * touches the campaign's progress.
 */
export class DailyScene extends Phaser.Scene {
  private client!: DailyClient;
  private card: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Daily');
  }

  create(data: DailyData): void {
    screenScene(this, true);
    this.card = null;
    const client = dailyClient(this);
    if (!client) {
      this.scene.start('Menu');
      return;
    }
    this.client = client;
    const behind = this.scene.isPaused('Game');
    const view = viewSize(this);
    if (behind) {
      const unblur = softenBoard(this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, unblur);
    } else this.cameras.main.setBackgroundColor(PAPER);
    this.add.rectangle(0, 0, view.width, view.height, PAPER_HEX, behind ? 0.55 : 0).setOrigin(0).setInteractive();
    const esc = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') this.menu();
    };
    this.input.keyboard?.on('keydown', esc);
    if (data.mode === 'intro') void this.intro(data.date);
    else if (data.mode === 'end') void this.end(data.start, data.outcome);
    else if (data.mode === 'calendar') void this.calendar(data.month);
    else void this.album(data.page ?? 0);
    const relayout = (): void => {
      this.scene.restart(data);
    };
    this.scale.once('resize', relayout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', relayout));
  }

  private show(c: CardBuilder): void {
    this.card?.destroy();
    const css = screenSize(this);
    this.card = c.finish(viewSize(this), uprightScreen(css.width, css.height));
    getSound(this)?.play('card');
  }

  private wait(text: string): Phaser.GameObjects.Text {
    const view = viewSize(this);
    return inkText(this, view.width / 2, view.height / 2, text, 30, SOFT_INK);
  }

  /** The card before a hunt (or why there isn't one yet). */
  private async intro(date: string): Promise<void> {
    const note = this.wait('Finding the trail…');
    try {
      const start = await this.client.start(date);
      if (!this.scene.isActive()) return;
      note.destroy();
      this.show(introCard(this, start, date === this.client.today(), {
        play: () => this.scene.start('Game', { daily: start }),
        calendar: () => this.go({ mode: 'calendar' }),
        album: () => this.go({ mode: 'album' }),
        menu: () => this.menu(),
      }));
    } catch (err) {
      console.error(`[inksnake] could not load the daily for ${date}`, err);
      if (!this.scene.isActive()) return;
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      note.setText(offline ? "No connection: today's hunt needs one to start.\nTap to try again." : "Today's hunt isn't ready yet.\nTap to try again.").setAlign('center');
      note.setInteractive({ useHandCursor: true }).once('pointerup', () => this.go({ mode: 'intro', date }));
    }
  }

  /** The end card: shown at once, then the standing and days played as the host answers. */
  private async end(start: DailyStart, outcome: DailyOutcome): Promise<void> {
    const host = getHost(this);
    const before = (this.registry.get(TOTAL) as number | undefined) ?? 0;
    const store = host.storage;
    const mine = loadProgress(store);
    commitProgress(host, { ...mine, album: addToAlbum(mine.album ?? {}, start.level.snake, start.date, start.level.event) });
    const card = endCard(this, {
      start, outcome, isToday: start.date === this.client.today(), owned: host.unlocked, price: host.price ?? null,
      canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function', totalDays: before,
    }, {
      share: () => void this.share(start.date, outcome.seconds, (s) => card.note(s)),
      again: () => this.scene.start('Game', { daily: start }),
      calendar: () => this.go({ mode: 'calendar' }),
      album: () => this.go({ mode: 'album' }),
      menu: () => this.menu(),
      buy: () => {
        trackOffer(this, 'locked');
        host.onBuy('locked');
      },
    });
    this.show(card.card);
    const key = `${start.date}:${outcome.seconds}:${outcome.won}`;
    const pending = records.get(key) ?? this.client.record(start.date, outcome);
    records.set(key, pending);
    const standing = await pending;
    if (!this.scene.isActive()) return;
    card.standing(standing);
    const total = await this.client.totalDays(before);
    if (!this.scene.isActive()) return;
    this.registry.set(TOTAL, total);
    card.days(total, before);
    const now = loadProgress(store);
    const stamps = stampReached(now.stamps ?? {}, before, total, start.date);
    if (stamps !== (now.stamps ?? {})) commitProgress(host, { ...now, stamps });
  }

  private async share(date: string, seconds: number, note: (s: string) => void): Promise<void> {
    const url = this.client.challengeLink(date, seconds);
    const text = `I finished today's InkSnake hunt in ${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}. Can you beat it?`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: "InkSnake: Today's Hunt", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      note('Link copied. Send it to a friend!');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      note(url);
    }
  }

  private async calendar(month?: { readonly year: number; readonly month0: number }): Promise<void> {
    const host = getHost(this);
    const today = this.client.today();
    const m = month ?? { year: Number(today.slice(0, 4)), month0: Number(today.slice(5, 7)) - 1 };
    const note = this.wait('Opening the calendar…');
    const [days, total] = await Promise.all([this.client.history(), this.client.totalDays((this.registry.get(TOTAL) as number | undefined) ?? 0)]);
    if (!this.scene.isActive()) return;
    note.destroy();
    this.registry.set(TOTAL, total);
    this.show(calendarCard(this, { today, ...m, days, totalDays: total, owned: host.unlocked, stamps: loadProgress(host.storage).stamps ?? {} }, {
      play: (date) => this.go({ mode: 'intro', date }),
      locked: () => {
        trackOffer(this, 'locked');
        if (host.price) host.onBuy('locked');
      },
      month: (delta) => {
        const d = new Date(m.year, m.month0 + delta, 1);
        this.go({ mode: 'calendar', month: { year: d.getFullYear(), month0: d.getMonth() } });
      },
      back: () => this.menu(),
    }));
  }

  private async album(page: number): Promise<void> {
    const progress = loadProgress(getHost(this).storage);
    const total = await this.client.totalDays((this.registry.get(TOTAL) as number | undefined) ?? 0);
    if (!this.scene.isActive()) return;
    this.registry.set(TOTAL, total);
    this.show(albumCard(this, progress.album ?? {}, total, page, {
      page: (n) => this.go({ mode: 'album', page: Math.max(0, n) }),
      back: () => this.menu(),
    }));
  }

  /** Another of the daily's screens (the held board goes). */
  private go(data: DailyData): void {
    this.scene.stop('Game');
    this.scene.restart(data);
  }

  private menu(): void {
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}
