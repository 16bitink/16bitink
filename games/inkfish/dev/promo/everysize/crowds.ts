import { createRng } from '../../../src/logic/rng';
import { clamp01, smooth } from '../short';
import { drawDolphin } from './art/dolphin';
import { drawGannetDive } from './art/gannet';
import { drawJelly, tentacleAt } from './art/jelly';
import { drawBody, LENGTH, type Body } from './heroes';
import { ANCHOR, scaleOf, toScreen, WHALE, WHALE_EYE, type Camera, type Pt } from './ladder';
import { T } from './timeline';

/**
 * Everything that swims past the heroes, to scale: the orcas of the cold
 * open, the mauve stinger and the larva it catches, the sardine run (the
 * school balling up, gannets plunging from above, a shark and a jack from
 * below, common dolphins circling), the mackerel school and the bluefin
 * behind it, the orca off Gibraltar, the tiger shark beside you, and the
 * orcas closing on the blue whale. Swallows and gulps only.
 */

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const fadeWin = (t: number, from: number, to: number, s = 0.5): number => clamp01((t - from) / s) * clamp01((to - t) / s);

/** A swimmer crossing from a to b over [from, to], facing the way it goes. */
interface Pass {
  readonly body: Body;
  readonly a: Pt;
  readonly b: Pt;
  readonly from: number;
  readonly to: number;
  readonly alpha?: number;
  readonly jaw?: boolean;
}

function drawPass(ctx: CanvasRenderingContext2D, p: Pass, t: number, cam: Camera): void {
  if (t < p.from || t > p.to) return;
  const u = (t - p.from) / (p.to - p.from);
  const at = lerpPt(p.a, p.b, u);
  const facing: 1 | -1 = p.b.x >= p.a.x ? 1 : -1;
  const tilt = Math.atan2(-(p.b.y - p.a.y), Math.abs(p.b.x - p.a.x)) * 0.6;
  drawBody(ctx, p.body, { at, facing, tilt, alpha: (p.alpha ?? 1) * fadeWin(t, p.from, p.to, 0.4), jaw: p.jaw ? 0.6 + 0.3 * Math.sin(t * 5) : 0 }, cam, t);
}

const mouthOf = (p: Pass, t: number): Pt => {
  const u = (t - p.from) / (p.to - p.from);
  const at = lerpPt(p.a, p.b, u);
  const dir = p.b.x >= p.a.x ? 1 : -1;
  return { x: at.x + dir * 0.46 * LENGTH[p.body], y: at.y };
};

// ---------------------------------------------------------------- the cold open

const OPEN_ORCAS: readonly Pass[] = [
  { body: 'orca', a: { x: WHALE_EYE.x - 5.5, y: WHALE_EYE.y + 3.6 }, b: { x: WHALE_EYE.x + 13, y: WHALE_EYE.y + 3.2 }, from: -0.6, to: T.youreThis + 1.5 },
  { body: 'orca', a: { x: WHALE_EYE.x - 18, y: WHALE_EYE.y + 2.2 }, b: { x: WHALE_EYE.x + 6, y: WHALE_EYE.y + 2.5 }, from: T.orcas - 0.6, to: T.youreThis + 2.5, alpha: 0.85 },
];

// ---------------------------------------------------------------- the jellyfish

/** The jelly's bell (margin centre) and width, world m, and how visible it is. */
export function jellyAt(t: number): { at: Pt; width: number; alpha: number } {
  const arrive = smooth((t - (T.jelly - 0.6)) / 2.2);
  const leave = smooth((t - (T.scientists + 0.2)) / 2.5);
  return {
    at: { x: ANCHOR.x + 0.04 - 0.03 * arrive + 0.02 * leave, y: ANCHOR.y - 0.0095 - 0.012 * leave },
    width: 0.014,
    alpha: fadeWin(t, T.jelly - 0.6, T.scientists + 2.5, 0.5),
  };
}

const CATCH = { from: T.jelly + 1.1, up: T.digest - 0.2 } as const;

