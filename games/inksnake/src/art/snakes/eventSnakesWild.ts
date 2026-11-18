import { SNAKE_W } from '../types';
import type { SnakeArt } from '../types';
import { HOGNOSE_ART } from '../chapters/barrensSnake';
import { FLYING_ART } from '../chapters/rainforestSnake';
import { KRAIT_ART } from '../chapters/reefSnake';
import { CORN } from './corn';
import { recoloured, type Glaze, type Hsl } from './recolour';

/**
 * The dailies' other event snakes, each its relative's painting repainted
 * (recolour.ts), with a glaze of its own markings where the colour alone
 * can't make them:
 *
 * - goldentree (golden tree snake): the paradise flying snake's net of black
 *   round green scales, the flowers turned gold, a warm yellow on the spine.
 * - rosyboa: the corn snake's body in cream-grey, the saddles faded, and
 *   three broad rose-brown stripes glazed along it (one down the back, one
 *   low on each flank).
 * - greenpython (green tree python): vivid green, the net dark green, white
 *   and yellow flecks scattered down the spine.
 * - earthsnake (smooth earth snake): the hognose's body plain grey-brown, its
 *   blotches faded to faint flecks.
 * - yellowsea (yellow-bellied sea snake): the sea krait's body, black down
 *   the back and bright yellow on the sides.
 * - blackhognose: the hognose's body black-grey (its belly, kept, goes pale
 *   grey for playing dead).
 */

/** The pen's own navy line (outlines): left alone. */
const pen = (c: Hsl): boolean => c.h > 200 && c.h < 270 && c.s > 0.4 && c.l < 0.4;
const green = (c: Hsl): boolean => c.h > 60 && c.h < 160;
const red = (c: Hsl): boolean => (c.h < 25 || c.h > 335) && c.s > 0.45;

const hash = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

function goldenTree(c: Hsl): Hsl | null {
  if (red(c)) return { h: 44, s: 0.9, l: Math.min(0.62, c.l * 1.15 + 0.06) };
  if (green(c)) return { h: c.h + 2, s: Math.min(1, c.s * 0.95), l: c.l * 0.92 };
  return null;
}

function greenPython(c: Hsl): Hsl | null {
  if (red(c)) return { h: 54, s: 0.35, l: 0.93 };
  if (green(c)) return { h: 112, s: Math.min(1, c.s * 0.85 + 0.12), l: Math.min(0.5, c.l * 0.88) };
  if (c.l < 0.3 && c.s < 0.5) return { h: 130, s: 0.55, l: c.l * 0.9 };
  return null;
}

function rosyGround(c: Hsl): Hsl | null {
  if (pen(c) || c.h > 70 && c.h < 200) return null;
  // The corn's saddles and orange ground, all cream-grey; only the shadows go dusky.
  if (c.l < 0.22) return { h: 28, s: 0.18, l: c.l * 0.9 + 0.14 };
  return { h: 34, s: 0.2 + (1 - c.l) * 0.12, l: 0.55 + c.l * 0.22 };
}

function earth(c: Hsl): Hsl | null {
  if (pen(c)) return null;
  if (c.l < 0.34) return { h: 32, s: 0.2, l: 0.4 + c.l * 0.35 };
  return { h: 36, s: 0.16 + c.s * 0.1, l: 0.5 + (c.l - 0.4) * 0.45 };
}

function blackHognose(c: Hsl): Hsl | null {
  if (pen(c)) return null;
  if (c.l > 0.7 && c.s < 0.2) return { h: 215, s: 0.06, l: c.l * 0.86 }; // the pale belly
  return { h: 220, s: 0.05, l: Math.max(0.05, c.l * 0.36) };
}

function yellowSea(c: Hsl): Hsl | null {
  if (pen(c)) return null;
  if (c.l > 0.45) return { h: 49, s: 0.95, l: Math.min(0.62, 0.3 + c.l * 0.4) };
  if (c.h > 30 && c.h < 60 && c.s > 0.3) return null; // the head's gold
  return { h: 220, s: 0.1, l: c.l * 0.6 };
}

