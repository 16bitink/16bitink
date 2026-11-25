import { TEXTURE_SIZE, type TextureName } from '../art/manifest';
import { fbm, hash2, noise2 } from './noise';
import { ASPHALT, BUSLANE, CONCRETE, GRASS, PAVING, PLAZA, ROCK, SAND, WATER, WATER_DEEP, WORKS } from './style';

/**
 * Stand-in textures: seamless watercolour washes with paper grain, drawn once
 * when the painted file isn't there. 2x: the tile covers 256 plan px.
 */
const CELLS = 8; // noise cells across a tile, so it repeats cleanly
const GRAIN_CELLS = 128;

interface Wash {
  readonly base: string;
  /** How much the wash varies, 0..255, and how coarse. */
  readonly vary: number;
  readonly grain: number;
  readonly octaves: number;
  readonly extra?: 'ripples' | 'specks' | 'slabs' | 'setts' | 'tufts';
}

const WASHES: Readonly<Record<TextureName, Wash>> = {
  sand: { base: SAND, vary: 20, grain: 10, octaves: 4, extra: 'specks' },
  grass: { base: GRASS, vary: 30, grain: 14, octaves: 4, extra: 'tufts' },
  water: { base: WATER, vary: 22, grain: 5, octaves: 3, extra: 'ripples' },
  deep: { base: WATER_DEEP, vary: 22, grain: 5, octaves: 3, extra: 'ripples' },
  asphalt: { base: ASPHALT, vary: 14, grain: 13, octaves: 4 },
  concrete: { base: CONCRETE, vary: 14, grain: 9, octaves: 4 },
  paving: { base: PAVING, vary: 12, grain: 8, octaves: 3, extra: 'slabs' },
  buslane: { base: BUSLANE, vary: 18, grain: 12, octaves: 4 },
  rock: { base: ROCK, vary: 44, grain: 16, octaves: 5, extra: 'specks' },
  plaza: { base: PLAZA, vary: 16, grain: 9, octaves: 3, extra: 'setts' },
  cobble: { base: PLAZA, vary: 16, grain: 9, octaves: 3, extra: 'setts' },
  beach: { base: SAND, vary: 14, grain: 9, octaves: 4, extra: 'specks' },
  shallow: { base: WATER, vary: 18, grain: 5, octaves: 3, extra: 'ripples' },
  works: { base: WORKS, vary: 36, grain: 18, octaves: 4, extra: 'specks' },
};

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctxOf(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const x = c.getContext('2d');
  if (!x) throw new Error('InkRoad: no 2D canvas');
  return x;
}

function shade(name: TextureName, w: Wash, x: number, y: number, seed: number): number {
  const u = (x / TEXTURE_SIZE) * CELLS;
  const v = (y / TEXTURE_SIZE) * CELLS;
  let s = (fbm(u, v, w.octaves, seed, CELLS) - 0.5) * 2 * w.vary;
  s += (noise2((x / TEXTURE_SIZE) * GRAIN_CELLS, (y / TEXTURE_SIZE) * GRAIN_CELLS, seed + 5, GRAIN_CELLS) - 0.5) * w.grain;
  s += (hash2(x, y, seed + 9) - 0.5) * w.grain;
  if (w.extra === 'ripples') s += Math.max(0, Math.sin((v + fbm(u, v, 2, seed + 3, CELLS) * 2.5) * Math.PI * 4) - 0.75) * 60;
  if (w.extra === 'specks' && hash2(x >> 1, y >> 1, seed + 21) > 0.9965) s -= 34;
  if (w.extra === 'tufts' && noise2(u * 8, v * 8, seed + 31, CELLS * 8) > 0.82) s -= 18;
  return s;
}

export function washTile(name: TextureName): HTMLCanvasElement {
  const w = WASHES[name];
  const c = makeCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
  const g = ctxOf(c);
  const img = g.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const [r, gr, b] = rgb(w.base);
  const seed = name.charCodeAt(0) * 31 + name.length;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const i = (y * TEXTURE_SIZE + x) * 4;
      const s = shade(name, w, x, y, seed);
      img.data[i] = r + s;
      img.data[i + 1] = gr + s * 0.97;
      img.data[i + 2] = b + s * 0.86;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (w.extra === 'slabs' || w.extra === 'setts') joints(g, w.extra === 'slabs' ? 32 : 16);
  return c;
}

/** Faint paving joints. */
function joints(g: CanvasRenderingContext2D, step: number): void {
  g.strokeStyle = 'rgba(80,62,44,0.13)';
  g.lineWidth = 1.2;
  g.beginPath();
  for (let row = 0; row * step < TEXTURE_SIZE; row++) {
    g.moveTo(0, row * step);
    g.lineTo(TEXTURE_SIZE, row * step);
    const shift = row % 2 === 0 ? 0 : step;
    for (let x = shift; x < TEXTURE_SIZE; x += step * 2) {
      g.moveTo(x, row * step);
      g.lineTo(x, (row + 1) * step);
    }
  }
  g.stroke();
}
