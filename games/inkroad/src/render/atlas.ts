import type Phaser from 'phaser';
import type { Img } from './pictures';
import { ctxOf, makeCanvas } from './tiles';

/**
 * Packs pictures into power-of-two pages (so they get mipmaps and batch), by
 * shelves, tallest first. Frames keep the source size; `scale` is the page px
 * per plan px of each.
 */
const PAGE = 2048;
const GAP = 4;

export interface Piece { readonly name: string; readonly img: Img; readonly scale: number }
export interface Spot { readonly name: string; readonly page: number; readonly x: number; readonly y: number; readonly w: number; readonly h: number }

/** Where each piece goes. Pure, so it can be tested. */
export function pack(sizes: readonly { readonly name: string; readonly w: number; readonly h: number }[], page = PAGE, gap = GAP): { readonly spots: readonly Spot[]; readonly pages: number } {
  const order = [...sizes].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  const spots: Spot[] = [];
  let p = 0;
  let x = gap;
  let y = gap;
  let shelf = 0;
  for (const s of order) {
    if (s.w + gap * 2 > page || s.h + gap * 2 > page) throw new Error(`Atlas: ${s.name} is too big (${s.w} x ${s.h})`);
    if (x + s.w + gap > page) { x = gap; y += shelf + gap; shelf = 0; }
    if (y + s.h + gap > page) { p++; x = gap; y = gap; shelf = 0; }
    spots.push({ name: s.name, page: p, x, y, w: s.w, h: s.h });
    x += s.w + gap;
    shelf = Math.max(shelf, s.h);
  }
  return { spots, pages: sizes.length === 0 ? 0 : p + 1 };
}

export interface AtlasFrame { readonly texture: string; readonly frame: string; readonly w: number; readonly h: number; readonly scale: number }

const powerOfTwo = (n: number): number => 2 ** Math.ceil(Math.log2(Math.max(1, n)));

/** Packs the pieces into textures `<key>-0`, `<key>-1`… and returns each piece's frame. */
export function buildAtlas(textures: Phaser.Textures.TextureManager, key: string, pieces: readonly Piece[]): Map<string, AtlasFrame> {
  const { spots, pages } = pack(pieces.map((p) => ({ name: p.name, w: p.img.width, h: p.img.height })));
  const byName = new Map(pieces.map((p) => [p.name, p]));
  const out = new Map<string, AtlasFrame>();
  for (let p = 0; p < pages; p++) {
    const mine = spots.filter((s) => s.page === p);
    const canvas = makeCanvas(PAGE, powerOfTwo(Math.max(...mine.map((s) => s.y + s.h)) + GAP));
    const g = ctxOf(canvas);
    for (const s of mine) g.drawImage(byName.get(s.name)!.img, s.x, s.y);
    const name = `${key}-${p}`;
    if (textures.exists(name)) textures.remove(name);
    const tex = textures.addCanvas(name, canvas);
    if (!tex) throw new Error(`Atlas: no texture ${name}`);
    for (const s of mine) {
      tex.add(s.name, 0, s.x, s.y, s.w, s.h);
      out.set(s.name, { texture: name, frame: s.name, w: s.w, h: s.h, scale: byName.get(s.name)!.scale });
    }
  }
  return out;
}
