# InkTanks: level kit

For content agents building and tuning levels. The design is in `docs/inktanks-design.md`; this page is how to write a level and check it. Code: `games/inktanks`. Everything below was measured on the engine as of Nov 14.

## The loop

1. Edit a layout in `src/content/ch1/levels/levelNN.ts` (one file per level, listed in `levels/index.ts`).
2. `npm run lab -- --map N` to see it, then `npm run lab -- --level N --seeds 10` to play it.
3. Aim for: pass 7–9 of 10, time 3–5 min, main medal ≥ 70%, each bonus 20–70%. Change the layout, not the engine.
4. Before you finish: `npm run lab -- --chapter --seeds 3` (no-grind must PASS on all seeds), `npx tsc --noEmit -p .` and `npx vitest run`.

A bad layout fails at load time with a `LevelError` that lists every problem (unknown point, road, kind or tag, a place off the map or in water, a routed role without a route, a bad tank).

## Lab commands (run from `games/inktanks`)

| Command | What it prints |
|---|---|
| `npm run lab -- --map 3` | The ASCII map and legend only |
| `npm run lab -- --level 3` | Map, one line per seed (10 seeds), the summary line |
| `npm run lab -- --level 3 --seeds 30 --seed 100` | More seeds, other seeds |
| `npm run lab -- --level 3 --no-map` | Skip the map |
| `npm run lab -- --level 3 --tank cannon2/medium1/halftracks1 --kits 2` | Another player tank / kits |
| `npm run lab -- --level 3 --gadget smoke` | The stand-in's gadget: mines (default), oil, smoke or none |
| `npm run lab -- --all --seeds 10` | One summary line per level |
| `npm run lab -- --chapter --seeds 3` | The whole-chapter run and the no-grind check |

The player's seat is a bot ("a decent casual player"). Its default tank per level is `TYPICAL_TANK` in `src/sim/lab.ts`: what the chapter run has fitted by then (L1–2 `machinegun1/light1/wheels1`; L3–5 `cannon1/medium1/halftracks1`; L6–10 `cannon1/medium1/wheels2`), with 1 kit on L1–2 and 2 after. Re-measure with `--chapter` after big changes.

A seed line: `seed 3  PASS  2:31  medals xx.  kills 4  intel 18  hp 45%  foes left 0/5  alarm yes  amb  2  gad 2  spot  1  end: objective`. `amb` is the stand-in's ambush hits (×2 on enemies that hadn't seen it), `gad` gadget charges used, `spot` times an enemy went from ? to ! on seeing it. The summary line averages them as `ambush`, `gadgets`, `spotted`. `medals` is main, bonus 1, bonus 2. `end` is `objective`, `destroyed`, `time` or the objective's fail (`the truck was destroyed`, `a crew was lost`, `the convoy got away`, `the courier got away`).

Map legend: `S` start, `G` guard, `P` patrol, `W` wave (entry point), `V` convoy, `H` hunter, `R` runner, `U` turret, `A` ace, `B` boss, `t` truck, `c` crate, `T` target, `C` cage, `Z` hold zone, `F` flag, `O` recon spot, `E` exit, `X` pick-up/home, `-` roads, `#` solid, `n` low cover (sandbags, hay; fences and crates show as `+`), `+` flattenable, `"` cover, `~` water, `=` bridge, `:` dirt, `,` mud, `.` sand. One character is 80 × 60 px; a screen is 12 × 9.

## The layout format (worked example)

```ts
import type { LevelDef } from '../../../logic/level/types';
import { at, blob, each, LOOT_EARLY, path, row, TANK } from './kit';

export const LEVEL_01: LevelDef = {
  id: 'ch1-01', number: 1, name: 'First Tracks', type: 'assault',
  briefing: 'Four Boar scouts are poking round the old farm. Knock them out.',
  teaches: 'Drive, aim, shoot, swap a part, intel',
  map: {
    cols: 3, rows: 2, base: 'grass',                     // screens of 960 × 540; 2×2 to 4×4
    terrain: [path('dirt', [at(0.2, 1.6), at(2.8, 0.5)], 70), blob('water', 520, 360, 110)],  // later patches paint over earlier
    structures: [{ kind: 'barn', x: 1900, y: 300 }, ...row('fence', 1000, 760, 4, 60), ...each('oak', [[120, 120], [300, 90]])],
    points: { yard: { x: 1950, y: 420 }, crops: { x: 1250, y: 350 } },
    roads: { pond: [{ x: 300, y: 600 }, { x: 680, y: 600 }, { x: 680, y: 160 }, { x: 300, y: 160 }] },
  },
  start: { x: 200, y: 900 }, startHeading: -0.3,         // a point name or {x, y}; radians, 0 = east
  enemies: [
    { role: 'patrol', clan: 'boars', tank: 'machinegun1/light1/wheels1', at: { x: 300, y: 160 }, route: 'pond', hpMult: 0.6 },
    { role: 'guard', clan: 'boars', tank: 'cannon1/light1/wheels1', at: 'crops', hpMult: 0.4 },
  ],
  crates: [{ at: { x: 520, y: 700 }, content: { family: 'cannon', mk: 1 } }, { at: { x: 1250, y: 980 }, content: 'kit' }, { at: { x: 2750, y: 420 } }],
  objective: { kind: 'assault' },
  bonus: [{ kind: 'swaps', n: 1 }, { kind: 'noKit' }],
  timeLimit: undefined,                                   // seconds; the level fails when it runs out
  loot: LOOT_EARLY,                                       // for crates without content
};
```

