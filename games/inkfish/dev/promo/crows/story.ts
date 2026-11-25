import { type Pt } from '../../../src/art/pen';
import { BOIL_FPS } from '../../../src/art/textures';
import { lerp, ramp } from '../short';
import { CROW, type CrowHead, type CrowPose, headToScreen, HIP } from './art/crow';
import { BILL_TIP, HOLD_GAPE, NUT_AT } from './art/crowHead';
import { CHUCKLE, LOOP_S, WORDS } from './words';

/**
 * "These crows use cars as nutcrackers!", beat by beat, every value a pure
 * function of loop time (shots.ts draws it). One mood a sentence:
 *
 * 1. hook (excited): low on the road, a huge tyre rolling in on the left, the
 *    crow big on the right, a walnut in its bill, its eye on us. It sets the
 *    nut down in front of the tyre and steps back.
 * 2. sendai (curious): the autumn street, the crow with its walnut.
 * 3. hard: "walnuts are too hard to crack", tok, tok, tok, and a glare.
 * 4. drop (mischief): from a wire it drops the nut on the road.
 * 5. wait: on the kerb, tapping a foot.
 * 6. crunch (dramatic): the tyre rolls over it, the shell bursts.
 * 7. missed (surprised): a car goes over, the nut between its wheels, whole.
 * 8. move: it pushes the nut along, right in front of a stopped car's TIRE.
 * 9. traffic (nervous): the cracked nut mid-road, cars whooshing both ways.
 * 10. laugh: a sly head tilt.
 * 11. crossing: waiting with the people at the crosswalk; the light turns,
 *    the cars stop, it walks across to its kernel.
 * 12. better (sarcastic): somebody crosses staring at a phone; the side-eye.
 * 13. again: the next nut, the next tyre, into frame 1.
 */

export { LOOP_S };

export const BOIL_STEPS = LOOP_S * BOIL_FPS;
export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;
export const boilAt = (t: number): number => Math.floor(wrap(t) * BOIL_FPS + 1e-9) % BOIL_STEPS;

/** When the nth `text` is said, in loop seconds. */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`no word "${text}" #${nth}`);
  return w.start;
}

export const AT = {
  cars: said('CARS'),
  nutcrackers: said('nutcrackers!'),
  in: said('In'),
  japan: said('Japan,'),
  walnuts: said('walnuts'),
  too: said('too'),
  hard: said('hard'),
  crack: said('crack.'),
  so: said('So'),
  drops: said('drops'),
  road: said('road…'),
  and: said('and'),
  waits: said('waits.'),
  crunch: said('CRUNCH!'),
  missed: said('Missed?'),
  it: said('It'),
  moves: said('moves'),
  nut: said('nut…'),
  right: said('right'),
  tire: said('TIRE!'),
  but: said('But'),
  lunch: said('lunch'),
  traffic: said('traffic…'),
  chuckle: CHUCKLE.start,
  so2: said('so'),
  wait: said('wait'),
  crosswalk: said('CROSSWALK,'),
  until: said('until'),
  cars2: said('cars'),
  stop: said('STOP!'),
  better: said('Better'),
  people: said('people'),
  because: said('because'),
} as const;

/** The tyre bites the shell. */
export const IMPACT = AT.crunch + 0.08;
/** The nut hits the road after the drop. */
export const LAND = AT.road - 0.02;
/** The pecks on the hard walnut. */
export const PECKS: readonly number[] = [AT.walnuts + 0.3, AT.too + 0.06, AT.crack - 0.06];
/** The kernel reached on the crossing. */
export const REACH = AT.stop + 0.26;
/** The close of the loop: the nut and the tyre coming back into frame 1's places. */
export const AGAIN = AT.because - 0.1;

// ---------------------------------------------------------------- scenes

export type SceneName = 'hook' | 'sendai' | 'hard' | 'drop' | 'wait' | 'crunch' | 'missed' | 'move' | 'traffic' | 'laugh' | 'crossing' | 'better' | 'again';

