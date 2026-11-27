import { clamp01, curveAt, type Key, lerp, ramp, smooth } from '../short';
import { inVoice, WORDS, type Word } from './words';

/**
 * "Land hermit crabs bury themselves to grow", told by Dewy (#152): every
 * beat a pure function of loop time, timed from the voice (words.ts).
 *
 * Two pictures. The CLOSE one is a side-on cut through the beach in the
 * game's own sand (hatched, the surface line near the top): a land hermit
 * crab big in frame, head down, digging; it settles into a chamber in damp
 * sand, the tunnel closes over it, it sheds its old skin, days and nights
 * race by overhead, and then the son digs for treasure on the surface above,
 * not knowing it's there. The GAME one is InkCrab itself: the player crab
 * digging tile by tile, tunnels branching, buried shells glinting, and the
 * move into a bigger shell, while Dewy says he made it and the son cheers.
 * The last ink wash lands on frame 1 (the dig) for the loop.
 *
 * The facts (fact-checked): some land hermit crabs bury themselves in damp
 * sand to molt, for weeks (sometimes months); the old skin comes off whole.
 * Digging up shells is the game's (and the son's) idea, never shown as
 * something real crabs do: shells are dug up only in the game view.
 */
export const LOOP_S = 19.5;

/** The credit (main.ts doesn't add one for this short): in with the game (so it never sits on the buried crab), gone before the loop point. */
export const CREDIT = { text: 'InkCrab · 16bit.ink/crab', inAt: 0.655 } as const;

/** When a word of the voiceover begins in the loop (`nth` for a word said more than once). */
export function said(text: string, nth = 1): number {
  const w = WORDS.filter((x) => x.text === text)[nth - 1];
  if (!w) throw new Error(`The script has no "${text}" (${nth})`);
  return inVoice(w.start);
}

export const AT = {
  bury: said('To'),
  buries: said('buries'),
  damp: said('damp'),
  sheds: said('sheds'),
  skin: said('skin…'),
  weeks: said('and', 1) - 0.1,
  weeksEnd: said('My') - 0.3,
  son: said('My'),
  wash: said('so') - 0.2,
  game: said('so') + 0.3,
  dewyIn: said('so') - 0.05,
  dewyOut: said('and', 2) + 0.05,
  tunnels: said('Tunnels,'),
  buried: said('buried'),
  shells: said('shells…'),
  trophy: said('and', 2) + 0.15,
  treasure: said('treasure'),
  bigger: said('BIGGER'),
  home: said('home!'),
  back: LOOP_S - 0.4,
} as const;

// ------------------------------------------------------------------ shots

export type ShotId = 'close' | 'game';

export interface Shots {
  readonly under: ShotId;
  /** Shot washing in over `under`, `u` of the way (0..1). */
  readonly over: ShotId | null;
  readonly u: number;
  readonly how: 'wash' | 'fade';
}

const WASH_S = 0.5;

export function shotsAt(t: number): Shots {
  if (t < AT.wash) return { under: 'close', over: null, u: 0, how: 'wash' };
  if (t < AT.wash + WASH_S) return { under: 'close', over: 'game', u: ramp(t, AT.wash, AT.wash + WASH_S), how: 'wash' };
  if (t < AT.back) return { under: 'game', over: null, u: 0, how: 'wash' };
  return { under: 'game', over: 'close', u: smooth((t - AT.back) / (LOOP_S - AT.back)), how: 'fade' };
}

/** The close shot's own clock: in the last dissolve it is already the next loop's opening. */
export const closeClock = (t: number): number => (t >= AT.back ? t - LOOP_S : t);

// ------------------------------------------------------------------ the close shot (world px = screen px at zoom 1; the surface is y 0)

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export interface Cam {
  readonly zoom: number;
  /** Where world (0, 0), the surface above the crab, lands on screen. */
  readonly ox: number;
  readonly oy: number;
}

const keys = (pairs: readonly (readonly [number, number])[]): Key[] => pairs.map(([t, at]) => ({ t, at, rate: 0 }));
const ZOOM = keys([[2.3, 1], [4.6, 0.72], [AT.sheds - 0.5, 0.72], [AT.sheds, 1], [AT.weeks - 0.1, 1], [AT.weeks + 0.4, 0.56], [AT.weeksEnd - 0.1, 0.56], [AT.son + 0.15, 0.45]]);
const OY = keys([[2.3, 380], [4.6, 166], [AT.sheds - 0.5, 166], [AT.sheds, -60], [AT.weeks - 0.1, -60], [AT.weeks + 0.4, 300], [AT.weeksEnd - 0.1, 300], [AT.son + 0.15, 880]]);
const OX = keys([[2.3, 540], [4.6, 374], [AT.sheds - 0.5, 374], [AT.sheds, 215], [AT.weeks - 0.1, 215], [AT.weeks + 0.4, 411], [AT.weeksEnd - 0.1, 411], [AT.son + 0.15, 540]]);

