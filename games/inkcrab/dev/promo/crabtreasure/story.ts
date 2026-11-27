import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { inVoice, LAUGH, LINE_WORDS, WORDS, type Word } from './words';

/**
 * "My son loves two things, so I made him a game", told by Dewy: every beat
 * a pure function of loop time, timed from the voice's words (words.ts).
 *
 * The hook (frame 1) is the son's world: white coral sand under a bright
 * Maldives sky, the son digging with sand flying off his spade, and right by
 * his hole the game's hermit crab peeking out of its shell. The crab pops
 * out and scuttles ("Hermit crabs…"), he peeks at it nose down, digs again
 * and his spade hits a glint ("TREASURE!"); the crab turns to it ("?"), and
 * a big pearly top shell comes up, held high ("A BIGGER shell!"). The crab
 * is crammed in its little shell ("It can't grow its own…"), so when he sets
 * the big one down by it, it moves house the game's way ("FIND one"). Then
 * the beach opens into the game itself (beach 1's backdrop over diggable
 * sand) as Dewy rises with his tablet: the crab digs down, uncovers a buried
 * shell and moves in. He laughs, leaves, and the picture dissolves back to
 * frame 1 while "And it all started because…" runs into "My son loves two things."
 */
export const LOOP_S = 18;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`The script has no "${text}" (${nth})`);
  return inVoice(w.start);
}

export const AT = {
  things: said('things.'),
  hermit: said('Hermit'),
  and: said('and'),
  treasure: said('TREASURE!'),
  so: said('So'),
  crabQ: said('crab?'),
  a: said('A'),
  bigger: said('BIGGER'),
  shell: said('shell!'),
  it: said('It'),
  soFind: said('so'),
  find: said('FIND'),
  built: said('So', 2),
  game: said('game'),
  crab: said('crab…'),
  digging: said('digging', 2),
  next: said('next'),
  home: said('home.'),
  laugh: LAUGH.start,
  started: said('And'),
  /** The beach opens into the game. */
  wipe: said('So', 2) - 0.12,
  /** The game dissolves back into frame 1, done a little before the loop point. */
  back: 16.95,
  backDone: LOOP_S - 0.15,
} as const;
export const WIPE_S = 0.5;

// ---------------------------------------------------------------- shots

export type SceneId = 'beach' | 'game';
export interface Shots {
  readonly under: SceneId;
  readonly over: SceneId | null;
  readonly how: 'iris' | 'fade';
  /** 0..1 through the change. */
  readonly u: number;
}

export function shotsAt(time: number): Shots {
  const t = wrap(time);
  if (t < AT.wipe) return { under: 'beach', over: null, how: 'fade', u: 0 };
  if (t < AT.wipe + WIPE_S) return { under: 'beach', over: 'game', how: 'iris', u: smooth((t - AT.wipe) / WIPE_S) };
  if (t < AT.back) return { under: 'game', over: null, how: 'fade', u: 0 };
  if (t < AT.backDone) return { under: 'game', over: 'beach', how: 'fade', u: smooth((t - AT.back) / (AT.backDone - AT.back)) };
  return { under: 'beach', over: null, how: 'fade', u: 0 };
}

const wrap = (time: number): number => ((time % LOOP_S) + LOOP_S) % LOOP_S;

/**
 * The beach's own clock: loop time early on, and time before the loop point
 * (negative) once the story has moved on, so the dissolve back lands on the
 * very frames the loop starts with.
 */
export const beachTime = (time: number): number => {
  const t = wrap(time);
  return t < LOOP_S / 2 + 4 ? t : t - LOOP_S;
};

// ---------------------------------------------------------------- the beach set (scene px at zoom 1)

