import type { GoalKind, RuleClass, RuleKind } from '../../sim/types';
import { ellipse, INK, Pen, roundRect, type Pt } from '../pen';
import { C } from './palette';

/**
 * A small Pen-drawn badge for each rule of the day and each goal, for the
 * rule banner, the HUD, the daily's tomorrow teaser and the calendar. A paper
 * disc ringed in the rule's class colour (hard: coral, easy: sage, spectacle:
 * gold) with one pictogram. Same in both art sets.
 */
export const ICON_PX = 96;
type Pic = (p: Pen, s: number) => void;

const RING: Readonly<Record<RuleClass | 'goal', string>> = { hard: C.red, easy: C.sage, spectacle: C.gold, goal: C.blue };

function inked(p: Pen, shape: Pt[], fill: string, line: number, shadeBelow?: number): void {
  p.fill(shape, fill);
  if (shadeBelow !== undefined) p.hatch(shape, 3, 0.8, 0.9, { onlyBelow: shadeBelow, alpha: 0.5 });
  p.closed(shape, line);
}

const pebble = (p: Pen, x: number, y: number, r: number, fill: string = '#d9d3c6'): void => inked(p, ellipse(x, y, r, r * 0.86, 16), fill, 2.4, y + r * 0.2);

function arrow(p: Pen, pts: Pt[], width = 3.4): void {
  p.stroke(pts, width);
  const b = pts[pts.length - 1]!;
  const a = pts[pts.length - 2]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  for (const d of [-0.6, 0.6]) p.stroke([{ x: b.x - Math.cos(ang + d) * 10, y: b.y - Math.sin(ang + d) * 10 }, b], width, INK, 1, false);
}

function raft(p: Pen, cx: number, cy: number, w: number): void {
  const deck = roundRect(cx - w / 2, cy - 6, w, 12, 4, 6);
  inked(p, deck, C.drift, 2.4, cy + 2);
  for (const fx of [0.18, 0.82]) p.stroke([{ x: cx - w / 2 + w * fx, y: cy - 7 }, { x: cx - w / 2 + w * fx, y: cy + 7 }], 2, INK, 1, false);
}

function heart(p: Pen, cx: number, cy: number, r: number): void {
  const pts = Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * Math.PI * 2;
    return { x: cx + (16 * Math.pow(Math.sin(t), 3) / 17) * r, y: cy - ((13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17) * r };
  });
  inked(p, pts, C.red, 2.8, cy + r * 0.2);
}

function wave(y: number, x0: number, x1: number, amp: number, n: number): Pt[] {
  return Array.from({ length: 25 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / 24, y: y + Math.sin((i / 24) * Math.PI * 2 * n) * amp }));
}

