import { createRng } from '../../../src/logic/rng';
import { closed, cub, type Draw, oval, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { type Pt, withScratch } from '../../../src/art/pen';
import { CORN } from '../../../src/art/snakes/corn';
import { glaze, periodicLine } from '../../../src/art/snakes/cornPaint';
import { SNAKE_W, stripLength, type SnakeArt, type SpriteArt } from '../../../src/art/types';
import { rgba } from '../../../src/art/wash';

/**
 * The puff adder (Bitis arietans), painted for the promo: a thick, heavy,
 * short viper. Its back seen from a little above, as it lies on the sand:
 * a yellow-tan to brown ground with bold blackish-brown chevrons, each V
 * pointing back towards the tail and edged with pale yellow, the flanks a
 * darker brown with pale-edged dark bars between them; rough keeled scales,
 * lit from the upper left. The strip is laid along a body (sprites.ts
 * drawBody), the head first, so strip x runs from the head back.
 *
 * Heads, facing +x, for a neck SNAKE_W wide meeting the body at x = 0:
 * 'top' (seen from above: the broad flat triangular head, much wider than
 * the neck, the dark band across the snout and the dark crown triangle each
 * edged pale, the eyes at the sides with slit pupils, the upturned nostrils)
 * and 'strike' (side on, the jaws gaping, the long fangs swung forward).
 */
export const ADDER = {
  ground: '#b88c4a', groundLit: '#d6b06a', groundDeep: '#8a6534', flank: '#7a5530', flankDeep: '#4e3420',
  chevron: '#2a1a10', chevronSoft: '#3e2816', pale: '#f0dc98', paleLit: '#fbefc2', line: '#1a110a',
  belly: '#efe3bf', mouth: '#efb7b0', mouthDeep: '#a85a58', throat: '#5a2228', fang: '#fbf6e8',
  iris: '#b08a3c', irisLit: '#dcbb6a', irisDeep: '#3a2a10', pupil: '#080604', tongue: '#1c1418',
} as const;

/** One period of the strip: two chevrons. */
export const ADDER_PERIOD = 52;
const STEP = ADDER_PERIOD / 2;
const MID = SNAKE_W / 2;

/** Copies at −period, 0, +period so the tile wraps seamlessly. */
const WRAPS = [-ADDER_PERIOD, 0, ADDER_PERIOD] as const;

/** Chevron k's centreline: the apex on the midline pointing back (+x), the arms forward to the flanks. */
function chevron(x: number, reach = 11.5, spread = 10.4): Pt[] {
  return [pt(x - reach, MID - spread), pt(x - reach * 0.42, MID - spread * 0.5), pt(x, MID), pt(x - reach * 0.42, MID + spread * 0.5), pt(x - reach, MID + spread)];
}

function polyline(ctx: CanvasRenderingContext2D, pts: readonly Pt[], w: number, colour: string, join: CanvasLineJoin = 'miter'): void {
  ctx.lineWidth = w;
  ctx.strokeStyle = colour;
  ctx.lineJoin = join;
  ctx.miterLimit = 3;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

/** The ground: tan down the back, browner to the flanks; the dark lateral bars between the chevrons at both edges. */
function paintGround(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, ADDER.flankDeep);
  g.addColorStop(0.16, ADDER.flank);
  g.addColorStop(0.34, ADDER.ground);
  g.addColorStop(0.5, ADDER.groundLit);
  g.addColorStop(0.66, ADDER.ground);
  g.addColorStop(0.84, ADDER.flank);
  g.addColorStop(1, ADDER.flankDeep);
  ctx.fillStyle = g;
  ctx.fillRect(-1, 0, ADDER_PERIOD + 2, SNAKE_W);
  for (const w of WRAPS) {
    for (let k = 0; k < 2; k++) {
      const x = w + k * STEP + STEP * 0.5 + 2;
      for (const [y0, y1] of [[0, 4.6], [SNAKE_W, SNAKE_W - 4.6]] as const) {
        const bar = [pt(x - 4.4, y0), pt(x + 3.6, y0), pt(x + 2.4, y1), pt(x - 3.2, y1)];
        ctx.fillStyle = rgba(ADDER.pale, 0.75);
        ctx.beginPath();
        bar.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x - 1, p.y) : ctx.lineTo(p.x + (i === 1 || i === 2 ? 1 : -1), p.y)));
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba(ADDER.chevron, 0.85);
        ctx.beginPath();
        bar.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

/** The chevrons: a broad pale edge, the blackish V over it, a softer brown core so each reads painted, not ruled. */
function paintChevrons(ctx: CanvasRenderingContext2D): void {
  for (const w of WRAPS) {
    for (let k = 0; k < 2; k++) {
      const x = w + k * STEP + 15;
      const c = chevron(x);
      polyline(ctx, c, 7.6, ADDER.pale);
      polyline(ctx, c.map((p) => pt(p.x + 0.5, p.y)), 6.6, rgba(ADDER.paleLit, 0.5));
      polyline(ctx, c, 4.6, ADDER.chevron);
      polyline(ctx, c.map((p) => pt(p.x - 0.4, p.y)), 2.2, rgba(ADDER.chevronSoft, 0.7));
      // Inside each V the ground is a touch greyer-brown, as on a real adder.
      const inside = [pt(x - 9.6, MID - 7.4), pt(x - 2.8, MID), pt(x - 9.6, MID + 7.4), pt(x - 13, MID)];
      ctx.fillStyle = rgba(ADDER.groundDeep, 0.28);
      ctx.beginPath();
      inside.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Keeled scales: rows of small overlapping ovals, each with its ridge, clipped to the tile and wrapped. */
function paintScales(ctx: CanvasRenderingContext2D, f: number): void {
  const rng = createRng(47100 + f * 7);
  const rows = 13;
  for (let r = 0; r < rows; r++) {
    const y = 0.9 + (r / (rows - 1)) * (SNAKE_W - 1.8);
    const step = 2.6;
    for (let x = (r % 2) * step * 0.5; x < ADDER_PERIOD; x += step) {
      const jx = (rng() - 0.5) * 0.5;
      for (const w of WRAPS) {
        const cx = x + w + jx;
        if (cx < -3 || cx > ADDER_PERIOD + 3) continue;
        ctx.strokeStyle = rgba(ADDER.line, 0.22);
        ctx.lineWidth = 0.22;
        ctx.beginPath();
        ctx.ellipse(cx, y, 1.35, 0.95, 0, Math.PI * 0.15, Math.PI * 0.95);
        ctx.stroke();
        // The keel, catching the light.
        ctx.strokeStyle = rgba(ADDER.paleLit, 0.22);
        ctx.lineWidth = 0.18;
        ctx.beginPath();
        ctx.moveTo(cx - 0.8, y - 0.1);
        ctx.lineTo(cx + 0.7, y - 0.1);
        ctx.stroke();
      }
    }
  }
}

/** Light from the upper left over a round back: a sheen above the midline, the far flank in shade. */
function modelBack(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, SNAKE_W);
  g.addColorStop(0, rgba('#1a0e06', 0.32));
  g.addColorStop(0.2, rgba(PAPER_FILL, 0.06));
  g.addColorStop(0.36, rgba(PAPER_FILL, 0.2));
  g.addColorStop(0.5, rgba(PAPER_FILL, 0.04));
  g.addColorStop(0.72, rgba('#1a0e06', 0.12));
  g.addColorStop(1, rgba('#1a0e06', 0.5));
  ctx.fillStyle = g;
  ctx.fillRect(-1, 0, ADDER_PERIOD + 2, SNAKE_W);
  for (const w of WRAPS) for (let x = 6; x < ADDER_PERIOD; x += STEP) glaze(ctx, x + w, 8.4, 9, 1.3, 0, PAPER_FILL, 0.16);
}

function paintTile(ctx: CanvasRenderingContext2D, f: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0.3, ADDER_PERIOD, SNAKE_W - 0.6);
  ctx.clip();
  paintGround(ctx);
  paintChevrons(ctx);
  paintScales(ctx, f);
  modelBack(ctx);
  ctx.restore();
  periodicLine(ctx, ADDER_PERIOD, -2, ADDER_PERIOD + 2, 0.9, 0.7, ADDER.line, 0.95, 47800 + f * 1000);
  periodicLine(ctx, ADDER_PERIOD, -2, ADDER_PERIOD + 2, SNAKE_W - 0.9, 0.8, ADDER.line, 1, 47900 + f * 1000);
}

const stripOf = (d: Draw, length: number): void => {
  const { ctx } = d.pen;
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(ADDER_PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paintTile(tctx, d.f);
    for (let x = 0; x < Math.min(length, stripLength(ADDER_PERIOD)); x += ADDER_PERIOD) ctx.drawImage(tile, x, 0, ADDER_PERIOD, SNAKE_W);
  });
};

/** The adder's back as a strip (symmetric across, so the same strip serves a body heading either way). */
export const ADDER_STRIP: SnakeArt = { ...CORN, period: ADDER_PERIOD, drawStrip: stripOf };

// ---------------------------------------------------------------- the head from above

/** The head seen from above: the narrow neck at x ≤ 0, the jaws' angles bulging out wide, the snout blunt and round. */
const TOP_HEAD: readonly Pt[] = [
  ...cub(pt(-12, -12), pt(-2, -12.4), pt(4, -19), pt(10, -24.4), 10),
  ...cub(pt(10, -24.4), pt(16, -27.4), pt(24, -25), pt(30, -21), 8).slice(1),
  ...cub(pt(30, -21), pt(38, -16), pt(45, -11.6), pt(48.5, -7), 8).slice(1),
  ...cub(pt(48.5, -7), pt(51, -3.6), pt(51, 3.6), pt(48.5, 7), 8).slice(1),
  ...cub(pt(48.5, 7), pt(45, 11.6), pt(38, 16), pt(30, 21), 8).slice(1),
  ...cub(pt(30, 21), pt(24, 25), pt(16, 27.4), pt(10, 24.4), 8).slice(1),
  ...cub(pt(10, 24.4), pt(4, 19), pt(-2, 12.4), pt(-12, 12), 10).slice(1),
];

/** A shape mirrored across the midline (y → −y). */
const mirrorY = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));

