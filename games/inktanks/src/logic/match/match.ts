import type { AlarmState } from '../bots/alarm';
import { createBrain, type Brain } from '../bots/brain';
import { botInput } from '../bots/control';
import { botsFor, PLAYER_BOT, type Difficulty } from '../bots/difficulty';
import { segmentHits } from '../geom';
import { buildLand, GROUNDS, type Land } from '../land';
import type { LoadedLevel, ResolvedAlly, ResolvedEnemy } from '../level/load';
import { rollCrate } from '../loot';
import type { FlowCache } from '../nav/flow';
import { passable, type NavGrid } from '../nav/grid';
import { Navs, type NavPair } from '../nav/navs';
import { createObjective } from '../objectives';
import type { Objective } from '../objectives/types';
import { withPart, type Loadout } from '../parts';
import { createRng, type Rng } from '../rng';
import type { Research } from '../stats';
import type { Pt } from '../vec';
import type { IntelBag } from '../workshop';
import { aimAndFire, stepShots } from './combat';
import { autoRange, isLobbed } from './lob';
import { sightCap, stormAt, stormEvents, stormRule, type StormNow, type StormRule } from './weather';
import { banksAt, fogRule, type FogBank, type FogRule } from './fog';
import { newFires, stepFires, type Fires } from './flame';
import { stepForestFire } from './forestFire';
import { floodOn, stepTides } from './flood';
import { stepIce } from './ice';
import { avalancheOn } from './avalanche';
import { spanBroke } from './spans';
import { blowWind } from './wind';
import { gadgetCharges } from '../gadgetTiers';
import type { CrateDef } from '../level/types';
import type { CrateContent } from '../loot';
import type { Mk } from '../parts';
import type { GadgetBag } from '../workshop';
import { MK1_GADGETS, newGadgets, type Gadgets } from './gadgets';
import { stepGadgets, useGadget } from './gadgetUse';
import { driveTank, placeMounted } from './movement';
import { repair, touchPickups } from './pickups';
import { addTank, spawnEnemy, spawnFriend } from './spawn';
import { StructGrid } from './spatial';
import { IDLE, type GadgetKind, type MatchEvent, type MatchOver, type Pickup, type PickupKind, type Shot, type StructRt, type Tank, type TankInput } from './types';

export interface PlayerSetup {
  readonly loadout: Loadout;
  readonly research?: Research;
  readonly kits?: number;
  readonly name?: string;
  /** The gadget slot (picked in the briefing); none by default. */
  readonly gadget?: GadgetKind | null;
  readonly gadgetCharges?: number;
  /** Each gadget's Mk from the workshop (Mk I when absent). */
  readonly gadgetMk?: Readonly<Partial<Record<GadgetKind, Mk>>>;
}

/** Tactics counters for the lab and the results. */
export interface TacticsStats {
  ambushHits: number;
  /** Times an enemy went from ? to ! on seeing you. */
  spotted: number;
}

export interface MatchConfig {
  readonly level: LoadedLevel;
  readonly seed: number;
  /** null: no player (enemies only, for tests and the stress page). */
  readonly player: PlayerSetup | null;
  /** A bot drives the player's tank (the headless sim). */
  readonly playerBot?: boolean;
  readonly difficulty?: Difficulty;
}

/** A crate the level fixed (a part, a kit, a gadget), or null to roll it. */
function crateContent(c: CrateDef['content']): CrateContent | null {
  if (!c) return null;
  if (c === 'kit') return { kind: 'kit' };
  if ('gadget' in c) return { kind: 'gadget', gadget: c.gadget };
  return { kind: 'part', part: c };
}

/** A thumbstick gives a lobbed gun no distance: range it on the enemy it points at (lob.ts autoRange). */
function withLobRange(m: Match, t: Tank, input: TankInput): TankInput {
  if (!isLobbed(t.stats.gun) || input.aim === null || (input.aimDist !== undefined && input.aimDist !== null)) return input;
  return { ...input, aimDist: autoRange(m, t, input.aim) };
}

/** Allied gun towers: never shown hurt (shots fly past them), with a turret's eyes. */
export const TOWER = { hp: 5000, sight: 480, wake: 650 } as const;
const TOWER_AIM: Difficulty = { ...PLAYER_BOT, aimError: 0.05 };

/** A level with no timer still ends here (a stuck sim run). */
export const HARD_CAP = 600;