- **Coordinates** are world px from the top-left. `at(sx, sy)` takes screens. Grounds: grass, grassDry, dirt, sand, mud, water, bridge.
- **Tanks** are `gun+Mk/hull+Mk/drive+Mk`. Chapter 1 families: machinegun, cannon, rockets; light, medium, heavy; wheels, halftracks, tracks. `TANK` in `kit.ts` has common ones.
- **Enemy knobs:** `role`, `clan` (boars, weasels, crows), `tank`, `at`, `route`, `when` (waves), `leash`, `sight`, `name`, `ace`, `hpMult`, `speedMult`, `kits` (default 0: it fights to the end; 1 lets it back off and repair), `truck` (no gun, drawn as a truck).
- **Intel drives unlocks.** Every wreck gives intel on all its parts (2 per Mk I part). Unlock costs 3, so two kills of a family unlock it. Levels 1–2 must field Cannon, Medium and Half-tracks; Rockets and Tracks must appear by level 5, or the no-grind check fails.
- **Structure kinds** are in `src/content/ch1/kinds.ts` (placeholders replaced by the world art's footprints where the art exists): farmhouse, barn, houseA, houseB, shed, wallBrick(V), wallStone(V), fence(V), oak, pine, bush, crops, rockA/B/C, bridgeRail(V), fuelBarrels, radarMast, hangar, fortWall(V), fortGate, fortTower, wagon, cage, and low cover: sandbags(V), hayBale, crate.
- **Structure flags** (in `kinds.ts`): `cover` hides a tank that isn't firing (bush, crops); `roof` hides tanks under it; `flattenable` Tracks and Heavy hulls drive through it; `low` low cover (sandbags 96 × 11 px and 120 HP, hayBale 38 px and 60 HP, crate 40 HP, fences): shots pass over it in their first 50 px, it never blocks sight, and any gun breaks it. Everything else that stands blocks sight and shots both ways. Put sandbag lines 150–300 px from the spots you fight over, with gaps for the road. `kit.ts` has `row`, `each`, `bridge`, `farmyard`.

## Roles

| Role | Does | Knobs |
|---|---|---|
| guard | Sits at its post. Fights what it sees within its leash (320 px from the post), then goes back. | `leash`, `sight` |
| patrol | Drives its road back and forth; fights what it sees. | `route`, `sight` |
| wave | Arrives at `at` when `when` comes (seconds, `'alarm'`, or `'stage'`), heads for the objective (hold zone, truck, flags) or you. | `when` |
| convoy | Follows its road to the end and leaves the map (no wreck). Only shoots back, for 4 s after a hit. | `route`, `truck`, `speedMult` |
| hunter | Always knows where you are and comes for you. | |
| runner | Like a convoy (flees down its road), for Chase. | `route`, `speedMult` |
| turret | Never moves; fights in range. | `sight` |

**Spotting (Tactics, Nov 14):** walls, buildings, rocks and smoke block a bot's sight. A calm bot sees its sight (guard 340, patrol 380, turret 400, others 440 px) in a 140° cone round its turret; calm guards and turrets sweep ±40°. A glimpse, or a shot fired within 300 px, makes it suspicious (**?**: it stops and looks); still seeing you 0.6 s later it's alert (**!**), sees all round to 440 px and fights. ? calms down after 2 s; ! drops to ? after 8 s without seeing anyone. Bushes, crops, roofs and smoke hide a tank that hasn't fired for 2 s, unless an enemy is within 60 px. Hitting a calm or suspicious enemy does ×2 (ambush). Waves and hunters are always alert.

**The alarm:** an **alert** guard, patrol or turret that sees you (or anything of yours), or one that is hit by you, calls every guard and patrol within **420 px** of itself to that spot for 25 s. Called bots that then see you call again, so alarms chain through a camp: post guards more than 420 px apart to make "one at a time" possible. The first alarm releases `when: 'alarm'` waves and spoils the `noAlarm` bonus.

**Stage:** `when: 'stage'` waves arrive when the objective's turn comes: Salvage on the pick-up, Rescue on the first broken cage.

## Objectives

| Kind | Params | Done | Fails |
|---|---|---|---|
| assault | – | every enemy tank destroyed (timed waves still to come count) | – |
| raid | `tag`, `label`, `need?` | `need` tagged structures broken (default all) | – |
| escort | `road`, `truckHp`, `speed`, `leash?` | truck reaches the road's end; it only drives with you within 480 px | truck destroyed |
| hold | `zone`, `radius`, `seconds` | `seconds` in the zone in all | – |
| ace | an enemy with `ace: true` | the ace destroyed; its intel is taken at once | – |
| rescue | `tag` (cages), `home`, `crewHp?` | every crew within 130 px of home | a crew lost |
| ambush | `mayEscape?` (default 0) | every convoy tank stopped | more than `mayEscape` got away |
| salvage | `at`, `pickup` | carry the prototype within 90 px of the pick-up | – |
| breakout | `exit`, `radius?`, `artillery?` + `timeLimit` | reach the exit | the timer |
| recon | `spots`, `radius?` (150), `dwell?` (2 s) | `dwell` s unseen near each spot | – (being seen raises the alarm) |
| capture | `flags`, `radius?` (140), `capture?` (6 s), `holdAll?` (5 s) | all flags yours at once for `holdAll` | – |
| chase | `base` + one `runner` | runner destroyed | runner reaches its road's end |
| fortress | `boss` (name, hp, road, speed, turrets) | boss hull destroyed (shielded to 25% damage while turrets stand) | – |

Always: your tank destroyed fails; `timeLimit` out fails; a hard cap of 10 min ends any run.

Freed crews ride at 120 px/s, 200 HP, follow in a line, and stay down while an enemy is within 380 px of them. Enemies don't aim at crews; misses and splash still hit them. Carrying the prototype slows you to 80% and tells every guard and patrol where you are every 1.5 s. Artillery marks a spot ahead of you every `every` s and lands after `warn` s; it leads by 60% of your travel, so a moving tank outruns it and a stopped one is hit.

**Gadgets** (the player's fourth slot, picked in the briefing): 2 charges a level, crates without set content hold a charge 12% of the time (when they aren't a kit; set `gadgetShare` on a loot table to change it). Mines (arm 1 s, 90 damage, broken track), oil (enemies ×0.4 speed for 8 s) and smoke (blocks sight for 6 s). The stand-in lays a mine when an alert enemy chases it or it's below 60% HP, pops smoke below 35% HP, and spills oil when an alert enemy is within 200 px; it carries mines unless you pass `--gadget`.

**Bonus kinds:** `kills n`, `noKit`, `time under` (s), `noAlarm`, `truckHp min` (share), `heavyWithRockets`, `swaps n`, `intel n`.

## Measured numbers

- **Screen** 960 × 540 native px; nav/ground cell 40 px.
- **Speeds** (open ground, px/s): MG Light Wheels 209, Cannon Light Wheels 190, Cannon Medium Half-tracks 128, Cannon Medium Wheels II 203, Rockets Medium Tracks 95, Cannon Heavy Tracks 91. Sand −30% for Wheels, mud −20% except Tracks.
- **HP** (×2.5 scale): Light Wheels 300, Medium Wheels 500, Medium Half-tracks 700, Medium Tracks 950, Heavy Tracks 1520.
- **Time to kill at 100% hits** (attacker gun → target hull/drive):

| Gun | Light/Wheels | Light/Half-tr. | Medium/Half-tr. | Medium/Wheels II | Medium/Tracks | Heavy/Tracks |
|---|---|---|---|---|---|---|
| MG I | 6.2 s | 17.5 s | 39 s | 19 s | 96 s | 154 s |
| MG II | 4.7 s | 12.1 s | 33 s | 16 s | 80 s | 128 s |
| Cannon I | 8.9 s | 12.5 s | 23 s | 17 s | 36 s | 70 s |
| Cannon II | 7.3 s | 10.3 s | 19 s | 13 s | 29 s | 54 s |
| Rockets I | 20 s | 17 s | 32 s | 43 s | 36 s | 68 s |

  Real fights hit 60–75% at close range, so add about a third. Use `hpMult` to make "scouts" (0.4–0.6) rather than new parts.
- **Chapter 1 bots:** aim error 0.28 rad, decide every 0.5 s, hold fire on 35% of decisions. The player stand-in: 0.14 rad, 0.28 s, never holds.

## Engine quirks (measured)

- **World-art footprints are much smaller than the old placeholders.** Walls are 64 px long and 4–14 px thick (brickWall, stoneWall, fortWall 63 × 14, fence 64 × 3), the fort gate 116 × 20, a wagon 84 × 24, an oak trunk 9 × 7 (canopies don't block). Lay walls **60 px apart** for a solid line; 120 apart leaves tank-sized gaps.
- A **closed breakable gate** blocks the sim player's path: its bot doesn't know to shoot a gate open. Leave gateways open or tag the gate as a raid target.
- **Terrain order matters:** a road painted after a river turns the bridge into dirt over water (still crossable). Paint roads first, then water, then bridge decks.
- **Machineguns barely scratch armour 7+** (the damage floor is a third): an MG starter can't kill a Medium hull in a fair fight. Give level 1–2 a Cannon crate, and keep Medium enemies there at hpMult ≤ 0.4.
- Short levels: the stand-in drives straight to the objective, so a level is as long as its fights. Hold is about the hold time plus the drive; Escort is the road length over the truck speed. Breakout needs a doubling-back route (level 9) to last.
- **Hollow buildings trap the stand-in:** the barn's footprint is four walls with a door gap, and the stand-in can drive in and get stuck pushing on the far wall (level 6, about 1 seed in 5). Keep goals and cages away from barn doors.
- **Cannon and Rockets bots telegraph** (0.4 s aim line before each shot), so they fire a little slower than the TTK table assumes.
- The chapter run's workshop may fit Wheels II over Half-tracks (more speed, less HP), which makes level 10 harder than with Half-tracks.

## Chapter 2: Dust Flats (engine built Nov 14)

Everything above still holds; this is what chapter 2 adds. Levels 11 and 14 are the worked examples: copy their shape.

### Where a chapter 2 level lives

- **Paid, server-only:** `games/inktanks/content/ch2/levels/levelNN.ts` (outside `src/`), listed in `content/ch2/levels/index.ts`, which `content/paid.ts` serves to owners. Never import them from `src/` (a test checks; only `src/sim` may).
- **Kit:** `content/ch2/levels/kit.ts` re-exports chapter 1's helpers (`at`, `row`, `each`, `patch`, `blob`, `path`) and adds:
  - `depot(x, y, w?, h?, guns?)`: our white-cement compound with two gun towers either side of its gate, which faces west at (x, y); the yard runs east. Spread `.structures` into the map and pass `.allies` as the level's `allies`. End an escort's road inside the yard.
  - `camp(c, open?)`: a Crow camp (two tents, a crate, sandbags round it with a gap towards `open`): recon spots, guard posts.
  - `LOOT_DESERT` (chapter 1's families plus the Mortar, Mk I 45%, II 50%, III 5%), `TANK` (Crow presets: `scout`, `gunner`, `gunner2`, `mortar`, `mortar2`, `rocket`, `heavy`), `CEMENT_STEP` (63).
- **Kinds** (`src/content/ch2/kinds.ts`): chapter 1's plus adobeHouse, adobeHut (roofs), adobeWall(V) (brick, 100 HP), oilDerrick (metal, 160), oilTank and valve (fuel: raid targets), tent (roof, 60), crowGate (the chase gate, 300), well, mesaWall(V) (cliffs, unbreakable), boulder, mesaRock, pebble, cactus (flattenable), palm (flattenable, fronds roof over tanks), scrub (cover, like a bush), dune / duneV (crests). **Desert art kinds, placeable by their art names** (HP from the art): adobeSmall (320), adobeLarge (520), crowTent (80), canyonRockA/B/C (solid), mesaEdge (128 px cliff run: lay them 128 apart, ends join). The old names map onto the art in `CH2_ART_NAME`: adobeHouse = adobeLarge, adobeHut = adobeSmall, tent = crowTent, mesaWall = mesaEdge, boulder / mesaRock / pebble = canyonRockB / C / A, valve = oilTank. Still without desert art (plain boxes or chapter 1 art): mesaWallV (no vertical cliff run yet), dune / duneV, adobeWall(V) and crowGate (chapter 1 brick wall and fort gate), scrub (bush).
- **Grounds** (appended to `GROUNDS`, so chapter 1's indexes are unchanged): `canyonRock` (cliff-floor red rock; drives like dirt), `packedSand` (hard sand), `sandTrack` (ruts running north–south) and `sandTrackH` (ruts running east–west). The three sand ones are **roads: no sand penalty** (no Wheels slowdown or slide) and nav cost 2, like dirt; lay `sandTrack` for a road that runs N–S and `sandTrackH` for E–W. The ground renderer paints them after the chapter 1 grounds, ordered by the manifest's `order` (fractional: canyonRock 1.5, packedSand and the tracks 2.5).
- **One faction:** the Crows (`clan: 'crows'`). Chapter 2 bots aim a little better than chapter 1's (`CH2_BOTS`: aim error 0.25 rad, decide every 0.45 s, hold fire 30%); every level 11–50 gets them.
- **The lab:** `npm run lab -- --level 11`, `--map 14`, `--all --ch 2` (every built chapter 2 level), `--chapter --ch 2`. The stand-in's tank for 11–20 is `cannon1/medium2/wheels2` with 2 kits (what the chapter 1 run ends on); also try `--tank cannon1/medium2/halftracks1`, since Wheels are the weak pick on sand. Dev page: `dev/mission.html?level=11&bot=1`.
- **Map legend additions:** `^` a dune crest; the lab prints `the courier got away` for a chase lost through its gate too.

### The Mortar (lobbed)

- **Numbers (design table, unchanged):** 45 damage every 2.8 s, lands 200–520 px away, 40 px blast, weight 5, breaks brick. Counters: Wheels 0.9, Half-tracks 1.0, Tracks 0.8. Mk I–V like any family.
- **A lob flies over everything** (walls, low cover, tanks) and bursts where it lands. **The whole blast hurts:** every tank within 40 px + its own radius takes the full hit (an ambush ×2 too); structures in the blast take the full hit, so mortars break sandbags (120 HP: 3 shells) and adobe walls.
- **Flight time** is the distance ÷ 280 px/s: 0.7 s at 200 px, 1.3 s at 375, 1.9 s at 520. The landing spot shows as a red ring that fills as the shell falls (our own shells: a pale ring), so a moving tank can drive out. Range spread ±5%.
- **Aiming:** the mouse lands the shell under the cursor (clamped to 200–520); a thumbstick ranges itself on the enemy it points at (within 0.3 rad), else keeps the last range. Your next landing spot shows as a small reticle while a Mortar is fitted.
- **Mortar bots** (any role): lob at a target in sight, leading it; keep about 375 px away (`LOB_KEEP` 0.72 of range), backing off when you close; never fire under the minimum range. With nobody in sight, an alert mortar **shells over walls**: where it last saw you (4 s), or where an alert friend sees you now (a **spotter**). So a mortar in a walled yard with guards at the gate is the chapter's signature set-up: kill or dodge the spotters, or get inside the yard, under its minimum range.
- **The stand-in** dodges a landing ring it's inside from 1.3 s before impact (straight forwards or back, whichever leaves the ring on drivable ground), and against a mortar it closes to 120 px (inside the minimum range). Enemy mortars still hit it about 30–40% of the time (60% against a slow escort truck).
- **Time to kill at 100% hits** (Mortar I from a Medium hull): Light/Wheels 22 s, Light/Half-tracks 28 s, Medium/Half-tracks 52 s, Medium II/Wheels II 50 s, Medium/Tracks 92 s, Heavy/Tracks 177 s: about half a Cannon I. Mortar II: 18 / 23 / 42 / 40 / 73 / 136 s.
- **A Mortar is a support gun for the player:** the stand-in fitted with one passes levels 11 and 14 only 2–3 times in 10 (enemies close under its minimum range); 55 damage every 2.4 s didn't change that. Tune levels for the typical Cannon tank, and offer a Mortar as a choice (a crate before a walled position, as level 11).

### Sand

- **Wheels:** ×0.7 speed on sand (`stats.sand`; Grip research takes part of it away), and they **slide**: on sand the tank moves with a velocity that swings round to its heading at 6/s × grip (`DriveSpec.sandGrip`: Wheels 0.35, Half-tracks 0.75, Tracks 1). Grip research raises it.
- **Measured** (top speed; how far it carries on east in a 1.2 s hard turn south): Cannon Medium II Wheels II 203 px/s and 49 px on grass, **142 px/s and 92 px on sand**; Half-tracks I 128 and 36 / 128 and 62; Tracks II 109 and 27 on both.
- Wheels also meet Machineguns at ×1.3, so a Wheels player on open sand is the weak spot of chapter 2: levels 11 and 14 pass 8–9/10 on Wheels II and 8–10/10 on Half-tracks.
- Chapter 1 has no sand in its levels, so none of this changes it.

### Sandstorms

- `weather: { kind: 'sandstorm', first?, every?, last?, sight? }` on the LevelDef (defaults: first at `every`, every 40 s, last 12 s, sight 180 px). A storm ramps in and out over 1.5 s.
- **In a storm nobody sees past `sight`:** every bot's eyes (calm or alert), the gun towers' and the stand-in's are capped; a hidden or distant tank is lost. Alarms, hearing (300 px) and spotters still work inside the cap. Recon is easier in a storm.
- **The player's view:** a sand veil closes to about `sight` round your tank, with the painted haze (`world/fx/sandstorm.png`, tiled, drifting) over it (`render/stormView.ts`); enemies' ? / ! marks, reload rings and minimap dots past `sight` are hidden too.
- **The HUD** says "Sandstorm coming in N s" 5 s ahead (a tip), then "Sandstorm!" and "The sandstorm has passed" in the feed. The briefing lists the storm's rhythm.
- **Use it:** time raiders (`role: 'wave'`, `when: first + 3`) to arrive under the storm, as level 14 does; the player then meets them at 180 px.

### Dune crests

- `dune` (200 × 60) and `duneV` (60 × 200): **block sight both ways, but shots fly over them and tanks drive over them.** Put guards just behind a crest beside the road: the approaching player can't see them (and they can't see the player) until one side crosses the crest or fires.

### Set pieces for the new mission types

- **Capture:** each flag is a flagpole (`FlagProp`) drawn with the generated structures flagBare / flagInk / flagCrow (the image swaps with the holder; a small bar under the pole shows the hold); "Flag raised!" / "Flag lost!" pops (`setpiece` events). Place each flag point by something (a well, a derrick) so it reads as a place.
- **Recon:** each spot is a camp you photograph: viewfinder brackets close in on it while you dwell unseen, then a white flash and "Photographed!". Build the camp with `camp(c, open)` at the spot; storms and scrub are the stealth tools.
- **Chase:** give the objective `gate: '<id>'` and place a structure with that id (`{ kind: 'crowGate', x, y, id: 'gate' }`) across the end of the runner's road, with the road's last point inside the base. The gate swings open (breaks, for now) when the courier is 260 px away ("The gate opens!"), and it drives in. Catch it before. A wrong gate id is a level error.

### Bosses

- `BossDef` takes `body` (a vehicle in the world manifest with a body and treads; default `'fortress'`), `clan` (default `'boars'`), `radius` (70) and `armour` (14); turrets can carry any gun, Mortar included. Level 20: `body: 'sandCrawler', clan: 'crows'`. Level 20's Sand Crawler draws with its own art (`crawler-body`, `crawler-treads`); its turrets still wear the fortress art (Mortar turrets the fortress cannon). A body the manifest lacks draws as the fortress.

### Writing a chapter 2 level (checklist)

1. Copy level 11 (a fight) or 14 (a run to our depot) into `content/ch2/levels/levelNN.ts`, set `id: 'ch2-NN'`, `number`, `name`, `type` and the briefing from the design doc's table; add it to `content/ch2/levels/index.ts`.
2. Base `sand`, a dirt road (`path('dirt', ...)`), `grassDry` scrubland patches. 3 × 2 or 4 × 2 screens, as chapter 1.
3. Give it the design row's twist with the engine pieces above (mortars behind walls with spotters, a storm, dunes, a gate). Two or three approaches: the open road, a covered flank (scrub, dunes, cliffs), and a third (a Mortar crate, a storm).
4. `npm run lab -- --map NN`, then `--level NN --seeds 20` on the typical tank and once with `--tank cannon1/medium2/halftracks1`. Targets as chapter 1: pass 60–90%, each bonus 20–70%.
5. `npx tsc --noEmit -p .` and `npx vitest run` (the chapter 2 test installs every paid level from JSON).

### Worked examples (measured Nov 14, typical tank `cannon1/medium2/wheels2`, 2 kits, mines)

| Level | Lab (20 seeds) | Notes |
|---|---|---|
| 11 Sand in the Tracks (assault, 3 × 2) | pass 17/20, 1:24, b1 (20 blueprints) 25%, b2 (under 1:40) 80%; seeds 101–120: 16/20 | Two mortars (hpMult 0.4) in a walled yard, a gunner and an MG scout at its gate (the spotters), an MG scout at the derricks, an MG patrol on the flats. A Mortar crate by the old pump. Half-tracks I: 8/10 |
| 14 Water Truck (escort, 4 × 2) | pass 18/20, 1:50, b1 (truck above 25%) 15%, b2 (4 kills) 35%; seeds 101–120: 16/20 | Storms at 0:40 and 1:40 (14 s, 180 px), raiders timed 3–10 s into each; ambushers behind dune crests by the road (sight 420, leash 420); two mortar turrets (mesa, derrick); depot towers at the end. The lever is `truckHp` (900: 3/20, 1200: 16–18/20, 1400: 20/20). Half-tracks I: 10/10 |

- An escort lasts the road's length ÷ the truck's speed (level 14: 3,600 px at 32 px/s ≈ 1:50), so time its storms to the truck's position (at 0:40 it's a third of the way).
- On level 14 most of the truck's damage comes from Cannon guards and the storm raiders; the mortars add about a tenth.

## Chapter 3: Mirefen (engine built Nov 14)

- **Boardwalk gotcha (measured, level 22):** the nav grid is 60 px and a boardwalk's drivable strip is 44 px, so put a walk's y (or a vertical walk's x) at 30 mod 60. On a row boundary the strip paints no cell and the walk is not there for driving. Likewise keep the cells beside a raid target or a flag free of solid cover, or the flow field can't reach it.

Everything above still holds; this is what chapter 3 adds. Levels 21 and 23 are the worked examples: copy their shape.

### Where a chapter 3 level lives

- **Paid, server-only:** `games/inktanks/content/ch3/levels/levelNN.ts`, listed in `content/ch3/levels/index.ts` (which `content/paid.ts` serves). Never import them from `src/`.
- **Kit:** `content/ch3/levels/kit.ts` re-exports chapter 1's helpers and chapter 2's `depot` / `camp` / `CEMENT_STEP`, and adds:
  - `boardwalk(x, y, n, vertical?)`: `.deck` (a 'bridge' strip to drive on; paint it after the water) and `.pieces` (boardwalk art, 128 px apart). The stone bridge deck isn't painted on it (it's a path, not a rect).
  - `reedBed(x, y, n, spread?)`: n reed clumps on a fixed spiral about 60 px apart, so a fire spreads through the whole bed.
  - `quay(x, y, w?, h?, guns?)`: our cement quay at the end of a barge's river road: `.basin` (deep water, paint after the river), `.structures` (cement walls on both banks, a jetty), `.allies` (a gun tower on each bank), `.berth` (end the barge's road here).
  - `depotEast(x, y, w?, h?, guns?)`: chapter 2's depot with its gate facing east (the yard runs west), for a run that ends on the west side.
  - `LOOT_SWAMP` (every family incl. Flamer and Hover; Mk I 35%, II 55%, III 10%), `TANK` (Weasel presets: `skimmer` MG I light Hover, `skimmer2` MG II light Hover II, `flamer` Flamer I medium Half-tracks, `flamerHover` Flamer I light II Hover, `gunner`, `gunner2`, `mortar`, `rocket`, `heavy`).
- **Kinds** (`src/content/ch3/kinds.ts`, all real art): stiltHutSmall (300 HP) / stiltHutLarge (480; roofs hide tanks), sluiceDam (wood, 600 HP, 136 px: any gun breaks it; the flood target), reeds (cover like a bush, Tracks/Heavies flatten them, they burn), deadTree (solid, thin), cypress (tree, 180), boardwalk / boardwalkV / jetty (decks: block nothing, drawn under tanks; lay them on a 'bridge' strip), walkRailN/S/E/W (low cover, 60 HP), mooringPost (solid), fishRack (flattenable). Chapter 1 and 2 kinds still work (sandbags, wallStone, cement, crates).
- **Grounds** (appended to `GROUNDS`): `swampWater` (deep: only Hover crosses it, like `water`), `shallows` (drivable, ×0.8 like mud for all but Tracks and Hover), `marsh` (firm swamp grass, like grass). Base a swamp map on `marsh`.
- **One faction:** the Weasels (`clan: 'weasels'`). Chapter 3 bots (`CH3_BOTS`: aim error 0.23, decide every 0.42 s, hold fire 28%) for every level 21–50.
- **The lab:** `npm run lab -- --level 21`, `--all --ch 3`. The stand-in's tank for 21–30 is `cannon2/medium2/halftracks2` with 2 kits (a step on from chapter 2's); also try `--tank cannon1/medium2/wheels2`. Dev page: `dev/mission.html?level=21&bot=1&tank=cannon2/medium2/halftracks2&kits=2`.
- **Map legend:** `~` deep water (water and swampWater), `,` mud and shallows, `"` reeds (cover), `=` bridge strips under boardwalks.

