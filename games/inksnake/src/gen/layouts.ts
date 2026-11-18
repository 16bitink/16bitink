/**
 * A day's board (docs/inksnake-daily.md "Layouts"): a `remix` of one of the
 * place's campaign boards, mirrored and jittered, or a `pattern` laid out
 * with the place's own solids and cover on one of six shapes, keeping the
 * zones its snake needs (sun patches, sand, streams) from a campaign board.
 * Water and canopy places lay out their own ground: cays and coral on the
 * reef, islands and trunks in the flooded forest, crowns in the rainforest.
 */
import type { Rng } from '../logic/rng';
import type { Pt } from '../logic/vec';
import { BOARD, type CoverDef, type LevelDef, type SolidDef, type ZoneDef } from '../level/types';
import {
  between, clamp, inBoard, mirrorCover, mirrorHeading, mirrorPt, mirrorSolid, mirrorZone, pickOne, round, skeleton, solidGap, solidsMeet, spread,
  type Line, type Shape, type Transform,
} from './geometry';
import type { PlaceInfo } from './places';

export type LayoutChoice =
  | { readonly kind: 'remix'; readonly board: string; readonly t: Transform }
  | { readonly kind: 'pattern'; readonly shape: Shape; readonly source: string; readonly t: Transform; readonly variant: number };

/** The ground a day is played on, before its cast. */
export interface Layout {
  readonly start: Pt;
  readonly heading: number;
  readonly solids: readonly SolidDef[];
  readonly cover: readonly CoverDef[];
  readonly zones?: readonly ZoneDef[];
  readonly spots?: readonly Pt[];
  readonly nests?: readonly Pt[];
  /** The campaign board it came from (its cast, length and target are the starting point). */
  readonly base: LevelDef;
}

/** The layout's identity: the same key never comes twice within 60 days. */
export function layoutKey(c: LayoutChoice): string {
  return c.kind === 'remix' ? `remix:${c.board}:${c.t}` : `pattern:${c.source.split('-')[0]}:${c.shape}:${c.variant}`;
}

/** Its family: the same family never comes twice within 14 days (a board's mirrors, a place's shape). */
export function layoutFamily(c: LayoutChoice): string {
  return c.kind === 'remix' ? `remix:${c.board}` : `pattern:${c.source.split('-')[0]}:${c.shape}`;
}

const JITTER = 10;
const COVER_JITTER = 18;

function boardById(info: PlaceInfo, id: string): LevelDef {
  const b = [...info.boards, info.bossBoard].find((l) => l.id === id);
  if (!b) throw new Error(`no board ${id} in ${info.place}`);
  return b;
}

function nearest<T extends Pt>(p: Pt, list: readonly T[]): { item: T; d: number } | null {
  let best: { item: T; d: number } | null = null;
  for (const q of list) {
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!best || d < best.d) best = { item: q, d };
  }
  return best;
}

