import { EVENTS } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { RED } from '../../art/palette';
import { bakeForLevel } from '../../art/textures';
import type { DailyStart } from '../../daily/client';
import { longDate } from '../../daily/dates';
import { goalLine, placeName, snakeName, winterLine } from '../../daily/text';
import { placeOf } from '../../level/levels';
import { ruleLine } from '../../level/daily';
import { boardPreview } from '../map/thumb';
import { clock } from '../ui';
import { screenSize } from '../hidpi';
import { CardBuilder, GOLD_INK, SOFT_INK } from './cardKit';

export interface IntroActs {
  play(): void;
  calendar(): void;
  album(): void;
  menu(): void;
}

const THUMB = { w: 360, h: 203 } as const;

/**
 * Before the hunt: the date, the place and the snake, the rule of the day
 * in big letters (and the event's name on an event day), the goal, a
 * preview of the board, any challenge's time to beat, and Play.
 */
export function introCard(scene: Phaser.Scene, s: DailyStart, isToday: boolean, a: IntroActs): CardBuilder {
  const { level } = s;
  const place = placeOf(level);
  bakeForLevel(scene, level);
  const c = new CardBuilder(scene, 71);
  c.text(`${isToday ? "Today's Hunt" : 'Hunt'} · ${longDate(s.date)}`, 22, SOFT_INK, 2);
  if (level.event) c.text(EVENTS[level.event].name, 34, RED, 0);
  c.text(`${placeName(place)} · the ${snakeName(level.snake)}`, level.event ? 26 : 32, undefined, 8);
  // A phone on its side has no height to spare: the essentials (the rule, the goal, Hunt!) go without the picture.
  const css = screenSize(scene);
  if (!(c.phone && css.width > css.height)) c.block(THUMB.h, (cy) => boardPreview(scene, level, place, THUMB.w, THUMB.h).setY(cy), 12);
  if (level.rule) c.text(ruleLine(level.rule), 30, RED, 4);
  c.text(goalLine(level), 22, SOFT_INK, 4);
  const aside = winterLine(level);
  if (aside) c.text(aside, 19, SOFT_INK, 4);
  if (s.beat !== null) c.text(`A friend's time to beat: ${clock(s.beat)}`, 24, GOLD_INK, 4);
  c.y += 6;
  c.buttons([{ label: 'Hunt!', run: a.play, kind: 'leaf' }], 62, 34);
  c.buttons([{ label: 'Calendar', run: a.calendar }, { label: 'Album', run: a.album }, { label: 'Map', run: a.menu }], 48, 23);
  return c;
}
