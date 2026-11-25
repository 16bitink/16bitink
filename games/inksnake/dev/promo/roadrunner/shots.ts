import { withScratch } from '../../../src/art/pen';
import { ramp, VIDEO } from '../short';
import { type BirdPose, birdBehind, birdFront, gripOf, HELD, heldSpine } from './bird';
import { drawLand, drawSky, type Land } from './desert';
import { dustRing, impact, measure, vignette, wash } from './fx';
import { curve, pt, type Pt, soft } from './paint';
import { COILED, footAt, speedOf, STAND, STRUT } from './poses';
import { drawSnake } from './snake';
import {
  AND_AT, CUT, dayAt, digestAt, grabDir, grabPose, hookClock, hookPose, longPose, SLAM_1, SLAM_2, STEP_S, STRIKE_AT, strutPhase, SWALLOW_AT, wrap,
} from './story';

/** The bird with its snake: what lies behind it, the snake, what lies over it. */
function holding(ctx: CanvasRenderingContext2D, p: BirdPose, spine: readonly Pt[] | null, boil: number, o: { shake?: number; from?: number } = {}): void {
  birdBehind(ctx, p, boil);
  if (spine) drawSnake(ctx, spine, { width: HELD.width * p.scale, shake: o.shake, from: o.from }, boil);
  birdFront(ctx, p, boil);
}

/** Hanging: straight down with a swing growing along it, the tail curling up at the end. */
const hang = (swing: number, curl: number, t: number) => (s: number): number => Math.PI / 2 + swing * (0.4 + s) + 0.1 * Math.sin(s * 5 - t * 4) * s + Math.max(0, s - 0.6) * curl;

/** Where the light falls on the ground under the feet. */
function shade(ctx: CanvasRenderingContext2D, p: BirdPose, ground: number, k = 1): void {
  const x = p.at.x + 60 * p.scale;
  soft(ctx, x, ground + 10 * p.scale, 520 * p.scale * k, 70 * p.scale, 0, '#4a2413', 0.5);
}

function camera(ctx: CanvasRenderingContext2D, zoom: number, focus: Pt, shake = 0): void {
  ctx.translate(focus.x + shake * 12, focus.y - shake * 16);
  ctx.scale(zoom, zoom);
  ctx.translate(-focus.x, -focus.y);
}

// ---------------------------------------------------------------- the hook

export const HOOK_PLACE = { at: pt(-262, 1622), scale: 1.12, head: pt(560, -650) } as const;

export function hookBird(t: number): BirdPose {
  const h = hookPose(t);
  return {
    at: HOOK_PLACE.at, scale: HOOK_PLACE.scale, tilt: -0.12, tail: 0.12, wing: 0,
    head: { at: HOOK_PLACE.head, ang: 0.02 + h.swing * 0.12 - 0.05 * h.gulp, look: { crest: h.crest, gape: 0.125, lid: h.lid, gaze: 0.4 } },
    near: STAND.near, far: STAND.far, gulp: h.bulge >= 0 ? { u: h.bulge, size: 34 } : undefined,
  };
}

/** The hook's sky and far land: calm and warm behind the head. */
export function hookBack(ctx: CanvasRenderingContext2D, land: Land): void {
  drawSky(ctx, 1480, 0, pt(700, 700), 62);
  drawLand(ctx, land, 1480, 0, { mid: 0, offset: 620 });
}

export function hookFigure(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const h = hookPose(t);
  const p = hookBird(t);
  const u = hookClock(t);
  holding(ctx, p, heldSpine(p, hang(h.swing, 4.6 + 0.5 * Math.sin(u * 4.2), u), HELD.out * (1 - h.gulp)), boil, { shake: h.shake, from: h.gulp * 0.7 });
}

export function drawHook(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const h = hookPose(t);
  ctx.save();
  camera(ctx, h.zoom, pt(600, 1000));
  hookBack(ctx, land);
  hookFigure(ctx, t, boil);
  ctx.restore();
  light(ctx);
}

/** The short's warm light, the same over the hook and the race so the push between them doesn't blink. */
export function light(ctx: CanvasRenderingContext2D): void {
  wash(ctx, '#ffb060', 0.16);
  vignette(ctx, 0.34);
}

// ---------------------------------------------------------------- the grab and the slam

const GROUND = 1440;
const GRAB = { at: pt(180, GROUND - 400), scale: 0.5 } as const;
const COIL_AT = pt(662, GROUND - 92);
const COIL_SPINE: readonly Pt[] = (() => {
  const line = curve(COILED.map((k) => pt(COIL_AT.x + k.x * 0.86, COIL_AT.y + k.y * 0.86)), 4);
  return Array.from({ length: 75 }, (_, i) => line[Math.round((i / 74) * (line.length - 1))]!);
})();