function centre(s: SolidDef): Pt {
  return s.kind === 'circle' ? { x: s.x, y: s.y } : { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

/** A campaign board mirrored, its solids nudged (holes and nests move with their solid), its cover shifted a little. */
function remix(base: LevelDef, t: Transform, rng: Rng): Layout {
  const solids0 = (base.solids ?? []).map((s) => mirrorSolid(s, t));
  const moves = solids0.map(() => ({ dx: round(between(rng, -JITTER, JITTER)), dy: round(between(rng, -JITTER, JITTER)) }));
  const solids = solids0.map((s, i) => {
    const m = moves[i]!;
    return s.kind === 'circle'
      ? { ...s, x: clamp(s.x + m.dx, s.r, BOARD.w - s.r), y: clamp(s.y + m.dy, s.r, BOARD.h - s.r) }
      : { ...s, x: s.x + m.dx, y: s.y + m.dy };
  });
  const centres = solids0.map(centre);
  const follow = (p: Pt): Pt => {
    const q = mirrorPt(p, t);
    const n = nearest(q, centres.map((c, i) => ({ ...c, i })));
    if (!n || n.d > 100) return q;
    const m = moves[n.item.i]!;
    return { x: clamp(q.x + m.dx, 0, BOARD.w), y: clamp(q.y + m.dy, 0, BOARD.h) };
  };
  const cover = (base.cover ?? []).map((c) => {
    const m = mirrorCover(c, t);
    return { ...m, x: round(clamp(m.x + between(rng, -COVER_JITTER, COVER_JITTER), 20, BOARD.w - 20)), y: round(clamp(m.y + between(rng, -COVER_JITTER, COVER_JITTER), 20, BOARD.h - 20)), r: round(clamp(m.r * between(rng, 0.9, 1.1), 20, 240)) };
  });
  return {
    start: mirrorPt(base.start, t), heading: mirrorHeading(base.heading, t), solids, cover,
    ...(base.zones ? { zones: base.zones.map((z) => mirrorZone(z, t)) } : {}),
    ...(base.spots ? { spots: base.spots.map(follow) } : {}),
    ...(base.nests ? { nests: base.nests.map(follow) } : {}),
    base,
  };
}

/** A solid from the kit, set at `p` (a rect turned to lie along `along`, if given). */
function solidAt(kit: SolidDef, p: Pt, along?: 'h' | 'v'): SolidDef {
  if (kit.kind === 'circle') return { ...kit, x: round(p.x), y: round(p.y) };
  const long = Math.max(kit.w, kit.h);
  const short = Math.min(kit.w, kit.h);
  const [w, h] = along === 'v' ? [short, long] : along === 'h' ? [long, short] : [kit.w, kit.h];
  return { ...kit, w, h, x: round(p.x - w / 2), y: round(p.y - h / 2) };
}

const sizeAlong = (s: SolidDef, dir: 'h' | 'v'): number => (s.kind === 'circle' ? s.r * 2 : dir === 'h' ? s.w : s.h);

/** A row of solids along a line, with one gap to slip through. */
function fillLine(line: Line, kit: SolidDef, rng: Rng): SolidDef[] {
  const dir: 'h' | 'v' = Math.abs(line.b.x - line.a.x) >= Math.abs(line.b.y - line.a.y) ? 'h' : 'v';
  const len = Math.hypot(line.b.x - line.a.x, line.b.y - line.a.y);
  const ux = (line.b.x - line.a.x) / len;
  const uy = (line.b.y - line.a.y) / len;
  const probe = solidAt(kit, { x: 0, y: 0 }, dir);
  const size = sizeAlong(probe, dir);
  const small = size < 30;
  const gap = small ? between(rng, 34, 52) : between(rng, 26, 60);
  const hole = between(rng, 0.25, 0.75) * len;
  const holeW = between(rng, 120, 160);
  const out: SolidDef[] = [];
  for (let d = size / 2; d <= len - size / 2; d += size + gap) {
    if (Math.abs(d - hole) < holeW / 2) continue;
    out.push(solidAt(kit, { x: line.a.x + ux * d, y: line.a.y + uy * d }, dir));
  }
  return out;
}

const STAMP_MARGIN = 24;
/** Weavers nest in this many acacias at most (two nests each). */
const MAX_NEST_TREES = 5;

/** Adds `s` unless it leaves the board or meets a solid already there. */
function stamp(list: SolidDef[], s: SolidDef): void {
  const c = centre(s);
  if (!inBoard(c, STAMP_MARGIN)) return;
  if (list.some((o) => solidsMeet(o, s, 6))) return;
  list.push(s);
}

/** Two weavers' nests at an acacia's branch tips (as chapter 4 hangs them). */
const nestsAt = (p: Pt): Pt[] => [{ x: p.x - 64, y: p.y - 30 }, { x: p.x + 62, y: p.y + 34 }].filter((q) => inBoard(q, 20));

/** Cover dropped on free ground: off the solids, away from the start and from other cover. */
export function freeCover(kit: readonly CoverDef[], solids: readonly SolidDef[], avoid: readonly Pt[], n: number, rng: Rng, have: readonly CoverDef[] = []): CoverDef[] {
  const out: CoverDef[] = [];
  if (kit.length === 0) return out;
  for (let tries = 0; tries < 80 && out.length < n; tries++) {
    const k = pickOne(rng, kit);
    const p = { x: round(between(rng, 70, BOARD.w - 70)), y: round(between(rng, 60, BOARD.h - 60)) };
    if (solids.some((s) => solidGap(p, s) < k.r * 0.7)) continue;
    if (avoid.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 120)) continue;
    if ([...have, ...out].some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r + k.r)) continue;
    out.push({ ...k, ...p });
  }
  return out;
}

/** Clears a ring round the start and the way ahead of it. */
function clearStart(solids: readonly SolidDef[], start: Pt, heading: number): SolidDef[] {
  const ahead = [0, 40, 80, 120, 160].map((d) => ({ x: start.x + Math.cos(heading) * d, y: start.y + Math.sin(heading) * d }));
  return solids.filter((s) => ahead.every((p, i) => solidGap(p, s) > (i === 0 ? 70 : 40)));
}

