import type { FishShape } from '../../../src/art/fishArt';
import { createRng } from '../../../src/logic/rng';
import { BOIL_FPS, BOIL_FRAMES } from '../../../src/art/textures';
import { drawAnimal, prepareCast, type Look } from '../foodchain/cast';
import type { Kind } from '../foodchain/species';
import { clamp01, smooth } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawTiger, makeTigerSprite } from '../tigershark/tiger';
import { LARVA } from './art/larva';
import { drawPerson } from './art/person';
import { ANCHOR, scaleOf, STEPS, toScreen, WHALE, zoomOf, type Camera, type HeroKind, type Pt } from './ladder';
import { T } from './timeline';

/**
 * Draws any animal of the video at a world spot through the camera: the
 * heroes (the new larva and swimmer, the game's sardine, foodchain's
 * anchovy, mackerel, tuna, great white and blue whale), and the extras that
 * swim past (the game's reef shark and jack, the tiger shark, orcas).
 */

export type Body = HeroKind | 'orca' | 'shark' | 'jack' | 'tiger' | 'bluefin' | 'copepod' | 'anchovy';

const boilOf = (t: number): number => Math.floor(t * BOIL_FPS) % BOIL_FRAMES;

const GAME: Partial<Record<Body, readonly [FishShape, number]>> = { sardine: ['sardine', 8], shark: ['shark', 6], jack: ['jack', 6], anchovy: ['anchovy', 16] };
const FOOD: Partial<Record<Body, Kind>> = {
  young: 'anchovy', mackerel: 'mackerel', tuna: 'tuna', bluefin: 'tuna', white: 'greatWhite', whale: 'blueWhale', orca: 'orca', copepod: 'copepod',
};

const sprites = new Map<Body, Sprite>();
const spriteOf = (b: Body): Sprite => {
  let s = sprites.get(b);
  if (!s) {
    const [shape, res] = GAME[b]!;
    s = makeSprite(shape, res);
    sprites.set(b, s);
  }
  return s;
};
let tiger: Sprite | null = null;

export async function prepareHeroes(): Promise<void> {
  await prepareCast();
  LARVA.prepare();
  for (const b of Object.keys(GAME) as Body[]) spriteOf(b);
  tiger = makeTigerSprite(5);
}

/** Body lengths, metres, for the extras (heroes take theirs from the ladder). */
export const LENGTH: Readonly<Record<Body, number>> = {
  larva: 0.005, young: 0.025, sardine: 0.1, mackerel: 0.3, tuna: 1, person: 1.8, white: 4.6, whale: 30,
  orca: 7, shark: 2, jack: 0.9, tiger: 2.3, bluefin: 2, copepod: 0.0012, anchovy: 0.018,
};

export interface Placing {
  /** Body centre, world metres. */
  readonly at: Pt;
  readonly facing: 1 | -1;
  readonly tilt?: number;
  readonly jaw?: number;
  readonly alpha?: number;
  /** Length multiplier (a school's spread of sizes). */
  readonly size?: number;
  readonly beat?: number;
}

