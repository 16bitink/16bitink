import type { GadgetKind } from '../match/types';
import type { Ground, TerrainPatch } from '../land';
import type { LootTable } from '../loot';
import type { GunFamily, Mk, Part } from '../parts';
import type { Clan } from '../match/types';
import type { Pt } from '../vec';

/**
 * A hand-made level as data (design doc "A mission", "Bots", "Missions").
 * Places are named points (`points`) or literal {x, y}; routes are named
 * roads. `loadLevel` checks every name and builds the map.
 */
export type Place = string | Pt;

export type MissionType =
  | 'assault' | 'raid' | 'escort' | 'hold' | 'ace' | 'rescue' | 'ambush'
  | 'salvage' | 'breakout' | 'recon' | 'capture' | 'chase' | 'fortress';

/** A structure on the map: a kind from the chapter's kinds, at a ground origin. */
export interface StructPlace {
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  /** Default: `<kind><index>`. */
  readonly id?: string;
  /** Mission tag: 'target' (raid), 'cage' (rescue). */
  readonly tag?: string;
}

export type BotRole = 'guard' | 'patrol' | 'wave' | 'convoy' | 'hunter' | 'runner' | 'turret';

/** When a wave arrives: seconds into the level, when the alarm first goes off, or the objective's stage (salvage pick-up, first cage). */
export type WaveWhen = number | 'alarm' | 'stage';

export interface EnemyDef {
  readonly role: BotRole;
  readonly clan: Clan;
  /** "gun+mk/hull+mk/drive+mk", e.g. "cannon1/medium1/halftracks1". */
  readonly tank: string;
  /** Where it starts: a guard's post, a turret's spot, a wave's entry point. */
  readonly at: Place;
  /** Patrol: the road it drives (back and forth). Convoy, runner: the road to its exit. */
  readonly route?: string;
  /** Waves only. */
  readonly when?: WaveWhen;
  /** Guard: how far from its post it fights before going back (default 320). */
  readonly leash?: number;
  /** How far it spots you before the alarm (default by role, see ROLE_SIGHT). */
  readonly sight?: number;
  readonly name?: string;
  /** A named ace: rare intel, its wreck drops a prototype part. */
  readonly ace?: boolean;
  readonly hpMult?: number;
  readonly speedMult?: number;
  /** Repair kits it carries (default 0; an ace 1). With none it fights to the end. */
  readonly kits?: number;
  /** Drawn and driven as a truck (no gun). Convoys. */
  readonly truck?: boolean;
  /** A barge (chapter 3, level 29's convoy): floats on deep water only; its route must run over water. Use with `truck: true` for an unarmed one. */
  readonly vessel?: 'barge';
}

/**
 * A gun tower of ours: a stone tower with one of our turrets on top. It holds
 * fire until you come within `wake` px (default 650), then shoots any enemy
 * in sight. Enemies don't target it and shots fly past it (it stands above
 * the fight); it blocks driving like any tower.
 */
export interface AllyDef {
  readonly kind: 'tower';
  readonly at: Place;
  readonly gun: GunFamily;
  readonly mk?: Mk;
  readonly wake?: number;
}

/**
 * A tank on your side (chapter 5, level 48 "Hive Cells": "the clans join you"):
 * a clan crew in its own tank (its clan's colours) that follows you and fights
 * what it sees; enemies fight it. With `join` (a structure id: a cage, a pen
 * gate) it appears at `at` when that structure breaks, otherwise at the start.
 * Losing one doesn't fail the mission.
 */
export interface FriendDef {
  readonly at: Place;
  /** "gun+mk/hull+mk/drive+mk". */
  readonly tank: string;
  /** Default 'ink'. */
  readonly clan?: Clan;
  readonly name?: string;
  readonly join?: string;
}

export interface CrateDef {
  readonly at: Place;
  /** Rolled from the level's loot table when absent. */
  readonly content?: Part | 'kit' | { readonly gadget: GadgetKind };
}

export interface BossDef {
  readonly name: string;
  readonly hp: number;
  /** `art`: the turret's drawing (a world vehicle turret, e.g. 'fortressRail' on the train); default by its gun. */
  readonly turrets: readonly { readonly gun: GunFamily; readonly dx: number; readonly dy: number; readonly hp: number; readonly art?: string }[];
  /**
   * The body's art: a vehicle in the world manifest with a body and treads
   * (default 'fortress', the level 10 Iron Sow). Level 20 uses 'sandCrawler';
   * a name the manifest doesn't have yet draws as the fortress (render/tankView.ts).
   */
  readonly body?: string;
  /** Whose boss it is (default 'boars'): its colours and its turrets' crews. */
  readonly clan?: Clan;
  /** Collision radius (default 70) and armour (default 14). */
  readonly radius?: number;
  readonly armour?: number;
  /** The road it drives round. */
  readonly road: string;
  readonly speed: number;
  /** A boat (level 30's Ironclad): it moves on deep water only, so a bank stops its charge as a wall would. */
  readonly afloat?: boolean;
  /**
   * A train (chapter 4, level 40's Rail-Gun Train, body 'railTrain'): it moves
   * only along its road, which is its rail line (lay railSnowH/V along it),
   * forwards and back; the line's ends are buffers, so a charge down the line
   * into them dazes it. The road should be open at both ends (a line, not a ring).
   */
  readonly rail?: boolean;
  /** A long body: half its length along the heading, px (the train: about 125); shots and tanks meet a capsule. Default 0, a circle. */
  readonly length?: number;
}

