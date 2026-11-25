import { makeCanvas } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { lerp, VIDEO } from '../../short';
import type { Item, Light, Painter } from '../gl/engine';
import { type Camera, chain, move, rotY, rotZ, scale, type V3 } from '../gl/math';
import { boaOn, headMesh, tongueMesh } from '../models/boa';
import { crocMesh } from '../models/croc';
import type { Strike } from '../story';
import { bake, blob, strokes, tone, vertical } from './backs';

/**
 * The snack, in a thought bubble and then filling the frame: a crocodile on
 * a mud bank facing the water; the snake strikes out of it and takes the
 * croc snout first, the tail vanishing between its lips, a lump going down
 * its neck. No gore.
 */
const LIGHT: Light = {
  dir: [-0.4, 0.85, 0.55], key: '#fff6cf', keyK: 0.98, sky: '#5f7f74', ground: '#2c3420', rim: '#d8ffb0', rimK: 0.8, rimDir: [0.5, 0.55, -0.6],
};
const F = 3150;
const CROC_K = 1.0;
const CROC_AT: V3 = [-0.36, 0.06, 0];
const SNOUT_X = CROC_AT[0] + 1;

function swamp(): HTMLCanvasElement {
  return bake('swamp', (c) => {
    vertical(c, 0, 1010, [[0, '#101c14'], [0.45, '#2f4a2c'], [0.8, '#7f9448'], [1, '#b9b45c']]);
    blob(c, 640, 820, 760, 420, tone(255, 240, 150), 0.4);
    const rng = createRng(301);
    // Trunks, three ranks melting into the haze, each rounded and barked.
    for (const [n, dark, lit, w0, base, haze] of [[9, '#4b6438', '#8a9a52', 26, 930, 0.3], [6, '#263a24', '#5d7440', 50, 965, 0.18], [4, '#0f1b14', '#34492c', 84, 1000, 0]] as const) {
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.2 + rng() * 0.6) / n) * VIDEO.width;
        const w = w0 * (0.7 + rng() * 0.6);
        const lean = (rng() - 0.5) * 90;
        c.save();
        c.beginPath();
        c.moveTo(x + lean - w * 0.45, -10);
        c.bezierCurveTo(x - w * 0.5, 400, x - w * 0.55, base - 190, x - w * 1.15, base + 20);
        c.lineTo(x + w * 1.15, base + 20);
        c.bezierCurveTo(x + w * 0.55, base - 170, x + w * 0.5, 400, x + lean + w * 0.45, -10);
        const g = c.createLinearGradient(x - w, 0, x + w, 0);
        g.addColorStop(0, dark);
        g.addColorStop(0.55, dark);
        g.addColorStop(0.8, lit);
        g.addColorStop(1, dark);
        c.fillStyle = g;
        c.fill();
        c.clip();
        for (let k = 0; k < 26; k++) {
          const bx = x + (rng() - 0.5) * w * 2;
          const by = rng() * base;
          c.strokeStyle = rng() > 0.5 ? dark : lit;
          c.globalAlpha = 0.25;
          c.lineWidth = 2 + rng() * 4;
          c.beginPath();
          c.moveTo(bx + lean * 0.3, by);
          c.quadraticCurveTo(bx + (rng() - 0.5) * 16, by + 80, bx, by + 120 + rng() * 120);
          c.stroke();
        }
        c.restore();
      }
      if (haze > 0) vertical(c, 480, 1010, [[0, 'rgba(160,175,95,0)'], [1, `rgba(185,190,105,${haze * 1.8})`]]);
    }
    // Hanging moss.
    for (let i = 0; i < 90; i++) {
      const x = rng() * VIDEO.width;
      const l = 120 + rng() * 380;
      c.strokeStyle = `rgba(12,26,16,${0.25 + rng() * 0.45})`;
      c.lineWidth = 3 + rng() * 8;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, -10);
      c.quadraticCurveTo(x + (rng() - 0.5) * 60, l * 0.6, x + (rng() - 0.5) * 40, l);
      c.stroke();
    }
    vertical(c, 1000, VIDEO.height, [[0, '#8f9a52'], [0.1, '#4f6a44'], [0.4, '#24402f'], [1, '#0b1712']]);
    strokes(c, 302, 260, [0, 1005, 1080, 1700], ['#b6bd70', '#1a3226', '#5f8058', '#0e1f18'], [260, 7], 0.22);
    // The mud bank the croc lies on.
    c.save();
    c.beginPath();
    c.moveTo(-20, 1060);
    c.bezierCurveTo(200, 1030, 560, 1052, 800, 1090);
    c.bezierCurveTo(930, 1112, 900, 1160, 760, 1180);
    c.bezierCurveTo(500, 1225, 200, 1250, -20, 1240);
    c.closePath();
    c.fillStyle = '#4a3822';
    c.fill();
    c.clip();
    strokes(c, 303, 300, [0, 1030, 900, 1250], ['#6a5230', '#2a1f12', '#7f6a3c', '#39301a'], [130, 9], 0.4);
    c.restore();
    c.strokeStyle = 'rgba(14,12,8,0.75)';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-20, 1060);
    c.bezierCurveTo(200, 1030, 560, 1052, 800, 1090);
    c.bezierCurveTo(930, 1112, 900, 1160, 760, 1180);
    c.stroke();
  });
}