export function drawGrab(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const u = wrap(t);
  const g = grabPose(t);
  const p: BirdPose = {
    at: GRAB.at, scale: GRAB.scale, tilt: g.tilt, tail: 0.1 + g.tilt * 1.2, wing: ramp(u, STRIKE_AT - 0.14, STRIKE_AT) * 0.3 + 0.5 * ramp(u, SLAM_1 - 0.3, SLAM_1 - 0.1) * (1 - ramp(u, SLAM_2 + 0.2, SLAM_2 + 0.5)),
    head: { at: pt(g.x, g.y), ang: g.ang, look: { crest: 1, gape: 0.125 + 0.16 * ramp(u, STRIKE_AT - 0.16, STRIKE_AT - 0.06) * (1 - g.held), lid: 0, gaze: 0.6 } },
    near: STAND.near, far: STAND.far,
  };
  ctx.save();
  camera(ctx, g.zoom, pt(620, 1120), g.impact * Math.sin(u * 60));
  drawSky(ctx, 1010, 0.02, pt(880, 640), 62);
  drawLand(ctx, land, 1010, 1180);
  shade(ctx, p, GROUND, 1);
  const hit = pt(850, GROUND - 14);
  if (g.held < 0.5) {
    soft(ctx, COIL_AT.x + 90, GROUND + 12, 330, 46, 0, '#4a2413', 0.5);
    const breathe = Math.sin(u * 9) * 5;
    const coil = COIL_SPINE.map((q, i) => pt(q.x + (i < 20 ? breathe * (1 - i / 20) : 0), q.y));
    drawSnake(ctx, coil, { width: 64, head: { gape: 0.1 + 0.3 * ramp(u, STRIKE_AT - 0.3, STRIKE_AT - 0.05) }, shake: 0.36 * Math.sin(u * 62) }, boil);
    birdBehind(ctx, p, boil);
    birdFront(ctx, p, boil);
  } else {
    const settle = ramp(u, STRIKE_AT, STRIKE_AT + 0.3);
    const spine = heldSpine(p, (s) => grabDir(u - (u < AND_AT ? 0.2 : 0.11) * s) + g.thrash * 0.85 * Math.sin(s * 7 - u * 17) * Math.min(1, s * 2.4) + Math.max(0, s - 0.6) * 1.6 * (u > SLAM_2 ? 0.4 : 1), HELD.out, GROUND - 22);
    // Out of the coil into the air: the spine runs from one to the other.
    const mixed = spine.map((q, i) => {
      const c = COIL_SPINE[Math.round((i / (spine.length - 1)) * (COIL_SPINE.length - 1))]!;
      const k = i < 19 ? 1 : settle;
      return pt(c.x + (q.x - c.x) * k, c.y + (q.y - c.y) * k);
    });
    holding(ctx, p, mixed, boil, { shake: u < SLAM_1 ? 0.36 * Math.sin(u * 62) : 0 });
  }
  dustRing(ctx, hit, g.dust, u < (SLAM_1 + SLAM_2) / 2 ? 250 : 210, 61);
  impact(ctx, pt(hit.x - 20, hit.y - 14), g.impact, 150);
  ctx.restore();
  wash(ctx, '#ff9a4a', 0.2);
  vignette(ctx, 0.4);
}

// ---------------------------------------------------------------- too long to swallow

const LONG = { at: pt(120, 1290), scale: 0.68 } as const;

export function drawLong(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const u = wrap(t);
  const l = longPose(t);
  const p: BirdPose = {
    at: LONG.at, scale: LONG.scale, tilt: -0.16, tail: 0.02, wing: 0,
    head: { at: pt(600, -640 + 26 * l.ang * 2), ang: l.ang, look: { crest: l.crest, gape: 0.125, lid: l.lid, gaze: 0.7 } },
    near: STAND.near, far: STAND.far, gulp: l.bulge >= 0 ? { u: l.bulge, size: 38 } : undefined,
  };
  const ground = LONG.at.y + 800 * LONG.scale;
  ctx.save();
  camera(ctx, l.zoom, pt(560, 1100));
  drawSky(ctx, 1180, 0.74, pt(180, 640), 56);
  drawLand(ctx, land, 1180, 700, { mid: 1.2 });
  shade(ctx, p, ground);
  const out = HELD.out * (1.05 - l.gulp);
  const spine = heldSpine(p, hang(0.06 * Math.sin(u * 3.4), 2.6, u), out, ground - 24);
  holding(ctx, p, spine, boil, { from: Math.max(0, l.gulp * 0.7), shake: 0.2 * Math.sin(u * 62) * ramp(u, SWALLOW_AT, SWALLOW_AT + 0.1) * (1 - ramp(u, SWALLOW_AT + 0.4, SWALLOW_AT + 0.5)) });
  const g = gripOf(p).at;
  measure(ctx, pt(g.x + 190, g.y + 20), pt(g.x + 190, g.y + HELD.out * p.scale * 0.86), l.measure);
  ctx.restore();
  wash(ctx, '#ffc9a0', 0.14);
  vignette(ctx, 0.3);
}