export function camAt(t: number): Cam {
  return { zoom: curveAt(ZOOM, t).at, ox: curveAt(OX, t).at, oy: curveAt(OY, t).at };
}

export const toScreen = (cam: Cam, p: Pt): Pt => ({ x: cam.ox + p.x * cam.zoom, y: cam.oy + p.y * cam.zoom });

/** The tunnel's line: from where it opens on the surface, down at DIG_A. */
export const ENTRY: Pt = { x: -322, y: 0 };
export const DIG_A = 0.95;
/** The crab's tilt while it digs: its head end (claws) down the tunnel. */
export const DIG_ROT = 0.8;
const DIR: Pt = { x: Math.cos(DIG_A), y: Math.sin(DIG_A) };
/** The chamber it settles in, deeper down, and where the crab sits in it. */
export const CHAMBER: Pt = { x: 230, y: 880 };
export const CHAMBER_R = { x: 660, y: 250 } as const;
export const CRAB_REST: Pt = { x: -10, y: 860 };
/** Where the shed skin comes to rest beside it. */
export const SKIN_REST: Pt = { x: 380, y: 870 };
/** The tunnel's half-width, world px: narrower at the surface, as wide as the crab where it digs. */
export const TUNNEL_R = 260;
export const tunnelR = (along: number): number => lerp(170, TUNNEL_R, clamp01(along / 420));

/** How far down the tunnel the crab's middle is at close time t (it digs on, slowly). */
const DIG = keys([[-1, 490], [2.6, 670]]).map((k, i) => (i === 0 ? { ...k, rate: 52 } : { ...k, rate: 40 }));
export const digDepthAt = (t: number): number => curveAt(DIG, Math.min(t, 2.6)).at;
const onLine = (d: number): Pt => ({ x: ENTRY.x + DIR.x * d, y: ENTRY.y + DIR.y * d });

/** 0..1: the crab leaves the tunnel's end and settles upright in the chamber. */
export const settleAt = (t: number): number => ramp(t, 2.5, AT.buries + 0.2);
/** 0..1: how much of the chamber is open (it digs it out as it goes in). */
export const chamberAt = (t: number): number => ramp(t, 2.3, AT.buries);
/** How far down from the entry the tunnel has filled in again: it closes from the surface down. */
export const fillAt = (t: number): number => lerp(0, digDepthAt(2.6) + 360, ramp(t, AT.buries - 0.1, AT.damp + 0.6));
/** 0..1: the sand round the chamber darkens with damp. */
export const dampAt = (t: number): number => ramp(t, AT.damp - 0.5, AT.damp + 0.5);

export interface CrabPose {
  /** The middle of crab and shell. */
  readonly at: Pt;
  /** Radians; DIG_A is head down along the tunnel, 0 upright. */
  readonly rot: number;
  /** Drawing scale multiplier (it grows a little with the new skin). */
  readonly k: number;
  /** 0..1 how hard it is digging (legs and claws working, grains flying). */
  readonly dig: number;
}

/** The close shot's crab. */
export function closeCrab(t: number): CrabPose {
  const tip = onLine(digDepthAt(t));
  const s = smooth(settleAt(t));
  const wriggle = t > AT.sheds - 0.1 && t < AT.skin + 0.3 ? 0.07 * Math.sin((t - AT.sheds) * 2 * Math.PI * 3.2) * ramp(t, AT.sheds - 0.1, AT.sheds + 0.1) : 0;
  return {
    at: { x: lerp(tip.x, CRAB_REST.x, s), y: lerp(tip.y, CRAB_REST.y, s) - 40 * Math.sin(Math.PI * s) },
    rot: lerp(DIG_ROT, 0.04, s) + wriggle,
    k: 1 + 0.07 * ramp(t, AT.skin + 0.15, AT.skin + 0.45),
    dig: 1 - ramp(t, 3.0, AT.buries),
  };
}

/** The old skin: null until it starts to come off, then sliding off sideways and lying beside the crab. */
export function skinAt(t: number): { readonly at: Pt; readonly rot: number; readonly alpha: number } | null {
  if (t < AT.sheds) return null;
  const u = smooth((t - AT.sheds) / (AT.skin + 0.4 - AT.sheds));
  return { at: { x: lerp(CRAB_REST.x, SKIN_REST.x, u), y: lerp(CRAB_REST.y, SKIN_REST.y, u) }, rot: 0.1 * u, alpha: 0.95 * ramp(t, AT.sheds, AT.sheds + 0.35) };
}