/** The kit's pieces for rows (rects first) and for single spots (round first). */
function kits(info: PlaceInfo, rng: Rng): { row: SolidDef; dot: SolidDef; extra: SolidDef } {
  const rects = info.solidKit.filter((s) => s.kind === 'rect');
  const circles = info.solidKit.filter((s) => s.kind === 'circle' && s.r >= 12);
  const any = info.solidKit;
  const row = rects.length && rng() < 0.75 ? pickOne(rng, rects) : pickOne(rng, circles.length ? circles : any);
  const dot = circles.length && rng() < 0.75 ? pickOne(rng, circles) : pickOne(rng, any);
  return { row, dot, extra: pickOne(rng, circles.length ? circles : any) };
}

/** A land place's pattern: the shape in the place's solids, cover on free ground, the zones of a campaign board. */
function landPattern(info: PlaceInfo, shape: Shape, src: LevelDef, t: Transform, rng: Rng): Layout {
  const sk = skeleton(shape, rng);
  const { row, dot, extra } = kits(info, rng);
  const acacia = info.solidKit.find((s) => s.look === 'acacia');
  const solids: SolidDef[] = [];
  for (const line of sk.lines) for (const s of fillLine(line, row, rng)) stamp(solids, s);
  sk.dots.forEach((p, i) => stamp(solids, solidAt(acacia && i % 2 === 0 ? acacia : rng() < 0.75 ? dot : extra, p)));
  const start = mirrorPt(src.start, t);
  const heading = mirrorHeading(src.heading, t);
  // The savanna's eggs hang from acacias: rows of rock or termite mounds still get three trees.
  if (acacia) for (const p of spread(rng, 6, 140, 90, solids.map(centre))) if (solids.filter((s) => s.look === 'acacia').length < 3) stamp(solids, solidAt(acacia, p));
  const kept = clearStart(solids, start, heading);
  const nests = acacia ? kept.filter((s) => s.look === 'acacia').slice(0, MAX_NEST_TREES).flatMap((s) => nestsAt(centre(s))) : [];
  const cover = freeCover(info.coverKit, kept, [start, ...nests], 2 + Math.floor(rng() * 3), rng);
  const keepSpots = src.id === info.bossBoard.id && src.spots;
  return {
    start, heading, solids: kept, cover,
    ...(src.zones ? { zones: src.zones.map((z) => mirrorZone(z, t)) } : {}),
    ...(keepSpots ? { spots: src.spots!.map((p) => mirrorPt(p, t)) } : {}),
    ...(nests.length ? { nests } : {}),
    base: src,
  };
}

const SEA: ZoneDef = { kind: 'water', look: 'reef', shape: 'rect', x: -40, y: -40, w: 1040, h: 620 };
const cay = (p: Pt, r: number): ZoneDef[] => [
  { kind: 'sand', look: 'shallows', shape: 'circle', x: p.x, y: p.y, r: r + 36 },
  { kind: 'land', look: 'cay', shape: 'circle', x: p.x, y: p.y, r },
];

/** The reef: the start's cay and one or two more, coral (each with an eel's hole beside it) on the shape. */
function reefPattern(info: PlaceInfo, shape: Shape, src: LevelDef, t: Transform, rng: Rng): Layout {
  const start = mirrorPt(src.start, t);
  const heading = mirrorHeading(src.heading, t);
  const isles = [start, ...spread(rng, shape === 'islands' ? 2 : 1, 300, 90, [start])];
  const zones = [SEA, ...isles.flatMap((p, i) => cay(p, round(i === 0 ? between(rng, 60, 72) : between(rng, 44, 62))))];
  const kit = { kind: 'circle', look: 'coral' } as const;
  const sk = skeleton(shape === 'islands' ? 'scatter' : shape, rng);
  const dots = [...sk.dots, ...sk.lines.flatMap((l) => [0.2, 0.5, 0.8].map((f) => ({ x: l.a.x + (l.b.x - l.a.x) * f, y: l.a.y + (l.b.y - l.a.y) * f })))];
  const solids: SolidDef[] = [];
  for (const p of dots) {
    if (isles.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 120)) continue;
    stamp(solids, { ...kit, x: round(p.x), y: round(p.y), r: round(between(rng, 20, 30)) });
  }
  const corals = clearStart(solids, start, heading).slice(0, 7);
  const spots = corals.flatMap((c) => {
    const r = c.kind === 'circle' ? c.r : 24;
    const n = rng() < 0.5 ? 2 : 1;
    const a0 = rng() * Math.PI * 2;
    return Array.from({ length: n }, (_, i) => ({ x: round(c.x + Math.cos(a0 + i * Math.PI) * (r + 15)), y: round(c.y + Math.sin(a0 + i * Math.PI) * (r + 15)) })).filter((p) => inBoard(p, 15));
  });
  const cover = freeCover(info.coverKit, corals, [start], 1 + Math.floor(rng() * 2), rng);
  return { start, heading, solids: corals, cover, zones, spots, base: src };
}