/** Where the caught larva is: home, then stuck to a tentacle and drawn up under the bell (gone after). */
export function caughtAt(t: number, home: Pt): Pt | null {
  if (t < CATCH.from) return home;
  const j = jellyAt(t);
  const u = 0.62 - 0.6 * smooth((t - CATCH.from - 0.6) / (CATCH.up - CATCH.from - 0.6));
  const stuck = tentacleAt(j.at.x, j.at.y, j.width, 2, u, t);
  if (t > CATCH.up + 0.3) return null;
  return lerpPt(home, stuck, smooth((t - CATCH.from) / 0.5));
}

function drawJellyScene(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void {
  const j = jellyAt(t);
  if (j.alpha <= 0) return;
  const s = toScreen(cam, j.at);
  drawJelly(ctx, s.x, s.y, j.width * scaleOf(cam), t, j.alpha);
}

// ---------------------------------------------------------------- the sardine run

const SURFACE_Y = -0.95;
const BALL: Pt = { x: 0.05, y: 0.02 };

interface Sardine {
  readonly a: number;
  readonly r: number;
  readonly size: number;
  readonly phase: number;
  eaten: number;
}

const tight = (t: number): number => 1 - 0.45 * smooth((t - T.ball + 0.3) / 1.6);

function sardinePos(s: Sardine, t: number): Pt {
  const k = tight(t);
  const a = s.a + t * (0.5 + 0.6 * (1 - k)) / (0.4 + s.r);
  return { x: BALL.x + Math.cos(a) * s.r * 0.62 * k, y: BALL.y + Math.sin(a) * s.r * 0.26 * k + 0.02 * Math.sin(t * 2 + s.phase) };
}

const GANNETS = [-0.62, 0.18, 0.6].map((x, i) => ({ x, at: T.gannets + 0.15 + i * 0.75, lean: [0.25, -0.15, 0.1][i]! }));

/** A gannet's bill tip at t: the plunge from the sky, the splash at the surface, slowing to the ball. */
function gannetAt(g: (typeof GANNETS)[number], t: number): { tip: Pt; entry: Pt | null; alpha: number } | null {
  const d = t - g.at;
  if (d < -0.6 || d > 1.6) return null;
  const entry = { x: g.x - g.lean * 0.9, y: SURFACE_Y };
  if (d < 0) {
    const u = (d + 0.6) / 0.6;
    return { tip: { x: entry.x - g.lean * (1 - u) * 1.1, y: SURFACE_Y - 1.1 * (1 - u) }, entry: null, alpha: 1 };
  }
  const depth = 0.75 * (1 - Math.exp(-d / 0.28));
  return { tip: { x: entry.x + g.lean * depth, y: SURFACE_Y + depth }, entry, alpha: 1 - smooth((d - 1.1) / 0.5) };
}

const SHARK: Pass = { body: 'shark', a: { x: 1.9, y: 1.4 }, b: { x: -1.6, y: 0.18 }, from: T.sharks - 0.2, to: T.sharks + 4.6, jaw: true };
const JACK: Pass = { body: 'jack', a: { x: -2.1, y: 1.0 }, b: { x: 1.9, y: -0.05 }, from: T.sharks + 0.5, to: T.sharks + 4.4, jaw: true };
const DOLPHIN_FROM = T.dolphins - 0.4;
const RUN_END = T.fc3 + 0.6;

function dolphinAt(i: number, t: number): { at: Pt; facing: 1 | -1; tilt: number; front: boolean } {
  const a = (i / 3) * Math.PI * 2 + (t - DOLPHIN_FROM) * 0.85;
  const r = 1.25 - 0.25 * smooth((t - T.ball) / 2);
  return { at: { x: BALL.x + Math.cos(a) * r, y: BALL.y + 0.1 + Math.sin(a) * r * 0.62 }, facing: -Math.sin(a) >= 0 ? 1 : -1, tilt: Math.cos(a) * 0.25, front: Math.sin(a) > 0 };
}

const runRng = createRng(3141);
const SCHOOL: Sardine[] = Array.from({ length: 76 }, () => ({ a: runRng() * Math.PI * 2, r: 0.18 + Math.sqrt(runRng()) * 0.95, size: 0.8 + runRng() * 0.35, phase: runRng() * 9, eaten: Infinity }));

/** Works out, once, which sardine each mouth gets and when. */
function settleGulps(): void {
  const mouths: ((t: number) => Pt | null)[] = [
    (t) => (t > SHARK.from && t < SHARK.to ? mouthOf(SHARK, t) : null),
    (t) => (t > JACK.from && t < JACK.to ? mouthOf(JACK, t) : null),
    ...GANNETS.map((g) => (t: number) => {
      const p = gannetAt(g, t);
      return p && p.entry && t - g.at > 0.25 && t - g.at < 0.9 ? p.tip : null;
    }),
    ...[0, 1, 2].map((i) => (t: number) => {
      if (t < T.ball || t > RUN_END) return null;
      const d = dolphinAt(i, t);
      return { x: d.at.x + d.facing * 0.46 * 2.2, y: d.at.y };
    }),
  ];
  for (let t = T.gannets - 0.5; t < RUN_END; t += 0.04) {
    for (const m of mouths) {
      const p = m(t);
      if (!p) continue;
      for (const s of SCHOOL) {
        if (s.eaten < t) continue;
        const q = sardinePos(s, t);
        if (Math.hypot(q.x - p.x, q.y - p.y) < 0.075) s.eaten = t;
      }
    }
  }
}
settleGulps();

/** Every gulp in the run, for the soundtrack. */
export const RUN_GULPS: readonly number[] = SCHOOL.map((s) => s.eaten).filter((e) => e < Infinity).sort((a, b) => a - b);
export const GANNET_SPLASHES: readonly number[] = GANNETS.map((g) => g.at);

function drawSurface(ctx: CanvasRenderingContext2D, t: number, cam: Camera, alpha: number): void {
  const y = toScreen(cam, { x: 0, y: SURFACE_Y }).y;
  if (y < -40) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, y);
  g.addColorStop(0, 'rgba(214,232,238,0.95)');
  g.addColorStop(1, 'rgba(190,220,232,0.9)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(1920, 0);
  for (let x = 1920; x >= 0; x -= 24) ctx.lineTo(x, y + 6 * Math.sin(x * 0.012 + t * 2));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawRun(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void {
  const on = fadeWin(t, T.sardine - 1.5, RUN_END + 1, 0.8);
  if (on <= 0) return;
  drawSurface(ctx, t, cam, fadeWin(t, T.who - 0.5, RUN_END, 0.6));
  const dolphins = t > DOLPHIN_FROM && t < RUN_END + 0.6 ? [0, 1, 2].map((i) => dolphinAt(i, t)) : [];
  const dAlpha = fadeWin(t, DOLPHIN_FROM, RUN_END + 0.6, 0.6);
  for (const d of dolphins) if (!d.front) drawDolphinW(ctx, d, t, cam, dAlpha);
  drawPass(ctx, SHARK, t, cam);
  for (const s of SCHOOL) {
    if (t >= s.eaten) continue;
    const p = sardinePos(s, t);
    const dir = Math.sin(s.a + t * 0.5 / (0.4 + s.r)) > 0 ? -1 : 1;
    drawBody(ctx, 'sardine', { at: p, facing: dir as 1 | -1, size: s.size, alpha: on, beat: t * 11 + s.phase }, cam, t);
  }
  drawPass(ctx, JACK, t, cam);
  for (const d of dolphins) if (d.front) drawDolphinW(ctx, d, t, cam, dAlpha);
  for (const g of GANNETS) {
    const p = gannetAt(g, t);
    if (!p) continue;
    const tip = toScreen(cam, p.tip);
    const entry = p.entry ? toScreen(cam, p.entry) : null;
    const angle = Math.atan2(1, g.lean);
    drawGannetDive(ctx, tip.x, tip.y, 0.9 * scaleOf(cam), angle, t, entry, p.alpha);
  }
}

function drawDolphinW(ctx: CanvasRenderingContext2D, d: ReturnType<typeof dolphinAt>, t: number, cam: Camera, alpha: number): void {
  const s = toScreen(cam, d.at);
  drawDolphin(ctx, s.x, s.y, 2.2 * scaleOf(cam), d.tilt * d.facing, t, d.facing, alpha);
}

// ---------------------------------------------------------------- mackerel, tuna, you, the whale

const PASSES: readonly Pass[] = [
  { body: 'bluefin', a: { x: 2.6, y: -0.45 }, b: { x: -2.8, y: -0.3 }, from: T.bluefin - 0.4, to: T.bluefin + 6.5, alpha: 0.9 },
  { body: 'orca', a: { x: -10, y: -2.4 }, b: { x: 10, y: -1.9 }, from: T.orcasHunt - 0.6, to: T.orcasHunt + 6.5, alpha: 0.95 },
  { body: 'tiger', a: { x: 4.5, y: -1.25 }, b: { x: -4.5, y: -1.45 }, from: T.tiger - 0.4, to: T.y2025 + 1.2 },
];

const mates = (n: number, seed: number, rx: number, ry: number) => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => ({ dx: (r() * 2 - 1) * rx, dy: (r() * 2 - 1) * ry, size: 0.8 + r() * 0.3, phase: r() * 9 }));
};
const MACKEREL_MATES = mates(7, 77, 1.1, 0.5);
const TUNA_MATES = mates(4, 88, 3.4, 1.4);

function drawMates(ctx: CanvasRenderingContext2D, body: Body, list: ReturnType<typeof mates>, t: number, cam: Camera, alpha: number): void {
  if (alpha <= 0) return;
  for (const m of list) {
    const at = { x: ANCHOR.x + m.dx + 0.05 * Math.sin(t * 0.4 + m.phase), y: ANCHOR.y + m.dy + 0.04 * Math.sin(t * 0.6 + m.phase) };
    if (Math.abs(m.dx) < 1.1 * LENGTH[body] && Math.abs(m.dy) < 0.45 * LENGTH[body]) continue;
    drawBody(ctx, body, { at, facing: 1, size: m.size, alpha: alpha * 0.9, beat: t * 9 + m.phase }, cam, t);
  }
}

/** The orcas closing on the blue whale ("Almost."), before the cut to the hunt. */
function drawWhaleOrcas(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void {
  const a = fadeWin(t, T.almost2 - 0.3, T.march + 0.8, 0.5);
  if (a <= 0) return;
  [[-9, 1.6], [-7, -5.2], [-12, -1.2], [-5.5, 3.4], [-13, -4]].forEach(([dx, dy], i) => {
    const u = smooth((t - T.almost2 + 0.3 + i * 0.2) / 3);
    const at = { x: WHALE.x - 15 + dx! * (1 - 0.35 * u) - 6 * (1 - u), y: WHALE.y + dy! };
    drawBody(ctx, 'orca', { at, facing: 1, alpha: a, beat: t * 6 + i }, cam, t);
  });
}

/** Everything behind the hero (drawn before it). */
export function drawCrowdsBehind(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void {
  for (const p of OPEN_ORCAS) if (p.alpha) drawPass(ctx, p, t, cam);
  for (const p of PASSES) drawPass(ctx, p, t, cam);
  drawMates(ctx, 'mackerel', MACKEREL_MATES, t, cam, fadeWin(t, T.foot + 0.5, T.threeFeet + 1.5, 0.8));
  drawMates(ctx, 'tuna', TUNA_MATES, t, cam, fadeWin(t, T.threeFeet + 0.5, T.sixFeet + 1.5, 0.8));
  drawRun(ctx, t, cam);
  drawWhaleOrcas(ctx, t, cam);
}

/** Everything in front of the hero. */
export function drawCrowdsFront(ctx: CanvasRenderingContext2D, t: number, cam: Camera): void {
  drawJellyScene(ctx, t, cam);
  for (const p of OPEN_ORCAS) if (!p.alpha) drawPass(ctx, p, t, cam);
}

/** The tiger shark's screen spot (for its size label), or null when it's not passing. */
export function tigerOnScreen(t: number, cam: Camera): Pt | null {
  const p = PASSES[2]!;
  if (t < p.from + 0.5 || t > p.to - 0.5) return null;
  return toScreen(cam, lerpPt(p.a, p.b, (t - p.from) / (p.to - p.from)));
}
