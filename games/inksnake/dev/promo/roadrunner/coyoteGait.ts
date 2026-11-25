import { pt, type Pt } from './paint';

/**
 * The coyote's poses: joint angles (from straight down, + forward) for each
 * leg through a gallop's four key moments, the spine stretching and bunching
 * with it, and the skid when it brakes.
 */
export interface Limb {
  /** Upper bone, lower bone, the bone to the paw (radians from straight down, + forward). */
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

export interface CoyotePose {
  readonly at: Pt;
  readonly scale: number;
  readonly pitch: number;
  /** −1 bunched .. 1 stretched. */
  readonly stretch: number;
  /** The neck's and the head's angles off level (+ = down). */
  readonly neck: number;
  readonly head: number;
  /** Ears: 0 pricked .. 1 flat back. */
  readonly ears: number;
  /** The eye: 0 calm .. 1 wide. */
  readonly wide: number;
  /** Where the eye looks: along (+ forward) and down (+). */
  readonly look: Pt;
  /** The mouth: 0 shut .. 1 panting. */
  readonly jaw: number;
  /** 0 the head facing ahead .. 1 turned to look back over its shoulder. */
  readonly turn: number;
  /** The tail's angle off straight back (+ = down). */
  readonly tail: number;
  readonly front: readonly [Limb, Limb];
  readonly hind: readonly [Limb, Limb];
}

const limb = (a: number, b: number, c: number): Limb => ({ a, b, c });

/** Reaching, weight on it, pushed back, folded on the way forward. */
const FRONT: readonly Limb[] = [limb(0.2, 1.12, 1.0), limb(-0.5, 0.16, 0.02), limb(-0.9, -0.6, -0.8), limb(-0.4, 0.78, -1.15)];
const HIND: readonly Limb[] = [limb(1.0, -0.12, 0.72), limb(0.3, -0.6, 0.2), limb(-0.42, -1.0, -0.62), limb(0.4, -1.3, -0.2)];

function at(keys: readonly Limb[], phase: number): Limb {
  const f = (((phase % 1) + 1) % 1) * 4;
  const i = Math.floor(f);
  const t = f - i;
  const mix = (k: keyof Limb): number => {
    const [p0, p1, p2, p3] = [keys[(i + 3) % 4]![k], keys[i % 4]![k], keys[(i + 1) % 4]![k], keys[(i + 2) % 4]![k]];
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  };
  return limb(mix('a'), mix('b'), mix('c'));
}

/** The gallop at `phase` (0 = full stretch, every paw off the ground: forelegs reaching, hind legs flung back; 0.5 = gathered). */
export function gallop(place: { at: Pt; scale: number }, phase: number): CoyotePose {
  const w = phase * Math.PI * 2;
  return {
    at: pt(place.at.x, place.at.y - 20 * place.scale * Math.cos(w * 2)), scale: place.scale, pitch: 0.06 * Math.sin(w), stretch: Math.cos(w),
    neck: -0.2 + 0.08 * Math.sin(w), head: 0.1 - 0.06 * Math.sin(w), ears: 0.35, wide: 0, look: pt(0.4, 0), jaw: 0.6, turn: 0, tail: -0.02 + 0.14 * Math.sin(w + 1),
    front: [at(FRONT, phase + 0.97), at(FRONT, phase + 0.09)], hind: [at(HIND, phase + 0.45), at(HIND, phase + 0.56)],
  };
}

const blend = (a: Limb, b: Limb, k: number): Limb => limb(a.a + (b.a - a.a) * k, a.b + (b.b - a.b) * k, a.c + (b.c - a.c) * k);

const SKID_FRONT = [limb(0.0, 0.66, 0.78), limb(0.24, 1.02, 1.08)] as const;
const SKID_HIND = [limb(1.5, -0.5, 1.2), limb(1.3, -0.6, 1.12)] as const;

/** The gallop turning into a skid, `k` 0 .. 1: rump down, forelegs braced out in front, ears flat, eyes wide and down on `look`. */
export function skid(p: CoyotePose, k: number, turn: number, look: Pt): CoyotePose {
  const m = (a: number, b: number): number => a + (b - a) * k;
  return {
    ...p, at: pt(p.at.x, m(p.at.y, p.at.y + 66 * p.scale)), pitch: m(p.pitch, -0.36), stretch: m(p.stretch, -0.45), neck: m(p.neck, -0.5), head: m(p.head, 0.42), ears: m(p.ears, 1), wide: k,
    look: pt(m(p.look.x, look.x), m(p.look.y, look.y)), jaw: m(p.jaw, 0.05), turn, tail: m(p.tail, 0.75),
    front: [blend(p.front[0], SKID_FRONT[0], k), blend(p.front[1], SKID_FRONT[1], k)],
    hind: [blend(p.hind[0], SKID_HIND[0], k), blend(p.hind[1], SKID_HIND[1], k)],
  };
}
