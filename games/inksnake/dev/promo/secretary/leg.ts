import type { Rng } from '../../../src/logic/rng';
import { bezier, closed, type Draw, lerp, pt, ribbon } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { glaze, petalBlade } from '../../../src/art/critters/birdKit';
import { softPlumage } from './plumage';
import { SB } from './paint';

/**
 * One leg, side on, facing +x: black feathered "trousers" from the belly
 * down the tibia almost to the ankle (the backward-bending joint), then one
 * smooth bare limb, pale grey-pink and finely banded with scales, through
 * the ankle and down the long slim tarsus to a foot of short thick toes
 * with blunt claws. No pins at the joints: the limb is one ribbon, a little
 * fuller at the ankle.
 */
export type Grip = 'flat' | 'curl' | 'splay';

export interface BirdLeg {
  readonly foot: Pt;
  readonly grip: Grip;
  /** The toes' direction (radians, 0 = forward along the ground). */
  readonly toe?: number;
  /** Where the knee sits in the belly (the femur swings it forward for a kick). */
  readonly knee?: Pt;
}

export const L1 = 30;
export const L2 = 36;

/** The ankle for a knee and a foot: the two-bone solution that bends backwards. */
export function ankleOf(knee: Pt, foot: Pt): Pt {
  const dx = foot.x - knee.x;
  const dy = foot.y - knee.y;
  const full = Math.hypot(dx, dy);
  const d = Math.min(full, (L1 + L2) * 0.995);
  const ux = dx / full;
  const uy = dy / full;
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const p = pt(knee.x + ux * a, knee.y + uy * a);
  const c1 = pt(p.x - uy * h, p.y + ux * h);
  const c2 = pt(p.x + uy * h, p.y - ux * h);
  // Backwards: the ankle on the clockwise side of knee → foot (y down).
  const cross = (c: Pt): number => dx * (c.y - knee.y) - dy * (c.x - knee.x);
  return cross(c1) > cross(c2) ? c1 : c2;
}

/** Where the foot really lands: on the line to `foot`, never further than the leg reaches. */
export function reach(knee: Pt, foot: Pt): Pt {
  const dx = foot.x - knee.x;
  const dy = foot.y - knee.y;
  const d = Math.hypot(dx, dy);
  const max = (L1 + L2) * 0.995;
  return d <= max ? foot : pt(knee.x + (dx / d) * max, knee.y + (dy / d) * max);
}

function toes(d: Draw, at: Pt, l: BirdLeg, out: Pt[][]): void {
  const { pen } = d;
  const base = l.toe ?? 0;
  const curl = l.grip === 'curl' ? 0.7 : 0;
  const fan = l.grip === 'splay' ? 0.14 : 0.07;
  const lens = l.grip === 'curl' ? [5.6, 6.6, 5.2] : [7, 8.6, 6.6];
  const toe = (from: Pt, a: number, len: number, w0: number, bend: number): void => {
    const mid = pt(from.x + Math.cos(a) * len * 0.55, from.y + Math.sin(a) * len * 0.55);
    const tip = pt(mid.x + Math.cos(a + bend) * len * 0.45, mid.y + Math.sin(a + bend) * len * 0.45);
    const spine = bezier(from, mid, tip, 10);
    const shape = ribbon(spine, (u) => w0 * (1 - 0.35 * u)).shape;
    pen.fill(shape, SB.leg, 1);
    pen.clipped(shape, () => {
      pen.fill(shape.map((p) => pt(p.x + 0.4, p.y + 0.6)), SB.legDeep, 0.45);
      for (let k = 1; k < 6; k++) {
        const m = spine[Math.round((k / 6) * (spine.length - 1))]!;
        pen.hair([pt(m.x - Math.sin(a) * w0 * 0.5, m.y + Math.cos(a) * w0 * 0.5), pt(m.x + Math.sin(a) * w0 * 0.5, m.y - Math.cos(a) * w0 * 0.5)], 0.14, SB.scale, 0.7);
      }
    });
    pen.hair(closed(shape), 0.3, SB.line, 0.8);
    const ca = a + bend + 0.6;
    pen.stroke([tip, pt(tip.x + Math.cos(ca) * 1.5, tip.y + Math.sin(ca) * 1.5)], 1.5, SB.claw, 1, false);
    out.push(shape);
  };
  toe(at, Math.PI - base * 0.3 + 0.1, 3.6, 2.8, -curl * 0.5);
  lens.forEach((len, i) => toe(at, base + (i - 1) * fan + curl * 0.6, len, 3.2 - Math.abs(i - 1) * 0.3, curl * 0.8));
}

