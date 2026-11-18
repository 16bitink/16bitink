import type Phaser from 'phaser';
import { countdown, longDate, msUntil } from '../../daily/dates';
import { CardBuilder, SOFT_INK } from './cardKit';

export interface SoonActs {
  /** The first hunt has opened: show it. */
  open(): void;
  menu(): void;
}

/**
 * Before the first hunt exists: when it starts, counting down to the
 * player's own midnight that day, instead of an error. Something to look
 * forward to: when the clock reaches zero the hunt opens by itself.
 */
export function soonCard(scene: Phaser.Scene, first: string, a: SoonActs): CardBuilder {
  const c = new CardBuilder(scene, 71);
  c.text('The hunts begin soon', 32, undefined, 8);
  c.text('The first hunt starts', 22, SOFT_INK, 0);
  c.text(longDate(first), 26, undefined, 4);
  const clockText = c.text('', 30, undefined, 4);
  let opened = false;
  const tick = (): void => {
    if (!clockText.active || opened) return;
    const left = msUntil(first, new Date());
    if (left <= 0) {
      opened = true;
      a.open();
      return;
    }
    clockText.setText(`in ${countdown(left)}`);
  };
  tick();
  scene.time.addEvent({ delay: 1000, loop: true, callback: tick });
  c.text('A new place, snake and rule every day.', 20, SOFT_INK, 4);
  c.y += 6;
  c.buttons([{ label: 'Map', run: a.menu }], 52, 26);
  return c;
}
