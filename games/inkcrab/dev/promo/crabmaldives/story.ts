import { clamp01, ramp, smooth, VIDEO } from '../short';
import { WORDS, type Word } from './words';

/**
 * "My Son Found His First Hermit Crab Here", told by Dewy (#150). Every beat
 * is a pure function of loop time, timed from the voice's words:
 *
 *  - the hook: Dewy's son (hold-crab) big on a Maldives beach, the atoll's
 *    painted backdrop behind him (beach 1's own layers), a crab in his paws;
 *  - "The Maldives!": the camera pulls back and pans along the lagoon to the
 *    water villas while a seaplane glides in low;
 *  - "A little shell… with LEGS.": a still shell on the sand, a beat, then the
 *    game's crab pops out of it (boing) and walks off;
 *  - "He was hooked.": the son (peek) nose to his crab, a heart;
 *  - "So when I made him a hermit crab game…": Dewy rises in, moved;
 *  - "level one HAD to be this beach.": the painted beach turns into the
 *    game's level 1 (the sand drops into a dug cross-section, the crab digs),
 *    Dewy proud with the level on his tablet;
 *  - "Seaplane, water villas, palm trees…": each one ringed in pen as it's named;
 *  - "the place it all began.": golden light, Dewy sinks away, the son hops
 *    back in front of the same lagoon, which is frame 1 again.
 */
export const LOOP_S = 18;

/** When a word of the voiceover begins (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`The script has no "${text}" (${nth})`);
  return w.start;
}

export const AT = {
  maldives: said('The'),
  pullFrom: 3.2,
  pullTo: 3.95,
  shellCut: 4.6,
  shell: said('shell…'),
  wiggle: said('with'),
  pop: said('LEGS.') - 0.1,
  walk: said('LEGS.') + 0.12,
  peekCut: 6.9,
  hooked: said('hooked.'),
  dewyIn: said('So') - 0.25,
  worldCut: 10.76,
  morphFrom: 11.0,
  morphTo: 11.75,
  proud: said('level') - 0.12,
  seaplane: said('Seaplane,'),
  villas: said('water'),
  palms: said('palm'),
  dewyOut: said('the') - 0.3,
  /** The level crossfades straight into the hook's picture of the son, in golden light. */
  backFrom: 16.15,
} as const;

/** Crossfade length between shots, and the slower one from the level back to the son. */
export const CUT_S = 0.18;
export const BACK_S = 0.45;

// ---------------------------------------------------------------- tracks

/** A value held between keys and eased (smoothstep) from one to the next: no overshoot. */
export type Track = readonly (readonly [number, number])[];

export function trackAt(keys: Track, t: number): number {
  if (t <= keys[0]![0]) return keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]!;
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]!;
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1]![1];
}

// ---------------------------------------------------------------- the beach (painted and in-game)

/**
 * The camera on the atoll: `s` screen px per backdrop design px, `ground`
 * the screen y of the beach's surface, `pan` design px panned to the right
 * (far layers follow less of it), `game` 0 painted beach … 1 the game's
 * level (its dug sand), `gold` the golden-hour light.
 */
export interface WorldCam {
  readonly s: number;
  readonly ground: number;
  readonly pan: number;
  readonly game: number;
  readonly gold: number;
}

/** Design x of the backdrop at the centre of the screen before any pan. */
export const CENTRE_X = 330;
/** Screen px per design px: the painted hook, and the level's backdrop (sky cropped, so the dig sits mid-frame). */
export const S_PAINTED = 2.4;
export const S_GAME = 2.2;
export const GROUND_PAINTED = 1100;
export const GROUND_GAME = 800;
/** "The Maldives!": in on the lagoon, its reef and water villas filling the frame. */
const S_LAGOON = 3.6;
const GROUND_LAGOON = 1500;
const PAN_LAGOON = 317;
/** The painted beach the level grows out of. */
const S_WIDE = 2.05;
const GROUND_WIDE = 1080;
const PAN = 200;
/** Behind the close-ups (shell, peek), so the camera can jump from the lagoon to the wide beach unseen. */
const UNSEEN = 4.9;
/** The hook's warm morning light; the ending's golden hour rises well above it and settles back. */
export const GOLD_BASE = 0.18;

