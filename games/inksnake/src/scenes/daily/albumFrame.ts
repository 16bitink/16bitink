import type Phaser from 'phaser';
import { BLUE_HEX, LEAF, RED_HEX } from '../../art/palette';

/** Frame inks by tier 1..6: blue, leaf, red, gold, violet, then gold again over rainbow dots. */
const INKS = [BLUE_HEX, Number.parseInt(LEAF.slice(1), 16), RED_HEX, 0xa0622c, 0x6a3f8f, 0xc79a2b] as const;
const DOTS = [0xb3322b, 0xe0a030, 0x5f8f4e, 0x27408b, 0x6a3f8f] as const;

/**
 * The album page's frame for a milestone tier (1..6): every tier keeps the
 * ones before it. 1 a pen line, 2 a second line, 3 corner flourishes, 4 a
 * dotted inner border, 5 corner rosettes, 6 a ring of rainbow dots.
 * Centred on the card (w × h), drawn over the paper.
 */
export function albumFrame(scene: Phaser.Scene, w: number, h: number, tier: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setPosition(0, h / 2);
  const ink = INKS[Math.min(INKS.length, Math.max(1, tier)) - 1]!;
  const x = w / 2 - 12;
  const y = h / 2 - 12;
  g.lineStyle(2.4, ink, 0.85).strokeRoundedRect(-x, -y, x * 2, y * 2, 6);
  if (tier >= 2) g.lineStyle(1.2, ink, 0.7).strokeRoundedRect(-x + 6, -y + 6, (x - 6) * 2, (y - 6) * 2, 4);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const cx = sx * (x - 6);
    const cy = sy * (y - 6);
    if (tier >= 3) g.lineStyle(2, ink, 0.9).beginPath().moveTo(cx, cy - sy * 22).lineTo(cx, cy).lineTo(cx - sx * 22, cy).strokePath();
    if (tier >= 5) g.fillStyle(ink, 0.9).fillCircle(cx - sx * 4, cy - sy * 4, 6).fillStyle(0xfffaf0, 1).fillCircle(cx - sx * 4, cy - sy * 4, 2.4);
  }
  if (tier >= 4) dots(g, x - 12, y - 12, 14, ink, 1.6, () => ink);
  if (tier >= 6) dots(g, x + 0, y + 0, 22, ink, 2.6, (i) => DOTS[i % DOTS.length]!);
  return g;
}

/** Dots spaced `step` apart along a rectangle's edge (corners skipped). */
function dots(g: Phaser.GameObjects.Graphics, x: number, y: number, step: number, _ink: number, r: number, colour: (i: number) => number): void {
  let i = 0;
  const put = (px: number, py: number): void => {
    g.fillStyle(colour(i++), 0.85).fillCircle(px, py, r);
  };
  for (let px = -x + 30; px <= x - 30; px += step) { put(px, -y); put(px, y); }
  for (let py = -y + 30; py <= y - 30; py += step) { put(-x, py); put(x, py); }
}