/**
 * One level being played: its map, every tank, shot and pickup, the alarm
 * and the objective. Pure logic, no rendering: the mission scene and the
 * headless sim both drive it with `step`. The state is mutated in place
 * each step for speed; the rules it applies (stats, damage, loot,
 * objectives) are pure functions over it.
 */
export class Match {
  readonly level: LoadedLevel;
  readonly land: Land;
  /** Navigation per drive (ground, and Hover's once needed); `nav` and `flow` are the ground pair. */
  readonly navs: Navs;
  readonly nav: NavGrid;
  readonly flow: FlowCache;
  readonly rng: Rng;
  readonly structs: StructRt[];
  readonly grid: StructGrid;
  readonly difficulty: Difficulty;
  readonly start: Pt;
  readonly brains = new Map<number, Brain>();
  readonly usedNames = new Set<string>();
  readonly objective: Objective;
  readonly alarm: AlarmState = { firstAt: null, count: 0 };
  readonly gadgets: Gadgets = newGadgets();
  readonly tactics: TacticsStats = { ambushHits: 0, spotted: 0 };
  /** Burning reeds (chapter 3, flame.ts). */
  readonly fires: Fires = newFires();
  /** The land has thin ice (chapter 4, ice.ts). */
  readonly hasThinIce: boolean;
  t = 0;
  tanks: Tank[] = [];
  shots: Shot[] = [];
  pickups: Pickup[] = [];
  events: MatchEvent[] = [];
  over: MatchOver | null = null;
  intel: IntelBag = {};
  /** Gadget blueprints earned this match (kept win or lose, like intel). */
  gadgetIntel: GadgetBag = {};
  player: Tank | null = null;
  nextId = 1;
  /** The level's storm rule, or null in clear weather. */
  readonly storm: StormRule | null;
  /** How far anyone sees right now (Infinity unless a storm blows); set each step. */
  sight = Infinity;
  /** The level's fog banks (chapter 3), or null; `fogNow` is where they are this step. */
  readonly fog: FogRule | null;
  fogNow: readonly FogBank[] = [];
  private waves: ResolvedEnemy[];
  private readonly byId = new Map<number, Tank>();
  private dt = 1 / 60;
  /** Allied gun towers' wake range (−1 once awake). */
  private readonly towerWake = new Map<number, number>();

  constructor(readonly cfg: MatchConfig) {
    this.level = cfg.level;
    this.rng = createRng(cfg.seed);
    this.difficulty = cfg.difficulty ?? botsFor(cfg.level.def.number);
    const w = cfg.level.def.weather;
    this.storm = w?.kind === 'sandstorm' || w?.kind === 'blizzard' ? stormRule(w) : null;
    this.fog = w?.kind === 'fog' ? fogRule(w) : null;
    this.fogNow = this.fog ? banksAt(this.fog, 0) : [];
    this.land = buildLand(cfg.level.land);
    this.hasThinIce = this.land.ground.includes(GROUNDS.indexOf('thinIce'));
    this.navs = new Navs(this.land);
    this.nav = this.navs.ground.nav;
    this.flow = this.navs.ground.flow;
    // An avalanche's drifts lie dormant until their cornice breaks (avalanche.ts).
    this.structs = this.land.structures.map((def): StructRt => (def.dormant ? { def, hp: def.hp, state: 0, dormant: true } : { def, hp: def.hp, state: 2 }));
    this.grid = new StructGrid(this.structs);
    this.start = cfg.level.start;
    for (const c of cfg.level.crates) this.addPickup({ kind: 'crate', content: crateContent(c.content) ?? rollCrate(this.rng, cfg.level.def.loot) }, c.at.x, c.at.y);
    if (cfg.player) this.player = this.spawnPlayer(cfg.player);
    for (const a of cfg.level.allies) this.spawnTower(a);
    this.objective = createObjective(this, cfg.level.def.objective);
    this.waves = cfg.level.enemies.filter((e) => e.role === 'wave');
    for (const e of cfg.level.enemies) if (e.role !== 'wave') spawnEnemy(this, e);
    // Tanks on your side (chapter 5): from the start, or when the structure they're held behind breaks.
    for (const f of cfg.level.friends) if (f.join === undefined) spawnFriend(this, f);
    this.drainEvents();
  }

