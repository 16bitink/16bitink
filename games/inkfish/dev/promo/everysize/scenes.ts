import { INK, PAPER } from '../../../src/art/pen';
import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from '../foodchain/art/orca';
import { inBody, drawSpeedLines } from '../orcaliver/paint';
import { LIVER_FAR, LIVER_MID, LIVER_NEAR } from '../orcaliver/pose';
import { glow } from '../orcaliver/sea';
import { vignette } from '../swallowyou/sea';
import { clamp01, smooth } from '../short';
import { drawCard, drawText, INK_ON_PAPER, PAPER_ON_INK, YELLOW_ON_INK } from '../swallowyou/text';
import { drawStamp } from '../survival/hud';
import { drawBody, LENGTH, type Body } from './heroes';
import { EVIDENCE_INK, fadeIn, window01 } from './hud';
import { STEPS } from './ladder';
import { T } from './timeline';

/**
 * The full-frame cut-ins: the orcas' hunt on a young white shark (a chase,
 * then a cut away; the shark never drawn as a 15 ft adult), the X-ray of
 * its oily liver, the 2019 blue whale hunt seen from far above (a chase,
 * then a cut away), the whaling ship etched on a grey sea with its tally
 * and the chart of the Antarctic count, and the whole ladder in one line.
 */

const W = 1920;
const H = 1080;

/** Slanted shafts of light across the frame. */
function drawRays(ctx: CanvasRenderingContext2D, t: number, strength: number): void {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x0 = ((i * 331 + 120 + 40 * Math.sin(t * 0.13 + i)) % (W + 400)) - 200;
    const w = 70 + ((i * 53) % 90);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(255,255,240,${0.14 * strength})`);
    g.addColorStop(1, 'rgba(255,255,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + w, 0);
    ctx.lineTo(x0 + w + 260, H);
    ctx.lineTo(x0 + 260, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const drawVignette = (ctx: CanvasRenderingContext2D, s: number): void => vignette(ctx, s * 0.6);

function sea(ctx: CanvasRenderingContext2D, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- the orcas and the white shark

export const HUNT = { from: T.off - 0.3, cut: T.won + 0.15, xray: T.liver - 0.25, to: STEPS[7]!.from } as const;

export function drawHunt(ctx: CanvasRenderingContext2D, t: number): void {
  sea(ctx, '#2f6d9c', '#0f2e4c');
  drawRays(ctx, t, 0.5);
  if (t < HUNT.cut) {
    // The chase: the shark flat out, five orcas closing from behind and below.
    const u = (t - HUNT.from) / (HUNT.cut - HUNT.from);
    const sx = 1250 + 260 * u;
    const sy = 470 + 40 * Math.sin(t * 2.4);
    drawSpeedLines(ctx, sx - 260, sy, Math.PI, 0.9, 200, 520);
    const orcas = [[-760, -120], [-1050, 110], [-640, 210], [-1250, -40], [-900, 330]] as const;
    orcas.forEach(([dx, dy], i) => {
      const close = 240 * smooth(u * 1.3) * (1 - i * 0.12);
      drawOrca(ctx, sx + dx + close, sy + dy + 12 * Math.sin(t * 2 + i), 560 - i * 30, 0.03 * Math.sin(t + i), t + i * 0.3, { jaw: 0.25 + 0.2 * Math.sin(t * 3 + i), tail: t * 9 + i });
    });
    drawGreatWhite(ctx, sx, sy, 240, -0.04, t, { worried: 1, tail: t * 13 });
    drawCard(ctx, 60, 50, 760, 110, 1);
    drawText(ctx, 'OFF SOUTH AFRICA · 5 ORCAS · FILMED', { x: 440, y: 92, size: 44, maxWidth: 720 }, 700, 1, INK_ON_PAPER);
    drawText(ctx, 'Towner et al. 2022 · the shark\'s size not given', { x: 440, y: 136, size: 26, maxWidth: 720 }, 500, 0.85, INK_ON_PAPER);
    drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, 1650, 110, 36, t, T.five + 0.2, 1, -0.08);
  } else if (t < HUNT.xray) {
    // The cut away: the sea, empty but for five fins heading off far away.
    const u = t - HUNT.cut;
    for (let i = 0; i < 5; i++) {
      drawOrca(ctx, 900 + i * 140 + u * 60, 640 + (i % 2) * 50, 170, 0, t + i, { tail: t * 5 + i });
    }
    const a = fadeIn(t, T.snack - 0.1, 0.2);
    drawText(ctx, 'NOT THE TOP OF THE OCEAN', { x: W / 2, y: 260, size: 72, maxWidth: 1500 }, 700, fadeIn(t, T.notTop, 0.2) * (1 - a), PAPER_ON_INK);
    drawText(ctx, 'THE SNACK OF THE TOP', { x: W / 2, y: 260, size: 110, maxWidth: 1600 }, 700, a, YELLOW_ON_INK);
  } else {
    drawXray(ctx, t);
  }
  drawVignette(ctx, 0.5);
}

/** The young white shark as a ghost on dark film, its liver glowing. */
function drawXray(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = '#050d18';
  ctx.fillRect(0, 0, W, H);
  const pose = { x: 960, y: 560, length: 1150, angle: 0, flip: false };
  ctx.save();
  ctx.globalAlpha = 0.42;
  drawGreatWhite(ctx, pose.x, pose.y, pose.length, 0, t, { tail: t * 3 });
  ctx.globalCompositeOperation = 'source-atop';
  ctx.restore();
  const lit = smooth((t - HUNT.xray) / 0.6);
  inBody(ctx, pose, () => {
    glow(ctx, LIVER_MID.x, LIVER_MID.y, 260, '255,150,60', 0.5 * lit);
    for (const lobe of [LIVER_FAR, LIVER_NEAR]) {
      ctx.beginPath();
      lobe.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = `rgba(255,170,80,${0.35 * lit})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,214,150,${0.95 * lit})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
  });
  drawText(ctx, 'THE OILY LIVER', { x: 760, y: 840, size: 80, maxWidth: 900 }, 700, lit, YELLOW_ON_INK);
  drawText(ctx, 'what the orcas went for', { x: 760, y: 905, size: 40, maxWidth: 900 }, 500, lit, PAPER_ON_INK);
  drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, 1500, 860, 34, t, HUNT.xray + 0.5, 1, -0.08);
}