function topEye(d: Draw, y: number): void {
  const { pen } = d;
  const { ctx } = pen;
  const s = Math.sign(y);
  const c = pt(32, y);
  // The brow shield over it, the eye bulging out at the head's edge.
  pen.fill(oval(c.x, c.y - s * 0.4, 4.6, 3.4, 18), ADDER.groundDeep, 0.9);
  const ball = oval(c.x, c.y + s * 0.6, 3.6, 2.6, 22);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y, 0.2, c.x, c.y + s * 0.6, 3.8);
    g.addColorStop(0, ADDER.irisLit);
    g.addColorStop(0.55, ADDER.iris);
    g.addColorStop(1, ADDER.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
    // The slit pupil, upright to the head's long axis.
    pen.fill(oval(c.x + 0.2, c.y + s * 0.6, 0.55, 2.2, 14), ADDER.pupil, 1);
  });
  pen.stroke(closed(ball), 0.42, ADDER.line, 1, false);
  pen.dot(c.x - 1.2, c.y + s * 0.1, 0.5, PAPER_FILL, 0.95);
}

function drawTopHead(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(TOP_HEAD, PAPER_FILL, 1);
  pen.clipped(TOP_HEAD, () => {
    const g = ctx.createLinearGradient(0, -26, 0, 26);
    g.addColorStop(0, ADDER.flankDeep);
    g.addColorStop(0.2, ADDER.flank);
    g.addColorStop(0.42, ADDER.ground);
    g.addColorStop(0.55, ADDER.groundLit);
    g.addColorStop(0.75, ADDER.ground);
    g.addColorStop(1, ADDER.flankDeep);
    ctx.fillStyle = g;
    ctx.fillRect(-14, -28, 68, 56);
    // The dark band across the snout in front of the eyes, edged pale.
    const band = [...cub(pt(36, -17), pt(40.5, -8), pt(40.5, 8), pt(36, 17), 10), ...cub(pt(41, 15), pt(46, 6), pt(46, -6), pt(41, -15), 10)];
    pen.fill(band.map((p) => pt(p.x + (p.x > 40 ? 1.2 : -1.2), p.y)), ADDER.pale, 0.95);
    pen.fill(band, ADDER.chevron, 0.7);
    // The pale bar between the eyes and the dark crown triangle behind it, pointing forward, edged pale.
    pen.fill([pt(28, -17), pt(32, -12), pt(32, 12), pt(28, 17), pt(25.5, 12), pt(25.5, -12)], ADDER.paleLit, 0.75);
    // The crown: two dark blotches at the back corners of the head and a short dark arrow between them, each edged pale.
    for (const sy of [-1, 1]) {
      const blot = [pt(6, sy * 6), pt(16, sy * 9), pt(22, sy * 17), pt(14, sy * 21), pt(4, sy * 13)];
      pen.fill(blot.map((p) => pt(p.x - 0.8, p.y + sy * 0.8)), ADDER.pale, 0.8);
      pen.fill(blot, ADDER.chevron, 0.82);
    }
    pen.fill([pt(19, 0), pt(10, -4), pt(4, -3), pt(4, 3), pt(10, 4)], ADDER.chevronSoft, 0.75);
    // The first chevron on the neck.
    pen.fill([pt(1, 0), pt(-8, -11), pt(-11, -11), pt(-3, 0), pt(-11, 11), pt(-8, 11)], ADDER.pale, 0.9);
    pen.fill([pt(-1, 0), pt(-9, -10), pt(-12, -10), pt(-5, 0), pt(-12, 10), pt(-9, 10)], ADDER.chevron, 0.9);
    // The dark bar from each eye back towards the jaw's angle.
    for (const s of [-1, 1]) pen.fill([pt(31, s * 19), pt(26, s * 23.6), pt(17, s * 25), pt(19, s * 21), pt(27, s * 17.6)], ADDER.chevron, 0.75);
    // Small keeled head scales, and the round over the top.
    const rng = createRng(47300);
    for (let i = 0; i < 260; i++) {
      const x = -10 + rng() * 60;
      const y = (rng() - 0.5) * 48;
      pen.hair([pt(x, y), pt(x + 1.1, y + 0.2)], 0.16, ADDER.line, 0.28);
    }
    glaze(ctx, 22, -6, 22, 8, 0, PAPER_FILL, 0.22);
    glaze(ctx, 18, 20, 24, 8, 0, '#1a0e06', 0.32);
  });
  // The nostrils, set high and turned up near the tip.
  for (const s of [-1, 1]) {
    pen.fill(oval(46, s * 4.4, 1.5, 1.1, 12), ADDER.line, 0.9);
    pen.hair(cub(pt(44.4, s * 6), pt(45.4, s * 6.6), pt(47, s * 6.4), pt(48, s * 5.2), 6), 0.3, ADDER.paleLit, 0.7);
  }
  topEye(d, -17.6);
  topEye(d, 17.6);
  pen.stroke(closed(TOP_HEAD.slice(0, -1)).slice(3), 1, ADDER.line, 1, false);
  dissolveBack(ctx);
}