export const CUTS: readonly { readonly name: SceneName; readonly from: number }[] = [
  { name: 'hook', from: 0 },
  { name: 'sendai', from: AT.in - 0.1 },
  { name: 'hard', from: AT.walnuts - 0.12 },
  { name: 'drop', from: AT.so - 0.1 },
  { name: 'wait', from: AT.and - 0.06 },
  { name: 'crunch', from: AT.crunch - 0.16 },
  { name: 'missed', from: AT.missed - 0.12 },
  { name: 'move', from: AT.it - 0.08 },
  { name: 'traffic', from: AT.but - 0.1 },
  { name: 'laugh', from: AT.chuckle - 0.06 },
  { name: 'crossing', from: AT.so2 - 0.06 },
  { name: 'better', from: AT.better - 0.12 },
  { name: 'again', from: AGAIN },
];

export interface Scene { readonly name: SceneName; readonly u: number; readonly from: number; readonly to: number }

export function sceneAt(t: number): Scene {
  const u = wrap(t);
  let i = 0;
  while (i + 1 < CUTS.length && u >= CUTS[i + 1]!.from) i++;
  return { name: CUTS[i]!.name, u, from: CUTS[i]!.from, to: i + 1 < CUTS.length ? CUTS[i + 1]!.from : LOOP_S };
}
export const sceneFrom = (name: SceneName): number => CUTS.find((c) => c.name === name)!.from;

// ---------------------------------------------------------------- poses

const bump = (u: number, at: number, w: number): number => Math.exp(-(((u - at) / w) ** 2));

const mixHead = (a: CrowHead, b: CrowHead, u: number): CrowHead => ({
  x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), a: lerp(a.a, b.a, u), gape: lerp(a.gape, b.gape, u),
  look: { x: lerp(a.look.x, b.look.x, u), y: lerp(a.look.y, b.look.y, u) }, lid: lerp(a.lid, b.lid, u), brow: lerp(a.brow, b.brow, u), nut: u < 0.5 ? a.nut : b.nut,
});
export const mixPose = (a: CrowPose, b: CrowPose, u: number): CrowPose => ({
  x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), k: lerp(a.k, b.k, u), face: a.face, pitch: lerp(a.pitch, b.pitch, u), tail: lerp(a.tail, b.tail, u), hip: lerp(a.hip, b.hip, u),
  head: mixHead(a.head, b.head, u), step: lerp(a.step, b.step, u), walk: lerp(a.walk, b.walk, u), tap: lerp(a.tap, b.tap, u), ruffle: lerp(a.ruffle, b.ruffle, u), shadow: lerp(a.shadow, b.shadow, u),
});

/** A crow pose from the standing one, with its head changed too. */
export const pose = (p: Partial<Omit<CrowPose, 'head'>>, head: Partial<CrowHead> = {}): CrowPose => ({ ...CROW, ...p, head: { ...CROW.head, ...head } });

/** The head placed so a nut held in the bill sits at `at` on screen, for a pose standing at x, y. */
export function headForNut(p: { readonly x: number; readonly y: number; readonly k: number; readonly face: number; readonly hip?: number }, at: Pt, a: number): { readonly x: number; readonly y: number; readonly a: number } {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const nut = { x: ((at.x - p.x) * p.face) / p.k, y: (at.y - p.y) / p.k + (p.hip ?? HIP) };
  return { x: nut.x - (NUT_AT.x * c - NUT_AT.y * s), y: nut.y - (NUT_AT.x * s + NUT_AT.y * c), a };
}

/** The head placed so the shut bill's tip sits at `at` on screen. */
export function headForTip(p: { readonly x: number; readonly y: number; readonly k: number; readonly face: number }, at: Pt, a: number): { readonly x: number; readonly y: number; readonly a: number } {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const tip = { x: ((at.x - p.x) * p.face) / p.k, y: (at.y - p.y) / p.k + HIP };
  return { x: tip.x - (BILL_TIP.x * c - BILL_TIP.y * s), y: tip.y - (BILL_TIP.x * s + BILL_TIP.y * c), a };
}

