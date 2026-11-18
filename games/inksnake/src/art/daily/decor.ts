import type { CoverDef, LevelDef, Place, SolidDef } from '../../level/types';
import { createRng } from '../../logic/rng';
import { castShadow, outline } from '../groundKit';
import { bezier, closed, edge, glint, oval, pt, shade, skin, type Draw } from '../kit';
import type { Pt } from '../pen';
import { frostOnCover, frozenPond, hasWinterLook, snowOnSolid, winterGround } from './winter';

/**
 * A daily's looks over its place's painting: winter (snow, frost, the
 * frozen pond), and the events' decorations: presents as solid things and
 * fairy lights strung over the board at Christmas. bakeBoard and
 * bakeCovers (art/textures.ts) call these round the place's own art.
 */

/** Days whose solids are presents and whose board has fairy lights. */
const CHRISTMAS = new Set(['christmasEve', 'christmas', 'boxingDay']);

export const isChristmas = (level: LevelDef): boolean => level.event !== undefined && CHRISTMAS.has(level.event);
export const hasFireworks = (level: LevelDef): boolean => level.event === 'newYearsEve' || level.event === 'newYear';
const winter = (level: LevelDef, place: Place): boolean => level.season === 'winter' && hasWinterLook(place);

/** After the place's ground: winter's snow, and the Ice rule's pond. */
export function paintDailyGround(d: Draw, level: LevelDef, place: Place): void {
  if (winter(level, place)) winterGround(d, level, place);
  if (level.rule === 'ice') frozenPond(d, level);
  if (isChristmas(level)) lightWires(d, level);
}

/** A solid thing: a present if that's its look, else the place's own; snowed on in winter. */
export function paintDailySolid(d: Draw, s: SolidDef, level: LevelDef, place: Place, own: (d: Draw, s: SolidDef) => void): void {
  // Presents were set out after the snow: they only catch a few flakes.
  if (s.look === 'present') present(d, s);
  else own(d, s);
  if (winter(level, place) && s.look !== 'present') snowOnSolid(d, s);
}

/** A patch of cover: the place's own, rimed with frost in winter. */
export function paintDailyCover(d: Draw, c: CoverDef, level: LevelDef, place: Place, own: (d: Draw, c: CoverDef) => void): void {
  own(d, c);
  if (winter(level, place)) frostOnCover(d, c);
}

const WRAPS = [
  { paper: '#c8283a', ribbon: '#f2c14e' },
  { paper: '#3f7d4e', ribbon: '#e04a52' },
  { paper: '#2f5d9a', ribbon: '#f6f0e4' },
  { paper: '#e0a830', ribbon: '#b3322b' },
] as const;

/** A wrapped present from above: paper with a pattern, a ribbon tied across it and a bow on top. */
export function present(d: Draw, s: SolidDef): void {
  const rng = createRng(5100 + Math.round(s.x * 3 + s.y));
  const wrap = WRAPS[Math.floor(rng() * WRAPS.length)]!;
  const box = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 30) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 5).slice(0, -1);
  const c = s.kind === 'circle' ? pt(s.x, s.y) : pt(s.x + s.w / 2, s.y + s.h / 2);
  const half = s.kind === 'circle' ? { w: s.r, h: s.r } : { w: s.w / 2, h: s.h / 2 };
  castShadow(d, box, 9, 0.22);
  skin(d, box, wrap.paper, 0.85);
  d.pen.clipped(box, () => {
    // The paper's pattern: little stars or dots in the ribbon's colour.
    for (let i = 0; i < 14; i++) d.pen.dot(c.x + (rng() - 0.5) * half.w * 2, c.y + (rng() - 0.5) * half.h * 2, 1.1 + rng() * 0.6, wrap.ribbon, 0.7);
    const bw = Math.max(4, Math.min(half.w, half.h) * 0.28);
    d.pen.fill([pt(c.x - bw / 2, c.y - half.h - 2), pt(c.x + bw / 2, c.y - half.h - 2), pt(c.x + bw / 2, c.y + half.h + 2), pt(c.x - bw / 2, c.y + half.h + 2)], wrap.ribbon, 0.92);
    d.pen.fill([pt(c.x - half.w - 2, c.y - bw / 2), pt(c.x + half.w + 2, c.y - bw / 2), pt(c.x + half.w + 2, c.y + bw / 2), pt(c.x - half.w - 2, c.y + bw / 2)], wrap.ribbon, 0.92);
  });
  shade(d, box, 0.4);
  edge(d, box, 1.6);
  bow(d, c, Math.min(half.w, half.h) * 0.55, wrap.ribbon);
}

/** A ribbon bow: two loops and two tails. */
function bow(d: Draw, c: Pt, r: number, colour: string): void {
  const loop = (dir: number): Pt[] => [c, ...bezier(c, pt(c.x + dir * r * 1.6, c.y - r * 1.1), pt(c.x + dir * r * 1.1, c.y + r * 0.2), 8).slice(1), ...bezier(pt(c.x + dir * r * 1.1, c.y + r * 0.2), pt(c.x + dir * r * 0.5, c.y + r * 0.5), c, 5).slice(1)];
  for (const dir of [-1, 1]) {
    const shape = loop(dir);
    skin(d, shape, colour, 0.9);
    edge(d, shape, 1.1);
    d.pen.stroke([pt(c.x, c.y + 1), pt(c.x + dir * r * 0.6, c.y + r * 1.2)], 2.2, colour, 0.95, false);
    d.pen.hair([pt(c.x, c.y + 1), pt(c.x + dir * r * 0.6, c.y + r * 1.2)], 0.6, d.ink, 0.5);
  }
  d.pen.dot(c.x, c.y, Math.max(1.6, r * 0.28), colour, 1);
  glint(d, [pt(c.x - r * 0.8, c.y - r * 0.5), pt(c.x - r * 0.4, c.y - r * 0.75)], 0.9, 0.7);
  d.pen.circle(c.x, c.y, Math.max(1.6, r * 0.28), 0.8, d.ink);
}

/** A fairy light: where it hangs and which colour it glows. */
export interface FairyLight {
  readonly x: number;
  readonly y: number;
  readonly colour: number;
}

export const LIGHT_COLOURS = [0xff5a4e, 0xffd25a, 0x5ad27a, 0x6aa8ff, 0xff8ad8] as const;

/** The light strings: a garland sagging along the top of the board, and a ring round each round solid thing. */
function strings(level: LevelDef): Pt[][] {
  const out: Pt[][] = [];
  const swags = 5;
  for (let i = 0; i < swags; i++) {
    const a = pt(10 + (i * 940) / swags, 14);
    const b = pt(10 + ((i + 1) * 940) / swags, 14);
    out.push(bezier(a, pt((a.x + b.x) / 2, 58), b, 10));
  }
  for (const s of level.solids ?? []) {
    if (s.kind === 'circle' && s.r >= 14) out.push(closed(oval(s.x, s.y, s.r + 6, s.r + 6, 12)));
  }
  return out;
}

/** The wires the lights hang on, painted on the board. */
function lightWires(d: Draw, level: LevelDef): void {
  for (const s of strings(level)) d.pen.hair(s, 0.8, '#2a3a2a', 0.75);
}

/** Every fairy light on the board, for the view to make glow and twinkle. */
export function fairyLights(level: LevelDef): readonly FairyLight[] {
  if (!isChristmas(level)) return [];
  return strings(level).flatMap((s, si) => s.filter((_, i) => i % 2 === 1).map((p, i) => ({ x: p.x, y: p.y, colour: LIGHT_COLOURS[(si + i) % LIGHT_COLOURS.length]! })));
}