/** Screen px per son-art px: every pose drawn at one scale, so his size never jumps. */
export const SON_SCALE = 0.6686;
export type SonKey = 'dig' | 'peek' | 'trophy';
/** Art size of each pose (son/art/*.png). */
export const SON_ART: Readonly<Record<SonKey, { readonly w: number; readonly h: number }>> = {
  dig: { w: 1238, h: 1346 },
  peek: { w: 1310, h: 1061 },
  trophy: { w: 1043, h: 1387 },
};
/** Bottom centre of each pose. */
export const SON_AT: Readonly<Record<SonKey, { readonly x: number; readonly y: number }>> = {
  dig: { x: 480, y: 1480 },
  peek: { x: 580, y: 1500 },
  trophy: { x: 350, y: 1490 },
};
/** A point of a pose's art, on screen at its anchor. */
export function sonPoint(key: SonKey, px: number, py: number, at = SON_AT[key]): { readonly x: number; readonly y: number } {
  return { x: at.x + (px - SON_ART[key].w / 2) * SON_SCALE, y: at.y - (SON_ART[key].h - py) * SON_SCALE };
}
/** Where the spade goes in (dig.png's blade tip): the hole. */
export const HOLE = sonPoint('dig', 820, 1200);
/** The painted shell in trophy.png's raised paw (its middle), which the game's shell is drawn over. */
export const PAW_SHELL = sonPoint('trophy', 895, 300);
/** Where the shell's base rests in his paw. */
export const PAW_GRIP = sonPoint('trophy', 1010, 500);
/** The painted shell in trophy.png, erased so only the game's shell shows. */
export const TROPHY_SHELL = { x: 915, y: 300, rx: 205, ry: 192 } as const;
/** The painted crab in peek.png, erased so only the game's crab shows. */
export const PEEK_CRAB = { x: 1025, y: 845, rx: 250, ry: 175 } as const;
/** The crab's ground, in front of the son's patch of sand. */
export const CRAB_Y = 1470;
/** Drawn widths of the two shells on the beach (the game's sizes 3 and 5, scaled alike). */
export const W_SMALL = 340;
export const W_BIG = 460;

export interface SonLayer {
  readonly key: SonKey;
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
  readonly tilt: number;
  /** Squash (scale-y deviation, about the bottom), for the dig's push on the spade. */
  readonly squash: number;
}

/** A dig stroke every DIG_S: 30 a loop, so the hook's motion runs straight on across the loop point. */
export const DIG_S = 0.6;
/** How hard he digs (0 still .. 1 full strokes) at beach time τ. */
export function digEffort(tau: number): number {
  if (tau < AT.hermit) return 1;
  if (tau < AT.and) return 0;
  // Faster and harder towards the find, then he stops dead when the spade hits it.
  return window01(tau, AT.and + 0.1, AT.treasure + 0.06, 0.15);
}
/** The phase of the dig stroke (0..1) and how far down the spade is pushed. */
export function digStroke(tau: number): { readonly phase: number; readonly push: number } {
  const phase = (((tau / DIG_S) % 1) + 1) % 1;
  const push = Math.sin(Math.PI * Math.min(1, phase / 0.45)) * (phase < 0.45 ? 1 : 0);
  return { phase, push };
}

/** His poses in order, each at its spot: [pose, where, start of the crossfade into it, seconds]. */
const SON_SEGMENTS: readonly (readonly [SonKey, { readonly x: number; readonly y: number }, number, number])[] = [
  ['dig', SON_AT.dig, -Infinity, 0],
  // Scoots up to the crab, nose down.
  ['peek', SON_AT.peek, AT.hermit + 0.05, 0.3],
  ['dig', SON_AT.dig, AT.and - 0.05, 0.25],
  // Up he jumps as it comes out of the sand.
  ['trophy', SON_AT.trophy, AT.a - 0.04, 0.25],
  // Down on his knees again, a little to the left, having set it on the open sand in front of him.
  ['dig', { x: 240, y: 1480 }, AT.soFind, 0.35],
];

