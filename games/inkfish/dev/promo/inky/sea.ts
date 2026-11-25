import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, ramp, smooth, VIDEO } from '../short';
import { type Pt, spline } from '../octopus/geom';
import { natural } from './octo';
import { drawTube, glow, type Light, poly, type Ramp, rgb, wash } from './paint';
import { drawRig, type RigArm } from './rig';
import { cycles, INKY2_AT, NEVER_AT, OCEAN_AT, PIPE_AT, WIPE_MID } from './story';

/** "And that pipe led to the OCEAN!", and the quiet end: the pipe cut open, the bright sea, the deep blue. */

const bubble = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a = 0.8): void => {
  if (r < 0.6) return;
  ctx.strokeStyle = `rgba(230,252,255,${a})`;
  ctx.lineWidth = Math.max(1.4, r * 0.13);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(230,252,255,${a * 0.14})`;
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.36, y - r * 0.4, r * 0.24, r * 0.15, -0.6, 0, Math.PI * 2);
  ctx.fill();
};

/** Arms streaming out behind a body heading along `dir`, flared open by `open`. */
function streamArms(dir: number, size: number, p: number, open: number): RigArm[] {
  const back = dir + Math.PI;
  return [-0.5, 0.5, -0.36, -0.22, -0.07, 0.08, 0.23, 0.37].map((k, i) => {
    const a = back + k * lerp(0.9, 4.6, open) + 0.07 * Math.sin(p + i * 1.4);
    return { a, len: lerp(5.0, 3.7, open), curl: Math.sign(k) * lerp(0.5, 2.6, open), near: i > 1, ripple: lerp(0.22, 0.34, open), phase: p + i * 0.9 };
  });
}

// ---------------------------------------------------------------- the pipe, cut open

const PIPE_Y = 720;
const PIPE_R = 262;
const PIPE_FROM = PIPE_AT - 0.08;
const PIPE_LIGHT: Light = { key: [0.75, -0.45, 0.55], ambient: 0.2, rim: [1, 0.2, 0.1], rimColour: [140, 236, 240], rimK: 1.7, wet: 0.8 };

export function drawPipe(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const { width: W, height: H } = VIDEO;
  const u = clamp01((t - PIPE_FROM) / (OCEAN_AT - 0.04 - PIPE_FROM));
  const pan = -2100 * u * (0.7 + 0.3 * u);
  ctx.save();
  ctx.translate(540, PIPE_Y);
  ctx.rotate(0.1);
  ctx.scale(1.22, 1.22);
  ctx.translate(-540, -PIPE_Y);
  ctx.fillStyle = wash(ctx, 0, -200, 0, H, [[0, '#4a3524'], [0.35, '#2e2118'], [0.6, '#241a14'], [1, '#100b0a']]);
  ctx.fillRect(-300, -400, W + 600, H + 800);
  const pen = new Pen(ctx, 131 + (boil % 3) * 977, 1);
  const rng = createRng(1717);
  // Stones and pebbles in the ground.
  for (let i = 0; i < 90; i++) {
    const x0 = -300 + rng() * 4600;
    const above = rng() < 0.5;
    const y = above ? -200 + rng() * 560 : 1090 + rng() * 900;
    const r = 16 + rng() * rng() * 120;
    const x = x0 + pan;
    const tone = rng();
    if (x < -300 || x > W + 300) continue;
    const pts = Array.from({ length: 18 }, (_, j) => {
      const a = (j / 18) * Math.PI * 2;
      const q = 1 + 0.1 * Math.sin(a * 3 + i) + 0.06 * Math.sin(a * 5 + i * 2);
      return { x: x + Math.cos(a) * r * 1.25 * q, y: y + Math.sin(a) * r * 0.85 * q };
    });
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r * 1.3);
    g.addColorStop(0, tone < 0.5 ? '#8d7660' : '#75706a');
    g.addColorStop(1, tone < 0.5 ? '#3b2b20' : '#2e2c2c');
    poly(ctx, pts, g);
    pen.closed(pts, 2.4, INK);
  }
  // Concrete walls, then the hollow.
  const band = (a: number, b: number, style: CanvasGradient): void => {
    ctx.fillStyle = style;
    ctx.fillRect(-300, a, W + 600, b - a);
  };
  const [top, bot] = [PIPE_Y - PIPE_R, PIPE_Y + PIPE_R];
  band(top - 74, top, wash(ctx, 0, top - 74, 0, top, [[0, '#a9a59a'], [0.5, '#8b887f'], [1, '#55534e']]));
  band(bot, bot + 74, wash(ctx, 0, bot, 0, bot + 74, [[0, '#c3c0b4'], [0.4, '#8b887f'], [1, '#4c4a46']]));
  band(top, bot, wash(ctx, 0, top, 0, bot, [[0, '#071019'], [0.3, '#14303c'], [0.62, '#1f4a56'], [1, '#081620']]));
  // Rings of the pipe's far wall, and the water along its floor.
  for (let x = -300 + (((pan % 260) + 260) % 260); x < W + 400; x += 260) {
    pen.hair(Array.from({ length: 15 }, (_, j) => ({ x: x + 46 * Math.sin((j / 14) * Math.PI), y: top + ((bot - top) * j) / 14 })), 5, '#03080d', 0.5);
    pen.hair([{ x, y: top - 74 }, { x, y: top }], 4, INK, 0.8);
    pen.hair([{ x, y: bot }, { x, y: bot + 74 }], 4, INK, 0.8);
  }
  const light = ramp(u, 0.15, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-300, top, W + 600, bot - top);
  ctx.clip();
  glow(ctx, W + 120 - 260 * light, PIPE_Y, 420 + 620 * light, 420, [150, 244, 248], 0.35 + 0.6 * light, 'lighter');
  poly(ctx, [{ x: -300, y: bot - 54 }, ...Array.from({ length: 40 }, (_, i) => ({ x: -300 + i * 45, y: bot - 58 + 9 * Math.sin(i * 0.9 + t * 14) })), { x: W + 400, y: bot }, { x: -300, y: bot }], wash(ctx, 0, bot - 60, 0, bot, [[0, 'rgba(130,230,236,0.75)'], [1, 'rgba(20,96,116,0.8)']]));
  ctx.restore();
  for (const y of [top, bot, top - 74, bot + 74]) pen.stroke([{ x: -300, y }, { x: 540, y: y + 1 }, { x: W + 300, y }], 5, INK, 1, false);
  // Inky, stretched to fit, mantle first, wide-eyed.
  const size = 186;
  const wob = 12 * Math.sin(t * 17);
  drawRig(ctx, {
    x: 320 + 40 * u, y: PIPE_Y + 4 + 0.5 * wob, size, up: -0.02 + 0.03 * Math.sin(t * 13), bend: 0.02, length: 4.1, turn: 0.5, gaze: { x: 0.8, y: 0 }, lid: 0,
    profile: (s) => natural(s) * lerp(1, 0.88, smooth((s - 0.4) / 0.3)), arms: streamArms(0, size, t * 16, 0.03).map((a) => ({ ...a, len: 3.2 })), seed: 6401, web: 0.22,
  }, PIPE_LIGHT, boil);
  // Speed lines and spray.
  for (let i = 0; i < 14; i++) {
    const y = top + 30 + ((i * 97) % (2 * PIPE_R - 60));
    const x = ((((i * 331 + pan * 1.6) % 1700) + 1700) % 1700) - 300;
    pen.hair([{ x, y }, { x: x + 150 + (i % 3) * 60, y: y + 2 }], 3, '#d6f7fa', 0.45);
  }
  ctx.restore();
  // The daylight takes over the frame.
  ctx.fillStyle = `rgba(214,252,255,${0.9 * ramp(u, 0.82, 1) ** 2})`;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- the ocean

const KELP: Ramp = [[16, 40, 18], [40, 72, 24], [92, 112, 34], [156, 160, 56], [214, 206, 104]];
const SUN: Light = { key: [0.25, -0.85, 0.5], ambient: 0.3, rim: [-0.6, -0.5, 0.1], rimColour: [255, 236, 190], rimK: 0.9, wet: 0.35, tint: [60, 170, 210], tintK: 0.04 };
const MOUTH = { x: 130, y: 470, rx: 150, ry: 178 } as const;

function drawBlueWater(ctx: CanvasRenderingContext2D, t: number): void {
  const { width: W, height: H } = VIDEO;
  ctx.fillStyle = wash(ctx, 0, 0, 0, H, [[0, '#c9fbf6'], [0.12, '#79e4ec'], [0.36, '#2fb6dd'], [0.68, '#1380bd'], [1, '#0a4c86']]);
  ctx.fillRect(-60, -60, W + 120, H + 120);
  glow(ctx, 700, -60, 760, 620, [255, 255, 236], 0.9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + i * 0.22 + 0.03 * Math.sin(t * 1.3 + i * 2);
    const w = 0.035 + 0.03 * (i % 3);
    const L = 1900;
    poly(ctx, [{ x: 700, y: -160 }, { x: 700 + Math.sin(-a - w) * L, y: -160 + Math.cos(a + w) * L }, { x: 700 + Math.sin(-a + w) * L, y: -160 + Math.cos(a - w) * L }], wash(ctx, 0, -100, 0, 1500, [[0, 'rgba(255,255,240,0.26)'], [1, 'rgba(190,245,255,0)']]));
  }
  ctx.restore();
  // The surface from below.
  for (let i = 0; i < 18; i++) {
    const y = 20 + i * i * 0.9;
    const x = ((i * 263) % 1200) - 60 + 24 * Math.sin(t * 1.6 + i);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 - i * 0.025})`;
    ctx.lineWidth = 5 - i * 0.2;
    ctx.beginPath();
    ctx.moveTo(x - 90, y);
    ctx.quadraticCurveTo(x - 30, y - 14, x, y);
    ctx.quadraticCurveTo(x + 40, y + 12, x + 100, y - 2);
    ctx.stroke();
  }
}