  private spawnPlayer(p: PlayerSetup): Tank {
    // Parts the level issues (level 21's Hover) go over your own for this level.
    const loadout = (this.level.def.issue ?? []).reduce(withPart, p.loadout);
    const t = addTank(this, { name: p.name ?? 'You', clan: 'ink', team: 0, isPlayer: true, loadout, research: p.research, kits: p.kits ?? 1, maxKits: p.kits ?? 1, gadget: p.gadget ?? null, gadgetMk: { ...MK1_GADGETS, ...p.gadgetMk }, gadgetCharges: p.gadgetCharges, at: this.start, heading: this.level.def.startHeading ?? 0 });
    if (this.cfg.playerBot) this.brains.set(t.id, createBrain(t, null, PLAYER_BOT, this.rng.fork(999)));
    return t;
  }

  /** An allied gun tower: one of our turrets on its tower base, quiet until you come near. */
  private spawnTower(a: ResolvedAlly): void {
    const t = addTank(this, { name: 'Gun tower', clan: 'ink', team: 0, role: 'bossTurret', loadout: { gun: { family: a.gun, mk: a.mk ?? 2 }, hull: { family: 'heavy', mk: 1 }, drive: { family: 'tracks', mk: 1 } }, at: a.at, heading: -Math.PI / 2 });
    t.stats = { ...t.stats, maxHp: TOWER.hp, radius: 22 };
    t.hp = TOWER.hp;
    // Our gunners aim like a good player, not like the enemy's deliberately sloppy crews.
    this.brains.set(t.id, createBrain(t, null, TOWER_AIM, this.rng.fork(t.id)));
    Object.assign(this.brains.get(t.id)!, { role: 'turret', sight: TOWER.sight });
    this.towerWake.set(t.id, a.wake ?? TOWER.wake);
  }

  /** Whether an allied gun tower has opened up (you came within its wake range once). */
  towerAwake(t: Tank): boolean {
    const wake = this.towerWake.get(t.id);
    if (wake === undefined) return true;
    if (wake < 0) return true;
    const p = this.player;
    if (p?.alive && Math.hypot(p.x - t.x, p.y - t.y) <= wake) {
      this.towerWake.set(t.id, -1);
      return true;
    }
    return false;
  }

  emit(e: MatchEvent): void {
    this.events.push(e);
    if (this.events.length > 4000) this.events.splice(0, 2000);
  }

  drainEvents(): MatchEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  tank(id: number): Tank | undefined {
    let t = this.byId.get(id);
    if (!t) {
      t = this.tanks.find((x) => x.id === id);
      if (t) this.byId.set(id, t);
    }
    return t;
  }

  point(key: string): Pt {
    const p = this.land.def.points[key];
    if (!p) throw new Error(`level ${this.level.def.number} has no point "${key}"`);
    return p;
  }

  road(key: string): readonly Pt[] {
    const r = this.land.def.roads[key];
    if (!r) throw new Error(`level ${this.level.def.number} has no road "${key}"`);
    return r;
  }

  addPickup(kind: PickupKind, x: number, y: number): Pickup {
    const p = { ...kind, id: this.nextId++, x, y, taken: false } as Pickup;
    this.pickups.push(p);
    return p;
  }

  /** A tank leaves the map by its exit (no wreck): a convoy truck, a runner, a crew reaching home. */
  escape(t: Tank): void {
    if (!t.alive) return;
    t.alive = false;
    t.escaped = true;
    t.deadAt = this.t;
    this.emit({ kind: 'escape', tank: t.id });
  }

  /** Waves still to come; `timedOnly` leaves out the ones waiting on the alarm or the objective. */
  pendingWaves(timedOnly = false): number {
    return timedOnly ? this.waves.filter((w) => typeof w.when === 'number').length : this.waves.length;
  }

  navPassable(x: number, y: number): boolean {
    return passable(this.nav, x, y);
  }

  /** The nav grid and flow fields a tank steers by: Hover's (deep water open) for a floating drive, a Heavy's (thin ice closed). */
  navFor(t: Tank): NavPair {
    return this.navs.for(t.stats.floats, t.stats.hull === 'heavy');
  }

  /** A structure's cells reopen in every nav grid. */
  unblockNav(id: string): void {
    this.navs.unblock(id);
  }

  /** A structure just broke (movement.ts breakStructure): dams flood, burning reeds go out. */
  structBroke(s: StructRt): void {
    if (this.level.def.floods) floodOn(this, s);
    if (this.level.def.avalanches) avalancheOn(this, s);
    if (s.def.span) spanBroke(this, s);
    for (const f of this.level.friends) {
      if (f.join !== s.def.id) continue;
      const t = spawnFriend(this, f);
      this.emit({ kind: 'objective', text: `${t.name} joins you!` });
    }
  }