// ---------------------------------------------------------------- the strut

const WALK = { x: 490, ground: 1480, scale: 0.44 } as const;

export function drawStrut(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const u = wrap(t);
  const ph = strutPhase(t);
  const step = Math.sin(ph * Math.PI * 4);
  const bob = Math.abs(Math.sin(ph * Math.PI * 2));
  const p: BirdPose = {
    at: pt(WALK.x + 8 * step, WALK.ground - STRUT.ground * WALK.scale + 16 * bob), scale: WALK.scale, tilt: -0.22 + 0.04 * step, tail: 1.52 + 0.1 * Math.sin(ph * Math.PI * 2 + 0.6), wing: 0.08,
    head: { at: pt(540 + 46 * step, -700 - 22 * bob), ang: -0.06 + 0.06 * step, look: { crest: 0.8 + 0.2 * bob, gape: 0.125, lid: 0.34, gaze: 0.5 } },
    near: footAt(STRUT, ph), far: footAt(STRUT, ph + 0.5),
  };
  const scroll = (u - CUT.strut) * speedOf(STRUT, STEP_S) * WALK.scale;
  ctx.save();
  drawSky(ctx, 1080, 0.5, pt(860, 640), 60);
  drawLand(ctx, land, 1080, 420 + scroll, { mid: 1.15 });
  shade(ctx, { ...p, at: pt(WALK.x, 0) }, WALK.ground, 1 - 0.1 * bob);
  const swing = 0.42 * Math.sin(ph * Math.PI * 2 - 0.5);
  holding(ctx, p, heldSpine(p, hang(swing, 3 + 2 * Math.cos(ph * Math.PI * 2), u), HELD.out), boil);
  ctx.restore();
  wash(ctx, '#ffd080', 0.2);
  vignette(ctx, 0.32);
}

// ---------------------------------------------------------------- the hour

const STILL = { x: 400, ground: 1470, scale: 0.56 } as const;

export function drawHour(ctx: CanvasRenderingContext2D, land: Land, t: number, boil: number): void {
  const u = wrap(t);
  const day = dayAt(t);
  const gone = digestAt(t);
  const a = Math.PI * (1.04 - 1.08 * day);
  const sun = pt(540 + Math.cos(a) * 470, 1130 - Math.sin(a) * 560);
  const p: BirdPose = {
    at: pt(STILL.x, STILL.ground - 800 * STILL.scale), scale: STILL.scale, tilt: -0.16, tail: 0.3 + 1.3 * ramp(day, 0.1, 0.4) - 1.3 * ramp(day, 0.68, 0.95), wing: 0,
    head: { at: pt(570, -650), ang: 0.02, look: { crest: 0.55, gape: 0.125, lid: 0.4 + 0.5 * Math.max(0, Math.sin(u * 7) - 0.75) * 4 * 0.5, gaze: 0.2 } },
    near: STAND.near, far: STAND.far,
  };
  drawSky(ctx, 1080, 0.02 + day * 0.98, sun, 70);
  // Clouds racing by.
  for (let i = 0; i < 4; i++) {
    const x = ((i * 430 + day * 1500) % (VIDEO.width + 600)) - 300;
    soft(ctx, x, 520 + i * 96, 240, 34, 0, '#fffaf0', 0.55);
    soft(ctx, x + 90, 540 + i * 96, 180, 26, 0, '#fff2dc', 0.5);
  }
  drawLand(ctx, land, 1080, 1500, { mid: 1.1 });
  const spine = heldSpine(p, hang(0.05 * Math.sin(u * 2.2), 2.6, u * 0.6), HELD.out * (1 - gone), STILL.ground - 20);
  castShadow(ctx, p, spine, gone, -Math.cos(a) * 1.5, 0.2 + 0.36 * Math.abs(Math.cos(a)));
  holding(ctx, p, spine, boil, { from: gone * 0.7 });
  wash(ctx, day < 0.5 ? '#ffc080' : '#ff7a3a', 0.12 + 0.4 * Math.abs(day - 0.5), 'soft-light');
  wash(ctx, '#5a3060', 0.26 * Math.max(0, day - 0.7) * 3.3, 'multiply');
  vignette(ctx, 0.34);
}

/** The bird's own shadow, flattened on the sand about its feet: `lean` sideways, `long` its length. */
function castShadow(ctx: CanvasRenderingContext2D, p: BirdPose, spine: readonly Pt[], from: number, lean: number, long: number): void {
  withScratch(VIDEO.width, VIDEO.height, (s, canvas) => {
    holding(s, p, spine, 0, { from });
    s.globalCompositeOperation = 'source-in';
    s.globalAlpha = 1;
    s.fillStyle = '#4a2030';
    s.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.globalAlpha = 0.46;
    ctx.translate(0, STILL.ground);
    ctx.transform(1, 0, -lean * long * -1, -long, 0, 0);
    ctx.translate(0, -STILL.ground);
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
}