export function sonAt(tau: number): readonly SonLayer[] {
  let i = 0;
  SON_SEGMENTS.forEach((s, k) => {
    if (tau >= s[2]) i = k;
  });
  const [key, to, start, seconds] = SON_SEGMENTS[i]!;
  const layer = (k: SonKey, alpha: number, at: { x: number; y: number }): SonLayer => ({ key: k, alpha, ...pose(k, tau, at) });
  if (i === 0 || tau >= start + seconds) return [layer(key, 1, to)];
  // Both drawings slide together from one spot to the other (a scoot, a hop up), crossfading.
  const [prev, from] = SON_SEGMENTS[i - 1]!;
  const u = smooth((tau - start) / seconds);
  const at = { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) };
  return [layer(prev, Math.min(1, 2 * (1 - u)), at), layer(key, Math.min(1, 2 * u), at)];
}

function pose(key: SonKey, tau: number, at: { x: number; y: number }): Omit<SonLayer, 'key' | 'alpha'> {
  if (key === 'dig') {
    const effort = digEffort(tau);
    const { push } = digStroke(tau);
    // After the spade hits, he holds still, leaning in a touch.
    const held = ramp(tau, AT.treasure, AT.treasure + 0.12) * (1 - ramp(tau, AT.bigger - 0.1, AT.bigger + 0.2));
    return { x: at.x, y: at.y, tilt: 0.035 * push * effort + 0.02 * held, squash: -0.025 * push * effort };
  }
  if (key === 'peek') {
    // Nose down at the crab, a curious little tilt.
    return { x: at.x, y: at.y, tilt: 0.02 * Math.sin((2 * Math.PI * tau) / 1.5), squash: 0.008 * Math.sin((2 * Math.PI * tau) / 0.75) };
  }
  // Holding it high: a hop on "shell!", then a happy bob.
  const hop = Math.sin(Math.PI * clamp01((tau - AT.shell + 0.05) / 0.38));
  return { x: at.x, y: at.y - 46 * hop, tilt: -0.02 * hop + 0.015 * Math.sin((2 * Math.PI * tau) / 0.75), squash: 0.03 * hop };
}

// ---------------------------------------------------------------- the beach crab

export type ShellId = 'small' | 'big';

/** The crab on the beach: its shell's middle (mx), facing, how far out it is, and how it moves. */
export interface BeachCrab {
  readonly mx: number;
  /** Its ground (screen y). */
  readonly y: number;
  readonly facing: 1 | -1;
  readonly reach: number;
  readonly walking: boolean;
  /** Its body against its shell: the game's FULL at its cap, more when it has outgrown it. */
  readonly fill: number;
  readonly squash: number;
  /** The shell rocking: the game's "stuck" shrug. */
  readonly rock: number;
  /** In the middle of moving house: 0..1, or null. */
  readonly swap: number | null;
  readonly shell: ShellId;
}

export const CRAB_X = { start: 915, after: 890 } as const;
/** Where it walks to meet the big shell's opening: forward onto open sand, in front of the son. */
export const MEET = { mx: 920, y: 1650 } as const;
export const SCUTTLE = { from: AT.hermit + 0.17, to: AT.hermit + 0.6 } as const;
/** Moving house: the game's one-second swap, the crab slipping across on "FIND". */
export const SWAP = { from: AT.find - 0.3, to: AT.find + 0.7 } as const;
/** The big shell set down by the son, mouth to mouth with the crab's. */
export const SET_DOWN = { from: AT.soFind - 0.02, to: AT.soFind + 0.4 } as const;
/** The crab walks over to the opening as the shell lands. */
export const TO_SHELL = { from: AT.soFind + 0.12, to: SWAP.from - 0.03 } as const;
/** When the crab turns: [time, facing]. */
const TURNS: readonly (readonly [number, 1 | -1])[] = [
  [AT.and + 0.22, 1],
  [AT.so + 0.05, -1],
  [TO_SHELL.from, 1],
  [TO_SHELL.to, -1],
];
/** "It can't grow its own…": crammed in. */
export const SQUEEZE = { from: AT.it - 0.15, to: SWAP.from } as const;

