import { INK, type Pt } from '../../../src/art/pen';
import { blob, hash } from '../alvin/art/draw';
import { VIDEO } from '../short';
import { drawEel } from './art/eel';
import { sign } from './art/props';
import { drawSeal, type SealPose } from './art/seal';
import { EEL_W } from './art/sealFace';
import { curve, path, smoothLoop, softLine } from '../seal/art/paint';
import { toHead } from './scenes';
import { TEXT } from './script';
import { EXIT_AT, exitAt, GULP_AT, HIDE_SCALE, hideAt, LOOP_S, wrap } from './story';

/** The two guesses: "hiding" (from inside the crevice) and "the WRONG exit" (the gulp, the bulge and the pop). */

const W = VIDEO.width;
const H = VIDEO.height;

function water(ctx: CanvasRenderingContext2D, t: number, top: string, mid: string, low: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 170 + 30 * Math.sin((2 * Math.PI * 3 * t) / LOOP_S + i * 2);
    const ray = ctx.createLinearGradient(0, 0, 0, 1300);
    ray.addColorStop(0, `rgba(235,255,250,${0.16 + 0.1 * hash(i)})`);
    ray.addColorStop(1, 'rgba(235,255,250,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    ctx.lineTo(x + 60 + 50 * hash(i * 3), -10);
    ctx.lineTo(x - 130, 1300);
    ctx.lineTo(x - 330, 1300);
    ctx.fill();
  }
  ctx.restore();
}

function bubbles(ctx: CanvasRenderingContext2D, t: number, n: number, x0: number, w: number): void {
  for (let i = 0; i < n; i++) {
    const y = H - (((hash(i * 4) * H + t * (120 + 160 * hash(i))) % (H + 100)) - 50);
    const x = x0 + hash(i * 7) * w + 10 * Math.sin(t * 2 + i);
    const r = 5 + 13 * hash(i * 2);
    ctx.strokeStyle = 'rgba(226,248,252,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    blob(ctx, x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.4, 0, '255,255,255', 0.8);
  }
}

// ---------------------------------------------------------------- the crevice

/** The crevice's mouth, seen from inside: a ragged hole in the reef, ringed with lumps of rock and coral. */
const MID = { x: W / 2, y: 770 } as const;
const R = { x: 392, y: 404 } as const;
interface Knob { readonly shape: readonly Pt[]; readonly x: number; readonly y: number; readonly r: number; readonly a: number; readonly hue: number; readonly ring: number }

const KNOBS: readonly Knob[] = (() => {
  const out: Knob[] = [];
  for (const [ring, count, size] of [[2.75, 22, 290], [2.3, 22, 250], [1.85, 20, 215], [1.48, 19, 170], [1.18, 19, 122]] as const) {
    for (let i = 0; i < count; i++) {
      const k = out.length;
      const a = ((i + 0.6 * hash(k * 2.3)) / count) * Math.PI * 2;
      const rr = ring * (0.96 + 0.1 * hash(k * 5.1));
      const r = size * (0.8 + 0.4 * hash(k * 7.7));
      const x = MID.x + Math.cos(a) * (R.x * rr + r * 0.28);
      const y = MID.y + Math.sin(a) * (R.y * rr + r * 0.28);
      const shape = smoothLoop(Array.from({ length: 9 }, (_, j) => {
        const b = (j / 9) * Math.PI * 2;
        const q = r * (0.82 + 0.3 * hash(k * 13 + j * 3.7));
        return { x: x + Math.cos(b) * q, y: y + Math.sin(b) * q * 0.86 };
      }), 5);
      out.push({ shape, x, y, r, a, hue: hash(k * 3.9), ring });
    }
  }
  return out;
})();
const ROCKS = [['#a8957f', '#63544c', '#221d22'], ['#a88584', '#624a4d', '#231a20'], ['#a39672', '#5e5440', '#221e1a'], ['#8d949c', '#4c5260', '#1b1d28']] as const;

