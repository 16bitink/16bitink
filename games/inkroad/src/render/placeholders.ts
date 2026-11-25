import { ART_SCALE, SPRITE_SCALE, FLATS, FOOTPRINTS, SPRITES, type FlatName, type SpriteName } from '../art/manifest';
import { CELL } from '../sim/constants';
import { hash2, mulberry } from './noise';
import { polyPath, wobble } from './pen';
import type { Picture } from './pictures';
import { RISE, TILT } from './projection';
import { INK } from './style';
import { ctxOf, makeCanvas } from './tiles';

/** Quiet painted-looking stand-ins for the sprites and buildings, until the art files are there. */
type G = CanvasRenderingContext2D;
const INK_W = 1.6;

function blob(g: G, x: number, y: number, r: number, fill: string, seed: number): void {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const k = r * (0.84 + 0.3 * hash2(i, seed, 3));
    return { x: x + Math.cos(a) * k, y: y + Math.sin(a) * k * 0.85 };
  });
  const p = polyPath(pts);
  g.fillStyle = fill;
  g.fill(p);
  g.stroke(p);
}

function palm(g: G, w: number, h: number, seed: number): void {
  const cx = w / 2;
  const top = h * 0.36;
  g.lineWidth = w * 0.1;
  g.strokeStyle = '#8f7151';
  g.beginPath();
  g.moveTo(cx, h - 1);
  g.quadraticCurveTo(cx + (seed % 3) - 1, h * 0.7, cx, top);
  g.stroke();
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + seed;
    const r = w * (0.4 + 0.08 * hash2(i, seed, 1));
    const ex = cx + Math.cos(a) * r;
    const ey = top + Math.sin(a) * r * 0.72 + 3;
    g.strokeStyle = i % 2 ? '#5f7a45' : '#7c9255';
    g.lineWidth = w * 0.11;
    g.beginPath();
    g.moveTo(cx, top);
    g.quadraticCurveTo(cx + Math.cos(a) * r * 0.6, top + Math.sin(a) * r * 0.5 - 5, ex, ey);
    g.stroke();
    g.strokeStyle = 'rgba(48,52,34,0.75)';
    g.lineWidth = 1;
    g.stroke();
  }
}

function drawSprite(g: G, name: SpriteName, w: number, h: number, seed: number): void {
  g.strokeStyle = INK;
  g.lineWidth = INK_W;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (name === 'tree/palm' || name === 'tree/palm-tall') return palm(g, w, h, seed);
  if (name === 'tree/rock' || name === 'tree/oldtown-rock') return blob(g, w / 2, h * 0.6, w * 0.36, '#b5a189', seed);
  if (name === 'tree/round' || name === 'tree/oldtown') {
    g.fillStyle = '#8f7151';
    g.fillRect(w / 2 - 2, h * 0.6, 4, h * 0.38);
    return blob(g, w / 2, h * 0.42, w * 0.38, seed % 2 ? '#8c9d5c' : '#78904f', seed);
  }
  if (name === 'tree/shrub' || name === 'tree/oldtown-shrub') {
    blob(g, w * 0.35, h * 0.62, w * 0.22, '#8c9d5c', seed);
    return blob(g, w * 0.62, h * 0.58, w * 0.26, '#9aa868', seed + 4);
  }
  prop(g, name, w, h);
}

function prop(g: G, name: SpriteName, w: number, h: number): void {
  const bar = (x: number, y: number, bw: number, bh: number, fill: string): void => {
    g.fillStyle = fill;
    g.fillRect(x, y, bw, bh);
    g.strokeRect(x, y, bw, bh);
  };
  if (name === 'prop/lamp') { bar(w * 0.42, h * 0.1, w * 0.16, h * 0.88, '#6b6258'); bar(w * 0.2, 1, w * 0.6, h * 0.09, '#f4e6b4'); }
  else if (name === 'prop/cone') { g.fillStyle = '#e08a3c'; g.beginPath(); g.moveTo(w / 2, 1); g.lineTo(w - 1, h - 1); g.lineTo(1, h - 1); g.closePath(); g.fill(); g.stroke(); }
  else if (name === 'prop/barrier') { bar(1, 3, w - 2, h * 0.45, '#f1e6cc'); bar(w * 0.14, h * 0.5, 2, h * 0.45, '#6b6258'); bar(w * 0.8, h * 0.5, 2, h * 0.45, '#6b6258'); g.fillStyle = '#e0a04a'; for (let i = 0; i < 3; i++) g.fillRect(4 + i * 8, 4, 4, h * 0.4); }
  else if (name === 'prop/toll') { bar(w * 0.3, 2, w * 0.4, h - 3, '#8d8578'); }
  else if (name === 'prop/pier') { bar(1, 1, w - 2, h - 2, '#b9b1a5'); g.fillStyle = 'rgba(58,50,43,0.25)'; g.fillRect(w * 0.6, 1, w * 0.4 - 1, h - 2); }
  else if (name === 'prop/boat') { blob(g, w / 2, h * 0.6, w * 0.42, '#f4efe2', 3); bar(w * 0.4, h * 0.25, w * 0.26, h * 0.3, '#6f93a8'); }
  else { bar(2, h * 0.3, w - 4, h * 0.66, '#e6dac2'); bar(0.5, h * 0.12, w - 1, h * 0.24, '#5d8a8f'); }
}