export function worldCam(t: number): WorldCam {
  return {
    s: trackAt([[AT.pullFrom, S_PAINTED], [AT.pullTo, S_LAGOON], [UNSEEN, S_LAGOON], [UNSEEN + 0.01, S_WIDE], [AT.morphFrom, S_WIDE], [AT.morphTo, S_GAME]], t),
    ground: trackAt([[AT.pullFrom, GROUND_PAINTED], [AT.pullTo, GROUND_LAGOON], [UNSEEN, GROUND_LAGOON], [UNSEEN + 0.01, GROUND_WIDE], [AT.morphFrom, GROUND_WIDE], [AT.morphTo, GROUND_GAME]], t),
    pan: trackAt([[AT.pullFrom, 0], [AT.pullTo, PAN_LAGOON], [UNSEEN, PAN_LAGOON], [UNSEEN + 0.01, PAN]], t),
    game: trackAt([[AT.morphFrom, 0], [AT.morphTo, 1]], t),
    gold: goldAt(t),
  };
}

/** The golden hour: it floods in as the level fades into the son and eases back to the hook's morning by the loop point. */
export const goldAt = (t: number): number =>
  trackAt([[0, GOLD_BASE], [AT.backFrom, GOLD_BASE], [AT.backFrom + BACK_S, 1], [LOOP_S - 0.05, GOLD_BASE]], t);

/** The hook's camera (frame 1, and the ending the level fades into). */
export const hookCam = (t: number): WorldCam => ({ s: S_PAINTED, ground: GROUND_PAINTED, pan: 0, game: 0, gold: goldAt(t) });

/** How far each backdrop layer follows the pan (the foreground sand and the son follow all of it). */
export const PARALLAX: Readonly<Record<string, number>> = { sky: 0.3, clouds: 0.3, lagoon: 0.6, resort: 0.6, shore: 0.85 };

/** Screen x of design x `dx` on a layer that follows `k` of the pan. */
export const screenX = (cam: WorldCam, dx: number, k: number): number => VIDEO.width / 2 + (dx - CENTRE_X - cam.pan * k) * cam.s;

/** Where a backdrop layer's top sits on screen, as the game stacks them over the sand (backdropView.ts, at 2 design px per world px). */
export const layerTop = (cam: WorldCam, height: number, lift: number): number => cam.ground - (2 * lift + height) * cam.s;

// ---------------------------------------------------------------- the son

export type SonKeyUsed = 'hold-crab' | 'peek';

export interface SonPlace {
  readonly key: SonKeyUsed;
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly tilt: number;
  readonly alpha: number;
}

/** The son's hold-crab pose in the hook, at the painted camera: bottom centre and height. */
export const HOOK_SON = { y: 1700, height: 1050 } as const;

/** His idle: a slow breathe and a wondering sway, periodic in 1.5 s and 3 s so the loop point never jumps. */
function idle(t: number): { lift: number; tilt: number } {
  return {
    lift: 6 * Math.sin((2 * Math.PI * t) / 1.5),
    tilt: 0.022 * Math.sin((2 * Math.PI * t) / 3 + 0.6),
  };
}

/**
 * The son on the beach: placed in the world, so on "The Maldives!" the
 * camera's move into the lagoon slides him aside, off the bottom left.
 * He's on the beach in the hook only (and always in the hook shot itself).
 */
export function sonOnBeach(t: number, cam: WorldCam): SonPlace | null {
  if (t >= AT.shellCut + CUT_S && cam.pan !== 0) return null;
  if (t >= AT.shellCut + CUT_S && t < AT.backFrom) return null;
  const k = cam.s / S_PAINTED;
  const { lift, tilt } = idle(t);
  return {
    key: 'hold-crab',
    x: screenX(cam, CENTRE_X, 1),
    y: cam.ground + (HOOK_SON.y - GROUND_PAINTED) * k - lift,
    height: HOOK_SON.height * k,
    tilt,
    alpha: 1,
  };
}

/** The peek shot: the son nose to his crab; he shuffles up when Dewy rises in under him. */
export function sonPeek(t: number): SonPlace {
  const { lift } = idle(t);
  const giggle = window01(t, AT.peekCut + 0.1, said('He') - 0.05, 0.12) * Math.abs(Math.sin(t * 2 * Math.PI * 4.5)) * 14;
  // "hooked": he leans in, nose to the crab.
  const lean = ramp(t, AT.hooked - 0.3, AT.hooked + 0.15) * (1 - ramp(t, AT.hooked + 0.8, AT.hooked + 1.2));
  const up = ramp(t, AT.dewyIn - 0.1, AT.dewyIn + 0.45);
  return {
    key: 'peek',
    x: 560 + lean * 18,
    y: 1560 - 210 * up - lift - giggle,
    height: 820,
    tilt: 0.03 * lean + 0.015 * Math.sin(t * 2 * Math.PI * 4.5) * (giggle > 0 ? 1 : 0),
    alpha: 1,
  };
}

