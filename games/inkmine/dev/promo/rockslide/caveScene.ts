import { makeDraw } from '../../../src/art/kit';
import { mix, rgba } from '../../../src/art/paint';
import { RED } from '../../../src/art/palette';
import { TALUS_STYLE, talusStone } from '../../../src/art/creatures/rockcrab';
import { VIDEO } from '../short';
import { drawSprite } from '../sprites';
import { blockCorner, CAVE_BOX, makeBlock, makeCave, MARGIN, OPAL_LUMPS } from './cave';
import { drawCracks, drawCrumbs, drawNoiseBar, drawRings } from './hud';
import { FEET, type Figures } from './figures';
import {
  barAt, BLOCKS_AT, cameraAt, chaseClock, digAt, FIGURE_SCALE, FLOOR_Y, fleeAt, giantPoseAt, giantX, GIANT_SCALE, hoverAt, hushAt, LOOP_S, opalLitAt, rocksAt, SHAFT_X, sceneAt, stepAt, SURFACE_Y, walkAt, wrap, type Rock,
} from './story';

/** How big the prospector is against the camera in the chase (screen px per drawing unit): small beside the giant, which stands about 4 px a unit. */
export const FLEE_SCALE = 4.2;
const LAMP = '#ffd9a0';
/** The colours opal flashes (talusOres.ts). */
const FIRE = ['#3fd6a0', '#4aa8ff', '#ff8a3d', '#e05ad0', '#b4ff5a', '#5ae8ff'] as const;

const glowAt = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

/** A falling or lying rock, in the loose rock's own drawing, and the dust where it came off the roof or landed. */
function drawRock(ctx: CanvasRenderingContext2D, r: Rock, boil: number): void {
  if (r.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = r.alpha;
  if (r.phase === 'shake') {
    glowAt(ctx, r.x, r.y - r.size * 0.2, r.size * 0.9, '#b97a56', 0.35 * Math.min(1, r.age * 4));
  }
  ctx.translate(r.x, r.y);
  ctx.rotate(r.spin);
  const tone = ((r.seed * 37) % 10) / 10;
  talusStone(makeDraw(ctx, r.seed + boil, boil, 0, RED), 0, 0, r.size, r.seed, true, { ...TALUS_STYLE, stone: mix(TALUS_STYLE.stone, TALUS_STYLE.deep, tone * 0.8) });
  ctx.restore();
  if (r.phase === 'lie' && r.age < 0.8) {
    const u = r.age / 0.8;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - u);
    glowAt(ctx, r.x - r.size * 0.35 * u, r.y + r.size * 0.1, r.size * (0.7 + 0.8 * u), '#c98f66', 1);
    glowAt(ctx, r.x + r.size * 0.4 * u, r.y + r.size * 0.12, r.size * (0.6 + 0.7 * u), '#c98f66', 1);
    ctx.restore();
  }
}

