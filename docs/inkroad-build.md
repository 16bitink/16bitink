# InkRoad: how it is built

The build contract. Read [inkroad-design.md](inkroad-design.md) for the game; this page wins where they differ. Release: Sunday, November 29, 2026, with Saffron Bay (years 1–10, free) and Old Harbour (years 11–20, paid).

Package `games/inkroad`, branch `feat/inkroad`, port 5181, Phaser 4 + TypeScript, pnpm through `corepack pnpm`. Copy conventions from `games/inkbrick` (host, dev page, lab, saves, audio). **Never commit, stash, checkout or restore; other agents work in the same tree.** Touch only your own folders; ask the coordinator for a contract change (`src/sim/types.ts`, `trafficTypes.ts`, `constants.ts`), except that adding optional fields is fine.

## The launch cut

A year has four seasons; a season is one drawn day of 120 s (`DAY`). Speeds 0, 1, 2, 4. Build while paused.

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

Money is whole coins. Start 300–600. A season's Council budget is small (40–80); a street costs 4 a cell, a roundabout 30, signals 60, a flyover 180–300, a metro line 1,200+ (60% matched). Prices move one step a season.

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
