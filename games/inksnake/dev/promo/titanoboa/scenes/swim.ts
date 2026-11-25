import { createRng } from '../../../../src/logic/rng';
import { lerp, VIDEO } from '../../short';
import { drawSprite, type Sprite } from '../../sprites';
import type { Light, Painter } from '../gl/engine';
import type { Camera, V3 } from '../gl/math';
import { boaOn, headMesh } from '../models/boa';
import { bake, blob, strokes, tone, vertical } from './backs';

/** Night at the swamp: a swimmer at the water's edge; two eyes and a brow come up out of the black water, and he backs off. */
const LIGHT: Light = {
  dir: [0.35, 0.85, 0.35], key: '#cfe2ff', keyK: 0.85, sky: '#33486e', ground: '#0e1420', rim: '#9cc8ff', rimK: 1.2, rimDir: [0.3, 0.7, -0.5],
};
const CAMERA: Camera = { eye: [0, 1.0, 6], at: [0, 0.2, 0], f: 2750, cx: 720, cy: 830 };
const WATER_Y = 930;

function night(): HTMLCanvasElement {
  return bake('night', (c) => {
    vertical(c, 0, 760, [[0, '#060a16'], [0.6, '#101c38'], [1, '#2c4a72']]);
    blob(c, 800, 420, 420, 420, tone(190, 215, 255), 0.35);
    c.fillStyle = '#e9efff';
    c.beginPath();
    c.arc(800, 560, 62, 0, Math.PI * 2);
    c.fill();
    blob(c, 785, 575, 46, 40, tone(160, 180, 215), 0.4);
    const rng = createRng(515);
    for (const [col, h0, y] of [['#16294a', 190, 745], ['#0b1630', 130, 765]] as const) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(-20, y);
      for (let x = -20; x < 1110; x += 16) c.lineTo(x, y - h0 * (0.45 + 0.35 * Math.sin(x * 0.013 + h0) + 0.22 * rng()));
      c.lineTo(1110, y);
      c.fill();
    }
    vertical(c, 750, 1500, [[0, '#39597f'], [0.08, '#1a2f4e'], [0.4, '#0b1628'], [1, '#050a14']]);
    strokes(c, 516, 200, [0, 760, 1080, 1250], ['#6f97c4', '#0a1424', '#33527c'], [190, 5], 0.22);
    for (let i = 0; i < 60; i++) {
      const y = 770 + rng() * 420;
      c.fillStyle = `rgba(225,236,255,${0.35 * rng()})`;
      c.fillRect(800 + (rng() - 0.5) * (70 + (y - 760) * 0.5), y, 20 + rng() * 70, 3);
    }
    // The bank we stand on.
    c.beginPath();
    c.moveTo(-20, 1210);
    c.bezierCurveTo(240, 1150, 560, 1190, 760, 1300);
    c.bezierCurveTo(880, 1370, 1000, 1400, 1110, 1400);
    c.lineTo(1110, VIDEO.height);
    c.lineTo(-20, VIDEO.height);
    c.closePath();
    const g = c.createLinearGradient(0, 1180, 0, VIDEO.height);
    g.addColorStop(0, '#2c3426');
    g.addColorStop(0.3, '#161c18');
    g.addColorStop(1, '#070a0b');
    c.fillStyle = g;
    c.fill();
    c.save();
    c.clip();
    strokes(c, 517, 240, [0, 1190, 1080, 1800], ['#46543a', '#0a0e0c', '#2a3626'], [120, 8], 0.3);
    c.restore();
    for (let i = 0; i < 150; i++) {
      const x = rng() * 1100;
      const y = 1215 + rng() * 500 + Math.max(0, x - 500) * 0.35;
      const h = 26 + rng() * 60;
      c.strokeStyle = rng() > 0.5 ? 'rgba(86,108,74,0.6)' : 'rgba(10,16,12,0.8)';
      c.lineWidth = 3 + rng() * 3;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 4, y - h * 0.6, x + (rng() - 0.3) * 40, y - h);
      c.stroke();
    }
  });
}

export interface SwimPose {
  readonly t: number;
  readonly surface: number;
  readonly scared: number;
  readonly back: number;
}

export function drawSwim(ctx: CanvasRenderingContext2D, p: Painter, o: SwimPose, boil: number, calm: Sprite, nope: Sprite): void {
  ctx.drawImage(night(), 0, 0);
  const y = lerp(-0.62, 0.03, o.surface);
  if (o.surface > 0) {
    const boa = boaOn([[0.02, y, -0.5], [0.05, y - 0.16, -0.85], [0.1, y - 0.6, -1.3], [0.2, y - 1, -2.2], [0.3, y - 2, -2.6]] as V3[], 1.4, { girth: 0.36, neck: 0.32, reach: 2.4, endless: true, rings: 60, face: [-0.28, 0.02, 1] });
    const scene = { camera: CAMERA, light: LIGHT, boil, items: [{ mesh: boa.body, clipY: 0 }, { mesh: headMesh(0), model: boa.head, clipY: 0, look: [0.2, -0.25] as const }] };
    // Its reflection, then rings, then itself.
    const img = p.paint(scene);
    ctx.save();
    ctx.globalAlpha = 0.28 * o.surface;
    ctx.translate(0, 2 * WATER_Y);
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    rings(ctx, o);
    ctx.drawImage(img, 0, 0);
  }
  blob(ctx, 268 - 190 * o.back, 1392, 170, 34, tone(0, 0, 0), 0.7);
  const hop = Math.abs(Math.sin(o.back * Math.PI * 4)) * 22 * (o.back < 1 ? 1 : 0);
  const sprite = o.scared > 0.5 ? nope : calm;
  const lean = -0.12 * o.scared - 0.05 * o.back;
  drawSprite(ctx, sprite, boil, { x: 268 - 190 * o.back + (o.scared > 0.5 ? Math.sin(o.t * 70) * 3 : 0), y: 860 + 14 * o.back - hop - 20 * Math.sin(Math.min(1, o.scared) * Math.PI), scale: 1.55, rotation: lean });
  tufts(ctx, 268 - 190 * o.back);
}

/** Grass over his feet. */
function tufts(ctx: CanvasRenderingContext2D, x0: number): void {
  const rng = createRng(733);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = x0 - 150 + rng() * 300;
    const y = 1385 + rng() * 40;
    const h = 46 + rng() * 80;
    ctx.strokeStyle = ['#1a2218', '#2c3a26', '#46583a', '#10160f'][Math.floor(rng() * 4)]!;
    ctx.lineWidth = 5 + rng() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 2, y - h * 0.6, x + (rng() - 0.4) * 50, y - h);
    ctx.stroke();
  }
  ctx.restore();
}

function rings(ctx: CanvasRenderingContext2D, o: SwimPose): void {
  ctx.save();
  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const k = ((o.t * 0.7 + i / 4) % 1 + 1) % 1;
    ctx.strokeStyle = `rgba(190,216,255,${0.5 * (1 - k) * o.surface})`;
    ctx.beginPath();
    ctx.ellipse(715, WATER_Y + 6, 240 + 220 * k, 26 + 40 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