/** Specks of dust hanging in the dark, every drift a whole number of cycles of the loop. */
function drawDust(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const a = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const b = (Math.sin(i * 78.233) * 12543.123) % 1;
    const cycles = 2 + (i % 3);
    const ph = (t / LOOP_S) * cycles + Math.abs(a);
    const x = -100 + Math.abs(b) * 1480 + 26 * Math.sin(ph * Math.PI * 2);
    const y = 760 + Math.abs(a * 7 % 1) * 560 + 30 * Math.cos(ph * Math.PI * 2);
    ctx.globalAlpha = 0.22 + 0.18 * Math.sin(ph * Math.PI * 2 + i);
    ctx.fillStyle = '#f1c9a6';
    ctx.beginPath();
    ctx.arc(x, y, 2.4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The opals catching the lamp: a slow colour shimmer over each lump and a four-point glint on a few. */
function drawOpalFire(ctx: CanvasRenderingContext2D, t: number, lit: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  OPAL_LUMPS.forEach((l, i) => {
    const ph = (t / LOOP_S) * (3 + (i % 4)) + i * 0.37;
    const s = 0.5 + 0.5 * Math.sin(ph * Math.PI * 2);
    glowAt(ctx, l.x, l.y, l.t * (0.55 + 0.3 * s), FIRE[(i + Math.floor(ph * 2)) % FIRE.length]!, (0.05 + 0.1 * s) * lit);
    if (i % 3 === 0 && s > 0.6) {
      const k = (s - 0.6) / 0.4;
      const len = l.t * (0.5 + 0.4 * k);
      ctx.globalAlpha = lit * k;
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(l.x - len, l.y - 6);
      ctx.lineTo(l.x + len, l.y - 6);
      ctx.moveTo(l.x, l.y - 6 - len);
      ctx.lineTo(l.x, l.y - 6 + len);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();
}

/** One baked screen-space vignette: the cave's own dark closing in at the edges. */
function makeVignette(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(540, 1020, 380, 540, 1020, 1250);
  g.addColorStop(0, 'rgba(10, 4, 4, 0)');
  g.addColorStop(1, 'rgba(10, 4, 4, 0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** The whole world, from frame 1 to the end: the sleeper and the dig, the awake giant raining rock, the chase. */
export function makeCaveScene(figures: Figures): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const layers = makeCave();
  const blocks = [0, 1, 2].map(makeBlock);
  const vignette = makeVignette();
  const at = (c: HTMLCanvasElement): [HTMLCanvasElement, number, number] => [c, -MARGIN, -MARGIN];

  return (ctx, time, boil) => {
    const t = wrap(time);
    const scene = sceneAt(time);
    const c = chaseClock(time);
    const cam = cameraAt(time);
    const dig = digAt(t);
    const hush = hushAt(t);
    const buzz = hush > 0 || t < 8 ? 0 : Math.sin(t * 90) * 2.2;
    const awake = giantPoseAt(time) === 'awake';
    ctx.fillStyle = '#120a09';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.translate(540, 960);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.cx, -cam.cy);
    ctx.fillStyle = '#1d0f0d';
    ctx.fillRect(-MARGIN, SURFACE_Y, 2000, 2100);
    for (const layer of [layers.sky, layers.butte]) ctx.drawImage(...at(layer));
    ctx.drawImage(...at(layers.inside));
    ctx.drawImage(...at(layers.bed));
    drawDust(ctx, t);

    const gx = giantX(time);
    const bob = awake ? stepAt(time) * 5 : 0;
    drawSprite(ctx, awake ? figures.awake : figures.sleep, boil, { x: gx, y: FLOOR_Y + 4 - bob, scale: GIANT_SCALE });
    const rocks = scene === 'rain' || scene === 'chase' ? rocksAt(c) : [];
    for (const r of rocks) if (r.phase !== 'shake') drawRock(ctx, r, boil);

    // The cave's own dark over what's in it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(CAVE_BOX.x0, CAVE_BOX.y0, CAVE_BOX.x1 - CAVE_BOX.x0, CAVE_BOX.y1 - CAVE_BOX.y0);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b8a09a';
    ctx.fillRect(CAVE_BOX.x0, CAVE_BOX.y0, CAVE_BOX.x1 - CAVE_BOX.x0, CAVE_BOX.y1 - CAVE_BOX.y0);
    ctx.restore();
    // A warm key light from the upper left on the giant itself, so its heap stands off the dark.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, awake ? figures.awake : figures.sleep, boil, { x: gx, y: FLOOR_Y + 4 - bob, scale: GIANT_SCALE, alpha: 0.2 });
    ctx.restore();
    drawOpalFire(ctx, t, scene === 'cave' ? opalLitAt(t) : scene === 'rain' ? 0.3 : 0.05);

    ctx.drawImage(...at(layers.ground));
    for (const r of rocks) if (r.phase === 'shake') drawRock(ctx, r, boil);
    const gone = BLOCKS_AT.filter((b) => t >= b).length;
    blocks.forEach((b, row) => {
      if (row < gone || scene !== 'cave') return;
      const corner = blockCorner(row);
      ctx.drawImage(b[boil]!, corner.x, corner.y + (row === gone ? buzz * 0.5 : 0));
    });
    if (scene === 'cave') {
      if (gone < blocks.length && t >= BLOCKS_AT[0]! - 0.6) drawCracks(ctx, gone, dig.work, boil);
      drawCrumbs(ctx, t);
    }
    if (scene === 'cave') drawProspectorInCave(ctx, figures, t, boil, dig.row, hush, buzz);
    if (scene === 'rain') {
      const h = hoverAt(t);
      drawLamp(ctx, h.x, h.y, 0.9);
      drawSprite(ctx, figures.fly, boil, { x: h.x, y: h.y, scale: FIGURE_SCALE, rotation: h.tilt, facing: -1 });
    }
    if (scene === 'cave' && hush <= 0 && t >= BLOCKS_AT[0]! - 0.6) drawRings(ctx, t, boil);
    ctx.restore();

    ctx.drawImage(vignette, 0, 0);
    if (scene === 'chase') {
      const f = fleeAt(time);
      ctx.save();
      drawLamp(ctx, f.x, f.y, 1.4);
      ctx.restore();
      drawSprite(ctx, figures.fly, boil, { x: f.x, y: f.y, scale: FLEE_SCALE, rotation: f.tilt });
    }
    const bar = barAt(t);
    if (bar > 0 && scene === 'cave') {
      ctx.save();
      ctx.globalAlpha = bar;
      drawNoiseBar(ctx, t, boil);
      ctx.restore();
    }
  };
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glowAt(ctx, x, y, 300 * k, LAMP, 0.42);
  glowAt(ctx, x, y, 110 * k, LAMP, 0.5);
  ctx.restore();
}

/** The prospector over the shaft: walking in over the surface, then drilling down through it a block at a time. */
function drawProspectorInCave(ctx: CanvasRenderingContext2D, figures: Figures, t: number, boil: number, row: number, hush: number, buzz: number): void {
  const walk = walkAt(t);
  if (walk <= 0) return;
  const feetOffset = FEET * FIGURE_SCALE;
  if (walk < 1) {
    const x = SHAFT_X + 520 * (1 - walk);
    const y = SURFACE_Y - 8 - feetOffset - Math.abs(Math.sin(t * 9)) * 6;
    drawLamp(ctx, x, y, 0.8);
    drawSprite(ctx, figures.walk, boil, { x, y, scale: FIGURE_SCALE, facing: -1 });
    return;
  }
  const x = SHAFT_X - 14 + buzz;
  const y = SURFACE_Y - feetOffset + row * 120;
  drawLamp(ctx, x + 10, y, 0.9);
  drawSprite(ctx, hush > 0.5 ? figures.idle : figures.drill, boil, { x, y, scale: FIGURE_SCALE });
}