/** A craggy rock, sunlit on top, blue in the shade, its face broken by ledges, cracks and weed. */
function rock(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, rx: number, ry: number, seed: number): void {
  const rng = createRng(Math.round(seed * 997));
  const knobs = Array.from({ length: 9 }, () => ({ a: rng() * 6.283, k: 0.05 + rng() * 0.1, w: 0.12 + rng() * 0.3 }));
  const pts = Array.from({ length: 90 }, (_, j) => {
    const a = (j / 90) * Math.PI * 2;
    const bump = knobs.reduce((q, n) => q + n.k * Math.exp(-((Math.atan2(Math.sin(a - n.a), Math.cos(a - n.a)) / n.w) ** 2)), 0);
    const q = 0.93 + bump + 0.018 * Math.sin(a * 17 + seed) + 0.012 * Math.sin(a * 31 + seed * 3);
    return { x: x + Math.cos(a) * rx * q, y: y + Math.sin(a) * ry * q };
  });
  const g = ctx.createLinearGradient(x + rx * 0.3, y - ry, x - rx * 0.1, y + ry);
  g.addColorStop(0, '#d8d3a4');
  g.addColorStop(0.16, '#8fa08a');
  g.addColorStop(0.45, '#4a7480');
  g.addColorStop(1, '#0f3656');
  poly(ctx, pts, g);
  pen.clipped(pts, () => {
    // Ledges: light edges over dark hollows.
    for (let i = 0; i < 9; i++) {
      const cy = y - ry * 0.8 + (i / 8) * ry * 1.6;
      const ledge = Array.from({ length: 16 }, (_, j) => ({ x: x - rx * 1.1 + (j / 15) * rx * 2.2, y: cy + 16 * Math.sin(j * 1.1 + i * 2 + seed) + 8 * Math.sin(j * 2.7 + i) }));
      poly(ctx, [...ledge, ...[...ledge].reverse().map((p, j) => ({ x: p.x, y: p.y + 14 + 12 * Math.abs(Math.sin(j + i)) }))], 'rgba(6,34,56,0.28)');
      pen.hair(ledge.map((p) => ({ x: p.x, y: p.y - 4 })), 3.4, '#e9e6bd', 0.3 * (1 - i / 10));
    }
    for (let i = 0; i < 46; i++) glow(ctx, x + (rng() - 0.5) * 2 * rx, y + (rng() - 0.5) * 2 * ry, 10 + rng() * 40, 8 + rng() * 26, ([[196, 112, 116], [126, 152, 84], [8, 40, 66], [226, 210, 150]] as const)[Math.floor(rng() * 4)]!, 0.22);
    for (let i = 0; i < 12; i++) {
      const p = { x: x + (rng() - 0.5) * 1.8 * rx, y: y + (rng() - 0.5) * 1.8 * ry };
      pen.hair(spline([p, { x: p.x + 14 - rng() * 28, y: p.y + 24 }, { x: p.x + 24 - rng() * 48, y: p.y + 60 }], 4), 2.4, '#08263c', 0.5);
    }
  });
  pen.closed(pts, 3.2, INK);
}