// ---------------------------------------------------------------- the head side on, striking

/** Side on, the corner of the mouth (the hinge the jaws swing about). */
const RICTUS = pt(14, 4);
const SIDE_TOP: readonly Pt[] = [
  ...cub(pt(-12, -12), pt(0, -12.2), pt(12, -13.6), pt(24, -12.8), 10),
  ...cub(pt(24, -12.8), pt(34, -12.2), pt(42, -9.6), pt(46, -5.4), 8).slice(1),
  ...cub(pt(46, -5.4), pt(48.6, -2.6), pt(48.4, 0.6), pt(46.6, 2), 6).slice(1),
];
const SIDE_LIP: readonly Pt[] = cub(pt(46.6, 2), pt(38, 3.4), pt(26, 4.2), RICTUS, 12);
const SKULL: readonly Pt[] = [...SIDE_TOP, ...SIDE_LIP.slice(1), ...cub(RICTUS, pt(6, 5), pt(-4, 6), pt(-12, 6), 6).slice(1)];
const JAW_LIP: readonly Pt[] = cub(pt(44, 3.6), pt(36, 4.8), pt(24, 5), RICTUS, 10);
const JAW: readonly Pt[] = [
  ...cub(pt(-12, 6), pt(-4, 6), pt(6, 5), RICTUS, 6),
  ...[...JAW_LIP].reverse().slice(1),
  ...cub(pt(44, 3.6), pt(42, 7), pt(30, 10.6), pt(14, 12), 8).slice(1),
  ...cub(pt(14, 12), pt(4, 12.6), pt(-4, 12.4), pt(-12, 12), 6).slice(1),
];

