import { curveAt, ramp } from '../short';
import type { FoxPose, FoxState } from './stage';
import { AT, CUT, LOOP_S, RETURN } from './story';

/**
 * The Red Fox in the low shots: where its nose is on screen, how its head
 * is tilted (nose down to sniff, thrown back at the stink), its face. It
 * sniffs in over the hognose in frame 1, flinches as it rolls, leans in to
 * the gaping mouth, recoils from the musk, comes back to nudge it right
 * side up with its nose, jumps at the thud as it rolls back, gives up and
 * walks off to the right, and comes back for frame 1.
 */
interface Key {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly a: number;
}
const k = (t: number, x: number, y: number, a: number): Key => ({ t, x, y, a });

/** Frame 1: its nose just over the hognose's gaping mouth. */
export const HOOK_FOX = { x: 712, y: 1078, a: -0.46 } as const;
const GONE = { x: 1420, y: 820, a: -0.15 } as const;

const KEYS: readonly Key[] = [
  k(0, HOOK_FOX.x, HOOK_FOX.y, HOOK_FOX.a),
  k(CUT.arrive, HOOK_FOX.x, HOOK_FOX.y, HOOK_FOX.a),
  k(CUT.low, 770, 1100, -0.42),
  k(AT.rolls - 0.1, 760, 1110, -0.44),
  k(AT.rolls + 0.3, 820, 1040, -0.34),
  k(AT.tongue, 740, 1130, -0.46),
  k(AT.tongue + 0.6, 706, 1150, -0.5),
  k(AT.stinks - 0.05, 700, 1156, -0.52),
  k(AT.stinks + 0.2, 650, 920, 0.06),
  k(AT.stinks + 0.9, 670, 940, 0),
  k(AT.flip + 0.1, 690, 960, -0.1),
  k(AT.flip + 0.5, 430, 1236, -0.7),
  k(AT.backOver - 0.05, 430, 1236, -0.7),
  k(AT.backOver + 0.12, 392, 1262, -0.74),
  k(AT.backOver + 0.5, 520, 1130, -0.58),
  k(AT.back - 0.1, 540, 1112, -0.55),
  k(AT.back + 0.15, 660, 910, 0.02),
  k(AT.drama + 0.2, 690, 990, -0.3),
  k(AT.queen, 700, 990, -0.3),
  k(AT.queen + 0.7, GONE.x, GONE.y, GONE.a),
  k(RETURN, GONE.x, GONE.y, GONE.a),
  k(LOOP_S - 0.3, HOOK_FOX.x, HOOK_FOX.y, HOOK_FOX.a),
  k(LOOP_S, HOOK_FOX.x, HOOK_FOX.y, HOOK_FOX.a),
];

const field = (u: number, f: (q: Key) => number): number => curveAt(KEYS.map((q) => ({ t: q.t, at: f(q), rate: 0 })), u).at;
const hold = (u: number, from: number, to: number, fade: number): number => ramp(u, from, from + fade) * (1 - ramp(u, to - fade, to));

export function lowFoxAt(u: number): FoxState {
  const wince = Math.max(hold(u, AT.stinks - 0.02, AT.stinks + 0.8, 0.08), hold(u, AT.back + 0.03, AT.back + 0.6, 0.08));
  const sniffing = (u >= AT.tongue && u < AT.stinks) || (u >= AT.flip + 0.5 && u < AT.backOver + 0.1);
  const pose: FoxPose = wince > 0.5 ? 'startle' : sniffing ? 'sniff' : 'crouch';
  // Little sniffs: the nose bobbing.
  const bob = sniffing ? 5 * Math.sin(u * 26) * ramp(u, AT.tongue, AT.tongue + 0.3) : 0;
  return { x: field(u, (q) => q.x), y: field(u, (q) => q.y) + bob, heading: field(u, (q) => q.a), pose, wince };
}
