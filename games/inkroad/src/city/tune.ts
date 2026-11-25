import type { Bar, CarParkKind, LotKind, Prices, TransitMode } from '../sim/types';

/** Every number the city layer is tuned with. One sim second reads as one minute of a resident's trip. */

// ---------------------------------------------------------------- people and trips
/** Tours (there and back, in drawn cars) a home cell makes a day, by lot level. */
export const HOME_TOURS: readonly number[] = [0, 0.96, 1.2, 1.5, 1.8];
/** How strongly a cell of each kind pulls workers, pupils and shoppers. */
export const JOBS: Readonly<Partial<Record<LotKind, number>>> = { market: 0.8, shops: 1.6, office: 2, school: 0.4, hospital: 1.2, mall: 0.8, port: 1.2, stadium: 0.1, fair: 0.4 };
export const SHOPPING: Readonly<Partial<Record<LotKind, number>>> = { market: 1.5, shops: 2, mall: 3.3, park: 0.4, hospital: 0.6, square: 0.6, fair: 0.8 };
export const LEVEL_PULL: readonly number[] = [0, 1, 1.5, 2.1, 2.8];
/** Destination choice falls off with distance (cells). */
export const GRAVITY = 26;
/** Shares of a home's tours. The rest are visits. */
export const PURPOSE = { work: 0.52, school: 0.15, shop: 0.24 } as const;
/** Gate traffic a day per unit of gate weight: commuters in, through cars, lorries. */
/** Share of workers whose job is out of town, through a gate. */
export const OUT_OF_TOWN = 0.28;
export const GATE = { commuters: 5, through: 3, trucks: 1.6, growth: 0.035 } as const;
export const AM = { from: -18, to: 32, early: 1.15 } as const;
export const MID = { from: 40, to: 58 } as const;
/** Early enough for most people to be home before the day ends: cars still out at night are nobody's fault. */
export const PM = { from: 54, to: 90 } as const;
/** Outsiders drawn in a day, per cell: workers to offices, shoppers to a mall, visitors to a fair. */
export const DRAWS_IN = { office: 0.18, mall: 0.6, fair: 0.25, port: 0.3, stadium: 0.1 } as const;
/** Lorries a day for each cell of what they deliver to. */
export const LORRIES = { port: 0.5, mall: 0.35, fair: 0.3, market: 0.06, office: 0.2 } as const;
/** With lorry hours most of them come at night, when nobody sees them. */
export const NIGHT_LORRIES = 0.65;
/** Where a trip costs money, neighbours share a car: this share of the payers per coin. */
export const SHARE = { perCoin: 0.13, max: 0.45 } as const;
/** Commuters who would pay more in the peak move out of it: this share of them per coin. */
export const SPREAD = { perCoin: 0.16, max: 0.6, early: 0.25, by: [8, 22], home: [4, 22], stay: 12 } as const;
/** The roads run quietly for this long before a day begins, so nobody looks at an empty town. */
export const PREWARM = 18;
export const STAY = { shop: [14, 26], visit: [16, 30], event: [16, 24] } as const;
export const LAST_DEPARTURE = 102;

// ---------------------------------------------------------------- the one formula (minutes)
export const COST = {
  minPerCoin: 3.4, fuelPerMin: 0.02, theta: 4, walkPerCell: 1.6, walkMaxCells: 9, transitWalkMax: 7,
  boarding: 0, change: 3, rideWeight: 0.55, stopWalk: 0.9, fareMin: 2.2, carFixed: 2, waitCap: 8, waitShare: 0.4, crowdFrom: 0.75, crowd: 22, lineRefuse: 1.25,
  taxiFare: 3, taxiPerMin: 0.05, taxiWait: 9, taxiWaitPerRank: 2, taxiFarePerRank: 0.15, stayBase: 34, stayPerMin: 1.25, memory: 0.45,
  retimeFrom: 1.7, retimeMax: 0.4, doublePark: 0.8, noCarTaxi: 1,
} as const;
/** Coins a driver pays to save one second. */
export const VALUE_PER_SECOND = 1 / COST.minPerCoin;