const turn = (pts: readonly Pt[], a: number, c: Pt): Pt[] =>
  pts.map((p) => pt(c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a)));

function sideSkin(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  const { ctx } = pen;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, -14, 0, 8);
    g.addColorStop(0, ADDER.ground);
    g.addColorStop(0.45, ADDER.groundLit);
    g.addColorStop(1, ADDER.belly);
    ctx.fillStyle = g;
    ctx.fillRect(-14, -16, 66, 30);
    // The two dark oblique bars from the eye down to the lip, edged pale, and the dark crown edge.
    for (const [x0, x1] of [[34, 40], [22, 27]] as const) {
      pen.fill([pt(x0 - 1.4, -8), pt(x0 + 2.4, -8), pt(x1 + 2.4, 4.6), pt(x1 - 1.6, 4.6)], ADDER.pale, 0.9);
      pen.fill([pt(x0, -8), pt(x0 + 1.6, -8), pt(x1 + 1, 4.6), pt(x1 - 0.6, 4.6)], ADDER.chevron, 0.95);
    }
    pen.fill([...cub(pt(-12, -12.4), pt(10, -14), pt(30, -13.4), pt(46, -5.6), 12), pt(40, -8), pt(20, -10.4), pt(-12, -9.4)], ADDER.chevronSoft, 0.55);
    const rng = createRng(47400);
    for (let i = 0; i < 160; i++) {
      const x = -10 + rng() * 56;
      const y = -12 + rng() * 15;
      pen.hair([pt(x, y), pt(x + 1, y + 0.2)], 0.15, ADDER.line, 0.26);
    }
    glaze(ctx, 22, -10, 20, 2.6, 0, PAPER_FILL, 0.25);
  });
}

