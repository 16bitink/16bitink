# InkBrick level kit

Everything a level agent needs; never read the engine sources. Design and targets: `docs/inkbrick-design.md`.

## The board and the physics (measured, engine 2026-11-18)

| Thing | Number |
|---|---|
| Board | 540 × 960 px, 15 px cells, 36 columns × 64 rows. Bricks only in **rows 3–50** |
| Raft (paddle) | top edge y = 900 (row 60), 90 px wide (Wide pickup: 140 for 20 s) |
| Stone (ball) | radius **8 px (16 px across)**, `BALL_RADIUS` in `src/sim/types.ts`; 480 px/s, +5% every 20 s of play up to 640, back to 480 after a lost heart. A 1-cell gap (15 px) doesn't let it through; 2 cells do, just |
| Stone and ceiling bounces | come off at least 11.5° from vertical (`MIN_VX_SHARE` 0.2): a straight shot into a hole hits the roof and comes back down at an angle. Brick bounces are plain reflections |
| Loop breaker | a stone that bounces 10 times off walls and stone without touching a brick or the raft is turned 7° (alternating), so no stone circles forever |
| Bounce | from 60° left to 60° right of straight up, linear in where it hits the raft |
| Launch | the stone waits at x = 270 on the raft; the player slides the raft under it to set the angle |
| Hearts | 3; a heart goes when the last stone falls |
| Ball cap | 300 |
| Crumble | under 5% of the breakable bricks left and nothing broken for 8 s: the rest crumble |
| x3 | the stone that breaks it becomes 3 (±20°). Growth is **linear**: N x3 shells give at most 1 + 2N stones. For "hundreds of stones" pack 1 × 1 x3 shells (`bw: 1`) |
| Keg | breaks everything breakable within 3 cells of its centre; kegs in range go off 0.08 s later (chain). 1 × 1 kegs every 3 cells chain along a line |
| Ice | breaking one cracks every touching ice brick (corners count), which shatter 0.15 s later |
| Pickup brick | drops `drop` ('wide', 'plus3', 'fireball'; default wide) falling 180 px/s. +3 launches 3 stones from the raft; Fireball (8 s) passes through soft and tough |
| Key + gate | breaking a `key` removes every `gate` with the same `link` |
| Shutter | stone door, `open` s open then `closed` s closed, `phase` s offset |
| Spinner | stone bar, pivot at the centre of cell (x, y), `length` cells, one turn per `period` s, `phase` s |
| Whirlpool | entering within 12 px of the centre of cell a (or b) moves the stone to the other end, same velocity |
| Floe | bricks with `floe: id` slide (dx, dy) cells and back over `period` s |
| Brumm (`boss`) | rect x, y, w, h cells (default 15, 4, 6, 3); shield `shieldW` cells, 1 row, at `shieldY` (default y + h + 1), sliding `speed` cells/s between trackX0 and trackX1 (default x − shieldW .. x + w). Level clears when he has taken `hits` hits (0.3 s apart); bricks don't matter there |
| Speed | 300 stones + 1,500 bricks: ~0.18 ms per step in Node |

**Break-in / "inside":** a cell is inside when a 5 × 5-cell probe coming up from the raft can't reach it through stone, gates and shutters. So any gap of 4 cells or less is a hole, and the region behind it is inside. **Keep 5 or more cells between a shell and the board edge**, or that corridor counts as inside. The lab draws inside cells as `:`.

## The lab (measure with it, never with probe tests)

```
cd games/inkbrick
npm run lab -- 3                      # by number (ch1 bundled + content/paid.ts)
npm run lab -- ch1-02-wall            # by id
npm run lab -- 2026-12-05             # a frozen daily (daily targets for its weekday)
npm run lab -- x --file src/level/ch2/thaw.ts   # a level file not wired in yet (its first LevelDef export)
  [--runs 20] [--quiet]               # --quiet: no board
```

One call prints a line with the goal, the rule and the new pieces, the ASCII board (`#` stone, `o` soft, `T` tough, `3` x3, `K` keg, `+` pickup, `*` ice, `k` key, `G` gate, `L` lever, `A` armour, `?` hidden, `=` shutter, `%` flip wall shut / `/` open, `@` spinner, `O` whirlpool, `U` bumper, `C` crab, `F` rescue friend, `P` pearl, `$` daily pearl, `-` tide line, `B` Brumm, `_` shield, `:` empty inside), the bots' table (with a goal column: share broken on Few Stones, floods on Rising Tide, `$ n/N` daily-pearl finds), every target of the level's goal with PASS/MISS, and a last `SUMMARY` line. 20 runs per bot take 3–12 s. With 20 runs the rates move by about ±10% between nearby designs: don't chase a 1-point miss.

What each number means (measurement rules of 2026-11-18, round 3):

- **Aim window** = share of 3,600 launch directions (9 spots along the raft × 400 directions in the ±60° fan) that reach an inside cell within 3 bounces, breakable bricks blocking. **Gates are measured open** (the hole as it is once its key is broken); **moving pieces are sampled over their cycle** (8 moments spread over the longest floe, shutter, half-spinner or shield period, the directions shared among them), so a shutter that is shut half the time halves the window; **whirlpools carry the ghost** to their other end. A level with an inside but every shot blocked reads **0% and a MISS**, not n/a.
- **Break-in** times are medians over runs that broke in.
- **Cascade** = inside bricks broken within 8 s of the break-in, as a share of the inside bricks left then, **counting at most 120 of them** (`CASCADE_BUDGET`): a 60-brick vault needs 21, a 480-brick picture needs 42.
- **Drought** = longest stretch without a break, a hit on Brumm, or a stone within one cell of the hole.
- **Novice clears** = share of novice runs that clear within 360 s with their 3 hearts. **Luck** = spread of the decent bot's clear times.