const WATER: ZoneDef = { kind: 'water', look: 'blackwater', shape: 'rect', x: -20, y: -20, w: 1000, h: 580 };

function isle(p: Pt, rx: number, ry: number, twist: number): ZoneDef {
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const k = 1 + 0.1 * Math.sin(a * 3 + twist) + 0.06 * Math.cos(a * 5 - twist);
    return { x: round(p.x + Math.cos(a) * rx * k), y: round(p.y + Math.sin(a) * ry * k) };
  });
  return { kind: 'land', look: 'bank', shape: 'poly', points };
}

/** The flooded forest: islands in the black water, trunks on the shape, the caiman's wet holes and the jaguar's dry spots. */
function floodedPattern(info: PlaceInfo, shape: Shape, src: LevelDef, t: Transform, rng: Rng): Layout {
  const start = mirrorPt(src.start, t);
  const heading = mirrorHeading(src.heading, t);
  const centres = spread(rng, shape === 'islands' ? 4 : 2 + Math.floor(rng() * 2), 260, 110, [start]).filter((p) => Math.hypot(p.x - start.x, p.y - start.y) > 200);
  const sizes = centres.map(() => ({ rx: round(between(rng, 80, 140)), ry: round(between(rng, 46, 70)) }));
  const isles = centres.map((p, i) => isle(p, sizes[i]!.rx, sizes[i]!.ry, rng() * 6));
  const trunk = { kind: 'circle', look: 'trunk', x: 0, y: 0, r: 16 } as const;
  const log = info.solidKit.find((s) => s.look === 'log');
  const sk = skeleton(shape === 'islands' ? 'scatter' : shape, rng);
  const solids: SolidDef[] = [];
  for (const line of sk.lines) for (const s of fillLine(line, log && rng() < 0.4 ? log : trunk, rng)) stamp(solids, s);
  for (const p of sk.dots) stamp(solids, { ...trunk, x: round(p.x), y: round(p.y), r: round(between(rng, 13, 19)) });
  const kept = clearStart(solids, start, heading).slice(0, 12);
  const wet = spread(rng, 3, 160, 80, [start, ...centres]);
  const spots = [...wet, ...centres.slice(0, 2)];
  const cover = freeCover(info.coverKit, kept, [start], 2 + Math.floor(rng() * 2), rng);
  return { start, heading, solids: kept, cover, zones: [WATER, ...isles], spots, base: src };
}

const CROWN_LOOKS = ['crown', 'fig', 'tall'] as const;

/** The rainforest canopy: tree crowns on the shape, a glide apart (60–130 px of floor between them). */
function canopyPattern(shape: Shape, src: LevelDef, t: Transform, rng: Rng): Layout {
  const sk = skeleton(shape, rng);
  const raw = [...sk.dots, ...sk.lines.flatMap((l) => [0, 0.33, 0.66, 1].map((f) => ({ x: l.a.x + (l.b.x - l.a.x) * f, y: l.a.y + (l.b.y - l.a.y) * f })))];
  // Thin out crowns that would sit on one another, then fill holes in the canopy.
  const centres: Pt[] = [];
  for (const p of raw) if (inBoard(p, 60) && centres.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 170)) centres.push({ x: round(p.x), y: round(p.y) });
  for (const p of spread(rng, 12, 200, 100, centres)) centres.push(p);
  const zones: ZoneDef[] = centres.map((p, i) => ({ kind: 'tree', look: CROWN_LOOKS[i % 3]!, shape: 'circle', x: p.x, y: p.y, r: round(between(rng, 88, 112)) }));
  const first = [...centres].sort((a, b) => (t === 'x' || t === 'xy' ? b.x - a.x : a.x - b.x))[0]!;
  const heading = t === 'x' || t === 'xy' ? Math.PI : 0;
  return { start: first, heading, solids: [], cover: [], zones, spots: centres.slice(0, 6), base: src };
}

/** The board for a choice: deterministic in the choice and the rng. */
export function buildLayout(info: PlaceInfo, choice: LayoutChoice, rng: Rng): Layout {
  if (choice.kind === 'remix') return remix(boardById(info, choice.board), choice.t, rng);
  const src = boardById(info, choice.source);
  if (info.place === 'reef') return reefPattern(info, choice.shape, src, choice.t, rng);
  if (info.place === 'flooded') return floodedPattern(info, choice.shape, src, choice.t, rng);
  if (info.place === 'rainforest') return canopyPattern(choice.shape, src, choice.t, rng);
  return landPattern(info, choice.shape, src, choice.t, rng);
}
