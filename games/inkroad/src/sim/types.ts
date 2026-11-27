/**
 * The contract every part of InkRoad shares. No Phaser, no DOM.
 *
 * World units are plan pixels: one grid cell is CELL px, a lane is LANE px.
 * x grows east, y grows south. The renderer tilts the ground; the sim never
 * knows about the tilt.
 *
 *   src/sim   traffic: the road graph, cars, junctions, routes, parking spaces, buses
 *   src/city  the authority: seasons, money, approval, growth, years, commands
 */

export type Id = number;
export interface Pt { readonly x: number; readonly y: number }
/** A grid vertex. World position = (gx * CELL, gy * CELL). */
export interface Cell { readonly gx: number; readonly gy: number }
/** Corner based, like a lot: world rect = gx*CELL, gy*CELL, w*CELL, h*CELL. A vertex's own square is (gx-0.5, gy-0.5, 1, 1). */
export interface CellRect { readonly gx: number; readonly gy: number; readonly w: number; readonly h: number }

// ---------------------------------------------------------------- the road graph

export type RoadType = 'street' | 'avenue' | 'boulevard' | 'highway';
/** deck = flyover or bridge over a road; under = underpass. */
export type Level = -1 | 0 | 1;
export type Control = 'yield' | 'roundabout' | 'signal' | 'smart';

/**
 * A road: what the player builds and taps. It runs between two junctions (or a
 * dead end, or the map's edge) and owns one directed Link per direction
 * (one for a one-way road).
 */
export interface Road {
  readonly id: Id;
  readonly type: RoadType;
  readonly a: Id; // node ids
  readonly b: Id;
  /** Grid vertices from a to b, both included. */
  readonly cells: readonly Cell[];
  /** Smoothed centre line, world units. */
  readonly line: readonly Pt[];
  readonly level: Level;
  readonly links: readonly Id[];
  readonly oneWay: boolean;
  /** One-way roads: 1 (default) = a to b, -1 = b to a. */
  readonly dir?: 1 | -1;
  /** The flyover or underpass that serves one movement of one junction. */
  readonly flyover?: { readonly node: Id; readonly fromRoad: Id; readonly toRoad: Id };
  /** A deck that crosses another deck stands higher: 2 (or 3). Default 1. */
  readonly tier?: number;
  readonly bridge: boolean; // over water
  readonly busLane: boolean;
  readonly kerb: boolean; // paid kerb bays
  readonly toll: boolean;
  readonly truckBan: boolean;
  /** 0 = open. Seasons of road works left; capacity is halved while > 0. */
  readonly works: number;
  readonly nightWorks: boolean;
  /** Roads that exist at the start and can't be removed (map entries). */
  readonly fixed: boolean;
  /** Twin Isles: this water crossing runs under the sea (draw portals, hide the middle). */
  readonly tunnel?: boolean;
  /** Twin Isles: the toll gate here follows the speed (see SpecialView.speedTolls). */
  readonly speedToll?: boolean;
  /** Cross Rivers: 1 = new, 0 = falling apart. Absent = this city's roads don't age. */
  readonly condition?: number;
  /** Cross Rivers: a piece of the old freeway that may become a boulevard. */
  readonly freeway?: boolean;
}

/** One direction of a road. */
export interface Link {
  readonly id: Id;
  readonly road: Id;
  readonly from: Id;
  readonly to: Id;
  readonly lanes: number;
  readonly line: readonly Pt[];
  readonly length: number;
  readonly freeSpeed: number; // px/s
}

export interface Junction {
  readonly id: Id;
  readonly cell: Cell;
  readonly x: number;
  readonly y: number;
  readonly control: Control;
  /** Roads meeting here, clockwise from north. One road = a dead end or a map gate; two = a bend (no control). */
  readonly arms: readonly Id[];
  /** Radius of the drawn junction (the roundabout's outer edge), world units. */
  readonly radius: number;
  /** Signals: share of green for each phase, sums to 1. */
  readonly split: readonly number[];
  /** Set on gates where traffic enters and leaves the map. */
  readonly gate?: string;
  readonly works: number;
  /** Where a flyover's ramp leaves or joins a road: not a junction to the player (no control, not tappable). */
  readonly ramp?: boolean;
}

/** One movement through a junction, measured over the last drawn day. */
export interface Movement {
  readonly node: Id;
  readonly fromRoad: Id;
  readonly toRoad: Id;
  /** Cars that made it, and the mean seconds each waited. */
  readonly cars: number;
  readonly wait: number;
  /** This movement's share of all waiting at the junction, 0..1. */
  readonly share: number;
  /** Drawn as an arrow, tail to head. */
  readonly arrow: readonly Pt[];
  /** A flyover or underpass already carries it. */
  readonly flyover: boolean;
}

// ---------------------------------------------------------------- moving things

export type VehicleKind =
  | 'car' | 'taxi' | 'van' | 'truck' | 'bus' | 'tram' | 'tow' | 'school' | 'police';

