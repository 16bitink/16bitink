import { INK, Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { lerp, ramp, VIDEO } from '../short';
import { type Pt, spline } from '../octopus/geom';
import { drawHall, drawLid, drawTankBack, drawTankFront, NIGHT_LIGHT, type Tank } from './hall';
import { glow, type Light, poly, rgb, wash } from './paint';
import { drawRig, sittingArms } from './rig';
import { NEW_AT, YEAR_AT } from './story';

/** "New Zealand, 2016.": the islands at night with a light at Napier; then the dark hall with one glowing tank. */

type Coast = readonly (readonly [number, number])[];

/** Coastlines, degrees east and south. */
const NORTH: Coast = [
  [172.7, 34.4], [173.05, 34.42], [173.35, 34.95], [174.0, 35.1], [174.35, 35.35], [174.55, 35.85], [174.8, 36.4], [174.75, 36.85], [175.25, 36.95], [175.45, 37.2], [175.55, 36.95],
  [175.4, 36.5], [175.8, 36.7], [175.9, 37.3], [176.3, 37.65], [177.0, 37.9], [177.5, 37.95], [178.0, 37.55], [178.5, 37.7], [178.35, 38.3], [178.0, 38.7], [177.9, 39.2], [177.4, 39.08], [177.0, 39.28], [176.9, 39.5],
  [177.08, 39.66], [176.8, 40.2], [176.3, 40.9], [175.75, 41.4], [175.3, 41.6], [174.9, 41.35], [174.62, 41.3], [175.0, 40.9], [175.2, 40.4], [175.0, 40.05], [174.4, 39.75], [173.85, 39.5], [173.75, 39.25],
  [174.1, 39.0], [174.6, 38.8], [174.72, 38.2], [174.8, 37.8], [174.6, 37.2], [174.4, 36.6], [174.0, 36.1], [173.5, 35.5], [173.1, 35.1],
];
const SOUTH: Coast = [
  [172.7, 40.5], [173.0, 40.8], [173.1, 41.2], [173.5, 41.2], [173.9, 40.9], [174.3, 41.1], [174.25, 41.6], [174.2, 41.9], [173.6, 42.5], [172.8, 43.1], [172.75, 43.5], [173.1, 43.7], [172.9, 43.9], [172.3, 43.85],
  [171.4, 44.3], [171.2, 44.7], [170.9, 45.3], [170.75, 45.9], [170.2, 46.15], [169.7, 46.55], [169.0, 46.7], [168.3, 46.6], [167.6, 46.2], [166.6, 46.1], [166.5, 45.7], [167.0, 45.1], [167.7, 44.5], [168.4, 44.0],
  [169.5, 43.55], [170.5, 43.0], [171.2, 42.4], [171.5, 41.8], [172.1, 41.4], [172.2, 40.85],
];
const STEWART: Coast = [[167.6, 46.85], [168.1, 46.75], [168.2, 47.0], [167.9, 47.25], [167.5, 47.2]];
const ALPS: Coast = [[167.8, 45.2], [168.4, 44.75], [169.0, 44.45], [169.6, 44.15], [170.2, 43.8], [170.8, 43.4], [171.4, 43.05], [171.9, 42.6], [172.3, 42.1]];
const VOLCANOES: Coast = [[174.1, 39.4], [176.4, 38.9], [175.6, 39.35], [175.9, 39.9]];
const PX_PER_DEGREE = 92;
const at = (lon: number, lat: number): Pt => ({ x: 548 + (lon - 172.6) * PX_PER_DEGREE * 0.765, y: 700 + (lat - 40.6) * PX_PER_DEGREE });
const NAPIER = at(176.9, 39.5);

function drawIsland(ctx: CanvasRenderingContext2D, ring: Coast, boil: number, seed: number): void {
  const pts = ring.map(([a, b]) => at(a, b));
  const shape = spline([...pts, pts[0]!], 4);
  // Moonlit shallows round the coast.
  for (let k = 5; k > 0; k--) {
    ctx.strokeStyle = 'rgba(96,190,214,0.055)';
    ctx.lineWidth = k * 13;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
  }
  poly(ctx, shape, wash(ctx, 250, 200, 800, 1200, [[0, '#4f8468'], [0.45, '#2f5f58'], [1, '#1c3f4a']]));
  const pen = new Pen(ctx, seed + (boil % 3) * 977, 1);
  pen.clipped(shape, () => {
    const rng = createRng(seed);
    for (let i = 0; i < 240; i++) {
      const p = { x: 200 + rng() * 700, y: 150 + rng() * 1080 };
      glow(ctx, p.x, p.y, 10 + rng() * 34, 8 + rng() * 22, rng() < 0.5 ? [122, 168, 104] : [12, 40, 46], 0.2);
    }
    pen.hatch(shape, 11, 0.8, 1, { color: '#0a2632', alpha: 0.28 });
  });
  pen.closed(shape, 3.4, INK);
}

/** A ridge of little snow-capped peaks. */
function drawRange(ctx: CanvasRenderingContext2D, ridge: Coast, boil: number): void {
  const pen = new Pen(ctx, 97 + (boil % 3) * 977, 0.8);
  ridge.forEach(([lon, lat], k) => {
    const p = at(lon, lat);
    const h = 32 + 10 * Math.sin(k * 2.3);
    const w = h * 0.8;
    poly(ctx, [{ x: p.x - w, y: p.y }, { x: p.x - w * 0.3, y: p.y - h * 0.75 }, { x: p.x, y: p.y - h }, { x: p.x, y: p.y }], '#e9f3f0');
    poly(ctx, [{ x: p.x, y: p.y }, { x: p.x, y: p.y - h }, { x: p.x + w * 0.4, y: p.y - h * 0.55 }, { x: p.x + w, y: p.y }], '#4b6d80');
    pen.stroke([{ x: p.x - w, y: p.y }, { x: p.x - w * 0.3, y: p.y - h * 0.75 }, { x: p.x, y: p.y - h }, { x: p.x + w * 0.4, y: p.y - h * 0.55 }, { x: p.x + w, y: p.y }], 2, INK, 0.9, false);
  });
}

export function drawMap(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const { width: W, height: H } = VIDEO;
  const u = ramp(t, NEW_AT + 0.2, YEAR_AT + 0.1);
  const z = lerp(1, 1.5, u * u);
  ctx.save();
  ctx.translate(540, lerp(760, 720, u));
  ctx.scale(z, z);
  ctx.translate(-lerp(540, NAPIER.x - 60, u), -lerp(760, NAPIER.y + 60, u));
  ctx.fillStyle = wash(ctx, 0, -200, 0, H + 200, [[0, '#0d2c54'], [0.5, '#0b2547'], [1, '#050f24']]);
  ctx.fillRect(-900, -900, W + 1800, H + 1800);
  glow(ctx, 300, 260, 900, 800, [60, 120, 180], 0.35, 'lighter');
  const pen = new Pen(ctx, 99 + (boil % 3) * 977, 1);
  const rng = createRng(3131);
  for (let i = 0; i < 70; i++) {
    const x = -100 + rng() * 1280;
    const y = -60 + rng() * 1800;
    const w = 14 + rng() * 22;
    pen.hair([{ x: x - w, y: y + 4 }, { x: x - w / 2, y: y - 4 }, { x, y: y + 3 }, { x: x + w / 2, y: y - 4 }, { x: x + w, y: y + 4 }], 1.8, '#7fb4d6', 0.32);
  }
  drawIsland(ctx, SOUTH, boil, 1201);
  drawIsland(ctx, STEWART, boil, 1203);
  drawIsland(ctx, NORTH, boil, 1202);
  drawRange(ctx, ALPS, boil);
  drawRange(ctx, VOLCANOES, boil);
  // The light at Napier, beating.
  const beat = 0.5 + 0.5 * Math.sin((t - NEW_AT) * 9);
  glow(ctx, NAPIER.x, NAPIER.y, 130 + 30 * beat, 130 + 30 * beat, [255, 170, 70], 0.6, 'lighter');
  for (let k = 0; k < 2; k++) {
    const q = ((((t - NEW_AT) * 1.1 + k * 0.5) % 1) + 1) % 1;
    ctx.strokeStyle = `rgba(255,190,96,${0.8 * (1 - q)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(NAPIER.x, NAPIER.y, 16 + 90 * q, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd79a';
  ctx.beginPath();
  ctx.arc(NAPIER.x, NAPIER.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the hall

const HALL_TANK: Tank = { xL: 130, xR: 950, rim: 560, base: 1220, inset: 96, rise: 66, water: 40, frame: 30 };
const IN_TANK: Light = { ...NIGHT_LIGHT, key: [-0.3, -0.8, 0.7], ambient: 0.3, wet: 0.3, tint: [40, 140, 150], tintK: 0.08 };

/** The tank's cabinet and the floor with the tank's glow on it. */
export function drawFloorAndPlinth(ctx: CanvasRenderingContext2D, k: Tank, boil: number, day = 0): void {
  const H = VIDEO.height;
  const floor = k.base + 260;
  ctx.fillStyle = wash(ctx, 0, floor, 0, H, day ? [[0, '#a98f74'], [1, '#6d5a4b']] : [[0, '#0c1c36'], [0.4, '#081428'], [1, '#030812']]);
  ctx.fillRect(-60, floor, VIDEO.width + 120, H - floor + 60);
  if (!day) glow(ctx, (k.xL + k.xR) / 2, floor + 120, 560, 210, [50, 180, 200], 0.3, 'lighter');
  const pen = new Pen(ctx, 103 + (boil % 3) * 977, 1);
  const box: Pt[] = [{ x: k.xL - 26, y: k.base }, { x: k.xR + 26, y: k.base }, { x: k.xR + 14, y: floor + 24 }, { x: k.xL - 14, y: floor + 24 }];
  poly(ctx, box, wash(ctx, 0, k.base, 0, floor + 24, day ? [[0, '#7a8a94'], [0.1, '#56656f'], [1, '#39454e']] : [[0, '#2c4460'], [0.08, '#162a44'], [1, '#0a1428']]));
  for (let x = k.xL + 130; x < k.xR; x += 190) pen.hair([{ x, y: k.base + 30 }, { x, y: floor + 10 }], 2.4, '#030913', 0.6);
  pen.closed(box, 3, INK);
  ctx.fillStyle = rgb(day ? [196, 208, 212] : [90, 140, 170], 0.8);
  ctx.fillRect(k.xL - 26, k.base - 4, k.xR - k.xL + 52, 8);
}

export function drawHallScene(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const u = ramp(t, YEAR_AT - 0.1, YEAR_AT + 1.3);
  const z = lerp(1.0, 1.16, u);
  ctx.save();
  ctx.translate(540, 760);
  ctx.scale(z, z);
  ctx.translate(-540, -760);
  drawHall(ctx, t, { x: 540, y: -120, w: 560, a: 0.75 });
  drawFloorAndPlinth(ctx, HALL_TANK, boil);
  drawTankBack(ctx, HALL_TANK, t, boil, { rocks: true });
  // The lid, not quite shut.
  drawLid(ctx, { x: 960, y: 546 }, { x: 120, y: 500 }, { x: 96, y: -64 }, 26, boil);
  const look = ramp(t, YEAR_AT + 0.25, YEAR_AT + 0.55);
  drawRig(ctx, {
    x: 540, y: 930, size: 116, up: -Math.PI / 2 - 0.12, bend: -0.35, turn: 0.1, gaze: { x: lerp(0, -0.9, look), y: lerp(0.1, -0.9, look) }, lid: lerp(0.45, 0.16, look),
    breathe: 1 + 0.025 * Math.sin(t * 4), arms: sittingArms(t * 2.2, 0.82), seed: 5101,
  }, IN_TANK, boil);
  drawTankFront(ctx, HALL_TANK, t, boil);
  ctx.restore();
}
