import { VIDEO } from '../../short';
import type { Light, Painter } from '../gl/engine';
import { type Camera, chain, move, project, rotY, scale } from '../gl/math';
import { crocMesh } from '../models/croc';
import { couchMesh } from '../models/props';
import { drawSprite, type Sprite } from '../../sprites';
import { bake, blob, strokes, tone, vertical } from './backs';

/** A living room in lamplight: a couch against the wall, and a crocodile exactly as long lying on the rug before it. */
const LIGHT: Light = {
  dir: [-0.5, 0.75, 0.6], key: '#ffe2b0', keyK: 1.0, sky: '#6a5a52', ground: '#4a3428', rim: '#ffcf90', rimK: 0.5, rimDir: [-0.6, 0.5, -0.4],
};
const CAMERA: Camera = { eye: [0, 2.3, 15], at: [0, 0.62, 0], f: 6900, cx: 540, cy: 840 };
const COUCH = couchMesh();
/** Couch and croc are drawn one length: 2 m. */
const CROC_K = 0.985;

function room(): HTMLCanvasElement {
  return bake('room', (c) => {
    vertical(c, 0, 1010, [[0, '#4a2f2a'], [0.6, '#7a4a38'], [1, '#8e5a42']]);
    for (let x = 30; x < VIDEO.width; x += 90) {
      c.fillStyle = 'rgba(255,220,170,0.05)';
      c.fillRect(x, 0, 40, 1010);
    }
    strokes(c, 61, 120, [0, 0, 1080, 1000], ['#9a6448', '#5a3428'], [300, 22], 0.07);
    blob(c, 150, 560, 620, 620, tone(255, 205, 120), 0.5);
    vertical(c, 1000, 1030, [[0, '#3a221a'], [1, '#5a3826']]);
    vertical(c, 1030, VIDEO.height, [[0, '#6a4228'], [0.4, '#4a2c1c'], [1, '#22140e']]);
    for (let i = 0; i < 9; i++) {
      c.strokeStyle = 'rgba(20,10,6,0.35)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(540 + (i - 4) * 150, 1030);
      c.lineTo(540 + (i - 4) * 420, VIDEO.height);
      c.stroke();
    }
    // The rug.
    c.save();
    c.translate(540, 1185);
    c.scale(1, 0.2);
    for (const [r, col] of [[560, '#5a1f22'], [535, '#c99a4a'], [515, '#7a2a2a'], [380, '#8e3632'], [360, '#c99a4a'], [348, '#6a2426']] as const) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    strokes(c, 62, 260, [20, 1090, 1060, 1290], ['#3a1214', '#b0584a'], [60, 3], 0.2);
    // The lamp.
    c.strokeStyle = '#2a1812';
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(112, 1040);
    c.lineTo(112, 640);
    c.stroke();
    c.fillStyle = '#2a1812';
    c.beginPath();
    c.ellipse(112, 1042, 62, 14, 0, 0, Math.PI * 2);
    c.fill();
    const g = c.createLinearGradient(40, 0, 190, 0);
    g.addColorStop(0, '#d99a4a');
    g.addColorStop(0.4, '#fff0c0');
    g.addColorStop(1, '#c88638');
    c.fillStyle = g;
    c.strokeStyle = '#20120c';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(66, 500);
    c.lineTo(158, 500);
    c.lineTo(206, 650);
    c.lineTo(18, 650);
    c.closePath();
    c.fill();
    c.stroke();
  });
}

export interface LoungePose {
  readonly t: number;
  readonly croc: number;
  readonly couch: number;
  readonly bar: number;
  /** The scientist leaning in from the left corner, 0..1. */
  readonly scientist: number;
}

export function drawLounge(ctx: CanvasRenderingContext2D, p: Painter, o: LoungePose, boil: number, scientist: Sprite): void {
  ctx.drawImage(room(), 0, 0);
  const walk = 1 - o.croc;
  const k = Math.max(0.001, o.couch);
  const scene = {
    camera: CAMERA, light: LIGHT, boil, ground: 0.005,
    items: [
      ...(o.couch > 0.01 ? [{ mesh: COUCH, model: chain(move(0, 0, -0.25), scale(1.03, k, 1.03)) }] : []),
      { mesh: crocMesh({ gape: 0.08 + 0.1 * Math.max(0, Math.sin(o.t * 9)) * walk, swing: 0.14 * Math.sin(o.t * (4 + 8 * walk)) }), model: chain(move(-walk * 2.6, 0.02 + 0.03 * Math.abs(Math.sin(o.t * 14)) * walk, 0.72), rotY(-0.04 + 0.07 * Math.sin(o.t * 12) * walk), scale(CROC_K)), look: [0.1, 0.1] as const },
    ],
  };
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.drawImage(p.shadows({ ...scene, light: { ...LIGHT, dir: [-0.2, 1, 0.1] } }), 0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.drawImage(p.paint(scene), 0, 0);
  if (o.bar > 0) drawBar(ctx, o.bar);
  if (o.scientist > 0) {
    ctx.fillStyle = `rgba(12,7,6,${0.5 * o.scientist})`;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    drawSprite(ctx, scientist, boil, { x: 235 - 560 * (1 - o.scientist), y: 1150 + 120 * (1 - o.scientist), scale: 2.75, rotation: -0.04 });
  }
}

/** The measure over both: one line from end to end, dropped to the snout and the tail's tip. */
function drawBar(ctx: CanvasRenderingContext2D, k: number): void {
  const y = 612;
  const [a, b] = [project(CAMERA, [-0.985, 0.05, 0.72]), project(CAMERA, [0.985, 0.2, 0.72])];
  const m = (a.x + b.x) / 2;
  const h = ((b.x - a.x) / 2) * k;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.lineCap = 'round';
  ctx.setLineDash([4, 20]);
  ctx.strokeStyle = '#ffe9b0';
  ctx.lineWidth = 6;
  for (const [x, to] of [[m - h, a.y - 20], [m + h, b.y - 10]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y + 40);
    ctx.lineTo(x, to);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const [w, c] of [[20, '#1a0f0a'], [9, '#ffe9b0']] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(m - h, y);
    ctx.lineTo(m + h, y);
    for (const s of [-1, 1]) {
      ctx.moveTo(m + s * h, y - 26);
      ctx.lineTo(m + s * h, y + 26);
    }
    ctx.stroke();
  }
  ctx.restore();
}