function knob(ctx: CanvasRenderingContext2D, k: Knob): void {
  const [lit, mid, dark] = ROCKS[Math.floor(k.hue * 3.99)]!;
  path(ctx, k.shape);
  // Lit on the side that faces the water.
  const [lx, ly] = [k.x - Math.cos(k.a) * k.r * 0.6, k.y - Math.sin(k.a) * k.r * 0.6];
  const g = ctx.createRadialGradient(lx, ly, 4, k.x, k.y, k.r * 1.25);
  const far = Math.max(0, k.ring - 1.2) * 0.8;
  g.addColorStop(0, far > 0.7 ? mid : lit);
  g.addColorStop(0.5, far > 0.95 ? dark : mid);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Pits and crusts; a brain coral's grooves on some.
  for (let i = 0; i < 26; i++) {
    const b = hash(k.x + i * 1.9) * Math.PI * 2;
    const q = k.r * Math.sqrt(hash(k.y + i * 4.3));
    const [x, y] = [k.x + Math.cos(b) * q, k.y + Math.sin(b) * q];
    ctx.fillStyle = i % 3 ? 'rgba(10,8,14,0.4)' : 'rgba(236,220,190,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + 5 * hash(i + k.r), 2.4 + 3 * hash(i * 2 + k.r), b, 0, Math.PI * 2);
    ctx.fill();
  }
  if (k.hue > 0.62 && k.hue < 0.9) {
    for (let i = -3; i <= 3; i++) {
      softLine(ctx, curve({ x: k.x - k.r, y: k.y + i * k.r * 0.24 }, { x: k.x - k.r * 0.2, y: k.y + i * k.r * 0.24 + k.r * 0.22 * Math.sin(i * 2) }, { x: k.x + k.r, y: k.y + i * k.r * 0.24 - 10 }, 14), 9, '#16120e', 0.55, 4);
    }
  }
  ctx.restore();
  path(ctx, k.shape);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function rocks(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#14121a';
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.ellipse(MID.x, MID.y, R.x * 1.12, R.y * 1.12, 0, 0, Math.PI * 2);
  ctx.fill('evenodd');
  for (const k of KNOBS) knob(ctx, k);
}

const LEDGE: readonly Pt[] = Array.from({ length: 28 }, (_, i) => ({ x: -20 + i * 42, y: 1212 + 14 * Math.sin(i * 0.9) + 12 * hash(i * 3) }));
/** The ledge inside, along the bottom, where the eel hides. */
function ledge(ctx: CanvasRenderingContext2D): void {
  const shape = [...LEDGE, { x: W + 40, y: H + 10 }, { x: -20, y: H + 10 }];
  path(ctx, shape);
  const g = ctx.createLinearGradient(0, 1200, 0, H);
  g.addColorStop(0, '#9c866c');
  g.addColorStop(0.12, '#6a5848');
  g.addColorStop(0.5, '#352c2c');
  g.addColorStop(1, '#101016');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 70; i++) {
    const [x, y] = [hash(i * 3.1) * W, 1230 + hash(i * 5.3) ** 1.6 * 640];
    blob(ctx, x, y, 22 + 50 * hash(i), 9 + 16 * hash(i * 2), 0, i % 2 ? '190,164,130' : '8,8,14', 0.34);
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  LEDGE.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

/** Loose lumps of reef on the ledge, nearest us. */
const LOOSE: readonly Knob[] = [[70, 1560, 170, 0.3], [300, 1700, 210, 0.1], [1010, 1600, 190, 0.5], [760, 1760, 230, 0.8], [520, 1880, 180, 0.2]].map(([x, y, r, hue], k) => ({
  x: x!, y: y!, r: r!, a: Math.PI / 2, hue: hue!, ring: 2,
  shape: smoothLoop(Array.from({ length: 10 }, (_, j) => { const b = (j / 10) * Math.PI * 2; const q = r! * (0.86 + 0.24 * hash(k * 17 + j * 2.9)); return { x: x! + Math.cos(b) * q, y: y! + Math.sin(b) * q * 0.66 }; }), 5),
}));

export function drawHide(ctx: CanvasRenderingContext2D, t: number): void {
  const p = hideAt(t);
  water(ctx, t, '#b6f0ee', '#58bfd2', '#1d6a96');
  bubbles(ctx, t, 8, 80, 920);
  // The body is out in the water, behind the reef; the head comes through the hole.
  drawSeal(ctx, p.seal);
  rocks(ctx);
  const head: SealPose = { ...p.seal, headOnly: true };
  softLine(ctx, Array.from({ length: 24 }, (_, i) => { const a = Math.PI * (-0.15 + (i / 23) * 1.3); return { x: p.seal.x + Math.cos(a) * 196 * p.seal.scale, y: p.seal.y + 24 + Math.sin(a) * 172 * p.seal.scale }; }), 80, '#07070c', 0.6, 16);
  drawSeal(ctx, p.headOut ? head : { ...head, eel: { spine: p.eel.map((q) => toHead(p.seal, q)), slide: -p.gone * 400 } });
  ledge(ctx);
  for (const k of LOOSE) knob(ctx, k);
  if (p.headOut) drawEel(ctx, p.eel, { width: EEL_W * HIDE_SCALE * 0.86, ink: 4, head: true, alarm: 1 });
  else if (p.gone < 0.9) {
    // What's still on the ledge lies over it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 1080, W, H);
    ctx.clip();
    drawEel(ctx, p.eel, { width: EEL_W * HIDE_SCALE, ink: 4, slide: -p.gone * 400 * HIDE_SCALE });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- the wrong exit

/** A pale seabed with lumps of reef behind, where the seal rests. */
function seabed(ctx: CanvasRenderingContext2D): void {
  for (const k of BEHIND) knob(ctx, k);
  ctx.beginPath();
  ctx.moveTo(-10, H + 10);
  for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, 1300 + 16 * Math.sin(x * 0.008) + 8 * Math.sin(x * 0.023 + 1));
  ctx.lineTo(W + 10, H + 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 1280, 0, H);
  g.addColorStop(0, '#cfe0bd');
  g.addColorStop(0.3, '#a9c8b0');
  g.addColorStop(1, '#4f8a96');
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 60; i++) {
    const v = hash(i * 5.1);
    blob(ctx, hash(i * 2.7) * W, 1320 + 560 * v, 40 + 90 * v, 6 + 10 * v, 0, i % 2 ? '255,252,224' : '40,84,92', 0.26);
  }
}
const BEHIND: readonly Knob[] = [[40, 1290, 130, 0.35], [-20, 1200, 120, 0.1], [1050, 1300, 150, 0.6], [960, 1330, 90, 0.2]].map(([x, y, r, hue], k) => ({
  x: x!, y: y!, r: r!, a: Math.PI / 2, hue: hue!, ring: 1,
  shape: smoothLoop(Array.from({ length: 10 }, (_, j) => { const b = (j / 10) * Math.PI * 2; const q = r! * (0.84 + 0.28 * hash(k * 23 + j * 2.9)); return { x: x! + Math.cos(b) * q, y: y! + Math.sin(b) * q * 0.8 }; }), 5),
}));

const POST_X = 962;
/** A wooden post standing in the sand. */
function signpost(ctx: CanvasRenderingContext2D, u: number, wrong: number): void {
  const x = POST_X;
  if (wrong > 0.01) blob(ctx, x - 10, TEXT.nose.y, 330, 190, 0, '255,90,60', 0.85 * wrong * (0.8 + 0.2 * Math.sin(u * 26)));
  blob(ctx, x + 20, 1466, 110, 22, 0, '20,60,70', 0.6);
  const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
  g.addColorStop(0, '#c8955a');
  g.addColorStop(0.5, '#a06c3c');
  g.addColorStop(1, '#5e3a1e');
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x - 18, 560, 36, 906, 8);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 4; i++) softLine(ctx, [{ x: x - 11 + i * 7, y: 572 }, { x: x - 9 + i * 7, y: 1000 }, { x: x - 12 + i * 7, y: 1456 }], 2.4, '#4a2c14', 0.5, 2);
}