// ---------------------------------------------------------------- the blue whale, 2019, from far above

export const WHALE_HUNT = { from: T.fourteen - 0.3, cut: T.killed + 0.6, to: T.people - 0.2 } as const;

function topWhale(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = len * 0.075;
  // The long flippers, then the body over them.
  ctx.fillStyle = '#5d7893';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(len * 0.22, s * w * 0.8);
    ctx.quadraticCurveTo(len * 0.12, s * w * 2.2, len * 0.04, s * w * 2.6);
    ctx.quadraticCurveTo(len * 0.12, s * w * 1.4, len * 0.14, s * w * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(len * 0.5, 0);
  ctx.bezierCurveTo(len * 0.48, -w, len * 0.2, -w * 1.05, 0, -w);
  ctx.bezierCurveTo(-len * 0.25, -w * 0.9, -len * 0.38, -w * 0.3, -len * 0.42, -w * 0.12);
  ctx.lineTo(-len * 0.5, -w * 0.9 - Math.sin(t * 2) * w * 0.2);
  ctx.lineTo(-len * 0.47, 0);
  ctx.lineTo(-len * 0.5, w * 0.9 + Math.sin(t * 2) * w * 0.2);
  ctx.lineTo(-len * 0.42, w * 0.12);
  ctx.bezierCurveTo(-len * 0.38, w * 0.3, -len * 0.25, w * 0.9, 0, w);
  ctx.bezierCurveTo(len * 0.2, w * 1.05, len * 0.48, w, len * 0.5, 0);
  ctx.fillStyle = '#6f8aa6';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(220,232,245,0.35)';
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.arc(len * (0.4 - i * 0.031), w * 0.55 * Math.sin(i * 2.3), 3 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function topOrca(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#121419';
  ctx.beginPath();
  ctx.ellipse(0, 0, len * 0.5, len * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(len * 0.28, -len * 0.07, len * 0.07, len * 0.025, -0.2, 0, Math.PI * 2);
  ctx.ellipse(len * 0.28, len * 0.07, len * 0.07, len * 0.025, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawWhaleHunt(ctx: CanvasRenderingContext2D, t: number): void {
  sea(ctx, '#1d4f78', '#0c2c4a');
  // Sun glitter on the surface, seen from far above.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 90; i++) {
    const x = (i * 211 + t * 30) % W;
    const y = (i * 97) % H;
    ctx.fillRect(x, y, 26 + (i % 4) * 8, 2);
  }
  if (t < WHALE_HUNT.cut) {
    const u = (t - WHALE_HUNT.from) / (WHALE_HUNT.cut - WHALE_HUNT.from);
    const wx = 700 + 420 * u;
    const wy = 560;
    topWhale(ctx, wx, wy, 760, -0.05, t);
    for (let i = 0; i < 14; i++) {
      const a = i * 0.45 + t * (0.6 + (i % 3) * 0.12);
      const r = 170 + (i % 4) * 46;
      const ox = wx + Math.cos(a) * r * 1.6 - 60;
      const oy = wy + Math.sin(a) * r * 0.7;
      topOrca(ctx, ox, oy, 120, a + Math.PI / 2);
    }
    drawCard(ctx, 60, 50, 980, 160, 1);
    drawText(ctx, '16 MARCH 2019 · OFF WESTERN AUSTRALIA', { x: 550, y: 94, size: 44, maxWidth: 940 }, 700, 1, INK_ON_PAPER);
    drawText(ctx, '~14 ORCAS · AN ADULT, ~60–72 FT (18–22 m)', { x: 550, y: 150, size: 40, maxWidth: 940 }, 700, 1, INK_ON_PAPER);
    drawText(ctx, 'seen from far above (not to scale)', { x: 550, y: 192, size: 24, maxWidth: 940 }, 500, 0.8, INK_ON_PAPER);
    drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, 1660, 100, 34, t, T.fourteen + 0.3, 1, -0.08);
    drawStamp(ctx, 'SIZE ESTIMATED', EVIDENCE_INK.ESTIMATED, 1640, 180, 28, t, T.fourteen + 0.8, 1, -0.08);
  } else {
    // The cut away: an empty sea, a few gulls' shadows.
    drawStamp(ctx, 'FIRST DOCUMENTED KILL', '#ffcf33', W / 2, 470, 64, t, T.first, 1, -0.06);
    drawStamp(ctx, 'REPORTED', EVIDENCE_INK.REPORTED, W / 2, 560, 32, t, T.first + 0.4, 1, -0.06);
  }
  drawVignette(ctx, 0.45);
}

// ---------------------------------------------------------------- the whaling ship and the count

export const WHALING = { from: T.people - 0.2, chart: T.antarctic - 0.2, to: T.ladder - 0.2 } as const;

let shipArt: HTMLCanvasElement | null = null;

function etchShip(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1100;
  c.height = 620;
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  g.strokeStyle = '#2a2a2e';
  // The hull: long and low, a high bow on the right, cross-hatched in shadow.
  const hull = new Path2D('M60 430 L980 400 Q1060 380 1080 330 L1000 470 Q600 520 120 500 Z');
  g.fillStyle = '#4b4d54';
  g.fill(hull);
  g.save();
  g.clip(hull);
  g.lineWidth = 1.2;
  for (let x = -300; x < 1200; x += 7) {
    g.beginPath();
    g.moveTo(x, 380);
    g.lineTo(x + 160, 540);
    g.stroke();
  }
  for (let x = 0; x < 1300; x += 11) {
    g.beginPath();
    g.moveTo(x, 540);
    g.lineTo(x - 120, 380);
    g.stroke();
  }
  g.restore();
  g.lineWidth = 3;
  g.stroke(hull);
  // Decks, bridge, funnel, masts and rigging.
  g.fillStyle = '#8c8e95';
  g.lineWidth = 2.5;
  const boxes = [[620, 330, 170, 75], [660, 280, 100, 52], [210, 360, 230, 50]] as const;
  for (const [x, y, w, h] of boxes) {
    g.fillRect(x, y, w, h);
    g.strokeRect(x, y, w, h);
    g.lineWidth = 1;
    for (let k = x + 5; k < x + w; k += 6) {
      g.beginPath();
      g.moveTo(k, y);
      g.lineTo(k, y + h);
      g.stroke();
    }
    g.lineWidth = 2.5;
  }
  g.fillStyle = '#3a3b40';
  g.fillRect(470, 230, 64, 140);
  g.strokeRect(470, 230, 64, 140);
  g.lineWidth = 4;
  for (const [x, top] of [[300, 90], [860, 120]] as const) {
    g.beginPath();
    g.moveTo(x, 420);
    g.lineTo(x, top);
    g.stroke();
    g.beginPath();
    g.moveTo(x - 60, top + 50);
    g.lineTo(x + 60, top + 50);
    g.stroke();
  }
  g.lineWidth = 1.2;
  for (const [a, b] of [[[300, 90], [80, 430]], [[300, 90], [520, 410]], [[860, 120], [1060, 345]], [[860, 120], [640, 330]], [[300, 90], [860, 120]]] as const) {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  }
  // Portholes.
  g.fillStyle = '#d9d6cc';
  for (let x = 160; x < 960; x += 52) {
    g.beginPath();
    g.arc(x, 455, 5, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  for (let i = 0; i < 12; i++) {
    const u = ((t * 0.25 + i / 12) % 1);
    ctx.fillStyle = `rgba(70,70,76,${0.32 * (1 - u)})`;
    ctx.beginPath();
    ctx.arc(x + u * 520, y - u * 160 - Math.sin(u * 6 + i) * 20, 26 + u * 70, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Etched waves: rows of short hatched curves, darker at the front. */
function drawEtchedSea(ctx: CanvasRenderingContext2D, t: number, top: number): void {
  ctx.fillStyle = '#9a9ca2';
  ctx.fillRect(0, top, W, H - top);
  ctx.strokeStyle = '#3c3d43';
  for (let row = 0; row < 26; row++) {
    const y = top + 8 + row * row * 0.9 + row * 6;
    ctx.lineWidth = 0.8 + row * 0.08;
    ctx.globalAlpha = 0.35 + row * 0.022;
    const step = 46 + row * 3;
    for (let x = -step + ((t * (12 + row) + row * 37) % step); x < W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + step * 0.25, y - 4 - row * 0.3, x + step * 0.55, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

const count = (t: number, from: number, to: number, n: number): number => Math.round(n * smooth((t - from) / (to - from)));

export function drawWhaling(ctx: CanvasRenderingContext2D, t: number): void {
  shipArt ??= etchShip();
  sea(ctx, '#c9c9c6', '#a8a9ab');
  drawEtchedSea(ctx, t, 640);
  const bob = Math.sin(t * 0.8) * 6;
  drawSmoke(ctx, 520 + 500, 300 + bob, t);
  ctx.drawImage(shipArt, 500, 120 + bob, 1100, 620);
  // The paper grain and a dark etched border.
  ctx.strokeStyle = '#2a2a2e';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  const tally = count(t, T.whaling, T.k360 + 1.6, 360000);
  const a = fadeIn(t, T.whaling - 0.2, 0.3) * (1 - smooth((t - WHALING.chart) / 0.4));
  drawText(ctx, 'BLUE WHALES KILLED, 1900s', { x: 380, y: 150, size: 46, maxWidth: 640 }, 700, a, INK_ON_PAPER);
  drawText(ctx, `~${tally.toLocaleString('en-US')}`, { x: 380, y: 250, size: 120, maxWidth: 640 }, 700, a, { fill: '#a3241f', halo: PAPER });
  drawText(ctx, 'southern oceans and the Indian Ocean', { x: 380, y: 330, size: 32, maxWidth: 640 }, 500, a, INK_ON_PAPER);
  drawStamp(ctx, 'ESTIMATED', '#5b5b60', 380, 400, 30, t, T.k360 + 1.6, a, -0.06);
  drawChart(ctx, t, window01(t, WHALING.chart, WHALING.to + 1, 0.4));
}

/** The Antarctic count: before whaling, 1973, 1996; dashed where nobody counted in between. */
function drawChart(ctx: CanvasRenderingContext2D, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const x0 = 140;
  const y0 = 150;
  const w = 1640;
  const h = 640;
  drawCard(ctx, x0 - 40, y0 - 70, w + 80, h + 210, alpha);
  drawText(ctx, 'ANTARCTIC BLUE WHALES', { x: x0 + w / 2, y: y0 - 18, size: 52, maxWidth: w }, 700, alpha, INK_ON_PAPER);
  const yOf = (n: number): number => y0 + h - (n / 250000) * h;
  const pts = [{ x: x0 + 40, n: 239000, label: 'before whaling', at: T.k239 }, { x: x0 + w * 0.72, n: 360, label: '1973', at: T.low360 }, { x: x0 + w * 0.95, n: 1700, label: '1996', at: T.y1996 }];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 30);
  ctx.lineTo(x0, y0 + h);
  ctx.lineTo(x0 + w, y0 + h);
  ctx.stroke();
  // The fall, drawn on from the first count to the low.
  const fall = smooth((t - pts[0]!.at) / Math.max(0.5, pts[1]!.at - pts[0]!.at));
  ctx.setLineDash([18, 12]);
  ctx.strokeStyle = '#a3241f';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, yOf(pts[0]!.n));
  ctx.lineTo(pts[0]!.x + (pts[1]!.x - pts[0]!.x) * fall, yOf(pts[0]!.n) + (yOf(pts[1]!.n) - yOf(pts[0]!.n)) * fall);
  ctx.stroke();
  ctx.setLineDash([]);
  const rise = smooth((t - pts[2]!.at + 0.4) / 1);
  ctx.strokeStyle = '#2f8a46';
  ctx.beginPath();
  ctx.moveTo(pts[1]!.x, yOf(pts[1]!.n));
  ctx.lineTo(pts[1]!.x + (pts[2]!.x - pts[1]!.x) * rise, yOf(pts[1]!.n) + (yOf(pts[2]!.n) - yOf(pts[1]!.n)) * rise);
  ctx.stroke();
  ctx.restore();
  pts.forEach((p, i) => {
    const a = alpha * fadeIn(t, i === 0 ? p.at - 0.1 : p.at, 0.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = i === 2 ? '#2f8a46' : '#a3241f';
    ctx.beginPath();
    ctx.arc(p.x, yOf(p.n), 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawText(ctx, `~${p.n.toLocaleString('en-US')}`, { x: p.x + (i === 0 ? 150 : 0), y: yOf(p.n) - (i === 0 ? -10 : 60) - (i === 2 ? 50 : 0), size: 54, maxWidth: 360 }, 700, a, INK_ON_PAPER);
    drawText(ctx, p.label, { x: p.x + (i === 0 ? 40 : 0), y: y0 + h + 46, size: 36, maxWidth: 360 }, 700, a, INK_ON_PAPER);
  });
  drawText(ctx, 'fewer than 1 in 600 left', { x: x0 + w * 0.36, y: y0 + h * 0.86, size: 48, maxWidth: 700 }, 700, alpha * fadeIn(t, T.fewer, 0.3), { fill: '#a3241f', halo: PAPER });
  drawText(ctx, 'hunting banned · and climbing', { x: x0 + w * 0.8, y: y0 + h * 0.45, size: 42, maxWidth: 640 }, 700, alpha * fadeIn(t, T.banned, 0.3), { fill: '#2f8a46', halo: PAPER });
  drawText(ctx, 'Branch et al. 2004 · ESTIMATED · dashed: no count in between', { x: x0 + w / 2, y: y0 + h + 110, size: 28, maxWidth: w }, 500, alpha * 0.85, INK_ON_PAPER);
}

// ---------------------------------------------------------------- the whole ladder in one line

export const LINE = { from: T.ladder - 0.2, to: T.climb - 0.2 } as const;
const CHANCES = ['3 in 10 billion', '1.4%', '21%', '56%', '81%', '89%', '94.5%', '98.5%'] as const;
const SLOT: readonly Body[] = ['larva', 'young', 'sardine', 'mackerel', 'tuna', 'person', 'white', 'whale'];

/** Draws `body` centred at screen (x, y), `len` px long (a camera made for it). */
export function drawAt(ctx: CanvasRenderingContext2D, body: Body, x: number, y: number, len: number, facing: 1 | -1, t: number): void {
  const k = len / LENGTH[body];
  drawBody(ctx, body, { at: { x: 0, y: 0 }, facing }, { centre: { x: (W / 2 - x) / k, y: (H / 2 - y) / k }, width: W / k }, t);
}

export function drawLine(ctx: CanvasRenderingContext2D, t: number): void {
  sea(ctx, '#2a6a96', '#0e2d4b');
  drawRays(ctx, t, 0.35);
  const xs = [110, 300, 500, 720, 960, 1200, 1430, 1830];
  const lens = [110, 130, 150, 170, 190, 200, 230, 560];
  SLOT.forEach((b, i) => {
    const a = fadeIn(t, LINE.from + i * 0.18, 0.25);
    ctx.save();
    ctx.globalAlpha = a;
    drawAt(ctx, b, xs[i]!, 560, lens[i]!, b === 'whale' ? -1 : 1, t);
    ctx.restore();
    drawText(ctx, CHANCES[i]!, { x: Math.min(xs[i]!, 1750), y: 700, size: i === 0 ? 30 : 46, maxWidth: i === 0 ? 200 : 230 }, 700, a, i === 5 ? YELLOW_ON_INK : PAPER_ON_INK);
  });
  drawText(ctx, 'chance you see next year · MODEL · not to scale', { x: W / 2, y: 770, size: 30, maxWidth: 1200 }, 500, fadeIn(t, LINE.from + 1.5), PAPER_ON_INK);
  drawCard(ctx, 560, 150, 800, 120, fadeIn(t, T.bigger10 - 0.2));
  drawText(ctx, 'IN THE OCEAN, BIGGER IS SAFER', { x: 960, y: 196, size: 52, maxWidth: 760 }, 700, fadeIn(t, T.bigger10 - 0.2), INK_ON_PAPER);
  drawText(ctx, '×10 heavier → ×½ the risk', { x: 960, y: 246, size: 36, maxWidth: 760 }, 700, fadeIn(t, T.every10), INK_ON_PAPER);
  drawStamp(ctx, 'UNTIL… US', '#ff6b5e', 1700, 400, 46, t, T.dangerous, 1 - smooth((t - T.which + 0.2) / 0.3), -0.1);
  const q = fadeIn(t, T.which - 0.1, 0.3);
  if (q > 0) {
    ctx.save();
    ctx.globalAlpha = q * 0.55;
    ctx.fillStyle = '#05101c';
    ctx.fillRect(0, 860, W, 160);
    ctx.restore();
    drawText(ctx, 'WHICH SIZE WOULD YOU PICK?', { x: W / 2, y: 940, size: 90, maxWidth: 1700 }, 700, q, YELLOW_ON_INK);
  }
  drawVignette(ctx, 0.4);
}

export const PAPER_INK = { fill: INK, halo: PAPER } as const;
export const clampA = clamp01;