const window01 = (t: number, from: number, to: number, fade: number): number => Math.min(ramp(t, from, from + fade), 1 - ramp(t, to - fade, to));

// ---------------------------------------------------------------- the shell close-up

export interface ShellPlace {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
  /** 0 hidden in the shell … 1 out, with the pop's overshoot. */
  readonly out: number;
  /** Walking: the boil frame steps the legs, this lifts the shell a little each step. */
  readonly walking: boolean;
}

export const SHELL_GROUND = 1300;

/** An overshooting pop, 0 → 1. */
function boing(u: number): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return 1 + Math.sin(u * Math.PI * 2.5) * Math.exp(-u * 4.5) * 0.35 - Math.exp(-u * 12) * 1;
}

export function shellAt(t: number): ShellPlace {
  const walkU = clamp01((t - AT.walk) / 0.9);
  const walking = t > AT.walk;
  const step = walking ? Math.abs(Math.sin((t - AT.walk) * Math.PI * 4)) : 0;
  // A tiny rock on "with": something's in there.
  const rock = Math.sin((t - AT.wiggle) * Math.PI * 8) * Math.exp(-Math.max(0, t - AT.wiggle) * 5) * (t > AT.wiggle ? 0.05 : 0);
  return {
    x: 480 + 230 * walkU,
    y: SHELL_GROUND - step * 10,
    scale: 4.3,
    rotation: rock + (walking ? 0.03 * Math.sin((t - AT.walk) * Math.PI * 4) : 0),
    out: boing(clamp01((t - AT.pop) / 0.55)),
    walking,
  };
}

// ---------------------------------------------------------------- Dewy

export const DEWY = { x: 760, y: 1935, width: 660 } as const;

/** How far Dewy has sunk out of the frame as he leaves (px). */
export const dewyExit = (t: number): number => ramp(t, AT.dewyOut, AT.dewyOut + 0.5) * 900;

export const dewyOn = (t: number): boolean => t >= AT.dewyIn && t < AT.dewyOut + 0.55;

// ---------------------------------------------------------------- shots

/** `beach` follows worldCam (the hook, the lagoon, the level); `hook` is the hook's picture, which the level fades back into. */
export type ShotId = 'beach' | 'shell' | 'peek' | 'hook';

/** Which shot is under, and the next one fading in over it (`u` 0..1). */
export function shotsAt(t: number): { readonly under: ShotId; readonly over: ShotId | null; readonly u: number } {
  const cuts: readonly (readonly [number, ShotId, number])[] = [
    [AT.shellCut, 'shell', CUT_S], [AT.peekCut, 'peek', CUT_S], [AT.worldCut, 'beach', CUT_S], [AT.backFrom, 'hook', BACK_S],
  ];
  let under: ShotId = 'beach';
  for (const [at, id, len] of cuts) {
    if (t >= at + len) under = id;
    else if (t >= at) return { under, over: id, u: smooth((t - at) / len) };
  }
  return { under, over: null, u: 0 };
}

/** The camera a beach shot is drawn with. */
export const camOf = (id: ShotId, t: number): WorldCam => (id === 'hook' ? hookCam(t) : worldCam(t));

// ---------------------------------------------------------------- the pen rings in the game

export interface Ring {
  readonly at: number;
  readonly id: 'seaplane' | 'villas' | 'palm';
}
export const RINGS: readonly Ring[] = [
  { at: AT.seaplane, id: 'seaplane' },
  { at: AT.villas, id: 'villas' },
  { at: AT.palms, id: 'palm' },
];
/** How long a ring takes to draw on. */
export const RING_DRAW_S = 0.38;
/** All rings fade as the beach turns back. */
export const ringsAlpha = (t: number): number => 1 - ramp(t, AT.backFrom - 0.1, AT.backFrom + 0.3);

// ---------------------------------------------------------------- the seaplane

