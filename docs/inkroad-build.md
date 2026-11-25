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