/** How crammed the crab is (0..1). */
export const squeezeAt = (tau: number): number => window01(tau, SQUEEZE.from, SQUEEZE.to + 0.05, 0.3);

export function beachCrabAt(tau: number): BeachCrab {
  let facing: 1 | -1 = -1;
  for (const [at, f] of TURNS) if (tau >= at) facing = f;
  const walk = ramp(tau, TO_SHELL.from, TO_SHELL.to);
  const mx = lerp(lerp(CRAB_X.start, CRAB_X.after, ramp(tau, SCUTTLE.from, SCUTTLE.to)), MEET.mx, walk);
  const y = lerp(CRAB_Y, MEET.y, walk);
  const walking = (tau > SCUTTLE.from && tau < SCUTTLE.to) || (tau > TO_SHELL.from && tau < TO_SHELL.to);
  // Peeking out (frame 1), legs out on "Hermit crabs".
  const peek = 0.42 + 0.05 * Math.sin((2 * Math.PI * tau) / 2);
  // Shy of the flying sand while he digs, it pulls in (and turns round inside); it comes out again for the glint.
  const tuck = window01(tau, AT.and + 0.05, AT.so + 0.12, 0.15);
  const reach = lerp(peek, 1, ramp(tau, AT.hermit - 0.05, AT.hermit + 0.15)) * (1 - 0.85 * tuck);
  const squeeze = squeezeAt(tau);
  const fill = 0.95 + 0.3 * squeeze;
  const squash = squeeze * 0.05 * Math.sin(2 * Math.PI * tau * 3);
  const shrug = (at: number): number => (tau > at && tau < at + 0.42 ? Math.sin(((tau - at) / 0.14) * 2 * Math.PI) * 0.1 : 0);
  const rock = squeeze * (shrug(AT.it + 0.1) + shrug(said('own…') - 0.05));
  if (tau >= SWAP.from) {
    const p = clamp01((tau - SWAP.from) / (SWAP.to - SWAP.from));
    return { mx, y, facing, reach: 1, walking: false, fill: 0.95, squash: 0, rock: 0, swap: p < 1 ? p : null, shell: p < 1 ? 'small' : 'big' };
  }
  return { mx, y, facing, reach, walking, fill, squash, rock, swap: null, shell: 'small' };
}

/** The glint where the spade hits, and the "?" over the crab. */
export const glintAt = (tau: number): number => window01(tau, AT.treasure - 0.02, AT.a + 0.1, 0.12);
export const puzzleAt = (tau: number): number => window01(tau, AT.so + 0.25, AT.a - 0.05, 0.2);

/** The treasure shell: rising out of the hole, raised in his paw, then set down by the crab. */
export interface Treasure {
  readonly where: 'hole' | 'paw' | 'down' | 'none';
  /** 0..1 along the move into `where` (rising out of the sand; swung down to the sand). */
  readonly u: number;
  readonly sparkle: number;
}
export const RISE = { from: AT.a, to: AT.bigger + 0.25 } as const;
export function treasureAt(tau: number): Treasure {
  const sparkle = window01(tau, AT.bigger - 0.1, AT.shell + 0.5, 0.2);
  if (tau < RISE.from || tau > 12) return { where: 'none', u: 0, sparkle: 0 };
  if (tau < RISE.to) return { where: 'hole', u: smooth((tau - RISE.from) / (RISE.to - RISE.from)), sparkle };
  if (tau < SET_DOWN.from) return { where: 'paw', u: 1, sparkle };
  return { where: 'down', u: smooth((tau - SET_DOWN.from) / (SET_DOWN.to - SET_DOWN.from)), sparkle: 0 };
}

/** The camera on the beach: a push in on the crammed crab, and back out for the move. */
export interface Cam {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}
export function beachCam(tau: number): Cam {
  const push = window01(tau, SQUEEZE.from, SET_DOWN.from + 0.1, 0.45);
  return { x: lerp(540, 870, push), y: lerp(960, 1400, push), zoom: 1 + 0.15 * push };
}

// ---------------------------------------------------------------- the game