/** Struct of arrays, live and reused: read it, never keep or write it. */
export interface CarsView {
  readonly count: number; // slots in use; skip slots where alive[i] is 0
  readonly alive: Uint8Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly heading: Float32Array; // radians, 0 = east, clockwise (screen)
  readonly z: Float32Array; // 0 ground, DECK_Z on a deck, negative below
  readonly speed: Float32Array;
  readonly kind: Uint8Array; // index into VEHICLES
  readonly tint: Uint8Array; // index into the car palette
  /** 0 calm … 1 furious (waited long); drawn as a puff over the car. */
  readonly anger: Float32Array;
  readonly blinker: Int8Array; // -1 left, 0, 1 right
  /** 1 = looking for a space, 2 = double-parked, 3 = broken down, 4 = parking or leaving a space (holds its lane; not drawn by the car layer: the parked-car layer draws the manoeuvre). */
  readonly state: Uint8Array;
  /** Stable while the car lives, so the renderer can follow one. */
  readonly uid: Uint32Array;
}

// ---------------------------------------------------------------- the city

export type LotKind =
  | 'home' | 'market' | 'shops' | 'office' | 'school' | 'hospital' | 'mall' | 'stadium' | 'port' | 'fair'
  | 'park' | 'square' | 'landmark'
  /** Routines: where small children, empty tanks, dinners and free afternoons go. */
  | 'nursery' | 'fuel' | 'food' | 'fun'
  /** A public beach: a place people go, but never in CityView.lots (see CityView.beaches). */
  | 'beach';

/** A block of buildings. Level 0 = not opened yet (sand, or the Master Plan's outline). */
export interface Lot {
  readonly id: Id;
  readonly name: string;
  readonly kind: LotKind;
  /** Top-left cell and size in cells; buildings fill it. */
  readonly gx: number; readonly gy: number; readonly w: number; readonly h: number;
  readonly level: 0 | 1 | 2 | 3 | 4;
  readonly opensYear: number; // year of the city, 1..10
  readonly maxLevel: 1 | 2 | 3 | 4;
  /** Where its driveway meets a road: road id and distance along, or null if cut off. */
  readonly access: { readonly road: Id; readonly s: number } | null;
  readonly district: string;
  /** Which building picture: 0..n-1, stable. */
  readonly variant: number;
  /** A deep plot: the buildings stand in the north half, the south half is their own front garden down to the gate. Homes count only the built half. */
  readonly garden?: boolean;
}

export type CarParkKind = 'lot' | 'multi' | 'under' | 'ride';
export interface CarPark {
  readonly id: Id;
  readonly kind: CarParkKind;
  readonly gx: number; readonly gy: number; readonly w: number; readonly h: number;
  readonly spaces: number;
  readonly used: number;
  readonly access: { readonly road: Id; readonly s: number } | null;
  /** 0..1 mean over the last drawn day. */
  readonly occupancy: number;
  /** Beach parking: a surface lot beside a public beach. */
  readonly beach?: boolean;
}

export type TransitMode = 'bus' | 'express' | 'tram' | 'metro' | 'boat';
export interface TransitLine {
  readonly id: Id;
  readonly mode: TransitMode;
  readonly name: string;
  readonly colour: number; // index
  /** Bus and tram: road ids in order (from stop to stop). Metro and boat: straight between stops. */
  readonly stops: readonly Cell[];
  readonly path: readonly Pt[];
  /** Vehicles on the line: 1..6. */
  readonly vehicles: number;
  readonly riders: number; // last season
  readonly crowding: number; // 0..1+
  readonly works: number;
  /** Seven Hills: a minibus nobody asked for. Private ones stop anywhere; licensed ones pay and behave. Not ours to change or remove (see the 'minibus' command). */
  readonly mini?: 'private' | 'licensed';
}

/** Terrain letters in a city map: '.' buildable ground, '~' water, '#' blocked (rock, hill, old walls), 'h' heritage (roads but no widening past a street), 'p' park, 'b' beach (protected: only a bridge's approach and beach parking). */
export type Terrain = '.' | '~' | '#' | 'h' | 'p' | 'b';

// ---------------------------------------------------------------- the authority

export type Bar = 'trips' | 'parking' | 'cost' | 'streets';
export type Period = 'dawn' | 'am' | 'mid' | 'pm' | 'night';

export interface Prices {
  readonly park: number;      // per stay, off-peak
  readonly parkPeak: number;
  readonly fine: number;
  readonly toll: number;
  readonly tollPeak: number;
  readonly fare: number;
  /** Old Harbour's zone charge, 0 = none. */
  readonly zone: number;
}

export interface Policies {
  readonly inspectors: number; // 0..5
  readonly permits: boolean; // residents park free at home
  readonly truckHours: boolean;
  readonly nightWorks: boolean;
  readonly taxis: number; // 0..3 ranks
}

