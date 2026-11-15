/**
 * The parts of a tank: a gun, a hull and a drive, each a family at Mk I–V.
 * Numbers are the design doc's starting table (docs/inktanks-design.md,
 * "Tank stats"); tune them with the sim, never by guessing.
 */
export type GunFamily = 'machinegun' | 'cannon' | 'rockets' | 'mortar' | 'flamer' | 'laser' | 'rail';
export type HullFamily = 'light' | 'medium' | 'heavy';
export type DriveFamily = 'wheels' | 'halftracks' | 'tracks' | 'hover';
export type Family = GunFamily | HullFamily | DriveFamily;
export type Slot = 'gun' | 'hull' | 'drive';
export type Mk = 1 | 2 | 3 | 4 | 5;
export const MAX_MK: Mk = 5;

export interface Part {
  readonly family: Family;
  readonly mk: Mk;
  /** An ace's prototype: rare tech, found nowhere else. */
  readonly proto?: boolean;
}

export interface Loadout {
  readonly gun: Part;
  readonly hull: Part;
  readonly drive: Part;
}

/**
 * 'lob': a mortar round, lobbed over walls to a spot on the ground (match/lob.ts).
 * 'flame': the Flamer's stream, no projectile: each tick burns everything in its cone (match/flame.ts).
 * 'beam': the Laser's instant hit-scan beam, stopped by the first tank or wall on its line (match/beam.ts).
 * 'rail': the Rail's slug, instant after its charge, through walls, trees and tanks, stopped only by rock (match/railgun.ts).
 */
export type ShotKind = 'tracer' | 'shell' | 'rocket' | 'lob' | 'flame' | 'beam' | 'rail';

export interface GunSpec {
  readonly damage: number;
  /** Shots per trigger pull (Rockets fire a pair). */
  readonly shots: number;
  /** Seconds between pulls. */
  readonly reload: number;
  /** Native px. */
  readonly range: number;
  /** Native px per second. */
  readonly shotSpeed: number;
  /** Splash radius in native px, 0 for none. */
  readonly splash: number;
  readonly weight: number;
  readonly breaksBrick: boolean;
  readonly shot: ShotKind;
  /** Rounds in a belt; the gun then stops for `beltReload` s (0 or unset: no belt). */
  readonly belt?: number;
  readonly beltReload?: number;
  /** Turret turn, radians per second. */
  readonly turretTurn: number;
  /** Spread of each shot, radians. */
  readonly spread: number;
  /** Lobbed guns (the Mortar): shells land no nearer than this, px (0 or unset: no minimum). */
  readonly minRange?: number;
  /** Heat damage (the Flamer, chapter 3): it meets the hull's heat armour, not its kinetic armour. */
  readonly heat?: boolean;
  /** Stream guns (the Flamer): the cone's full width, radians. */
  readonly cone?: number;
  /** Charged guns (the Rail, chapter 5): seconds from the pull to the shot, the aim held and shown as a line. */
  readonly charge?: number;
}

export interface HullSpec {
  readonly hp: number;
  /** Kinetic armour: against Machineguns, Cannons, Rockets and Mortars. */
  readonly armour: number;
  /** Heat armour (chapter 3, design doc "Tank stats"): lower than kinetic; what heat guns (the Flamer) meet. */
  readonly heatArmour: number;
  readonly weight: number;
  readonly engine: number;
  /** Collision radius, native px (a heavy hull is about 76 px long). */
  readonly radius: number;
}

export interface DriveSpec {
  /** Native px per second. */
  readonly speed: number;
  readonly hpFactor: number;
  readonly weight: number;
  /** Hull turn, radians per second. */
  readonly turn: number;
  /** Turns on the spot (no forward speed needed). */
  readonly pivots: boolean;
  /** Speed multipliers on slow ground. */
  readonly sand: number;
  readonly mud: number;
  /** Grip on sand, 0–1: below 1 the drive slides on turns there (its path lags its heading; match/movement.ts). */
  readonly sandGrip: number;
  /** Grip on every ground, 0–1 (Hover drifts everywhere); unset: 1 off sand. */
  readonly grip?: number;
  /** Crosses deep water (Hover, chapter 3); every other drive stops at the bank. */
  readonly floats?: boolean;
  /** Deep snow (chapter 4): speed × this (Wheels 0.75, Half-tracks 0.9). Unset: 1. */
  readonly snow?: number;
  /** Grip on ice (chapter 4), 0–1: every drive slides there. Unset: its `grip`. */
  readonly iceGrip?: number;
  /** The forest floor (chapter 5, roots and ferns off the trails): speed × this. Unset: 1. */
  readonly forest?: number;
}