Bots: novice follows the stone with a lag and hits at a random offset, and misjudges about 1.5% of returns (that's how hearts go); decent predicts the landing, aim noise ±5°; skilled the same with **±3.5°** (a good human, not a machine). Both pick a way in by *chance to hit it × payoff*: a run of angles as wide as twice their noise is a sure hit; steep entries (28°+) pay most, angled (12°+) half, straight-up a sixth. With a gate closed they shoot for the key (its shots count as ways in) and dig toward it. On the same floor-hole vault the three are ordered: skilled breaks in first, then decent, then novice (`test/measure.test.ts`).

**A hole a shot from the launch spot finds** (the stone always starts at x = 270) is a break-in in the first second for the skilled bot, and the "break-in skilled 8–25 s" target misses. Keep the straight line up from x = 270 (column 18) and the shots near it off the hole, or put driftwood across them low in the open water (the daily generator does this automatically: `src/gen/screen.ts`).

## A level file

One file per level, a header comment with its signature, chapter 1 in `src/level/ch1/` (export added to `src/level/ch1/index.ts`), paid chapters in `content/chN/`. Helpers from `src/sim/kit` (all in cells):

```ts
/**
 * Level 1, "The Sandcastle Vault". Signature: Vault. A stone room with one window high in its
 * left wall; through it the stone rattles between the roof and the sandcastle. Pieces: soft, tough, x3.
 */
import { fill, shell, swapKind } from '../../sim/kit';
import type { LevelDef } from '../../sim/types';

const SHELL = shell(8, 14, 20, 16, [{ side: 'left', at: 1, width: 4 }]);   // x, y, w, h, holes (at = offset along the side)
const INSIDE = swapKind(fill(9, 20, 18, 9, 'soft'), [[12, 20], [21, 20]], 'x3'); // fill(x, y, w, h, kind, { bw, bh, hp, drop, tint, floe, link, skip })
const TEASERS = [...fill(12, 34, 12, 1, 'tough', { hp: 2 }), ...fill(0, 4, 36, 3, 'soft', { tint: 1 })];

export const VAULT: LevelDef = {
  id: 'ch1-01-vault', name: 'The Sandcastle Vault', number: 1, chapter: 1, layout: 'vault', par: 90,
  tip: 'Bank the stone off the left wall and in through the window.',
  bricks: [...SHELL, ...INSIDE, ...TEASERS],
};
```

Also `stone(x, y, w, h)` and `minus(bricks, blockers)` (drop bricks overlapping others). Bricks may not overlap (per floe); a bad level throws while loading with every problem listed. Budget 1,500 bricks; long stone runs are one brick each, so walls are cheap.

## The proposal command (start every level here)

```
npm run gen -- --propose --chapter 2 --number 14 --layout hourglass [--twist ice] [--goal rescue] [--rule current] --out content/ch2/neck.ts
```

Layouts `layers` and `open` are allowed from chapter 1; twists `bumper` from chapter 1, `lever` and `crab` from 3, `hidden` from 4. `--goal` places the friend or the pearls as the daily generator does (`stones` writes `stones: 4, need: 0.6` to tune; `tide` writes a line and pace).

It composes ~80 candidates from the daily generator's parts with **only the pieces allowed up to that chapter** (ch1: vault, wall, core, fuse, no twist; ch2 adds hourglass, picture, ice, floe; ch3 adds guarded, maze, keyGate, shutter; ch4 adds whirlpool, spinner, dark; ch5 adds nested), keeps those that pass the cheap checks (valid, budget, every brick reachable, aim window ≥ 2%), lets the bots play the 6 nearest the aim target, and writes the best one as a ready level file: header with the command and its lab lines (20 runs), `export const LEVEL_14`, bricks one board row per line. The level's place in its chapter sets the dial: levels x1–x3 get 4-wide holes and short boards, x4–x7 3-wide, x8–x9 2-wide. Boss levels (x0) are refused: start from `src/level/ch1/boss.ts`. A guarded gate needs `--twist shutter` or `spinner`. It takes 1–3 minutes. Then hand-tune: rename the export, write the header (what it teaches, its pieces), the tip, a fun name, and run the lab.

## Worked examples (copy these)

Chapter 1's rows are from before its 2026-11-24 rebuild (easier levels, wide gaps): read the files, not these numbers.

| Level | File | What it shows | Lab (30 runs) |
|---|---|---|---|
| 1 | `src/level/ch1/vault.ts` | Floor hole by the wall, empty chimney, band under the roof: the novice-friendly vault | 11/11 |
| 2 | `src/level/ch1/wall.ts` | Over the wall with the tunnel by the edge, a chimney to the open water, x3 shells lining the chimney | 10/11 · MISS cascade 31.8% |
| 3 | `src/level/ch1/core.ts` | x3 core with a door below and one above; driftwood under the door; kegs in the field's corners stop the hunt | 9/11 · MISS break-in skilled 5.3s, luck 0.53 (the decent bot keeps shooting at the core after the break-in) |
| 10 | `src/level/ch1/boss.ts` | Brumm's shield sliding along the wall row over his gap; 26 hits | 7/11 · MISS cascade 27.5%, drought 19.0s, novice clears 76.7%, luck 0.57 (boss levels still use brick targets; read novice clears and drought) |
| 11 | `content/ch2/thaw.ts` | Ice waves: one hit shatters a band of ice; soft rows stop the wave | 10/11 · MISS novice clears 93.3% |
| 12 | `content/ch2/drift.ts` | A sliding ice floe drifting across a 3-wide neck: time it or smash it | 10/11 · MISS drought 11.7s |
| 21 | `content/ch3/key.ts` | Key + gate: the gate seals the floor hole, the key hangs in the left channel | 8/11 · MISS break-in skilled 25.5s, drought 12.3s, novice clears 86.7% |
| 22 | `content/ch3/shutters.ts` | A shutter over a 3-wide floor hole, open 1.8 s, closed 1.3 s | 11/11 |
| 31 | `content/ch4/whirlpool.ts` | Whirlpool from the open water low on the board to halfway up the vault's chimney | 8/11 · MISS break-in novice 10.6s, break-in skilled 5.7s, luck 0.69 |
| 32 | `content/ch4/spinner.ts` | A length-3 spinner under a 4-wide floor hole, upright at t = 0 | 10/11 · MISS cascade 32.7% |
| 33 | `content/ch4/dark.ts` | `dark: true`; aim window kept easy (4.8%), since the player sees only near each stone | 11/11 |

## Goals, rules and the new pieces: how they read on a board (engine 2026-11-18, measured)

The contract is the design's section "Variety" (`docs/inkbrick-design.md`). Field names as in `src/sim/types.ts`.

### Targets per goal (`goalTargets()` in `src/sim/targets.ts`)

| Goal | What changes in the lab's targets |
|---|---|
| `clear` | as before |
| `rescue` | "clear skilled" becomes **rescue skilled 30–90 s** (the level ends when a stone touches the friend); no last-brick hunt |
| `pearls` | **last pearl skilled 40–100 s**; no hunt |
| `stones` (Few Stones) | no clock: no clear time, hunt or luck. "Novice clears" = novice runs that reach `need`; **share skilled ≥ (need + 1) / 2** (the median share the skilled bot breaks) |
| `tide` (Rising Tide) | as clear, plus **floods (decent, median) ≤ 1** |

Boss levels keep their own targets. Open levels (armour, no stone): the aim window reads **n/a** (no hole to aim at); break-in and cascade are measured from the armour's inside.

### How the bots play them

- **Rescue / pearls:** decent and skilled bots first look for a clear shot at the friend or an untaken pearl on the board *as it is now* (broken bricks gone, flip walls as left, the tide's offset): `src/sim/goalaim.ts`. With none, they go for the way in while the friend or a pearl is inside, else dig toward the nearest one. The novice plays as always.
- **Few Stones:** as clear (the way in maximises the cascade, so the share).
- **Rising Tide:** once the lowest brick is within 7 rows of the line, decent and skilled bots dig the lowest bricks instead of going in.
- **Sticky:** a caught stone is aimed like the launch. **Current / heavy:** the decent and skilled bots predict the curved landing, and the Aimer traces curved ghosts.
- **Armour:** decent and skilled bots chew the armour brick a straight shot can reach, weakest first.

### Rules (`rule`, at most one; `ruleDir` ±1 for `current`)

Measured on the old Level 1 (The Sandcastle Vault with a 3-wide floor hole, aim window 4.9%; rebuilt 2026-11-24):

| Rule | Aim window | Notes |
|---|---|---|
| `current` (120 px/s² sideways) | 4.8–4.9% | barely moves the window: a stone is in the air about a second, so it drifts ~60 px. It moves the *landing* more; the bots predict it |
| `heavy` (160 px/s² down) | 3.8% | high shots fall short |
| `bigStone` (radius 12.8 px) | 3.4% | a 2-cell (30 px) gap still lets it through; 1-cell never |
| `speedy` ×1.25, `slow` ×0.85 | 4.9% | geometry unchanged; speedy costs the novice hearts |
| `tinyRaft` 60 px (wide 100), `wideRaft` 130 px | — | angles are the same (60° at the edges), so aim is the same; the novice saves fewer/more stones |
| `oneHeart` | — | 1 heart |
| `fog` | — | the `dark` lantern (`state.dark`) |
| `sticky` | — | the raft catches a lone stone; the raft slides under it to aim; thrown on tap or after 1.5 s; the clock keeps running |
| `twoStones` | — | every launch throws two, mirrored about straight up (never closer than ±4°) |
| `ghost` | — | after each raft hit (and the launch) the stone passes through the first brick it *breaks* (a tough brick it only cracks still bounces it) |
| `goldRush`, `kegDay` | — | generator only: 12% of the plain sandcastle becomes x3, or 10% kegs |

### New pieces

| Piece | Numbers | How it reads |
|---|---|---|
| Bumper `bumpers: [{ x, y, r }]` (px, r 14–24) | a pair mirrored about the middle in the open water costs Level 1 **0.6–1.0 points** of aim window at r 16 and **1.0–1.4** at r 22 (4.9% → 3.5–4.3%), the same at 90 or 150 px off the middle, rows 40–44 | a kick of 35% of the speed along its normal, then the speed restored: shots off a bumper fly steeper and faster-looking. It blocks more than it helps getting in: use it to make a big hole harder, or as a field toy on open levels. Keep bricks 1 cell clear around it |
| Lever (brick `kind: 'lever'`, `link`) + `flips: [{ x, y, w, h, link, on }]` | each hit toggles every flip with its link, at most once per 0.4 s; never breaks; not counted in the clear | the aim window is measured with flips **open** (like gates); while a flip is shut the bots shoot for a lever (its shots count as ways in). A lever inside a corridor that shuts the gaps traps the stone there until it hits the lever again. Put the outside lever low by a side wall, like a key |
| Hidden brick (`hidden: true`) | plays as its kind; `bricks[i].revealed` turns true on its first hit (event `reveal`) | a few hidden x3 shells in the field are a nice surprise; hidden bricks still block shots (the trace sees them) |
| Crab `crabs: [{ y, x0, x1, speed, phase }]` (cells; 3 × 2) | walks x0 → x1 → x0 at `speed` cells/s (period 2·(x1−x0)/speed), twice as fast for 1 s after a hit | a moving stone box: the aim window samples it over its walk. In the open water under the field (rows 44–47) it mostly turns returns back up early |
| Armour (`armour: true` on any brick) | the inside is what the armour **encloses at the start** (a breach doesn't change it, so breaching never moves the goalposts); a stone reaching an enclosed cell is the break-in | 1 row of 3-hit driftwood under a payload: break-in skilled **27–45 s**, novice 56–76 s; 2 rows of 2 hits: skilled 58 s; a teaser row under the band in the shot lanes adds ~15 s |
| Rescue friend `rescue: { x, y, who }` (2 × 2 cells) | the stone only needs to *touch* it (pass-through); a 2-cell gap leads a 16 px stone to it | 2 × 2 is reachable anywhere a 2-cell corridor leads. Deep in the inside (the generator picks the cells farthest from the mouth): an hourglass with the puffin in its top corner was rescued by the skilled bot in 25 s, novice 7/8 |
| Pearls `pearls: [{ x, y }]` (3–5 cells, pass-through) | taken within 14 px of a stone's centre (8 + 6) | half inside, half in the field 6+ cells apart: a wall day took the skilled bot 25 s for all three. Never on a brick (validated) |
| Daily pearl `dailyPearl: { x, y }` | as a pearl; doesn't end the level | on clear days the stone roams the whole board, so it is found often (decent 20–100%); on rescue and pearls days less |
| Rising Tide `tide: { every, line }` | every `every` s of play everything but the border wall (stone touching a side edge, at least as tall as wide) sinks a cell; a breakable brick reaching `line` (or anything reaching row 57) costs a heart and lifts the field 6 rows | with the line 6 rows under the lowest brick (a wall day): **4 s/row** floods the decent bot 1.2 times and the novice clears 50%; **6 s** 0.4 floods; **8 s** 0–0.3; 12 s never. The generator uses ~40 s to the first flood (≈ 7 s/row at a 6-row gap) |
| Few Stones `stones`, `need` | no hearts; each launch spends a stone; ends when the last stone falls (cleared if share ≥ need) or everything is broken | (campaign only) |

## Recipe: layers (copy `dev/recipes/layers.ts`)

Full-width stone floors with gaps on alternating sides, as Level 23 (`content/ch3/maze.ts`):

- **Floors** 8 rows apart (rows 36, 28, 20), each a stone row with a **3-wide gap 4–6 cells from a side wall**, alternating sides. Every corridor counts as inside (its gaps are under the 5-cell probe), so the first gap is the break-in.
- **Each corridor:** one empty row under the floor above, a **3-row band** (two rows of driftwood, a bottom row of 1 × 1 sandcastle with an x3 every 8th cell), three empty rows over the floor below: the stone climbing the corridor runs along the band's underside.
- **Top room** past the last gap: x3 shells every other cell on its bottom row, a keg line every 3 cells through it.
- **Teasers** under the bottom floor on the side away from the gap (lane kept open under it), and **3-hit driftwood low near the raft** across the launch spot's shots at the gap (`src/gen/screen.ts` with `LOW_SCREEN_ROWS`: screens right under a low gap block every shot, not only the launch spot's).
- Lab, 20 runs: aim 2.2%, break-in novice 23 s / skilled 4.6 s (MISS: one more screen brick across x 7–9), cascade 56%, drought 2.8 s, clear skilled 28 s (MISS), novice 100% (MISS), 8/11. **Dials:** the room's kegs make it fast (one keg line takes the room in a second): drop them or make the room 3-hit driftwood for 60+ s; x3 every 8th cell on the bands gave 56% cascade, every 4th 100% and an 18 s clear.
- **Variants** (`RECIPE_LAYERS_LEVERS`): flip walls `on: true` over every gap with a lever by the left wall in the water (hard: the novice must find the lever before anything; the generator instead leaves the bottom gap open and puts the lever in the first corridor to open the floors above); or `shutters` on the gaps (trap doors, open ~1.6–2.6 s, shut ~1.2–2.2 s, staggered by a third of the cycle); or a spinner under the bottom gap; or a whirlpool from the open water to the first corridor. Shut-half-the-time shutters roughly halve the aim window (1–2.5% on a 3-wide gap).

## Recipe: open (copy `dev/recipes/open.ts`)

No stone at all; the way in is breakable armour:

- **Armour:** one full-width row of 3-hit driftwood with `armour: true` (row 18). Everything above it is inside.
- **Three empty rows** over it, then the payload's **face**: its bottom row as 1 × 1 bricks, **keg, x3, sandcastle** repeating (kegs every 3 cells chain): the first stone through the breach sets off the whole face, the blasts take the payload's lower rows and part of the armour. A **second face** of x3 every other cell 4 rows up, out of the blasts' reach.
- **Teasers** under the armour at the sides only (a row in the middle of the shot lanes added 15 s to every break-in).
- Lab, 20 runs: aim n/a, break-in novice 58 s / skilled 27 s (MISS by 1.5 s), cascade 77%, drought 12 s (MISS), clear skilled 94 s, novice clears 100% (MISS), hunt 21 s (MISS): 6/10. With an all-sandcastle payload the clear was 46 s; the recipe's 3-hit driftwood top rows make it 94 s. Novices clear it every time: for a paid level add a second armour row or tighten the field. **Dials:** armour hits (2 for an easy level), payload toughness for length, the face pattern for the payoff (an x3-only face gave a 6% cascade: the stones come straight back out of the breach).
- The generator's open days use three shapes (`src/gen/shells.ts`): this band, **two pods** flush with the side walls (the board's edge closes them; no corridor between pod and edge, or it counts as inside), or a ring in the middle (a centre box in looks: use it rarely). Bumpers, crabs, hidden bricks and ice sheets are its twists.

## Rules for level agents

1. **Targets by kind of level** (the lab picks them from the level's number): **chapter 1 has its own, for beginners** (`ch1Targets()`; design doc "Chapter 1 is for beginners": gaps ≥ 8 cells, Level 1 without stone, a declared `inside` zone, a beginner bot in the lab); paid levels novice clears 55–85%. Everything else as the design's table: aim window 2–8%, break-in novice 20–60 s and skilled 8–25 s, cascade ≥ 35% (of at most 120 inside bricks), drought ≤ 10 s, skilled clear 60–120 s, hunt ≤ 15 s, luck CV ≤ 0.5.
   **Boss levels (10, 20, …)** have their own targets (`bossTargets()` in `src/sim/targets.ts`): no cascade and no last-brick hunt; instead **boss hits needed 15–40**, novice clears **45–75%**, skilled clear **60–120 s**, drought **≤ 12 s** (a hit on Brumm counts as activity); aim window, break-in, luck, bricks and balls as normal.
2. **Never lower a target to pass.** A level that can't pass stays a MISS in your report with its numbers.
3. Aim for ≥ 10/11 at 30 runs; a 1-point miss at 20 runs is noise, don't chase it.
4. **No empty board:** bricks fill the board's upper two thirds; no long stretch of empty floor to just watch.
5. **Each level has one signature:** its layout plus at most one new piece, named in the header.
6. **No layout twice in a row** within a chapter (check the level before yours).
7. **The chapter's own pieces appear in most of its levels** (chapter 2: ice or floes in at least 6 of 10, and so on).
8. Names in plain English, letters A–Z only; ids `ch<N>-<NN>-<word>`; numbers run on (chapter 2 starts at 11).
9. No food as bricks: stone, sandcastle, driftwood, ice, crates, kegs.
10. Start from `--propose` or a worked example, measure with the lab only, never with probe tests.

## Daily levels (generator round 4, 2026-11-18: layout × goal × rule)

Round 4 adds, on top of round 3 below: every day has a **goal** (clear most days; rescue, pearls and tide 1–2 times in any 7 days each, never Few Stones) and a **rule** (Monday easy, Saturday hard, Sunday a spectacle, Tuesday–Friday any; none repeated within 7 days, with a look-ahead so Monday, Saturday and Sunday always have one left), **at most 2 centre-box days** (vault, guarded, nested, core) in any 7, the layouts `layers` and `open` from day one, the new pieces from 2026-11-29 (featured to 2026-12-12), a hidden **daily pearl** on every day, and `tomorrow: { rule, goal }` written into every level. A `--redo` keeps the day's goal and rule (yesterday's teaser promised them), and its layout and twist unless the goal no longer allows the layout or `--relayout <dates>` asks for a new one (then never a centre box and never the same layout). A redo plans against the frozen days on both sides of it, so the 7-day rules still hold (`test/gen.test.ts` checks every frozen day). `--report` prints misses by goal, by rule and by target; `--tomorrow` rewrites every frozen day's teaser from the day after it.

Round 4 fixes (2026-11-18, after the first freeze put nine days at 0–40% novice clears):
- **Novice floor in the day score:** every point of novice clears under the weekday's band costs 20 (before, 3 × |novice − centre| lost to a plain count of misses, so a 0% day with few other misses won). A best candidate still 10+ points under the band tries a hole a cell wider before it's kept.
- **Layers days:** gaps a cell wider than the day's hole (at most 4), two floors (three only on a big day with no hard rule and no tide), corridor bands 2 rows of 3 × 1 bricks whatever the density, the top room at most 6 rows (the first freeze had 400-brick boards and 0–10% novices). Levers on a layers day leave the bottom gap open and shut the floors above; the lever sits in the first corridor (with the gap shut and the lever outside, novices cleared 10–30%; with the lever inside, 100%).
- **Rising Tide** only on wall, hourglass, maze, core, open and picture days: on layers, vaults and nested or guarded boxes the field sinks bricks behind a stone floor and even the skilled bot flooded 1.9 times a run; two fuse tide days flooded the decent bot 2–3 times (novices 25–40%). The line goes **10 rows** under the lowest brick (at most row 57) at ~48 s to a flood if nothing were cleared (≈ 4.5–5 s a row; kit "Learned building L15"); a layers board's launch screen stays off row 50 on tide days.
- **Rescue:** the friend sits in a cage of 3-hit driftwood (the bricks touching it, and 1 × 1 driftwood in the empty ring cells): open friends were freed by the skilled bot in 5–26 s against the 30–90 s target. **Pearls:** all but one inside (field pearls alone took 12–25 s).

## Daily levels (generator round 3, 2026-11-18)

`npm run gen -- --from 2026-11-20 --days 60` freezes to `content/daily/YYYY-MM.json`; `npm run gen -- --redo 2026-12-03` replaces one vetoed day; review at http://localhost:5180/contact.html (`npm run dev`); `npm run gen -- --report` measures every frozen day as the lab does (20 runs) and prints the pass table.

- **Targets by weekday** (`dailyTargets()`): novice clears centred on Mon 85%, Tue 78%, Wed 72%, Thu 68%, Fri 64%, Sat 58% (±12 points); Sunday's spectacle is for everyone, 76–100%; aim window Mon 6–12%, Tue 5–8%, Wed 4–7%, Thu 3–6%, Fri 2.5–5%, Sat 1.5–3.5%, Sun 4–8%; skilled clear 60–120 s (Mon 45–100 s, Sun 30–120 s: hundreds of stones clear fast); Mon break-in novice 8–45 s, skilled 3–20 s; Sat break-in novice 25–75 s. Everything else as campaign levels.
- **Shells** (`src/gen/shells.ts`): big packed insides (vaults 22–26 wide, 18–23 tall, from row 5), the fill's column beside the chimney lined with 1 × 1 x3 shells (the first thing a stone inside hits splits it); outside bricks only where returns land (two rows of wings under a box's floor away from its hole; a 1–3 row band under a wall with a lane open under the tunnel). Maze: a sealed chamber under the ceiling past the last turn, x3 shells on its bottom row and a chained keg line. Nested: the inner vault is that chamber. No hole or door covers column 18 (the launch column). Core days: the field above the core is 75% driftwood (hundreds of stones wipe sandcastle in seconds).
- **Picture is out of the daily rhythm** (round 3): a picture of 1 × 1 bricks behind one wall cleared in 30–50 s with novices at 92–100% however tough its bricks; it stays a chapter 2 campaign layout.
- **Launch screen** (`src/gen/screen.ts`): any shot from the launch spot that still finds the hole gets 3-hit driftwood across it in rows 38–44; the cheap checks reject a level that leaves more than 1% of the launch fan free.
- **Choosing** (`src/gen/generate.ts`): up to 200 candidates, 24 that pass the cheap checks, the 6 nearest the aim window played 4 runs per bot, the best 2 played 10 runs per bot; score = misses + 0.3 × distance + 3 × |novice clears − the weekday's centre|. While the best still misses 2+ targets, one more round of fresh candidates. A day that can't be made is reported (`SKIPPED`) and the rest are still frozen. No candidate at a 4-cell hole: a last round with any aim window over 2%.