function sideEye(d: Draw, c: Pt): void {
  const { pen } = d;
  const { ctx } = pen;
  const r = 3.4;
  pen.fill(oval(c.x, c.y - 0.6, r + 1.3, r + 0.8, 22), ADDER.groundDeep, 0.85);
  const ball = oval(c.x, c.y, r, r * 0.95, 24);
  pen.clipped(ball, () => {
    const g = ctx.createRadialGradient(c.x - 0.6, c.y + 0.4, 0.2, c.x, c.y, r * 1.05);
    g.addColorStop(0, ADDER.irisLit);
    g.addColorStop(0.55, ADDER.iris);
    g.addColorStop(1, ADDER.irisDeep);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    pen.fill(oval(c.x + 0.2, c.y, 0.6, 2.7, 14), ADDER.pupil, 1);
    pen.fill(ball.map((p) => pt(p.x, p.y - r * 1.4)), ADDER.groundDeep, 0.55);
  });
  pen.stroke(closed(ball), 0.42, ADDER.line, 1, false);
  pen.dot(c.x - 1.2, c.y - 1, 0.62, PAPER_FILL, 1);
}

function drawStrikeHead(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  const up = -0.3;
  const down = 1.08;
  const jaw = turn(JAW, down, RICTUS);
  const jawLip = turn(JAW_LIP, down, RICTUS);
  const lip = turn(SIDE_LIP, up, RICTUS);
  // The lower jaw, pale beneath.
  pen.fill(jaw, PAPER_FILL, 1);
  pen.clipped(jaw, () => {
    const g = ctx.createLinearGradient(RICTUS.x, RICTUS.y, RICTUS.x + 20, RICTUS.y + 30);
    g.addColorStop(0, ADDER.ground);
    g.addColorStop(1, ADDER.belly);
    ctx.fillStyle = g;
    ctx.fillRect(-14, -10, 70, 60);
  });
  pen.stroke(closed(jaw).slice(1), 0.8, ADDER.line, 1, false);
  // The mouth: pink lining, the dark throat at the hinge, the glottis tube along the floor.
  const inside = [...lip, ...[...jawLip].reverse()];
  pen.fill(inside, PAPER_FILL, 1);
  pen.clipped(inside, () => {
    const g = ctx.createRadialGradient(RICTUS.x, RICTUS.y, 1, RICTUS.x, RICTUS.y, 34);
    g.addColorStop(0, ADDER.throat);
    g.addColorStop(0.3, ADDER.mouthDeep);
    g.addColorStop(1, ADDER.mouth);
    ctx.fillStyle = g;
    ctx.fillRect(-10, -40, 70, 80);
    const floor = jawLip.map((p) => pt(p.x + (RICTUS.x - p.x) * 0.12, p.y + (RICTUS.y - p.y) * 0.18));
    pen.hair(floor.slice(2, 9), 1.6, ADDER.mouthDeep, 0.6);
  });
  pen.hair(closed(inside), 0.45, ADDER.line, 0.8);
  // The skull tipped back.
  ctx.save();
  ctx.translate(RICTUS.x, RICTUS.y);
  ctx.rotate(up);
  ctx.translate(-RICTUS.x, -RICTUS.y);
  sideSkin(d, SKULL);
  sideEye(d, pt(31, -5.6));
  pen.fill(oval(44, -3.2, 0.9, 0.7, 10), ADDER.line, 0.9);
  pen.stroke(SIDE_TOP, 1, ADDER.line, 1);
  pen.hair(SIDE_LIP, 0.7, ADDER.line, 1);
  // The long fangs, swung forward off the front of the upper jaw, curving down and in.
  for (const [x, len, a] of [[42, 11, 0.9], [39.4, 9.6, 0.82]] as const) {
    const fang = [...cub(pt(x - 1.1, 2.4), pt(x + 1.4, 2 + len * 0.4), pt(x + 1.6, 2 + len * 0.8), pt(x + 0.4, 2 + len), 8), ...cub(pt(x + 0.4, 2 + len), pt(x + 0.6, 2 + len * 0.7), pt(x + 0.8, 2 + len * 0.3), pt(x + 1.3, 2.4), 8).slice(1)];
    pen.fill(fang, ADDER.fang, a);
    pen.hair(closed(fang), 0.22, ADDER.line, 0.7);
  }
  ctx.restore();
  dissolveBack(ctx);
}

/** The back of the head melts into the neck drawn under it. */
function dissolveBack(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(-12, 0, 2, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, 42, 80);
  ctx.restore();
}

export type AdderHeadPose = 'top' | 'strike';

export const ADDER_HEAD: SpriteArt<AdderHeadPose> = {
  frame: 130,
  res: 10,
  poses: ['top', 'strike'],
  draw: (d, pose) => (pose === 'top' ? drawTopHead(d) : drawStrikeHead(d)),
};

/** Where the snout tip is on each head (art units from the neck joint), for the tongue. */
export const ADDER_SNOUT = { top: 50.5, strike: 46 } as const;

export { mirrorY };