/** The game's view: tile size on screen, the grid's corner, the sand's surface row. */
export const G = { tile: 360, ox: -150, oy: 640, surface: 1, cols: 4 } as const;
/** World px per tile in the game (TILE_PX). */
export const TILE_WORLD = 16;
export const ZOOM = G.tile / TILE_WORLD;
/** Screen x of a column's left edge, y of a row's top. */
export const colX = (c: number): number => G.ox + c * G.tile;
export const rowY = (r: number): number => G.oy + r * G.tile;

/** Dig events: [time, tiles dug as [col, row]]. The shaft is two tiles wide (the crab is more than one). */
export const DIGS: readonly (readonly [number, readonly (readonly [number, number])[]])[] = [
  [AT.digging + 0.04, [[0, 1], [1, 1]]],
  [AT.next - 0.04, [[2, 1]]],
  // The rest of the buried shell's tile opens: it's uncovered.
  [AT.next + 0.12, [[3, 1]]],
];
export const UNCOVER = DIGS[DIGS.length - 1]![0];
/** How many dig events have happened at time t (the terrain's state). */
export const digsDone = (t: number): number => DIGS.filter(([at]) => t >= at).length;

/**
 * Sizes on screen in the game view: the game's sizes 3 and 5, drawn a touch
 * smaller than the close-up's zoom so the big shell fits its one-tile tunnel.
 */
export const GW_SMALL = 420;
export const GW_BIG = 545;

export interface GameCrab {
  readonly mx: number;
  /** Ground under it (screen y). */
  readonly y: number;
  readonly facing: 1 | -1;
  readonly walking: boolean;
  readonly swap: number | null;
  readonly shell: ShellId;
  /** The game's grow pop. */
  readonly pop: number;
}
/** Where the buried shell lies: on the tunnel's floor, mouth to mouth with the crab when it gets there (its opening is placed by render). */
export const BURIED = { y: rowY(G.surface + 1) } as const;
export const GAME_SWAP = { from: AT.home, to: AT.home + 1 } as const;
const WALK = { from: AT.wipe + 0.2, to: AT.digging - 0.1, x0: colX(0) - 60, x1: colX(1) } as const;

export function gameCrabAt(t: number): GameCrab {
  const done = digsDone(t);
  // Down a row with each dig of the shaft, dropping quickly into the new hole.
  const fall = (i: number): number => (done > i ? ramp(t, DIGS[i]![0] + 0.02, DIGS[i]![0] + 0.14) : 0);
  const y = rowY(G.surface) + G.tile * fall(0);
  const walk = ramp(t, WALK.from, WALK.to);
  const across = ramp(t, AT.next - 0.02, AT.next + 0.12);
  const mx = lerp(lerp(WALK.x0, WALK.x1, walk), colX(1) + 130, across);
  const walking = (t > WALK.from && t < WALK.to) || (t > AT.next - 0.02 && t < AT.next + 0.12);
  const pop = Math.sin(Math.PI * clamp01((t - AT.crab) / 0.24)) * 0.6 + Math.sin(Math.PI * clamp01((t - GAME_SWAP.to - 0.05) / 0.24));
  if (t >= GAME_SWAP.from) {
    const p = clamp01((t - GAME_SWAP.from) / (GAME_SWAP.to - GAME_SWAP.from));
    return { mx, y, facing: 1, walking: false, swap: p < 1 ? p : null, shell: p < 1 ? 'small' : 'big', pop };
  }
  return { mx, y, facing: 1, walking, swap: null, shell: 'small', pop };
}

/** The game's camera follows the crab down its shaft (screen px the world is moved by). */
export const gameCamY = (t: number): number => -(gameCrabAt(t).y - rowY(G.surface));

/** The buried shell: a faint swipe through the sand, then uncovered with a sparkle. */
export const buriedAt = (t: number): { readonly shown: number; readonly sparkle: number } => ({
  shown: ramp(t, UNCOVER - 0.02, UNCOVER + 0.1),
  sparkle: window01(t, UNCOVER, GAME_SWAP.from + 0.2, 0.15),
});