/** A soft stripe along the strip with a wobbling edge. */
function stripe(ctx: CanvasRenderingContext2D, length: number, y: number, w: number, colour: string, alpha: number, seed: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [dw, a] of [[1, 0.55], [0.78, 1], [0.5, 0.7]] as const) {
    ctx.globalAlpha = alpha * a;
    ctx.lineWidth = w * dw;
    ctx.beginPath();
    for (let x = -4; x <= length + 4; x += 4) {
      const wob = Math.sin(x * 0.16 + seed) * 0.5 + (hash(x + seed) - 0.5) * 0.5;
      if (x === -4) ctx.moveTo(x, y + wob);
      else ctx.lineTo(x, y + wob);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Small dots of one colour at seeded spots along the strip's band. */
function dots(ctx: CanvasRenderingContext2D, length: number, y0: number, y1: number, n: number, colour: string, alpha: number, r: number, seed: number): void {
  ctx.fillStyle = colour;
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3 + seed) * length;
    const y = y0 + hash(i * 7 + seed + 1) * (y1 - y0);
    ctx.globalAlpha = alpha * (0.6 + hash(i + seed) * 0.4);
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.7 + hash(i + 5) * 0.6), r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A glaze that paints on the strip only, under source-atop, wrapped to the strip's own coordinates. */
const onStrip = (paint: (ctx: CanvasRenderingContext2D, length: number) => void): Glaze => (ctx, part, size) => {
  if (part !== 'strip') return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  paint(ctx, size.w);
  ctx.restore();
};

const goldGlaze = onStrip((ctx, len) => {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, 'rgba(0,0,0,0.12)');
  g.addColorStop(0.5, 'rgba(240,200,60,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, len, SNAKE_W);
});

const pythonGlaze = onStrip((ctx, len) => {
  dots(ctx, len, 8, 16, 26, '#fbf7d0', 0.85, 0.9, 41);
  dots(ctx, len, 3, 21, 22, '#e8e46a', 0.6, 0.7, 77);
});

const rosyGlaze = onStrip((ctx, len) => {
  const rose = '#b9603c';
  stripe(ctx, len, SNAKE_W / 2, 5, rose, 0.78, 1);
  stripe(ctx, len, 3.8, 3.4, '#a85a3c', 0.7, 4);
  stripe(ctx, len, SNAKE_W - 3.8, 3.4, '#a85a3c', 0.7, 9);
  dots(ctx, len, 1, 23, 40, '#6f3f2c', 0.35, 0.5, 13);
});

const earthGlaze = onStrip((ctx, len) => {
  dots(ctx, len, 4, 20, 34, '#4d4234', 0.5, 0.55, 23);
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, 'rgba(60,50,40,0.18)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(60,50,40,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, len, SNAKE_W);
});

const seaGlaze: Glaze = (ctx, part, size) => {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  if (part === 'strip') {
    // The black back, soft-edged, with the yellow flanks left on either side.
    const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
    g.addColorStop(0, 'rgba(18,20,26,0)');
    g.addColorStop(0.3, 'rgba(18,20,26,0.95)');
    g.addColorStop(0.7, 'rgba(18,20,26,0.95)');
    g.addColorStop(1, 'rgba(18,20,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size.w, SNAKE_W);
  }
  ctx.restore();
};

export const GOLDENTREE: SnakeArt = recoloured(FLYING_ART!, goldenTree, { base: '#3f8f3a', mark: '#e8b830', belly: '#e9e2a8' }, goldGlaze);
export const ROSYBOA: SnakeArt = recoloured(CORN, rosyGround, { base: '#d9c8ac', mark: '#b9603c', belly: '#ecd9c4' }, rosyGlaze);
export const GREENPYTHON: SnakeArt = recoloured(FLYING_ART!, greenPython, { base: '#2fa83a', mark: '#f4f0b0', belly: '#e8eea0' }, pythonGlaze);
export const EARTHSNAKE: SnakeArt = recoloured(HOGNOSE_ART!, earth, { base: '#8a7a64', mark: '#5a4c3c', belly: '#e4dccb' }, earthGlaze);
export const YELLOWSEA: SnakeArt = recoloured(KRAIT_ART!, yellowSea, { base: '#16181e', mark: '#f2c820', belly: '#f6dc50' }, seaGlaze);
export const BLACKHOGNOSE: SnakeArt = recoloured(HOGNOSE_ART!, blackHognose, { base: '#2a2c32', mark: '#14151a', belly: '#b8b8b4' });
