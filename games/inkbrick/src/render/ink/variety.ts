import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C, LINE } from './palette';

/**
 * The variety pieces in ink (docs/inkbrick-design.md, "New pieces"): the
 * barnacled buoy (bumper), levers and their flip walls in four link colours,
 * the walking crab, pearls, the daily pearl, a hidden brick's shimmer, the
 * tide's danger line, and the trap door (shutter) drawn at its own size.
 * Image px are 2x the board, like the rest of the art.
 */
export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Lever and flip-wall colours: walls answer to the lever of their colour. */
export const LINK_FILLS = [C.teal, C.mauve, C.gold, C.orange] as const;

/** A link name to its colour index (stable: the same link is the same colour everywhere). */
export function linkColour(link: string): number {
  let h = 0;
  for (let i = 0; i < link.length; i++) h = (h * 31 + link.charCodeAt(i)) >>> 0;
  return h % LINK_FILLS.length;
}

const INSET = 4;

/** Fill, texture inside, outline last so it stays crisp. */
function inked(p: Pen, shape: Pt[], fill: string, line: number, inside?: () => void): void {
  p.fill(shape, fill);
  if (inside) p.clipped(shape, inside);
  p.closed(shape, line);
}

/** A dashed outline (open walls, an open trap door): short pen dashes round the box. */
function dashedBox(p: Pen, x: number, y: number, w: number, h: number, dash: number, width: number, alpha: number): void {
  const loop = roundRect(x, y, w, h, Math.min(8, h * 0.2), 24);
  const pts = [...loop, loop[0]!];
  let carry = 0;
  let on = true;
  let run: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    let t = 0;
    while (t < len) {
      const step = Math.min(len - t, (on ? dash : dash * 0.8) - carry);
      const s = { x: a.x + ((b.x - a.x) * t) / len, y: a.y + ((b.y - a.y) * t) / len };
      const e = { x: a.x + ((b.x - a.x) * (t + step)) / len, y: a.y + ((b.y - a.y) * (t + step)) / len };
      if (on) run.push(s, e);
      t += step;
      carry += step;
      if (carry >= (on ? dash : dash * 0.8) - 0.01) {
        if (on && run.length > 1) p.stroke(run, width, INK, alpha, false);
        run = [];
        carry = 0;
        on = !on;
      }
    }
  }
  if (on && run.length > 1) p.stroke(run, width, INK, alpha, false);
}

// The bumper: a round float crusted with barnacles -------------------------

/** Share of the image's half-width the float's disc fills (the rest is room for the flash). */
export const BUMPER_DISC = 0.78;

function barnacle(p: Pen, x: number, y: number, r: number): void {
  const cone = ellipse(x, y, r, r * 0.85, 10);
  inked(p, cone, C.white, 1.6, () => p.stipple(cone, r * r * 2, (_x, yy) => (yy > y ? 0.7 : 0.15), 0.6));
  p.fill(ellipse(x, y - r * 0.1, r * 0.38, r * 0.3, 8), INK, 0.9);
}

function bumper(lit: boolean): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, lit ? 612 : 611, 0.6);
    const cx = w / 2;
    const cy = h / 2;
    const r = (w / 2) * BUMPER_DISC;
    if (lit) {
      // A burst of short flicks round the float.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        p.stroke([{ x: cx + Math.cos(a) * (r + 4), y: cy + Math.sin(a) * (r + 4) }, { x: cx + Math.cos(a) * (w / 2 - 2), y: cy + Math.sin(a) * (h / 2 - 2) }], 3, INK, 0.9, false);
      }
    }
    const disc = ellipse(cx, cy, r, r, 32);
    inked(p, disc, lit ? C.gold : C.red, 3.4, () => {
      // A pale band across the float, and shade low right.
      const band = [{ x: cx - r, y: cy - r * 0.22 }, { x: cx + r, y: cy - r * 0.32 }, { x: cx + r, y: cy + r * 0.12 }, { x: cx - r, y: cy + r * 0.22 }];
      p.fill(band, C.white);
      p.hair([band[0]!, band[1]!], 1.6);
      p.hair([band[3]!, band[2]!], 1.6);
      p.hatch(disc, 4, 0.8, 1.1, { onlyBelow: cy + r * 0.35, alpha: 0.5 });
    });
    // The rope eye on top and a highlight.
    p.circle(cx, cy - r * 0.62, r * 0.16, 2.4);
    p.stroke([{ x: cx - r * 0.55, y: cy - r * 0.5 }, { x: cx - r * 0.3, y: cy - r * 0.72 }], 3, C.white, 0.95, false);
    // Barnacles crust the lower left.
    for (const [a, s] of [[2.2, 0.17], [2.55, 0.13], [1.9, 0.12], [2.85, 0.1], [1.6, 0.09]] as const) {
      barnacle(p, cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82, r * s);
    }
  };
}