// ---------------------------------------------------------------- parking
export const PRIVATE_PER_CELL: Readonly<Partial<Record<LotKind, number>>> = { market: 0.2, shops: 0.3, office: 0.2, school: 0.6, hospital: 0.5, mall: 0.16, port: 0.6, stadium: 0.3, fair: 0.3, park: 0.7, square: 0, landmark: 0.4 };
/** Free spaces per home cell by level (level 1 villas always have room). */
/** In year 1 there is free sand to park on beside everything. */
export const SAND_YEARS: readonly number[] = [6, 1.6, 1.2];
export const HOME_SPACES: readonly number[] = [0, 99, 1.6, 1.9, 2.3];
export const PARKS: Readonly<Record<CarParkKind, { w: number; h: number; spaces: number; cost: number; upkeep: number }>> = {
  lot: { w: 3, h: 2, spaces: 18, cost: 45, upkeep: 2 },
  multi: { w: 2, h: 2, spaces: 44, cost: 130, upkeep: 7 },
  under: { w: 2, h: 2, spaces: 40, cost: 200, upkeep: 9 },
  ride: { w: 4, h: 3, spaces: 34, cost: 80, upkeep: 3 },
};
export const KERB_PER_CELL = 1.4;
export const KERB_COST = 10;
export const PARK_RADIUS = 6; // cells a driver will walk
export const SEARCH_TRIES = 3;
export const SWEET = 0.85;
/** Minutes a driver expects to lose at a full place; with the app they know it is full and drive on. */
export const SEARCH_MINUTES = { plain: 15, app: 30 } as const;
export const RIDE_LINK = 3; // cells between a park and ride and a stop
export const DOUBLE_PARK_SECONDS = 7;
/** From the third year on, people learn to leave the car beside a paid space instead of in it. */
export const DODGE = { year: 3, perCoin: 0.2, max: 0.6 } as const;
export const CATCH_RATE = 0.4; // per inspector

// ---------------------------------------------------------------- transit
/** How much of a lap's delay riders feel: the turning round at the ends is not theirs. */
export const LAP_FELT = 0.55;
export const TRANSIT: Readonly<Record<TransitMode, { cap: number; speed: number; dwell: number; /** Buses each drawn one stands for. */ stands: number; perStop: number; perCell: number; vehicle: number; run: number; works: number; match: number; minStops: number }>> = {
  bus: { cap: 4.5, speed: 50, dwell: 0.8, stands: 3, perStop: 4, perCell: 0, vehicle: 14, run: 4, works: 0, match: 0, minStops: 2 },
  express: { cap: 4.8, speed: 58, dwell: 0.8, stands: 3, perStop: 8, perCell: 0, vehicle: 18, run: 5, works: 0, match: 0, minStops: 2 },
  tram: { cap: 6, speed: 56, dwell: 1, stands: 3, perStop: 20, perCell: 11, vehicle: 30, run: 8, works: 2, match: 0.6, minStops: 2 },
  metro: { cap: 15, speed: 105, dwell: 2, stands: 1, perStop: 45, perCell: 9, vehicle: 30, run: 12, works: 3, match: 0.6, minStops: 2 },
  boat: { cap: 5, speed: 60, dwell: 2, stands: 2, perStop: 18, perCell: 2, vehicle: 30, run: 7, works: 1, match: 0, minStops: 2 },
};
export const MAX_VEHICLES = 6;
export const MAX_STOPS = 12;

// ---------------------------------------------------------------- money
/** Whole coins the authority banks per coin a drawn car pays (the rest is shared out). */
export const BANKED = { parking: 0.32, fines: 0.5, tolls: 0.3, fares: 0.35, zone: 0.35 } as const;
export const STAFF_PER_INSPECTOR = 7;
export const STAFF_PER_RANK = 4;
export const INTEREST = 0.05;
/** Unspent money over some seasons' income goes back to the Council, most of it. */
export const PURSE = { seasons: 3, least: 160, takes: 0.6, worth: 10, warnSeason: 1 } as const;
export const DEBT_LIMIT = -150;
export const BAILOUT_TO = 60;
export const FLOAT_KEEP = 0.25;
export const FLOAT_SEASONS = 5;
export const AUCTION = { base: 25, perYear: 12, perApproval: 0.5 } as const;
export const CONTROL_LAND = 0;
export const FLYOVER = { base: 80, perCell: 9, under: 1.45, works: 2 } as const;
export const BRIDGE_PER_CELL = 22;
/** The share of a new bridge the Council pays, where it does (matching grants). */
export const BRIDGE_MATCH: Readonly<Record<string, number>> = { saffron: 0.6 };
export const TOLL_GATE = 45;
export const BUS_LANE_PER_CELL = 4;
export const SQUARE_PER_CELL = 8;
export const ONE_WAY_COST = 8;
export const TRUCK_BAN_COST = 5;
/** Junction boxes are bought by the dozen: part of the list price. */
export const SMART_SHARE = 0.75;
/** Widening reuses the old road. */
export const WIDEN = { keep: 0.75, land: 0.35 } as const;
/** Everything gets dearer as the city does. */
export const INFLATION = { building: 0.04, land: 0.1 } as const;
export const REMOVE_COST = 2;
export const REFUND = 0.25;
export const MATCH = 0.6;
export const START_PRICES: Prices = { park: 1, parkPeak: 1, fine: 4, toll: 1, tollPeak: 2, fare: 1, zone: 0 };
export const PRICE_RANGE: Readonly<Record<keyof Prices, { min: number; max: number; step: number }>> = {
  park: { min: 0, max: 8, step: 1 }, parkPeak: { min: 0, max: 8, step: 1 }, fine: { min: 0, max: 20, step: 2 },
  toll: { min: 0, max: 6, step: 1 }, tollPeak: { min: 0, max: 8, step: 1 }, fare: { min: 0, max: 4, step: 1 }, zone: { min: 0, max: 8, step: 1 },
};