export interface Ledger {
  readonly income: Readonly<Record<'parking' | 'fines' | 'tolls' | 'fares' | 'zone' | 'grant' | 'auction' | 'float' | 'budget', number>>;
  readonly costs: Readonly<Record<'building' | 'land' | 'upkeep' | 'transit' | 'staff' | 'interest', number>>;
}

export interface Complaint {
  readonly who: string; // 'Hamda the hedgehog'
  readonly animal: string; // portrait key
  readonly text: string;
  readonly bar: Bar;
  readonly at: Pt; // the place, for "show me"
  readonly weight: number;
  /** Who it is, when it is somebody who lives here, and their day in one line ("Saffron School, then Stamp Office, 8 minutes late"). */
  readonly household?: Id;
  readonly day?: string;
}

export interface Letter { readonly year: number; readonly season: number; readonly approval: number; readonly worst: Bar; readonly text: string }

export interface TechDef { readonly id: string; readonly name: string; readonly text: string; readonly icon: string }

export interface Commission {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly upfront: number; readonly reward: number;
  readonly goal: string; // shown: 'Mean wait at Pearl Roundabout under 20 s'
  readonly progress: number; // 0..1 at the last review
  readonly endsYear: number; readonly endsSeason: number;
  readonly state: 'offered' | 'taken' | 'done' | 'failed';
}

/** The year's own target, shown at its start: the third plate. */
export interface YearGoal { readonly text: string; readonly value: number; readonly target: number; readonly met: boolean; readonly unit: string }

export type ToolId =
  | 'street' | 'avenue' | 'boulevard' | 'highway' | 'remove' | 'junction' | 'flyover' | 'underpass'
  | 'kerb' | 'parking' | 'toll' | 'bus' | 'buslane' | 'tram' | 'metro' | 'boat' | 'oneway' | 'square' | 'zone';

export type Phase =
  | 'yearStart'   // the year card is up; nothing runs
  | 'day'         // a season's drawn day is running
  | 'review'      // night: prices, money, complaints
  | 'yearEnd'     // Council review, plates, technology
  | 'replaced' | 'cityDone';

/** Everything the player can do. `quote` prices it, `apply` does it. All validated in src/city. */
export type Command =
  | { readonly t: 'road'; readonly cells: readonly Cell[]; readonly type: RoadType; readonly oneWay?: boolean }
  | { readonly t: 'upgrade'; readonly road: Id; readonly type: RoadType }
  | { readonly t: 'oneWay'; readonly road: Id; readonly dir: 0 | 1 | -1 }
  | { readonly t: 'remove'; readonly road: Id }
  | { readonly t: 'removePark'; readonly park: Id }
  | { readonly t: 'control'; readonly node: Id; readonly control: Control }
  | { readonly t: 'split'; readonly node: Id; readonly split: readonly number[] }
  | { readonly t: 'flyover'; readonly node: Id; readonly fromRoad: Id; readonly toRoad: Id; readonly level: 1 | -1 }
  | { readonly t: 'kerb'; readonly road: Id; readonly on: boolean }
  | { readonly t: 'carPark'; readonly kind: CarParkKind; readonly at: Cell }
  | { readonly t: 'toll'; readonly road: Id; readonly on: boolean }
  | { readonly t: 'busLane'; readonly road: Id; readonly on: boolean }
  | { readonly t: 'truckBan'; readonly road: Id; readonly on: boolean }
  | { readonly t: 'square'; readonly road: Id } // close a road to cars
  | { readonly t: 'line'; readonly mode: TransitMode; readonly stops: readonly Cell[] }
  | { readonly t: 'lineVehicles'; readonly line: Id; readonly vehicles: number }
  | { readonly t: 'removeLine'; readonly line: Id }
  | { readonly t: 'prices'; readonly prices: Partial<Prices> } // review only
  | { readonly t: 'policies'; readonly policies: Partial<Policies> }
  | { readonly t: 'tech'; readonly id: string } // yearEnd only
  | { readonly t: 'commission'; readonly id: string; readonly take: boolean }
  | { readonly t: 'float'; readonly stream: 'parking' | 'tolls' }
  | { readonly t: 'vote'; readonly keep: boolean } // the zone charge referendum is run by the city; this starts it
  | { readonly t: 'licences'; readonly quota: number } // Twin Isles, yearEnd: car licences to sell at the next auction
  | { readonly t: 'speedToll'; readonly road: Id; readonly on: boolean } // Twin Isles: a gate that keeps its road at a speed
  | { readonly t: 'tollLimit'; readonly max: number } // Twin Isles, review: the dearest a speed toll may get
  | { readonly t: 'minibus'; readonly line: Id; readonly deal: 'license' | 'buyOut' } // Seven Hills
  | { readonly t: 'repair'; readonly road: Id } // Cross Rivers: one season of works
  | { readonly t: 'replace'; readonly road: Id } // Cross Rivers: two seasons, as new; bridges are matched
  | { readonly t: 'boulevard'; readonly road: Id } // Cross Rivers: this piece of freeway becomes a boulevard with a park
  | { readonly t: 'beach'; readonly id: string; readonly advice: 'sell' | 'public' | 'out' } // yearStart: the Director's word on a beach
  | { readonly t: 'next' }; // close the current card: start the year / next season / next year

