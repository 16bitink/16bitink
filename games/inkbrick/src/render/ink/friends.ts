import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C } from './palette';

/**
 * The rescue goal's friends (a little crab, a seal pup, a puffin chick), each
 * hopeful while caged and beaming once free, and the cage of kelp and rope
 * that holds them inside the vault. All drawn on one 120 x 120 image so the
 * cage sits over any of them.
 */
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
export type FriendWho = 'crab' | 'pup' | 'puffin';

export const FRIEND_SIZE = 120;

function inked(p: Pen, shape: Pt[], fill: string, line: number, inside?: () => void): void {
  p.fill(shape, fill);
  if (inside) p.clipped(shape, inside);
  p.closed(shape, line);
}

/** Two eyes: round and hopeful, or happy closed arcs. */
function eyes(p: Pen, cx: number, cy: number, gap: number, r: number, happy: boolean): void {
  for (const side of [-1, 1]) {
    const x = cx + side * gap;
    if (happy) {
      p.stroke(Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * (1.1 + (i / 6) * 0.8);
        return { x: x + Math.cos(a) * r, y: cy + r * 0.4 + Math.sin(a) * r };
      }), 2.8, INK, 1, false);
    } else {
      p.fill(ellipse(x, cy, r, r * 1.1, 12), INK);
      p.dot(x - r * 0.35, cy - r * 0.4, r * 0.35, C.white);
    }
  }
}

function smile(p: Pen, cx: number, cy: number, r: number, open: boolean): void {
  const arc = Array.from({ length: 7 }, (_, i) => {
    const a = Math.PI * (0.15 + (i / 6) * 0.7);
    return { x: cx + Math.cos(a) * r, y: cy - r * 0.5 + Math.sin(a) * r };
  });
  if (open) inked(p, [...arc], C.red, 2.2);
  else p.stroke(arc, 2.4, INK, 1, false);
}

const cheeks = (p: Pen, cx: number, cy: number, gap: number): void => {
  for (const side of [-1, 1]) p.fill(ellipse(cx + side * gap, cy, 6, 4, 10), C.red, 0.45);
};

/** A small round crab, shell-pink (not the guard crabs' red), eyes on stalks, claws up in a wave. */
function crabFriend(happy: boolean): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, happy ? 802 : 801, 0.5);
    const cx = w / 2;
    const cy = h * 0.62;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) p.stroke([{ x: cx + side * 22, y: cy + 4 + i * 6 }, { x: cx + side * (36 + i * 3), y: cy + 6 + i * 7 }, { x: cx + side * (40 + i * 2), y: h - 10 + i }], 3);
      const hand = { x: cx + side * 40, y: happy ? h * 0.2 : h * 0.34 };
      p.stroke([{ x: cx + side * 26, y: cy - 8 }, hand], 3.4);
      inked(p, ellipse(hand.x, hand.y, 10, 12, 12), C.mauve, 2.4);
      p.stroke([{ x: hand.x, y: hand.y - 12 }, { x: hand.x + side * 3, y: hand.y - 2 }], 2.4, C.paper, 1, false);
    }
    const shell = ellipse(cx, cy, 32, 22, 22);
    inked(p, shell, C.mauve, 3, () => p.hatch(shell, 4, 0.8, 1, { onlyBelow: cy + 6, alpha: 0.5 }));
    for (const side of [-1, 1]) {
      const ex = cx + side * 11;
      p.stroke([{ x: ex, y: cy - 16 }, { x: ex, y: cy - 30 }], 2.6);
      p.fill(ellipse(ex, cy - 34, 7, 7, 12), C.white);
      p.circle(ex, cy - 34, 7, 2);
      if (happy) p.stroke([{ x: ex - 4, y: cy - 33 }, { x: ex, y: cy - 37 }, { x: ex + 4, y: cy - 33 }], 2.4, INK, 1, false);
      else p.dot(ex, cy - 33, 3.4);
    }
    smile(p, cx, cy + 2, 8, happy);
    cheeks(p, cx, cy - 2, 20);
  };
}

/** A round grey-white seal pup: big dark eyes, whiskers, two flippers. */
function pup(happy: boolean): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, happy ? 812 : 811, 0.5);
    const cx = w / 2;
    const cy = h * 0.58;
    const tail = [{ x: cx + 26, y: cy + 26 }, { x: cx + 44, y: cy + 34 }, { x: cx + 40, y: cy + 20 }];
    inked(p, tail, C.paperGrey, 2.4);
    const body = ellipse(cx, cy + 6, 40, 34, 26);
    inked(p, body, '#eeeae3', 3.2, () => {
      p.stipple(body, 500, (x, y) => (x + y > cx + cy + 30 ? 0.7 : 0.08), 0.7);
      for (const [x, y] of [[-16, 18], [10, 26], [22, 4], [-26, 0]] as const) p.fill(ellipse(cx + x, cy + y, 4, 3, 8), C.stone, 0.8);
    });
    for (const side of [-1, 1]) {
      const fl = [{ x: cx + side * 26, y: cy + 14 }, { x: cx + side * (happy ? 50 : 44), y: cy + (happy ? -4 : 20) }, { x: cx + side * 30, y: cy + 28 }];
      inked(p, fl, C.paperGrey, 2.4);
    }
    eyes(p, cx, cy - 6, 14, 6.5, happy);
    p.fill(ellipse(cx, cy + 6, 5, 3.6, 10), INK);
    smile(p, cx, cy + 12, 6, happy);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      p.hair([{ x: cx + side * 9, y: cy + 8 + i * 2 }, { x: cx + side * 24, y: cy + 4 + i * 5 }], 1.3, INK, 0.8);
    }
    cheeks(p, cx, cy + 4, 22);
  };
}

