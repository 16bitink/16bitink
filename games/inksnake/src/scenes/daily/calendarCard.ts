import { eventOn, type DailyDay } from '@16bitink/game-sdk';
import Phaser from 'phaser';
import { BLUE_HEX, RED_HEX } from '../../art/palette';
import { monthGrid, monthTitle } from '../../daily/dates';
import { inkButton, inkText } from '../ui';
import { CardBuilder, GOLD_INK, SOFT_INK, TEXT_W } from './cardKit';

export interface CalendarData {
  readonly today: string;
  readonly year: number;
  readonly month0: number;
  readonly days: readonly DailyDay[];
  readonly totalDays: number;
  readonly owned: boolean;
  /** Milestone (days played) → date reached. */
  readonly stamps: Readonly<Record<string, string>>;
}

export interface CalendarActs {
  play(date: string): void;
  locked(): void;
  month(delta: number): void;
  back(): void;
}

const CELL = 54;
const GOLD_HEX = 0xa0622c;
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/**
 * InkSnake's calendar of hunts, a month at a time: a blot on every day
 * played (a ring for a loss, outlined when it was played late), a star on
 * event days, today circled. Owners pick past days from it to play; for
 * everyone else a past day offers the full game. No streaks: only days played.
 */
export function calendarCard(scene: Phaser.Scene, d: CalendarData, a: CalendarActs): CardBuilder {
  const c = new CardBuilder(scene, 75);
  const played = new Map(d.days.map((x) => [x.date, x]));
  c.block(44, (cy) => [
    inkButton(scene, -TEXT_W / 2 + 20, cy, '‹', () => a.month(-1), { width: 46, height: 44, size: 30 }),
    inkText(scene, 0, cy, monthTitle(d.year, d.month0), 32),
    inkButton(scene, TEXT_W / 2 - 20, cy, '›', () => a.month(1), { width: 46, height: 44, size: 30 }),
  ], 4);
  c.block(24, (cy) => WEEKDAYS.map((w, i) => inkText(scene, (i - 3) * CELL, cy, w, 18, SOFT_INK)), 2);
  for (const week of monthGrid(d.year, d.month0)) {
    c.block(CELL - 4, (cy) => week.flatMap((date, i) => (date ? dayCell(scene, (i - 3) * CELL, cy, date, played.get(date), d, a) : [])), 4);
  }
  c.y += 4;
  c.text(`${d.totalDays} ${d.totalDays === 1 ? 'day' : 'days'} played`, 26, undefined, 2);
  if (Object.keys(d.stamps).length) c.text('Gold marks: days you reached a milestone', 16, GOLD_INK, 2);
  c.text(d.owned ? 'Tap a past day to hunt it.' : 'Past days are for the full game.', 19, SOFT_INK, 8);
  c.buttons([{ label: 'Back', run: a.back }], 48, 24);
  return c;
}

function dayCell(scene: Phaser.Scene, x: number, y: number, date: string, day: DailyDay | undefined, d: CalendarData, a: CalendarActs): Phaser.GameObjects.GameObject[] {
  const g = scene.add.graphics();
  const future = date > d.today;
  const r = CELL * 0.38;
  if (day) {
    if (day.result === 'win' && !day.late) g.fillStyle(BLUE_HEX, 0.78).fillCircle(x, y, r);
    g.lineStyle(day.late ? 2.4 : 2, BLUE_HEX, day.late ? 0.9 : 0.7).strokeCircle(x, y, r);
  }
  if (date === d.today) g.lineStyle(2.4, RED_HEX, 0.9).strokeCircle(x, y, r + 4);
  if (eventOn(date)) g.fillStyle(RED_HEX, 0.85).fillPoints(star(x + r * 0.85, y - r * 0.85, 6.5, 3), true);
  const light = day?.result === 'win' && !day.late;
  const t = inkText(scene, x, y, String(Number(date.slice(8))), 22, light ? '#fffaf0' : future ? '#b8b2a4' : SOFT_INK);
  const out: Phaser.GameObjects.GameObject[] = [g, t];
  const reached = Object.entries(d.stamps).find(([, when]) => when === date)?.[0];
  if (reached) {
    // A gold rosette for a day-milestone reached on this day.
    const sx = x - r * 0.85;
    const sy = y - r * 0.85;
    g.fillStyle(GOLD_HEX, 1).fillCircle(sx, sy, 8).lineStyle(1.5, RED_HEX, 0.9).strokeCircle(sx, sy, 8);
    out.push(inkText(scene, sx, sy, reached, reached.length > 2 ? 9 : 11, '#fffaf0'));
  }
  if (!future) {
    const zone = scene.add.zone(x, y, CELL - 2, CELL - 2).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => (date === d.today || d.owned ? a.play(date) : a.locked()));
    out.push(zone);
  }
  return out;
}

/** A five-pointed star's points (an event day's mark). */
function star(x: number, y: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? inner : outer;
    return new Phaser.Math.Vector2(x + Math.cos(a) * k, y + Math.sin(a) * k);
  });
}
