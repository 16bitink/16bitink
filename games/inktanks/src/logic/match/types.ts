import type { CrateContent } from '../loot';
import type { DriveFamily, Family, GunFamily, HullFamily, Loadout, Mk, Part, ShotKind } from '../parts';
import type { Research, TankStats } from '../stats';
import type { StructureDef } from '../land';
import type { IntelBag } from '../workshop';
import type { Rail } from './rail';

/** The rival clans, the Iron Hive (chapter 5: the clans' old masters) and our own Ink Brigade. */
export type Clan = 'boars' | 'weasels' | 'crows' | 'hive' | 'ink';
/** The body: a tank, a truck (no gun), the boss and its turrets, or a freed crew on foot. */
export type TankRole = 'tank' | 'truck' | 'boss' | 'bossTurret' | 'crew';

/** The fourth slot (design doc, Tactics §3): picked in the briefing, 2 charges a level. */
export type GadgetKind = 'mines' | 'oil' | 'smoke';
export const GADGETS: readonly GadgetKind[] = ['mines', 'oil', 'smoke'];

/** Rank call-ins (match/callIns.ts): a supply drop (Staff Sergeant) and an artillery strike (Major), once a level each. */
export type CallInKind = 'supply' | 'strike';
export const CALL_INS: readonly CallInKind[] = ['supply', 'strike'];

/** What drives a tank this step: the player's controls or a bot's. */
export interface TankInput {
  /** 'tank': A/D turn, W/S throttle. 'point': steer towards an angle (thumbstick, bots). */
  readonly move: { readonly kind: 'tank'; readonly throttle: number; readonly turn: number } | { readonly kind: 'point'; readonly angle: number; readonly mag: number } | null;
  /** Turret aim, world radians; null keeps it. */
  readonly aim: number | null;
  /** Lobbed guns (the Mortar): how far to lob, px (clamped to the gun's min and max range). Unset keeps the last. */
  readonly aimDist?: number | null;
  readonly fire: boolean;
  /** Held to swap onto the part underneath. */
  readonly swap: boolean;
  /** Pressed to start a repair kit. */
  readonly repair: boolean;
  /** Pressed to use the gadget (lay a mine, spill oil, pop smoke). */
  readonly gadget?: boolean;
  /** Pressed to call in a supply drop or an artillery strike at the aim point (the aim, at aimDist). */
  readonly callIn?: CallInKind | null;
}

export const IDLE: TankInput = { move: null, aim: null, fire: false, swap: false, repair: false };

export interface Tank {
  readonly id: number;
  readonly name: string;
  readonly crew: string;
  readonly clan: Clan;
  readonly team: number;
  readonly role: TankRole;
  readonly isPlayer: boolean;
  readonly ace: boolean;
  loadout: Loadout;
  research: Research;
  stats: TankStats;
  /** HP bonus kept across part swaps (aces). */
  readonly hpMult: number;
  x: number;
  y: number;
  heading: number;
  turret: number;
  /** Lobbed guns: the range the next shell is lobbed to (the last aimDist given). */
  aimDist: number;
  /** Sliding on sand: the velocity it actually moves with (lags the heading on low grip); null on firm ground. */
  slide: { vx: number; vy: number } | null;
  /** A boss body's or an escort vessel's art (BossDef.body, 'barge'), null for everything else. */
  body: string | null;
  /** Moves on deep water only (the barge, the Ironclad): the bank stops it as a wall would. */
  keel: boolean;
  /** A train (chapter 4's boss): moves only along this line (match/rail.ts); null for everything else. */
  rail: Rail | null;
  /** A long body (the train): half its length along the heading, px; shots and tanks meet a capsule. 0: a circle. */
  length: number;
  /** Seconds a Heavy hull has stood on thin ice (match/ice.ts): it gives way at THIN_ICE.give. */
  iceT: number;
  /** Signed, native px per second along the heading. */
  speed: number;
  hp: number;
  alive: boolean;
  /** Left the map by its exit (a convoy truck, a runner) or reached home (a crew). */
  escaped: boolean;
  reload: number;
  /** Belt guns: rounds left, seconds left of a belt reload, and seconds since the trigger was last held. */
  ammo: number;
  beltT: number;
  idleT: number;
  /** Rocket pairs: shots still to fire, and the gap before the next. */
  burst: number;
  burstT: number;
  /** A charged gun (the Rail, chapter 5): seconds of charge left (0: not charging), and the locked aim it fires along. */
  charge: number;
  chargeAngle: number;
  kits: number;
  maxKits: number;
  repairT: number;
  firedAt: number;
  kills: number;
  lastHitBy: number | null;
  lastHitAt: number;
  lastHitDrive: DriveFamily | null;
  usedKit: boolean;
  hullsUsed: HullFamily[];
  picks: Part[];
  swapT: number;
  onPart: number | null;
  /** Touching a repair kit it can't take: its kit bag is full. */
  onFullKit: boolean;
  carrying: boolean;
  /** Distance rolled, for the drive's rolling frames. */
  rolled: number;
  /** A boss turret's body, and where on it the turret sits (body frame). */
  parent: number | null;
  mount: { readonly dx: number; readonly dy: number } | null;
  /** Kills by this tank's victims' parts (for bonus objectives). */
  victims: { hull: HullFamily; drive: DriveFamily; gun: GunFamily; by: GunFamily }[];
  deadAt: number;
  /** The gadget slot: null for enemies and a player without one. */
  gadget: GadgetKind | null;
  gadgetCharges: number;
  /** A one-use gadget of another kind found in a crate: the button uses it first. */
  found: GadgetKind | null;
  /** Each gadget's Mk (the workshop's tiers; found gadgets use them too). */
  gadgetMk: Readonly<Record<GadgetKind, Mk>>;
  /** No second gadget before this time (one press, one use). */
  gadgetT: number;
  /** A mine broke a track: slow until then. */
  trackBrokenUntil: number;
  /** The boss rammed a wall: dazed (and hit harder) until then. */
  stunnedUntil: number;
  /** Sim counters. */
  ambushHits: number;
  gadgetsUsed: number;
  shotsFired: number;
  shotsHit: number;
  dealt: number;
}