  /** Changes the player's gadget before the start (the briefing's picker); charges reset. */
  setPlayerGadget(kind: GadgetKind | null): void {
    const p = this.player;
    if (!p || this.t > 0) return;
    p.gadget = kind;
    p.gadgetCharges = kind ? gadgetCharges(kind, p.gadgetMk[kind]) : 0;
  }

  /** The first solid structure crossing a→b (other than `ignore`), or null. */
  lineBlocker(ax: number, ay: number, bx: number, by: number, ignore: string | null): StructRt | null {
    const ids = this.grid.query({ x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) });
    for (const i of ids) {
      const s = this.structs[i]!;
      if (s.state === 0 || s.def.cover || s.def.flattenable || s.def.perch || s.def.crest || s.def.deck || s.def.span || s.def.id === ignore) continue;
      if (segmentHits(s.def.shape, s.def.x, s.def.y, ax, ay, bx, by)) return s;
    }
    return null;
  }

  private inputFor(t: Tank, playerInput: TankInput): TankInput {
    const own = this.objective.drive(t);
    if (own) return own;
    if (t.role === 'truck' && !this.brains.has(t.id)) return IDLE;
    if (t.isPlayer && !this.cfg.playerBot) return withLobRange(this, t, playerInput);
    if (!this.towerAwake(t)) return IDLE;
    const b = this.brains.get(t.id);
    return b ? botInput(this, b, t, this.dt) : IDLE;
  }

  step(dt: number, playerInput: TankInput = IDLE): void {
    if (this.over) return;
    this.dt = dt;
    this.stepWeather(this.t, this.t + dt);
    this.t += dt;
    this.stepWaves();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const input = this.inputFor(t, playerInput);
      if (!t.alive) continue;
      driveTank(this, t, input, dt);
      placeMounted(this, t);
      aimAndFire(this, t, input, dt);
      repair(this, t, input, dt);
      if (input.gadget) useGadget(this, t);
      touchPickups(this, t, input, dt, input.swap);
    }
    stepIce(this, dt);
    if (this.storm && this.sight < Infinity) blowWind(this, this.storm, dt);
    stepShots(this, dt);
    stepGadgets(this, dt);
    stepFires(this);
    this.objective.step(dt);
    this.checkOver();
  }

  private stepWeather(t0: number, t1: number): void {
    if (this.fog) this.fogNow = banksAt(this.fog, t1);
    if (this.level.def.floods) stepTides(this, t0, t1);
    if (this.level.def.fire) stepForestFire(this, t0, t1);
    if (!this.storm) return;
    for (const e of stormEvents(this.storm, t0, t1)) this.emit({ kind: 'weather', storm: this.storm.kind, ...e });
    this.sight = sightCap(this.storm, t1);
  }

  /** The storm now (null in clear weather), for the HUD and the sand overlay. */
  stormNow(): StormNow | null {
    return this.storm ? stormAt(this.storm, this.t) : null;
  }

  private stepWaves(): void {
    if (this.waves.length === 0) return;
    const ready = (w: ResolvedEnemy): boolean =>
      typeof w.when === 'number' ? this.t >= w.when : w.when === 'alarm' ? this.alarm.firstAt !== null : this.objective.staged();
    const due = this.waves.filter(ready);
    if (due.length === 0) return;
    this.waves = this.waves.filter((w) => !ready(w));
    for (const w of due) spawnEnemy(this, w);
  }

  private finish(passed: boolean, reason: string): void {
    this.over = { passed, reason, time: this.t };
    this.emit({ kind: 'over', passed, reason });
  }

  private checkOver(): void {
    const p = this.player;
    if (p && !p.alive) return this.finish(false, 'destroyed');
    const s = this.objective.status();
    if (s.failed) return this.finish(false, s.failed);
    if (s.done) return this.finish(true, 'objective');
    const limit = this.level.def.timeLimit;
    if (limit !== undefined && this.t >= limit) return this.finish(false, 'time');
    if (this.t >= HARD_CAP) this.finish(false, 'time');
  }

  /** Seconds left on the level's timer, or null when it has none. */
  timeLeft(): number | null {
    const limit = this.level.def.timeLimit;
    return limit === undefined ? null : Math.max(0, limit - this.t);
  }
}