// ---------------------------------------------------------------- 1 and 13: the hook

/** Time from the hook's start, negative in the loop's last second. */
export const hookTime = (t: number): number => { const u = wrap(t); return u >= AGAIN ? u - LOOP_S : u; };
const PRE = LOOP_S - AGAIN;

export const HOOK_WHEEL = { r: 510, y: 975, depth: 84 } as const;
/** Where the nut is set down. */
export const HOOK_NUT: Pt = { x: 452, y: 1406 };
export const HOOK_NUT_R = 90;

/** The hook wheel's middle: rolling in, then creeping up to the nut. */
export function hookWheelX(t: number): number {
  const h = hookTime(t);
  return h < 0 ? -146 - 560 * ((-h / PRE) ** 1.6) - 26 * -h : -146 + 26 * h + 8 * ramp(h, 1.5, 2.6);
}

const HOOK_STAND = { x: 946, y: 1566, k: 1.8, face: -1 } as const;
const breathe = (u: number, amp = 1): number => amp * Math.sin((2 * Math.PI * u) / 1.5);

/** Frame 1's pose: the nut held out just above the road in front of the tyre, the eye on us. */
export function hookPose(t: number): CrowPose {
  const h = hookTime(t);
  const base = pose({ ...HOOK_STAND, pitch: -0.36, tail: -0.12, shadow: 0.55 });
  const hold = { gape: HOLD_GAPE, nut: true, look: { x: -0.1, y: 0.1 }, brow: 0.15, lid: 0 };
  const frame1: CrowPose = { ...base, head: { ...base.head, ...hold, ...headForNut(HOOK_STAND, { x: 458, y: 1296 + breathe(h, 4) }, 0.46) } };
  const enter: CrowPose = { ...base, pitch: -0.62, head: { ...base.head, ...hold, look: { x: 0.5, y: 0 }, ...headForNut(HOOK_STAND, { x: 540, y: 1060 }, 0.12) } };
  const down: CrowPose = { ...base, pitch: -0.14, tail: 0.02, head: { ...base.head, ...hold, look: { x: 0.4, y: 0.4 }, ...headForNut(HOOK_STAND, { x: HOOK_NUT.x, y: HOOK_NUT.y - 6 }, 0.92) } };
  const free: CrowPose = { ...down, head: { ...down.head, nut: false, gape: 0.95 } };
  const back: CrowPose = pose({ ...HOOK_STAND, x: 1090, pitch: -0.6, tail: -0.16, shadow: 0.55 }, { x: 140, y: -186 + breathe(h, 3), a: 0.1, gape: 0.16, look: { x: 0, y: 0.05 }, brow: 0.3, nut: false });
  if (h < 0) return mixPose(enter, frame1, ramp(h, -PRE, -0.08));
  if (h < 0.4) return frame1;
  if (h < AT.cars) return mixPose(frame1, down, ramp(h, 0.4, AT.cars - 0.06));
  if (h < AT.cars + 0.2) return free;
  const u = ramp(h, AT.cars + 0.2, AT.nutcrackers + 0.1);
  const walk = Math.sin(Math.PI * u);
  return { ...mixPose(free, back, u), step: -6 * u, walk: 0.5 * walk };
}
/** Is the hook's nut on the road (set down)? */
export const hookNutDown = (t: number): boolean => { const h = hookTime(t); return h >= AT.cars; };

// ---------------------------------------------------------------- 2: Sendai

export function sendaiPose(t: number): CrowPose {
  const u = wrap(t);
  const turnAt = ramp(u, AT.in + 0.3, AT.japan + 0.1);
  return pose({ x: 560, y: 1385, k: 1.28, face: 1, pitch: -0.48, tail: 0.02, shadow: 0.5 }, {
    x: 136 + 6 * turnAt, y: -196 + breathe(u, 3), a: 0.02 - 0.16 * turnAt, gape: HOLD_GAPE, nut: true, look: { x: 0.2, y: -0.5 * turnAt }, brow: 0.1,
  });
}

// ---------------------------------------------------------------- 3: too hard

