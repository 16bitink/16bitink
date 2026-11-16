import { INK, PAPER } from '../../../src/art/pen';
import { smooth } from '../short';
import { drawArrow, drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { drawStamp } from '../survival/hud';
import { EVIDENCE_INK, fadeIn, window01 } from './hud';
import { drawFin, drawGlobe, drawMapCard, drawPin, drawRun, fade, GIBRALTAR, SOUTH_AFRICA, WEST_AUSTRALIA } from './maps';
import type { Pt } from './ladder';
import { T } from './timeline';

/**
 * The one-off callouts over the climb: the day counter and the jellyfish's
 * digest timer (larva), the globe with two lights, the weight jump (one
 * inch), the three map cards, the bluefin's "among their top prey" tag, the
 * tuna's warm glow, the tiger shark's size, and the 9 vs 300,000 counters.
 */

const MAP_RECT = { x: 140, y: 230, w: 980, h: 640 } as const;

export function drawMaps(ctx: CanvasRenderingContext2D, t: number): void {
  const sa = fade(t, T.coast - 0.4, T.safety + 0.2);
  drawMapCard(ctx, SOUTH_AFRICA, MAP_RECT, t, sa, (proj) => drawRun(ctx, proj, t, smooth((t - T.coast) / 2.6)));
  if (sa > 0) drawText(ctx, 'THE SARDINE RUN', { x: MAP_RECT.x + MAP_RECT.w / 2, y: MAP_RECT.y + MAP_RECT.h + 46, size: 52, maxWidth: 900 }, 700, sa * fadeIn(t, T.run, 0.3), YELLOW_ON_INK);
  const gib = fade(t, T.gibraltar - 0.4, T.stamp5a - 0.6);
  drawMapCard(ctx, GIBRALTAR, MAP_RECT, t, gib, (proj) => {
    const p = proj([-5.62, 35.94]);
    drawFin(ctx, p.x + 30 * Math.sin(t * 0.8), p.y + 14, 44, smooth((t - T.orcasHunt) / 0.4));
    drawText(ctx, 'STRAIT OF GIBRALTAR', { x: p.x, y: p.y - 70, size: 34, maxWidth: 500 }, 700, 1, INK_ON_PAPER);
  });
  if (gib > 0) drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, MAP_RECT.x + MAP_RECT.w - 120, MAP_RECT.y + MAP_RECT.h + 40, 30, t, T.orcasHunt + 0.3, gib, -0.06);
  const wa = fade(t, T.march - 0.3, T.fourteen - 0.2);
  drawMapCard(ctx, WEST_AUSTRALIA, MAP_RECT, t, wa, (proj) => {
    const p = proj([119.6, -34.7]);
    drawPin(ctx, p, t, smooth((t - T.march - 0.3) / 0.3));
    drawText(ctx, '16 MARCH 2019', { x: p.x, y: p.y - 60, size: 38, maxWidth: 400 }, 700, 1, INK_ON_PAPER);
  });
}

/** "Every. Single. Day.": a flip calendar counting up as the cloud thins. */
export function drawDays(ctx: CanvasRenderingContext2D, t: number): void {
  const a = window01(t, T.scientists, T.fc1 - 0.1, 0.3);
  if (a <= 0) return;
  const day = 1 + Math.floor(Math.max(0, t - T.half) / 0.55);
  drawCard(ctx, 700, 40, 520, 150, a);
  drawText(ctx, `DAY ${Math.min(day, 6)}`, { x: 960, y: 98, size: 76, maxWidth: 480 }, 700, a, INK_ON_PAPER);
  drawText(ctx, '1% to 50% gone, every day · 22 species', { x: 960, y: 160, size: 28, maxWidth: 500 }, 700, a, INK_ON_PAPER);
  drawStamp(ctx, 'MEASURED', '#ffcf33', 1290, 160, 28, t, T.half + 0.4, a, -0.08);
}

/** The jellyfish's digest timer by its bell. */
export function drawDigest(ctx: CanvasRenderingContext2D, t: number, bell: Pt): void {
  const a = window01(t, T.digest - 0.1, T.scientists + 0.6, 0.25);
  if (a <= 0) return;
  const x = bell.x + 330;
  const y = Math.max(110, bell.y - 30);
  drawCard(ctx, x - 150, y - 50, 300, 100, a);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x - 100, y, 28, 0, Math.PI * 2);
  ctx.stroke();
  const hand = (t - T.digest) * 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 100, y);
  ctx.lineTo(x - 100 + Math.sin(hand) * 20, y - Math.cos(hand) * 20);
  ctx.stroke();
  ctx.restore();
  drawText(ctx, '2.5–3 h', { x: x + 25, y: y - 12, size: 48, maxWidth: 200 }, 700, a, INK_ON_PAPER);
  drawText(ctx, 'to digest one', { x: x + 25, y: y + 28, size: 26, maxWidth: 200 }, 700, a, INK_ON_PAPER);
}

/** "About two of us": the night globe and the sum. */
export function drawGlobeCard(ctx: CanvasRenderingContext2D, t: number): void {
  const a = window01(t, T.everyPerson - 0.2, T.eggs + 0.4, 0.35);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * 0.88;
  ctx.fillStyle = '#04070f';
  ctx.fillRect(0, 0, 1920, 1080);
  ctx.restore();
  drawGlobe(ctx, 640, 560, 330, t - T.everyPerson, a);
  drawText(ctx, '8.2 BILLION PEOPLE', { x: 1300, y: 430, size: 60, maxWidth: 760 }, 700, a, PAPER_ON_INK);
  drawText(ctx, '× 3 in 10 billion', { x: 1300, y: 510, size: 54, maxWidth: 760 }, 700, a * fadeIn(t, T.everyPerson + 1), PAPER_ON_INK);
  drawText(ctx, '≈ 2 make it', { x: 1300, y: 610, size: 86, maxWidth: 760 }, 700, a * fadeIn(t, T.two), YELLOW_ON_INK);
}

