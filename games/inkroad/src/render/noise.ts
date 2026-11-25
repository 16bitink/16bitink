/** Seeded randomness for looks only (the sim has its own). Same input, same picture. */

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);

/** Value noise 0..1. `wrap` (cells) makes it tile. */
export function noise2(x: number, y: number, seed = 0, wrap = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const m = (v: number): number => (wrap > 0 ? ((v % wrap) + wrap) % wrap : v);
  const a = hash2(m(ix), m(iy), seed);
  const b = hash2(m(ix + 1), m(iy), seed);
  const c = hash2(m(ix), m(iy + 1), seed);
  const d = hash2(m(ix + 1), m(iy + 1), seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

/** Layered noise 0..1; `wrap` is the first layer's period in cells. */
export function fbm(x: number, y: number, octaves: number, seed = 0, wrap = 0): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  let k = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise2(x * k, y * k, seed + o * 17, wrap * k) * amp;
    total += amp;
    amp *= 0.5;
    k *= 2;
  }
  return sum / total;
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