/** A fluffy puffin chick: a dark down ball, pale face, small dark beak, stubby wings. */
function puffin(happy: boolean): Draw {
  return (ctx, w, h) => {
    const p = new Pen(ctx, happy ? 822 : 821, 0.6);
    const cx = w / 2;
    const cy = h * 0.58;
    const fluff = Array.from({ length: 30 }, (_, i) => {
      const a = (i / 30) * Math.PI * 2;
      const r = (i % 2 === 0 ? 40 : 36);
      return { x: cx + Math.cos(a) * r, y: cy + 4 + Math.sin(a) * r * 0.95 };
    });
    inked(p, fluff, '#6b6670', 3, () => p.hatch(fluff, 3.4, 0.9, 1, { alpha: 0.5 }));
    const belly = ellipse(cx, cy + 18, 22, 18, 18);
    inked(p, belly, '#d9d3c6', 2, () => p.stipple(belly, 160, () => 0.25, 0.6));
    for (const side of [-1, 1]) {
      const wing = [{ x: cx + side * 34, y: cy - 2 }, { x: cx + side * (happy ? 54 : 46), y: cy + (happy ? -18 : 12) }, { x: cx + side * 36, y: cy + 22 }];
      inked(p, wing, '#4c4852', 2.4);
    }
    const face = ellipse(cx, cy - 10, 24, 18, 18);
    inked(p, face, C.white, 2.2);
    eyes(p, cx, cy - 12, 10, 5, happy);
    const beak = [{ x: cx - 7, y: cy - 4 }, { x: cx + 7, y: cy - 4 }, { x: cx, y: cy + 6 }];
    inked(p, beak, '#4c4852', 2);
    p.fill(ellipse(cx, cy - 3, 4, 1.6, 8), C.orange);
    for (const side of [-1, 1]) inked(p, roundRect(cx + side * 12 - 6, cy + 38, 12, 6, 3, 3), C.orange, 2);
    cheeks(p, cx, cy - 2, 16);
  };
}

/**
 * The cage: four kelp strands (two each side, the middle left clear so the
 * friend's face shows), two rope bands, knots where they cross.
 */
const CAGE_STRANDS = [0.1, 0.28, 0.72, 0.9] as const;
const cage: Draw = (ctx, w, h) => {
  const p = new Pen(ctx, 830, 0.6);
  const top = h * 0.06;
  const bot = h * 0.96;
  CAGE_STRANDS.forEach((fx, i) => {
    const x = w * fx;
    const strand = Array.from({ length: 12 }, (_, k) => ({ x: x + Math.sin(k * 1.1 + i) * 3, y: top + ((bot - top) * k) / 11 }));
    p.stroke(strand, 8, C.sage, 1, false);
    p.stroke(strand, 2.6, INK, 0.95);
    for (let k = 2; k < 11; k += 3) {
      const at = strand[k]!;
      const side = fx < 0.5 ? -1 : 1;
      const leaf = [at, { x: at.x + side * 10, y: at.y - 6 }, { x: at.x + side * 13, y: at.y + 2 }];
      inked(p, leaf, C.sage, 1.6);
    }
  });
  for (const f of [0.1, 0.9]) {
    const y = h * f;
    const band = roundRect(w * 0.04, y - 6, w * 0.92, 12, 5, 10);
    inked(p, band, C.sand, 2.6, () => p.hatch(band, 3.2, -1, 0.9, { alpha: 0.8 }));
    for (const fx of CAGE_STRANDS) p.dot(w * fx, y, 3.6);
  }
};

export const FRIEND_DRAWERS: Readonly<Record<string, Draw>> = {
  'friend-crab': crabFriend(false), 'friend-crab-happy': crabFriend(true),
  'friend-pup': pup(false), 'friend-pup-happy': pup(true),
  'friend-puffin': puffin(false), 'friend-puffin-happy': puffin(true),
  cage,
};

export const FRIEND_SIZES: Readonly<Record<string, { readonly w: number; readonly h: number }>> =
  Object.fromEntries(Object.keys(FRIEND_DRAWERS).map((k) => [k, { w: FRIEND_SIZE, h: FRIEND_SIZE }]));