/** A flyover being built: seasons left. `line` is where it will run. */
export interface Project {
  readonly id: Id;
  readonly node: Id; readonly fromRoad: Id; readonly toRoad: Id; readonly level: 1 | -1;
  readonly line: readonly Pt[];
  readonly left: number;
}

export interface Quote {
  readonly ok: boolean;
  /** Why not, in a player's words: 'Too dear: 420 of 300', 'Water: bridges must be straight'. */
  readonly why?: string;
  /** The whole price, land included. */
  readonly cost: number;
  /** The part of `cost` that buys land. */
  readonly land: number;
  /** Seasons of works. */
  readonly works: number;
  /** For the ghost drawing. */
  readonly line?: readonly Pt[];
  readonly level?: Level;
  readonly warn?: string; // 'Runs past 3 homes: noise'
  /** Good to know, not a warning: 'Beach parking: Pearl Beach'. */
  readonly note?: string;
  /** With a refusal: what is in the way, for the view to flash. */
  readonly at?: CellRect;
}

/** Things that happened, drained by the view once a frame for sound and effects. */
export type CityEvent =
  | { readonly t: 'built'; readonly what: Command['t']; readonly at: Pt }
  | { readonly t: 'opened'; readonly road: Id; readonly at: Pt }
  | { readonly t: 'grew'; readonly lot: Id; readonly level: number }
  | { readonly t: 'shrank'; readonly lot: Id; readonly level: number }
  | { readonly t: 'honk'; readonly at: Pt }
  | { readonly t: 'gaveUp'; readonly at: Pt }
  | { readonly t: 'cleared'; readonly node: Id } // a junction that was red is green again
  | { readonly t: 'jammed'; readonly node: Id }
  | { readonly t: 'fine'; readonly at: Pt; readonly amount: number }
  | { readonly t: 'money'; readonly at: Pt; readonly amount: number }
  | { readonly t: 'incident'; readonly kind: string; readonly at: Pt; readonly text: string }
  | { readonly t: 'letter'; readonly letter: Letter }
  | { readonly t: 'phase'; readonly phase: Phase }
  /** The season's second drawn day begins (phase stays 'day'): light, music and the title "Weekend". */
  | { readonly t: 'weekend' }
  /**
   * A car moves between its slot and `lane` (where it stands in the lane, plan px, heading in radians) over `move`
   * seconds; the lane is held (car state 4) only for the `seconds` of it spent in the lane.
   * in: lane first (held for `seconds`), then off the road into the slot; `parking` lists it in the slot from this step.
   * out: it leaves the slot now and drives off the road to the lane edge for `move - seconds`; `parking` no longer
   *   lists it from this step (its slot stays its own). It then waits at the edge for its `parkGo`.
   * A car that gives up waiting at the edge gets an 'in' with seconds 0 (no lane hold) back into its slot.
   */
  | { readonly t: 'park'; readonly dir: 'in' | 'out'; readonly car: number; readonly key: string; readonly slot: number; readonly lane: { readonly x: number; readonly y: number; readonly a: number }; readonly seconds: number; /** The whole move, at least `seconds`: the lane is held only for the part of it in the lane (the start of 'in', the end of 'out'); the rest happens off the road. */ readonly move?: number; readonly tint: number; readonly kind: ParkedCar['kind'] }
  /**
   * The car waiting at the lane edge after its 'out' found its gap: from the edge into `lane` over `seconds` (the lane
   * held, car state 4), then it drives off as a moving car. Comes `move - seconds` after the 'out' when the lane is
   * clear, later when it is not; `car` and `lane` as in that 'out' (`lane` is where it now stands).
   */
  | { readonly t: 'parkGo'; readonly car: number; readonly key: string; readonly lane: { readonly x: number; readonly y: number; readonly a: number }; readonly seconds: number; /** Its traffic uid from now on: the car layer picks it up without fading in. */ readonly uid?: number }
  | { readonly t: 'toast'; readonly who: string; readonly text: string };