export function spritePlaceholder(name: SpriteName, seed: number): Picture {
  const s = SPRITES[name];
  const c = makeCanvas(s.w, s.h);
  drawSprite(ctxOf(c), name, s.w, s.h, seed);
  return { img: c, scale: SPRITE_SCALE };
}

export function flatPlaceholder(name: FlatName): Picture {
  const s = FLATS[name];
  const c = makeCanvas(s.w, s.h);
  const g = ctxOf(c);
  if (name.startsWith('flat/island')) island(g, s.w);
  else bays(g, s.w, s.h);
  return { img: c, scale: ART_SCALE };
}

function island(g: G, w: number): void {
  const r = w / 2;
  for (const [k, fill] of [[0.98, '#d8cab2'], [0.86, '#8c9d5c'], [0.6, '#dcc08c'], [0.42, '#9aa868']] as const) {
    g.fillStyle = fill;
    g.beginPath();
    g.arc(r, r, r * k, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(58,50,43,0.7)';
    g.lineWidth = w * 0.008;
    g.stroke();
  }
}

/** An empty car park: asphalt with rows of bays. */
function bays(g: G, w: number, h: number): void {
  g.fillStyle = '#8b8890';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#efe8d8';
  g.lineWidth = 2;
  const rows = h >= 200 ? 3 : 2;
  const row = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let x = 12; x <= w - 12; x += 18) {
      g.beginPath();
      g.moveTo(x, r * row + 6);
      g.lineTo(x, r * row + 32);
      g.moveTo(x, (r + 1) * row - 32);
      g.lineTo(x, (r + 1) * row - 6);
      g.stroke();
    }
  }
}

// ---------------------------------------------------------------- buildings

interface Box3 { readonly x: number; readonly y: number; readonly w: number; readonly d: number; readonly h: number; readonly wall: string; readonly roof: string; readonly z?: number }

const WALLS = ['#e6d5b8', '#ddc7a4', '#e9dcc6', '#d6bd9a'] as const;
const ROOFS = ['#f0e4cc', '#e8d8ba', '#efe6d4'] as const;
const PAD = 6;

/** Draws boxes back to front on a canvas whose bottom centre is the footprint's south edge. */
function paintBoxes(fw: number, fd: number, boxes: readonly Box3[]): Picture {
  const tall = Math.max(...boxes.map((b) => (b.z ?? 0) + b.h)) * RISE + fd * TILT + PAD;
  const c = makeCanvas((fw + PAD * 2) * ART_SCALE, tall * ART_SCALE);
  const g = ctxOf(c);
  g.scale(ART_SCALE, ART_SCALE);
  g.translate(PAD, tall - fd * TILT);
  g.lineJoin = 'round';
  for (const b of [...boxes].sort((p, q) => p.y + p.d - (q.y + q.d) || (p.z ?? 0) - (q.z ?? 0))) oneBox(g, b);
  return { img: c, scale: ART_SCALE };
}