// Levers and flip walls ----------------------------------------------------

/** A wooden lever on a post over a pale stone plate; `right` = the handle leans right. */
function lever(right: boolean, colour: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 620 + colour, 0.6);
    const plate = roundRect(INSET, INSET, w - INSET * 2, h - INSET * 2, Math.min(9, h * 0.18));
    inked(p, plate, C.paperGrey, LINE, () => {
      p.hatch(plate, 5, 0.75, 1, { alpha: 0.35 });
      p.stipple(plate, w * h * 0.06, (_x, y) => 0.1 + 0.6 * (y / h), 0.8);
    });
    const s = Math.min(w, h);
    const px = w / 2;
    const py = h - INSET - s * 0.2;
    const dir = right ? 1 : -1;
    const len = s * 0.62;
    const tip = { x: px + dir * len * 0.62, y: py - len * 0.78 };
    // The handle: a tapered plank from the pivot to a round knob in the link's colour.
    const nx = -(tip.y - py) / len;
    const ny = (tip.x - px) / len;
    const handle = [
      { x: px + nx * s * 0.07, y: py + ny * s * 0.07 }, { x: tip.x + nx * s * 0.045, y: tip.y + ny * s * 0.045 },
      { x: tip.x - nx * s * 0.045, y: tip.y - ny * s * 0.045 }, { x: px - nx * s * 0.07, y: py - ny * s * 0.07 },
    ];
    inked(p, handle, C.drift, 2.4, () => p.hatch(handle, 3.5, 1.1, 0.9, { alpha: 0.5 }));
    const knob = ellipse(tip.x, tip.y, s * 0.12, s * 0.12, 14);
    inked(p, knob, LINK_FILLS[colour]!, 2.6, () => p.hatch(knob, 3, 0.8, 0.9, { onlyBelow: tip.y, alpha: 0.5 }));
    // The post: a half-round block the handle turns on.
    const post = [...ellipse(px, py, s * 0.2, s * 0.15, 16).filter((q) => q.y <= py), { x: px - s * 0.2, y: py + s * 0.08 }, { x: px + s * 0.2, y: py + s * 0.08 }]
      .sort((a, b) => Math.atan2(a.y - py, a.x - px) - Math.atan2(b.y - py, b.x - px));
    inked(p, post, C.stone, 2.6, () => p.hatch(post, 3, -0.8, 1, { alpha: 0.5 }));
    p.dot(px, py - s * 0.02, s * 0.04);
  };
}

/** A flip wall, solid: a slate slab with bands and bolts in its link's colour. */
function flipSolid(colour: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 640 + colour, 0.8);
    const body = roundRect(INSET, INSET, w - INSET * 2, h - INSET * 2, Math.min(9, Math.min(w, h) * 0.18));
    inked(p, body, C.gate, 4, () => {
      p.hatch(body, 4, 0.8, 1.1, { alpha: 0.6 });
      const long = w >= h;
      const n = Math.max(1, Math.round(Math.max(w, h) / 90));
      for (let i = 0; i < n; i++) {
        const t = (Math.max(w, h) * (i + 0.5)) / n;
        const band = long ? roundRect(t - 7, INSET, 14, h - INSET * 2, 2, 3) : roundRect(INSET, t - 7, w - INSET * 2, 14, 2, 3);
        p.fill(band, LINK_FILLS[colour]!);
        p.closed(band, 1.8);
      }
    });
    for (const [x, y] of [[INSET + 8, INSET + 8], [w - INSET - 8, INSET + 8], [INSET + 8, h - INSET - 8], [w - INSET - 8, h - INSET - 8]] as const) {
      if (w < 30 || h < 30) break;
      p.dot(x, y, 2.8);
    }
  };
}