/** Per-road and per-junction numbers the map views colour by. Over the last ~30 s (live) or the last day. */
export interface RoadStats { readonly flow: number; readonly speedRatio: number; readonly queue: number }
export interface JunctionStats { readonly wait: number; readonly cars: number; readonly grade: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' }

/**
 * What the view and the UI read. Implemented by src/city/city.ts. Cheap to
 * read every frame; collections are replaced (new array) when they change,
 * so `!==` is a dirty check. `version` bumps when the road network changes
 * (re-bake the ground).
 */
export interface CityView {
  readonly def: CityDef;
  readonly year: number; // 1..10
  readonly season: 0 | 1 | 2 | 3;
  readonly phase: Phase;
  readonly clock: number; // seconds into the drawn day, 0..dayLength
  /** A season is a workday and then a weekend, both in phase 'day'. The review comes after the weekend. */
  readonly dayKind: DayKind;
  /** Seconds in the drawn day that is on now (DAY or WEEKEND). */
  readonly dayLength: number;
  readonly hour: number; // 0..24, for light
  readonly period: Period;
  readonly version: number;
  readonly roads: readonly Road[];
  readonly links: readonly Link[];
  readonly junctions: readonly Junction[];
  readonly lots: readonly Lot[];
  readonly carParks: readonly CarPark[];
  readonly lines: readonly TransitLine[];
  readonly cars: CarsView;
  readonly money: number;
  readonly approval: number;
  readonly bars: Readonly<Record<Bar, number>>;
  /** Approval and bars at the previous review, for the arrows. */
  readonly lastBars: Readonly<Record<Bar, number>> & { readonly approval: number };
  readonly letters: readonly Letter[];
  readonly plates: readonly number[]; // 0..3 per finished year
  readonly prices: Prices;
  /** Allowed steps at this review. */
  readonly priceLimits: Readonly<Record<keyof Prices, { readonly min: number; readonly max: number; readonly step: number; readonly open: boolean }>>;
  readonly policies: Policies;
  readonly ledger: Ledger; // this season
  readonly lastLedger: Ledger; // last season
  readonly complaints: readonly Complaint[];
  readonly tools: readonly ToolId[]; // unlocked
  readonly newTools: readonly ToolId[]; // this year's
  readonly techs: readonly string[];
  readonly techChoices: readonly TechDef[]; // at yearEnd
  readonly commissions: readonly Commission[];
  readonly goal: YearGoal;
  readonly population: number;
  readonly forecast: { readonly nextSeason: number }; // expected balance
  /** What is open besides `tools`: junction controls, car park kinds, policies. */
  readonly controls: readonly Control[];
  readonly parkKinds: readonly CarParkKind[];
  readonly openPolicies: readonly (keyof Policies)[];
  /** Works under way that are not in the road network yet (a flyover's pillars, a metro's holes). */
  readonly projects: readonly Project[];
  /** Every beach the Council has plans for, in the city's order. Replaced when anything in it changes. */
  readonly beaches: readonly BeachView[];
  /** A beach being decided (phase yearStart), and afterwards, that year, what came of it. */
  readonly beach?: BeachCase;
  /** Council roads of the next two years: they refuse car parks (a dashed line on the sand). */
  readonly plannedRoads: readonly PlannedRoad[];
  /** Petrol stations that are open, with their queues now. */
  readonly fuel: readonly FuelView[];
  /**
   * Every car standing still, by the place it stands: cars never vanish, they park.
   * The array is replaced when anything in it changes (at most twice a second); a place
   * whose cars did not change keeps the same object, so the view redraws only what moved.
   */
  readonly parking?: readonly ParkingView[];
  /** One line about how this city lives ("Saffron Bay rises early..."), for the city and year cards. */
  readonly routineLine: string;
  /** What opens next, two years ahead. */
  readonly masterPlan: readonly string[];
  /** The zone charge's vote, once the tool is open: support in percent, seasons it has been felt, counted tonight?, the result. */
  readonly vote?: { readonly support: number; readonly seasons: number; readonly running: boolean; readonly kept: boolean | null };
  /** What only this city has (undefined in the first two). */
  readonly special?: SpecialView;
  readonly replacedWhy?: { readonly text: string; readonly spots: readonly { readonly at: Pt; readonly text: string }[] };