/** Screen place of the seaplane: gliding in low over the lagoon on "The Maldives!", crossing the game's sky in the level. */
export function seaplaneAt(t: number, cam: WorldCam): { x: number; y: number; scale: number; alpha: number } | null {
  if (t >= 3.1 && t < AT.shellCut + CUT_S) {
    // Gliding in low over the lagoon, mid-frame right on "Maldives".
    const u = (t - 3.1) / 1.7;
    return { x: 1420 - 1150 * u, y: 850 + 80 * smooth(u), scale: 3.8, alpha: 1 };
  }
  if (t >= AT.morphFrom && t < AT.backFrom + BACK_S) {
    const u = t - 12.2;
    // Its bounce when it's named.
    const named = t - AT.seaplane;
    const bounce = named > 0 ? Math.sin(named * Math.PI * 3) * Math.exp(-named * 3.5) * 26 : 0;
    return { x: 1150 - 175 * u, y: cam.ground - 105 + 4 * u - bounce, scale: 3.0 * (cam.s / S_GAME), alpha: 1 };
  }
  return null;
}

// ---------------------------------------------------------------- captions

interface Block {
  readonly rows: readonly (readonly [number, number])[];
}
/** Phrase captions: word index ranges per row. */
const BLOCKS: readonly Block[] = [
  { rows: [[0, 6], [7, 11]] },
  { rows: [[12, 13]] },
  { rows: [[14, 16], [17, 18]] },
  { rows: [[19, 21]] },
  { rows: [[22, 26], [27, 30]] },
  { rows: [[31, 35], [36, 37]] },
  { rows: [[38, 40], [41, 42]] },
  { rows: [[43, 47]] },
];
export const CAPTION_ROWS = [{ y: 432, size: 104 }, { y: 540, size: 104 }] as const;
/** Over the level, a little higher: the seaplane, villas and palms sit under them. */
export const CAPTION_ROWS_HIGH = [{ y: 352, size: 100 }, { y: 456, size: 100 }] as const;
const HIGH_BLOCKS = new Set([5, 6]);
const LEAD_S = 0.12;

export interface SpokenRow {
  readonly words: readonly string[];
  /** Index of the word being said (-1 none yet, words.length all said). */
  readonly current: number;
  readonly unsaid: number;
  readonly y: number;
  readonly size: number;
}

const startOf = (b: Block): number => WORDS[b.rows[0]![0]]!.start;

export function spokenAt(t: number): readonly SpokenRow[] {
  const i = BLOCKS.reduce((best, b, k) => (t >= startOf(b) - LEAD_S ? k : best), 0);
  const block = BLOCKS[i]!;
  return block.rows.map(([a, b], r) => {
    const words: readonly Word[] = WORDS.slice(a, b + 1);
    let current = -1;
    words.forEach((w, k) => {
      if (t >= w.start) current = k;
    });
    // A row whose words are all said keeps them in full ink, none of them hot.
    if (current === words.length - 1 && t > words[current]!.end + 0.08) current = words.length;
    return { words: words.map((w) => w.text), current, unsaid: i === 0 ? 1 : 0.55, ...(HIGH_BLOCKS.has(i) ? CAPTION_ROWS_HIGH : CAPTION_ROWS)[r]! };
  });
}

// ---------------------------------------------------------------- the credit

/**
 * Just over the captions (the low frame belongs to Dewy and the son); while
 * the level shows, down under its dig on the left, beside Dewy, since the
 * captions move up there. It crossfades between the two with the level.
 */
export const CREDIT = { text: 'InkCrab · 16bit.ink/crab', y: 328, size: 46, low: { x: 232, y: 1238 } } as const;

/** How much of the credit's (already faded) alpha is in its low place. */
export const creditLow = (t: number): number => ramp(t, AT.worldCut, AT.morphFrom) * (1 - ramp(t, AT.backFrom, AT.backFrom + BACK_S));

// ---------------------------------------------------------------- everything the picture shows at once (for the tests)

export interface PictureState {
  readonly shots: ReturnType<typeof shotsAt>;
  readonly cam: WorldCam;
  readonly son: SonPlace | null;
  readonly dewy: boolean;
  readonly plane: ReturnType<typeof seaplaneAt>;
}

/** The picture's state at loop time `t` (the captions aside: the voice runs on across the loop point). */
export function stateAt(t: number): PictureState {
  const shots = shotsAt(t);
  const top = shots.over && shots.u >= 1 ? shots.over : shots.under;
  const cam = camOf(top, t);
  // The hook shot is the beach shot at the hook's camera: the same picture.
  return { shots: { under: top === 'hook' ? 'beach' : top, over: null, u: 0 }, cam, son: sonOnBeach(t, cam), dewy: dewyOn(t), plane: seaplaneAt(t, cam) };
}
