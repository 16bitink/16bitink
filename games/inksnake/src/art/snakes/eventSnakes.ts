import { SNAKE_W } from '../types';
import type { SnakeArt } from '../types';
import { CORN } from './corn';
import { isInk, recoloured, type Glaze, type Hsl } from './recolour';

/**
 * The dailies' event snakes painted so far, each a recolouring of its
 * relative's painting (see recolour.ts):
 *
 * - candycane: the candy cane corn snake, an amelanistic corn morph: no
 *   black at all, a near-white ground blushed pink, bright red saddles.
 * - rainbowboa: the Brazilian rainbow boa: a deep orange-red ground, the
 *   saddles turned to paler rings in black rims, and the iridescent sheen
 *   (structural colour) glazed along the lit top of the body.
 */

const warm = (c: Hsl): boolean => c.h < 55 || c.h > 335;
const red = (c: Hsl): boolean => (c.h < 15 || c.h > 340) && c.s > 0.4 && c.l > 0.18;

function candyCane(c: Hsl): Hsl | null {
  if (isInk(c) || !warm(c)) return null;
  // The black rims of the corn's saddles: an amelanistic snake has none.
  if (c.l < 0.2) return { h: 350, s: 0.3, l: 0.9 };
  if (red(c)) return { h: 354, s: Math.min(1, c.s * 1.1 + 0.1), l: c.l * 0.95 + 0.04 };
  // The orange ground: white, warmed pink in its shadows.
  return { h: 352, s: 0.28 + (1 - c.l) * 0.25, l: 0.74 + c.l * 0.24 };
}

function rainbow(c: Hsl): Hsl | null {
  if (isInk(c) || !warm(c)) return null;
  if (c.l < 0.2) return { h: 12, s: 0.45, l: c.l * 0.7 };
  if (red(c)) return { h: 26, s: 0.7, l: Math.min(0.72, c.l * 1.25 + 0.08) };
  return { h: 14, s: Math.min(1, c.s * 0.95), l: c.l * 0.78 };
}

/** The rainbow boa's sheen: bands of violet, blue, green and gold along the lit side, glazed lightly over the paint. */
const sheen: Glaze = (ctx, part, size) => {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const h = part === 'strip' ? SNAKE_W : size.h;
  const top = part === 'strip' ? 0 : -size.h / 2;
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, 'rgba(150,110,230,0.0)');
  g.addColorStop(0.12, 'rgba(150,110,230,0.34)');
  g.addColorStop(0.24, 'rgba(90,170,235,0.3)');
  g.addColorStop(0.34, 'rgba(110,215,150,0.24)');
  g.addColorStop(0.44, 'rgba(245,210,110,0.18)');
  g.addColorStop(0.56, 'rgba(245,210,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(part === 'strip' ? 0 : -size.w / 2, top, size.w, h);
  ctx.restore();
};

export const CANDYCANE: SnakeArt = recoloured(CORN, candyCane, { base: '#f6e6e6', mark: '#d22a3a', belly: '#fbf3f0' });
export const RAINBOWBOA: SnakeArt = recoloured(CORN, rainbow, { base: '#b4482a', mark: '#e0904a', belly: '#f0d9b8' }, sheen);