/** Grains of sand thrown back up the tunnel by the digging claws: world points, sizes, fades. */
export interface Grain {
  readonly at: Pt;
  readonly r: number;
  readonly alpha: number;
}

const GRAIN_EVERY = 0.018;
const GRAIN_LIFE = 0.55;

/** Deterministic noise in 0..1 for an integer. */
export const noise = (i: number, salt = 0): number => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function grainsAt(t: number): Grain[] {
  const out: Grain[] = [];
  const first = Math.floor((t - GRAIN_LIFE) / GRAIN_EVERY);
  for (let i = first; i <= Math.floor(t / GRAIN_EVERY); i++) {
    const born = i * GRAIN_EVERY;
    const age = t - born;
    if (age < 0 || age > GRAIN_LIFE) continue;
    const crab = closeCrab(born);
    if (crab.dig < 0.05) continue;
    // From the claws at the head end, flung back up the tunnel and fanning out.
    // The claws, at the head end: sand sprays out round them, mostly back up along the crab's sides.
    const head = { x: crab.at.x + DIR.x * 250, y: crab.at.y + DIR.y * 250 };
    const back = DIG_A + Math.PI + (noise(i, 1) < 0.5 ? -1 : 1) * (0.5 + 0.5 * noise(i, 5));
    const speed = 800 + 600 * noise(i, 2);
    const side = (noise(i, 3) - 0.5) * 300;
    out.push({
      at: {
        x: head.x - DIR.y * side + Math.cos(back) * speed * age,
        y: head.y + DIR.x * side + Math.sin(back) * speed * age + 1100 * age * age,
      },
      r: 6 + 11 * noise(i, 4),
      alpha: crab.dig * (1 - age / GRAIN_LIFE),
    });
  }
  return out;
}

// ------------------------------------------------------------------ weeks go by

/** 0..1 how far into the time-lapse; days and nights race past while the crab stays still. */
export const lapseAt = (t: number): number => clamp01((t - AT.weeks) / (AT.weeksEnd - AT.weeks));
const DAYS = 3;
/** 0 = noon, 1 = midnight. */
export const nightAt = (t: number): number => {
  const u = lapseAt(t);
  if (u <= 0 || u >= 1) return 0;
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * DAYS * u);
};
/** The sky's turning: 0 at noon, π at midnight. */
export const skyAngleAt = (t: number): number => 2 * Math.PI * DAYS * lapseAt(t);
/** 0..1 how much of the time-lapse (sun, moon, tracks) shows. */
export const lapseShowAt = (t: number): number => Math.min(ramp(t, AT.weeks - 0.15, AT.weeks + 0.15), 1 - ramp(t, AT.weeksEnd - 0.15, AT.weeksEnd + 0.1));

export interface Print {
  readonly x: number;
  readonly alpha: number;
  readonly kind: 'paw' | 'bird';
  readonly flip: boolean;
}

/** Tracks across the beach above: a fox's paws one way, a bird's feet the other, each fading as the days pass. */
export function printsAt(t: number): Print[] {
  const u = lapseAt(t);
  const show = lapseShowAt(t);
  const out: Print[] = [];
  const walk = (from: number, to: number, x0: number, step: number, n: number, kind: Print['kind'], flip: boolean): void => {
    for (let i = 0; i < n; i++) {
      const at = from + ((to - from) * i) / n;
      if (u < at) continue;
      const age = (u - at) / 0.35;
      out.push({ x: x0 + step * i, alpha: show * clamp01(1 - age) * Math.min(1, (u - at) * 30), kind, flip });
    }
  };
  walk(0.05, 0.35, -700, 170, 9, 'paw', false);
  walk(0.45, 0.75, 900, -150, 10, 'bird', true);
  return out;
}

// ------------------------------------------------------------------ the son on the beach above

export interface SonPlace {
  readonly key: 'dig' | 'trophy';
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly tilt: number;
  readonly alpha: number;
  /** 0..1 how far the spade is down in its stroke. */
  readonly stroke: number;
}

/** The son digging on the surface (close shot, world px), from his line until the game washes in. */
export const SON_DIG = { x: -230, height: 1600 } as const;
const STROKE_HZ = 2.4;

