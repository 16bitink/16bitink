# InkRoad: how it is built

The build contract. Read [inkroad-design.md](inkroad-design.md) for the game; this page wins where they differ. Release: Sunday, November 29, 2026, with Saffron Bay (years 1–10, free) and Old Harbour (years 11–20, paid).

Package `games/inkroad`, branch `feat/inkroad`, port 5181, Phaser 4 + TypeScript, pnpm through `corepack pnpm`. Copy conventions from `games/inkbrick` (host, dev page, lab, saves, audio). **Never commit, stash, checkout or restore; other agents work in the same tree.** Touch only your own folders; ask the coordinator for a contract change (`src/sim/types.ts`, `trafficTypes.ts`, `constants.ts`), except that adding optional fields is fine.

## The launch cut

A year has four seasons; a season is one drawn day: a workday of 120 s (`DAY`) and a weekend of 62 s (`WEEKEND`). A year has 12 months, three a season, each ending on a payday (`PAYDAYS` in `src/city/clock.ts`; see "Months and paydays" below). Speeds 0, 1, 2, 4. Build while paused.

| In for Sunday | After |
|---|---|
| Street, avenue, boulevard, highway; remove; one-way | Reversible lanes, speed limits, turn bans |
| Yield, roundabout, signal, smart signal, green split | – |
| Flyover and underpass for one movement | Free interchanges |
| Kerb bays, surface / multi / underground / park-and-ride car parks, permits, inspectors | Robot garages |
| Toll gates with peak prices | Caps |
| Bus, bus lane, tram (Old Harbour), metro, boat (Old Harbour) | On-demand bus |
| Zone charge with a vote, squares (Old Harbour) | – |
| Approval, letters, replaced, retry any year; plates; techs; commissions; plate auction; float | Stay in Office (endless), Daily Jam, time-lapse |
| Growth, Master Plan, habits, expectations; events | Cities 3–5 |

## Who owns what

| Part | Folder | Notes |
|---|---|---|
| Traffic | `src/sim` | Network values, cars, junctions, routing, measurement. Contract: `trafficTypes.ts` |
| City | `src/city`, `content/`, `dev/lab.*` | Implements `CityView` (`types.ts`): commands, demand, mode choice, parking, transit, money, approval, growth, years, bots, saves |
| View | `src/render`, `src/scenes` | Phaser: ground bake, cars, buildings, decks, tools and ghosts, arrows, overlays, camera |
| UI | `src/ui`, `src/app`, `src/audio` | DOM: menu, city map, HUD, cards, review, replaced; flow, saves, sound |
| Art | `src/art` | Painted pictures and their manifest |

## Simulation rules

- Deterministic: seeded rng (`src/sim/rng.ts`), fixed `STEP`, no `Math.random`, no `Date`. The same seed and commands give the same city.
- The hot loop uses typed arrays and mutates them (that is fine here); the network and everything in `CityView` outside `cars` are immutable values.
- A lane is a queue; cars follow the Intelligent Driver Model; they enter a junction only if their exit has room. Keep driving on the right.
- Roundabouts must show their real weakness: one heavy movement starves the next entry. Signals must waste time when one side is empty. A flyover removes its movement from the junction.
- 700 cars at 10 steps a second must take under 3 ms per step on this laptop (a phone is about 4× slower).
- Nothing may lock up for good: a car stuck `GIVE_UP` seconds leaves and counts as lost.

## Money and balance

Money is whole coins. Start 300–600. A season's Council budget is small (40–80), paid a third each month; a street costs 4 a cell, a roundabout 30, signals 60, a flyover 180–300, a metro line 1,200+ (60% matched). Prices move one step a season.

## The projection (the angle)

- Plan (x, y, z) is drawn at `(x, y * TILT - z * RISE)`. `TILT` and `RISE` live in `src/render/projection.ts` and nowhere else; chosen: **about 60 degrees, TILT 0.87, RISE 0.5** ([reference](inkroad/style-reference.png), which is also the colour and calm to match: quiet sand, clean grey roads, wide pale kerbs, cars fairly large).
- Everything flat (ground, roads, cars, arrows) sits in one container with `scaleY = TILT`, drawn in plan. Buildings, decks and trees are drawn upright on top, sorted by their south edge.
- **Build mode:** with a tool in hand, buildings fade to footprints.

## The grid

Roads run through vertices: vertex (gx, gy) is world (gx * 40, gy * 40), and `map[gy][gx]` is that vertex's terrain, drawn as the 40 x 40 square centred on it. Lots and car parks are corner based: world rect = gx * 40, gy * 40, w * 40, h * 40 (`lotRect()` in `src/city/geometry.ts`). Roads stay at least a cell from every lot edge, so `blocked(cell)` is true for gx <= x <= gx + w and gy <= y <= gy + h. All gates exist from year 1.

## Lots and pictures

Art is made per **plot of 2 x 2 cells** (80 x 80 plan px), so any lot of even width and height fills with plots (a 4 x 4 home lot = four plots; the view picks a variant per plot from the lot's id). `home`, `shops`, `office` work this way, levels 1 to 4. Level 1 villas, 2 apartments (3 floors), 3 mid-rise (6), 4 tower (drawn at most 130 px above its footprint's south edge).
Whole-lot pictures have fixed sizes in cells: market 4 x 3, school 4 x 3, hospital 4 x 3, mall 6 x 4, stadium 6 x 5, port 6 x 3, fair 6 x 5, landmark 4 x 3; parks and squares are painted ground of any size. Car parks: lot 3 x 2 (and 4 x 3 for `ride`), multi 2 x 2, under 2 x 2.
A picture is drawn at 2x (a 2 x 2 plot is 160 px wide), anchored at the bottom centre of its footprint's south edge, trimmed to its alpha. Leave at least half a cell of sand between a lot and a road's kerb.

## Style

Pen and ink with watercolour. Painted textures and sprites, generated; code may lay them out (roads are painted ribbons) but never invent flat vector art for what the player looks at. Until the art lands, use quiet flat colours from the palette and keep every picture behind the manifest (`src/art/manifest.ts`) so it can be swapped.

Red means jammed and nothing else. Text: Caveat for hand notes, a plain readable face for numbers. Phones: [mobile-playbook.md](mobile-playbook.md), play held sideways.

## Code rules

Files under 400 lines, functions under 50, no magic numbers (constants), errors handled, `npx tsc --noEmit` clean, vitest tests for sim and city (80% lines there). No em dashes or en dashes in player-facing text; names use plain A–Z letters.

## Routines, parking and the night (the owner, November 26)