function drawReef(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const pen = new Pen(ctx, 141, 0.8);
  // Hazy far reef.
  for (const [k, c] of [[0, 'rgba(60,168,206,0.65)'], [1, 'rgba(30,124,172,0.8)']] as const) {
    poly(ctx, [{ x: -60, y: 2000 }, ...Array.from({ length: 125 }, (_, i) => ({ x: -60 + i * 10, y: 1230 + 130 * k + 70 * Math.sin(i * 0.085 + k * 2) + 34 * Math.sin(i * 0.23 + k) + 12 * Math.sin(i * 0.7 + k * 3) + 5 * Math.sin(i * 1.9) })), { x: 1180, y: 2000 }], c);
  }
  // Kelp standing in the light.
  for (let i = 0; i < 6; i++) {
    const x = 560 + i * 110 + 30 * Math.sin(i * 3);
    const h = 620 + 260 * Math.sin(i * 2.1 + 1);
    const path = Array.from({ length: 16 }, (_, j) => ({ x: x + (j * 3.4) * Math.sin(j * 0.4 + t * 1.6 + i), y: 1800 - (h * j) / 15 }));
    drawTube(ctx, { path, radius: (s) => 13 * (1 - s * 0.7), n: 40, seed: 700 + i, boil, detail: 0, ramp: KELP, line: 2 }, SUN);
    for (let j = 3; j < 15; j++) {
      const p = path[j]!;
      const sgn = j % 2 ? 1 : -1;
      const tip = { x: p.x + sgn * (84 - j * 2), y: p.y - 34 + 12 * Math.sin(t * 2 + j) };
      const up = { x: -(tip.y - p.y) * 0.17 * sgn, y: (tip.x - p.x) * 0.17 * sgn };
      const bow = { x: (p.x + tip.x) / 2, y: (p.y + tip.y) / 2 };
      const leaf: Pt[] = spline([p, { x: bow.x + up.x - sgn * 10, y: bow.y + up.y }, { x: bow.x + up.x * 0.8 + sgn * 22, y: bow.y + up.y * 0.6 + 4 }, { x: tip.x + sgn * 24, y: tip.y + 16 }, { x: bow.x - up.x * 0.4 + sgn * 16, y: bow.y - up.y * 0.5 + 8 }, { x: bow.x - up.x * 0.6, y: bow.y - up.y * 0.7 }, p], 5);
      poly(ctx, leaf, wash(ctx, p.x, p.y, tip.x, tip.y, [[0, '#6c7a22'], [1, '#c6bd58']]));
      pen.hair([...leaf, p], 2, INK, 0.75);
    }
  }
  for (const [x, y, rx, ry, s] of [[960, 1790, 330, 200, 1], [560, 1850, 330, 170, 2], [180, 1800, 300, 230, 3]] as const) rock(ctx, pen, x, y, rx, ry, s);
}