export interface Shot {
  readonly id: number;
  readonly owner: number;
  readonly team: number;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  travelled: number;
  readonly range: number;
  readonly damage: number;
  readonly gun: GunFamily;
  readonly splash: number;
  readonly breaksBrick: boolean;
  readonly kind: ShotKind;
  alive: boolean;
  /** A lobbed shell: where it was fired from and where it lands (it flies over everything on the way). */
  readonly lob?: { readonly sx: number; readonly sy: number; readonly tx: number; readonly ty: number };
}

export type PickupKind =
  | { readonly kind: 'crate'; readonly content: CrateContent }
  | { readonly kind: 'part'; readonly part: Part }
  | { readonly kind: 'kit' }
  /** A gadget from a crate: a charge of yours (no `gadget`, or yours), or a one-use other kind. */
  | { readonly kind: 'gadget'; readonly gadget?: GadgetKind }
  | { readonly kind: 'intel'; readonly bag: IntelBag; readonly from: string; readonly ace: boolean }
  | { readonly kind: 'proto' }
  /** A call-in's supply drop (match/callIns.ts): the player opens it and its contents spill out. */
  | { readonly kind: 'supply'; readonly contents: readonly CrateContent[] };

export type Pickup = PickupKind & { readonly id: number; readonly x: number; readonly y: number; taken: boolean };

export interface StructRt {
  readonly def: StructureDef;
  hp: number;
  /** 2 whole, 1 cracked, 0 breached (no longer blocks). */
  state: 2 | 1 | 0;
  /** An avalanche's drift that hasn't fallen yet (chapter 4): state 0, not drawn (match/avalanche.ts). */
  dormant?: boolean;
}