### Heat armour and the Flamer

- **Armour splits** (design "Tank stats"): every hull has kinetic armour (Light 3, Medium 7, Heavy 12, unchanged) and **heat armour** (Light 0, Medium 1, Heavy 2). Heat guns (the Flamer) meet heat armour; everything else kinetic. Armour research raises both.
- **The Flamer** (`flamer1..5`): 5 heat a tick, a tick every 0.1 s, a 150 px cone 0.7 rad wide, weight 2; 3 s of fuel (30 ticks), then 1 s to refill. Counters: Wheels 1.1, Half-tracks 1.0, Tracks 0.9, Hover 1.3. No projectile: every tick burns every tank in the cone that no wall shields (low cover is licked over in its first 50 px, as shots are), scorches wood, trees and fuel in it, and lights reeds. Friendly fire as for shots (an enemy's stream burns its own side).
- **Time to kill at 100% hits** (sustained, fuel refills included): Flamer I vs Light/Wheels 7 s, Light/Half-tracks 11, Medium/Half-tracks 23, Medium II/Wheels II 18, Medium/Tracks 36, Heavy/Tracks 81, Light/Hover 6, Medium/Hover 11. That's a Cannon I's (9 / 12 / 23 / 20 / 36 / 70 / 8 / 15) at a third of the range, better on light and Hover, a little worse on Heavies, and it hits everything in the cone.
- **Flamer bots** close in to 55% of the range (about 85 px, `FLAME_KEEP`) and fire whenever the target is anywhere in the cone. Two Flamers on a choke kill a Hover Medium in about 4 s: one per choke is plenty.
- **Burning reeds** (`match/flame.ts`): a lit clump burns 5 s; every 0.5 s it hurts every tank on it (10 heat through counters and heat armour, the one who lit it too); after 1.4 s it lights clumps within 85 px; then it's burnt out (no longer cover). Burning reeds hide nobody. The HUD pops "Reeds ablaze!" once per blaze.

### The Hover drive

- **Numbers:** speed 220, HP ×0.9, weight 3, turn 3.2. Floats over deep water (`water`, `swampWater`), ignores mud and shallows (and sand), and **drifts on every ground** (grip 0.45: the Wheels-on-sand slide, everywhere; Grip research raises it). Counters against it: MG 1.3, Cannon 1.0, Rockets 0.6, Mortar 1.2, Flamer 1.3.
- **Measured speeds:** MG I Light Hover 242 px/s (270 HP), MG II Light Hover II 290, Flamer I Light II Hover 240 (324 HP), Cannon I Medium Hover 185 (450 HP), Cannon II Medium II Hover II 222 (540 HP). Skimmers outrun everything you drive.
- **Navigation:** Hover tanks steer by their own nav grid (deep water open), built the first time a Hover tank needs it; ground tanks keep the old grid, so chapters 1 and 2 don't pay for it. A Hover enemy may start on the water (the loader allows it); a ground one may not. A ground bot whose goal is out on deep water (the barge) heads for the nearest bank cell.
- **The player gets Hover** by blueprints (Weasel skimmers drop Hover intel), or a level can **issue** parts for itself only: `issue: [{ family: 'hover', mk: 1 }]` fits them over your tank at the start (the briefing says so); your workshop tank is back after. Level 21 does this. Without it the stand-in never swaps onto a Mk I Hover from a crate (it scores parts by Mk).
- **A wedged tank drives out** (from level 21 on): a tank pushed half over water by a bump used to stick for good. Chapters 1–2 keep the old rule (`WEDGE_FIX_FROM`): level 14's storm raiders were tuned on it.

### Fog banks

- `weather: { kind: 'fog', banks: [{ x, y, r, dx?, dy?, period? }] }`: circles of mist; with `dx`/`dy` a bank swings that far either side of its centre, a full swing every `period` s (default 60). Inside a bank a tank is hidden (as in smoke or a bush; an enemy within 60 px still spots it), and **no sight line crosses a bank**, both ways. Shots fly through fog.
- The view (`render/fogView.ts`): the painted mist (`manifest.overlays.fog`) cut to a soft disc over each bank, drawn over tanks. Enemies in fog lose their ?/! marks and their minimap dot (unless they fire). The briefing names the fog.
- **Use it:** drift a bank along a lane so a guard is sometimes hidden in it (level 21's lanes); park one on a recon spot.

### Dams, tides and floods

- `floods: [{ by: 'dam', terrain: [patches], text? }]`: when the structure with id `by` breaks, its patches are painted over the ground (`swampWater` floods, `marsh`/`mud` drains), both nav grids follow, a ground tank caught in new deep water is washed to the nearest dry cell, and the feed says "The dam is breached!" (or `text`). The view repaints the ground. Give the dam an id: `{ kind: 'sluiceDam', x, y, id: 'dam1', tag: 'target' }` (a raid target too).
- `floods: [{ at: 60, terrain, text? }]`: a tide at 60 s, with "The tide comes in in 10 s!" first; the briefing lists it.
- A flood needs either `by` (an existing id) or `at`, never both: a level error otherwise.
- A broken sluiceDam stops blocking as a whole (the engine ignores the art's state-0 footprint, which leaves the gate posts standing).

### The barge and the Ironclad

- **Barge escort:** `objective: { kind: 'escort', road, truckHp, speed, vessel: 'barge' }`. The barge floats on deep water only (`keel`), so its road must run over water (a level error otherwise; paint the river wide enough: the barge's sample points sit 14 px from its centre). The player keeps pace from the bank (the stand-in aims abreast of it on its own side). Name it in the bonus: `{ kind: 'truckHp', min, vessel: 'barge' }`. Barges (ours and the enemy's) draw with `manifest.vehicles.barge` and leave a wake (`effects.wake`) while they move; the Ironclad churns one under each paddle wheel.
- **Enemy barges** (level 29's convoy): an enemy with `vessel: 'barge'` (and `truck: true` for an unarmed one) floats on deep water only and drives its route straight from point to point (the route is the channel, and must run over water; it may start on the water).
- **Make the river cross the whole map** (or end in a basin): if the banks join round its end, a ground tank can drive round to the far bank.
- **Locks:** `lockGate` (stone and iron, indestructible, solid; the art spans 136 px east–west, so it closes a channel running north–south). Level 29's river widens into a basin at the east end and leaves north through a cement-walled channel with the gates across it; the convoy's route ends just short of the gates (a barge there is in the lock and gone).
- **The Ironclad:** `BossDef.afloat: true` (with `body: 'ironclad'`, `clan: 'weasels'`): it moves on deep water only, so a charge that hits the bank stops it like a wall (dazed); its ring road must run over water. The art (`manifest.vehicles.ironclad`: body, paddle wheels, 288 frame) has the fortress's mounts exactly (cannonLeft (−49, −43), cannonRight (49, −43), rockets (0, 49), mg (0, −83) in its north-facing 288 px frame). A turret's `dx, dy` (body frame: dx forward) is (−y × 0.7, x × 0.7) of its mount, so level 10's offsets fit: Cannons (30, −34) and (30, 34), Rockets (−34, 0), MG (58, 0). Other offsets need the art repainted to match.

### Writing a chapter 3 level (checklist)

1. Copy level 21 (a run with Hover) or 23 (a barge escort) into `content/ch3/levels/levelNN.ts`, set `id: 'ch3-NN'`, `number`, `name`, `type` and the briefing from the design doc's table; add it to `content/ch3/levels/index.ts`.
2. Base `marsh`; rivers and lagoons of `swampWater`; `shallows` and `mud` for slow ground; reed beds (`reedBed`) as cover and as fire. 3 × 2 or 4 × 2 screens.
3. **Water decides the routes.** A ground tank can't cross deep water; Hover goes anywhere that isn't solid (water and land), so walls (stone weirs, stilt villages, huts) are what shape a Hover level. Give a breakable short cut (a sluiceDam) where it fits.
4. Weasels: skimmers on the water, Flamers in reeds at chokes (one per choke), Cannons on islands and banks firing across the water, a mortar on an island.
5. `npm run lab -- --map NN`, then `--level NN --seeds 20` on the typical tank and with `--seed 101`. Targets: pass 60–90%, each bonus 20–70%.
6. `npx tsc --noEmit -p .` and `npx vitest run` (the chapter 3 test installs every paid level from JSON).

### Worked examples (measured Nov 14, typical tank `cannon2/medium2/halftracks2`, 2 kits, mines)

| Level | Lab (20 seeds) | Notes |
|---|---|---|
| 21 Hover Trials (breakout, 4 × 2) | pass 16/20, 1:01, b1 (under 1:01) 40%, b2 (4 kills) 45%; seeds 101–120: 18/20 | Issued Hover Mk I. Two stone weirs make three lanes of deep water (an S: east, west, east); a sluice in each weir is a short cut. Skimmer II patrols per lane, Cannon II guards on islands, a Flamer in reeds at each turn (two at the east turn), a mortar at the east turn, two Hover Flamers hunting from 0:20 and 0:30, two skimmers on the alarm. Two drifting fog banks; the tide floods the north causeway at 1:00. Timer 1:10 (the stand-in's run is 0:59–1:05). With `cannon1/medium2/halftracks1`: 8/10. Early tuning: Hover Mk II passed 20/20 at 0:46; widening a turn gap from 248 to 308 px took it from 60% to 100% |
| 23 The Barge (escort, 4 × 2) | pass 18/20, 1:53, b1 (barge above 20%) 40%, b2 (4 kills) 60%; seeds 101–120: 16/20 | A river across the whole map, our quay at its east end (`quay`). The south bank's track with a Flamer in reeds and two Cannon guards; the north bank's stilt village with two Cannons, an MG and a mortar shooting across the water; skimmers down the river at 0:35, 1:15 and 1:20. The lever is `truckHp` (1200: 0–3/10, 1350: 75–80%, 1400: 80–90%, 1700: 100%). With `cannon1/medium2/wheels2`: 8/10 |

- An escort lasts the road's length ÷ the barge's speed (level 23: about 3,300 px at 30 px/s = 1:53).
- On level 23 most of the barge's damage is the north bank's guns and the skimmers; the quay's towers do most of the killing at the end.

## Chapter 4: Frostridge (engine built Nov 14)

Everything above still holds; this is what chapter 4 adds. Levels 31 and 34 are the worked examples: copy their shape.

### Where a chapter 4 level lives

- **Paid, server-only:** `games/inktanks/content/ch4/levels/levelNN.ts`, listed in `content/ch4/levels/index.ts` (which `content/paid.ts` serves). Never import them from `src/`.
- **Kit:** `content/ch4/levels/kit.ts` re-exports chapter 1's helpers, chapter 2's `depot` / `camp` / `CEMENT_STEP` and chapter 3's `depotEast`, and adds:
  - `ridge(x, y, n, vertical?)`: ridgeEdge (or ridgeEdgeV) cliff pieces 128 px apart (`RIDGE_STEP`); a `ridgeCorner` (44 × 44) closes an end. Unbreakable: they block sight, shots and driving.
  - `drifts(x, y, n, vertical?, tag?)`: a bank of snowdrifts 92 px apart (`DRIFT_STEP`): low cover any gun digs through (120 HP). Tag them `'drift'` for a rescue.
  - `avalanche(by, x, y, n, vertical?, damage?)`: an `AvalancheDef` for the level's `avalanches` (see below).
  - `railLine(points)`: railSnowH / railSnowV pieces every 64 px along axis-aligned points (a train's road). Ground pieces: they block nothing.
  - `LOOT_SNOW` (every family incl. the Laser; Mk I 25%, II 55%, III 20%), `TANK` (all three clans: `boarHeavy` Cannon II Heavy Tracks II, `boarRocket`, `boarGunner`; `skimmer` MG II light Hover II, `flamer`; `scout`, `mortar`, `gunner`; `laser` Laser I Medium Half-tracks I, `laser2`).
- **Kinds** (`src/content/ch4/kinds.ts`, all real art but the cornice): snowPine (tree, 120 HP, flattenable, canopy fades), firSmall (cover like a bush, flattenable, 30), cabinSmall / cabinLarge (wood 320 / 520, roofs hide tanks), snowdriftH / snowdriftV (low cover, 120, the rescue drifts), cornice (the avalanche trigger, 160 HP, low; drawn as a snowdrift until its art is painted), iceRockA/B/C (solid), ridgeEdge / ridgeEdgeV / ridgeCorner (cliffs), frozenFenceH/V (flattenable low cover, 40), generator (raid target, 400 HP, any gun breaks it, the Laser too), labBuilding (brick 800, roof), signalMast (metal 300: needs a brick-breaker), signalBox (wood 260, roof), railSnowH / railSnowV (decks). Chapter 1–3 kinds still work (sandbags, cement, crates, reeds).
- **Grounds** (appended to `GROUNDS`): `snow` (deep: Wheels ×0.75, Half-tracks ×0.9, Tracks and Hover ×1; nav cost 3, so bots keep to the tracks), `snowTrack` (N–S) / `snowTrackH` (E–W) packed-snow roads and `frozenDirt` (drive like dirt), `ice` and `thinIce` (below). Base a snow map on `snow` and lay the roads in snowTrack/H.
- **All three clans:** a chapter 4 level may mix Boars, Weasels and Crows with `mixedClans: true` on the LevelDef. Only levels 31–40 may set it (a level error elsewhere), and without it the one-faction rule still holds. Chapter 4 bots (`CH4_BOTS`: aim error 0.21, decide every 0.4 s, hold fire 26%) for every level 31–50.
- **The lab:** `npm run lab -- --level 31`, `--all --ch 4`. The stand-in's tank for 31–40 is `cannon3/medium2/halftracks2` with 2 kits; also try `--tank laser1/medium2/halftracks2` and a Heavy (`cannon2/heavy1/tracks2`) where thin ice matters. Dev page: `dev/mission.html?level=31&bot=1&tank=cannon3/medium2/halftracks2&kits=2` (or `node dev/snap.mjs out.png "mission.html?level=34&bot=1&t=40&demo=1"`).
- **Map legend additions:** `_` ice, `%` thin ice, `:` packed snow and frozen dirt (as dirt), `C` a crew's snowdrift (tag `drift`) as well as a cage, `&` avalanche snow still to fall.

### Ice and deep snow

- **Ice:** every drive slides (`DriveSpec.iceGrip`: Wheels 0.15, Half-tracks 0.22, Tracks 0.3; Hover keeps its 0.45 drift; Grip research raises it), and on ice a tank gets up to speed, brakes and turns weakly (`ICE` in `match/movement.ts`: ×0.45 acceleration and braking, ×0.75 turning). Top speed is unchanged.
- **Measured** (top speed; how far it carries on east in a 1.2 s hard turn south; how far it rolls in 3 s with the stick let go):

| Tank | Frozen dirt / track | Deep snow | Ice |
|---|---|---|---|
| Cannon I Medium II Wheels II | 203 px/s, 49, 33 | 152, 39, 18 | 203, 180, 267 |
| Cannon III Medium II Half-tracks II (the stand-in) | 154, 44, 21 | 138, 40, 17 | 154, 132, 158 |
| Cannon II Medium/Heavy Tracks II | 109, 27, 12 | 109, 27, 12 | 109, 84, 86 |
| MG II Light Hover II | 290, 163, 160 | the same | the same |

- Bots and the stand-in drive ice well enough: they slide wide on turns and bump rocks, which is the point. Ice rocks (`iceRockA/B/C`) and huts on a lake give something to slide round and hide behind.

### Thin ice

- `thinIce` drives like ice. A **Heavy hull** on it cracks it at once (an `ice` crack event: the HUD pops "The ice is cracking: get off!" for you, "Ice cracking!" for an enemy, and a crack decal appears) and after **1.4 s** on thin ice (`THIN_ICE.give`) it gives way: the thin ice within 70 px turns to open water for good (nav grids follow, the ground repaints, the `iceBreak` effect plays), and the tank takes **45% of its full HP** and is hauled back to the nearest firm ground. Lighter hulls cross freely. Off thin ice the timer settles at 2× (a Heavy that keeps moving over a strip narrower than about 130 px makes it across).
- **Heavies route round it:** a Heavy hull steers by its own nav grid (thin ice closed), built only on a land with thin ice. They still blunder onto it in a fight (strafing isn't routed): in level 31's lab runs an enemy Heavy goes through the ice in most seeds. A kill from the fall is credited to whoever hit it in the last 6 s.
- **Use it:** thin ice as bridges a Medium crosses and a Heavy can't; give a Heavy player a long way round (level 31's strips of shore ice along the map edge).

### The Laser

- **Numbers (design table):** 35 heat every 0.9 s, 480 px, an instant beam, weight 3. Mk I–V as any family (parts, save, workshop, blueprints, swap card; art `turretLaser-mk1..3`, Mk IV–V wear III). Counters: Wheels 1.0, Half-tracks 0.95, Tracks 0.85, Hover 1.2. Heat: it meets heat armour (Light 0, Medium 1, Heavy 2).
- **The beam** (`match/beam.ts`): no projectile. It traces from the muzzle along the turret and stops at the first tank on its line (either side's: friendly fire as for shots) or the first wall (low cover is passed in its first 50 px, as shots; cover, crests, decks and our gun towers never stop it). A beam stopped by a wall scorches it (wood, trees, fuel, snowdrifts burn; brick, metal and stone don't). High ground carries it 1.2× as far. Blizzard wind doesn't bend it.
- **Time to kill at 100% hits** (Laser I from a Medium hull): Light/Wheels 8 s, Light/Half-tracks 11, Medium/Half-tracks 20, Medium II/Wheels II 16, Medium/Tracks 30, Heavy/Tracks 49, Light/Hover 6, Medium/Hover 10 (Cannon I: 9 / 12 / 23 / 20 / 36 / 70 / 8 / 15). Laser II: 6 / 9 / 16 / 13 / 25 / 41 / 5 / 8. It never misses for travel time, so it out-kills a Cannon at range: give Laser guards hpMult 0.45–0.55.
- **Laser bots** keep about 375 px off (`LASER_KEEP` 0.78 of range: outside every direct gun's reach) and **telegraph** each beam with a 0.4 s aim line, like Cannons and Rockets: that line is the player's only warning, so cover breaks it. The stand-in with a Laser passes level 31 4/10 and is fine elsewhere; tune for the Cannon.
- **The view** (`render/effectView.ts`): `manifest.effects.laserBeam` stretched from the muzzle to where the beam stopped (0.14 s, fading), `laserHit` where it hit.

### Blizzards

- `weather: { kind: 'blizzard', first?, every?, last?, sight?, wind?, windAngle? }` (defaults: every 45 s, last 14 s, sight 200 px, wind 30 px/s, from the north-east, angle 2.2 rad). Sight is capped exactly as in a sandstorm (bots, gun towers, the stand-in, ?/! marks, the minimap).
- **The wind** (`match/wind.ts`): while it blows, every **moving** tank drifts with it (scaled by the storm's strength and by its speed up to 60 px/s: a parked tank holds), never into a wall or off its ground; shells, tracers and rockets in flight drift too (about 15 px over a Cannon's range). Lobs land where aimed; beams and flames are instant. Bosses, turrets, gun towers and boats hold their course.
- **The view:** a white veil closes to the storm's sight with the painted snow (`manifest.overlays.blizzard`) in two layers, a fast one and a slower 2× one. The HUD says "Blizzard coming in N s … The wind will push you", "Blizzard!" and "The blizzard has passed"; the briefing lists the rhythm.
- **Use it:** time raiders 2–4 s into a blizzard, as level 34 does.

### Set pieces

- **Snowdrift rescues (level 32):** the rescue objective works on any tagged structure. Tag snowdrifts `'drift'` (`drifts(x, y, n, false, 'drift')`) and set `objective: { kind: 'rescue', tag: 'drift', home }`: digging a drift out (120 HP) frees its crew; the title and HUD say "Dig out N crews", "Crews dug out k/N".
- **Avalanches (level 37):** `avalanches: [{ by: 'lip', drifts: [...], damage?, text? }]` (or the kit's `avalanche(...)`). Place a `cornice` with that id where the player can shoot it (on the near side of a ridge). The drifts lie dormant (not drawn, not solid, not in the nav grids) until the cornice breaks; then they all fall at once: solid low cover across the route (it stays shut until dug out), every tank under one takes 160 (raw, `AVALANCHE.damage`) and is shoved clear, the feed says "Avalanche!". Keep it to one pass, 2–4 drifts. The `by` id must exist (a level error otherwise).
- **High ground (level 35):** `heights: [{ x, y, r }]`: inside one a tank sees and shoots 1.2× as far (`HEIGHT.range`: its eyes, the stand-in's, shot and beam range, the bots' fire check). Ring a ridge top with `ridge` cliffs and leave a ramp; put the flag on top.
- **The Rail-Gun Train (level 40):** `BossDef.rail: true` with `body: 'railTrain'` and `length` (half its length, about 125 at the art's 0.7 scale): the boss moves only along its road, which is its rail line (open at both ends: a line, not a ring; lay `railLine` along it), shuttling end to end and back; shots, beams, lobs, flames and bumps meet a capsule as long as the train. Phase 2: it charges only down its line, at a player within 160 px of the track (`RAGE.trackSide`), and a charge that reaches the buffers (the line's end) dazes it like the fort walls. The art's mounts (frame 384, centre line): cannon (0, −108), mg (0, −30), rockets (0, 34), rail (0, 112); turret offsets in body frame (dx = −y × 0.7): (76, 0), (21, 0), (−24, 0), (−78, 0). A turret can wear other art: `{ gun: 'cannon', dx: -78, dy: 0, hp, art: 'fortressRail' }` (a Laser turret wears fortressRail by default).

### Writing a chapter 4 level (checklist)

1. Copy level 31 (a run across ice) or 34 (an escort through a pass) into `content/ch4/levels/levelNN.ts`, set `id: 'ch4-NN'`, `number`, `name`, `type` and the briefing from the design doc's table; add it to `content/ch4/levels/index.ts`.
2. Base `snow`; roads in `snowTrack`/`snowTrackH`; lakes of `ice` with `thinIce`; `frozenDirt` for islands and yards; ridges for passes. 3 × 2 or 4 × 2 screens.
3. Set `mixedClans: true` and use the clans for what they're good at: Boar Heavies (they can't take thin ice), Weasel skimmers on open water, Crow mortars behind ridges, a Laser at long range covering a crossing.
4. `npm run lab -- --map NN`, then `--level NN --seeds 20` on the typical tank and with `--seed 101`. Targets: pass 60–90%, each bonus 20–70%, no run at the 10:00 cap.
5. `npx tsc --noEmit -p .` and `npx vitest run` (the chapter 4 test installs every paid level from JSON).

### Gotchas

- **Thin ice is a level's Heavy test:** a Heavy player can't cross it, so give a long way round or say so in the briefing. Enemy Heavies avoid it on their routes but still slide onto it while fighting (they go through, which reads well).
- **The stand-in doesn't shoot cornices** (it fights tanks and the objective's targets). Tune an avalanche level so the hold passes without one, and treat the avalanche as the player's tool; or tag the cornice as a raid target in a raid.
- **Lasers out-kill Cannons at range** (no travel time; only the aim error misses). One per crossing is plenty; give them hpMult 0.45–0.55.
- **Heat guns shred trucks:** the escort truck has kinetic armour 10 but heat armour 1, so Flamers and Lasers hurt it about twice as much as Cannons. Level 34's Flamer raider did 400–550 to the truck alone; it rides with skimmers instead.
- **The wind is per blizzard, not per level:** a stopped tank holds; a long blizzard drifts a driving tank 100–300 px.
- **Rail lines must be axis-aligned for `railLine`** (the art is H and V runs); the train itself follows any polyline.

### Worked examples (measured Nov 14, typical tank `cannon3/medium2/halftracks2`, 2 kits, mines)

| Level | Lab (20 seeds) | Notes |
|---|---|---|
| 31 Thin Ice (breakout, 4 × 2) | pass 17/20, 0:53, b1 (under 0:50) 25%, b2 (3 kills) 85%; seeds 101–120: 12/20 | A lake of ice cut by three N–S leads of open water, each frozen over at one end by thin ice (south, north, south) with a 120 px strip of solid shore ice past it (the Heavies' way round). Skimmers up and down each lead; Boar Heavies (hpMult 0.4) by bridges A and C; a Crow mortar on the island covering bridge A, a Laser (0.55) by bridge B; a scout on the far shore; a skimmer on the alarm and a Heavy round the south strip at 0:30. Timer 1:15. With `cannon2/heavy1/tracks2`: 10/10 at 1:03 (the long way, never the time bonus); with `laser1/medium2/halftracks2`: 4/10. First cut (one straight band of thin ice): 10/10 in 0:22, nothing to do |
| 34 Blizzard Pass (escort, 4 × 2) | pass 17/20, 2:03, b1 (truck above 20%) 20%, b2 (6 kills) 55%; seeds 101–120: 16/20 | A packed-snow road up into a pass between two ridge lines (10 pieces each), our depot at the end. Blizzards at 0:35 and 1:30 (14 s, 200 px, wind 30). A Crow scout in the firs, a Crow mortar on the north ridge top (shelling over the cliff), a Boar Heavy (0.35) behind drifts in the pass, a Laser (0.45) at the pass mouth; skimmers at 0:37 and 0:39, a skimmer and a scout at 1:32–1:34. The lever is `truckHp` (1300: 0/10, 1400: 80–85%, 1700: 95–100%). With `cannon2/medium2/wheels2`: 4/10 (deep snow off the road, Wheels) |

- An escort lasts the road's length ÷ the truck's speed (level 34: about 3,900 px at 32 px/s = 2:03).
- On level 34 the truck's damage is spread: the pass Heavy and the Laser about a quarter each, the skimmers and scouts the rest; most of it lands between the pass and the depot, so the towers matter.

## Chapter 5: Deepwood (engine built Nov 14)

Everything above still holds; this is what chapter 5 adds. Levels 41 and 45 are the worked examples: copy their shape.

### Where a chapter 5 level lives

- **Paid, server-only:** `games/inktanks/content/ch5/levels/levelNN.ts`, listed in `content/ch5/levels/index.ts` (which `content/paid.ts` serves). Never import them from `src/`.
- **Kit:** `content/ch5/levels/kit.ts` re-exports chapter 1's helpers, chapter 2's `depot` / `camp` / `CEMENT_STEP`, chapter 3's `depotEast` and chapter 4's `ridge`, and adds:
  - `grove(cx, cy, r, n, skip?, map?)`: `n` old trees (oldTree, oldTree, oldFir, …) on a fixed sunflower spiral inside radius `r`. `skip` is a list of `[x, y, radius]` circles kept clear (the trails, clearings, glades); trees off the map are dropped (pass `map: { w, h }` for anything but 4 × 2).
  - `thicket(cx, cy, n, map?)`: young trees about 38 px apart: a wall to Wheels and Half-tracks, a short cut for Tracks and Heavies.
  - `felled(x, y, vertical?, tag = 'felled', id?)`: a fallenLog (or fallenLogV across an east–west trail) for an escort's `clear`.
  - `logBridge(x, y, across, id, tag?)`: `.deck` (a 'bridge' path to drive on: paint it after the river) and `.span` (the logBridge structure, a raid target with `tag`). It's a path, not a rect, on purpose: a rect 'bridge' patch gets the stone bridge deck painted on it.
  - `LOOT_FOREST` (every family incl. the Rail; Mk I 15%, II 55%, III 30%), `TANK` (Hive: `drone` MG III Light II Wheels II, `gunner` Cannon II, `gunner3` Cannon III, `heavy` Cannon III Heavy II Tracks II, `rail` Rail I Medium II Half-tracks II, `rail2` Rail II Heavy Tracks II, `logger` Flamer II Tracks II, `mortar`; the clans' veterans: `boarHeavy`, `skimmer`, `crowMortar`), `TREE_GAP` (110: old trees closer than this leave no room for a Medium between their canopies).
- **Kinds** (`src/content/ch5/kinds.ts`, all real art): oldTree / oldFir (420 HP, trunk r 10 / 8, canopy 28 / 25), youngTree / youngSpruce (60 HP, canopy 15, thickets), fallenLog / fallenLogV (low, 160 HP: any gun saws through), stump (low, indestructible), undergrowth (cover like a bush, our r 26 circle, flattenable, burns like reeds), sawmill (metal 600, roof hides tanks), logPile (wood 220, solid), hiveTower (metal 420), logBridge / logBridgeV (spans, 500 HP). Chapter 1–4 kinds still work (sandbags, cement, crates, cages, ridges).
- **Grounds** (appended to `GROUNDS`): `forestFloor` (roots and ferns: Wheels ×0.85, Half-tracks ×0.93, Tracks and Hover ×1; nav cost 3, so bots keep to the trails), `forestTrail` (N–S) / `forestTrailH` (E–W) (the fast lanes: no penalty, nav cost 2) and `clearing` (logged ground, like dirt). Base a forest map on `forestFloor`, lay the roads in forestTrail/H, the camps on `clearing`.
- **The Iron Hive** (`clan: 'hive'`): the clans' old masters, hornet crews (Vesper, Cinder, Rivet, Kiln, …), stripe colour `0xe0661f` (blackened iron and hot orange), capture flags fly `flagHive`. Chapter 5 bots (`CH5_BOTS`: aim error 0.19, decide every 0.38 s, hold fire 24%, kite 0.55): the sharpest. `mixedClans: true` is allowed on 31–50 now, so the clans' veterans can come back beside the Hive.
- **The lab:** `npm run lab -- --level 41`, `--all --ch 5`. The stand-in's tank for 41–50 is `cannon3/medium3/halftracks2` with 2 kits (a Major); also try `--tank cannon3/medium3/tracks2` (Tracks plough thickets and ignore the forest floor) and a Rail (`rail3/medium3/halftracks2`). Dev page: `dev/mission.html?level=41&bot=1&tank=cannon3/medium3/halftracks2&kits=2`.
- **Map legend:** trees and the trunks of old trees show as `#` (their canopies aren't drawn), young trees and undergrowth as `+` / `"`, trails and clearings as `:`, felled trees as `T` when tagged.

### Trees

- **Old trees** (oldTree, oldFir): the trunk (the art's footprint) is all that blocks driving and the nav grid; the **canopy**, a circle of `CANOPY.oldTree` 28 / `oldFir` 25 px round the trunk, blocks **sight** (every bot's eyes) and **shots**: a shell, rocket, tracer or laser beam that flies into it hits the tree (420 HP: about 11 Cannon I shells). A line that starts under a canopy isn't stopped by it, one that ends under it is. The canopy radius sits just inside where a tank touching the trunk stands (trunk + 0.85 × a Light hull's radius), so no tank is ever under one: the forest is a maze of sight lines, not a field of roofs. Mortar lobs fly over trees; the Rail goes through them.
- Burnt or shot down (state 0, a charred snag), a tree blocks nothing.
- **Young trees** (youngTree, youngSpruce; `thicket`): Tracks and Heavy hulls flatten them by driving through (as chapter 1's pines and fences: that rule is unchanged); every other drive is pushed round them, and the nav grid closes their cells for everyone, so bots go round thickets (a Tracks player can cut through). Their small canopy (15 px) blocks sight and shots (60 HP: one or two shells).
- **Bots shoot cover down:** an enemy that lost you behind a tree shoots it (one per target, as with sandbags). Old trees take long, so mostly they flank.
- **Cost:** canopies are circles indexed in the structure grid by their canopy bounds; every sight or shot test against one is a point–segment distance. Level 41 (97 trees) runs in about 100 ms per sim run, as chapter 4's levels do.

### The Rail

- **Numbers (design table):** 90 every 3 s, 640 px, weight 6, kinetic (meets kinetic armour), breaks brick. **Charge:** the pull starts a 0.8 s charge (`GunSpec.charge`); the aim is locked and drawn as an aim line for the whole charge (every Rail's, the player's too); then the slug flies at once along it. Mk I–V as any family (parts, save, workshop, blueprints `bp-rail`, swap card; art `turretRail-mk1..3`, Mk IV–V wear III). Counters: Wheels 0.9, Half-tracks 1.0, Tracks 1.15, Hover 0.85 (an anti-armour gun).
- **The slug** (`match/railgun.ts`): every tank whose body the line crosses takes the full hit (either side's; a boss and each turret on the line separately); every breakable wall, tree, log or bridge it passes takes half (`RAILGUN.structShare`); it stops only at unbreakable natural rock (cliffs, boulders, ridges, ice rocks: material 'rock', not low). Our gun towers are passed. A 'slug' event draws a white-hot trail in a hot-orange glow (code-drawn; no strip yet).
- **Rail bots** keep about 450 px off (`RAIL_KEEP` 0.7 of range). Their line of fire ignores everything but rock, and with nobody in sight an alert one fires through the trees at where it last saw you (4 s) or where a friend sees you now, like a mortar's spotter. All bots lead a charged gun by its charge time.
- **The stand-in reads the charge line:** standing on an enemy Rail's line with 0.55 s or less of charge left (`RAIL_DODGE`), it drives forwards or back, whichever leaves the line. Rails still land about one shot in three on it.
- **Time to kill at 100% hits** (Rail I, sustained): Light/Wheels 12 s, Light/Half-tracks 15, Medium/Half-tracks 25, Medium II/Wheels II 24, Medium/Tracks 30, Heavy/Tracks 50, Light/Hover 11, Medium/Hover 19. That's a Cannon I's speed with three times the reach through cover; on a Heavy it gives up little.
- **A Rail is a player's choice, not the default:** the stand-in with Rail I passes level 41 0–1/10 and 45 0/10 (it fights at sight range, where the charge and the 3 s reload lose to Cannon III); with Rail III, 6/10 and 7/10. Tune levels for the Cannon. Give Rail guards hpMult 0.35–0.45: each is the level's biggest single damage source.

### Forest fire

- `fire: { start: [places], at?, every?, spread?, burn?, damage?, hops?, text? }` on the LevelDef (defaults: at 0, every 3 s, spread 120 px, burn 14 s, damage 14 heat a 0.5 s tick, hops 60). At `at` s the burnable structure nearest each start (within 240 px) catches and the feed says "The forest is on fire!" (or `text`); the briefing warns.
- A burning tree (`match/forestFire.ts`, with flame.ts's fire list) hurts every tank within its canopy + 6 px + half the tank's radius each tick (anyone's, through counters and heat armour), lights every burnable structure within `spread` px after `every` s, **closes the nav grids round its canopy while it burns** (bots route round a blaze; you may drive through it and burn), then burns out to its charred snag (state 0: the canopy no longer blocks, the way reopens). Undergrowth burns like reeds (5 s, 85 px) and lights trees beside it. The view puts `effects.treeFire` on the canopy (scale 0.6 on young trees); the HUD pops "The trees are burning!".
- **A Flamer lights trees** in its cone, as it lights reeds. A Flamer's tree fire is a short chain: it dies out after `TREE_FIRE.flamerHops` (3) trees. A level's fire runs `hops` (60) generations; every tree burns once.
- **Fire speed:** a front moves about `spread / every` = 40 px/s through a dense forest (trees 100–120 apart). Keep start points and trails in step: a trail 1,000 px from the start closes in about 25 s.

### Set pieces

- **Log bridges (level 44):** `logBridge(x, y, across, id, 'target')` on a river. Spans are driven over, never block sight, and are low cover for shots (hit past a shot's first 50 px, never by a shot fired from on the bridge). Blown (500 HP), the 'bridge' cells under the span (its footprint + 12 px) turn to water for good (`match/spans.ts`): the nav grids follow, tanks on it are washed ashore, the ground repaints, the feed says "The bridge is down!". **The column:** `objective: { kind: 'raid', tag, label, column: true }` with a convoy-role enemy (or several) routed over the bridges: if one reaches its road's end before the raid is done, the mission fails ("the column crossed"). A blown bridge strands the column on the bank (no route).
- **Felled trees and convoys (level 45):** `objective: { kind: 'escort', road, truckHp, speed, trucks: 2, clear: 'felled' }`. `trucks` makes a convoy: the rest follow the lead along the road 110 px apart (`CONVOY_GAP`); lose any and it fails ("a truck was destroyed"); it's in when the lead reaches the end and the rest have queued behind it; the truck bonus counts the worst truck. `clear` names a tag on structures across the road: the trucks stop at one (it's solid) until it's sawn through, the HUD says "saw through the felled tree!", and the stand-in shoots the next one within 300 px ahead of the lead.
- **Three clans (level 46):** `mixedClans: true, clanWar: true` (levels 41–50 only): each clan is its own side (`CLAN_TEAM`: hive 1, boars 2, weasels 3, crows 4), so they fight each other on sight as well as you. Alarms only call their own clan. Capture flags count any enemy as "theirs".
- **Old rivals (level 47):** several `ace: true` enemies: the ace objective needs every one down ("Destroy Sly, Rook and Grim together", HUD "Aces destroyed k/n"); each ace's intel is taken on its kill. Aces still to come in waves count.
- **The clans join you (level 48):** `friends: [{ at, tank, clan?, name?, join? }]`: a tank on your side in its clan's colours that follows you (it fights within about 240 px of you, `ALLY_STAY`, and catches up past that); enemies fight it; losing it doesn't fail. With `join` (a structure id: a cage, a pen) it drives out when that breaks ("Tusk joins you!"). Pair it with a rescue: the cages free the crews on foot (the objective) and the friends.
- **The Harvester (level 50):** `BossDef { body: 'harvester', clan: 'hive', … }`: a 320 px frame (it draws at the bosses' 0.7 scale like the 288 px ones). Its mounts give body-frame turret offsets cannons (30, −34) and (30, 34), rail (−28, 0), mg (59, 0); a `rail` turret wears `fortressRail` by default (a charged boss turret telegraphs like any Rail). Felling saws are in the treads art.
- **Endings:** our cement fort is chapter 2's `depot` (gate west) or chapter 3's `depotEast`, with `allies` towers, as before.

### Writing a chapter 5 level (checklist)

1. Copy level 41 (a fight in the forest) or 45 (a run to our fort) into `content/ch5/levels/levelNN.ts`, set `id: 'ch5-NN'`, `number`, `name`, `type` and the briefing from the design doc's table; add it to `content/ch5/levels/index.ts`.
2. Base `forestFloor`; trails in `forestTrail`/`forestTrailH` 70–80 px wide; camps on `clearing`. Build the forest with `grove(...)` and keep the trails and clearings in its `skip` list (trees on a trail make the run a pinball). 3 × 2 or 4 × 2 screens.
3. Use the trees: guards behind canopies at the trail's bends, undergrowth to ambush from, thickets as walls only Tracks cross, a Rail or two in the trees beyond (hpMult 0.35–0.45), a fire where the design row says so.
4. `npm run lab -- --map NN`, then `--level NN --seeds 20` on the typical tank and with `--seed 101`. Targets: pass 60–90%, each bonus 20–70%, no run at the 10:00 cap.
5. `npx tsc --noEmit -p .` and `npx vitest run` (the chapter 5 test installs every paid level from JSON).

### Gotchas

- **Keep trees off the trails** (`grove`'s `skip`): an old tree's canopy on a trail stops every shot along it, and a trunk on it stops the escort truck dead (trucks drive straight at the next road point; they don't steer round).
- **Map edges:** from level 41 on, tanks are kept inside the map after collisions (`EDGE_CLAMP_FROM`); a thicket on the edge used to shove a tank off it for good (level 41's first cut: a run at the 10:00 cap).
- **Heat guns shred trucks** (as in chapter 4): with a Flamer logger by the second felled tree, level 45 passed 1/10 at 1400 truck HP; it's a drone now.
- **A Rail pierces the whole column:** both convoy trucks in line take its slug. On level 45 the Rail turret was the trucks' biggest single damage source at hpMult 0.45 and sight 460 (about 250 a run); lowering it to 0.35 and sight 420 (with truckHp 1800 → 2000) took the level from 5/10 to 20/20, so set the Rail first and tune `truckHp` after.
- **The stand-in doesn't hunt a Rail it can't see** (escorts are urgent). Put Rails where the player can reach them, and tune the truck on `truckHp`.
- **Suspicious bots see VISION (440 px), calm ones their `sight`:** a calm guard with sight 700 glimpses you at 500 px and then loses you; keep `sight` ≤ 440 for guards meant to spot and confirm.

### Worked examples (measured Nov 14, typical tank `cannon3/medium3/halftracks2`, 2 kits, mines)

| Level | Lab (20 seeds) | Notes |
|---|---|---|
| 41 Into the Pines (assault, 3 × 2) | pass 14/20, 2:03, b1 (under 2:05) 35%, b2 (9 kills) 15%; seeds 101–120: 16/20, b1 40%, b2 30% | A trail east through old groves into the Hive's logging camp (a clearing: sawmill, log piles, stumps, a watchtower). An MG drone in undergrowth, Cannon II and drone patrols on the trails, a Cannon II, a Heavy (0.25) and a Flamer logger in the camp, two Rails (0.45) in the trees beyond it, a drone on the alarm. A Rail I crate by the woodcutter's hut. Tracks: 10/10; Rail III: 6/10. First cut 5/10 (the stand-in didn't dodge charge lines and the camp was all Cannon III) |
| 45 The Last Convoy (escort, 4 × 2) | pass 15/20, 2:28, b1 (worst truck above 25%) 30%, b2 (9 kills) 40%; seeds 101–120: 13/20 | Two trucks (1650 HP each, 32 px/s) down a winding trail to our fort; three felled trees across it with Hive loggers in the undergrowth either side of each (Cannon II 0.4, drones 0.5, a Heavy 0.25 at the last), a Rail turret (0.35) in the trees north of the trail, drones at 0:50 and 1:35 and a Cannon II at 2:05. The lever is `truckHp` (1400: 1/10 with a Flamer logger, 1500: 12/20, 1650: 13–15/20, 1700: 17/20, 2000: 20/20). Tracks: 7/10; Rail III: 7/10 |

- An escort with felled trees lasts the road's length ÷ the trucks' speed plus the sawing (level 45: about 3,700 px at 32 px/s = 1:56, runs take 2:00–2:40).
- On level 45 the trucks' damage is spread: the Rail and the loggers at the second and third felled trees are the biggest shares; the fort's towers finish the last ambush.