/** A shoal of little silver fish, scattering out of the way. */
function drawShoal(ctx: CanvasRenderingContext2D, t: number, scare: number): void {
  const rng = createRng(4242);
  for (let i = 0; i < 26; i++) {
    const x0 = 700 + rng() * 420;
    const y0 = 880 + rng() * 360;
    const k = 0.6 + rng() * 0.8;
    const x = x0 + scare * (160 + 240 * rng()) + 10 * Math.sin(t * 3 + i);
    const y = y0 + (rng() - 0.4) * 260 * scare + 6 * Math.sin(t * 5 + i);
    const L = 34 * k;
    ctx.fillStyle = wash(ctx, 0, y - L * 0.3, 0, y + L * 0.3, [[0, '#1d6f9c'], [0.45, '#cfeff6'], [1, '#f4ffff']]);
    ctx.strokeStyle = 'rgba(10,40,66,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + L, y);
    ctx.quadraticCurveTo(x + L * 0.3, y - L * 0.46, x - L * 0.62, y - L * 0.05);
    ctx.lineTo(x - L, y - L * 0.3 + 3 * Math.sin(t * 16 + i));
    ctx.lineTo(x - L * 0.95, y + L * 0.3 + 3 * Math.sin(t * 16 + i));
    ctx.lineTo(x - L * 0.62, y + L * 0.05);
    ctx.quadraticCurveTo(x + L * 0.3, y + L * 0.44, x + L, y);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#07182a';
    ctx.beginPath();
    ctx.arc(x + L * 0.62, y - L * 0.06, L * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The rock wall with the pipe's mouth in it. */
function drawWallAndPipe(ctx: CanvasRenderingContext2D, boil: number): void {
  const pen = new Pen(ctx, 143, 0.8);
  for (const [x, y, rx, ry, s] of [[-40, 60, 250, 240, 1.2], [-70, 900, 300, 330, 2.2], [20, 1240, 260, 260, 3.4], [-30, 520, 300, 320, 4.1], [40, 220, 200, 150, 5]] as const) rock(ctx, pen, x, y, rx, ry, s);
  const ring = (k: number): Pt[] => Array.from({ length: 41 }, (_, i) => ({ x: MOUTH.x + Math.cos((i / 40) * Math.PI * 2) * MOUTH.rx * k, y: MOUTH.y + Math.sin((i / 40) * Math.PI * 2) * MOUTH.ry * k }));
  const ink = new Pen(ctx, 145 + (boil % 3) * 977, 0.8);
  poly(ctx, ring(1.26).map((p) => ({ x: p.x + 10, y: p.y + 14 })), 'rgba(6,36,60,0.5)');
  poly(ctx, ring(1.26), wash(ctx, MOUTH.x - 120, MOUTH.y - 200, MOUTH.x + 160, MOUTH.y + 220, [[0, '#e9e2cf'], [0.4, '#b7b1a1'], [1, '#5d6666']]));
  ink.closed(ring(1.26), 4, INK);
  const g = ctx.createRadialGradient(MOUTH.x - 30, MOUTH.y, 10, MOUTH.x, MOUTH.y, MOUTH.ry);
  g.addColorStop(0, '#020a12');
  g.addColorStop(0.75, '#06202e');
  g.addColorStop(1, '#1f5366');
  poly(ctx, ring(1), g);
  ink.closed(ring(1), 4, INK);
  for (let i = 0; i < 26; i++) {
    const a = pen.rng() * 6.28;
    const k = 1.05 + pen.rng() * 0.18;
    pen.dot(MOUTH.x + Math.cos(a) * MOUTH.rx * k, MOUTH.y + Math.sin(a) * MOUTH.ry * k, 2 + pen.rng() * 6, '#4f7a4a', 0.5);
  }
}

export function swimmerAt(t: number): { x: number; y: number; size: number; dir: number; open: number } {
  const s = t - (OCEAN_AT - 0.04);
  const u = 1 - (1 - clamp01(s / 0.62)) ** 3;
  const drift = Math.max(0, s - 0.3);
  return { x: lerp(190, 520, u) + 20 * drift, y: lerp(480, 830, u) - 26 * drift + 10 * Math.sin(t * 5), size: lerp(70, 172, u), dir: lerp(0.5, -0.62, smooth((s - 0.1) / 0.6)), open: smooth((s - 0.34) / 0.42) };
}

export function drawOcean(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const s = t - (OCEAN_AT - 0.04);
  const z = lerp(1.12, 1, smooth(s / 0.5));
  ctx.save();
  ctx.translate(540, 800);
  ctx.scale(z, z);
  ctx.translate(-540, -800);
  drawBlueWater(ctx, t);
  drawReef(ctx, t, boil);
  drawShoal(ctx, t, smooth(s / 0.7));
  drawWallAndPipe(ctx, boil);
  const w = swimmerAt(t);
  // The jet of bubbles it rides out on.
  const rng = createRng(555);
  for (let i = 0; i < 80; i++) {
    const at = rng();
    const jx = (rng() - 0.5) * 190;
    const jy = (rng() - 0.5) * 230;
    const r = 5 + rng() * rng() * 34;
    const age = s - at * 0.5;
    if (age < 0) continue;
    bubble(ctx, lerp(MOUTH.x, w.x, at) + jx * (0.4 + age) - 30 * age, lerp(MOUTH.y, w.y, at) + jy * (0.4 + age) - 190 * age, r * Math.min(1, age * 8) * Math.max(0, 1 - age * 0.5), 0.8);
  }
  glow(ctx, w.x, w.y, 520, 480, [255, 200, 130], 0.22, 'lighter');
  drawRig(ctx, {
    x: w.x, y: w.y, size: w.size, up: w.dir, bend: -0.25, length: 3.3, turn: 0.42, gaze: { x: 0.1, y: 0.1 }, lid: 0.02, breathe: 1 + 0.05 * Math.sin(t * 7),
    arms: streamArms(w.dir, w.size, t * 5, w.open), seed: 6501, web: lerp(0.18, 0.4, w.open),
  }, SUN, boil);
  ctx.restore();
}

// ---------------------------------------------------------------- "Inky was never seen again,"

const DEEP_FROM = INKY2_AT - 0.12;

export function drawDeep(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const { width: W, height: H } = VIDEO;
  ctx.fillStyle = wash(ctx, 0, 0, 0, H, [[0, '#4fb4d8'], [0.25, '#1f78b4'], [0.55, '#0d4484'], [1, '#04163a']]);
  ctx.fillRect(-60, -60, W + 120, H + 120);
  glow(ctx, 560, 360, 620, 560, [190, 240, 255], 0.5, 'lighter');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 190 + 14 * Math.sin(cycles(1, t) + i);
    poly(ctx, [{ x, y: -60 }, { x: x + 90, y: -60 }, { x: x - 80, y: 1400 }, { x: x - 300, y: 1400 }], wash(ctx, 0, 0, 0, 1400, [[0, 'rgba(190,240,255,0.13)'], [1, 'rgba(190,240,255,0)']]));
  }
  ctx.restore();
  // Far dark ridges.
  for (const [k, c] of [[0, 'rgba(10,52,104,0.8)'], [1, 'rgba(5,26,62,0.95)']] as const) {
    poly(ctx, [{ x: -60, y: 2000 }, ...Array.from({ length: 125 }, (_, i) => ({ x: -60 + i * 10, y: 1330 + 190 * k + 90 * Math.sin(i * 0.06 + k * 2.4) + 34 * Math.sin(i * 0.2 + k) + 12 * Math.sin(i * 0.63 + k * 3) + 5 * Math.sin(i * 1.7) })), { x: 1180, y: 2000 }], c);
  }
  const rng = createRng(606);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(214,240,255,${0.12 + 0.3 * rng()})`;
    ctx.beginPath();
    ctx.arc(rng() * W + 14 * Math.sin(cycles(1, t) + i), rng() * H + 10 * Math.cos(cycles(1, t) + i * 2), 1 + rng() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const u = clamp01((t - DEEP_FROM) / (WIPE_MID - DEEP_FROM));
  const far = smooth(u);
  const light: Light = { key: [0, -0.9, 0.4], ambient: 0.14, rim: [0.1, -1, 0.05], rimColour: [150, 224, 250], rimK: 1.2, tint: [13, 58, 110], tintK: lerp(0.55, 0.82, far) };
  const size = lerp(118, 70, far);
  const pulse = Math.sin((t - DEEP_FROM) * 4.2);
  const x = lerp(500, 640, far);
  const y = lerp(860, 620, far) + 10 * pulse;
  const dir = -1.12 + 0.05 * pulse;
  const wave = ramp(t, NEVER_AT - 0.1, NEVER_AT + 0.3);
  const arms = streamArms(dir, size, t * 4, 0.16 + 0.1 * pulse);
  // One arm lifted to the side, waving goodbye.
  const wag = 0.5 * Math.sin((t - NEVER_AT) * 9) * wave;
  const waving: RigArm = { a: lerp(dir + Math.PI - 0.9, dir + Math.PI + 1.9, wave), len: lerp(4.4, 3.3, wave), curl: lerp(0.5, 1.5, wave) + wag, near: false, ripple: 0.3, phase: t * 5 };
  drawRig(ctx, {
    x, y, size, up: dir, bend: -0.2, length: 3.4, turn: 2.6, gaze: { x: 0, y: 0 }, lid: 0.3, breathe: 1 + 0.06 * pulse, arms: [...arms, waving], seed: 6601, web: 0.3,
  }, light, boil);
  for (let i = 0; i < 12; i++) {
    const q = (((t * 0.5 + i * 0.137) % 1) + 1) % 1;
    bubble(ctx, x - 60 + 30 * Math.sin(i * 2.3) + 14 * Math.sin(q * 9), y + 220 - 520 * q, (4 + (i % 4) * 3) * Math.min(1, q * 5) * (1 - q * 0.5), 0.5 * (1 - q));
  }
  ctx.fillStyle = rgb([2, 10, 30], 0.12);
  ctx.fillRect(0, 0, W, H);
}