export type MatchEvent =
  | { readonly kind: 'fire'; readonly tank: number; readonly x: number; readonly y: number; readonly angle: number; readonly shot: ShotKind }
  | { readonly kind: 'hit'; readonly x: number; readonly y: number; readonly target: number | null; readonly dmg: number; readonly shot: ShotKind }
  | { readonly kind: 'explode'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'kill'; readonly killer: number | null; readonly victim: number; readonly by: GunFamily | 'artillery' }
  | { readonly kind: 'struct'; readonly id: string; readonly state: 2 | 1 | 0 }
  | { readonly kind: 'swap'; readonly tank: number; readonly part: Part; readonly dropped: Part }
  | { readonly kind: 'pickup'; readonly tank: number; readonly what: 'kit' | 'intel' | 'proto' | 'gadget'; readonly amount: number; /** For blueprints: the part family (a pickup holds one). */ readonly family?: Family; /** For gadgets: which, and whether it's a found one-use or a spare charge turned into blueprints. */ readonly gadget?: GadgetKind; readonly found?: boolean; readonly spare?: boolean }
  | { readonly kind: 'crate'; readonly x: number; readonly y: number }
  | { readonly kind: 'alarm'; readonly x: number; readonly y: number; readonly by: number }
  | { readonly kind: 'escape'; readonly tank: number }
  /** An enemy's shot hit one of its own side. */
  | { readonly kind: 'friendly'; readonly x: number; readonly y: number; readonly target: number }
  | { readonly kind: 'mark'; readonly x: number; readonly y: number; readonly r: number; readonly at: number }
  | { readonly kind: 'objective'; readonly text: string }
  | { readonly kind: 'spawn'; readonly tank: number }
  /** A hit on a calm or suspicious enemy: ×2 damage. */
  | { readonly kind: 'ambush'; readonly x: number; readonly y: number; readonly target: number; readonly dmg: number }
  /** A big gun's telegraph: the aim line held until `until` (match time), then the shot. */
  /** A held aim line; `width` and `dur` for the boss's charge lane. */
  | { readonly kind: 'aim'; readonly tank: number; readonly angle: number; readonly len: number; readonly until: number; readonly width?: number; readonly dur?: number }
  | { readonly kind: 'boss'; readonly what: 'enraged' | 'charge' | 'ram' | 'stunned'; readonly x: number; readonly y: number }
  | { readonly kind: 'gadget'; readonly tank: number; readonly gadget: GadgetKind; readonly x: number; readonly y: number }
  | { readonly kind: 'mine'; readonly x: number; readonly y: number; readonly target: number }
  /** A Mk V oil slick set alight. */
  | { readonly kind: 'ignite'; readonly x: number; readonly y: number; readonly r: number }
  /** A lobbed shell is in the air: it lands at (x, y) at match time `at` (the landing ring). */
  | { readonly kind: 'lob'; readonly tank: number; readonly x: number; readonly y: number; readonly r: number; readonly at: number }
  /** Sandstorms (match/weather.ts): one is coming in `in` s, has rolled in, or has passed. */
  | { readonly kind: 'weather'; readonly what: 'coming' | 'start' | 'end'; readonly in?: number; /** Which: a sandstorm (chapter 2) or a blizzard (chapter 4). */ readonly storm: 'sandstorm' | 'blizzard' }
  /** A Laser's beam (chapter 4, match/beam.ts): from the muzzle to where it stopped; `hit` when it met a tank or a wall. */
  | { readonly kind: 'beam'; readonly tank: number; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly hit: boolean }
  /** A Rail slug (chapter 5, match/railgun.ts): from the muzzle to where it stopped (rock or its range); `hits` tanks it went through. */
  | { readonly kind: 'slug'; readonly tank: number; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly hits: number }
  /** Reeds (chapter 3) or a tree (chapter 5, `tree`) caught fire or burnt out (match/flame.ts, match/forestFire.ts). */
  | { readonly kind: 'burn'; readonly x: number; readonly y: number; readonly id: string; readonly what: 'alight' | 'out'; readonly tree?: boolean }
  /** A log bridge (chapter 5) broke: the crossing is gone (match/spans.ts). */
  | { readonly kind: 'span'; readonly id: string; readonly x: number; readonly y: number }
  /** A dam broke and the ground changed under `cells` cells (match/flood.ts): repaint the ground. */
  | { readonly kind: 'flood'; readonly by: string; readonly x: number; readonly y: number; readonly cells: number }
  /** Thin ice (chapter 4, match/ice.ts): a Heavy cracked it (the warning), or it gave way into a hole of radius r. */
  | { readonly kind: 'ice'; readonly what: 'crack' | 'break'; readonly x: number; readonly y: number; readonly tank: number; readonly r: number }
  /** A set piece acted: a flag raised or lowered, a camp photographed, the courier's gate opened. */
  | { readonly kind: 'setpiece'; readonly what: 'flagOurs' | 'flagLost' | 'photo' | 'gate' | 'avalanche'; readonly x: number; readonly y: number }
  /** A rank call-in (match/callIns.ts): `called` when the player calls it (lands at `at`), `landed` when the crate or shells come down. */
  | { readonly kind: 'callIn'; readonly what: CallInKind; readonly phase: 'called' | 'landed'; readonly x: number; readonly y: number; readonly at: number }
  | { readonly kind: 'over'; readonly passed: boolean; readonly reason: string };

export interface MatchOver {
  readonly passed: boolean;
  readonly reason: string;
  readonly time: number;
}