function oneBox(g: G, b: Box3): void {
  const z = b.z ?? 0;
  const top = b.y * TILT - (z + b.h) * RISE;
  const front = (b.y + b.d) * TILT - (z + b.h) * RISE;
  const wallH = b.h * RISE;
  g.fillStyle = b.wall;
  g.fillRect(b.x, front, b.w, wallH);
  const wash = g.createLinearGradient(0, front, 0, front + wallH);
  wash.addColorStop(0, 'rgba(90,64,44,0.05)');
  wash.addColorStop(1, 'rgba(90,64,44,0.28)');
  g.fillStyle = wash;
  g.fillRect(b.x, front, b.w, wallH);
  windows(g, b, front, wallH);
  g.fillStyle = b.roof;
  g.fillRect(b.x, top, b.w, b.d * TILT);
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  const roof = [{ x: b.x, y: top }, { x: b.x + b.w, y: top }, { x: b.x + b.w, y: front }, { x: b.x, y: front }];
  const wall = [{ x: b.x, y: front }, { x: b.x + b.w, y: front }, { x: b.x + b.w, y: front + wallH }, { x: b.x, y: front + wallH }];
  g.stroke(polyPath(wobble(roof, 0.3, 9, 2)));
  g.stroke(polyPath(wobble(wall, 0.3, 9, 4)));
  if (b.w < 14 || b.d < 12) return;
  g.globalAlpha = 0.4;
  g.strokeRect(b.x + 2.5, top + 2, b.w - 5, b.d * TILT - 4);
  g.globalAlpha = 1;
}

function windows(g: G, b: Box3, y: number, h: number): void {
  if (b.h < 9) return;
  const floors = Math.max(1, Math.round(b.h / 16));
  const cols = Math.max(1, Math.floor(b.w / 8));
  g.fillStyle = 'rgba(74,92,102,0.72)';
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < cols; i++) g.fillRect(b.x + ((i + 0.5) * b.w) / cols - 1.5, y + ((f + 0.28) * h) / floors, 3, Math.min(4, (h / floors) * 0.5));
  }
}

/** Heights of home / shops / office plots by level, plan px above ground. */
const PLOT_HEIGHTS: Readonly<Record<string, readonly number[]>> = { home: [15, 48, 92, 150], shops: [16, 24, 34, 48], office: [34, 70, 112, 160] };
const WHOLE_HEIGHTS: Readonly<Record<string, number>> = { market: 14, school: 24, hospital: 50, landmark: 60, mall: 36, stadium: 44, port: 22, fair: 18, 'park-multi': 46, 'park-under': 6 };

export function buildingPlaceholder(kind: string, level: number, variant: number): Picture {
  const [cw, ch] = FOOTPRINTS[kind] ?? [2, 2];
  const w = cw * CELL;
  const d = ch * CELL;
  const r = mulberry(level * 131 + variant * 17 + kind.length * 7);
  const wall = WALLS[Math.floor(r() * WALLS.length)]!;
  const roof = ROOFS[Math.floor(r() * ROOFS.length)]!;
  const heights = PLOT_HEIGHTS[kind];
  if (heights) return plot(w, d, heights[level - 1] ?? heights[0]!, level, wall, roof, r);
  const h = WHOLE_HEIGHTS[kind] ?? 24;
  return paintBoxes(w, d, [
    { x: w * 0.08, y: d * 0.08, w: w * 0.84, d: d * 0.4, h, wall, roof },
    { x: w * 0.08, y: d * 0.48, w: w * 0.26, d: d * 0.4, h: h * 0.7, wall, roof },
    { x: w * 0.66, y: d * 0.48, w: w * 0.26, d: d * 0.4, h: h * 0.7, wall, roof },
  ]);
}

function plot(w: number, d: number, h: number, level: number, wall: string, roof: string, r: () => number): Picture {
  const low: Box3[] = level === 1 ? fence(w, d) : [];
  const bw = level === 1 ? 34 + r() * 8 : 44 + r() * 8;
  const bd = level === 1 ? 28 + r() * 6 : 34 + r() * 6;
  const x = level === 1 ? 14 + r() * 14 : (w - bw) / 2;
  return paintBoxes(w, d, [
    ...low,
    { x, y: 16, w: bw, d: bd, h, wall, roof },
    ...(level === 1 ? [{ x: x + bw, y: 22, w: 14, d: 18, h: 9, wall: '#b98d63', roof: '#c69a6c' }] : [{ x: x + 8, y: 24, w: 14, d: 12, h: 7, z: h, wall, roof }]),
  ]);
}

/** A villa's garden wall. */
function fence(w: number, d: number): Box3[] {
  const c = { h: 4, wall: '#e2d2b6', roof: '#efe4cf' };
  return [
    { x: 8, y: 8, w: w - 16, d: 2.5, ...c }, { x: 8, y: 8, w: 2.5, d: d - 16, ...c },
    { x: w - 10.5, y: 8, w: 2.5, d: d - 16, ...c }, { x: 8, y: d - 10.5, w: w - 16, d: 2.5, ...c },
  ];
}