/** The boards on it, in front of the seal's shoulder. */
function boards(ctx: CanvasRenderingContext2D, u: number, wrong: number): void {
  const x = POST_X;
  const shake = wrong * 0.05 * Math.sin(u * 46) * Math.exp(-Math.max(0, u - EXIT_AT) * 6);
  sign(ctx, x - 14, TEXT.nose.y, 'NOSE', -1, -0.14 + shake, wrong > 0.5 ? '#e3261a' : '#8c4a40', TEXT.nose.size);
  sign(ctx, x - 12, TEXT.mouth.y, 'MOUTH', -1, 0.07, '#2f8a4c', TEXT.mouth.size);
}

export function drawExit(ctx: CanvasRenderingContext2D, t: number): void {
  const u = wrap(t);
  const p = exitAt(t);
  water(ctx, t, '#bdeee8', '#6cc8d4', '#3a98b4');
  bubbles(ctx, t, 9, 40, 1000);
  seabed(ctx);
  signpost(ctx, u, p.wrong);
  const eel = (c: CanvasRenderingContext2D, inside: boolean): void => {
    if (p.going) drawEel(c, p.going, { width: EEL_W, ink: 2.1, head: !inside, alarm: 0.5 });
  };
  drawSeal(ctx, {
    ...p.seal,
    ...(p.popped ? { eel: { spine: p.popped, headOut: true, alarm: 1 } } : {}),
    ...(p.headIn ? { inMouth: (c) => eel(c, true) } : { over: (c) => eel(c, false) }),
  });
  boards(ctx, u, p.wrong);
  // The gulp's bubbles, and the pop's.
  for (const [at, n, x, y] of [[GULP_AT, 7, p.seal.x, p.seal.y + 210], [EXIT_AT, 14, p.seal.x + 80, p.seal.y + 36]] as const) {
    const age = u - at;
    if (age < 0 || age > 0.7) continue;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * hash(i * 3.3 + n);
      const d = (90 + 420 * hash(i * 5.9 + n)) * Math.sqrt(age);
      const r = 7 + 15 * hash(i * 2.1);
      ctx.strokeStyle = `rgba(236,252,255,${0.95 * (1 - age / 0.7)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - 140 * age, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