export function sonDigAt(t: number): SonPlace | null {
  const show = ramp(t, AT.son - 0.2, AT.son + 0.05);
  if (show <= 0) return null;
  const phase = (t - AT.son) * STROKE_HZ;
  const stroke = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
  const hop = 50 * Math.max(0, Math.sin(Math.PI * clamp01((t - AT.son + 0.2) / 0.4)));
  return { key: 'dig', x: SON_DIG.x, y: 50 - hop - 10 * stroke, height: SON_DIG.height * (1 - 0.025 * stroke), tilt: 0.05 * stroke - 0.02, alpha: show, stroke };
}

/** Sand off the son's spade, flung up and to the right on each stroke (world px). */
export function sonSandAt(t: number): Grain[] {
  if (t < AT.son - 0.1) return [];
  const out: Grain[] = [];
  const every = 0.03;
  const life = 0.5;
  for (let i = Math.floor((t - life) / every); i <= Math.floor(t / every); i++) {
    const born = i * every;
    const age = t - born;
    if (age < 0 || age > life || born < AT.son - 0.1) continue;
    const phase = ((born - AT.son) * STROKE_HZ) % 1;
    // Only while the spade comes up out of the sand.
    if (phase < 0.45 || phase > 0.85) continue;
    const spade = { x: SON_DIG.x + 0.12 * SON_DIG.height, y: -0.1 * SON_DIG.height };
    const a = -1.1 + (noise(i, 7) - 0.5) * 0.9;
    const v = 700 + 500 * noise(i, 8);
    out.push({ at: { x: spade.x + Math.cos(a) * v * age, y: spade.y + Math.sin(a) * v * age + 1800 * age * age }, r: 7 + 9 * noise(i, 9), alpha: 1 - age / life });
  }
  return out;
}

// ------------------------------------------------------------------ the game shot (screen px; tiles of GAME.tile px, row 0 at GAME.top)

export const GAME = { top: 500, tile: 112, cols: 10, rows: 14 } as const;

/** The player crab's path, in tiles: x the middle of its shell, y the ground it stands on (the top of a row). */
const PATH: readonly { readonly t: number; readonly x: number; readonly y: number }[] = [
  { t: AT.game - 0.3, x: 3, y: 0 },
  { t: AT.game + 0.2, x: 3, y: 0 },
  { t: said('too.') + 0.1, x: 3, y: 3 },
  { t: AT.shells - 0.2, x: 7, y: 3 },
  { t: AT.treasure + 0.15, x: 7, y: 3 },
  { t: AT.bigger - 0.45, x: 3, y: 3 },
];

export interface GameCrab {
  /** Tiles. */
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly moving: boolean;
}

export function gameCrabAt(t: number): GameCrab {
  const tc = Math.max(PATH[0]!.t, Math.min(t, PATH[PATH.length - 1]!.t));
  let i = 0;
  while (i < PATH.length - 2 && tc > PATH[i + 1]!.t) i++;
  const a = PATH[i]!;
  const b = PATH[i + 1]!;
  const u = clamp01((tc - a.t) / (b.t - a.t));
  const moving = t > a.t && t < b.t && (a.x !== b.x || a.y !== b.y);
  // Which way it last moved sideways.
  let facing: 1 | -1 = 1;
  for (let k = 0; k <= i; k++) {
    const p = PATH[k]!;
    const q = PATH[k + 1]!;
    if (q.x !== p.x && (k < i || u > 0)) facing = q.x > p.x ? 1 : -1;
  }
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), facing, moving };
}

/** Tiles dug by the crab so far: every tile its body (two tiles tall, two wide) has passed through. */
export function dugTiles(t: number): ReadonlySet<string> {
  const out = new Set<string>();
  const tc = Math.min(t, PATH[PATH.length - 1]!.t);
  for (let s = PATH[0]!.t; s <= tc + 1e-9; s += 0.02) {
    const c = gameCrabAt(s);
    if (c.y < 0.5 && s < PATH[1]!.t) continue;
    const x0 = Math.floor(c.x - 0.6);
    const x1 = Math.floor(c.x + 0.6);
    const y1 = Math.ceil(c.y) - 1;
    for (let x = x0; x <= x1; x++) for (let y = Math.max(0, y1 - 1); y <= y1; y++) out.add(`${x},${y}`);
  }
  return out;
}

export interface Buried {
  readonly kind: 'nerite' | 'whelk' | 'moonsnail';
  /** Tiles: the middle of the shell and the ground it lies on. */
  readonly x: number;
  readonly y: number;
  /** Body size (the game's shell sizes). */
  readonly size: number;
  /** When it glints, as it's named. */
  readonly glint: number;
}

