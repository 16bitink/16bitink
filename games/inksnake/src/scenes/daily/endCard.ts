import type { DailyStanding } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { RED } from '../../art/palette';
import { MILESTONES, type DailyOutcome, type DailyStart } from '../../daily/client';
import { countdown, longDate, msToMidnight } from '../../daily/dates';
import { chapterNumber, eventTeaser, placeName, standingLine } from '../../daily/text';
import { placeOf } from '../../level/levels';
import { ruleLine } from '../../level/daily';
import { HURTS } from '../../logic/chapters/index';
import { inkText } from '../ui';
import { CardBuilder, GOLD_INK, panel, snakeHead, snakeSilhouette, SOFT_INK, TEXT_W } from './cardKit';

export interface EndData {
  readonly start: DailyStart;
  readonly outcome: DailyOutcome;
  readonly isToday: boolean;
  readonly owned: boolean;
  readonly price: string | null;
  readonly canShare: boolean;
  readonly totalDays: number;
}

export interface EndActs {
  share(): void;
  again(): void;
  calendar(): void;
  album(): void;
  menu(): void;
  buy(): void;
}

/** The parts of the end card filled in once the host answers. */
export interface EndCard {
  readonly card: CardBuilder;
  standing(s: DailyStanding | null): void;
  days(n: number, before: number): void;
  note(s: string): void;
}

function daysLine(n: number, before: number): string {
  const days = `${n} ${n === 1 ? 'day' : 'days'} played`;
  return n > before && (MILESTONES as readonly number[]).includes(n) ? `${days}: a new stamp on your calendar!` : days;
}

/** "Caught in 1:23" or how it ended. */
function title(o: DailyOutcome): string {
  if (o.won) return `Hunt done in ${Math.floor(o.seconds / 60)}:${String(Math.floor(o.seconds % 60)).padStart(2, '0')}`;
  if (o.lostBy === 'time') return 'Out of time…';
  return HURTS[o.lostBy ?? '']?.title ?? 'Caught out…';
}

function challengeLine(d: EndData): string | null {
  const beat = d.start.beat;
  if (beat === null || !d.outcome.won) return null;
  const diff = Math.round(beat - d.outcome.seconds);
  return diff >= 0 ? `You beat your friend's time by ${diff} s!` : `${-diff} s slower than your friend. Again?`;
}

/**
 * After the hunt, won or lost: the result and time, the standing among
 * the day's hunters, a challenge link, days played, the tomorrow teaser
 * (its place, its snake as a silhouette, its rule, a countdown to local
 * midnight), any event in the coming week, and on a full-game place a word
 * that it's a chapter of the full game.
 */
export function endCard(scene: Phaser.Scene, d: EndData, a: EndActs): EndCard {
  const { level } = d.start;
  const place = placeOf(level);
  const c = new CardBuilder(scene, 73);
  c.text(`${level.name} · ${longDate(d.start.date)}${d.isToday ? '' : ' (played late)'}`, 21, SOFT_INK, 2);
  c.block(96, (cy) => snakeHead(scene, level.snake, 0, cy, 92).setAngle(d.outcome.won ? -90 : -104), 4);
  c.text(title(d.outcome), 38, d.outcome.won ? undefined : RED, 4);
  const beat = challengeLine(d);
  if (beat) c.text(beat, 24, GOLD_INK, 4);
  // Two lines kept for the standing: it arrives once the host answers.
  let standing!: Phaser.GameObjects.Text;
  c.block(52, (cy) => (standing = inkText(scene, 0, cy, standingLine(undefined, d.outcome.won, d.isToday), 21, SOFT_INK).setWordWrapWidth(TEXT_W).setAlign('center')), 6);
  if (d.outcome.won) c.buttons([{ label: d.canShare ? 'Challenge a friend' : 'Copy challenge link', run: a.share, kind: 'sky' }], 52, 25, 4);
  const note = c.text('', 18, SOFT_INK, 4);
  const days = c.text(daysLine(d.totalDays, d.totalDays), 23, undefined, 8);
  if (d.isToday) teaser(scene, c, d);
  const soon = eventTeaser(d.start.date);
  if (soon) c.text(soon, 21, RED, 6);
  if (place !== 'farm' && !d.owned) {
    const line = c.text(`${placeName(place)} is chapter ${chapterNumber(place)} of the full game${d.price ? ` · ${d.price}` : ''}`, 20, GOLD_INK, 8);
    line.setInteractive({ useHandCursor: true }).on('pointerup', a.buy);
  }
  c.buttons([{ label: d.outcome.won ? 'Hunt again' : 'Try again', run: a.again, kind: d.outcome.won ? 'paper' : 'leaf' }, { label: 'Calendar', run: a.calendar }], 50, 25);
  c.buttons([{ label: 'Album', run: a.album }, { label: 'Map', run: a.menu }], 46, 23);
  return {
    card: c,
    standing: (s) => standing.setText(standingLine(s, d.outcome.won, d.isToday)),
    days: (n, before) => days.setText(daysLine(n, before)),
    note: (s) => note.setText(s),
  };
}

/** Tomorrow's hunt, teased: its snake's silhouette, its place and rule, and the time until it opens. */
function teaser(scene: Phaser.Scene, c: CardBuilder, d: EndData): void {
  const t = d.start.level.tomorrow;
  const h = 96;
  c.block(h, (cy) => {
    const parts: Phaser.GameObjects.GameObject[] = [panel(scene, cy, TEXT_W + 16, h)];
    const textX = t ? -TEXT_W / 2 + 96 : 0;
    if (t) parts.push(snakeSilhouette(scene, t.snake, -TEXT_W / 2 + 46, cy, 78));
    const head = t ? `Tomorrow: ${placeName(t.place)} · ${ruleLine(t.rule)}` : 'A new hunt every day';
    const top = inkText(scene, textX, cy - 18, head, 20).setOrigin(t ? 0 : 0.5, 0.5).setWordWrapWidth(TEXT_W - 100);
    const clockText = inkText(scene, textX, cy + 22, '', 22, SOFT_INK).setOrigin(t ? 0 : 0.5, 0.5);
    const tick = (): void => {
      clockText.setText(`New hunt in ${countdown(msToMidnight(new Date()))}`);
    };
    tick();
    scene.time.addEvent({ delay: 1000, loop: true, callback: tick });
    parts.push(top, clockText);
    return parts;
  }, 10);
}