export const GUNS: Readonly<Record<GunFamily, GunSpec>> = {
  // The Machinegun fires in belts: 20 rounds (2 s), then a 1.5 s reload (owner, Nov 14: "longer reload").
  machinegun: { damage: 6, shots: 1, reload: 0.1, range: 280, shotSpeed: 900, splash: 0, weight: 1, breaksBrick: false, shot: 'tracer', turretTurn: 6, spread: 0.05, belt: 20, beltReload: 1.5 },
  cannon: { damage: 40, shots: 1, reload: 1.1, range: 360, shotSpeed: 650, splash: 0, weight: 4, breaksBrick: true, shot: 'shell', turretTurn: 3.6, spread: 0.015 },
  rockets: { damage: 30, shots: 2, reload: 2.4, range: 400, shotSpeed: 380, splash: 20, weight: 3, breaksBrick: true, shot: 'rocket', turretTurn: 3.2, spread: 0.03 },
  // Chapter 2: lobbed over walls and low cover to the aimed spot (200–520 px), the whole 40 px blast hurts (match/lob.ts).
  // shotSpeed is ground speed: a long lob hangs in the air about 1.9 s, so its landing ring is readable.
  // Measured (Nov 14): a stand-in with a Mortar passes levels 11 and 14 2–3 times in 10 (enemies close under its minimum
  // range); 55 every 2.4 s didn't change that, so the design's numbers stand. It's a support gun, not a Cannon.
  mortar: { damage: 45, shots: 1, reload: 2.8, range: 520, minRange: 200, shotSpeed: 280, splash: 40, weight: 5, breaksBrick: true, shot: 'lob', turretTurn: 2.6, spread: 0.02 },
  // Chapter 3: a short stream (design table: 5 heat a tick, 150 px, cone, weight 2). A tick every 0.1 s burns every tank
  // in the 0.7 rad cone that no wall shields (match/flame.ts); 3 s of fuel, then 1 s to refill (the belt). Heat damage
  // meets heat armour (Light 0, Medium 1, Heavy 2), so it bites heavies as hard as a Cannon does. shotSpeed is only the
  // bots' lead (the stream is instant).
  flamer: { damage: 5, shots: 1, reload: 0.1, range: 150, shotSpeed: 2000, splash: 0, weight: 2, breaksBrick: false, shot: 'flame', turretTurn: 4.5, spread: 0, belt: 30, beltReload: 1, heat: true, cone: 0.7 },
  // Chapter 4 (design table: 35 heat every 0.9 s, 480 px, instant beam, weight 3): a hit-scan beam stopped by the first
  // tank or wall on its line (match/beam.ts), heat against heat armour. shotSpeed is only the bots' lead (none: it's instant).
  // It scorches wood, trees, fuel and snow but doesn't break brick.
  laser: { damage: 35, shots: 1, reload: 0.9, range: 480, shotSpeed: 100000, splash: 0, weight: 3, breaksBrick: false, shot: 'beam', turretTurn: 3.4, spread: 0.01, heat: true },
  // Chapter 5 (design table: 90 every 3 s, 640 px, pierces walls, trees and tanks, a charge-up that shows an aim line,
  // weight 6): a pull starts a 0.8 s charge with the aim locked and drawn; then the slug goes through everything on its
  // line (every tank takes it; walls and trees it passes take half) and stops only at rock (match/railgun.ts). Kinetic.
  rail: { damage: 90, shots: 1, reload: 3, range: 640, shotSpeed: 100000, splash: 0, weight: 6, breaksBrick: true, shot: 'rail', turretTurn: 2.4, spread: 0.005, charge: 0.8 },
};

export const HULLS: Readonly<Record<HullFamily, HullSpec>> = {
  light: { hp: 120, armour: 3, heatArmour: 0, weight: 6, engine: 12, radius: 22 },
  medium: { hp: 200, armour: 7, heatArmour: 1, weight: 12, engine: 16, radius: 26 },
  heavy: { hp: 320, armour: 12, heatArmour: 2, weight: 20, engine: 21, radius: 31 },
};

export const DRIVES: Readonly<Record<DriveFamily, DriveSpec>> = {
  // Chapter 4: snow and iceGrip (design: deep snow ×0.75 for Wheels; ice skids every drive, Tracks least).
  // Chapter 5: forest (roots and ferns off the trails: the trails are the fast lanes; Tracks and Hover don't mind).
  wheels: { speed: 190, hpFactor: 1.0, weight: 2, turn: 3.0, pivots: false, sand: 0.7, mud: 0.8, sandGrip: 0.35, snow: 0.75, iceGrip: 0.15, forest: 0.85 },
  halftracks: { speed: 160, hpFactor: 1.4, weight: 4, turn: 2.5, pivots: false, sand: 1, mud: 0.8, sandGrip: 0.75, snow: 0.9, iceGrip: 0.22, forest: 0.93 },
  tracks: { speed: 130, hpFactor: 1.9, weight: 7, turn: 2.1, pivots: true, sand: 1, mud: 1, sandGrip: 1, snow: 1, iceGrip: 0.3 },
  // Chapter 3 (design table: 220, HP ×0.9, weight 3): floats over deep water and mud, and drifts on every ground.
  hover: { speed: 220, hpFactor: 0.9, weight: 3, turn: 3.2, pivots: false, sand: 1, mud: 1, sandGrip: 0.45, grip: 0.45, floats: true },
};