export type ObjectiveDef =
  | { readonly kind: 'assault' }
  /**
   * `column` (chapter 5, level 44 "Timber Bridges"): the level's convoy-role enemies are a column heading over the
   * targets (log bridges); if one of them reaches its road's end before the raid is done, the raid fails.
   */
  | { readonly kind: 'raid'; readonly tag: string; readonly need?: number; readonly label: string; readonly column?: boolean }
  /**
   * `vessel: 'barge'` (chapter 3): a supply barge on a river road instead of a
   * truck; it floats on deep water only (the road must run over water).
   */
  /**
   * Chapter 5: `trucks` (default 1) makes it a convoy (the rest follow the lead; lose any and it fails), and
   * `clear` names a tag on structures across the road (felled trees, fallenLog): the trucks stop at one until it's sawn through.
   */
  | { readonly kind: 'escort'; readonly road: string; readonly truckHp: number; readonly speed: number; readonly leash?: number; readonly vessel?: 'truck' | 'barge'; readonly trucks?: number; readonly clear?: string }
  | { readonly kind: 'hold'; readonly zone: string; readonly radius: number; readonly seconds: number }
  | { readonly kind: 'ace' }
  | { readonly kind: 'rescue'; readonly tag: string; readonly home: string; readonly crewHp?: number }
  | { readonly kind: 'ambush'; readonly mayEscape?: number }
  | { readonly kind: 'salvage'; readonly at: string; readonly pickup: string }
  | { readonly kind: 'breakout'; readonly exit: string; readonly radius?: number; readonly artillery?: ArtilleryDef; /** What the exit is ("our fort"); default "the exit". */ readonly to?: string }
  | { readonly kind: 'recon'; readonly spots: readonly string[]; readonly radius?: number; readonly dwell?: number }
  | { readonly kind: 'capture'; readonly flags: readonly string[]; readonly radius?: number; readonly capture?: number; readonly holdAll?: number }
  /** `gate`: the id of the courier's base gate (a structure on its road): it swings open as the courier comes. */
  | { readonly kind: 'chase'; readonly base: string; readonly gate?: string }
  | { readonly kind: 'fortress'; readonly boss: BossDef };

/**
 * Weather (chapter 2+): a sandstorm rolls over every `every` s (default 40;
 * the first at `first`, default `every`) for `last` s (default 12); in it no
 * one sees past `sight` px (default 180). See match/weather.ts.
 */
export interface SandstormDef {
  readonly kind: 'sandstorm';
  readonly every?: number;
  readonly last?: number;
  readonly sight?: number;
  readonly first?: number;
}

/**
 * A fog bank (chapter 3): a circle of mist at (x, y), radius r. With dx/dy it
 * drifts to and fro, (dx, dy) either side of its centre, a full swing every
 * `period` s (default 60). See match/fog.ts.
 */
export interface FogBankDef {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly period?: number;
}

/** Fog banks (chapter 3): tanks inside are hidden, and no one sees through a bank. */
export interface FogDef {
  readonly kind: 'fog';
  readonly banks: readonly FogBankDef[];
}

/**
 * A blizzard (chapter 4): like a sandstorm (every `every` s, default 45, the
 * first at `first`, for `last` s, default 14; sight `sight`, default 200), and
 * while it blows a wind of `wind` px/s (default 30) pushes every tank and shot
 * sideways along `windAngle` (radians, default 2.2: from the north-east, as the
 * painted snow streaks). See match/weather.ts and match/wind.ts.
 */
export interface BlizzardDef {
  readonly kind: 'blizzard';
  readonly every?: number;
  readonly last?: number;
  readonly sight?: number;
  readonly first?: number;
  readonly wind?: number;
  readonly windAngle?: number;
}

export type WeatherDef = SandstormDef | FogDef | BlizzardDef;

/**
 * When the structure `by` breaks (a dam, a sluice), or at `at` s (a tide), these ground patches are
 * painted over the map: water to flood, marsh or mud to drain. The nav grids
 * follow and tanks caught in new deep water are washed to the nearest bank.
 * See match/flood.ts.
 */
export interface FloodDef {
  /** The structure id that holds it back (a dam): it floods when that breaks. */
  readonly by?: string;
  /** Or a tide: it floods at this many seconds into the level (the HUD warns TIDE_WARN s ahead). */
  readonly at?: number;
  readonly terrain: readonly TerrainPatch[];
  /** The feed line when it happens (default "The dam is breached!"). */
  readonly text?: string;
}