/** The leg from its knee. Returns its shapes (for shading a far leg). */
export function paintLeg(d: Draw, rng: Rng, knee: Pt, l: BirdLeg): Pt[][] {
  const { pen } = d;
  const f = reach(knee, l.foot);
  const ankle = ankleOf(knee, f);
  const out: Pt[][] = [];
  // The bare limb: lower tibia, a smooth ankle, the tarsus.
  const p0 = lerp(knee, ankle, 0.66);
  const spine = [...bezier(p0, lerp(p0, ankle, 0.6), lerp(p0, ankle, 0.88), 5), ...bezier(lerp(p0, ankle, 0.88), ankle, lerp(ankle, f, 0.14), 6).slice(1), ...bezier(lerp(ankle, f, 0.14), lerp(ankle, f, 0.6), f, 10).slice(1)];
  const n = spine.length - 1;
  const aI = 10 / n;
  const width = (u: number): number => (u < aI ? 4.4 + 0.6 * (u / aI) : 5 - (u - aI) / (1 - aI) * 2.4);
  const limb = ribbon(spine, width);
  pen.fill(limb.shape, SB.leg, 1);
  pen.clipped(limb.shape, () => {
    pen.fill(limb.shape.map((p) => pt(p.x + 0.8, p.y + 0.5)), SB.legDeep, 0.5);
    pen.fill(limb.shape.map((p) => pt(p.x - 1.1, p.y - 0.4)), SB.legLit, 0.45);
    glaze(d, ankle.x, ankle.y, 3.2, 2.6, 0, SB.legDeep, 0.35);
    // Scale bands across the tarsus, close-set, and the front row of scutes.
    for (let i = 11; i < n; i++) {
      for (const s of [0, 0.5]) {
        const a = limb.top[i]!;
        const b = limb.bot[i]!;
        const a2 = limb.top[Math.min(n, i + 1)]!;
        const b2 = limb.bot[Math.min(n, i + 1)]!;
        pen.hair([lerp(a, a2, s), lerp(b, b2, s)], 0.16, SB.scale, 0.75);
      }
    }
  });
  pen.hair(limb.top, 0.34, SB.line, 0.85);
  pen.hair(limb.bot, 0.4, SB.line, 0.9);
  out.push(limb.shape);
  toes(d, f, l, out);
  // The trousers: from inside the belly down to just above the ankle, feathered, with a ragged hem.
  const ang = Math.atan2(ankle.y - knee.y, ankle.x - knee.x);
  const top = pt(knee.x - Math.cos(ang) * 9, knee.y - Math.sin(ang) * 9);
  const hem = lerp(knee, ankle, 0.84);
  const axis = Array.from({ length: 10 }, (_, i) => lerp(top, hem, i / 9));
  const thigh = ribbon(axis, (u) => (u < 0.25 ? 12 + 20 * u : 17 - (u - 0.25) * 12)).shape;
  out.push(softPlumage(d, thigh, rng, { n: 46, size: 3.8, dir: () => ang, dark: true, tones: [SB.shadow, SB.black, SB.ink], line: 0.3 }));
  for (let i = 0; i < 6; i++) {
    const s = (i - 2.5) * 1.4;
    const q = pt(hem.x - Math.sin(ang) * s - Math.cos(ang) * 1.5, hem.y + Math.cos(ang) * s - Math.sin(ang) * 1.5);
    const tip = petalBlade(q, ang + (rng() - 0.5) * 0.5, 3.2 + rng() * 1.6, 2.3);
    pen.fill(tip.shape, SB.black, 0.92);
    pen.hair(tip.shape.slice(4, 12), 0.2, SB.sheen, 0.5);
  }
  return out;
}