/** The new home is the moon snail; the crab's own shell (a top shell) is smaller. */
export const BURIED: readonly Buried[] = [
  { kind: 'nerite', x: 6.1, y: 5, size: 3, glint: AT.buried + 0.05 },
  { kind: 'whelk', x: 8.7, y: 3, size: 4, glint: AT.buried + 0.3 },
  { kind: 'moonsnail', x: 1.6, y: 3, size: 6, glint: AT.shells + 0.05 },
];
export const OWN_SHELL = { kind: 'topshell', size: 3 } as const;
export const NEW_HOME = BURIED[2]!;

/** 0..1 through the move into the new shell (the game's move-house: reach in, puff, peek out). */
export const moveAt = (t: number): number => ramp(t, AT.bigger - 0.3, AT.home + 0.05);

/** 0..1: the game camera closes in on the move into the bigger shell, the son cheering on the beach right above it. */
export const payoffZoomAt = (t: number): number => ramp(t, AT.treasure + 0.55, AT.treasure + 1.1);
/** At full zoom, game point FOCUS lands on screen at FOCUS_AT, everything ZOOM_IN times bigger. */
export const PAYOFF = { zoom: 1.4, focus: { x: 300, y: GAME.top + 3 * GAME.tile }, at: { x: 610, y: 1092 } } as const;

/** The game camera: screen = shift + game · zoom. */
export function gameCamAt(t: number): { readonly zoom: number; readonly x: number; readonly y: number } {
  const u = smooth(payoffZoomAt(t));
  const zoom = lerp(1, PAYOFF.zoom, u);
  return { zoom, x: lerp(0, PAYOFF.at.x - PAYOFF.focus.x * PAYOFF.zoom, u), y: lerp(0, PAYOFF.at.y - PAYOFF.focus.y * PAYOFF.zoom, u) };
}

/** The son cheering on the beach above the game. */
export function sonTrophyAt(t: number): SonPlace | null {
  const show = ramp(t, AT.trophy, AT.trophy + 0.25);
  if (show <= 0) return null;
  const pop = Math.max(0, Math.sin(Math.PI * clamp01((t - AT.trophy) / 0.4)));
  const cheer = Math.max(0, Math.sin(Math.PI * clamp01((t - AT.bigger + 0.05) / 0.45)));
  const sway = Math.sin((t - AT.trophy) * 2 * Math.PI * 1.1);
  return { key: 'trophy', x: lerp(190, 110, payoffZoomAt(t)), y: GAME.top + 20 - 40 * pop - 46 * cheer, height: 460 * (1 + 0.03 * cheer), tilt: 0.035 * sway, alpha: show, stroke: 0 };
}

// ------------------------------------------------------------------ Dewy

/** Dewy's bust: rises on "so in the game I made him", leaves when the son comes back. */
export const DEWY = { x: 800, width: 620, bottom: 2030 } as const;
export const dewyShowing = (t: number): boolean => t >= AT.dewyIn && t < AT.dewyOut + 0.5;
/** Extra px down as he leaves (0 while he's up). */
export const dewyExitAt = (t: number): number => 900 * smooth((t - AT.dewyOut) / 0.45);

// ------------------------------------------------------------------ captions

export interface CaptionRow {
  readonly words: readonly string[];
  readonly current: number;
  readonly y: number;
  readonly size: number;
}

/** The lines as shown: each a run of the script's words, on one or two rows, at a place that keeps clear of the subject. */
interface Line {
  readonly rows: readonly (readonly Word[])[];
  readonly ys: readonly number[];
}

const W = (from: number, to: number): readonly Word[] => WORDS.slice(from, to);
const LOW = [1150, 1245] as const;
export const LINES: readonly Line[] = [
  { rows: [W(0, 4)], ys: [1245] },
  { rows: [W(4, 10), W(10, 16)], ys: LOW },
  { rows: [W(16, 20)], ys: [1245] },
  { rows: [W(20, 25)], ys: [1245] },
  { rows: [W(25, 31)], ys: [1075] },
  { rows: [W(31, 38), W(38, 41)], ys: [360, 458] },
  { rows: [W(41, 44)], ys: [410] },
  { rows: [W(44, 50), W(50, 53)], ys: [1172, 1250] },
];

const SIZE = 96;

/** The line being said at loop time t (the first line shows from frame 1, the last until the loop point). */
export function spokenAt(t: number): CaptionRow[] {
  let li = 0;
  for (let i = 0; i < LINES.length; i++) if (t >= inVoice(LINES[i]!.rows[0]![0]!.start) - 0.12) li = i;
  const line = LINES[li]!;
  return line.rows.map((row, r) => {
    let current = -1;
    row.forEach((w, i) => {
      if (t >= inVoice(w.start) - 0.02) current = i;
    });
    return { words: row.map((w) => w.text), current, y: line.ys[r]!, size: SIZE };
  });
}