/**
 * An avalanche (chapter 4, level 37 "shoot the cliffs to bury waves"): when
 * the structure `by` breaks (a cornice on a cliff), its `drifts` fall at once:
 * snowdrifts (any structure kinds) that weren't there before, which block the
 * route under them until they're dug out, and every tank under one takes
 * `damage` (default AVALANCHE.damage) and is pushed clear. Keep it small: a
 * few drifts across one pass. See match/avalanche.ts.
 */
export interface AvalancheDef {
  readonly by: string;
  readonly drifts: readonly StructPlace[];
  readonly damage?: number;
  /** The feed line (default "Avalanche!"). */
  readonly text?: string;
}

/**
 * A forest fire (chapter 5, level 42 "Wildfire"): at `at` s (default 0) the
 * burnable tree or undergrowth nearest each `start` place catches, and fire
 * runs tree to tree: each tree burns `burn` s (default 14), hurting tanks under
 * its canopy (`damage` heat a 0.5 s tick, default 14), lights every burnable
 * structure within `spread` px (default 120) after `every` s (default 3), and
 * burns out to a snag; a chain stops after `hops` trees (default 60).
 * Bots route round a blaze. See match/forestFire.ts.
 */
export interface ForestFireDef {
  readonly start: readonly Place[];
  readonly at?: number;
  readonly every?: number;
  readonly spread?: number;
  readonly burn?: number;
  readonly damage?: number;
  readonly hops?: number;
  /** The feed line when it starts (default "The forest is on fire!"). */
  readonly text?: string;
}

/** A patch of high ground (a ridge top): from inside it a tank sees and shoots HEIGHT.range × as far. */
export interface HeightDef {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Shells that mark a spot near you, then land (Breakout). */
export interface ArtilleryDef {
  /** Seconds between marks. */
  readonly every: number;
  readonly radius: number;
  readonly damage: number;
  /** Seconds from the mark to the blast. */
  readonly warn: number;
}

export type BonusDef =
  | { readonly kind: 'kills'; readonly n: number }
  | { readonly kind: 'noKit' }
  | { readonly kind: 'time'; readonly under: number }
  | { readonly kind: 'noAlarm' }
  /** `vessel`: what the bonus calls it (default 'truck'; level 23's barge). */
  | { readonly kind: 'truckHp'; readonly min: number; readonly vessel?: 'truck' | 'barge' }
  | { readonly kind: 'heavyWithRockets' }
  | { readonly kind: 'swaps'; readonly n: number }
  | { readonly kind: 'intel'; readonly n: number };

export interface LevelMap {
  readonly cols: number;
  readonly rows: number;
  readonly base: Ground;
  readonly terrain: readonly TerrainPatch[];
  readonly structures: readonly StructPlace[];
  readonly points: Readonly<Record<string, Pt>>;
  readonly roads: Readonly<Record<string, readonly Pt[]>>;
}

export interface LevelDef {
  readonly id: string;
  /** Level numbers run on across chapters (chapter 2 starts at 11). */
  readonly number: number;
  readonly name: string;
  readonly type: MissionType;
  readonly briefing: string;
  readonly teaches: string;
  readonly map: LevelMap;
  readonly start: Place;
  /** Facing at the start, radians (0 = east). */
  readonly startHeading?: number;
  readonly enemies: readonly EnemyDef[];
  /** Our side's fixed defences: gun towers that cover the end of an escort or a breakout (design doc "Levels mean something"). */
  readonly allies?: readonly AllyDef[];
  /** Tanks on your side that follow you (chapter 5: freed clan crews), from the start or when a structure breaks. */
  readonly friends?: readonly FriendDef[];
  readonly crates: readonly CrateDef[];
  readonly objective: ObjectiveDef;
  readonly bonus: readonly [BonusDef, BonusDef];
  /** Seconds; the level fails when it runs out. */
  readonly timeLimit?: number;
  /** Sandstorms and the like (chapter 2+). */
  readonly weather?: WeatherDef;
  /** Dams that flood or drain ground when they break, and tides (chapter 3). */
  readonly floods?: readonly FloodDef[];
  /** Cornices that bring down snowdrifts when shot (chapter 4). */
  readonly avalanches?: readonly AvalancheDef[];
  /** High ground (chapter 4, level 35's ridges): circles where a tank sees and shoots further (match/heights.ts). */
  readonly heights?: readonly HeightDef[];
  /** A forest fire that spreads tree to tree (chapter 5, match/forestFire.ts). */
  readonly fire?: ForestFireDef;
  /**
   * Chapters 4–5 only (levels 31–50: "all three clans pushed north", then the
   * Hive and the clans in the forest): the level's enemies may mix clans. Every
   * other level is against one faction.
   */
  readonly mixedClans?: boolean;
  /**
   * Chapter 5 only (levels 41–50, level 46 "Three Clans": "the clans fight each
   * other too"), with `mixedClans`: each clan is its own side, so they shoot each
   * other as well as you (CLAN_TEAM in match/spawn.ts).
   */
  readonly clanWar?: boolean;
  /**
   * Parts the Brigade issues you for this level only, fitted over your own at
   * the start (level 21's Hover for the trials). Your workshop tank is back after.
   */
  readonly issue?: readonly Part[];
  /** For rolled crates. */
  readonly loot: LootTable;
}