export function drawStrike(ctx: CanvasRenderingContext2D, p: Painter, t: number, s: Strike, boil: number): void {
  const rng = createRng(Math.floor(t * 30));
  const [sx, sy] = [(rng() - 0.5) * 34 * s.shake, (rng() - 0.5) * 34 * s.shake];
  ctx.save();
  ctx.translate(sx, sy);
  ctx.drawImage(swamp(), -20, -20, VIDEO.width + 40, VIDEO.height + 40);
  const camera: Camera = { eye: [0, 0.85, 6], at: [0, 0.3, 0], f: F, cx: 540, cy: 970 };
  // The head waits low in the water on the right, then reaches the croc's snout, then works along it to the tail.
  const gone = s.over;
  const lift = 0.3 * gone;
  const snoutNow = lerp(lerp(1.5, SNOUT_X + 0.1, s.near), CROC_AT[0] - 0.3, gone);
  const y = lerp(lerp(0.0, 0.3, s.near), 0.42 + lift * 0.5, gone);
  const size = 1.02;
  const jointX = snoutNow + size * 0.8;
  const smug = s.smug;
  const face: V3 = [-1, 0.46 * s.gape - 0.02 + 0.03 * smug, 0.12 + 0.75 * smug];
  // The croc: pulled along with the jaws at the end, so its tail goes in.
  const pulled = Math.max(0, gone - 0.3) / 0.7;
  const crocX = CROC_AT[0] + 1.3 * pulled ** 1.2;
  const path: V3[] = [
    [jointX, y + 0.02, 0.02 + 0.1 * smug], [jointX + 0.3, y, 0], [jointX + 0.8, y - 0.1 - 0.1 * gone, -0.06], [jointX + 1.4, y - 0.36 - 0.2 * gone, -0.15], [jointX + 2.2, -0.25, -0.2], [jointX + 3.4, -0.5, -0.3], [jointX + 5, -0.6, -0.4],
  ];
  const boa = boaOn(path, size, {
    girth: 0.42, neck: 0.24, reach: 5, endless: true, rings: 170, sides: 40, face,
    lump: { at: 0.27 + 0.03 * smug, half: 0.2, more: 0.4 * Math.min(1, gone * 1.2) },
  });
  const items: Item[] = [];
  if (gone < 0.985) {
    const nod = 0.12 * gone * (1 - pulled);
    items.push({
      mesh: crocMesh({ gape: s.near > 0.5 ? 0.02 : 0.1 + 0.05 * Math.sin(t * 8), swing: 0.1 * Math.sin(t * (s.near > 0.9 ? 40 : 4)), lift: 0.35 * gone, fold: Math.min(1, Math.max(0, (gone - 0.1) * 4)) }),
      model: chain(move(crocX, lerp(CROC_AT[1], y - 0.06 - 0.16 + 0.02, Math.min(1, gone * 4)), 0), rotZ(-nod), rotY(0), scale(CROC_K, CROC_K, CROC_K * (1 - 0.25 * gone))),
    });
  }
  items.push({ mesh: boa.body, clipY: -0.1 }, { mesh: headMesh(s.gape), model: boa.head, clipY: -0.1 });
  if (smug > 0.4) items.push({ mesh: tongueMesh(Math.sin(smug * Math.PI) * 0.8, 0.3), model: boa.head });
  const scene = { camera, light: LIGHT, boil, ground: 0.02, items };
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(p.shadows({ ...scene, light: { ...LIGHT, dir: [-0.1, 1, 0.1] } }), 0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  ctx.drawImage(p.paint(scene), 0, 0);
  drawSplash(ctx, s);
  ctx.restore();
}

/** Drops thrown up where it breaks out of the water. */
function drawSplash(ctx: CanvasRenderingContext2D, s: Strike): void {
  if (s.near < 0.15 || s.smug > 0.9) return;
  const rng = createRng(881);
  const age = s.near + s.over * 2.2;
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI * (0.12 + 0.76 * rng());
    const v = 220 + rng() * 520;
    const k = age * (0.35 + rng() * 0.3);
    const x = 880 + Math.cos(a) * v * k;
    const y = 1080 + Math.sin(a) * v * k + 420 * k * k;
    const r = (4 + rng() * 13) * Math.max(0, 1 - k / 1.6);
    if (y > 1180 || r < 1) continue;
    ctx.fillStyle = 'rgba(214,232,196,0.9)';
    ctx.strokeStyle = 'rgba(14,24,18,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.8, r * 1.15, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

let layer: ReturnType<typeof makeCanvas> | null = null;

/** The same picture in a thought bubble: `open` 0 (a bubble) .. 1 (the whole frame). */
export function drawBubble(ctx: CanvasRenderingContext2D, p: Painter, t: number, s: Strike, boil: number, shown: number, open: number): void {
  if (shown <= 0) return;
  layer ??= makeCanvas(VIDEO.width, VIDEO.height);
  drawStrike(layer.ctx, p, t, s, boil);
  const k = lerp(0.9, 1, open) * lerp(0.6, 1, shown);
  const c = { x: lerp(655, 540, open), y: lerp(790, 960, open) };
  const r = lerp(300, 1500, open * open) * shown;
  const path = (grow: number): void => {
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - 0.3;
      const [px, py] = [c.x + Math.cos(a) * r * 0.98, c.y + Math.sin(a) * r * 0.72];
      ctx.moveTo(px + r * 0.42 + grow, py);
      ctx.arc(px, py, r * 0.42 + grow, 0, Math.PI * 2);
    }
    ctx.moveTo(c.x + r, c.y);
    ctx.ellipse(c.x, c.y, r + grow, r * 0.78 + grow, 0, 0, Math.PI * 2);
  };
  ctx.save();
  if (open < 1) {
    ctx.fillStyle = '#120e0c';
    path(13);
    ctx.fill();
    ctx.fillStyle = '#fff6e2';
    path(7);
    ctx.fill();
    for (const [x, y, rr] of [[450, 1085, 34], [405, 1130, 20]] as const) {
      ctx.globalAlpha = shown * (1 - open);
      ctx.fillStyle = '#120e0c';
      ctx.beginPath();
      ctx.arc(x, y, rr + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6e2';
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  path(0);
  ctx.clip();
  ctx.drawImage(layer.canvas, c.x - 540 * k, c.y - 960 * k, VIDEO.width * k, VIDEO.height * k);
  ctx.restore();
}