export const HARD_NUT: Pt = { x: 872, y: 1372 };
export const HARD_NUT_R = 96;

/** How hard the bill is on the shell: 1 at each peck. */
export const peckAt = (t: number): number => PECKS.reduce((m, p) => Math.max(m, bump(wrap(t), p, 0.045)), 0);

export function hardPose(t: number): CrowPose {
  const u = wrap(t);
  const st = { x: 400, y: 1450, k: 1.6, face: 1 } as const;
  const up = pose({ ...st, pitch: -0.3, tail: 0.04 }, { x: 176, y: -168, a: 0.5, look: { x: 0.4, y: 0.5 }, brow: 0.3 });
  const hit = pose({ ...st, pitch: -0.12, tail: 0.12 }, { ...headForTip(st, { x: HARD_NUT.x - 44, y: HARD_NUT.y - 58 }, 0.74), gape: 0.04, look: { x: 0.5, y: 0.5 }, brow: 0.7 });
  const cross = pose({ ...st, x: 378, pitch: -0.5, tail: 0.02 }, { x: 150, y: -198, a: 0.22 + 0.1 * Math.sin(u * 9), gape: 0.22, look: { x: 0.5, y: 0.6 }, brow: 1, lid: 0.18 });
  return mixPose(mixPose(up, hit, peckAt(t)), cross, ramp(u, AT.crack + 0.12, AT.crack + 0.36));
}
/** The nut's jolt and roll under the pecks. */
export function hardNut(t: number): { readonly at: Pt; readonly a: number } {
  const u = wrap(t);
  const jolts = PECKS.reduce((s, p) => s + (u > p ? Math.exp(-(u - p) * 9) * Math.sin((u - p) * 46) : 0), 0);
  return { at: { x: HARD_NUT.x + 10 * jolts, y: HARD_NUT.y - 4 * Math.abs(jolts) }, a: 0.14 + 0.16 * jolts };
}

// ---------------------------------------------------------------- 4 and 5: drop, wait

export const DROP_NUT_R = 54;
export const WIRE_Y = 958;

export function dropPose(t: number): CrowPose {
  const u = wrap(t);
  const open = ramp(u, AT.drops - 0.06, AT.drops + 0.04);
  const lean = ramp(u, AT.so, AT.drops - 0.1);
  const held = u < AT.drops;
  return pose({ x: 470, y: WIRE_Y + 4 * Math.sin(u * 5), k: 1.15, face: 1, pitch: -0.42 + 0.3 * lean, tail: 0.1 - 0.2 * lean, shadow: 0 }, {
    x: 136 + 44 * lean, y: -192 + 92 * lean, a: 0.05 + 0.6 * lean, gape: held ? HOLD_GAPE : 0.95 - 0.8 * ramp(u, AT.drops + 0.3, AT.road), nut: held, look: { x: 0.4, y: 0.5 * lean + (open > 0 ? 0.2 : 0) }, brow: 0.3,
  });
}
export const DROP_GROUND: Pt = { x: 856, y: 1428 };
/** The falling nut, or null while the bill holds it. */
export function dropNut(t: number): { readonly at: Pt; readonly a: number } | null {
  const u = wrap(t);
  if (u < AT.drops) return null;
  const from = headToScreen(dropPose(AT.drops - 1e-4), NUT_AT);
  if (u < LAND) {
    const v = (u - AT.drops) / (LAND - AT.drops);
    return { at: { x: lerp(from.x, DROP_GROUND.x, v), y: lerp(from.y, DROP_GROUND.y, v * v) }, a: 5 * v };
  }
  const b = u - LAND;
  const hop = b < 0.3 ? 4 * 150 * (b / 0.3) * (1 - b / 0.3) : b < 0.46 ? 4 * 40 * ((b - 0.3) / 0.16) * (1 - (b - 0.3) / 0.16) : 0;
  return { at: { x: DROP_GROUND.x + 60 * Math.min(1, b / 0.46), y: DROP_GROUND.y - hop }, a: 5 + 2 * Math.min(1, b / 0.46) };
}