The owner: "adding routines to each car in the game, residents should go from place to place (drop kids in the school, go to work, go to grocery after work, relax somewhere on the weekend). We also need a day and night loop. The cars should not disappear, they should park in some spots (on parking, they might decide to park illegally on a small street if there is no parking, they might park on the sand near the beach, just like in real life)."

This section is the build of [Routines](inkroad-design.md#routines-residents-live-real-days-the-owner-november-25); numbers come from [inkroad-routines.md](inkroad-routines.md).

**The clock.** A season is a workday, a short night, then a weekend day, all in phase `day`; the review card comes at the weekend's night. Inside the city the clock runs on through the season (the weekend's plan is timed after the workday), `CityView.clock` counts from 0 in each drawn day, `dayKind` and `dayLength` say which, and `{ t: 'weekend' }` is emitted when it starts. `hour` is 0..24 and wraps: the workday's evening has room for dinner, the small hours (00:00 to 06:00, 16 s, long enough for an evening queue to drain at the day's pace) bring everyone home by road, and the next season's dawn follows the review. Workday `PERIODS` start points stay; `HOURS` may change. Year 1's first spring workday stays the guided one: same jam, same place (the guide tests prove it).

**Households.** Every open home block holds households for good (stable ids from lot id and index, a resident name and animal, one or two grown-ups, perhaps a child at school or nursery, zero, one or two cars, petrol or electric, a tank). Each has fixed places: job (a lot, or a gate for the out-of-town share), school or nursery, favourite shop, restaurant, weekend places. They change only when a place closes or moves. One drawn household stands for about a dozen real ones, as a drawn car stands for `TRIPS_PER_CAR` trips. Their number per block is tuned so a day's car trips stay near today's, and the bots' years stay where they are.

**A day is a chain.** Each household that goes out has a day of stops: home, school (drop-off), work, shop on the way home, home, restaurant, home; a weekend of late mornings, beach, park, `fun`, mall, visits and a meal out. Times come from the city's `RoutineProfile` (a plain nine to five when absent). A car with a driver goes from stop to stop and parks at each; whoever left the car at home goes by bus, on foot or by taxi, and the car stays home. Under a fifth of a tank, the next hop stops at a petrol station on the way (four pumps a station; a longer queue stands on the road and `fuel` shows it). People from out of town, through traffic, lorries and buses stay as they are: in by a gate, out by a gate.

**Cars never vanish.** Every household car is always either on the road or standing in one place (`CityView.parking`), all season and from one season to the next. At night they are at home, or near it. A year start and a loaded save put every car at home. Where a car stands, in the order a driver tries:
- its own space: home driveways, a block's forecourt, a car park, kerb bays (paid where priced);
- `street`: along a small street (type `street`) with no bays near the place, not allowed: inspectors fine it by day, not at night; it does not block the lane;
- `sand`: by a public beach when beach parking is full: free, a worse Parking score, and the beach's Streets points fall when the sand fills;
- `double`: in the lane, blocking it for `DOUBLE_PARK_SECONDS`, then the car stays on the shoulder as before until its driver leaves.
A spot that disappears (a road removed, a kerb taken away) moves its cars to the nearest place, never off the map.

**The view.** `parking` lists each place with its cars (uid, tint, kind, household, and for road places `s` and `side`). A household's car keeps its tint all season, so the player can see the same car leave home and park at the office. The renderer lays out the slots: driveways and forecourts along the lot edge that faces its road, kerb and street cars along the road edge outside the paved width, sand cars on the beach sand by the road, double-parked cars in the outer lane; multi-storey and underground car parks show none.

**Who builds what (Nov 26).** Engine (Opus): `src/city` (not `src/city/defs`). Renderer (Sonnet): `src/render`, `src/scenes`, `dev/fakeCity.ts`. Content (Sonnet): `RoutineProfile` for every city, and the nursery, petrol, restaurant and fun lots in Saffron Bay and Old Harbour (`src/city/defs`, `content/`). Later: a home's residents and a car's whole day in the UI.

## Plots: no sand in front of a gate (the owner, November 26)

The owner, on Palm Row: "if the small bottom plot belongs to the same owner, they left a piece of sand next to their door; if somebody else buys that plot they will block the door. There is space for 4 villas here, not 2, or 2 big ones that take both plots." Every building picture has its gate in the south wall, so a second row of plots would face the first row's back wall. The owner chose **2 big ones**:

- Where a home lot's block (between Council roads) is deep enough for two rows of plots, the lot fills the depth (h = 4) with `garden: true`: the plot pictures stand in the north two rows, and the south two rows are the lot's own front garden (painted ground, palms, a path to each gate) down to the road.
- A garden lot counts only its built half (`areaOf` for homes, so residents, trips, spaces and population stay as they were): no balance change.
- A lot whose road is only behind it, with open sand in front, is left as it is (the player's road decides that side).
- The front garden is painted art, not code (owner, November 26: the code-drawn walls and fountains read far below the map): one `b-<set>-garden1-0..3` picture (2 x 2, open north edge, side walls, front wall with a centred gate, a straight path between the villa's gate and its own) stands under each plot column, an upright sorted by the lot's south edge, and fades with the plots in build mode. `gardenLayout.ts` keeps the wall and gate lines the pictures paint (parking keeps the gates clear).

## Parking manoeuvres: own spaces, no teleports (the owner, November 26)

The owner: "when cars leave parking, other cars shift; they should stay in their places, parkings usually have gaps. Where there is no parking drawn, cars stop unevenly and take more space than in a proper parking. Entering and exiting parking should have proper animation: cars never teleport, they enter the parking spot. They might block traffic while entering a spot, for example parallel parking, and they wait for a gap in the road to exit."

- **Own space.** The city gives each parked car a `slot` in its place when it parks (the first free one near where it came in, with some chance of any free one, so gaps appear) and keeps it until the car leaves. Nobody moves up. `ParkingView.slots` is how many the place has.
- **Unmarked places are uneven.** `street` and `sand` have fewer slots per length than kerb bays (about two bay lengths a car), each slot with its own fixed offset, angle and gap; the city's capacity there matches what is drawn.
- **Road places drive to their slot.** A car parking at the kerb or on a street drives to its slot's `s` (not the place's middle), stops in the outer lane and parallel parks: the lane is held (car state 4) for the manoeuvre (about 3 s), so cars behind wait. Leaving, it waits for a gap in the lane at that point, then pulls out (about 2 s, lane held), then drives off.
- **Off-road places turn in.** Driveways, forecourts and car parks: the car slows and turns in at the access (lane held for the turn, about 0.6 s), then drives the short way to its bay off the road; leaving, it drives to the access, waits for a gap, turns out. Multi-storey and underground car parks: it drives into the entrance.
- **The view animates every move** from the `{ t: 'park' }` event: in from the lane pose to the slot, out from the slot to the lane pose, along a believable path (an S for parallel parking, a turn then a straight for bays), over `seconds`. A car never appears or disappears in a place: it arrives by road, or leaves by road. Cars in state 4 are drawn only by the parked-car layer.
- **Balance.** Kerb bays and street parking now slow the lane while cars park, as the design table always said ("cheap, slows the lane"). Re-check the bots; if a city tips, tune the manoeuvre seconds, not the tests.

## City layout: every gate on its street (the owner, November 26)

The owner, on screenshots of a nursery and petrol station facing open sand with their road behind them, and a staggered villa block whose top row backs onto its road: "the plots are still random." Every building picture has its gate in the south wall, so the layout rule is:

- **A lot's road runs along its south edge**, one cell out (the driveway strip where its cars park). Its driveway (`access`) is on that road only; a road behind or beside a lot does not serve it.
- **The Council builds each lot's front street**, opening no later than the lot (the owner chose this). The player builds what links districts: avenues, junctions, bridges, flyovers, transit, parking.
- **A block holds one row.** Between two east-west streets there is one row of lots (2 deep, or a 4-deep garden lot), all gates on the south street. No lot backs onto another lot's gate; no stacked rows.
- **Rows line up.** Lots in a row share their south edge and tile the frontage between cross streets in whole plots, touching or with a deliberate gap of at least one plot (a park, a square). No stagger, no slivers of sand.
- Big pictures (market, school, mall, port, hospital, stadium, fair) follow the same rule.
- Done for Saffron Bay and Old Harbour for Sunday; Twin Isles, Seven Hills and Cross Rivers after launch.
- **Checked.** A city with `frontStreets: true` (Saffron Bay, Old Harbour) is held to this by `src/city/validateLayout.ts`, part of `cityProblems`: each lot needs Council street vertices on its front row past every gate (x gx+1 to gx+w-1, one cell out), open by its year; nothing in its south strip or behind it in the same block; side-by-side lots share a south edge unless a street, wall or water parts them; no 1-cell sand between neighbours or before a cross street. `node dev/layout.mjs <city> [--year n]` prints the map as text with every problem.
- **Driveways.** In such a city a lot's driveway is only on the road in front of it (`nearestAccess(..., front)`); beach plots and car parks keep any side. A plot moved out of a player's road needs a road (or a Council street of its year) along its new south edge.
- **What it cost.** Frontage is the limit: blocks between the first year's streets (rows 18, 24, 30) hold one row, so Saffron's lots fill nearly every front street and some sit away from their old districts (Stapler Offices in the south east, Salt Flats by the market, the stadium in the north west, the fair in the west sands). Sand for car parks is mostly behind the rows and on plots more than two years ahead.
- **Why trips rose (November 27).** Same households and stops, but the bus lines a beginner draws are named by lots (Acacia Gardens, Pepper Market, Blueprint Offices; Tide Row, Far Shore Offices, Creek Villas, Pepper Market), and the re-layout had put Acacia Gardens beside the market and Creek Villas in the south, so those lines ran from the market to the market. Summer workday riders fell from 73 to 17 (Y6) and 110 to 29 (Y7); those people drove. Moved back toward their districts: Acacia Gardens to (23, 27), Creek Villas to (31, 15) on the main street by the creek (Reed Court and Little Park take Acacia's old row), Almond Flats beside the hospital at (17, 32) (Cumin Court to the west), Coffee Ring Cafe beside the offices at (11, 21). The stadium's street (row 31) now reaches column 12, a second way out on event days.
- **The bots' map, redrawn (November 27).** `src/city/bots/atlas.ts` and the beginner's own lines now follow the new map, each line running one way through what it was meant to serve (homes in the middle, shops and jobs at the ends). Saffron: line 1 is Blueprint Offices > Acacia Gardens > Pepper Market (the offices are west of Palm Town now, not north of the market), line 4 is Stapler Offices > The Great Mall > Almond Flats > Saltbush Street > Cumin Court (east to west along the south), line 5 and the second metro end at Ink Offices (the office on row 8's west end, where Blueprint used to be); road ideas (34, 8) > (45, 8) became (36, 8) > (45, 8). Old Harbour: North Hospital > Tar Street > Compass House > Chart Offices and Harbour School > Rudder Flats > Captains Row > Herring Market (both lots swapped sides), the beginner's third line likewise; road idea (14, 12) > (14, 7) became (14, 15) > (14, 7), from the row 15 street to row 7 (row 12 is houses now). Lots: Stamp Office and Pepper Pot Cafe swapped (the office back beside the main crossroads at (23, 15), on line 3's row 18), Carpet Market (year 2) moved east of Pepper Market to (27, 9) and Salt Flats (year 8) took its place at (17, 10): the sand east of the markets is then within a car park's reach of the full market in year 2 (the advisor's car park answer). A fun lot must be 3 x 2, and the gap by Creek Beach at (31, 32) is 2 cells and in the beach bays' way, so it stays empty.
- **Measured against the old map (November 27).** The old Saffron and Harbour layouts, played under today's engine, do no better than the new ones (Saffron: nobody Y3 x3, beginner Y6 x3, planner end x3; Harbour: nobody Y4 x3, beginner Y6/Y4/Y4, planner end x3). The fall from the November 26 targets came with the routine and parking work, not the layout.
- **Kerbside, not doors.** Taxis stop at the kerb in front of the gate (3 s to drop, 4 s to pick up) and drive to the nearest map gate; a ride home by taxi is fetched from that gate first (`src/city/kerbside.ts`). Lorries park in a lot's front strip or at the kerb like any car, or stop in the lane when everything is full. A car that gives up in a jam pulls onto the shoulder where it is: a household's is driven home from there, anybody else's drives off to a gate. Only a resident whose car is not a drawn household car still goes into its own garage, and a household car out of town still comes out of its home's door.
- **Neighbours and long vehicles.** A slot next to a car that is turning in or driving off is chosen last, and a car waits to pull out only while a touching neighbour on its own row is moving where it would move (`clearToLeave` in `src/city/slots.ts`, from the sweeps in `src/sim/slotGeometry.ts`: a bay car keeps its column, a kerb or forecourt car its length plus the swing past it, a car park's cars share the aisle); it retries on the normal cadence. The renderer's draw-time hold stays as the last safeguard, and a held-back car catches up gently. Vans and lorries take their slot and the next on their row (`ParkedCar.span`) and stand between the two; a lone slot never takes one, and lorries never use car parks.
- **One source of truth for spaces (November 27).** `src/sim/slotGeometry.ts` (pure, no Phaser) lays out every home, forecourt, surface car park and beach: the city's capacity is exactly its drawn slots (`Spot.layout`, `spaces` never more) and the renderer draws exactly those slots. Pitches hold a car with a visible gap. A two-row car park keeps a gate lane clear in its near row; a car drives through the gate, along the aisle and backs into its bay (`aisleRoute`), at `AISLE_SPEED`. `test/parking-drawable.test.ts` checks every listed car is drawn and no two bodies overlap, spans included.

## Car motion rules (the owner, November 27)

The owner, on screenshots of cars crossing both lanes diagonally into a forecourt and through a taxi: "this still makes movements that are not possible for real cars… let's rebuild it, here are some more screenshots of impossible magic cars".

The rules (kinematic bicycle model, IDM, SUMO practice), in plan px: the drawn car is 16 px = 4.5 m, so 1 m = 3.56 px (`src/sim/kinematics.ts`).
1. A car moves only along its heading, forward or in reverse: no sideways slip (test: heading within 0.1 rad of each frame's move).
2. Heading changes only while moving; radius never under `R_MIN` = 5.2 m = 18.5 px (test: 90% of it).
3. Reverse only inside a parking move, at walking pace: 1.5 m/s = 5.3 px/s, played at `GAME_PACE` (below).
4. Speed on a curve at most √(a·R), a = 3 m/s² = 10.7 px/s², played at `GAME_PACE`² (the sim's own corner rule, `TURN.lateral` 100 px/s²).
5. Pulling over (a kerbside stop, double parking, a pump queue) is a forward S, not a slide.
6. Turning across the oncoming lane waits for a 3 s gap and holds that lane while crossing.
7. No two bodies overlap, moving, manoeuvring or parked.
8. Into and out of a space along arcs of at least R_MIN and straights, gears explicit: back into a kerb space with an S from a point ahead of it, line up on a bay's column and go straight in, square to the kerb.
9. Drive on the right; turns start and end in the proper lane.

**How it is built.** `src/sim/drivePath.ts` (Dubins CSC words, arcs, straights, gears, a path played backwards), `src/sim/parkPaths.ts` (the moves: kerb S, bay column, a bay along its road, car park gate and aisle, double parking, a mouth, a three-point turn where no U fits), `src/sim/parkMove.ts` (`planMove`, paces and the time each gear leg takes). The renderer (`manoeuvrePath.ts`, pure `manoeuvreCore.ts`) draws exactly that path, heading on its tangent. Moving cars glide between sim steps along a Hermite curve whose tangents are the two headings (`glide.ts`), so no step shows a slide. Forecourt cars all face the way the near lane runs (`slotGeometry.ts`): from that lane a car backs in with an S, from the far lane it swings round forward.

**How it is tested.** `test/motion.test.ts` (with `motion-helpers.ts`) plays the teleport test's three seasons and samples every drawn car at 6 frames a sim step through the renderer's own pure code, counting each rule. It is a ratchet (counts may not rise; `MOTION_STRICT=1` wants zero). `MOTION_LOG=n MOTION_RULE=slip` prints the cases; `MOTION_PLAN=1` compares the city's seconds with the drawn plan's. Where and in which situation: the motion lab (docs/inkroad-motion-lab.md, `npm run motion`, dev/motion.html), tiny scripted scenarios through the same code.

| Rule (Saffron Y3 / Y6 / Old Harbour Y4) | before | after |
|---|---|---|
| slip, manoeuvring | 5097 / 12105 / 12879 | 1 / 4 / 0 |
| too tight, manoeuvring | 2609 / 5757 / 5704 | 21 / 64 / 30 |
| turns in place, manoeuvring | 126 / 324 / 275 | 5 / 27 / 15 |
| slip, moving | 4283 / 10762 / 6840 | 265 / 103 / 205 |
| too fast on a curve, moving (played pace) | 16050 / 71766 / 28002 (at real pace) | 365 / 1824 / 850 |
| too tight, moving (junction corners) | 8436 / 22428 / 15000 | 8319 / 25089 / 15983 |
| reverse too fast + jumps, manoeuvring | 3328 / 7798 / 6854 (reverse) | 6543 / 16940 / 14965 |
| bodies overlap, manoeuvring / moving | 61, 124 / 277, 583 / 512, 290 | 132, 136 / 607, 1013 / 1495, 365 |
| cuts across without a gap | 41 / 339 / 385 | 77 / 560 / 792 |

**Round 2 (November 27): in the code, switched off until the bots are rebalanced.**
- `GAME_PACE` 1.25 is measured, not picked: a street's free speed is 62 px/s against a real 50 km/h street (49.4 px/s). An avenue gives 1.35, a highway 1.15. Manoeuvres play at this pace: reverse 6.7 px/s, forward 17.5 px/s on an R_MIN arc.
- `PLANNED_TIMES` (`src/city/manoeuvre.ts`) is off. When on, the lane is held only while the body is in it (`roadSplit`, `src/sim/parkMove.ts`), and the off-road part runs unheld. It also does these:
  - Off-road arrivals stop by their slot's column.
  - Kerb cars stop and pull out an S ahead of their slot.
  - Double-parking and door moves are timed from their paths.
  - Pull-outs hold as long as the real spawn pose needs (`holdLonger`).
  - A car turning across the road waits for a 2.4 s gap (3 s real) and holds the far lanes (`src/sim/crossing.ts`).
  With it on, the drawn path's own pace is kept, but the paths are long and the holds with them:
  - home bays: 13 s held, about 110 px of path;
  - forecourts: 8 to 9 s held;
  - leaving a street space: 10 s held;
  - double parking: 25 s of drive, three-point turns when it leaves the other way.
  The beginner bot falls from year 7 to year 3; neither the crossing waits nor the door holds cause this. Next: shorter paths (pull-out direction for double parking, forecourt aim), then switch it on.
- `ROOMY_CORNERS` (`src/sim/netCore.ts`, with `FILLET` 15 in `roadShape.ts`) is off. It grows a junction until a right turn is an R_MIN arc: too tight (moving) in Saffron year 3 falls from 6.3k to 4.2k. Its cost: the do-nothing city is lost in year 3 and the beginner bot ends in year 6.
- Fixed in the engine: forecourt cars alternate their facing again (facing all one way lost the do-nothing city in year 3). The far-lane case uses a three-point turn (`kTurn`).
- A kerb pull-out S is now 2 driveway lengths long, and a redirect slide stretches with its offset.

| Rule (Saffron Y3 / Y6 / Old Harbour Y4), final with both switches off | count |
|---|---|
| slip, manoeuvring | 13 / 23 / 16 |
| too tight, manoeuvring | 77 / 151 / 166 |
| turns in place, manoeuvring | 10 / 36 / 23 |
| reverse too fast + jumps, manoeuvring (the city's short holds) | 6935 / 18121 / 18231 |
| too fast on a curve, manoeuvring | 1547 / 4589 / 3728 |
| slip, moving | 274 / 107 / 202 |
| too tight, moving | 8195 / 24655 / 15950 |
| too fast on a curve, moving (at 1.25 pace; the sim corners at 100 px/s²) | 12758 / 56848 / 20917 |
| bodies overlap, manoeuvring / moving | 167, 142 / 570, 1014 / 1537, 346 |
| cuts across without a gap | 83 / 558 / 1123 |

**Fix round 1 (November 27): behaviour bugs, proven in the motion lab (docs/inkroad-motion-lab.md).**
- Buses (on, the default): a bus never turns round on the road. `turnBack` (a slide into the other lane, drawn as 226 frames of reversing) is gone from `src/sim/services.ts`; when a stop has no way on, the bus drives to the nearest gate ahead and turns round beyond the map edge (`GATE_TURN` 6 s hidden, the same vehicle), then comes back in. A long vehicle's stop is never past the point its front can reach (`src/sim/motion.ts` `plan`), so a bus by a big junction still arrives. drive.bus.stop: 692 violations to PASS (defaults), and PASS with the switches on.
- `GAP_ACCEPT` (`src/sim/switches.ts`), separate from PLANNED_TIMES, off for now:
  - A left turn at a junction waits for 3 s real (`LEFT_GAP` 2.4 s) before every oncoming car, not only the first of its lane (`oncomingGap`, `src/sim/grant.ts`). At equal priority, straight-ahead traffic goes before an oncoming left turner (it used to stop at its line for him by ticket order).
  - Turning into or out of a place across the far lanes waits for the gap and holds them with the fixed times too (`src/city/manoeuvre.ts`). The look sees past the junction behind (`arrivals`, `src/sim/crossing.ts`). A car that waited still stays as long (`crossWait`).
  - A kerb slot on a two-way road is aimed at, and left from, in the lanes on its side (`Access.dir`, `runsWith` in `src/sim/routes.ts`, `destDir`). Where no way round exists (`reachableTo`), it falls back to either way, as before.
  - Its cost, Saffron seed 1: nobody is lost in year 3, not 4. The beginner falls from year 7 to 6, greedy from 4 to 3, and the planner from 2.3 to 1.7 plates a year. The do-nothing city sits on a knife edge between years 3 and 4, so it waits for the rebalance with the other two.
- Left (lab): the dead-end turnaround (the lone car double-parks, then a squeezed three-point turn), the jam give-up (no shoulder), the pull-outs (reverse out of kerb stops), bodies through bodies, and the shapes of standing cars (forecourt parallel, van across slots). park.forecourt.far-lane now stands in its lane until B passes, but `firstManoeuvre` counts that stand as the turn. park.kerb.far-side has no way round in its map: side streets end at gates, and U-turns are only at dead ends and rings.

**Fix round 1b (November 27, unfinished: the motion ratchet and the season test are red, see the last bullet).**
- Root cause found for taxis, jam give-ups, pump queues and double parking (`double` spots): the sim draws a car arriving at a destination slid `DRIVEWAY.slide` (13 px) toward the kerb, while the double pose was the middle of the lane, at the same point: the drawn path went sideways (a spin of loops in 1 s, the taxi's ghost at the kerb) both in and out. Now (`ROAD_STOPS`, new in `src/sim/switches.ts`, off, in the lab's 'on' set): `stopOnRoad` (`src/city/kerbside.ts`) records where the car really stands (`Standing.lat`, `ParkedCar.lat`, `doublePose`/`doubleSlots`): a taxi or a driver who gave up on the shoulder line, a double-parked car or pump queue in its lane, with a forward S ahead when it has to move across; its lane block is where it is drawn; it leaves the way it faces (`facing`, `Access.dir`) to the nearest gate ahead (`nearestGate` with a heading); a car facing away from its way on turns round timed by its drawn path.
- Bare kerbs (`street`): a new `pullover` mode (`src/sim/parkMove.ts`, `pullIn` in `parkPaths.ts`) stops behind the space and pulls in with a forward S; kerb and street cars join the lane ahead of their slot (`aheadOf`, now with the true sideways distance, one-way streets and room before the junction) and leave with a straight forward S (`plainS`), never overshooting and backing up. One-way kerbs face the way the street runs.
- Lab, ROAD_STOPS on with the other three: drive.jam.giveup and park.taxi.drop meet every behaviour expectation (only the generic arrival swerve and squeezed fixed moves stay); park.street.unmarked and park.kerb.one-way meet theirs; park.taxi.pick still turns round (it arrives facing away from its rider's way: a three-point turn is real driving, the expectation asks for forward only).
- Red when this round stopped: some per-rule counts rose in the 'on' set (KNOWN not lowered yet), park.street.unmarked rose 135 to 153 with every switch off (an ungated change in the street path, not found), and `test/motion.test.ts` is over its ceilings (was not run before this round, so it may have been red already). Left: the dead end (needs a real turnaround: `kTurn`'s three 60-degree arcs end where they began on a narrow street), forecourt square-to-kerb, the van across two slots, the far-lane `firstManoeuvre` check, the catalogue generator (`npm run motion -- table`).
- Fixed after 1b: with every switch off the game is again exactly as before 1b (`test/motion.test.ts` green, every lab defaults count equal to KNOWN). The ungated change was `modeOf` in `src/render/cars/parkingSlots.ts`: gating `pullover` had dropped `street` from `parallel`, so bare-kerb cars were drawn as bays. `aheadOf`'s new sideways distance, one-way direction and junction room now run only with ROAD_STOPS (PLANNED_TIMES alone is as before). With ROAD_STOPS a car stopped facing a dead end keeps either lane (`facing`, src/city/manoeuvre.ts): drive.deadend.turn 421 to 165 (122 before 1b). park.taxi.pick's expectation is now 'pulled out forward or turned round with a three-point turn at walking pace' (no way round in its map). Still red in the 'on' set: park.kerb.one-way 160 (121), park.street.unmarked 30 (29), park.taxi.drop 53 (50), drive.deadend.turn 165 (122): each is the moving car's curve speed on the new forward S or lane change. `npm run motion -- table` prints the lab catalogue.

## Driveways and turning round (the owner, November 27)

The owner: "check frame by frame how cars enter and leave the street, they still do magic, they might do very fast rounds around places they need to enter. check how they do U turn". Found by sampling every drawn car of a Saffron year-3 season through the renderer's code: 159 swings of 150 degrees or more, most in a fifth of a second.

- **Parking moves that turn the car round** (a space facing against the lane: a U backing across the road, a three-point turn out of a slot, a double-parking loop) are played inside the fixed 0.3 to 1 s holds: 150 to 160 degrees in 0.2 s at 85 to 150 px/s, a 256 px double-parking loop in 0.7 s. `HONEST_SWINGS` (`src/sim/switches.ts`, off) gives a move whose drawn path turns more than 2 rad (`SWING`, `honestTimes` in `src/city/moveTimes.ts`, and building mouths in `src/city/door.ts`) its path's own time. On, the season test's jumps fall 4322 to 577 and reverse too fast 2613 to 1278 (Saffron year 3), but a trip's seconds include the pull-out, so the Saffron planner's Trips bar falls from 68 to 22 in year 1 and it is lost in year 3: a scoring decision (count the manoeuvre outside the trip, or in its free time) before it can be on.
- **Dead ends**: the U was one Bezier between the two lanes, a 4 px radius at 30 px/s. Now `turnRound` (`src/sim/parkPaths.ts`, track built in `src/sim/nodeBuild.ts`): a forward U where the lanes lie 2 R_MIN apart, else a three-point turn at walking pace, one car at a time (`grant.ts`), stopping at each change of gear (`Track.cusps`, `motion.ts`). The track is sampled every 0.05 px: at walking pace a 4 px track makes the drawn glide wobble (heading against chord).
- **Sideways slides** (lane changes, redirects, pull-outs) are never shorter than an R_MIN S of their offset (`slideLength`, `src/sim/kinematics.ts`). The kerb swing before a stop (`DRIVEWAY.length` 26 px, a 9 px radius) stays: at 40 px a swing that starts mid-step jumps 10 px (test/sim.traffic.test.ts driveways).
- Lab: `test/motion/scenarios.turns.ts` (eight scenarios, `roundsAtPace`). Season test with the switches off, Saffron year 3: too tight (moving) 8195 to 7338; turns in place (moving) rose 24 to 313 (cars creeping behind a three-point turn, the glide's heading against a tiny move).
- Left: the fast rounds by default (HONEST_SWINGS off); the roundabout is driven at 48 px/s on a 19 px ring (√(a·R) allows 22); the far-lane driveway does not wait for oncoming cars; double parking's path loops with ROAD_STOPS off (the 13 px kerb slide against the lane middle); PLANNED_TIMES on drops the planner's Trips bar from 66 to 16 in year 1.

## Difficulty after the realism work (November 27)

The owner kept all the realism (drawn capacity only, the lane holds, nothing vanishes) and asked for the game's own difficulty back. Measured on Saffron Bay seed 1, each mechanism switched off alone in a scratch copy (all bots, years 1 to 10; planner = its mean approval in years 4 to 10, 52 before this pass):

| Mechanism | What it costs | Switched off |
|---|---|---|
| Weekend trips | Weekend car trips scored about 25 points under workday ones (ratio 2.2 to 2.8 against 1.7; for nobody in year 1, 3.3 to 4.8): the workday's evening queue was still on the road after a 4 s night | Planner 63, nobody lasts to Y7, beginner to Y10. The largest share |
| Staying home | Carless grown-ups (one car, two adults) stay home from shops, dinners and visits: weight 10 to 15 a season against 1 to 6 before, at 6 points | Planner +4, nobody Y5, beginner Y6 |
| Sand and street parking | Scored as double parking (22) | Parking bar +8 in year 1, approval within noise |
| Lane holds (park in and out, turns) | Slower lanes | Approval +1 to +3 in some years, within noise |

**The night.** A busy junction passes about one car a second (one car in the box at a time; at 22, 18 a car every 1 s through the night). The planner's evening queue at the workday's close is 0 to 32 cars (Saffron, years 1 to 8, typically under 20); nobody's is 18 to 35. The night between the workday and the weekend is now 16 s (00:00 to 06:00, `WEEKEND_PERIODS.am` 4 to 16, `WEEKEND` 50 to 62, weekend `HOURS` start 24, 30, 30), the shortest that drains a planned city's evening before dawn at the day's pace; a 10 or 13 s night left the queues as they were, and 12 s cost the Saffron planner 5 points. Nobody's and a failing beginner's queues still do not drain by morning: their weekend starts in their own jam, as it should. A time-lapsed night (more road steps per drawn step) drained everything but made cars move and park several times a drawn step, which `teleports.test.ts` rejects; dropped. A Council back lane at column 33 and splitting row 30 off column 22 did not help the beginner and the lane broke the layout rule at Cardamom Kitchen; dropped, the map is unchanged.

Each scoring change, switched off alone on top of the 16 s night (seeds 1 to 3, both cities):

| Constant | Old | New | Reason | Measured on top of the night |
|---|---|---|---|---|
| `TRIP_FELT` (new, `tune.ts`; `feltOf` in `score.ts`) | every trip 1 | work 1, school 1.2, shop, visit and event 0.5, through and lorries 1 | The design: "a late school run hurts Trips most, a missed dinner least". People value time on shopping, visits and days out at under half of commuting time (UK WebTAG values of time). Weighs trips and trips not made in the Trips bar only; ratios, habits and lot tallies are unchanged | Saffron planner 58.3 without, 60.7 with; approvals 1 to 3 points higher across bots |
| `PARK_SCORE.sand` (new) | 22 (as double parking) | 60 | The sand by a beach is free and allowed, "a worse Parking score" than a bay (the design); a desert town takes it as normal | With `street`: Harbour nobody Y3 x3 without, Y5/Y3/Y4 with; Saffron planner 58.4 without |
| `PARK_SCORE.street` (new) | 22 | 40 | Not allowed, but out of the lane; its fine is felt in Cost when it comes, so here it is a nuisance, not a blocked lane | (with `sand`) |
| `START_EXPECT` | 1.35 | 1.42 | Residents count a trip from their own space to the next: pulling out (waiting for a gap, the manoeuvre) measured 0.07 of the free-flow drive on workdays (Saffron, years 1 to 6) | Saffron planner 55.3 without (the planner test fails); Harbour beginner Y6/Y4/Y4 without, Y9/Y4/Y5 with |
| `EXPECT_RANGE` | 1.12 to 1.4 | 1.19 to 1.47 | The same 0.07 | (with `START_EXPECT`) |

Lab after (seeds 1 / 2 / 3; end = reached year 10's end; targets in brackets): Saffron nobody Y3/Y3/Y3 (Y4/Y3/Y6), beginner Y6/Y6/Y7 (end/end/Y7), planner end x3 (seed 1 years 4 to 10 at 60.7), greedy Y4/Y4/Y5 (Y4/Y4/Y5); Old Harbour nobody Y5/Y3/Y4 (Y4 x3), beginner Y9/Y4/Y5 (Y9/end/end), planner end x3, greedy Y4/Y3/Y4 (Y4 x3). Still short: Saffron's nobody is lost a year early and its beginner does not reach the end (its years 6 to 9 lose Trips at column 22's junctions, the night no longer the cause).

**What sends the cars through (22, 18) (November 27, second pass).** Saffron, nobody, seed 1, year 1, every leg that entered the road classed by which arm of (22, 18) its two ends lie on (row 18 west or east, column 22 and the streets north or south of row 18). Legs that need the crossroads on workdays: 120 a season now, 114 under the pre-week engine (+5%), from the same 47 commutes, a little more shopping (53 against 32 a year through it) and dinners, visits and evening shopping that start after 16:00 (about 50 a season starting at t 90 to 130, against 25). The pre-week count of 83 a day was low because that engine took every car still on the road off the map at the workday's end: about 30 cars stood on the crossroads' arms at t 110 (39 at the evening peak) and never crossed. Today they cross in the night and the weekend (127 a season), with the weekend's own trips (about 22 a season) and taxis going to and from their base at a map gate (78 workday legs a year, 40 of them through the crossroads, and every map gate is on row 18 or column 22). The evening peak on the arms is lower now (30 cars against 39). So the crossroads is not chosen by more routes; it is the only way between the city's quarters: in years 1 to 3 the south (rows 24, 30 and 35) reaches anything else only by column 22.

| Change | Reason | Measured (seeds 1 / 2 / 3) |
|---|---|---|
| `scoreTrip` and `scoreLost` skip a taxi's empty run to or from its base (`src/city/score.ts`) | The design says such a run "is not judged, paid or remembered"; `completeTrip` already skipped it, but `endDay`'s late legs and give-ups scored it (Saffron: 4 to 5 weight a season at 0 to 3 points, years 5 to 7) | Saffron nobody year 1 46 to 48; Harbour nobody Y5/Y3/Y4 to Y4/Y3/Y4, beginner Y9/Y4/Y5 to Y10/Y5/end |
| Not in the map (measured, held back): row 24 run on to (36, 24) and a street joining it to row 18 at (36, 18), both from year 1 | The south's second way out: with every lot on its front street, rows 24 and 30 met the rest of the city only at column 22. The new street runs along the creek past Stapler Offices' plot, its row-24 piece is that plot's front street, and the school, Creek Villas and the east gate are then reached without (22, 18). Held back because at column 36 it fails the advisor's jammed-crossroads test, a night test (a shop visitor still standing) and a command test; at column 35 the street touches Stapler Offices' plot | Saffron nobody Y3/Y3/Y3 to Y4/Y5/Y3, beginner Y6/Y6/Y7 to Y7/Y6/Y7, planner end x3 (seed 1 years 4 to 10 at 60.9), greedy Y4/Y4/Y5 to Y4/Y5/Y3 |

Tried and dropped (seed 1 to 3, nobody and beginner): Saffron school runs by car 0.7 to 0.6 (its own note says 60 percent), dinners out 0.45 to 0.3, both: within noise. A lane at column 33 from row 24 to row 30: nobody Y6/Y5/Y3 (too easy for the year 4 or 5 test), beginner no better, and the layout check calls the gap behind Mint Row a sliver. Column 36 north of row 18 opening in year 4 instead of 6: beginner no better. Still short: the Saffron beginner falls in year 6 (approval 48 to 50 in year 5, 35 to 41 in year 6) on every map tried; year 6 adds the port's lorries, two football days, the flyover works and a jump in trips (workday trips 304 to 393).


## Road works close the road (the owner, November 27)

The owner: "we got roadworks stuck there after upgrading to avenue and the cars moving through it. if there are roadworks cars should not be able to pass."

- **Closed.** A road with `works > 0` and no `nightWorks` is closed to cars (`closedForWorks`, `src/sim/roadGeom.ts`). Its links are marked `closed` (`src/sim/world.ts`) and no turn into one is built into a junction's options, so routing goes round it; no trip starts or ends on it (`startLinks` and the fields' seeds skip it, `src/sim/routes.ts`). Junction works stay as they were: slowed, not closed.
- **Cars already on it** drive on and off it (its own lanes keep their way out, `src/sim/relocate.ts`); a car at the line about to turn in asks again; a trip that ended on it ends on the nearest open road. Nobody new enters. In a jam the last can take a while to leave.
- **Driveways.** A block keeps its drawn driveway, gate and spaces (`Lot.access`). While that road is dug, its cars come and go by an open road within reach on any side (`tripAccess`, `src/city/places.ts`, cached per network); with none it is cut off by car: no car trips, its parked cars stay. Places on a closed road are not chosen for parking (`spotsNear`, `roughSpot`). Everything reopens when the works end.
- **Buses** drive round and skip stops on a closed road (`openAt`, `src/sim/services.ts`); the drawn line is unchanged.
- **Night works** keep the road open by day, so it is drawn without diggings or cones. The quote says which (`Quote.closes`): "3 months of road works, road closed, open in September" or "by night, road open" (months since the change below).
- Bots (Saffron seed 1): planner years 4 to 10 at 59.0 (58.4 before), beginner still lost in year 7. A front-street block cut off for a whole season cost the planner a point (57.5) until the any-side fallback came in.

## Months and paydays (the owner, November 27)

The owner: "change the reward cycles to months, it will be much more manageable, 4 reward cycles per year is too low." One drawn day a season and the game's length stay; the day settles three times.

- **Calendar.** `City.month` is 0..2 within the season (`CityView.month` is 0..11 in the year, 0 = March). The season is still the day: weather, routines, happenings, art, the review card, letters and the year review.
- **Paydays** at season clock 60 (after the morning peak), 120 (the workday's midnight) and 182 (the season's end, `settleSeason`). The first two run `settleMonth` from `stepDay`; the day goes on.
- **Money.** Each payday pays `monthPart` of the season's car parks, transit, staff and interest and of the grant (three parts that add up to the season's sum). `City.ledger` is this month's books, `City.books` the last three months (at a review, the season's; the review card shows them with tonight's spending). Purse limit, float price, the beach's thin books and the bots read the three months together, so a season's totals are what they were. `forecast` is a month: "+7 next month".
- **Approval.** `City.opening` holds the dawn's bars and approval. Payday k moves them k/3 of the old day's step from there, toward the day so far (`reportDay`, the special rules' bends in, their side effects undone). The last payday is the old step exactly. One-off jumps (ribbons, the freeway dip, the zone vote, the beach) go through `bump`, which moves the opening too.
- **Works** run on the clock since "Roads wear, repairs by hand" below (`Road.worksEnd`, `TransitLine.ends`, `Project.ends`). Counted in paydays still: a burst pipe (to the season's end), the old freeway's digs (its pieces become parks at night) and works in saves from before.
- **Commissions** count months (`monthsLeft`, `endsMonth`) but are judged at the review, where their day's numbers are. The zone vote and the minibus protest stay in seasons: both are decided at the review.
- **Saves** are version 2 (`month`, `books`). A save in a day keeps its paydays: it restarts at dawn with the dawn's approval, gives back what drivers paid, and skips the paydays already had. A version 1 save loads at the start of its season (a review's at its end), works and deadlines ×3, its last season's books spread over three months (`src/city/saveUpgrade.ts`).
- Test: `test/months.test.ts` (12 paydays a year at the three points; Saffron years 1 to 4 and Harbour and Rivers year 2 end each season exactly where they did with one payday; saves).

## Roads wear, repairs by hand, works on the clock (the owner, November 27)

The owner: "the economy is too scarce ... what's Upkeep, I'm spending a lot on this. can we do it manual instead: if a street is broken I need to repair it, if I don't do it in time people complain, but people complain based on how frequently the road is used." In his Saffron Bay year 2 upkeep was 27 of 51 coming in a season. Then: road works last one fixed month, and make the game easier.

- **No road upkeep.** `upkeepCost` is gone; roads cost nothing a month. Car parks keep their running cost (`PARKS[kind].upkeep`, 2 to 9 a season), booked as `parks` ("Car parks"). Mending is its own line, `repairs` ("Repairs"), spent by `repair` and `replace`. `forecast` no longer takes upkeep off. Old saves' books say `upkeep`; `booksOf` (`src/city/save.ts`) moves it to `parks`, so the save version stays 2.
- **Use.** `RoadStats.cars` (`src/sim/measure.ts`): cars that drove onto a road this season (live), or the last season's at night. `c.measures.roads` keeps the season's at its night.
- **Wear in every city** (`src/city/rules/ageing.ts`, `WEAR`). At the season's night each road on the ground not under works loses `season + perCar × cars per lane` (a lane's share: a wide road spreads them). `normal` 0.006 + 0.00045 a car: Saffron Bay's busiest streets carry about 90 cars a lane a season and reach 60 of 100 in about 9 seasons (year 3); the quietest tenth (about 5) are still at 70 after ten years. `old` (Cross Rivers, `rules.ageing`): 0.012 + 0.0005, bridges ×1.4, its roads start worn (`ground.ts`), bridges under 22 carry no lorries. Saffron's roads start new, so year 1 (the tutorial) has nothing worn. Under 70 a road is slow (`wornFactor`, now in every city, down to half speed on a ruin; `shapeNet` keeps link speeds following condition); under 45 holes come, by flow, as before.
- **Complaints follow use.** `wornStreets`: `AGE.streets` (35) × Σ (cars × hurt) / Σ cars, hurt = (0.7 − condition) / 0.7: the share of the season's driving on worn roads, weighted by how bad. A worn road nobody drives costs nothing. `busyWorn` lists the roads by their part (last season's cars): residents complain about those of 0.3 points or more ("The road by Palm Row is all holes", kind `worn`; `pothole` lines too), Dewy names the worst ("Road by X is crumbling and busy: repair it", `problems.ts`), and `SpecialView.ageing` (now in every city) carries `cars` and `hurt` for the panel and the bots.
- **Repair** everywhere: from under 85, a month of works (closed, or open by day with night works), as new after (Cross Rivers: +0.35 up to 85, and Replace, six months). Price `newPrice × 0.4 × (0.6 + wear) × night rate`: a 10-cell street at 50 of 100 costs about 18 coins (inflation on top), a busy avenue about twice that; mending every road of the town would cost many times the busy few (`test/repairs.test.ts`). Widening a road gives it a new surface.
- **UI.** Road panel (`ageingBlock`, `src/ui/panels/special.ts`): Good (80+) / Worn / Poor / Broken (under 40) with a bar, "Busy and worn: people are complaining" with its Streets cost, Repair with its price and "1 month of road works, road closed". The Condition map is the Repairs map in every city (`flow.ts`): colour by condition, faint where nobody drives.
- **Works on the clock.** `MONTH_SECONDS` = a season / 3 (60.7 s), `cityTime` (`src/city/clock.ts`) = season seconds since the city's first dawn (between days it stands at the next dawn, so works begun at a review start with the next day). `roadDig` and `worksEnd` (`commands/shared.ts`) set `Road.worksEnd`, `Project.ends`, `TransitLine.ends`; `tickWorks` (once a second, `run.ts`) and every payday open what is due there and then ('opened', cones go, ribbons). Widening and repairs are 1 month (`WORKS`), flyovers 6, tram 6, metro 9, boat 3, replace 6, all counted from their start. `Quote.opens` = `monthAt(end)`. A save keeps the end on the city's clock: a day saved half way restarts at dawn and its works end at the same moment of the season as they would have. Instant upgrades were offered and not taken: a short closure keeps the timing choice (build in the evening, works by night) and the reopening moment.
- **Easier** (the owner): `EXPECT_RANGE` max 1.47 → 1.55, and from the end of year 5 0.1 more a year (`expectMax`, a big city gets used to its traffic); `STREETS.project` 2.5 → 1.5 (flyover dust); `FUMES.lorriesMax` 8 → 5 (the port's lorries). The Council grant is unchanged: removing upkeep alone doubles a careful player's spare money.
- **Doing nothing must lose** (follow-up, after the motion work): with wear and complaints from 60 the nobody bot lived to year 6 on seed 1. Complaints and the slowdown now start at 70 (`AGE.worn`, `WORN.from`) and a ruin drives at half speed (floor 0.62 → 0.5): untended busy roads cost Trips as well as Streets. Seeds 1 / 2 / 3: nobody Y4 / Y3 / Y6, beginner end / Y7 / Y8, planner end ×3, greedy Y5 ×3.
- **Months test.** `City.oncePaid` (tests only) pays a season's bills and moves approval once, at its night, and keeps one page of books: `months.test.ts` plays each city both ways and compares them, instead of numbers recorded before months.
- **Bots.** The planner mends up to 3 busy worn roads a review (0.2 points or more, keeping its reserve); the beginner mends the one Dewy names (0.3 or more, keeping 30). Rule moves offer repairs only of roads worn enough to mend, Replace only in Cross Rivers.