/** A flip wall, open: just its dashed outline and coloured corner ticks, so the player sees where it will be. */
function flipOpen(colour: number): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 650 + colour, 0.4);
    dashedBox(p, INSET + 1, INSET + 1, w - INSET * 2 - 2, h - INSET * 2 - 2, 12, 3.6, 0.9);
    const k = Math.min(14, w / 3, h / 3);
    for (const [x, y, dx, dy] of [[INSET, INSET, 1, 1], [w - INSET, INSET, -1, 1], [INSET, h - INSET, 1, -1], [w - INSET, h - INSET, -1, -1]] as const) {
      p.stroke([{ x: x + dx * k, y }, { x, y }, { x, y: y + dy * k }], 3.4, LINK_FILLS[colour]!, 1, false);
    }
  };
}

// The trap door (shutter) --------------------------------------------------

/** A heavy plank trap door: planks along its long side, two iron straps with rivets, a ring pull. */
const shutterClosed: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 661, 0.7);
  const long = w >= h;
  const body = roundRect(INSET - 1, INSET - 1, w - INSET * 2 + 2, h - INSET * 2 + 2, Math.min(7, Math.min(w, h) * 0.15));
  inked(p, body, C.drift, 4, () => {
    const planks = Math.max(2, Math.round((long ? h : w) / 14));
    for (let i = 1; i < planks; i++) {
      const t = ((long ? h : w) * i) / planks;
      p.stroke(long ? [{ x: 0, y: t }, { x: w, y: t + 1 }] : [{ x: t, y: 0 }, { x: t + 1, y: h }], 1.8, INK, 0.85, false);
    }
    p.hatch(body, 4, long ? 0.6 : 2.2, 1, { alpha: 0.5 });
    for (const f of [0.2, 0.8]) {
      const strap = long ? roundRect(w * f - 6, 0, 12, h, 1, 3) : roundRect(0, h * f - 6, w, 12, 1, 3);
      p.fill(strap, '#5d5a63');
      p.closed(strap, 1.8);
      const at = long ? [{ x: w * f, y: h * 0.28 }, { x: w * f, y: h * 0.72 }] : [{ x: w * 0.28, y: h * f }, { x: w * 0.72, y: h * f }];
      for (const r of at) p.dot(r.x, r.y, 2.2, C.paperGrey);
    }
  });
  // The ring pull in the middle.
  const r = Math.min(w, h) * 0.18;
  p.circle(w / 2, h / 2, r, 2.4);
  p.dot(w / 2, h / 2 - r, 2.6);
};

/** The trap door swung open: a dashed frame where it shuts, with its two hinges. */
const shutterOpen: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 662, 0.4);
  dashedBox(p, INSET, INSET, w - INSET * 2, h - INSET * 2, 10, 3.4, 0.85);
  const long = w >= h;
  for (const f of [0.2, 0.8]) {
    const hinge = long ? roundRect(w * f - 7, INSET - 2, 14, 8, 2, 3) : roundRect(INSET - 2, h * f - 7, 8, 14, 2, 3);
    p.fill(hinge, '#5d5a63');
    p.closed(hinge, 1.6);
  }
};

// The walking crab (Brumm's grumpy guard) ----------------------------------