export const WAIT_NUT: Pt = { x: 900, y: 1500 };
export function waitPose(t: number): CrowPose {
  const u = wrap(t);
  const v = u - sceneFrom('wait');
  const tap = Math.max(0, Math.sin(v * 17)) ** 0.7;
  return pose({ x: 430, y: 1352, k: 1.4, face: 1, pitch: -0.55, tail: 0.06, tap }, {
    x: 142, y: -200 + 3 * Math.sin(v * 17), a: 0.16 - 0.3 * ramp(u, AT.waits, AT.waits + 0.2), gape: 0.02, look: { x: 0.7, y: 0.5 - 0.9 * ramp(u, AT.waits, AT.waits + 0.2) }, brow: 0.7, lid: 0.22,
  });
}

// ---------------------------------------------------------------- 6: crunch

export const CRUNCH_NUT: Pt = { x: 560, y: 1396 };
export const CRUNCH_NUT_R = 96;
/** The road under the tyre. */
export const CRUNCH_GROUND = 1478;
export const CRUNCH_WHEEL = { r: 540, depth: 90 } as const;
/** The wheel's middle: rolling fast, lifting as it climbs on the nut, slowed as the shell gives, then on. */
export function crunchWheel(t: number): Pt {
  const d = wrap(t) - IMPACT;
  const over = CRUNCH_NUT.x - 150;
  const x = d < 0 ? over + 2100 * d : over + 170 * ramp(d, 0, 0.2) + Math.max(0, d - 0.17) * 1350;
  return { x, y: CRUNCH_GROUND - CRUNCH_WHEEL.r - 40 * Math.sin(Math.PI * ramp(d, -0.04, 0.2)) };
}
/** 0 whole .. 1 burst. */
export const burstAt = (t: number): number => { const s = sceneAt(t); return s.name === 'crunch' ? Math.max(0, Math.min(1, (s.u - IMPACT) / 0.75)) : 0; };
/** The two half shells thrown out from under the tyre, towards us: where, how big and how turned. */
export function shellAt(t: number, side: -1 | 1): { readonly at: Pt; readonly r: number; readonly a: number } {
  const s = Math.min(1, burstAt(t) / 0.5);
  const out = 1 - (1 - s) ** 2;
  return {
    at: { x: CRUNCH_NUT.x + side * (30 + 280 * out), y: CRUNCH_GROUND - 30 + 120 * out - 4 * 120 * s * (1 - s) },
    r: 84 + 52 * out, a: side * (0.2 + 2.6 * (1 - out)) - (side < 0 ? 0.1 : 0),
  };
}
/** The kernel popping up towards us and landing. */
export function kernelAt(t: number): { readonly at: Pt; readonly a: number; readonly r: number } {
  const h = Math.min(1, burstAt(t) * 1.15);
  const out = 1 - (1 - h) ** 2;
  return { at: { x: CRUNCH_NUT.x - 10 * h, y: CRUNCH_GROUND - 40 + 110 * h - 4 * 400 * h * (1 - h) }, a: 0.2 - 6.2 * (1 - out), r: lerp(96, 205, Math.min(1, out * 1.1)) };
}

/** A jolt of the picture: each peck a little, the crunch a lot. */
export function shakeAt(t: number): Pt {
  const u = wrap(t);
  const s = sceneAt(t).name;
  const d = u - IMPACT;
  if (s === 'crunch' && d >= 0) return { x: 26 * Math.exp(-d * 5) * Math.sin(d * 70), y: 34 * Math.exp(-d * 5) * Math.cos(d * 58) };
  if (s === 'hard') return { x: 0, y: 7 * peckAt(t) };
  return { x: 0, y: 0 };
}

// ---------------------------------------------------------------- 7 and 8: missed, moved