  quote(cmd: Command): Quote;
  apply(cmd: Command): Quote;
  /** Advance by real seconds × speed. Runs fixed steps; only moves in phase 'day'. */
  advance(seconds: number): void;
  drainEvents(): CityEvent[];
  movements(node: Id): readonly Movement[];
  roadStats(road: Id): RoadStats;
  junctionStats(node: Id): JunctionStats;
  /** Where the drivers now on this road come from and go: lot or gate names with shares. */
  trace(road: Id): { readonly from: readonly { name: string; share: number }[]; readonly to: readonly { name: string; share: number }[] };
  /** The driver of car slot i: what they say, and their whole day. */
  driver(i: number): DriverView | null;
  /** Who lives in a home lot (empty for other lots). Cheap enough for a tap, not for every frame. */
  residents(lot: Id): readonly ResidentView[];
  /** One household, to follow it: where it is now and its day. */
  household(id: Id): ResidentView | null;
  /** The car slot a household is driving now, or -1. Stable to poll every frame. */
  carOf(household: Id): number;
  /** 0..1 lot anger and parking fullness for the map views. */
  lotMood(lot: Id): { readonly trips: number; readonly parking: number };
  /** Snapshot at a year start (or any pause); JSON-safe. */
  save(): unknown;
}

export type DayKind = 'work' | 'weekend';
/** One stop of somebody's day. */
export interface DayStop {
  /** The hour they mean to be there, 0..24 ("7:30" is 7.5). */
  readonly at: number;
  /** 'School run', 'Work', 'Petrol', 'Dinner', 'Home'. */
  readonly label: string;
  readonly place: string;
  /** Where to point at, or undefined for a way out of town. */
  readonly lot?: Id;
  readonly done: boolean;
  /** Minutes late, once there (0 = on time). */
  readonly late: number;
}
export interface DriverView {
  readonly who: string; readonly animal: string; readonly text: string;
  /** Null for lorries, through traffic, buses and people from out of town. */
  readonly household: Id | null;
  readonly day: readonly DayStop[];
  /** 'On the way to Stamp Office', one short line. */
  readonly now: string;
  /** Minutes late so far today. */
  readonly late: number;
}
export interface ResidentView {
  readonly id: Id; readonly who: string; readonly animal: string;
  /** 'Two grown-ups, one at nursery'. */
  readonly family: string;
  readonly car: 'none' | 'petrol' | 'electric';
  /** 0 empty .. 1 full (1 for an electric car or none). */
  readonly tank: number;
  readonly day: readonly DayStop[];
  readonly now: string;
}
/**
 * Where cars stand: home = a block's own driveways (along its edge that faces its road);
 * private = a shop's, office's or school's forecourt (the same edge); kerb = marked bays along a road;
 * park = a car park (cars drawn only in surface ones); street = left along a small street that has no bays (not allowed);
 * sand = on the sand of a public beach; double = stopped in the lane beside parked cars.
 */
export type ParkingKind = 'home' | 'private' | 'kerb' | 'park' | 'street' | 'sand' | 'double';
export interface ParkedCar {
  /** Stable while the car stands here; a household's car keeps its uid all season. */
  readonly uid: number;
  readonly tint: number;
  readonly kind: 'car' | 'van' | 'taxi' | 'truck';
  readonly household?: Id;
  /** Road kinds (kerb, street, double): px along road.line where it stands, and the side (1 = right of the line's direction). */
  readonly s?: number;
  readonly side?: -1 | 1;
  /** Its own space in the place, 0..slots-1, kept until it leaves: neighbours never shift, gaps stay. */
  readonly slot?: number;
  /** A vehicle longer than a bay (van, lorry): every slot it covers, its own first (the next one on its side). */
  readonly span?: readonly number[];
}
export interface ParkingView {
  readonly key: string;
  readonly kind: ParkingKind;
  /** home and private: the lot. */
  readonly lot?: Id;
  /** kerb, street and double: the road. */
  readonly road?: Id;
  /** park: the car park. */
  readonly park?: Id;
  /** sand: the BeachView id. */
  readonly beach?: string;
  readonly spaces: number;
  /** Spaces laid out in this place (slot indices run 0..slots-1); unmarked places (street, sand) have fewer, uneven ones. */
  readonly slots?: number;
  /** Oldest first. */
  readonly cars: readonly ParkedCar[];
}
/** A petrol station. `spill`: the queue stands on the road. */
export interface FuelView { readonly lot: Id; readonly pumps: number; readonly busy: number; readonly waiting: number; readonly spill: boolean; readonly served: number }

export type BeachState = 'open' | 'sold' | 'public';
export interface BeachView {
  readonly id: string;
  readonly name: string;
  readonly rect: CellRect;
  /** open = not decided yet, sold = villas (its plots are in CityView.lots), public = everyone comes. */
  readonly state: BeachState;
  /** Cars that came for the beach on the last drawn day (public only). */
  readonly visitors: number;
  /** Share of them that found a space at once, 0..1 (1 when nobody came). */
  readonly found: number;
  /** Spaces in beach parking, and within a walk in all. */
  readonly beachSpaces: number;
  readonly spaces: number;
  /** A road comes close enough. */
  readonly reachable: boolean;
  /** Year of the city in which the Council decides (or decided). */
  readonly decideYear: number;
}

/** The Council's decision about a beach, for its card. */
export interface BeachCase {
  readonly id: string;
  readonly name: string;
  readonly lean: 'sell' | 'public';
  /** Why the Council leans that way, one line. */
  readonly why: string;
  /** Will it follow advice? (approval against what it takes) */
  readonly follows: boolean;
  readonly approval: number;
  readonly needs: number;
  /** The road authority's share of a sale, coins, and how many plots rise. */
  readonly share: number;
  readonly plots: number;
  /** Once decided: what, and why in one line. */
  readonly done?: { readonly state: 'sold' | 'public'; readonly advice: 'sell' | 'public' | 'out'; readonly line: string };
}

export interface PlannedRoad { readonly cells: readonly Cell[]; readonly type: RoadType; readonly year: number }

/** The special rules of cities 3 to 5, for panels. A part is there once its year has come. */
export interface SpecialView {
  /** Licences: one number is one car. `forecast` is what the next auction would do with the quota now set. */
  readonly licences?: {
    readonly cars: number; readonly wanted: number; readonly quota: number; readonly min: number; readonly max: number; readonly step: number;
    readonly expiring: number; readonly lastPrice: number; readonly lastSold: number; readonly lastIncome: number; readonly dear: boolean;
    readonly forecast: { readonly sold: number; readonly price: number; readonly income: number; readonly dear: boolean };
    /** May the quota be changed now? */
    readonly open: boolean;
  };
  /** All gates that follow the speed are on one wire and charge one price: `price` now, up to `max`. */
  readonly speedTolls?: {
    readonly price: number; readonly max: number; readonly maxRange: { readonly min: number; readonly max: number };
    /** Share of the peaks in which the watched roads kept their speed, 0..1 (last day). */
    readonly kept: number;
    readonly gates: readonly { readonly road: Id; readonly speed: number; readonly low: number; readonly high: number }[];
  };
  readonly minibuses?: {
    readonly lines: readonly { readonly line: Id; readonly state: 'private' | 'licensed'; readonly riders: number; readonly fee: number; readonly buyOut: number; readonly strength: number }[];
    /** Seasons of protest left, and why. */
    readonly protest: number;
  };
  readonly ageing?: {
    readonly mean: number; readonly worst: readonly { readonly road: Id; readonly condition: number }[];
    /** Share of a bridge's bill the Council pays now, 0..1. */
    readonly match: number;
  };
  readonly freeway?: { readonly open: boolean; readonly left: number; readonly done: number; readonly digging: number };
}

// ---------------------------------------------------------------- city data (what a content file holds)

export interface LotDef {
  readonly name: string;
  readonly kind: LotKind;
  readonly gx: number; readonly gy: number; readonly w: number; readonly h: number;
  readonly opensYear: number;
  readonly level?: 1 | 2 | 3 | 4; // at opening
  readonly maxLevel?: 1 | 2 | 3 | 4;
  readonly district: string;
  /** See Lot.garden: h is 4, buildings in the north 2 rows, a front garden in the south 2. */
  readonly garden?: boolean;
}

export interface RoadDef {
  readonly cells: readonly (readonly [number, number])[]; // corner vertices; straight or 45° runs between them
  readonly type: RoadType;
  readonly opensYear?: number; // the Council builds it (default 1)
  readonly fixed?: boolean;
  /** Its water cells are a tunnel. */
  readonly tunnel?: boolean;
  /** Cross Rivers: how worn it is at the start, 0..1. */
  readonly condition?: number;
}

export interface GateDef { readonly id: string; readonly name: string; readonly cell: readonly [number, number]; readonly weight: number; readonly opensYear?: number }

export interface YearDef {
  readonly year: number; // 1..10
  readonly name: string;
  /** Shown on the year card: who speaks and what (animals, 1–3 short lines). */
  readonly intro: readonly { readonly who: 'zaza' | 'miko' | 'juma' | 'pim' | 'sulo'; readonly text: string }[];
  readonly tools: readonly ToolId[]; // opened this year
  /** Coach steps shown while playing, in order. `when` is a coach condition id. */
  readonly coach?: readonly { readonly text: string; readonly at?: 'worstJunction' | 'market' | 'tool'; readonly tool?: ToolId; readonly until: string }[];
  readonly grant: number; // the Council's budget, per season
  readonly goal: { readonly kind: string; readonly target: number; readonly text: string };
  readonly events: readonly { readonly season: 0 | 1 | 2 | 3; readonly kind: string; readonly at?: string }[];
  readonly commissions?: readonly string[];
  readonly cannotLose?: boolean;
  /** What else opens this year (all optional; a city that never lists a kind has it from year 1). */
  readonly controls?: readonly Control[];
  readonly parks?: readonly CarParkKind[];
  readonly policies?: readonly (keyof Policies)[];
  /** Master Plan lines shown: what opens in the next two years. */
  readonly plan?: readonly string[];
}

/** A stretch of beach. Its vertices are 'b' (or plain ground on the landward side). */
export interface BeachDef {
  readonly id: string;
  readonly name: string;
  readonly gx: number; readonly gy: number; readonly w: number; readonly h: number;
  /** Announced the year before, decided in January of this one. */
  readonly decideYear: number;
  /** Sold: the plots that rise here a year later, and the authority's share of the sale. */
  readonly plots: readonly { readonly name: string; readonly kind: 'home' | 'landmark'; readonly gx: number; readonly gy: number; readonly w: number; readonly h: number; readonly level?: 1 | 2 | 3 | 4 }[];
  readonly share: number;
  /** Public: how much it draws (1 = a small city beach). */
  readonly pull?: number;
}

/** Hours of the day, 0..24; from before to. */
export type Hours = readonly [from: number, to: number];
/** One season's bend of the habits: everything is times the usual. */
export interface SeasonBend {
  /** All trips. */
  readonly trips?: number;
  /** Midday errands, lunches out, weekend middays. */
  readonly midday?: number;
  /** Evening shops, dinners and visits. */
  readonly evening?: number;
  /** Beaches, parks and fun. */
  readonly outdoors?: number;
  /** Hours added to going home and going out (dark winters: below 0). */
  readonly shift?: number;
  /** Weekend trips out of town (cabins, the desert). */
  readonly away?: number;
}
/** How a city lives. Shares are 0..1. */
export interface RoutineProfile {
  /** One line for the player. */
  readonly line: string;
  readonly work: {
    readonly start: Hours; readonly end: Hours;
    /** Shares of other shifts, and their hours. */
    readonly early: number; readonly earlyHours: Hours;
    readonly late: number; readonly lateHours: Hours;
    /** Share who come home for the hot hours, and when. */
    readonly split: number; readonly splitHours: Hours;
    /** Share who stay home on any one day. */
    readonly remote: number;
    /** Share of second grown-ups with a job. */
    readonly second: number;
    /** Workers whose job is out of town. */
    readonly away: number;
  };
  readonly school: { readonly start: number; readonly end: number; /** Of those too far to walk. */ readonly drive: number; /** Picked up after work. */ readonly afterCare: number; readonly walkCells: number };
  readonly nursery: { readonly start: number; readonly end: number; readonly drive: number };
  /** Workers who drive out for lunch. */
  readonly lunch: { readonly drive: number; readonly hours: Hours };
  readonly errand: { readonly share: number; readonly hours: Hours };
  /** Shops on the way home, and as an evening trip. */
  readonly shop: { readonly onWay: number; readonly evening: number; readonly hours: Hours };
  readonly dinner: { readonly share: number; readonly hours: Hours };
  readonly visit: { readonly share: number; readonly hours: Hours };
  readonly weekend: {
    /** Households that go out once, and once more. */
    readonly out: number; readonly again: number;
    /** Shares of outings in the morning, at midday and in the evening. */
    readonly when: readonly [morning: number, midday: number, evening: number];
    readonly hours: readonly [Hours, Hours, Hours];
    /** How much each kind of place draws; `home` is visits, `away` is out of town. */
    readonly places: Readonly<Partial<Record<LotKind | 'away', number>>>;
    /** A meal out on the way home. */
    readonly meal: number;
    /** Visitors from out of town. */
    readonly visitors: number;
  };
  readonly seasons: readonly [SeasonBend, SeasonBend, SeasonBend, SeasonBend];
  /** Cells on a full tank, and the share of electric cars. */
  readonly petrol: { readonly range: number; readonly electric: number };
  readonly lorries: { readonly hours: Hours; /** Come at night, unseen. */ readonly night: number };
  /** Two-car homes among those with a car. */
  readonly secondCar: number;
  /** How far people walk, in cells, and what a cell costs them against the usual. */
  readonly walk: { readonly cells: number; readonly cost: number };
  /** Homes per home cell, against the usual. */
  readonly homes?: number;
}

export interface CityDef {
  readonly id: string;
  readonly name: string;
  readonly number: 1 | 2 | 3 | 4 | 5;
  readonly blurb: string;
  readonly map: readonly string[]; // terrain rows
  readonly style: 'gulf' | 'oldtown' | 'islands' | 'hills' | 'rivers'; // picks the art set
  readonly startMoney: number;
  readonly startControl: Control;
  readonly roads: readonly RoadDef[];
  readonly controls?: readonly { readonly cell: readonly [number, number]; readonly control: Control; readonly opensYear?: number }[];
  readonly lots: readonly LotDef[];
  readonly gates: readonly GateDef[];
  readonly years: readonly YearDef[];
  /** When and where people of this city go. Absent: a plain nine to five. */
  readonly routine?: RoutineProfile;
  /** Stretches of beach whose fate the Council decides. */
  readonly beaches?: readonly BeachDef[];
  /** Every lot faces the Council street along its south edge, and its driveway is on that street only. */
  readonly frontStreets?: boolean;
  /** City-wide rules. */
  readonly rules: { readonly carOwnership: number; readonly landPrice: number; readonly widen: boolean; readonly zoneCells?: readonly (readonly [number, number, number, number])[] } & SpecialRules;
}

/** Cities 3 to 5 only; all off when absent. `from` is the year (1..10) a rule starts. */
export interface SpecialRules {
  /** Car licences by auction. `wish`: share of homes' trips that would go by car if everybody had one. */
  readonly licences?: { readonly from: number; readonly wish: number };
  readonly speedTolls?: { readonly from: number };
  /** 'h' cells are steep: streets only, and slow. */
  readonly steep?: boolean;
  /** Boats carry this many times more, and sail faster. */
  readonly ferries?: number;
  readonly minibuses?: { readonly from: number };
  /** Roads wear out; from `match` on the Council pays 60% of a bridge. */
  readonly ageing?: { readonly match: number };
  readonly freeway?: { readonly from: number };
}