/** Frames 1 and 2 swap the legs; frame 3 has the claws up (just hit: it scuttles off fast). */
function crab(frame: 1 | 2 | 3): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, 670 + frame, 0.6);
    const cx = w / 2;
    const cy = h * 0.6;
    const rx = w * 0.3;
    const ry = h * 0.26;
    // Legs: three a side, bent, alternating with the frame.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const lift = (i + frame) % 2 === 0 ? -h * 0.06 : h * 0.03;
        const x0 = cx + side * rx * (0.55 + i * 0.12);
        const y0 = cy + ry * (0.2 + i * 0.2);
        const knee = { x: x0 + side * w * 0.1, y: y0 - h * 0.02 + lift };
        const foot = { x: x0 + side * w * 0.15, y: h - 4 + lift * 0.5 };
        p.stroke([{ x: x0, y: y0 }, knee, foot], 3.2);
      }
    }
    // Claws: raised on the hit frame, forward otherwise.
    for (const side of [-1, 1]) {
      const up = frame === 3;
      const arm = { x: cx + side * rx * 0.85, y: cy - ry * 0.4 };
      const hand = up ? { x: cx + side * w * 0.36, y: h * 0.14 } : { x: cx + side * w * 0.4, y: h * 0.34 };
      p.stroke([arm, { x: (arm.x + hand.x) / 2 + side * 3, y: (arm.y + hand.y) / 2 }, hand], 3.6);
      const claw = ellipse(hand.x, hand.y, w * 0.075, h * 0.12, 12);
      inked(p, claw, C.red, 2.4);
      p.stroke([{ x: hand.x - side * w * 0.02, y: hand.y - h * 0.12 }, { x: hand.x + side * w * 0.03, y: hand.y - h * 0.02 }], 2.6, C.paper, 1, false);
    }
    const shell = ellipse(cx, cy, rx, ry, 24);
    inked(p, shell, C.red, 3.2, () => {
      p.hatch(shell, 4, 0.8, 1, { onlyBelow: cy + ry * 0.2, alpha: 0.55 });
      p.stipple(shell, w * h * 0.04, (_x, y) => (y < cy ? 0.25 : 0.05), 0.8);
    });
    // Eyes on stalks, with grumpy brows.
    for (const side of [-1, 1]) {
      const ex = cx + side * rx * 0.32;
      const ey = cy - ry - h * 0.1;
      p.stroke([{ x: ex, y: cy - ry * 0.7 }, { x: ex, y: ey }], 2.6);
      p.fill(ellipse(ex, ey, w * 0.045, w * 0.045, 10), C.white);
      p.circle(ex, ey, w * 0.045, 2);
      p.dot(ex + side * 0.5, ey + 1, w * 0.02);
      p.stroke([{ x: ex - side * w * 0.05, y: ey - h * 0.1 }, { x: ex + side * w * 0.04, y: ey - h * 0.06 }], 2.6, INK, 1, false);
    }
    p.stroke([{ x: cx - w * 0.04, y: cy - ry * 0.05 }, { x: cx, y: cy - ry * 0.18 }, { x: cx + w * 0.04, y: cy - ry * 0.05 }], 2.2, INK, 1, false);
  };
}

// Pearls --------------------------------------------------------------------

function pearlBall(p: Pen, x: number, y: number, r: number): void {
  const ball = ellipse(x, y, r, r, 20);
  inked(p, ball, C.white, 2.2, () => p.stipple(ball, r * r * 3, (xx, yy) => (xx + yy > x + y + r * 0.4 ? 0.7 : 0.03), 0.6));
  p.stroke([{ x: x - r * 0.5, y: y - r * 0.15 }, { x: x - r * 0.2, y: y - r * 0.55 }], Math.max(1.6, r * 0.22), C.paper, 1, false);
}

/** The goal's pearl: an open shell holding a big pearl. */
const pearl: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 681, 0.5);
  const cx = w / 2;
  const base = h * 0.78;
  const fan = [...Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI * (0.06 + (i / 12) * 0.88);
    return { x: cx + Math.cos(a) * w * 0.44, y: base - h * 0.1 + Math.sin(a) * h * 0.2 };
  }), { x: cx - w * 0.44, y: base - h * 0.14 }].reverse();
  const lid = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI * (1.08 + (i / 12) * 0.84);
    return { x: cx + Math.cos(a) * w * 0.4, y: h * 0.44 + Math.sin(a) * h * 0.34 };
  });
  inked(p, [...lid, { x: cx + w * 0.36, y: h * 0.5 }, { x: cx - w * 0.36, y: h * 0.5 }], C.mauve, 2.4, () => {
    for (let i = 1; i < 6; i++) {
      const a = Math.PI * (1.12 + (i / 6) * 0.76);
      p.hair([{ x: cx, y: h * 0.5 }, { x: cx + Math.cos(a) * w * 0.4, y: h * 0.44 + Math.sin(a) * h * 0.34 }], 1.3);
    }
  });
  inked(p, fan, C.mauve, 2.6, () => p.hatch(fan, 3.4, 0.6, 0.9, { alpha: 0.5 }));
  pearlBall(p, cx, base - h * 0.2, w * 0.17);
};

/** The daily's hidden pearl: small, alone, a little glint, so it's findable but never shouts. */
const pearlDaily: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 682, 0.3);
  pearlBall(p, w / 2, h / 2, w * 0.3);
};

/** A hidden brick's hint: a four-point glint with two specks. */
const shimmer: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 690, 0.3);
  const cx = w / 2;
  const cy = h / 2;
  const arm = (dx: number, dy: number, len: number): void => p.stroke([{ x: cx - dx * len, y: cy - dy * len }, { x: cx + dx * len, y: cy + dy * len }], 2.4, INK, 0.9, false);
  arm(1, 0, w * 0.4);
  arm(0, 1, h * 0.4);
  arm(0.7, 0.7, w * 0.16);
  arm(0.7, -0.7, w * 0.16);
  p.dot(cx + w * 0.3, cy - h * 0.28, 2);
  p.dot(cx - w * 0.28, cy + h * 0.3, 1.6);
};