// ---------------------------------------------------------------- Dewy and the son with his tablet

export type DewyKey = 'proud' | 'laughing';
export interface DewyState {
  readonly shown: boolean;
  /** 0 on screen .. 1 below the frame. */
  readonly down: number;
  readonly from: DewyKey;
  readonly to: DewyKey;
  readonly changeAt: number;
}
export const DEWY_IN = { from: AT.built + 0.02, to: AT.built + 0.5 } as const;
export const DEWY_OUT = { from: AT.back - 0.2, to: AT.back + 0.35 } as const;
const easeOutBack = (u: number): number => {
  const c = 1.45;
  const v = clamp01(u) - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
};
export function dewyAt(time: number): DewyState {
  const t = wrap(time);
  const shown = t > DEWY_IN.from && t < DEWY_OUT.to;
  const rise = 1 - easeOutBack((t - DEWY_IN.from) / (DEWY_IN.to - DEWY_IN.from));
  const fall = smooth((t - DEWY_OUT.from) / (DEWY_OUT.to - DEWY_OUT.from));
  return { shown, down: Math.max(rise, fall), from: 'proud', to: 'laughing', changeAt: AT.laugh - 0.08 };
}
/** The son with his tablet, laughing beside Dewy: hops in just after him and leaves with him. */
export function kidAt(time: number): { readonly shown: boolean; readonly down: number } {
  const t = wrap(time);
  const rise = 1 - easeOutBack((t - DEWY_IN.from - 0.25) / 0.45);
  const fall = smooth((t - DEWY_OUT.from + 0.05) / 0.4);
  return { shown: t > DEWY_IN.from + 0.25 && t < DEWY_OUT.to, down: Math.max(rise, fall) };
}

// ---------------------------------------------------------------- captions

export const CAPTION = { y: 410, size: 112 } as const;
export const CREDIT_Y = 492;
/** The credit with the short link: fades in 40% of the way through (as the big shell comes up), gone before the loop point. */
export const CREDIT = { text: 'InkCrab · 16bit.ink/crab', inAt: 0.4 } as const;

export const LINES: readonly (readonly Word[])[] = LINE_WORDS.reduce<{ at: number; lines: (readonly Word[])[] }>(
  (acc, n) => ({ at: acc.at + n, lines: [...acc.lines, WORDS.slice(acc.at, acc.at + n)] }),
  { at: 0, lines: [] },
).lines;

export interface SpokenRow {
  readonly words: readonly string[];
  readonly current: number;
  readonly unsaid: number;
  readonly y: number;
  readonly size: number;
}

const startOf = (line: readonly Word[]): number => inVoice(line[0]!.start);
const currentIn = (line: readonly Word[], t: number): number => line.reduce((c, w, i) => (t >= inVoice(w.start) ? i : c), -1);

/** The line being said; the hook's line shows whole from frame 1. */
export function spokenAt(time: number): readonly SpokenRow[] {
  const t = wrap(time);
  const line = [...LINES].reverse().find((l) => t >= startOf(l)) ?? LINES[0]!;
  const hook = line === LINES[0];
  return [{ words: line.map((w) => w.text), current: Math.max(hook ? 0 : -1, currentIn(line, t)), unsaid: hook ? 1 : 0.55, ...CAPTION }];
}

// ---------------------------------------------------------------- everything at once

/** Everything on screen at time t, as data: t = 0 and t = LOOP_S must match exactly. */
export function stateAt(time: number): Readonly<Record<string, unknown>> {
  const tau = beachTime(time);
  return {
    shots: shotsAt(time), son: sonAt(tau), crab: beachCrabAt(tau), treasure: treasureAt(tau), cam: beachCam(tau),
    glint: glintAt(tau), puzzle: puzzleAt(tau), dig: digStroke(tau), dewy: dewyAt(time), kid: kidAt(time), spoken: spokenAt(time),
  };
}
