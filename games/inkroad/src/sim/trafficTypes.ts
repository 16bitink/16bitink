/**
 * The two contracts inside the simulation:
 *   Network: the road graph as immutable values (src/sim/network*.ts)
 *   Traffic: the cars on it (src/sim/traffic*.ts)
 * src/city decides who drives, where they park and what it costs; Traffic only
 * moves what it is given and measures it.
 */
import type {
  CarsView, Cell, CellRect, Control, Id, Junction, JunctionStats, Level, Link, Movement, Pt, Road, RoadDef, RoadStats, RoadType, Terrain, VehicleKind,
} from './types';

// ---------------------------------------------------------------- network

export interface Network {
  readonly version: number;
  readonly width: number; // cells
  readonly height: number;
  readonly terrain: readonly (readonly Terrain[])[];
  readonly roads: readonly Road[];
  readonly links: readonly Link[];
  readonly junctions: readonly Junction[];
  readonly gates?: readonly { readonly id: string; readonly cell: readonly [number, number] }[];
  /** Next free id (nodes and roads share the counter). */
  readonly nextId?: number;
}

export interface RoadPlan {
  readonly ok: boolean;
  readonly why?: string;
  readonly cells: readonly Cell[];
  readonly line: readonly Pt[];
  readonly type: RoadType;
  readonly oneWay: boolean;
  readonly level: Level;
  readonly cellsOnWater: number;
  readonly length: number; // cells (diagonal = 1.4)
  /** Existing roads it will cut into two (a new junction appears). */
  readonly splits: readonly Id[];
  /** With a refusal: what is in the way. */
  readonly at?: CellRect;
}

/**
 * network.ts exports (all pure; each change returns a new Network with version + 1; ids of untouched
 * roads, links and junctions never change):
 *
 *   createNetwork(map: readonly string[], roads: readonly RoadDef[], gates): Network
 *   planRoad(net, cells, type, { oneWay, blocked }): RoadPlan        // blocked(cell): true where lots or car parks stand
 *   addRoad(net, plan, { fixed? }): Network
 *   removeRoad(net, id): Network                                      // heals: a two-arm junction without a control becomes a bend
 *   setRoad(net, id, patch: Partial<Pick<Road, 'type'|'busLane'|'kerb'|'toll'|'truckBan'|'works'|'nightWorks'|'oneWay'>>): Network
 *   setControl(net, node, control): Network
 *   setSplit(net, node, split): Network
 *   planFlyover(net, node, fromRoad, toRoad, level): RoadPlan & { ramps }   // leaves fromRoad ~3 cells before the node, joins toRoad ~3 cells after
 *   addFlyover(net, plan): Network
 *   nearestAccess(net, rect): { road, s } | null                      // driveway for a block; never a highway, flyover or bridge
 *   junctionAt(net, cell), roadAt(net, cell)
 */
export interface NetworkApi {
  createNetwork(map: readonly string[], roads: readonly RoadDef[], gates: readonly { id: string; cell: readonly [number, number] }[]): Network;
}

// ---------------------------------------------------------------- traffic

/** A place on a road where cars enter and leave: a driveway, a car park, a kerb bay, or a map gate (gate node id). */
/** A place on a road (`dir`: only the lanes running with the road's line, 1, or against it, -1), or a gate. */
export type Access = { readonly road: Id; readonly s: number; readonly dir?: 1 | -1 } | { readonly gate: Id };

export interface SpawnRequest {
  readonly from: Access;
  readonly to: Access;
  readonly kind: VehicleKind;
  readonly tint?: number;
  /** Money the driver would pay to save one second (tolls in routing). */
  readonly value: number;
  /** Opaque to Traffic; comes back on the arrival. */
  readonly tag: number;
  /**
   * Pulling out of a space: the car enters only where its lane has a gap (no car close upstream, the point not
   * held), then stands there holding the lane (state 4) for this many seconds before it drives off.
   */
  readonly hold?: number;
  /** Where the car is drawn when it appears (the end of its played move out, the body's middle): it goes on from there. */
  readonly pose?: LanePose;
}