/** The car that misses: how far through its pass (0 coming .. 1 over us and gone). */
export const missAt = (t: number): number => Math.max(0, Math.min(1, (wrap(t) - sceneFrom('missed')) / 0.46));
export const MISS_NUT: Pt = { x: 380, y: 1420 };
export const MISS_CROW_Y = 1230;
export function missPose(t: number): CrowPose {
  const u = wrap(t);
  const blink = bump(u, AT.missed + 0.42, 0.06);
  const after = ramp(u, AT.missed + 0.2, AT.missed + 0.46);
  return pose({ x: 1430 - 530 * after, y: MISS_CROW_Y - 70 * Math.sin(Math.PI * after), k: 1.12, face: -1, pitch: -0.6 + 0.14 * after, tail: -0.08, ruffle: after < 1 ? 1 : 0.2, step: -4 * after, walk: 0.5 * Math.sin(Math.PI * after) }, {
    x: 112 + 44 * after, y: -196 + 20 * after, a: 0.1 + 0.26 * after, gape: 0.34 * after, look: { x: 0.5, y: 0.6 }, brow: 0.9, lid: blink,
  });
}

export const MOVE_WHEEL = { x: 1196, y: 958, r: 480, depth: 84 } as const;
export const MOVE_NUT = { from: 560, to: 818, y: 1398, r: 66 } as const;
/** The pushed nut: along the road, then stopped against the tyre's front. */
export function moveNut(t: number): { readonly at: Pt; readonly a: number } {
  const u = ramp(wrap(t), AT.moves - 0.06, AT.tire - 0.06);
  const x = lerp(MOVE_NUT.from, MOVE_NUT.to, u);
  return { at: { x, y: MOVE_NUT.y }, a: (x - MOVE_NUT.from) / MOVE_NUT.r };
}
export function movePose(t: number): CrowPose {
  const u = wrap(t);
  const go = ramp(u, AT.moves - 0.06, AT.tire - 0.06);
  const n = moveNut(t).at;
  const st = { x: n.x - 500, y: 1446, k: 1.26, face: 1 } as const;
  // Pushing: the shut bill's tip just behind the nut.
  const h = headForTip(st, { x: n.x - 58, y: n.y - 18 }, 0.7);
  const moving = Math.sin(Math.PI * Math.max(0, Math.min(1, (u - AT.moves + 0.1) / (AT.tire - AT.moves))));
  const push = pose({ ...st, pitch: 0.16, tail: -0.02, step: go * 17, walk: 0.7 * moving }, { ...h, gape: 0.02, look: { x: 0.6, y: 0.5 }, brow: 0.5 });
  const proud = pose({ ...st, x: st.x - 100, pitch: -0.56, tail: 0.04 }, { x: 148, y: -196, a: 0.12, gape: 0.14, look: { x: 0, y: 0.05 }, brow: 0.25 });
  return mixPose(push, proud, ramp(u, AT.tire + 0.05, AT.tire + 0.32));
}

// ---------------------------------------------------------------- 9 and 10: traffic, the laugh

export interface Pass { readonly from: number; readonly lane: 'near' | 'far'; readonly dir: 1 | -1; readonly colour: 'red' | 'blue' | 'cream' | 'teal' | 'yellow' }
/** Cars across the picture, each taking PASS_S: near lane to the left, far lane to the right (Japan drives on the left). */
export const PASS_S = 0.62;
export const PASSES: readonly Pass[] = [
  { from: AT.but - 0.3, lane: 'far', dir: 1, colour: 'teal' },
  { from: AT.but - 0.12, lane: 'near', dir: -1, colour: 'blue' },
  { from: AT.but + 0.15, lane: 'far', dir: 1, colour: 'yellow' },
  { from: AT.but + 0.36, lane: 'near', dir: -1, colour: 'cream' },
  { from: AT.but + 0.62, lane: 'far', dir: 1, colour: 'red' },
  { from: AT.but + 0.84, lane: 'near', dir: -1, colour: 'yellow' },
  { from: AT.but + 1.08, lane: 'far', dir: 1, colour: 'cream' },
  { from: AT.but + 1.32, lane: 'near', dir: -1, colour: 'red' },
  { from: AT.but + 1.54, lane: 'far', dir: 1, colour: 'blue' },
  { from: AT.but + 1.78, lane: 'near', dir: -1, colour: 'teal' },
];
export const passAt = (p: Pass, t: number): number => (wrap(t) - p.from) / PASS_S;