/** Draws `body` placed in the world through `cam` (skipped when it's too small to see or far too big). */
export function drawBody(ctx: CanvasRenderingContext2D, body: Body, p: Placing, cam: Camera, t: number): void {
  const len = LENGTH[body] * (p.size ?? 1) * scaleOf(cam);
  if (len < 1.5 || len > 1920 * 30 || (p.alpha ?? 1) <= 0) return;
  const s = toScreen(cam, p.at);
  if (s.x < -len || s.x > 1920 + len || s.y < -len || s.y > 1080 + len) return;
  const beat = p.beat ?? t * (body === 'whale' ? 1.2 : 8);
  const tilt = p.tilt ?? 0;
  ctx.save();
  if (p.alpha !== undefined) ctx.globalAlpha *= p.alpha;
  if (body === 'larva') {
    LARVA.draw(ctx, s.x, s.y, len, p.facing === 1 ? -tilt : Math.PI + tilt, t, { flip: p.facing === -1, beat });
  } else if (body === 'person') {
    drawPerson(ctx, s.x, s.y, len, p.facing, t);
  } else if (body === 'tiger') {
    if (tiger) drawTiger(ctx, tiger, { x: s.x, y: s.y, length: len, turn: p.facing, tilt, beat, effort: 0.5, jaw: p.jaw ?? 0, lid: 0 }, boilOf(t));
  } else if (GAME[body]) {
    drawSwimmer(ctx, spriteOf(body), { j: 0, shape: GAME[body]![0], age: 0, x: s.x, y: s.y, length: len, facing: p.facing, tilt, beat, effort: 0.45 }, boilOf(t), { jaw: p.jaw });
  } else {
    const look: Look = { x: s.x, y: s.y, length: len, facing: p.facing, tilt, beat, effort: 0.45, jaw: p.jaw };
    drawAnimal(ctx, FOOD[body]!, look, t, { kick: 0.5 + 0.5 * Math.sin(t * 6) });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the heroes

/** The hero's placing at t, and how visible it is (fading in through its zoom, out through the next one's). */
export function heroPlacing(i: number, t: number): Placing & { readonly alpha: number } {
  const st = STEPS[i]!;
  const next = STEPS[i + 1];
  const fadeIn = i === 0 ? 1 : smooth((t - st.from) / (st.zoom * 0.3));
  // The tuna stays beside you, and the great white beside the whale: to scale.
  const keep = st.kind === 'tuna' || st.kind === 'white';
  const fadeOut = !next ? 1 : keep ? 1 - smooth((t - (STEPS[i + 2]?.from ?? Infinity)) / 1) : 1 - smooth((t - next.from - next.zoom * 0.05) / (next.zoom * 0.3));
  // You grow: a fish step starts at the last hero's length and grows to its own through the zoom.
  const grows = i > 0 && st.kind !== 'whale' && st.kind !== 'person';
  const size = grows ? Math.exp(Math.log(STEPS[i - 1]!.length / st.length) * (1 - zoomOf(i, t))) : 1;
  const bob = { x: 0.04 * st.length * Math.sin(t * 0.37 + i), y: 0.03 * st.length * Math.sin(t * 0.53 + i * 2) };
  if (st.kind === 'whale') return { at: { x: WHALE.x, y: WHALE.y + 0.15 * Math.sin(t * 0.3) }, facing: -1, alpha: 1, beat: t * 1.1 };
  // Stepped aside: the tuna under you, the great white below the whale's head.
  const aside = (st.kind === 'tuna' && t > STEPS[i + 1]!.from) ? smooth((t - STEPS[i + 1]!.from) / 1.6) : (st.kind === 'white' && t > STEPS[i + 1]!.from ? smooth((t - STEPS[i + 1]!.from) / 2) : 0);
  const off = st.kind === 'tuna' ? { x: -0.9, y: 0.75 } : { x: -1.5, y: 2.4 };
  return {
    at: { x: ANCHOR.x + bob.x + off.x * aside, y: ANCHOR.y + bob.y + off.y * aside },
    facing: 1,
    tilt: 0.04 * Math.sin(t * 0.53 + i * 2),
    size,
    alpha: Math.min(fadeIn, fadeOut),
  };
}

/** The whale: the cold open's eye, then hidden until its own step. */
export function whaleAlpha(t: number): number {
  const out = 1 - smooth((t - STEPS[0]!.from - 0.9) / 0.4);
  const back = smooth((t - STEPS[7]!.from) / 1.2);
  return Math.max(out, back);
}

// ---------------------------------------------------------------- the larva cloud

interface Mate {
  readonly dx: number;
  readonly dy: number;
  readonly size: number;
  readonly phase: number;
  readonly facing: 1 | -1;
  /** When it vanishes (Infinity: never). */
  readonly gone: number;
}

const rng = createRng(9011);
/** The cloud, in larva lengths round the anchor; half go one by one through "half of them". */
const CLOUD: readonly Mate[] = Array.from({ length: 48 }, (_, i) => {
  // The first 22 hang in the hero's own shot, further off (smaller), clear of its body; the rest round it.
  const near = i < 22;
  let dx = 0;
  let dy = 0;
  do {
    const a = rng() * Math.PI * 2;
    const r = near ? Math.sqrt(rng()) : 1 + Math.sqrt(rng()) * 3.2;
    dx = Math.cos(a) * r * (near ? 1.55 : 1.6);
    dy = Math.sin(a) * r * (near ? 0.8 : 0.7);
  } while (near && Math.abs(dx) < 0.75 && Math.abs(dy) < 0.32);
  return {
    dx,
    dy,
    size: near ? 0.28 + rng() * 0.25 : 0.6 + rng() * 0.45,
    phase: rng() * 10,
    facing: rng() < 0.75 ? 1 : -1,
    gone: i % 2 === 0 ? T.half + 0.1 + (i / 48) * 2.6 : Infinity,
  };
});

/** The young anchovy that sweeps through "bigger than you": the larvae in its path. */
export const SWEEP = { from: T.bigger - 0.3, to: T.bigger + 2.4 } as const;
const sweepMouth = (t: number): Pt => {
  const u = (t - SWEEP.from) / (SWEEP.to - SWEEP.from);
  return { x: ANCHOR.x + 0.012 - u * 0.03, y: ANCHOR.y - 0.0036 + 0.0004 * Math.sin(u * 3) };
};

/** The larva the jellyfish catches: index 7 of the cloud. */
export const CAUGHT = 7;

export function drawCloud(ctx: CanvasRenderingContext2D, t: number, cam: Camera, caughtAt: (t: number, home: Pt) => Pt | null): void {
  if (t > STEPS[2]!.from + 1) return;
  const L = LENGTH.larva;
  CLOUD.forEach((m, i) => {
    let at: Pt = { x: ANCHOR.x + (m.dx + 0.3 * Math.sin(t * 0.4 + m.phase)) * L, y: ANCHOR.y + (m.dy + 0.2 * Math.cos(t * 0.5 + m.phase)) * L };
    if (i === CAUGHT) {
      const c = caughtAt(t, at);
      if (c === null) return;
      at = c;
    }
    let alpha = 1 - smooth((t - m.gone) / 0.25);
    // Gulped by the sweeping anchovy if its mouth passes close.
    const sweepGone = sweptAt(at);
    if (sweepGone < Infinity) alpha = Math.min(alpha, t < sweepGone ? 1 : 0);
    if (alpha <= 0) return;
    drawBody(ctx, 'larva', { at, facing: m.facing, size: m.size, alpha: alpha * (m.size < 0.6 ? 0.55 : 0.85), beat: t * 9 + m.phase }, cam, t);
  });
}

/** When the sweeping anchovy's mouth gets within reach of `p` (Infinity if never): worked out from its path. */
function sweptAt(p: Pt): number {
  for (let t = SWEEP.from; t < SWEEP.to; t += 0.05) {
    const m = sweepMouth(t);
    if (Math.hypot(m.x - p.x, (m.y - p.y) * 1.4) < 0.0016) return t;
  }
  return Infinity;
}

export function drawSweep(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void {
  if (t < SWEEP.from || t > SWEEP.to) return;
  const m = sweepMouth(t);
  const L = LENGTH.anchovy;
  const fade = clamp01((t - SWEEP.from) / 0.3) * clamp01((SWEEP.to - t) / 0.3);
  drawBody(ctx, 'anchovy', { at: { x: m.x + 0.46 * L, y: m.y }, facing: -1, jaw: 0.8, alpha: 0.75 * fade, beat: t * 10 }, cam, t);
}