/** Where a car stands in its lane: plan px and heading (radians, 0 = east, clockwise). */
/** `v`: the drawn car's speed there (px/s), when it is moving (a manoeuvre starts from it, never from a standstill it never reached). */
export interface LanePose { readonly x: number; readonly y: number; readonly a: number; readonly v?: number; /** Its acceleration (px/s²) then. */ readonly acc?: number }

export interface Arrival { readonly uid: number; readonly slot: number; readonly tag: number; readonly seconds: number; readonly waited: number; readonly tolls: number; readonly at: Pt; /** Heading where it was last drawn. */ readonly a?: number }

export interface Trip { readonly seconds: number; readonly toll: number; readonly reachable: boolean; readonly viaRoads?: readonly Id[] }

export interface Traffic {
  readonly cars: CarsView;
  readonly active: number;
  /** Swap the network between or during days. Cars on removed roads are re-routed or sent home; none may end up off the road. */
  setNetwork(net: Network): void;
  /** Price now charged at each tolled road, and capacity factors from weather or incidents (1 = normal). */
  setConditions(c: { readonly tollNow: number; readonly speed: number; readonly trucksAllowed: boolean }): void;
  /** -1 when the entry is full or the cap is reached (the city retries or counts it as held up at home). */
  spawn(r: SpawnRequest): number;
  /** Send a car that has just arrived (and waits at its destination for at most one step) somewhere else: the search for a space. */
  redirect(uid: number, to: Access): boolean;
  /** Take an arrived car off the road (it parked, or left by a gate). */
  remove(uid: number): void;
  /** An arrived car turns into its space: it holds its lane where it stopped (state 4) for `seconds`, then is gone. False: no such car. */
  park(uid: number, seconds: number): boolean;
  /** The drawn frames of a car through the last step (x, y, heading each, SUB + 1 of them), or null. */
  framesOf(uid: number): Float64Array | null;
  /** Where a car on the road stands now, or null. */
  poseOf(uid: number): LanePose | null;
  /** Where `spawn(r)` would put a car leaving a space (its kerb lane at r.from), without making it; null from a gate or with no way. */
  entryPose(r: SpawnRequest): LanePose | null;
  /** Double-parked or broken down: the lane is blocked there for `seconds`. Gone when the time is up. */
  block(at: Access, seconds: number, state: 2 | 3 | 4, kind?: VehicleKind): number;
  /** Turning across the far side of a road at `at` (the car heading `heading`): seconds until its other-way lanes have a `gap`-second gap. */
  gapAcross(at: Access, heading: number, gap: number): number;
  /** Its own lanes at `at`: clear of bodies from `back` px behind to `ahead` px past, nobody arriving within `seconds` (a pull-out's lane time). */
  laneClear(at: Access, heading: number, back: number, ahead: number, seconds: number): boolean;
  /** Holds those other-way lanes at `at` for `seconds` (the body is in them). Returns how many lanes. */
  holdAcross(at: Access, heading: number, seconds: number): number;
  /** Buses, trams and school buses: drive the stops in a loop, pausing `dwell` at each. Returns a handle. */
  addService(r: { readonly stops: readonly Access[]; readonly kind: VehicleKind; readonly dwell: number; readonly vehicles: number; readonly tag: number }): number;
  removeService(id: number): void;
  /** Mean seconds for one lap over the last day, for waits and crowding. */
  serviceLap(id: number): number;
  /** Expected trip by the current travel-time fields (cheap: cached per destination node). */
  estimate(from: Access, to: Access, value: number): Trip;
  step(): void; // STEP seconds
  drainArrivals(): Arrival[];
  drainGaveUp(): Arrival[];
  drainHonks(): Pt[];
  movements(node: Id): readonly Movement[];
  roadStats(road: Id): RoadStats;
  junctionStats(node: Id): JunctionStats;
  /** uids now on the road, for `trace`. */
  carsOn(road: Id): readonly number[];
  routeOf(uid: number): { readonly tag: number; readonly seconds: number; readonly waited: number } | null;
  /** Clear the day's measurements (dawn) or every car (night). */
  startDay(): void;
  endDay(): void;
}

/** traffic.ts exports createTraffic(net: Network, seed: number): Traffic */
export type { Control };