export function trafficPose(t: number): CrowPose {
  const u = wrap(t);
  const near = PASSES.filter((p) => p.lane === 'near').reduce((m, p) => Math.max(m, bump(passAt(p, t), 0.5, 0.3)), 0);
  const lean = ramp(u, AT.but, AT.lunch);
  return pose({ x: 236, y: 1560, k: 1.3, face: 1, pitch: -0.34 + 0.18 * lean, tail: 0.02, ruffle: near }, {
    x: 168 + 24 * lean - 10 * near, y: -150 + 12 * near, a: 0.2 + 0.08 * near - 0.14 * Math.sin(u * 4), gape: 0.12 + 0.12 * near, look: { x: 0.7, y: 0.1 }, brow: 0.35 * (1 - near), lid: 0.35 * near,
  });
}

export function laughPose(t: number): CrowPose {
  const v = wrap(t) - sceneFrom('laugh');
  const ha = Math.abs(Math.sin(v * 21));
  return pose({ x: 190, y: 1900, k: 2.75, face: 1, pitch: -0.55, shadow: 0 }, { x: 128, y: -196 + 5 * ha, a: -0.08 - 0.1 * ramp(v, 0, 0.3), gape: 0.14 + 0.24 * ha, look: { x: -0.3, y: 0.1 }, brow: 0.45, lid: 0.34 });
}

// ---------------------------------------------------------------- 11: the crossing

export const CROSS_NUT: Pt = { x: 936, y: 1368 };
export const greenAt = (t: number): number => ramp(wrap(t), AT.until - 0.02, AT.until + 0.06);
/** The waiting cars' approach, 0 far .. 1 stopped behind the line. */
export const stopAt = (t: number): number => ramp(wrap(t), AT.until - 0.1, AT.stop + 0.06);
/** The last car through on red, 0 .. 1. */
export const lastCarAt = (t: number): number => (wrap(t) - (AT.so2 - 0.1)) / 1.15;
export function crossPose(t: number): CrowPose {
  const u = wrap(t);
  const go = ramp(u, AT.cars2 - 0.04, REACH - 0.06);
  const st = { x: 440 + 240 * go, y: 1400 + 14 * Math.min(1, 3 * go), k: 0.9, face: 1 } as const;
  const wait = pose({ ...st, pitch: -0.5, tail: 0.06, shadow: 0.5 }, { x: 140, y: -198, a: -0.06 + 0.05 * Math.sin(u * 3), look: { x: 0.4, y: -0.3 }, brow: 0.15 });
  const h = headForNut(st, { x: CROSS_NUT.x - 6, y: CROSS_NUT.y - 26 }, 0.7);
  const eat = pose({ ...st, pitch: -0.14, tail: 0.06 }, { ...h, gape: 0.35, look: { x: 0.5, y: 0.5 }, brow: 0.1 });
  const moving = u > AT.cars2 - 0.04 && u < REACH ? 1 : 0;
  return { ...mixPose(wait, eat, ramp(u, REACH - 0.24, REACH)), step: go * 13, walk: 0.8 * moving * Math.sin(Math.PI * Math.max(0.04, Math.min(0.96, go))) };
}

// ---------------------------------------------------------------- 12: better than most people

/** How far the phone walker has come across, 0 .. 1. */
export const walkerAt = (t: number): number => (wrap(t) - sceneFrom('better')) / (AGAIN - sceneFrom('better'));
export function betterPose(t: number): CrowPose {
  const u = wrap(t);
  const side = ramp(u, AT.people - 0.1, AT.people + 0.12);
  return pose({ x: 96, y: 1770, k: 2.05, face: 1, pitch: -0.55, shadow: 0 }, { x: 132, y: -196, a: 0.02 + 0.06 * side, look: { x: 0.9 - 1.1 * side, y: 0 }, brow: 0.35 + 0.45 * side, lid: 0.12 + 0.3 * side });
}
