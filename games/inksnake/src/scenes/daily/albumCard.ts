import { EVENTS } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { RED } from '../../art/palette';
import type { Album } from '../../daily/album';
import { albumTier, nextMilestone } from '../../daily/milestones';
import { shortDate } from '../../daily/dates';
import { SNAKE_FACTS } from '../../daily/snakeFacts';
import { SNAKES, SNAKE_SPECS } from '../../logic/species';
import { inkButton, inkText } from '../ui';
import { CardBuilder, snakeHead, snakeSilhouette, GOLD_INK, SOFT_INK, TEXT_W } from './cardKit';

export interface AlbumActs {
  page(n: number): void;
  back(): void;
}

/** Cards per page: two across, three down (big enough to read on a phone). */
export const PER_PAGE = 6;
const ROW_H = 178;
const COL_W = TEXT_W / 2;

/**
 * The snake album: a card for every snake hunted with in a daily (the ten
 * home snakes and the event snakes), with its Latin name, one true fact
 * and the day first met; event snakes carry their event's stamp. Snakes
 * not met yet are ink silhouettes. It only grows.
 */
export function albumCard(scene: Phaser.Scene, album: Album, totalDays: number, page: number, a: AlbumActs): CardBuilder {
  const pages = Math.ceil(SNAKES.length / PER_PAGE);
  const p = Math.max(0, Math.min(pages - 1, page));
  const met = SNAKES.filter((id) => album[id]).length;
  const c = new CardBuilder(scene, 77);
  c.frameTier = albumTier(totalDays);
  c.text('Snake Album', 36, undefined, 0);
  c.text(`${met} of ${SNAKES.length} snakes met in the daily hunts`, 20, SOFT_INK, 8);
  const next = nextMilestone(totalDays);
  c.text(next === null ? `${totalDays} days played: every album page is yours` : `${totalDays} days played · a new page at ${next}`, 18, GOLD_INK, 8);
  const ids = SNAKES.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE);
  for (let row = 0; row < ids.length; row += 2) {
    c.block(ROW_H, (cy) => ids.slice(row, row + 2).flatMap((id, i) => {
      const x = (i - 0.5) * COL_W;
      const card = album[id];
      const spec = SNAKE_SPECS[id];
      const top = cy - ROW_H / 2;
      const head = card ? snakeHead(scene, id, x, top + 34, 60) : snakeSilhouette(scene, id, x, top + 34, 60).setAlpha(0.35);
      const parts: Phaser.GameObjects.GameObject[] = [head, inkText(scene, x, top + 76, card ? spec.name : 'Not met yet', 20, card ? undefined : SOFT_INK).setWordWrapWidth(COL_W - 12).setAlign('center')];
      if (card) {
        parts.push(inkText(scene, x, top + 98, spec.latin, 15, SOFT_INK).setFontStyle('italic'));
        parts.push(inkText(scene, x, top + 113, SNAKE_FACTS[id], 15, SOFT_INK).setOrigin(0.5, 0).setWordWrapWidth(COL_W - 16).setAlign('center'));
        parts.push(inkText(scene, x, top + ROW_H - 8, `${card.event ? `${EVENTS[card.event].name} · ` : ''}first met ${shortDate(card.date)}`, 14, card.event ? RED : SOFT_INK));
      }
      return parts;
    }), 6);
  }
  c.block(48, (cy) => [
    inkButton(scene, -TEXT_W / 2 + 34, cy, '‹', () => a.page(p - 1), { width: 60, height: 46, size: 30 }).setVisible(p > 0),
    inkText(scene, 0, cy, `${p + 1} / ${pages}`, 22, SOFT_INK),
    inkButton(scene, TEXT_W / 2 - 34, cy, '›', () => a.page(p + 1), { width: 60, height: 46, size: 30 }).setVisible(p < pages - 1),
  ], 6);
  c.buttons([{ label: 'Back', run: a.back }], 48, 24);
  return c;
}