/** The weight jump under the size tag (one inch). */
export function drawJump(ctx: CanvasRenderingContext2D, t: number): void {
  const a = window01(t, T.x300 - 0.1, T.stamp2a - 0.3, 0.25);
  if (a <= 0) return;
  const pop = 1 + 0.3 * Math.max(0, 1 - (t - T.x300) / 0.3);
  ctx.save();
  ctx.translate(320, 900);
  ctx.scale(pop, pop);
  drawText(ctx, '0.001 g → 0.3 g  ×300', { x: 0, y: 0, size: 54, maxWidth: 600 }, 700, a, YELLOW_ON_INK);
  ctx.restore();
}

/** A paper tag on a string, pinned to a point. */
export function drawTag(ctx: CanvasRenderingContext2D, text: string, sub: string, pin: Pt, at: Pt, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pin.x, pin.y);
  ctx.lineTo(at.x, at.y + 40);
  ctx.stroke();
  ctx.restore();
  drawCard(ctx, at.x - 250, at.y - 40, 500, sub ? 120 : 84, alpha);
  drawText(ctx, text, { x: at.x, y: at.y + 2, size: 42, maxWidth: 470 }, 700, alpha, INK_ON_PAPER);
  if (sub) drawText(ctx, sub, { x: at.x, y: at.y + 50, size: 26, maxWidth: 470 }, 500, alpha, INK_ON_PAPER);
}

export function drawPrey(ctx: CanvasRenderingContext2D, t: number, hero: Pt): void {
  const a = window01(t, T.topMeals - 0.2, T.stamp4a + 0.2, 0.3);
  drawTag(ctx, 'AMONG THEIR TOP PREY', 'young mackerel, bluefin diets off New England', { x: hero.x + 60, y: hero.y - 40 }, { x: hero.x + 120, y: 190 }, a);
}

/** "Your muscles run warmer than the water": a warm glow over the tuna. */
export function drawWarm(ctx: CanvasRenderingContext2D, t: number, hero: Pt, len: number): void {
  const a = window01(t, T.warmer - 0.1, T.gibraltar - 0.4, 0.4);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a * (0.42 + 0.1 * Math.sin(t * 5));
  const g = ctx.createRadialGradient(hero.x, hero.y, 0, hero.x, hero.y, len * 0.42);
  g.addColorStop(0, 'rgba(255,140,60,0.8)');
  g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(hero.x, hero.y, len * 0.42, len * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a * 0.9;
  ctx.strokeStyle = 'rgba(255,170,90,0.95)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    const x = hero.x - len * 0.2 + i * len * 0.1;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) ctx.lineTo(x + 8 * Math.sin(k * 0.9 + t * 6 + i), hero.y - len * 0.12 - k * 9);
    ctx.stroke();
  }
  ctx.restore();
  drawText(ctx, 'WARMER THAN THE WATER', { x: hero.x, y: hero.y + len * 0.2 + 40, size: 44, maxWidth: 700 }, 700, a, YELLOW_ON_INK);
}

export function drawTigerLabel(ctx: CanvasRenderingContext2D, t: number, at: Pt | null): void {
  if (!at) return;
  const a = window01(t, T.sevenHalf - 0.1, T.y2025 + 0.3, 0.3);
  if (a <= 0) return;
  drawText(ctx, 'TIGER SHARK · 7.5 FT · 2.3 m', { x: 1150, y: 860, size: 42, maxWidth: 800 }, 700, a, PAPER_ON_INK);
  drawText(ctx, 'where prey your size starts to show up in its diet', { x: 1150, y: 902, size: 28, maxWidth: 800 }, 500, a, PAPER_ON_INK);
}

/** Nine against three hundred thousand. */
export function drawCounters(ctx: CanvasRenderingContext2D, t: number): void {
  const a = window01(t, T.nine - 0.1, T.nothing - 0.3, 0.35);
  if (a <= 0) return;
  const panel = (x: number, big: string, small: string, at: number, icon: (cx: number, cy: number) => void, ink = YELLOW_ON_INK): void => {
    const ai = a * fadeIn(t, at, 0.25);
    if (ai <= 0) return;
    ctx.save();
    ctx.globalAlpha = ai * 0.82;
    ctx.fillStyle = '#05101c';
    ctx.beginPath();
    ctx.roundRect(x - 210, 150, 420, 230, 22);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = ai;
    icon(x, 192);
    ctx.restore();
    drawText(ctx, big, { x, y: 288, size: 96, maxWidth: 400 }, 700, ai, ink);
    drawText(ctx, small, { x, y: 350, size: 28, maxWidth: 400 }, 700, ai, PAPER_ON_INK);
  };
  panel(700, '9', 'shark-bite deaths, 2025', T.nine, (cx, cy) => drawFin(ctx, cx, cy + 20, 50, 1));
  panel(1150, '300,000', 'drownings a year', T.k300, (cx, cy) => {
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = -60; x <= 60; x += 4) ctx.lineTo(cx + x, cy + 10 + 10 * Math.sin(x * 0.1 + t * 4));
    ctx.stroke();
  }, { fill: '#9fd8ff', halo: '#05101c' });
  drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, 1150, 410, 26, t, T.k300 + 0.4, a, -0.06);
  if (t > T.mouth - 0.2) drawArrow(ctx, 915, 265, 935, 265, a * fadeIn(t, T.mouth - 0.2), PAPER, 6);
}