const PICS: Readonly<Record<RuleKind, Pic>> = {
  current: (p, s) => {
    for (const [y, x0] of [[0.32, 0.2], [0.5, 0.28], [0.68, 0.2]] as const) arrow(p, wave(s * y, s * x0, s * (x0 + 0.56), 3.5, 1.5), 3.2);
  },
  heavy: (p, s) => { // an anchor
    const c = s / 2;
    p.circle(c, s * 0.24, s * 0.07, 3);
    p.stroke([{ x: c, y: s * 0.31 }, { x: c, y: s * 0.76 }], 4.4);
    p.stroke([{ x: c - s * 0.15, y: s * 0.4 }, { x: c + s * 0.15, y: s * 0.4 }], 3.6);
    p.stroke(Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI * (0.05 + (i / 10) * 0.9);
      return { x: c + Math.cos(a) * s * 0.25, y: s * 0.56 + Math.sin(a) * s * 0.2 };
    }), 4.2);
    for (const d of [-1, 1]) p.stroke([{ x: c + d * s * 0.25, y: s * 0.58 }, { x: c + d * s * 0.29, y: s * 0.5 }], 3.6, INK, 1, false);
  },
  speedy: (p, s) => {
    for (const [y, l] of [[0.38, 0.3], [0.52, 0.38], [0.66, 0.26]] as const) p.stroke([{ x: s * 0.14, y: s * y }, { x: s * (0.14 + l), y: s * y }], 3, INK, 0.85, false);
    pebble(p, s * 0.66, s * 0.52, s * 0.16);
  },
  tinyRaft: (p, s) => {
    raft(p, s / 2, s * 0.6, s * 0.3);
    arrow(p, [{ x: s * 0.1, y: s * 0.36 }, { x: s * 0.3, y: s * 0.36 }], 3);
    arrow(p, [{ x: s * 0.9, y: s * 0.36 }, { x: s * 0.7, y: s * 0.36 }], 3);
  },
  oneHeart: (p, s) => {
    heart(p, s / 2, s * 0.48, s * 0.3);
    p.stroke([{ x: s * 0.47, y: s * 0.4 }, { x: s * 0.52, y: s * 0.36 }, { x: s * 0.52, y: s * 0.6 }], 3, C.white, 1, false);
  },
  fog: (p, s) => { // a stone glimmering through drifting mist
    pebble(p, s * 0.5, s * 0.42, s * 0.12, C.white);
    for (const [y, x0, x1] of [[0.34, 0.14, 0.62], [0.5, 0.36, 0.86], [0.64, 0.16, 0.7], [0.78, 0.3, 0.8]] as const) {
      p.stroke(wave(s * y, s * x0, s * x1, 2.2, 1.5), 5, C.paperGrey, 1, false);
      p.stroke(wave(s * y, s * x0, s * x1, 2.2, 1.5), 2.4, INK, 0.8, false);
    }
  },
  slow: (p, s) => { // a snail
    const body = [{ x: s * 0.16, y: s * 0.7 }, { x: s * 0.82, y: s * 0.7 }, { x: s * 0.84, y: s * 0.56 }, { x: s * 0.72, y: s * 0.6 }, { x: s * 0.2, y: s * 0.64 }];
    inked(p, body, C.sand, 2.4);
    for (const d of [0, 1]) p.stroke([{ x: s * (0.77 + d * 0.04), y: s * 0.58 }, { x: s * (0.75 + d * 0.08), y: s * 0.38 }], 2.2);
    const shell = ellipse(s * 0.46, s * 0.47, s * 0.2, s * 0.19, 18);
    inked(p, shell, C.mauve, 2.8, s * 0.55);
    p.hair(Array.from({ length: 18 }, (_, i) => {
      const t = i / 17;
      const a = t * Math.PI * 3.4;
      return { x: s * 0.46 + Math.cos(a) * s * 0.15 * (1 - t), y: s * 0.47 + Math.sin(a) * s * 0.14 * (1 - t) };
    }), 2);
  },
  wideRaft: (p, s) => {
    raft(p, s / 2, s * 0.6, s * 0.7);
    arrow(p, [{ x: s * 0.4, y: s * 0.34 }, { x: s * 0.14, y: s * 0.34 }], 3);
    arrow(p, [{ x: s * 0.6, y: s * 0.34 }, { x: s * 0.86, y: s * 0.34 }], 3);
  },
  bigStone: (p, s) => {
    pebble(p, s * 0.45, s * 0.52, s * 0.26);
    pebble(p, s * 0.79, s * 0.7, s * 0.08);
  },
  sticky: (p, s) => {
    raft(p, s / 2, s * 0.62, s * 0.62);
    pebble(p, s / 2, s * 0.42, s * 0.13);
    for (const [x, l] of [[0.36, 0.14], [0.6, 0.2]] as const) {
      p.stroke([{ x: s * x, y: s * 0.68 }, { x: s * x, y: s * (0.68 + l) }], 3, C.gold, 1, false);
      inked(p, ellipse(s * x, s * (0.7 + l), 4, 5, 10), C.gold, 1.8);
    }
  },
  twoStones: (p, s) => {
    arrow(p, [{ x: s * 0.5, y: s * 0.78 }, { x: s * 0.28, y: s * 0.42 }], 3);
    arrow(p, [{ x: s * 0.5, y: s * 0.78 }, { x: s * 0.72, y: s * 0.42 }], 3);
    pebble(p, s * 0.24, s * 0.3, s * 0.11);
    pebble(p, s * 0.76, s * 0.3, s * 0.11);
  },
  ghost: (p, s) => {
    const brick = roundRect(s * 0.42, s * 0.3, s * 0.2, s * 0.4, 4, 4);
    inked(p, brick, C.sand, 2.4);
    p.stroke([{ x: s * 0.12, y: s * 0.5 }, { x: s * 0.86, y: s * 0.5 }], 2.4, INK, 0.5, false);
    p.fill(ellipse(s * 0.74, s * 0.5, s * 0.11, s * 0.1, 14), '#ffffff', 0.85);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      if (i % 2) continue;
      p.stroke([{ x: s * 0.74 + Math.cos(a) * s * 0.11, y: s * 0.5 + Math.sin(a) * s * 0.1 }, { x: s * 0.74 + Math.cos(a + 0.5) * s * 0.11, y: s * 0.5 + Math.sin(a + 0.5) * s * 0.1 }], 2.4, INK, 1, false);
    }
  },
  goldRush: (p, s) => {
    const brick = roundRect(s * 0.16, s * 0.38, s * 0.68, s * 0.3, 5, 6);
    inked(p, brick, C.mauve, 2.6, s * 0.56);
    for (const fx of [0.3, 0.5, 0.7]) {
      p.fill(ellipse(s * fx, s * 0.53, s * 0.07, s * 0.065, 12), C.white);
      p.circle(s * fx, s * 0.53, s * 0.07, 1.8);
    }
    for (const [x, y, r] of [[0.22, 0.24, 0.07], [0.78, 0.22, 0.09], [0.52, 0.16, 0.05]] as const) {
      p.stroke([{ x: s * (x - r), y: s * y }, { x: s * (x + r), y: s * y }], 2.6, C.gold, 1, false);
      p.stroke([{ x: s * x, y: s * (y - r) }, { x: s * x, y: s * (y + r) }], 2.6, C.gold, 1, false);
    }
  },
  kegDay: (p, s) => {
    const keg = roundRect(s * 0.26, s * 0.36, s * 0.48, s * 0.42, 10, 6);
    inked(p, keg, C.orange, 2.8, s * 0.6);
    for (const fy of [0.46, 0.68]) p.stroke([{ x: s * 0.27, y: s * fy }, { x: s * 0.73, y: s * fy }], 2.6, INK, 1, false);
    p.stroke([{ x: s * 0.5, y: s * 0.36 }, { x: s * 0.56, y: s * 0.22 }], 2.4);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.55;
      p.stroke([{ x: s * 0.57 + Math.cos(a) * 4, y: s * 0.2 + Math.sin(a) * 4 }, { x: s * 0.57 + Math.cos(a) * 11, y: s * 0.2 + Math.sin(a) * 11 }], 2.2, C.red, 1, false);
    }
  },
};

