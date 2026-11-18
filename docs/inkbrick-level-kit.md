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

One call prints the ASCII board (`#` stone, `o` soft, `T` tough, `3` x3, `K` keg, `+` pickup, `*` ice, `k` key, `G` gate, `=` shutter, `@` spinner, `O` whirlpool, `B` Brumm, `_` shield, `:` empty inside), the bots' table, every target with PASS/MISS, and a last `SUMMARY` line. 20 runs per bot take 3–12 s. With 20 runs the rates move by about ±10% between nearby designs: don't chase a 1-point miss.

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
npm run gen -- --propose --chapter 2 --number 14 --layout hourglass [--twist ice] --out content/ch2/neck.ts
```

It composes ~80 candidates from the daily generator's parts with **only the pieces allowed up to that chapter** (ch1: vault, wall, core, fuse, no twist; ch2 adds hourglass, picture, ice, floe; ch3 adds guarded, maze, keyGate, shutter; ch4 adds whirlpool, spinner, dark; ch5 adds nested), keeps those that pass the cheap checks (valid, budget, every brick reachable, aim window ≥ 2%), lets the bots play the 6 nearest the aim target, and writes the best one as a ready level file: header with the command and its lab lines (20 runs), `export const LEVEL_14`, bricks one board row per line. The level's place in its chapter sets the dial: levels x1–x3 get 4-wide holes and short boards, x4–x7 3-wide, x8–x9 2-wide. Boss levels (x0) are refused: start from `src/level/ch1/boss.ts`. A guarded gate needs `--twist shutter` or `spinner`. It takes 1–3 minutes. Then hand-tune: rename the export, write the header (what it teaches, its pieces), the tip, a fun name, and run the lab.

## Worked examples (copy these)

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

## Rules for level agents

1. **Targets by kind of level** (the lab picks them from the level's number): levels 1–3 novice clears ≥ 90%; chapter 1 levels 4–9 (the free chapter, every new player's first look) novice clears 70–95% (`CH1_NOVICE_CLEAR`); paid levels novice clears 55–85%. Everything else as the design's table: aim window 2–8%, break-in novice 20–60 s and skilled 8–25 s, cascade ≥ 35% (of at most 120 inside bricks), drought ≤ 10 s, skilled clear 60–120 s, hunt ≤ 15 s, luck CV ≤ 0.5.
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

## Daily levels (generator round 3, 2026-11-18)

`npm run gen -- --from 2026-11-20 --days 60` freezes to `content/daily/YYYY-MM.json`; `npm run gen -- --redo 2026-12-03` replaces one vetoed day; review at http://localhost:5180/contact.html (`npm run dev`); `npm run gen -- --report` measures every frozen day as the lab does (20 runs) and prints the pass table.

- **Targets by weekday** (`dailyTargets()`): novice clears centred on Mon 85%, Tue 78%, Wed 72%, Thu 68%, Fri 64%, Sat 58% (±12 points); Sunday's spectacle is for everyone, 76–100%; aim window Mon 6–12%, Tue 5–8%, Wed 4–7%, Thu 3–6%, Fri 2.5–5%, Sat 1.5–3.5%, Sun 4–8%; skilled clear 60–120 s (Mon 45–100 s, Sun 30–120 s: hundreds of stones clear fast); Mon break-in novice 8–45 s, skilled 3–20 s; Sat break-in novice 25–75 s. Everything else as campaign levels.
- **Shells** (`src/gen/shells.ts`): big packed insides (vaults 22–26 wide, 18–23 tall, from row 5), the fill's column beside the chimney lined with 1 × 1 x3 shells (the first thing a stone inside hits splits it); outside bricks only where returns land (two rows of wings under a box's floor away from its hole; a 1–3 row band under a wall with a lane open under the tunnel). Maze: a sealed chamber under the ceiling past the last turn, x3 shells on its bottom row and a chained keg line. Nested: the inner vault is that chamber. No hole or door covers column 18 (the launch column). Core days: the field above the core is 75% driftwood (hundreds of stones wipe sandcastle in seconds).
- **Picture is out of the daily rhythm** (round 3): a picture of 1 × 1 bricks behind one wall cleared in 30–50 s with novices at 92–100% however tough its bricks; it stays a chapter 2 campaign layout.
- **Launch screen** (`src/gen/screen.ts`): any shot from the launch spot that still finds the hole gets 3-hit driftwood across it in rows 38–44; the cheap checks reject a level that leaves more than 1% of the launch fan free.
- **Choosing** (`src/gen/generate.ts`): up to 200 candidates, 24 that pass the cheap checks, the 6 nearest the aim window played 4 runs per bot, the best 2 played 10 runs per bot; score = misses + 0.3 × distance + 3 × |novice clears − the weekday's centre|. While the best still misses 2+ targets, one more round of fresh candidates. A day that can't be made is reported (`SKIPPED`) and the rest are still frozen. No candidate at a 4-cell hole: a last round with any aim window over 2%.

## Gotchas (learned tuning chapter 1)

- **The novice bot shoots near-vertical** (about ±12°) from wherever the stone lands. Holes novices find are **floor holes**; side windows need bank shots only the decent and skilled bots make. Levels 1–3 and most of chapter 1 should use floor holes.
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