// The tide's danger line ------------------------------------------------------

/** A wavy double line with crests, the water hatched faintly below it. Full board width. */
const tideLine: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 700, 0.5);
  const mid = h * 0.32;
  const wave = (dy: number, amp: number, phase: number): Pt[] =>
    Array.from({ length: 73 }, (_, i) => ({ x: (w * i) / 72, y: mid + dy + Math.sin((i / 72) * Math.PI * 18 + phase) * amp }));
  const below = [...wave(0, h * 0.1, 0), { x: w, y: h }, { x: 0, y: h }];
  p.fill(below, C.blue, 0.35);
  p.hatch(below, 7, 0.0, 1, { alpha: 0.28 });
  p.stroke(wave(0, h * 0.1, 0), 3.6, INK, 1);
  p.stroke(wave(h * 0.22, h * 0.06, 1.2), 1.8, INK, 0.6, false);
  for (let i = 0; i < 9; i++) {
    const x = (w * (i + 0.5)) / 9;
    p.stroke([{ x: x - 6, y: mid - h * 0.16 }, { x: x + 2, y: mid - h * 0.26 }, { x: x + 6, y: mid - h * 0.14 }], 2, C.red, 0.9, false);
  }
};

// Fx ----------------------------------------------------------------------------

/** A brick chip: a little white shard with an ink edge (tinted per brick, the ink stays dark). */
const chip: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 710, 0.3);
  const shard = [{ x: w * 0.2, y: h * 0.3 }, { x: w * 0.7, y: h * 0.15 }, { x: w * 0.85, y: h * 0.65 }, { x: w * 0.35, y: h * 0.85 }];
  inked(p, shard, '#ffffff', 1.6);
};

/** A keg's blast: an inked starburst ring with a pale orange wash. */
const blast: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 720, 0.8);
  const cx = w / 2;
  const cy = h / 2;
  const n = 14;
  const burst = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = (i % 2 === 0 ? 0.46 : 0.3) * w * (0.92 + p.rng() * 0.12);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  inked(p, burst, C.orange, 3.2, () => p.hatch(burst, 6, 0.8, 1.2, { alpha: 0.35 }));
  const core = ellipse(cx, cy, w * 0.17, h * 0.17, 16);
  inked(p, core, C.gold, 2.4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    p.stroke([{ x: cx + Math.cos(a) * w * 0.2, y: cy + Math.sin(a) * h * 0.2 }, { x: cx + Math.cos(a) * w * 0.28, y: cy + Math.sin(a) * h * 0.28 }], 2.2, INK, 0.8, false);
  }
};

/** Image sizes of the fixed-size variety keys (sized ones are baked per piece). */
export const VARIETY_SIZES: Readonly<Record<string, { readonly w: number; readonly h: number }>> = {
  bumper: { w: 112, h: 112 }, 'bumper-lit': { w: 112, h: 112 },
  'crab-1': { w: 120, h: 84 }, 'crab-2': { w: 120, h: 84 }, 'crab-3': { w: 120, h: 84 },
  pearl: { w: 80, h: 80 }, 'pearl-daily': { w: 40, h: 40 }, shimmer: { w: 48, h: 48 },
  'tide-line': { w: 1080, h: 56 }, chip: { w: 12, h: 12 }, blast: { w: 180, h: 180 },
};

const linked = (prefix: string, make: (c: number) => Draw): Record<string, Draw> =>
  Object.fromEntries(LINK_FILLS.map((_, c) => [`${prefix}-${c}`, make(c)]));

export const VARIETY_DRAWERS: Readonly<Record<string, Draw>> = {
  bumper: bumper(false), 'bumper-lit': bumper(true),
  ...linked('brick-lever-l', (c) => lever(false, c)), ...linked('brick-lever-r', (c) => lever(true, c)),
  ...linked('flip-on', flipSolid), ...linked('flip-off', flipOpen),
  'shutter-closed': shutterClosed, 'shutter-open': shutterOpen,
  'crab-1': crab(1), 'crab-2': crab(2), 'crab-3': crab(3),
  pearl, 'pearl-daily': pearlDaily, shimmer, 'tide-line': tideLine, chip, blast,
};