const GOAL_PICS: Readonly<Record<GoalKind, Pic>> = {
  clear: (p, s) => {
    for (const [x, y, a] of [[0.22, 0.5, -0.3], [0.5, 0.42, 0.1], [0.72, 0.58, 0.4]] as const) {
      const b = roundRect(s * x - 9, s * y - 6, 18, 12, 3, 3).map((q) => ({ x: s * x + (q.x - s * x) * Math.cos(a) - (q.y - s * y) * Math.sin(a), y: s * y + (q.x - s * x) * Math.sin(a) + (q.y - s * y) * Math.cos(a) }));
      inked(p, b, C.sand, 2.2);
    }
    for (let i = 0; i < 5; i++) p.dot(s * (0.3 + i * 0.1), s * (0.72 + (i % 2) * 0.06), 2.2);
  },
  rescue: (p, s) => {
    heart(p, s / 2, s * 0.44, s * 0.18);
    for (let i = 0; i < 4; i++) p.stroke([{ x: s * (0.22 + i * 0.19), y: s * 0.2 }, { x: s * (0.22 + i * 0.19), y: s * 0.8 }], 3, C.sage, 1, false);
    p.stroke([{ x: s * 0.16, y: s * 0.7 }, { x: s * 0.84, y: s * 0.7 }], 4, C.sand, 1, false);
  },
  pearls: (p, s) => {
    const ball = ellipse(s / 2, s / 2, s * 0.22, s * 0.22, 20);
    inked(p, ball, C.white, 2.8);
    p.stipple(ball, 260, (x, y) => (x + y > s * 1.1 ? 0.7 : 0.03), 0.7);
    p.stroke([{ x: s * 0.4, y: s * 0.46 }, { x: s * 0.46, y: s * 0.37 }], 3.4, C.paper, 1, false);
  },
  stones: (p, s) => {
    pebble(p, s * 0.32, s * 0.6, s * 0.12);
    pebble(p, s * 0.56, s * 0.62, s * 0.12);
    pebble(p, s * 0.44, s * 0.4, s * 0.12);
    pebble(p, s * 0.72, s * 0.42, s * 0.09, C.paperGrey);
  },
  tide: (p, s) => {
    for (const y of [0.62, 0.74]) p.stroke(wave(s * y, s * 0.16, s * 0.84, 3.5, 2), 3, INK, 1, false);
    arrow(p, [{ x: s / 2, y: s * 0.18 }, { x: s / 2, y: s * 0.5 }], 3.4);
  },
};

function badge(ring: string, pic: Pic, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_PX;
  canvas.height = ICON_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  const p = new Pen(ctx, seed, 0.5);
  const disc = ellipse(ICON_PX / 2, ICON_PX / 2, ICON_PX / 2 - 5, ICON_PX / 2 - 5, 32);
  p.fill(disc, C.paper);
  p.closed(disc, 5, ring);
  p.closed(ellipse(ICON_PX / 2, ICON_PX / 2, ICON_PX / 2 - 2.5, ICON_PX / 2 - 2.5, 32), 1.6);
  p.clipped(disc, () => pic(p, ICON_PX));
  return canvas;
}

const urls = new Map<string, string>();
function cached(key: string, make: () => HTMLCanvasElement): string {
  let u = urls.get(key);
  if (!u) {
    u = make().toDataURL('image/png');
    urls.set(key, u);
  }
  return u;
}

/** A rule's badge as a data URL (made once). `cls` is the rule's class (sim's RULE_CLASS). */
export const ruleIconUrl = (rule: RuleKind, cls: RuleClass): string =>
  cached(`rule-${rule}`, () => badge(RING[cls], PICS[rule], 900 + rule.length * 7 + rule.charCodeAt(0)));

/** A goal's badge as a data URL. */
export const goalIconUrl = (goal: GoalKind): string => cached(`goal-${goal}`, () => badge(RING.goal, GOAL_PICS[goal], 950 + goal.length));
