import { EVENTS } from '@16bitink/game-sdk';
import type Phaser from 'phaser';
import { RED } from '../../art/palette';
import type { Album } from '../../daily/album';
import { albumTier, nextMilestone } from '../../daily/milestones';
import { shortDate } from '../../daily/dates';
import { SNAKE_FACTS } from '../../daily/snakeFacts';
import { SNAKES, SNAKE_SPECS, type SnakeId } from '../../logic/species';
import type { Sizer } from '../uiSizes';
import { inkButton, inkText } from '../ui';
import { CardBuilder, snakeHead, snakeSilhouette, GOLD_INK, SOFT_INK, TEXT_W } from './cardKit';

export interface AlbumActs {
  page(n: number): void;
  back(): void;
}

/** Cards per page: two across, three down (big enough to read on a phone). */
export const PER_PAGE = 6;
/** A phone shows fewer snakes a page, one to a row, so their facts can be read. */
const PHONE_PER_PAGE = 3;
const ROW_H = 178;

/**
 * The snake album: a card for every snake hunted with in a daily (the ten
 * home snakes and the event snakes), with its Latin name, one true fact
 * and the day first met; event snakes carry their event's stamp. Snakes
 * not met yet are ink silhouettes. It only grows.
 */
export function albumCard(scene: Phaser.Scene, album: Album, totalDays: number, page: number, a: AlbumActs): CardBuilder {
  const c = new CardBuilder(scene, 77);
  const z = c.z;
  const perPage = c.phone ? PHONE_PER_PAGE : PER_PAGE;
  const cols = c.phone ? 1 : 2;
  const colW = TEXT_W / cols;
  const pages = Math.ceil(SNAKES.length / perPage);
  const p = Math.max(0, Math.min(pages - 1, page));
  const met = SNAKES.filter((id) => album[id]).length;
  c.frameTier = albumTier(totalDays);
  c.text('Snake Album', 36, undefined, 0);
  c.text(`${met} of ${SNAKES.length} snakes met in the daily hunts`, 20, SOFT_INK, 8);
  const next = nextMilestone(totalDays);
  c.text(next === null ? `${totalDays} days played: every album page is yours` : `${totalDays} days played · a new page at ${next}`, 18, GOLD_INK, 8);
  const ids = SNAKES.slice(p * perPage, p * perPage + perPage);
  for (let row = 0; row < ids.length; row += cols) {
    // Each snake's column is laid out from the row's top, then the row takes the tallest one's height.
    const columns = ids.slice(row, row + cols).map((id, i) => albumEntry(scene, album, id, cols === 1 ? 0 : (i - 0.5) * colW, colW, z));
    const h = Math.max(c.phone ? 0 : ROW_H, ...columns.map((col) => col.bottom + 4));
    c.block(h, (cy) => columns.flatMap((col) => col.parts.map((o) => o.setY(o.y + cy - h / 2))), 6);
  }
  const pager = z.tap(46);
  c.block(Math.max(48, pager), (cy) => [
    inkButton(scene, -TEXT_W / 2 + 34, cy, '‹', () => a.page(p - 1), { width: Math.max(60, pager), height: pager, size: 30 }).setVisible(p > 0),
    inkText(scene, 0, cy, `${p + 1} / ${pages}`, z.text(22), SOFT_INK),
    inkButton(scene, TEXT_W / 2 - 34, cy, '›', () => a.page(p + 1), { width: Math.max(60, pager), height: pager, size: 30 }).setVisible(p < pages - 1),
  ], 6);
  c.buttons([{ label: 'Back', run: a.back }], 48, 24);
  return c;
}

type Placed = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/**
 * One snake's entry, laid out down from y = 0: its head, name, Latin name,
 * fact, and the day first met under the fact (however many lines it takes).
 */
function albumEntry(scene: Phaser.Scene, album: Album, id: SnakeId, x: number, colW: number, z: Sizer): { parts: Placed[]; bottom: number } {
  const card = album[id];
  const spec = SNAKE_SPECS[id];
  // A phone's single column has the room: a bigger head, the name in body size.
  const hs = z.phone ? 78 : 60;
  const ny = 76 + (hs - 60);
  const head = card ? snakeHead(scene, id, x, 34 + (hs - 60) / 2, hs) : snakeSilhouette(scene, id, x, 34 + (hs - 60) / 2, hs).setAlpha(0.35);
  const name = inkText(scene, x, ny, card ? spec.name : 'Not met yet', z.text(20, 'body'), card ? undefined : SOFT_INK).setWordWrapWidth(colW - 12).setAlign('center');
  const parts: Placed[] = [head, name];
  if (!card) return { parts, bottom: ny + name.height / 2 };
  const latin = inkText(scene, x, ny + name.height / 2 + 2, spec.latin, z.text(15), SOFT_INK).setOrigin(0.5, 0).setFontStyle('italic');
  const fact = inkText(scene, x, latin.y + latin.height - 4, SNAKE_FACTS[id], z.text(15), SOFT_INK).setOrigin(0.5, 0).setWordWrapWidth(colW - 16).setAlign('center');
  const met = inkText(scene, x, fact.y + fact.height + 2, `${card.event ? `${EVENTS[card.event].name} · ` : ''}first met ${shortDate(card.date)}`, z.text(14), card.event ? RED : SOFT_INK).setOrigin(0.5, 0);
  parts.push(latin, fact, met);
  return { parts, bottom: met.y + met.height };
}
