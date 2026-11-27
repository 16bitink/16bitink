import { clamp01, drawGameFish, drawGameWeed, drawSea, lerp, smooth, type FishShape, type Rect } from '../devstory/screen';
import {
  ALIVE_AT, BIG_CYCLE_TE0, CYCLE_S, CYCLE_TE0, MOUTHFUL_AT, PERCH_TE, SHARK_AT, SHARK_TE, SWALLOW_AT, TINY_AT,
} from './story';

/**
 * The game's sea inside a screen rect. Sizes are in "CRT px" (the CRT screen is 740 wide) and scale with the rect,
 * so the same scene fits the CRT, the laptop and everything in between. All pure functions of t.
 */
const CRT_W = 740;
const TAU = Math.PI * 2;
const ease = (u: number): number => smooth(clamp01(u));

interface Fish { readonly shape: FishShape; readonly len: number; readonly heavy?: boolean }
const INKLING: Fish = { shape: 'inkling', len: 80 };
const PERCH: Fish = { shape: 'perch', len: 190 };
const SHARK: Fish = { shape: 'shark', len: 520, heavy: true };

interface Place { readonly x: number; readonly y: number; readonly facing: 1 | -1 }

/** Jaw opening around the moment `te` the prey is taken: 0..1, peaking at te. */
export const jawAt = (t: number, te: number): number => Math.max(0, 1 - Math.abs(t - te) / 0.4);

function fish(ctx: CanvasRenderingContext2D, f: Fish, k: number, p: Place, t: number, extra: { jaw?: number; len?: number; tilt?: number; lump?: { size: number; at: number } } = {}): void {
  drawGameFish(ctx, {
    shape: f.shape, x: p.x, y: p.y, length: (extra.len ?? f.len) * k, facing: p.facing, tilt: extra.tilt ?? 0,
    variant: f.heavy ? 'heavy' : 'light', beat: TAU * 2 * (t / CYCLE_S), effort: 0.6,
    look: { jaw: extra.jaw ?? 0, lump: extra.lump },
  }, t);
}

/** A fish's mouth (facing right, centred at p). */
const mouthOf = (f: Fish, k: number, p: Place, len = f.len): { x: number; y: number } => ({ x: p.x + p.facing * 0.47 * len * k, y: p.y + 0.02 * len * k });

function backdrop(ctx: CanvasRenderingContext2D, r: Rect, weeds = true): void {
  drawSea(ctx, r, 0, { surfaceY: r.y + r.h * 0.1, depth: 0.5 });
  if (!weeds) return;
  const k = r.w / CRT_W;
  drawGameWeed(ctx, 0, r.x + r.w * 0.08, r.y + r.h + 8, 150 * k, 0);
  drawGameWeed(ctx, 1, r.x + r.w * 0.9, r.y + r.h + 8, 190 * k, 0);
}

/** Prey swimming in towards `mouth` (arriving at te) and being taken: shrinks into the mouth. Drawn before the predator. */
function prey(ctx: CanvasRenderingContext2D, f: Fish, k: number, t: number, te: number, from: { x: number; y: number }, mouth: { x: number; y: number }): void {
  if (t < te - 1 || t > te + 0.3) return;
  const arrive = ease((t - (te - 1)) / 1);
  const s = 1 - ease((t - te) / 0.3);
  const p = { x: lerp(from.x, mouth.x, arrive), y: lerp(from.y, mouth.y, arrive) + Math.sin(t * 9) * 4 * (1 - arrive), facing: -1 as const };
  fish(ctx, f, k, p, t, { len: f.len * s });
}

/** A predator that gulps a fresh prey every CYCLE_S (events at te0 + n * CYCLE_S), swimming in place. */
function cycle(ctx: CanvasRenderingContext2D, r: Rect, t: number, pred: Fish, food: Fish, at: { fx: number; fy: number }, te0: number): void {
  const k = r.w / CRT_W;
  const n = Math.round((t - te0) / CYCLE_S);
  const bob = Math.sin(TAU * (t / CYCLE_S));
  const p: Place = { x: r.x + r.w * at.fx + bob * 6 * k, y: r.y + r.h * at.fy + Math.cos(TAU * (t / CYCLE_S)) * 7 * k, facing: 1 };
  const m = mouthOf(pred, k, p);
  let jaw = 0;
  for (const e of [n - 1, n, n + 1]) {
    const te = te0 + e * CYCLE_S;
    jaw = Math.max(jaw, jawAt(t, te));
    prey(ctx, food, k, t, te, { x: r.x + r.w + 60 * k, y: m.y - 50 * k }, m);
  }
  fish(ctx, pred, k, p, t, { jaw, tilt: bob * 0.04 });
}