## Gotchas (learned tuning chapter 1)

- **The novice bot shoots near-vertical** (about ±12°) from wherever the stone lands. Holes novices find are **floor holes**; side windows need bank shots only the decent and skilled bots make. (Chapter 1 has no narrow holes at all since 2026-11-24.)
- **A stone that comes in through a hole and hits a breakable brick goes straight back out.** Leave an empty **chimney** above the hole (hole width + 1 or 2) up to a **band of 3 empty rows under the roof**, with the bricks beside the chimney: the stone climbs, comes off the roof at an angle (the 11.5° rule) and rattles along the tops of the bricks. Level 1 is the pattern.
- **Payoffs with hundreds of bricks need x3 shells where the stone first arrives** (the chimney's side, the row facing the band), not at the far end.
- **Two holes facing each other at one height make a shooting gallery**: the stone flies in one and out the other.
- **A single trapped stone breaks ~4 bricks a second** in a 3-row gap; outside, one per return (~2–3 s). Keep the outside bricks few, or give the level x3 shells or a +3 pickup, or skilled clear times blow past 120 s.
- A vault's inside of 40–70 bricks reaches the 35% cascade; 150+ inside bricks need multiplying stones.
- Teasers right under a hole block the aim window (it's measured at the start; fully blocked reads 0%); put them to the sides, or count on the bots digging (break-in times go up).
- Bricks above or beside a box shell are reached only up a corridor, one per return: a field there turns a minute's play into five. Put outside bricks where returns land: a row or two under the box's floor away from the hole, or a band under a wall with a lane kept open under the tunnel.
- The novice target (≥ 90% on levels 1–3) is about length: every extra minute of play is ~25 more returns, each a 1.5% chance of a lost stone.
- Side windows are harder to hit than floor holes of the same width: give them a row more.
- Small stone pockets (funnel steps, posts) count as **inside**: a stone brushing one fires the break-in with no payoff and the cascade reads 0%. Keep stone in long runs.

## Gotchas (learned rebuilding Levels 3, 5, 6, 9 as open and layers, 2026-11-18)

- **Launch screen: let the generator place it.** Run `screenLaunch(level, [], LOW_SCREEN_ROWS)` (`src/gen/screen.ts`) on the level without screens and copy the planks it adds (row 50, cheap). Hand screens either missed the bank shot off the wall or blocked other spots' shots (aim 0.5–1.4%).
- **Gap width sets the skilled break-in.** A 3-wide floor gap ~20 rows above the raft is a sure shot for the skilled bot (in at 2–4 s). Use 2-wide gaps, or raise the floors (L9's bottom floor at row 34). A driftwood plug under a gap kills the aim window (2.4% → 0.2%).
- **Stepped armour:** one raised plank between two lower ones leaves a 1-row notch the lab counts as inside, so the break-in fires with 0% cascade. Raise planks in pairs (every notch 5+ cells wide) and check the `:` cells on the lab board.
- **3-hit armour drought** is the chew phase: wider planks (4–6 cells) and side teasers fix it. Bumpers right under the planks made it worse (12 → 14.5 s); bumpers go lower, in the lanes where returns fall.
- **Novice clears on open levels are a cliff** set by the 360 s limit: on L6 three driftwood rows in the payload gave 100%, four 87%, six 50%. Change one row at a time and confirm at 30 runs.
- **Rescue and pearls:** the bots dig the shortest way to the goal, often along the empty ceiling rows; anything off that path doesn't change the time. To make a rescue harder, block the approach along the ceiling, not the cage's underside. Multipliers in the corridor bands set the time most (an x3 every 6th cell gave 85 stones and an 11 s finish): put x3 only over the gaps.
- **Replay pins:** `test/replay.test.ts` pins old levels' fingerprints. A rebuilt level is a new level: remove its pins and say so in the header; never touch the thresholds or other pins.
- **Never tint a piece:** a brick with `tint` is drawn as a plain picture brick, so a tinted keg, x3 or pickup is invisible (chapter 1's test checks it).
- **Tips** are one line of at most ~56 characters (longer ones run off a 390 px phone).

## Learned building L33 hidden bricks (2026-11-18)

L33 "Glints in the Dark" (`content/ch4/dark.ts`, open, `dark: true`): 4-wide 3-hit planks on row 24, face (keg, x3, sandcastle) on row 20 with **rows 21–23 empty**, x3 bed on row 16, 3 driftwood rows 10–12, beam + keg fuse on top; under the fence 13 hidden 2 × 1 bricks in the return lanes (one x3 on the launch line at (17, 36), twelve 2-hit driftwood). Lab, 30 runs: 10/10 (break-in novice 32.9 s, skilled 22.9 s, cascade 67%, novice clears 73%, hunt 0.3 s).

- **Hidden x3 shells under armour are a break-in accelerant.** Each one multiplies the stones chewing the planks: 9 hidden x3 → skilled break-in 4 s; 3 → 9–12 s and novice 15 s (MISS); 1 → skilled 23 s, novice 33 s. Make the rest of the hidden bricks 2-hit driftwood: the first hit reveals it, the second breaks it, so the reveal stays on screen.
- **Hidden bricks in the return lanes are never the last bricks** (hunt 0.2–7 s): the stones fall through them all game. Don't hide bricks inside the payload's far corners.
- **Nothing between the face and the armour.** A sandcastle row right under the kegs bounced every stone back out of the breach: cascade 2.5%. Keep the three empty rows.
- **No hidden brick within 2 rows of the armour or 2 cells of a teaser:** the 5 × 5 probe can't fit past it, the pocket counts as inside and the break-in fires with 3% cascade. Check the `:` cells on the lab board.
- **Novice clears cliff again:** driftwood payload rows 2 → 90–95%, 3 → 65–73%, 6 → 30%. One row at a time.
- **Renderer (not fixed, shared code):** the glint is drawn in the bricks layer *under* the lantern overlay (`PlayScene` adds the `Lantern` after `BricksView`), and the `shimmer` texture is ink-dark, so in the dark it is invisible outside a stone's light (l33 screenshots). Needed: bring the hidden glints above the lantern (`layer.bringToTop(glint)` after the lantern is made) and give them a light fill on dark levels (`setTintFill(0xfff1c8)`), ideally a little bigger than 18 px on a phone.
- (Coordinator, after L33): on dark levels and Fog days the hidden bricks' glints and the daily pearl's glint are now drawn **above** the darkness in lantern light (`BricksView.aboveDark`, `VarietyView.aboveDark`), 26 px; the launch hint and tip turn light (`.hint.night`). Judge dark levels by eye again with that.

## Learned building L15 tide and L18 stones (2026-11-18)

L15 "The Sinking Ice Shelf" (`content/ch2/wall.ts`, open + Rising Tide): a V of nine 4-wide 3-hit planks (rows 26–28, the single low plank over column 18), rows 23–25 empty, face (keg, x3, sandcastle) on row 22 sitting on a 4-row ice band, x3 bed on row 17, sandcastle, ice, driftwood, beam + keg fuse on top; two 9 × 2 ice sheets by the walls on rows 31–32; `tide: { every: 4.5, line: 42 }`. Lab, 30 runs: **11/11** (break-in novice 23.7 s, skilled 17.9 s, cascade 78%, drought 8.1 s, clear skilled 70 s, novice clears 76.7%, hunt 0.2 s, luck 0.28, floods decent 0).
L18 "The Three Stone Fuse" (`content/ch2/fuse.ts`, fuse + Few Stones): the old keg fuse behind a 3-wide gap, three x3 shells on row 9 (columns 1, 13, 25), soft + ice under the wall at the sides (rows 18–22), and 3-hit driftwood + one ice band low on the **left only** (x 0–14, rows 30–39); `stones: 3, need: 0.9`. Lab, 30 runs: **9/9** (aim 2.8%, break-in novice 20.2 s, skilled 13.2 s, cascade 40%, drought 7.7 s, novice reaches need 83.3%, share skilled 100%).

**Rising Tide (for L28 open + tide, L46 fuse + tide):**
- **The line's distance sets the skilled break-in, not the pace.** The decent and skilled bots dig the lowest bricks as soon as they are within 7 rows of the line, *before* going in. With the line 6–8 rows under the lowest brick they dug first and broke in at 36–40 s (MISS); with the line **10 rows** under it they go in first (skilled 15–20 s) and dig when the tide brings it closer.
- **Then the pace sets the novice.** Same board: 5 s/row → floods 0.1, novice 90%; 4 s → novice 67–80%, decent floods median 1 (on the edge, decent cleared only 25/30); **4.5 s** → novice 77%, floods 0. `every` may be fractional.
- **Make the lowest bricks ice sheets**: one hit shatters the sheet and buys the rows back. It reads as the lesson (break the lowest first) and costs nothing in drought.
- 4-wide planks, not 6: with 6-wide planks the skilled bot spread its hits over planks (break-in 36–40 s even before the tide mattered).
- The tide makes open levels faster (the field sinks toward the raft, returns get shorter): a payload that took 110 s on a clear level took ~80 s with the tide. One driftwood row more in the payload moved novice clears 87% → 67%.

**Few Stones (for L29 fuse + stones):**
- **The novice bot almost never loses a stone** (~1 per 3 minutes of single-stone play), and multiball makes it immune: with x3 shells every 2nd or 4th cell on the fuse's row, novices reached need 95–100% at any `stones` (3 or 4) and any `need` (0.6–0.9). `stones` and `need` barely move the numbers.
- **What moves "novice reaches need" is length**: a run still going at 360 s counts as a miss even with stones left and the need reached (the lab's clock; there is none in the game). So tune it like a clear level's novice cliff: novice median ~250–270 s gave 83–90%, ~150–200 s gave 100%.
- **Lengthen with single-stone work low on one side**: 3-hit driftwood 10 rows tall, 15 wide, low on the side away from the gap. On both sides it blocked the bank shots into the gap (aim 3.5% → 1.6%, skilled break-in 6 s).
- **Few Stones has no crumble**: the level ends only when everything is broken or the stones run out, so the drought includes the last-brick hunt. Without any x3 behind the wall the decent drought was 11–17 s; three x3 shells just above the kegs' blast reach (row 9 for a fuse on row 13) fixed it (7.7 s) without making it short. Every 4th/8th cell made it too short again (novice 100%).
- A 2-wide gap was too hard (aim 1.7%, novice break-in 61 s); keep the 3-wide gap and get the length from the outside.
- HUD: the stone count shows stones left **to launch** (x3 → x2 as soon as the first is thrown), and the bar's flag marks `need`.

## Learned building L28 (open + tide), L29 (fuse + stones), L46 (fuse + tide), 2026-11-18

- **Few Stones drought:** soft rows plus an ice row under the floor at the sides cut the drought from 12–25 s to ~6 s. Three 1×1 x3 in the low work help but push novice-reaches-need to 95%, so that work then needs 6 rows of 3-hit, not 4.
- **Fuse with a 4-wide channel:** aim window and skilled break-in pull against each other. A plank across the launch lane low in the open fixes the break-in but cuts aim from 2.8% to ~1%; narrow planks (3–7 wide) cost less aim but leave skilled at 4–6 s. Try `screenLaunch` before hand screens.
- **Tide confirmed on L28 and L46:** ice sheets as the lowest bricks, the line 10 rows under them, `every: 4.5` gave floods 0.1–0.5 and novice clears 67–80%. A 3-hit plank as the lowest brick gave novice clears 15%.
- **`screenLaunch` on a fuse/tide board** (L46): use `TIDE_SCREEN_ROWS` on tide levels (`LOW_SCREEN_ROWS` puts the plank by the tide line). Its 3-wide plank got aim (2.1%) and skilled break-in (19.5 s) right first try but left novice break-in at 14 s; widening to 5 gave 18.4 s at the same aim, 6-wide dropped aim to 1.6%. Accepted at 11/12 (novice break-in 18.4 s).

## Learned building L21 levers and L25 crabs (2026-11-18)

L21 "The Lever Locks" (`content/ch3/key.ts`, layers + lever): floors at rows 36 / 28 / 20, gaps left 2-wide (x 5) / right 3 (x 28) / left 3 (x 5); the bottom two gaps are flip walls `on: true`, link `lock`; the top gap is always open. Levers (all link `lock`): a 4 × 1 under the bottom floor at x 16–19, row 37 (over the launch spot), a 3 × 1 on each corridor's floor away from its gaps (x 32 row 35, x 1 row 27). Bands as the recipe with x3 only over the gaps (columns 6, 29); top room 3-hit + 2-hit driftwood with x3 every 4th cell on row 16; teasers on the right (x 23–35, rows 40/43/46). Lab, 30 runs: **11/11** (aim 3.0%, break-in novice 56 s, skilled 13 s, cascade 48%, drought 9.5 s, clear skilled 65 s, novice clears 77%, luck 0.25).
L25 "The Crab Quay" (`content/ch3/seawall.ts`, wall + crabs): the old quay (tunnel x 28–31, row 14); crabs `{ y: 15, x0: 24, x1: 33, speed: 2 }` across the tunnel's mouth and `{ y: 44, x0: 16, x1: 33, speed: 3, phase: 0.5 }` in the lane under it; chimney lined with 1 × 1 sandcastle, x3 on rows 7/10/13; all-driftwood behind; no right-edge columns and no +3 pickup in front. Lab, 30 runs: **10/11** (MISS hunt 15.0 s; aim 2.5%, break-in novice 58 s, skilled 22 s, cascade 66%, novice clears 73%, luck 0.49).

**Levers (for L42 levers + shutters):**
- **A lever is a still wall for the inside map.** One within 4 cells of a side wall (the recipe's x 1, row 41) makes a pocket between it and the wall that counts as inside: the break-in fires there with no payoff (cascade 8%). Keep a lever 5+ cells from every wall, or flush under a floor; check the `:` cells.
- **Put the outside lever where the first straight launch hits it** (under the bottom floor over column 18): the first shot pulls it, the player sees the lever lean and the walls turn to a dashed outline. That is the lesson, before anything else happens. By a side wall the novice break-in was 63–65 s; next to the gap, shots at the gap clipped it and shut the walls again (skilled 60 s+).
- **Every hit toggles, so give each corridor its own lever** (same link) on its floor, away from the gaps: an outside hit can shut a stone in, and with its band gone it would circle forever. Don't make the top gap a flip unless the top room has a lever too.
- **Don't combine a lever with a key + gate on the same level.** While any gate is shut the bots' aimer counts every lever shot as a way in (`traceInside(…, keys)` in `src/sim/trace.ts`), so they keep re-pulling the lever, toggling the walls shut (skilled break-in 78–180 s). L21 dropped its key for this. If L42 needs both, the aimer needs a fix first (count levers only while a flip is shut).
- **Bot fix (shared code, one line, `src/sim/bot.ts`):** the bots' way-in call didn't pass the live flip state, so they always saw the flips as at the start (shut) and only aimed at levers. Now `aim.angles(x, { gatesOpen, time, flips: s.flips.map((f) => f.solid) })`. Lever levels measured before 2026-11-18 evening are off.
- Gap width still sets the skilled break-in: with the lever pulled by the first launch, a 3-wide bottom gap gave skilled 7.6 s; 2-wide gave 13–16 s.
- A 4 × 1 lever is small on a phone (the stick leans left/right but it's ~40 px across). 4 × 2 levers read better but they're hit more often, so more stray toggles (novice break-in 56 → 65 s).

**Crabs (for L47 crabs on the rampart):**
- **A crab across a tunnel's mouth is a guard**: under a 4-wide mouth a 3-wide crab closes it while it's over it. At 2 cells/s over a 9-cell walk: aim 3.6% → 2.5%, skilled break-in 6 → 16–22 s. Faster (4 cells/s) is gentler (novice break-in 58 → 29 s).
- **A crab low by the raft (row 48) is an extra raft**: it knocks returns back up, everything gets faster (skilled clear 70 → 47 s, novice clears 100%). Keep crabs at row 44 or higher; one in the lane under the way in blocks shots (aim down) and its speed matters: 3 cells/s fine, 5 made aim 2.0% and drought 12 s.
- **A crab level's tail is the re-entry**: once the front field is gone, every return is a try at a crab-guarded hole, and some runs stall for minutes (decent 27/30 clears, luck 0.5–0.6). Keep a few outside bricks for the end, or keep the guard crab off the mouth part of its walk.
- **Novice clears follow the multipliers, not the bricks:** in L25 x3 shells 8 → 6 → 4 in the chimney gave novice clears 95% → 73% → 60% (fewer stones alive, so a misjudged return costs a heart); tougher bricks and an extra teaser row barely moved it.
- **Bricks lying on top of a wall are the last-brick hunt** (reached only from above): L25 rows 12–13 behind the quay left 10 bricks for 20 s. An empty 2-row walkway on the wall's top fixed the hunt (7 s) but made the level short; soft bricks there were the compromise (15 s).

## Learned building L26 (shutters), L34 (spinners), L35 (whirlpools), 2026-11-18

- **Whirlpool catch radius is 12 px** (`WHIRL_RADIUS`): an end is a 24 px target, the hardest thing on a board for the bots, and screen planks swing the result wildly (one plank: aim 4%, skilled in at 0.8 s; two: aim 0.5%, skilled 116 s). Don't hang a level's only way in on one whirlpool. Pearls in a 1-row slot above a band made skilled runs fail; keep pearls in open rows.
- **Spinner placement sets the aim window:** a bar under a 4-wide gap halves it; pivot 4 rows under the floor gave aim 2.1%, 3 rows 1.8%, 2 rows 1.1%. Gaps of 5+ cells aren't "inside" at all (aim n/a).
- **Shutters (L26, 11/11):** 3-wide shutter gaps on decks at rows 38/30/22, open 1.7–2.2 s, shut 1.4–2.0 s on their own cycles, bands of 3-hit over 2-hit driftwood over 1×1 sandcastle with x3 every 8th cell.
- The lab now runs the game's validator (`checkLevel`: rows 3–50, overlaps, pieces) and prints INVALID.

## Learned building L42 (levers + shutters) and L47 (rampart crabs), 2026-11-18

- **Shutter phase sets the first shot:** a shutter that starts open lets the first straight launch through (skilled in at 4 s, luck 0.53). Start it shut with `phase` just past its open time (skilled 9.3 s); better than narrowing the gap (2-wide: aim 1.9%).
- **Shutter + flip on one layered board works** (L42, 11/11): a lever on the floor of each corridor the flip can close, shutters as the only free gaps; x3 in the bands 2 → 3 lifted the cascade 34% → 43%.
- **Crabs on a wall tunnel:** the chimney lining's x3 count sets novice clears (2 shells 77%, 4 → 93%, 6 → 95–100%). A mouth crab at 1.2 cells/s gave skilled break-in 4–6 s, 1.8 gave 8.8 s. Bricks lying on top of the wall make the last-brick hunt 17 s+. A wide screen plank low in the water costs more aim than it earns.

## Learned retuning L5, L9 and building L11, L14 (2026-11-18)

- **Floors move one row at a time.** Raising a floor (lower row number) by 2–3 rows can swing the inside map wildly: L9's floor at row 32 gave cascade 1.7% and novice clears 5%, at 33 it was fine; L5 at 35 gave 12.5%, at 36 fine. Read the `:` cells after every move.
- **A 2-wide vault door** lowers the aim window to ~1% (L14); prefer 3-wide plus a launch screen or a harder pen.
- **Rescue novice clears are set by lost hearts**, not by the cage: L9 stayed at 86.7% through cage, roof and loft changes. A tough roof plank across the top (row 3) blocks the ceiling approach and fixed L9's skilled break-in.

## Learned building L43 and L49 (2026-11-18)

L43 "Brumm's Anchor" (`content/ch5/anchor.ts`, picture + rescue): the anchor in 1 × 1 bricks from row 3 (ring of sandcastle round a 2-hit cage with the pup at (17, 6), short 2-hit stock x 6–29 with two x3 on its underside, shank, flukes), a **fuse under the flukes** on row 29 (kegs every 3 cells, two x3), rows 30–32 empty, the quay raised to **row 33** with a **2-wide gap at x 5–6** by the left wall, teasers on the right only, two `screenLaunch` planks on row 50. Lab, 30 runs: **10/10** (aim 2.3%, break-in novice 29.5 s, skilled 11.4 s, cascade 77%, drought 6.7 s, rescue skilled 78 s, novice clears 83%).
L49 "The Gauntlet" (`content/ch5/keep.ts`, open, "everything"): two rows of 4-wide 3-hit armour (rows 23–24) with two 4-wide flip gates (`on: true`) in the outer row and the inner row's cells over them left empty; lever 4 × 1 at (26, 42); crab on row 27 (x 4–29, 2.5 cells/s); ice sheets 9 × 2 flush with the walls (row 31); seven hidden 2 × 1 (one x3 on the launch line); bumpers r 16 at row 46; payload face row 19, 15 x3 on row 15, ice band, 2- and 3-hit driftwood, keg fuse under the roof. Lab, 30 runs: **10/10** (break-in novice 25 s, skilled 12 s, cascade 100%, drought 7.8 s, clear skilled 99 s, novice clears 70%, luck 0.45).

- **A picture's cascade comes from a keg fuse on the side facing the band**, not from x3 shells: kegs every 3 cells along the flukes' underside took cascade 9% → 77% with peak balls 3–7. x3 shells in a picture are the novice dial instead: 0 → 4 on the stock moved novice clears 15% → 100% and rescue skilled 166 s → 81 s; 2 was the middle (80–85%).
- **Rescue in a big empty picture is slow, not fast**, once the break-in is slow: one stone wanders. What brought rescue skilled from 110 s to 78 s was opening the route to the ring (a shorter stock, the ring in 1-hit sandcastle, the cage 2-hit), not more multiballs.
- **Gap by the side wall, teasers away from it** (L21's x 5): the same 2-wide gap at x 12 gave skilled 4.5 s at aim 1.9–2.3%; at x 5 with the left teasers gone, aim 2.8% and skilled 9 s; `screenLaunch` then added a second plank (12 s). Raising the quay 3 rows (36 → 33) also helped.
- **Flip gates in open armour are a fine shortcut**: shut gates count as wall for the inside map (no notch), so a 4-wide gate keeps the enclosure; the bots pull the lever and go through (skilled 12 s) while the novice chews two armour rows (25 s). A second armour row must sit *inside* (over) the first, its cells over the gates left empty: under the gate it would leave a 1-row notch.
- **Open-level x3 bed is a cliff**: 18 shells → novice 90–100% / skilled 66–74 s; 15 → novice 70% / 99 s (with 3-hit rows 5–9); 12 → novice 40–45% / 150–180 s. One more 3-hit row on top of 15 shells only slowed the skilled bot (132 s, MISS) and left novices at 70%.

## Learned finishing L34 (spinners) and L35 (whirlpools), 2026-11-18

- **Novice clears follow the x3 count, not the +3 pickup.** L34: removing the pickup alone changed nothing (95%); room x3 every 6th cell 95%, every 9th 80%, every 12th 45%. L35: room x3 0 / 1 / 3 gave 60% / 73% / 95%.
- **A whirlpool mouth in the open water is found by wandering stones, not aimed shots** (bounces leave ≥ 11.5° off vertical, so stones rattle in the strip between the floor and the teasers): novices got in after 4–8 s whatever the aim window read. Caps over the mouth helped a little; mouths by the walls made it worse.
- **A gap against a side wall slowed the skilled bot by 4–5 s at the same aim window** (L34, 11/11). Spinner phase only matters modulo half a period.
- Lab time: whirlpool levels take 4–7 min at 20–30 runs (others ~20 s). Keep scratch scripts in your own subfolder of the scratchpad.

## Learned finishing L11 (open + ice) and L14 (vault + rescue), 2026-11-18

- **Kill a last-brick hunt with a keg fuse at the very top:** under the roof a beam, a keg fuse, a thin ice sheet; the stone that reaches the top sets it all off (L11 hunt 19.3 → 8.7 s). Lone kegs buried in 3-hit planks become the last bricks themselves.
- **Open levels: novice clears move with 3-hit rows, not x3 count** (cutting x3 slows the skilled bot as much as the novice). Keep the x3 bed, add 3-hit rows: 4 rows 95%, 5 rows 73% on L11. (On layers, crab and wall levels the x3 count is the dial; see above.)
- **Fills that leave a 2-wide strip:** a 17-wide fill in 3-wide bricks leaves 2 empty cells by the wall; on L14 that strip ran down to the friend and drove the rescue's luck. Read the `:` cells first.

## Learned finishing L35, L38, L47 (2026-11-18)

- **Kegs give cascade without making novices win more.** A 1×1 keg line under the ceiling gave L47 a 70% cascade with only 2 x3; once the cascade comes from kegs, the x3 count is free to set novice clears.
- **Find the hunt before fixing it:** run a few decent-bot runs in a scratch script and list the bricks alive at the 5% mark; put x3 or kegs at those spots (15–19 s → 12–13 s). Emptying the corners instead made it worse.
- **Armour pockets work only on open levels.** On a layers level the bots don't chew armour (aim reads 0%, runs stall). L35 (whirlpools + pearls) stays at 6/10: novices find open-water whirlpool mouths by wandering in ~10 s. A whirlpool-gated layers level needs a different way in (a bot that aims at whirlpools, or a gap as the way in and whirlpools only as shortcuts).
- 20-run novice clears move by ±10 points: settle them at 30 runs.

## Tide pace raised to 7 s a row (2026-11-18)

The owner found the 4.5–5 s tide too busy ("too complex"). Every Rising Tide level now sinks a row every **7 s or slower**:
- the generator uses `TIDE_FIRST_FLOOD` 70 s and a floor `TIDE_EVERY` [7, 12];
- the frozen dailies are at least 7 s, and none got faster;
- L15, L28 and L46 have `every: 7`.

The paces quoted above (4.5 s, ~48 s to a flood) are history. At 7 s the lab, 20 runs, gives:

| Level | Passes | Novice clears | Decent floods |
|---|---|---|---|
| L15 | 10/11 | 100% | 0 |
| L28 | 10/11 | 90% | 0 |
| L46 | 10/12 | 95% | 0.1 (novice break-in 14 s) |

Novice clears now sit above the 55–85% band. That is accepted as the owner's call: harden a tide level with its board, not with a faster tide.
