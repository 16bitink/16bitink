# InkBrick: design

Game #9, released Sunday, November 22, 2026. A brick breaker built around the moment from the viral "Brick Breaker Brainrot" clips: getting the ball in is hard, and once it's in, it breaks everything. 50 levels (levels 1–10 free, 11–50 paid, $4.99 one-time) and a **daily level for everyone**, the first game on the site-wide daily calendar.

Decided with the owner on 2026-11-17: sea otter hero, the name InkBrick, one site-wide calendar with per-game views, total days played (never a consecutive streak), 10 free + 40 paid + a free daily. **The goal of this build is a retention machine:** every day the player has something new to come back to (see "Retention").

Branch `feat/inkbrick`, package `games/inkbrick`, dev server port 5180.

## Research (2026-11-17)

- The trend is "Brick Breaker Brainrot" ([Know Your Meme](https://knowyourmeme.com/memes/brick-breaker-brainrot)): Shorts of Brick Mania-style play with reaction clips, started October 2022, viral January 2024 with cat reactions.
- [Brick Mania](https://apps.apple.com/us/app/brick-mania/id1574554961) has Easy / Dense / Hard / Super Hard sets, x3 (each ball becomes three) and +3 power-ups, bombs and fireballs.
- The tactic behind "hard to start, then it breaks everything": dig one tunnel so the ball gets **behind the wall**, where it bounces between the ceiling and the backs of the bricks without coming back to the paddle ([Vozu](https://vozu.io/en-us/learn/brick-breaker-tips), [Gamelake](https://gamelake.com/guides/brick-breaker-tips/): one return broke 21 bricks).
- Not checked frame by frame against specific Shorts; the layouts below come from the games in the clips and that tactic.

## The hero and the world

- **Skip, a sea otter.** Floats on its back on a driftwood raft; the raft is the paddle, the ball is a skipping stone. Sea otters really use stones as tools. Round head, whiskers, a blue neckerchief. Cheerful, cheeky, never scared.
- **Brumm, a grumpy walrus**, has walled off the coves with sea walls, crates and ice so he can keep the best sunbathing rocks to himself. Each chapter ends with a Brumm fight (level 10, 20, …): he slides a stone shield across his fort's gap, and you must hit him through the gap.
- Food rule: no shellfish or fish as bricks. Bricks are stone, sandcastle, driftwood, ice, crates and powder kegs.
- Art: painterly pen and ink with watercolour washes (like the duo characters, `docs/duo-characters.md`), generated, never code-drawn. No pixel art.

## Play

- **Board:** portrait, 540 × 960 logical px (rendered ×2), the Shorts' 9:16. On a landscape screen the board sits in the middle with the cove painted around it, and the HUD beside the board.
- **Grid:** 15 px cells, 36 columns × 64 rows. A brick is a rectangle of cells (normal 3 × 1 = 45 × 15 px, dense 1 × 1). Bricks live in rows 3–50; the paddle's top edge is at y = 900.
- **Paddle (Skip's raft):** 90 px wide (wide pickup: 140). Follows the pointer or finger in x directly; arrows / A-D move it at 900 px/s. Where the ball hits sets its angle: from 60° left to 60° right of straight up, linear in the hit offset. The ball's speed stays constant (480 px/s, +5% per 20 s up to 640, reset on a lost ball).
- **Launch:** the stone sits on the raft until the player clicks, taps or presses Space; it leaves at the angle the hit offset would give, so the player aims by placing the raft.
- **Lives:** 3 hearts per level, as in our other games. A heart goes when the last ball falls off the bottom. Losing all three restarts the level.
- **Clear:** every breakable brick is gone. Stone and gate bricks don't count. **Crumble rule:** when fewer than 5% of the breakable bricks remain and nothing has broken for 8 s, the rest crack and crumble, so no player ever hunts one last brick for a minute.
- **Three shells per level:** clear it; clear it without losing a heart; clear it under its par time.
- **Ball cap:** 300 balls at once; past that, multipliers make no new balls.

## Bricks and pieces

| Piece | Behaviour | From |
|---|---|---|
| Soft (sandcastle) | 1 hit | ch1 |
| Tough (driftwood) | 2–3 hits, shows cracks | ch1 |
| Stone | Never breaks; walls, vaults, tunnels | ch1 |
| x3 shell | Breaking it splits every ball that touches it into 3 (the payoff core) | ch1 |
| Powder keg | Blasts a 3-cell radius when broken; kegs chain | ch1 |
| Pickup brick | Drops a pickup: Wide raft, +3 stones, Fireball (8 s, passes through soft and tough) | ch1 |
| Ice | Breaking one cracks every touching ice brick, which shatter 0.15 s later, in a spreading wave | ch2 |
| Sliding floe | A group of bricks moving back and forth on a track | ch2 |
| Key + gate | Breaking the key brick opens its linked stone gate | ch3 |
| Shutter | A stone door that opens and closes on a timer | ch3 |
| Whirlpool pair | Enter one, leave the other, same speed and direction | ch4 |
| Spinner | A stone bar rotating around a pivot, guarding a hole | ch4 |
| Dark | Only the area around each ball is lit (lantern) | ch4 |
| Brumm | The boss on level 10 of each chapter: a moving shield over his gap; N hits on him win | ch1–5 |

## Layouts (the shapes that make the moment)

| Layout | The hard start | The payoff |
|---|---|---|
| Vault | A stone shell with one hole | Inside a closed room the ball breaks everything |
| Over the wall | A full-width wall with one tunnel | The ball runs between the ceiling and the backs of the bricks |
| Hourglass | A narrow neck | The top half empties |
| Guarded gate | A spinner or shutter over the hole | as Vault |
| Maze | Stone corridors | The ball winds through and clears every pocket |
| Multiplier core | x3 shells buried in the middle | 3 → 9 → 27 balls pour out |
| Fuse | A keg at the end of a long wall | A chain of blasts |
| Picture | Thousands of 1 × 1 bricks as an animal or object | The picture wears away |
| Nested vaults | A vault inside a vault | Two break-ins |

**The main dial is hole width.** A small hole is harder to get into *and* keeps the ball inside longer, so the payoff grows with the struggle.

## Chapters (50 levels, numbers run on)

| Ch | Levels | Place | New | Boss level |
|---|---|---|---|---|
| 1 (free) | 1–10 | Kelp Cove | soft, tough, stone, x3, kegs, pickups; Vault, Over the wall, Multiplier core, Fuse | 10: Brumm's sea wall |
| 2 | 11–20 | Ice Floe | ice waves, sliding floes; Hourglass, Picture | 20: the iceberg fort |
| 3 | 21–30 | The Harbour | key + gate, shutters; Guarded gate, Maze | 30: the lighthouse |
| 4 | 31–40 | Sea Cave | whirlpools, spinners, dark | 40: the flooded grotto |
| 5 | 41–50 | Brumm's Fort | everything, Nested vaults | 50: Brumm himself |

Each level has one signature (its layout plus at most one new piece), and the same layout never appears twice in a row. Level lengths 60–120 s for a decent player.

## Engine contract (src/sim, headless, no Phaser)

Everything that decides play is in `src/sim` and runs in Node, so bots, the lab, the generator and the tests share one physics with the game.

- **Fixed step 1/120 s,** with sub-steps so a ball never passes through a 15 px brick at 640 px/s. Deterministic: no `Math.random`, no wall-clock time, no `Math.sin`/`cos` inside the step (spinners use a precomputed table). The same level and the same inputs give the same result on every device.
- Seeded RNG: `mulberry32` in `src/sim/rng.ts`.

```ts
// src/sim/types.ts — the shared contract (render, bots, generator and tests all use it)
export type BrickKind = 'soft' | 'tough' | 'stone' | 'x3' | 'keg' | 'pickup' | 'ice' | 'key' | 'gate';
export type PickupKind = 'wide' | 'plus3' | 'fireball';
export interface BrickDef { x: number; y: number; w: number; h: number; kind: BrickKind; hp?: number; link?: string; drop?: PickupKind; tint?: number; floe?: string }
export interface LevelDef {
  id: string; name: string; number: number; chapter: number; // number = 1..50, or 0 for a daily
  bricks: BrickDef[];
  floes?: { id: string; dx: number; dy: number; period: number }[];          // sliding groups (cells, seconds)
  shutters?: { x: number; y: number; w: number; h: number; open: number; closed: number; phase: number }[];
  spinners?: { x: number; y: number; length: number; period: number; phase: number }[];
  whirlpools?: { a: { x: number; y: number }; b: { x: number; y: number } }[];
  boss?: { hits: number; shieldW: number; speed: number };
  dark?: boolean;
  par: number;   // seconds, for the third shell
  tip?: string;  // one line shown before the level
  layout?: string; // which layout it is, for variety checks
}
export interface SimInput { paddleX: number; launch: boolean }
export type SimEvent =
  | { type: 'hit'; brick: number; x: number; y: number } | { type: 'break'; brick: number; kind: BrickKind; x: number; y: number }
  | { type: 'bounce'; on: 'wall' | 'paddle' | 'stone'; x: number; y: number } | { type: 'blast'; x: number; y: number }
  | { type: 'split'; balls: number } | { type: 'pickup'; kind: PickupKind } | { type: 'breakIn' }
  | { type: 'ballLost' } | { type: 'lifeLost'; lives: number } | { type: 'crumble' } | { type: 'cleared' } | { type: 'failed' };
// class Sim { constructor(level: LevelDef); step(input: SimInput): void; readonly state: SimState; drainEvents(): SimEvent[] }
```

`breakIn` fires the first time a ball reaches a cell enclosed by stone (a vault inside) or above the topmost wall row (behind the wall). The renderer celebrates it (slow-mo 0.3 s, a shout, a shake): it is the moment the whole game is built around.

## Bots, lab and measurements

- **Bots** (`src/sim/bot.ts`): novice (follows the ball, hits at a random offset), decent (aims for the aim window with noise), skilled (aims exactly). Each is seeded.
- **Measures per level** (`src/sim/measure.ts`), 20 runs per bot:

| Measure | Target |
|---|---|
| Aim window: share of 3,600 launch directions reaching the hole within 3 wall bounces | 2–8% |
| Time to break in | novice 20–60 s, skilled 8–25 s |
| Cascade: share of bricks broken within 8 s after the break-in | ≥ 35% |
| Longest drought (no break and no near miss within one ball width of the hole) | ≤ 10 s |
| Clear time, skilled | 60–120 s |
| Novice clears it with 3 hearts | 55–85% (chapter 1 levels 1–3: ≥ 90%; boss levels: 45–75%) |
| Last-brick hunt (time from 95% broken to clear) | ≤ 15 s |
| Luck: spread of the decent bot's clear times | coefficient of variation ≤ 0.5 |
| Budget | ≤ 1,500 bricks; ≤ 300 balls |

**Per goal** (2026-11-18, `goalTargets()` in `src/sim/targets.ts`; everything not named is as above):

| Goal | Clear time becomes | Dropped | Added |
|---|---|---|---|
| `rescue` | time to the rescue, skilled 30–90 s | last-brick hunt | |
| `pearls` | time to the last pearl, skilled 40–100 s | last-brick hunt | |
| `stones` | (no clock) | clear time, hunt, luck | novice clears = novice reaches `need`; skilled median share broken ≥ (need + 1) / 2 |
| `tide` | as clear | | floods (decent bot, median) ≤ 1 |

On `open` levels (armour, no stone) the aim window is n/a; break-in and cascade count from the armour's inside.

- **Lab** (`npm run lab -- <level|date>`): an ASCII board, the aim window, and the bots' numbers against the targets in one call. Content agents measure with it, never with probe tests.

## The daily level

**Same level for everyone on the same date.** It is keyed by the player's **local** calendar date (YYYY-MM-DD): "November 22" is the same level worldwide and opens at each player's own midnight.

**Generator** (`src/gen`, CLI `npm run gen -- --from 2026-11-22 --days 60`):
1. `seed = hash('inkbrick:' + date)`. Every random choice comes from it.
2. **Plan the day** from the calendar: the weekly rhythm (below), this month's featured piece, and the last 14 days (no layout more than twice a week, no twist repeated within 7 days).
3. **Compose ~200 candidates** from parts: a shell (layout), a fill (dense bricks, a picture from `src/gen/pictures`, an x3 core, a keg fuse), teasers (soft bricks outside the shell so there's always something to break), and at most one twist. Mirror-symmetric except the hole.
4. **Cheap checks** reject most: aim window, ball-sized flood fill reaching every breakable brick, budget.
5. **Bots** play the survivors; each gets a distance-from-targets score. Novelty: a feature vector (layout, twist, picture, density, holes, symmetry) must be far enough from the last 14 days.
6. **Best candidate wins** and is **frozen** to `content/daily/YYYY-MM.json`, about 60 days ahead. A generator change later never alters a past day.
7. **Weekly review:** `dev/contact.html` shows every frozen day's board, numbers and layout so the owner can veto one (`npm run gen -- --redo 2026-12-03`).
8. **Learn:** the daily's play data (break-in time, clear, quit point) tunes the targets each week.

**Weekly rhythm** (the local weekday of the date):

| Day | The daily |
|---|---|
| Monday | Warm-up: a big hole, short |
| Tuesday–Friday | Mixed layouts, harder through the week |
| Saturday | The hard one: smallest aim window of the week |
| **Sunday** | **Spectacle:** a multiplier core, hundreds of balls (the same day as the new-game email) |

Dailies use every piece from chapters 1–3 from day one, and chapter 4–5 pieces from week 3 (each "featured" for a month when it first appears).

## Retention (the reason to come back every day)

The owner's rule: something to look forward to, never fear of losing something. Counters only go up.

**Built for Sunday:**
1. **The daily level**, free for everyone, no account needed.
2. **Site-wide calendar** at `/daily`: each day you played gets a mark with each game's icon. It shows **"N days played"** (total, never consecutive). Owners can play missed days; those days get an outlined mark, so a gap is something to fill, not a loss. Inside InkBrick, the same calendar filtered to InkBrick, to pick archive days.
3. **Tomorrow teaser** on the daily's end card: tomorrow's layout as a silhouette and name ("Tomorrow: the Spinning Gate") and a countdown to the player's midnight.
4. **Bragging:** "You broke in faster than 72% of today's players", and a **challenge link** that opens today's daily with your time to beat (as `docs/growth-plan.md` planned for InkSnake).
5. **Day milestones** (3, 7, 14, 30, 50, 100 days played, any game's dailies count): each gives Skip a new raft or stone trail in InkBrick, and a stamp on the calendar.
6. **"Today's daily" card** on the home page for every visitor.
7. **Chapter progress:** the regular 50 levels with shells, as in the other games.

**Next (after Sunday):**
- A **monthly album:** a painted picture that gains a tile for each day played (any game); owners can fill missed days. A finished month becomes a permanent stamp.
- Opt-in daily reminder (web push from the installed PWA, or email), one tap to turn off.
- InkSnake's daily run moves onto the same calendar.

## Daily: game ↔ website contract

The game never talks to the network; the host does (`packages/game-sdk`).

```ts
// added to GameHost
readonly daily?: DailyHost;

export interface DailyHost {
  /** The player's local date, YYYY-MM-DD. */
  today(): string;
  /** The day's level (untrusted JSON). Rejects for future dates, and for past dates unless the player owns the game. */
  load(date: string): Promise<unknown>;
  /** Saves a play (kept in the browser, synced to the account when signed in) and returns today's standing, or null offline. */
  record(play: DailyPlay): Promise<DailyStanding | null>;
  /** This game's days played, oldest first. */
  history(): Promise<readonly DailyDay[]>;
  /** Total days played across every game's dailies (for milestones). */
  totalDays(): Promise<number>;
  /** A link that opens this date's daily with `seconds` as the time to beat. */
  challengeLink(date: string, seconds: number): string;
  /** The challenge time from the link the player opened, if any. */
  readonly challenge?: { date: string; seconds: number };
}
export interface DailyPlay { date: string; result: 'win' | 'lose'; seconds: number; breakIn?: number; shells: number }
export interface DailyStanding { players: number; breakInBetterThan?: number; clearBetterThan?: number }
export interface DailyDay { date: string; result: 'win' | 'lose'; late: boolean; seconds: number }
```

- Server: `dailyPlays` collection, one record per player (visitor id or user id), game and date; `late` is true when played after that date. Percentiles come from the same date's records. `/api/daily/[game]?date=` serves the level: today's for everyone (any date within the range of real time zones, UTC−12 to UTC+14), past dates to owners, future dates never.
- Daily content: `games/inkbrick/content/daily.ts` exports `inkbrickDaily(date): unknown | null`, read by `apps/web/src/games/daily.server.ts`, like paid content.
- Dev harness: a local `DailyHost` reading the content files and localStorage.

## Variety: goals, rules of the day, new pieces (2026-11-18)

The owner's playtest: levels feel too alike, because every level is "break in, then clear everything" under the same rules. What other games do (research 2026-11-18: Ricochet, Arkanoid vs Space Invaders, Shatter, Holedown, DX-Ball 2, Peggle, and the daily climbs of Slay the Spire, Spelunky and Caveblazers): vary the **goal**, add **pieces** with their own behaviour, and give every daily a **rule of its own** so players come back to see today's twist. The owner chose all of it for launch (Sunday 2026-11-22).

### Goals (`LevelDef.goal`, default `'clear'`)

Every goal ends in a set piece, never a bare counter.

| Goal | Fields | Win | Fail | Shells (1 / 2 / 3) |
|---|---|---|---|---|
| `clear` | none | every breakable brick gone (crumble rule as before) | out of hearts | clear / no heart lost / under par |
| `rescue` | `rescue: { x, y, who }` (cells, a 2 × 2 friend: `'crab' \| 'pup' \| 'puffin'`), usually inside a vault | a ball touches the friend: it's freed and swims or flies to Skip's raft | out of hearts | rescue / no heart lost / under par |
| `pearls` | `pearls: { x, y }[]` (3–5 cells; a pearl is a pass-through pickup, no bounce) | every pearl collected | out of hearts | collect / no heart lost / under par |
| `stones` (Few Stones) | `stones: n` (3–6), `need: 0..1` | the share of breakable bricks broken when the last stone falls (or all gone) is ≥ `need` | below `need` | ≥ need / ≥ (need + 1) / 2 / everything |
| `tide` (Rising Tide) | `tide: { every, line }` (seconds per step, the danger row) | as `clear` | out of hearts | as `clear` |

- **Few Stones:** no hearts; each launch spends a stone; HUD shows stones left and the share broken. The clock doesn't matter for shells. **Not used in dailies** (the website ranks dailies by time).
- **Rising Tide:** every `every` seconds of play (not aim), every brick and stone that isn't part of the border wall moves down one cell. Moving pieces' anchors move with it. When any brick reaches row `line`, a heart is lost and the whole field rises back 6 cells. Bricks never overlap the raft.
- `rescue` and `pearls` don't need the board cleared, so the break-in is the payoff. Bricks still give the cascade.

### Rules (`LevelDef.rule`, at most one per level; every daily has exactly one)

The rule's name and line are shown before the level ("Strong Current: the sea pushes the stone sideways") and in the daily's tomorrow teaser.

| Rule | Effect (deterministic) | Kind |
|---|---|---|
| `current` | a constant sideways pull on every ball (`ruleDir` ±1, about 120 px/s²), with the ball's speed kept constant, so paths curve | hard |
| `heavy` | a downward pull (about 160 px/s²), speed kept constant | hard |
| `speedy` | ball speed ×1.25 | hard |
| `tinyRaft` | raft 60 px (wide pickup 100) | hard |
| `oneHeart` | 1 heart | hard |
| `fog` | the `dark` lantern | hard |
| `slow` | ball speed ×0.85 | easy |
| `wideRaft` | raft 130 px | easy |
| `bigStone` | ball radius ×1.6 (also against bricks) | easy |
| `sticky` | the raft catches the stone; it's thrown again on tap or after 1.5 s; **the clock keeps running** (only a lost heart stops it) | easy |
| `twoStones` | every launch throws two stones, mirrored about straight up | spectacle |
| `ghost` | after each raft hit the stone passes through the first brick it breaks | spectacle |
| `goldRush` | about 12% of soft bricks become x3 (applied by the generator to the level's bricks, no engine change) | spectacle |
| `kegDay` | about 10% of soft bricks become kegs (generator, as `goldRush`) | spectacle |

### New pieces

| Piece | Fields | Behaviour |
|---|---|---|
| Bumper | `bumpers: { x, y, r }[]` (centre in px, r 14–24 px) | round, unbreakable; reflects the ball off its normal and adds a kick (speed kept), with an event `bump` |
| Lever | brick kind `'lever'` with `link`; `flips: { x, y, w, h, link, on }[]` | a lever is never broken; each hit (0.4 s cooldown) toggles every flip wall with its link between solid and open. The render shows open walls as a dashed outline |
| Hidden brick | `BrickDef.hidden: true` | plays normally but isn't drawn until its first hit (a faint shimmer every few seconds hints at it) |
| Crab | `crabs: { y, x0, x1, speed, phase }[]` (cells; a 3 × 2 box walking on a row) | solid and unbreakable; it moves the ball's bounce like a moving stone; scuttles faster for 1 s after a hit |

### New layouts, and fewer boxes in the middle (owner, 2026-11-18)

"Too many levels with the square in the centre." 23 of the 45 non-boss levels were a stone box in the middle (vault, guarded, nested, core).

**New rule:** at most **2 centre-box levels per chapter** (10 of 45). Two new layouts take their place:

| Layout | The hard start | The payoff |
|---|---|---|
| `layers` | Full-width stone floors with gaps on alternating sides, as in Level 23 (The Winding Way). Variants: the gaps are shutters (trap doors), flip walls worked by levers, spinners, or whirlpools linking the floors | Floor by floor: each corridor clears as the stone climbs |
| `open` | **No stone at all.** The way in is breakable: thick driftwood (hp 3) armour, ice sheets, keg webs, hidden bricks, bumper fields, crabs | A keg chain, an ice crack or an x3 core inside the armour cascades through everything |

**Break-in on `open` levels:** the level marks its armour with `BrickDef.armour: true`. The break-in is the first time a ball reaches a cell enclosed by armour. Before that there's no inside, and the aim-window target doesn't apply.
The engine's inside map counts the armour **as it starts** (alive or not), together with stone: a breach doesn't change what's inside, so the break-in can't be missed by breaking a wide hole first (engine, 2026-11-18).

**The campaign after the refit** (the id and file stay; rebuilt levels get a new name):

| Ch | Lv | Layout | Goal | New piece introduced | Change |
|---|---|---|---|---|---|
| 1 | 1 | vault | clear | | keep (box 1) |
| 1 | 2 | wall | clear | | keep |
| 1 | 3 | **open** | clear | x3 inside driftwood armour | rebuild (was a stone core) |
| 1 | 4 | fuse | clear | | keep |
| 1 | 5 | **layers** | **pearls** | | rebuild (was a vault) |
| 1 | 6 | **open** | clear | **bumper** | rebuild (was a wall) |
| 1 | 7 | core (flat) | clear | | keep (box 2) |
| 1 | 8 | picture | clear | | keep |
| 1 | 9 | **layers** | **rescue** (seal pup at the top) | | rebuild (was nested) |
| 2 | 11 | **open** | clear | ice sheets, no stone | rebuild (was a vault) |
| 2 | 12 | hourglass | clear | | keep |
| 2 | 13 | picture | clear | | keep |
| 2 | 14 | vault | **rescue** (puffin in the hut) | | goal change (box 1) |
| 2 | 15 | **open** | **tide** | | rebuild (was a wall) |
| 2 | 16 | hourglass | clear | | keep |
| 2 | 17 | core | clear | | keep (box 2) |
| 2 | 18 | fuse | **stones** | | goal change |
| 2 | 19 | maze | clear | | keep |
| 3 | 21 | **layers** | clear | **lever + flip walls** as the floor gaps | rebuild (was a vault) |
| 3 | 22 | guarded | clear | | keep (box 1) |
| 3 | 23 | layers | clear | | keep |
| 3 | 24 | vault | clear | | keep (box 2) |
| 3 | 25 | wall | clear | **crab** on the quay | add crabs |
| 3 | 26 | **layers** | clear | shutters as trap doors in the floors | rebuild (was guarded) |
| 3 | 27 | picture | clear | | keep |
| 3 | 28 | **open** | **tide** | | rebuild (was a core) |
| 3 | 29 | fuse | **stones** | | goal change |
| 4 | 31 | vault | clear | | keep (box 1) |
| 4 | 32 | guarded | clear | | keep (box 2) |
| 4 | 33 | **open** | clear | **hidden bricks** in the dark | rebuild (was a vault) |
| 4 | 34 | **layers** | clear | spinners guarding the gaps | rebuild (was guarded) |
| 4 | 35 | **layers** | **pearls** | whirlpools link the floors | rebuild (was a vault) |
| 4 | 36 | **open** | **rescue** in the dark | | rebuild (was a picture) |
| 4 | 37 | maze | clear | | keep |
| 4 | 38 | **open** | clear | bumpers + x3 | rebuild (was a core) |
| 4 | 39 | wall | clear | | keep |
| 5 | 41 | nested | clear | | keep (box 1) |
| 5 | 42 | **layers** | clear | levers + shutters | rebuild (was guarded) |
| 5 | 43 | picture | **rescue** | | goal change |
| 5 | 44 | maze | clear | | keep |
| 5 | 45 | core (nested) | clear | | keep (box 2) |
| 5 | 46 | fuse | **tide** | | goal change |
| 5 | 47 | wall | clear | crabs on the rampart | add crabs |
| 5 | 48 | hourglass | **pearls** | | goal change |
| 5 | 49 | **open** | clear | everything, no stone | rebuild (was nested) |

**Totals after the refit:**
- 10 centre boxes, 9 open levels, 9 layered levels.
- Goals besides clear: 3 pearls, 4 rescue, 3 tide, 2 few stones.
- The bosses (10, 20, 30, 40, 50) stay.

**Dailies:**
- At most 2 centre-box days a week.
- `layers` and `open` join the generator's layouts from day one.
- `open` days carry the no-stone pieces.

### Daily: a day is layout × goal × rule

- **Plan:** each day picks a goal (`clear` most days; `rescue`, `pearls`, `tide` 1–2 times a week each), then a rule by weekday:
  - Monday: an **easy** rule.
  - Tuesday–Friday: any rule.
  - Saturday: a **hard** one.
  - Sunday: a **spectacle**.
  - No rule repeats within 7 days.
- **Daily pearl:** every daily hides one pearl (pass-through, off the obvious path), `LevelDef.dailyPearl: { x, y }` (cells), separate from the `pearls` goal's pearls; the Sim fires `dailyPearl` and sets `state.dailyPearlFound`. Finding it is saved with the day. InkBrick's calendar shows a pearl on those days and "N pearls this month". Owners can replay past days to find missed ones. Counters only go up.
- **Tomorrow teaser:** today's level JSON carries `tomorrow: { rule, goal }` (written by the generator), so the end card can say "Tomorrow: Rising Tide, with a Strong Current" without loading a future level.
- **Regenerating:** all frozen days (2026-11-20 onward) are regenerated, since nobody has played them yet.
- **New pieces in dailies:** each new piece enters the dailies a week after launch and is featured for its first two weeks, through `LATE_PIECES`.

## Who builds what (2026-11-17)

| Agent | Owns | Model |
|---|---|---|
| Engine | `src/sim`, `src/gen`, `content/`, `dev/lab.mjs`, `dev/gen.mjs`, `dev/contact.html`, `test/`; 3 example levels (Vault, Over the wall, Multiplier core) | Opus |
| Game | `src/index.ts`, `src/scenes`, `src/render`, `src/ui`, `src/audio`, `src/level` (the chapter list, loading), `dev/index.html`, `dev/main.ts` | Opus |
| Art | `src/art` (Skip, Brumm, bricks, raft, stones, pickups, 5 backgrounds, UI panels), `dev/art/` | Sonnet |
| Website | `packages/game-sdk`, `apps/web` (dailyPlays, `/api/daily`, `/daily`, home card, game listing, paid content) | Sonnet |
| Levels | `src/level/ch1/` (free, bundled) and `content/ch2..5/` (paid, server only, as InkTanks), from the generator plus the lab, after the engine is done | Opus for each chapter's first levels, Sonnet for the rest |