/** A predator that sweeps in from the left and takes a fish that holds still (bobbing) at `at`. */
function pursuit(ctx: CanvasRenderingContext2D, r: Rect, t: number, pred: Fish, food: Fish, at: { fx: number; fy: number }, t0: number, te: number, afterX?: (t: number) => number): void {
  const k = r.w / CRT_W;
  const target: Place = { x: r.x + r.w * at.fx, y: r.y + r.h * at.fy + Math.sin(t * 5) * 4 * k, facing: 1 };
  const contactX = target.x - 0.47 * pred.len * k;
  const startX = r.x - pred.len * k * 0.6;
  const px = t < te ? lerp(startX, contactX, ease((t - t0) / (te - t0 - 0.05))) : afterX ? r.x + r.w * afterX(t) : contactX;
  const p: Place = { x: px, y: target.y + 2 * k, facing: 1 };
  if (t < te + 0.3) {
    const s = t < te ? 1 : 1 - ease((t - te) / 0.3);
    const m = mouthOf(pred, k, p);
    const at2 = t < te ? target : { x: lerp(target.x, m.x, ease((t - te) / 0.3)), y: lerp(target.y, m.y, ease((t - te) / 0.3)), facing: 1 as const };
    fish(ctx, food, k, at2, t, { len: food.len * s });
  }
  fish(ctx, pred, k, p, t, { jaw: jawAt(t, te) });
}

/** The CRT's sea (and the first 12 s of the loop): perch gulping, then tiny -> small -> BIG, then the big fish gulping. */
export function crtSea(ctx: CanvasRenderingContext2D, r: Rect, t: number): void {
  backdrop(ctx, r);
  const k = r.w / CRT_W;
  if (t < TINY_AT) return cycle(ctx, r, t, { ...PERCH, len: 260 }, { ...INKLING, len: 90 }, { fx: 0.4, fy: 0.55 }, CYCLE_TE0);
  if (t < MOUTHFUL_AT) {
    const pop = ease((t - TINY_AT) / 0.25);
    return fish(ctx, { ...INKLING, len: 80 * pop }, k, { x: r.x + r.w * 0.62, y: r.y + r.h * 0.5 + Math.sin(t * 5) * 4 * k, facing: 1 }, t);
  }
  if (t < SHARK_AT) return pursuit(ctx, r, t, PERCH, INKLING, { fx: 0.62, fy: 0.5 }, MOUTHFUL_AT, PERCH_TE, () => 0.5);
  if (t < SHARK_TE + 0.4) {
    // the perch (now where it ended up) is the one taken
    const solo = pursuit.bind(null, ctx, r, t, SHARK, PERCH, { fx: 0.497, fy: 0.5 }, SHARK_AT, SHARK_TE);
    return solo((tt: number) => lerp(0.168, 0.4, ease((tt - SHARK_TE - 0.4) / 0.5)));
  }
  const x = lerp(0.168, 0.4, ease((t - SHARK_TE - 0.4) / 0.5));
  return cycle(ctx, r, t, SHARK, INKLING, { fx: x, fy: 0.5 }, BIG_CYCLE_TE0);
}

/** The sea the loop starts and ends on (perch gulping a tiny fish), for the way back to the CRT. */
export function introSea(ctx: CanvasRenderingContext2D, r: Rect, t: number): void {
  backdrop(ctx, r);
  cycle(ctx, r, t, { ...PERCH, len: 260 }, { ...INKLING, len: 90 }, { fx: 0.4, fy: 0.55 }, CYCLE_TE0);
}

/** The new game on the laptop: the fish the pen inked comes alive, swallows a big fish that fills the frame, then swells to fill it too. */
export function swallowSea(ctx: CanvasRenderingContext2D, r: Rect, t: number): void {
  backdrop(ctx, r);
  const k = r.w / CRT_W;
  const alive = ease((t - ALIVE_AT) / 0.3);
  const lunge = ease((t - (SWALLOW_AT - 0.6)) / 0.6);
  const hero: Place = { x: r.x + r.w * lerp(0.3, 0.4, lunge) + Math.sin(t * 6) * 4 * k, y: r.y + r.h * 0.6, facing: 1 };
  const grow = ease((t - (SWALLOW_AT + 0.35)) / 0.75);
  const len = lerp(190, 560, grow);
  const m = mouthOf(INKLING, k, hero, len);
  const sharkLen = 800;
  const tx = r.x + r.w * 1.02;
  const enter = ease((t - (ALIVE_AT + 0.15)) / 0.75);
  const sharkAt: Place = { x: lerp(r.x + r.w + sharkLen * k, tx - 0.1 * r.w * ease((t - 17) / 0.4), enter), y: r.y + r.h * 0.5, facing: -1 };
  if (t < SWALLOW_AT + 0.45) {
    const u = ease((t - SWALLOW_AT) / 0.45);
    const s = 1 - u;
    const pos: Place = { x: lerp(sharkAt.x, m.x + 0.47 * sharkLen * k * s, u), y: lerp(sharkAt.y, m.y, u), facing: -1 };
    fish(ctx, { ...SHARK }, k, pos, t, { len: sharkLen * s });
  }
  const swell = t > SWALLOW_AT + 0.35 ? { size: 1 - grow * 0.8, at: 0.45 } : undefined;
  const jaw = Math.max(jawAt(t, SWALLOW_AT + 0.15), t < SWALLOW_AT - 0.5 && t > ALIVE_AT ? 0.25 : 0);
  fish(ctx, INKLING, k, hero, t, { len: len * alive, jaw: jaw, lump: swell });
}