// ---------------------------------------------------------------- approval
export const WEIGHTS: Readonly<Record<Bar, number>> = { trips: 0.5, parking: 0.17, cost: 0.16, streets: 0.17 };
export const WORST_PULL = 0.55;
export const APPROVAL_EASE = 0.55;
export const START_APPROVAL = 60;
/** Drivers forgive some of what the weather does. */
export const WEATHER_PATIENCE = 0.8;
export const START_EXPECT = 1.35;
export const EXPECT_RANGE = { min: 1.12, max: 1.4 } as const;
export const HABIT = 1 / 3;
/** Points of trip score by how far past the expected ratio a trip went. */
export const TRIP_CURVE: readonly (readonly [number, number])[] = [[0.75, 100], [0.9, 93], [1, 85], [1.12, 68], [1.25, 40], [1.4, 16], [1.6, 4], [1.8, 0]];
/** The Trips bar stretches the day's mean so that a bad year reads as one. */
export const TRIPS_STRETCH = { from: 36, by: 1.8, soft: 30 } as const;
/** So does the Parking bar. */
export const PARKING_STRETCH = { from: 30, by: 1.3, soft: 30 } as const;
/** The whole town hears about the two blocks where it is worst: their part of the Parking bar. */
export const PARKING_TALK = { share: 0.3, busy: 6, lots: 2 } as const;
/** The sign itself annoys, paid or not: points of Cost per coin past what people think is fair. */
export const OUTRAGE = { park: [3, 3], parkPeak: [4, 3], fine: [8, 0.8], toll: [2, 4], tollPeak: [4, 4], fare: [2, 4], zone: [3, 5] } as const;
/** Everybody likes a ribbon: approval on the day something big opens. */
export const RIBBON = { flyover: 3, line: 3 } as const;
/** Homes beside a jam breathe it; lorries in the day are heard by everyone. */
export const FUMES = { from: 7, per: 0.012, max: 8, cells: 4, lorriesFrom: 6, perLorry: 0.35, lorriesMax: 8 } as const;
export const LOST_WEIGHT = 1.6;
export const STAYED_SCORE = 6;
export const STAYED_WEIGHT = 1;
/** Someone who would have paid but didn't go by car still feels the price. */
export const PRICED_OUT = 0.6;
export const PARK_SCORE = { first: 95, perCell: 6, freeCells: 1.5, perTry: 24, illegal: 22, none: 0, sweet: 60 } as const;
/** Coming home to one's own space is no news. */
export const OWN_SPACE_WEIGHT = 0.25;
export const PAY_SCORE = { free: 76, perCoin: 13, fineHit: 45, homeCharge: 20, normal: 0.7 } as const;
export const STREETS = { base: 82, works: 1.6, nightWorks: 0.6, project: 2.5, crash: 4, double: 1, cut: 0.35, cutFrom: 10, landscape: 2, busy: 0.12 } as const;
export const NOISE_PER_HOME = 0.16;

// ---------------------------------------------------------------- growth
export const GROW = { at: 62, badAt: 38, chance: 0.16, cooldown: 3, badSeasons: 2, parkingAt: 40 } as const;
export const OWNERSHIP = { drift: 0.012, transitAt: 0.15, min: 0.55, max: 0.96 } as const;
export const PEOPLE_PER_CELL: readonly number[] = [0, 14, 30, 52, 84];
/** Shops near dear, empty car parks lose customers. */
export const DEAD_PARK = 0.35;