export const GUN_FAMILIES: readonly GunFamily[] = ['machinegun', 'cannon', 'rockets', 'mortar', 'flamer', 'laser', 'rail'];
export const HULL_FAMILIES: readonly HullFamily[] = ['light', 'medium', 'heavy'];
export const DRIVE_FAMILIES: readonly DriveFamily[] = ['wheels', 'halftracks', 'tracks', 'hover'];
export const FAMILIES: readonly Family[] = [...GUN_FAMILIES, ...HULL_FAMILIES, ...DRIVE_FAMILIES];

/** The chapter a family first turns up in: the workshop lists a later one only once you hold its blueprints. */
export const FAMILY_CHAPTER: Readonly<Partial<Record<Family, number>>> = { mortar: 2, flamer: 3, hover: 3, laser: 4, rail: 5 };

/** Each Mk is +20% on the part's main stat: Mk II +20% … Mk V +80%. */
export const TIER_BONUS: Readonly<Record<Mk, number>> = { 1: 1, 2: 1.2, 3: 1.4, 4: 1.6, 5: 1.8 };

/** "IV": a Mk as a Roman numeral. */
export const roman = (mk: Mk): string => ['I', 'II', 'III', 'IV', 'V'][mk - 1]!;

/**
 * The Mk's colour, the rarity order every 16bit.ink game uses (owner, Nov 14;
 * the same shades as InkHeroes' ranks): Mk I grey, II green, III blue,
 * IV violet, V orange. `light` is for text on dark panels, `mid` for rings and fills.
 */
export const MK_COLOUR: Readonly<Record<Mk, { readonly light: string; readonly mid: string; readonly hex: number }>> = {
  1: { light: '#d6d8dc', mid: '#92969e', hex: 0x92969e },
  2: { light: '#b0e28c', mid: '#549c4c', hex: 0x549c4c },
  3: { light: '#a8e2fc', mid: '#389cdc', hex: 0x389cdc },
  4: { light: '#d6aaf0', mid: '#8850b8', hex: 0x8850b8 },
  5: { light: '#ffcc78', mid: '#ee8018', hex: 0xee8018 },
};

/** The Mk whose art a part wears: every Mk has its own (Mk IV and V since Nov 15). */
export const artMk = (mk: Mk): Mk => mk;

export function slotOf(family: Family): Slot {
  if ((GUN_FAMILIES as readonly string[]).includes(family)) return 'gun';
  if ((HULL_FAMILIES as readonly string[]).includes(family)) return 'hull';
  return 'drive';
}

export function isGun(f: Family): f is GunFamily {
  return slotOf(f) === 'gun';
}
export function isHull(f: Family): f is HullFamily {
  return slotOf(f) === 'hull';
}
export function isDrive(f: Family): f is DriveFamily {
  return slotOf(f) === 'drive';
}

/** The art family of a part (the parts manifest's key prefix). */
export const ART_FAMILY: Readonly<Record<Family, string>> = {
  machinegun: 'turretMG',
  cannon: 'turretCannon',
  rockets: 'turretRocket',
  mortar: 'turretMortar',
  flamer: 'turretFlamer',
  laser: 'turretLaser',
  rail: 'turretRail',
  light: 'hullLight',
  medium: 'hullMedium',
  heavy: 'hullHeavy',
  wheels: 'driveWheels',
  halftracks: 'driveHalftrack',
  tracks: 'driveTracks',
  hover: 'driveHover',
};

/** The art key `<family>-mk<n>`, as src/art/pixel/parts/manifest.json lists it. */
export function artKey(p: Part): string {
  return `${ART_FAMILY[p.family]}-mk${artMk(p.mk)}`;
}

/** A family's name alone: "Half-tracks". */
export const familyName = (f: Family): string => partLabel({ family: f, mk: 1 }).replace(/ Mk I$/, '');

/** A short label: "Cannon Mk II". */
export function partLabel(p: Part): string {
  const name: Record<Family, string> = {
    machinegun: 'Machinegun', cannon: 'Cannon', rockets: 'Rockets', mortar: 'Mortar', flamer: 'Flamer', laser: 'Laser', rail: 'Rail',
    light: 'Light hull', medium: 'Medium hull', heavy: 'Heavy hull',
    wheels: 'Wheels', halftracks: 'Half-tracks', tracks: 'Tracks', hover: 'Hover',
  };
  return `${p.proto ? 'Prototype ' : ''}${name[p.family]} Mk ${roman(p.mk)}`;
}

export function withPart(l: Loadout, p: Part): Loadout {
  return { ...l, [slotOf(p.family)]: p };
}

export function partIn(l: Loadout, slot: Slot): Part {
  return l[slot];
}

export const part = (family: Family, mk: Mk = 1): Part => ({ family, mk });

export const STARTER_LOADOUT: Loadout = { gun: part('machinegun'), hull: part('light'), drive: part('wheels') };
