# InkSnake: daily levels ("Today's Hunt")

InkSnake's daily level, following [the daily playbook](daily-playbook.md). It's InkSnake's own version of InkBrick's daily ([inkbrick-design.md](inkbrick-design.md#the-daily-level)). Asked for by the owner on 2026-11-18: daily levels like InkBrick's, every day feeling different, unique snakes and themed events for international days, and places that follow the season (winter dailies in winter places). Branch `feat/inksnake-daily`.

## What a day is

One level, the same for everyone on that local date: free, no account needed. Owners can play past days. It goes on the site-wide `/daily` calendar next to InkBrick's.

- **Ranked by time to win.** The end card says "faster than N% of today's winners", using `clearBetterThan`. `breakIn` isn't used.
- **The free daily may be set in any place, paid chapters' places included.** Their art is in the client already; only campaign levels are served to owners. On a paid place, the end card adds "The Reef is chapter 6 of the full game".

## The dials

Every day sets each dial. The novelty memory ([playbook](daily-playbook.md#variety-the-dials-and-the-memory)) keeps combinations from repeating.

| Dial | Values | Notes |
|---|---|---|
| **Season** | winter, spring, summer, autumn | From `seasonOf(date)` (shared calendar). Picks the place pool and the look |
| **Place** | the 10 chapter places | From the season's pool (below). No place twice within 3 days |
| **Snake** | the place's own snake; a **guest** snake (about 1–2 a week); an **event** snake | A guest must suit the place: the flying snake only where there are tree zones, the krait only with water, the egg-eater only with eggs. In winter, guests are temperate snakes only (corn, hognose, adder, horned viper) |
| **Goal** | grow, feast, rush, **golden** (new), boss | No goal with a fixed length (it wouldn't rank by time) |
| **Rule of the day** | one of the table below, exactly one per day | Never the same rule twice within 7 days. The season tilts the odds |
| **Layout** | `remix` of a chapter board, or a generated `pattern` | Never the same layout twice within 60 days |
| **Cast** | which of the place's prey and enemies come, and how many | From the place's chapter rules |

### Season pools (northern hemisphere, meteorological seasons)

| Season | Places | Seasonal look |
|---|---|---|
| **Winter** (December–February) | farm, barrens, mountains, heath | **Snow/frost looks for all four** (snow on the ground and solids, frosted cover, frozen ponds). Night more often |
| Spring (March–May) | farm, heath, barrens, savanna, rainforest, flooded | The campaign look (blossom later) |
| Summer (June–August) | dunes, reef, savanna, jungle, rainforest, flooded, mountains | The campaign look |
| Autumn (September–November) | farm, barrens, heath, mountains, jungle, dunes | The campaign look (gold leaves later; the farm already has pumpkins) |

Every place is in at least one season. In real life, corn snakes brumate and adders hibernate through the cold (an adder may bask on a mild winter day where the snow has melted). On winter days, the before-level line has fun with it: "Too cold to sleep in: the corn snake is out hunting in the snow."

### Rules of the day

The rule's name and line show before the level starts and in the tomorrow teaser. **Data** rules are applied to the level by the generator, with no engine change. **Engine** rules are new behaviour.

| Rule | Line | Effect | Kind | Made by | Seasons |
|---|---|---|---|---|---|
| `plenty` | Plenty: twice the food | Prey count ×2, target ×1.3 | easy | data | all (autumn harvest more) |
| `lure` | Sweet Tooth: food comes to you | Prey within 90 px of your head drifts toward it at 30 px/s | easy | engine | all |
| `looseKnots` | Loose Knots: you can't tie yourself up | Crossing your own body never costs a life (no knot) | easy | engine | all |
| `goldRush` | Gold Rush: golden meals | Every 4th prey that arrives is golden: ×3 growth, sparkles, flees a little faster | easy | engine | autumn, events |
| `night` | Long Night | `dark: true` | hard | data | winter more |
| `oneLife` | One Bite | `lives: 1` | hard | data | all |
| `hunters` | Hunting Season: more hunters | Enemy count ×2, first arrival halved | hard | data | autumn |
| `longTail` | Long Tail: start long | Start length ×2 (target raised to match) | hard | data | all |
| `ice` | Ice: you slide when you turn | The heading follows the steering with lag (turn rate ×0.55), and speed carries for 0.4 s | hard | engine | **winter only** |
| `blizzard` | Blizzard: the wind pushes you | A steady sideways push (40 px/s) that changes direction every 8–12 s. Gusts show as snow streaks | hard | engine | **winter only** |
| `fog` | Fog | Night with a much wider ring of sight (about 2.2× the night radius) | hard | engine (night radius param) | autumn, winter |
| `hotDay` | Hot Day: everyone's fast | Snake and prey speed ×1.25 | hard | engine (speed multiplier) | summer |
| `giants` | Giants: big meals only | Only prey that needs a coil or venom | spectacle | data | all |
| `swarm` | Swarm: tiny food everywhere | The place's smallest prey ×4, target ×1.2 | spectacle | data | summer, spring |
| `stampede` | Stampede | The place's lane enemy (herds, rockfall, fire) every 6 s. Only where the place has one | spectacle | data | where possible |
| `rival` | Rival: another snake wants your food | A rival snake of the same species hunts the same prey (as in the Dunes) | spectacle | engine (rival in any place) | all |

### The golden goal (new)

`goal: { kind: 'golden', count: 3 }`: a **golden** prey of the place's fast kind (a mouse on the farm) appears, runs from you, and hides in cover. Catch it `count` times; each catch spawns the next somewhere else. The usual target length still has to be reached. It ends with a set piece: on the last catch, the golden prey drops a shower of sparkles along your body.

## Weekly rhythm

| Day | The hunt |
|---|---|
| Monday | Warm-up: grow, an easy rule, the home snake, a short target |
| Tuesday | Feast |
| Wednesday | **Guest snake** (a snake out of its home), grow or rush |
| Thursday | Rush |
| Friday | **A hard rule** (in winter: ice, blizzard or night) |
| Saturday | **The odd one:** golden chase or a spectacle rule |
| Sunday | **Boss day:** the place's boss with a spectacle rule (in winter: the Old Tomcat, the Red Fox, the mountain boss, the heath's badger) |

## Layouts

- **`remix`:** one of the place's campaign boards (levels 1–9), mirrored in x, y or both. Solids are jittered a little, and cover, prey and enemies are re-cast. That gives 36 bases per place, and keeps whatever zones the place's ability needs (water, trees, sand) where they make sense.
- **`pattern`:** generated from the place's own solid and cover looks. At least six shapes: `ring` (a loop of solids round an open middle), `lanes` (long rows like fences or logs), `scatter`, `rooms` (three or four open pens joined by gaps), `islands` (water places), `spiral`. Patterns never shrink the board and never leave long empty floor ([no empty walking](inksnake-design.md)).

## Events (themed days)

The shared event calendar is in [the playbook](daily-playbook.md#events-shared). On an event day, InkSnake brings out the event's **snake** (a real species), the event's **look** on the place, **treats**, and an event rule. Playing the day adds the snake to the **snake album** and puts a stamp on the calendar.

**Treats** are still pickups in the event's style. When your head touches one, it goes with a sparkle and a small bit of growth (no lump). An event day's goal is usually `feast` on its treat. Treats only (no gross food).

| Event | Snake (real) | Place (by season) | Look | Treats | Rule |
|---|---|---|---|---|---|
| Christmas Eve (Dec 24) | **candy cane corn snake** (corn snake morph, red on white) | farm, winter | snow, presents as solids, fairy lights | cookies | `ice` |
| Christmas Day (Dec 25) | candy cane corn snake | barrens, winter | snowy pines, presents | candy canes | `night` (fairy lights glow) |
| Boxing Day (Dec 26) | candy cane corn snake | farm, winter | snow | cookies | `plenty` |
| New Year's Eve (Dec 31) | **rainbow boa** (iridescent) | farm, winter, night | fireworks light the board in bursts | confetti stars | `night` |
| New Year's Day (Jan 1) | rainbow boa | mountains, winter | fireworks | confetti stars | `goldRush` |
| Lunar New Year (2027: Feb 6; 2028: Jan 26) | **golden tree snake** (*Chrysopelea ornata*: green, cross-hatched black, with gold accents) | mountains, winter | red lanterns | red envelopes | `goldRush` |
| Valentine's Day (Feb 14) | **rosy boa** | heath, winter (frost) | hearts | heart candies | `looseKnots` |
| World Wildlife Day (Mar 3) | the place's own | farm, spring | | | `plenty`, with prey from every place |
| St Patrick's Day (Mar 17) | **green tree python** | rainforest, spring | clovers | gold coins | `goldRush` |
| Easter (2027: Mar 28; 2028: Apr 16) | **egg-eater** (a guest on the farm) | farm, spring | blossom | painted eggs (feast) | `plenty` |
| Earth Day (Apr 22) | **smooth earth snake** | heath, spring | flowers bloom behind you | | `lure` |
| World Oceans Day (Jun 8) | **yellow-bellied sea snake** | reef, summer | | | `swarm` |
| World Snake Day (Jul 16) | **any snake in your album** (your pick) | farm, summer | bunting | | `rival` |
| International Cat Day (Aug 8, date to confirm before freezing) | corn snake | farm, summer | | | The Old Tomcat, playful (a boss day) |
| Halloween (Oct 30–31) | **eastern hognose, black form** (plays dead) | farm, autumn, night | pumpkins, bats | candy | `night` / `fog` |
| Diwali (2027: Oct 29) | **king cobra** | jungle, autumn | oil lamps that light as you pass | | `lure` |

Event snakes are new `SnakeId`s. Each one plays like a close relative: the candy cane corn snake and the rosy boa coil, the golden tree snake glides only where there are tree zones, and the sea snake swims. Each needs its own `SnakeArt`: a painted strip and a head, in the existing pipeline ([art/snakes](../games/inksnake/src/art/snakes)). The snakes are built in date order: Christmas and New Year first (frozen in the first 60 days), then Lunar New Year and Valentine's before January 15, then the rest at least 30 days before their date.

**Fact-checked 2026-11-18** (Sonnet agent): the event dates for 2027 and 2028 and the event species (the candy cane corn snake is a real amelanistic morph; the rainbow boa's sheen is structural colour; the eastern hognose has black forms). Still unconfirmed: International Cat Day's date, and the rosy boa's colours (the source didn't say). Check both before they're frozen.

## Snake album

A screen in the menu: one card per snake you've hunted with in a daily (the 10 home snakes and every event snake). Each card has the snake's name, its Latin name, one true fact, and the date you first played with it. The album only grows. Event snakes show on their card with the event's stamp. Owners can replay past event days from the archive.

## In the game

- **Menu:** a "Today's Hunt" button above the map shows today's place, snake and rule. On a challenge link it opens straight into the day.
- **Before the level:** a card with the date, the place, the snake and the rule's line (and the event's name on an event day).
- **End card** (win or lose): the result and time; the standing; "Challenge a friend" (copies the challenge link); "N days played"; and the **tomorrow teaser** (tomorrow's place and snake silhouette, its rule, and a countdown to midnight). From 7 days before an event, it also says "Christmas Hunt in 6 days".
- **Day milestones** (3, 7, 14, 30, 50, 100 days played across every game's dailies) unlock album pages and calendar stamps.
- **InkSnake's calendar:** owners pick archive days from it. It's the site's calendar filtered to InkSnake, as in InkBrick.

## Level fields (contract)

```ts
// games/inksnake/src/level/types.ts (additions; every one optional, campaign levels unchanged)
readonly place?: Place;        // dailies: where it's set (campaign levels: from their chapter)
readonly season?: Season;      // the look; absent = the campaign look
readonly rule?: DailyRule;     // the rule of the day (data rules are already applied to the fields)
readonly event?: EventId;      // a themed day: its look and stamp
readonly treats?: { readonly kind: TreatKind; readonly count: number };
// GoalDef gains: { kind: 'golden'; count: number }
// SnakeId gains the event snakes: 'candycane' | 'rainbowboa' | 'goldentree' | 'rosyboa' | 'greenpython' | 'earthsnake' | 'yellowsea' | 'blackhognose'
```

- Daily level ids are `daily-YYYY-MM-DD`. `placeOf` reads `level.place` first. The bot's place hooks read `level.place` too.
- `Season`, `EventId`, `seasonOf(date)` and `eventOn(date)` come from `packages/game-sdk/src/calendar.ts`, the shared calendar.
- The validator (`level/validate.ts`) checks every new field, and rejects an event snake or rule it doesn't know (untrusted JSON from the server).

## Generator

The flow is InkBrick's (`src/gen`, `npm run gen -- --from 2026-11-22 --days 60`, frozen to `content/daily/YYYY-MM.json`, exported by `content/daily.ts` as `inksnakeDaily(date)`):

1. `seed = hash('inksnake:' + date)`.
2. **Plan the day:** the event (if any), then the season and weekday, then the place, snake, goal and rule. The last 14 days' memory decides among what's left.
3. **Compose about 60–120 candidates:** a layout source and transform, a cast, and the target and par.
4. **Cheap checks:** the validator, a clear start (no solid within 80 px ahead), prey reachable, cover not on top of solids.
5. **The bot** plays each survivor (headless, the existing `test/bot.ts` and its place hooks, with the rule applied). It has to win on at least 2 of 3 seeds. Its win time has to land in the weekday's band (Monday shortest, Friday and Sunday longest). Then the novelty score.
6. **The best candidate is frozen.** `dev/contact.html` shows every frozen day (board, place, snake, rule, event, numbers) for the owner's weekly veto.

## Build plan

1. **Engine** (one Opus agent): the level fields and validator, the shared `calendar.ts`, every engine rule, the golden goal, treats, winter looks for the four winter places, the event snakes `candycane` and `rainbowboa` with their art and event looks (Christmas, New Year), and the daily flow in the game (menu, cards, end card, album). Also the dev `DailyHost` and tests.
2. **Generator** (one Opus agent, once 1 is done): `src/gen`, the CLI, freezing November 22 to January 31 (matching InkBrick), and the contact sheet.
3. **Website** (in 2): one line in `daily.server.ts`, the slug and blurb in `data/dailies.ts`, and the package export `./daily`.
4. **Later event snakes** (Sonnet, one per snake from the candy cane worked example): golden tree snake and rosy boa by January 15, the rest 30 days before their date.
5. **Owner review:** the contact sheet, then a playtest.

## Engine notes

Built 2026-11-18 (build plan step 1). Numbers are board px and seconds, from `games/inksnake/src/logic/daily/params.ts`.

### What the generator writes

- **Fields:** everything in "Level fields (contract)", plus one more: `tomorrow: { place, snake, rule, event? }` for the end card's teaser (validated like the rest). Without it the teaser just says "A new hunt every day".
- **Ids:** `daily-YYYY-MM-DD`, a real date. `DailyClient` refuses a level whose id isn't the requested date's.
- **Data rules** are only labels to the engine: write their effect into the fields (`night` → `dark: true`, `oneLife` → `lives: 1`, and so on). **`fog` does not need `dark`:** the rule alone shows a pale mist with sight ×2.2. Leave `dark` unset on fog days.
- **`rival`:** the rule alone adds one rival (no `enemies` entry needed). A `{ kind: 'rival' }` enemy is also registered, if you want two or a later `from`.
- **Feast on treats:** `goal: { kind: 'feast', food: <treat kind>, count }` is valid only with `treats.kind` equal to `food`. Treats count towards `w.feasted`.
- **Golden goal:** the quarry is chosen by the engine: the level's quickest *runner* (gait `scurry`) the snake can swallow at its start width (it keeps to the snake's diet), else the quickest hopper. Farm: mouse. Barrens' first board: frog. Savanna: weaver eggs (the egg-eater's diet). Put the place's fast runner in `prey`, and give it some cover to hide in.
- **Solid look `present`:** painted as a wrapped present in any place (Christmas days). No snow lands on presents.
- **`DailyPlay.shells`** is sent as 0 (the field is InkBrick's).

### Rule parameters as built

| Rule | As built |
|---|---|
| `lure` | Prey and treats within 90 px of the head drift towards it at 30 px/s (not birds in the air, frozen or sleeping prey) |
| `looseKnots` | The head crossing the body never ties a knot |
| `goldRush` | Every 4th prey to arrive (the level's start counts) is golden: growth ×3, points ×3, lives ×1.15 faster |
| `ice` | Turn rate ×0.55; speed eases to its target with a 0.4 s time constant (a strike's lunge builds up instead of jumping) |
| `blizzard` | A 40 px/s push on the head. The direction is random at the start, then turns by 90–270° every 8–12 s, eased in over 1.5 s. Snow streaks show the wind |
| `fog` | The night layer, pale mist (0xdfe4ea at 0.8), sight ×2.2, no moonbeams |
| `hotDay` | Snake speed ×1.25; every prey animal's step (and timers) runs ×1.25 |
| `rival` | Arrives after 4 s from a board edge: the player's species, width ×0.9, speed ×0.75, length ×0.9 of the start length. It eats prey up to its gape and grows; heads meeting, the wider snake bites (cause `bitten`) |
| Treats | 9 px pickup reach past the head's edge, +12 px growth, no lump, 5 points; back 1–2 s after one is taken, at least 150 px from the head |
| Golden goal | One golden prey at a time, at least 260 px from the head. Fear radius ×1.5, lives ×1.2 faster; it runs for cover within 260 px (not towards the snake) and sits tight there until the head is within 70 px. The next one comes 1.4 s after a catch. The last catch showers sparkles along the body (`goldenDone`). The target length is still required |

### The bot

`test/bot.ts` keys its place hooks by `level.place` (campaign levels by their id prefix). It now goes for treats on a treat feast, prefers golden prey (−400 on its score; gold rush prey −150), and backs off a bigger rival's head (within 90 px). It ignores fog (it sees everything) and does nothing special for ice or wind.

Measured on every place's level 1 with the rule added, 3 seeds, 300 s cap (`MEASURE=1 npx vitest run test/dailyMeasure.test.ts`), as wins/3 and mean win time:

| place (golden quarry) | none | lure | looseKnots | goldRush | ice | blizzard | fog | hotDay | rival | golden ×3 |
|---|---|---|---|---|---|---|---|---|---|---|
| farm (mouse) | 3/3 15s | 3/3 12s | 3/3 11s | 3/3 11s | 3/3 16s | 3/3 18s | 3/3 11s | 3/3 10s | 3/3 13s | 3/3 21s |
| barrens (frog) | 3/3 14s | 3/3 14s | 3/3 11s | 3/3 10s | 3/3 14s | 3/3 18s | 3/3 11s | 3/3 12s | 3/3 15s | 3/3 23s |
| dunes (side-lizard) | 3/3 28s | 3/3 32s | 3/3 46s | 3/3 31s | 3/3 43s | 3/3 79s | 3/3 46s | 3/3 37s | 3/3 35s | 3/3 66s |
| savanna (weaver-egg) | 3/3 15s | 3/3 15s | 3/3 16s | 3/3 12s | **0/3** | 3/3 15s | 3/3 16s | 3/3 13s | 2/3 18s | 3/3 16s |
| rainforest (gecko) | 3/3 24s | 2/3 16s | 3/3 29s | 2/3 14s | 3/3 36s | 3/3 23s | 3/3 28s | 3/3 21s | 3/3 26s | 3/3 51s |
| reef (goby) | 3/3 19s | 3/3 17s | 3/3 16s | 3/3 11s | 3/3 35s | 3/3 15s | 2/3 17s | 3/3 13s | 3/3 23s | 3/3 86s |
| mountains (agama) | 3/3 44s | 3/3 36s | 3/3 41s | 3/3 63s | 3/3 80s | 3/3 67s | 3/3 41s | 3/3 59s | 3/3 45s | 3/3 40s |
| heath (common-lizard) | 3/3 45s | 3/3 27s | 3/3 35s | 3/3 22s | 3/3 42s | 3/3 119s | 3/3 32s | 3/3 30s | 3/3 31s | 3/3 45s |
| jungle (skink) | 3/3 26s | 3/3 19s | 3/3 27s | 3/3 23s | 3/3 31s | 3/3 28s | 3/3 30s | 3/3 23s | 3/3 18s | 3/3 107s |
| flooded (piranha) | 3/3 19s | 3/3 15s | 3/3 16s | 3/3 12s | 3/3 26s | 3/3 23s | 3/3 16s | 3/3 14s | 3/3 20s | 3/3 51s |

What the bot can't play well: the **egg-eater on ice** (0/3; ice is winter-only, and the savanna isn't a winter place, but a winter guest egg-eater would fail), **blizzard** on the heath and the dunes (slow: 79–119 s), **golden** on boards without cover or with prey that hides in water (reef 86 s, jungle 107 s). Fog and hot day times are the bot's, not a player's: a player sees less in fog. Bot hooks for a place assume the place's own snake; a guest snake runs another snake's hook (check guests with the bot like any day). The bot ignores goldRush's extra growth beyond its preference.

### Art looks

| Place | `season: 'winter'` | Notes |
|---|---|---|
| farm, barrens, mountains, heath | Snow over the ground (thaw holes show the place's ground; water zones stay clear), drifts and sparkle, snow caps on solids, hoarfrost dusting on cover. Heath is frost (thinner) | Other places keep their campaign look in any season |
| any | `rule: 'ice'`: a frozen pond over the open middle (glossy, cracked, dusted, a snow bank round it) | Drawn under the solids |
| any | `event` Christmas Eve, Christmas Day, Boxing Day: fairy lights (a garland along the top, a ring round every round solid of r ≥ 14) that twinkle and glow at night; `present` solids | |
| any | `event` New Year's Eve, New Year's Day: fireworks bursts every 1.6–3.2 s that light the night layer | Best with `dark` |
| any winter day or blizzard | Falling snow (streaks in a blizzard) | |

Event snakes: `candycane` and `rainbowboa` are painted (recoloured from the corn snake's painting, `art/snakes/eventSnakes.ts`). The other six wear their relative's drawings for now (`EVENT_RELATIVE` in `logic/species.ts`, TODO in `art/snakes/index.ts`): goldentree and greenpython → paradise flying snake, rosyboa → corn snake, earthsnake and blackhognose → eastern hognose, yellowsea → sea krait. Abilities come from the relative: goldentree glides, yellowsea swims, blackhognose plays dead; the rest have none (corn-like coil where `big: 'coil'`). Treat sprites: cookie, candy cane and confetti star are painted; envelope, heart, coin, painted egg and candy show a wrapped sweet in their colour.

### In the game

Menu: a "Today's Hunt" button under the bar (bigger on phones) shows place, snake and rule once the host has the day. A challenge link opens straight onto the card before the hunt. The end card records through `host.daily.record` once per play, adds the snake to the album, and never touches campaign progress except for the album and stamps below. Dev: `pnpm dev`, then `?hunt=ice|xmas|rival|golden|newyear` picks today's sample (earlier days take the next ones round), `?beat=75` fakes a challenge; `node dev/tools/dailyshots.mjs <url> <out> <hunt...>` screenshots the card, the board and the end card (`PHONE=1`, `EXTRA=1` for the calendar, album and menu).

**Album and milestones sync to the account** inside the campaign's progress save (`Progress.album`, `Progress.stamps`; `logic/save.ts` and `accountSave.ts`, `daily/album.ts`, `daily/milestones.ts`). Merge is a union: a snake stays, the earlier first-played date wins; a stamp (days played, date reached) keeps its earliest date. Saved data is validated (unknown snakes, events, days and malformed dates are dropped). The old browser-only key `inksnake.album.v1` is read into the save on load and never written again. Reaching 3/7/14/30/50/100 days gives the album a frame tier (1-6, `scenes/daily/albumFrame.ts`, from the host's total, so it follows the player across games), a gold rosette on that day in the calendar, and "N days played: a new album page!" on the end card. Dev: `?days=6` adds six played days elsewhere.

## Generator notes

Built 2026-11-18 (build plan steps 2 and 3). Code in `games/inksnake/src/gen` (pure: the chapters and the bot are passed in, so `src/` never imports the paid chapters or test code), the CLI in `dev/gen.mjs` with its pure side in `dev/genDays.ts`, frozen months in `content/daily/YYYY-MM.json`, served by `content/daily.ts` (`inksnakeDaily(date)`, package export `./daily`).

```
npm run gen -- --from 2026-11-22 --days 71   # freeze the days not yet frozen (--force to remake them)
npm run gen -- --redo 2026-12-09             # vetoed day: new board and cast, same place, snake, rule and goal
npm run gen -- --audit                       # the variety audit below
npm run gen -- --tomorrow                    # rewrite every day's teaser from the day after it
```

### How a day is made

1. **Plan** (`plan.ts`, sequential, seeded by `hash('inksnake:' + date)`): the event's fixed dials (table in `EVENT_PLANS`), else the season's pool minus the last 2 days' places (and event days next to it), weighted towards places not seen in 14 days; the weekday's goal (Mon grow, Tue feast, Wed grow or rush with a guest, Thu rush, Fri grow or feast with a hard rule, Sat golden 55% or a spectacle, Sun boss with a spectacle); a guest on Wednesdays and a quarter of Saturdays; the rule of the weekday's kind not used within 7 days and leaving the next Monday/Friday/weekend one of theirs. 48 proposals; the one sharing fewest dials with the last 14 days wins (the last 7 count double). Then three layouts: none used within 60 days, no family (a board's mirrors, a place's pattern shape) within 14. All three are reserved.
2. **Promises:** a day whose yesterday is frozen keeps the place, snake and rule its teaser showed. `tomorrow` on every day comes from the next frozen day or the next day's plan, so a later run of the next month keeps it (the audit checks: 0 broken).
3. **Compose** (`layouts.ts`, `compose.ts`): a remix (board 1–9 mirrored none/x/y/xy, solids jittered ±10 px with holes and nests following their solid, cover ±18 px), or a pattern (`ring`, `lanes`, `scatter`, `rooms`, `islands`, `spiral`) in the place's own solids, with a campaign board's zones (sun, sand, scree, stream, tall grass). The reef lays out cays, coral and eel holes; the flooded forest islands, trunks and the caiman's and jaguar's spots; the rainforest crowns a glide apart; the savanna hangs two nests on up to five acacias. Christmas days wrap half the solids as presents. Cast from the place's prey and enemies (only what the snake eats; eggs only with nests; hens, weavers and caimans only where their nests or holes are). Data rules are written into the fields.
4. **Cheap checks** (`checks.ts`): the validator, a clear start, 85% of open floor reachable, cover, nests and holes off solids, crowns joined within 135 px, and (patterns) at most 15% of the floor further than 230 px from anything. Campaign boards run up to 21% (p90 13%), so remixes are exempt.
5. **Bot** (`generate.ts`): 3 seeds, 300 s cap, at least 2 wins. Off the band, the growth is scaled to the band's middle (up to 3 tries); a boss day gets one strike more or less instead (hp 2–6). Up to 8 survivors per layout; the next layout only if none met the band. Par = mean win × 1.6 (rounded to 5 s); a rush's clock = slowest win × 1.9 (at least 30 s).

### Bands as set (bot's mean win time, s)

| Mon | Tue | Wed | Thu | Fri | Sat | Sun | Events |
|---|---|---|---|---|---|---|---|
| 10–28 | 14–40 | 14–45 | 14–45 | 18–62 | 16–55 | 20–80 | 12–45 |

From the engine notes: plain level 1s run 11–45 s, hard rules to ~80 s. Ice and blizzard are kept off Monday and Tuesday (a mountain blizzard missed Tuesday's band at 42 s with the shortest target).

### The first freeze (2026-11-22 to 2027-01-31, 71 days)

All 71 days met their band, the bot winning 3/3 on every one. 608 candidates composed: 4% failed the cheap checks; of the 584 the bot played, 7% lost on 2+ seeds and 10% stayed off the band after tuning; 975 bot plays; an alternate layout was needed on 1 day. 90 s on 7 workers.

| week of | days | places | snakes | goals | rules | layouts | guests | bands met |
|---|---|---|---|---|---|---|---|---|
| 2026-11-16 | 1 | 1 | 1 | 1 | 1 | 1 | 0 | 1/1 |
| 2026-11-23 | 7 | 6 | 6 | 5 | 7 | 7 | 2 | 7/7 |
| 2026-11-30 | 7 | 5 | 5 | 5 | 7 | 7 | 1 | 7/7 |
| 2026-12-07 | 7 | 4 | 4 | 5 | 7 | 7 | 1 | 7/7 |
| 2026-12-14 | 7 | 4 | 4 | 5 | 7 | 7 | 1 | 7/7 |
| 2026-12-21 | 7 | 4 | 5 | 3 | 7 | 7 | 1 | 7/7 |
| 2026-12-28 | 7 | 4 | 4 | 5 | 7 | 7 | 2 | 7/7 |
| 2027-01-04 | 7 | 4 | 3 | 5 | 7 | 7 | 2 | 7/7 |
| 2027-01-11 | 7 | 4 | 3 | 5 | 7 | 7 | 2 | 7/7 |
| 2027-01-18 | 7 | 4 | 4 | 4 | 7 | 7 | 1 | 7/7 |
| 2027-01-25 | 7 | 4 | 4 | 5 | 7 | 7 | 2 | 7/7 |

- **Shortest repeats:** layout never; layout family 16 days; a rule 7 days on ordinary days (6 days only between the Christmas Day and New Year's Eve nights, both set by the event table); a place 2 days only round Christmas (farm on Dec 24 and 26, from the table).
- **Totals:** places farm 17, mountains 17, barrens 17, heath 16, jungle 2, dunes 2 (the last autumn week). Snakes corn 17, spidertail 15, hognose 15, adder 14, candycane 3, sidewinder 2, cobra 2, rainbowboa 2, krait 1. Goals feast 20, grow 16, rush 16, boss 11, golden 8. All 14 winter-possible rules used, 4–7 times each. Layouts: 43 remixes, 28 patterns (ring 9, rooms 5, spiral 4, lanes 4, scatter 4, islands 2).
- **Checks:** no out-of-season place, every event on its date, no broken teaser.
- Patterns for the places not in this range (reef, flooded, rainforest, savanna, jungle, dunes) were tried on 6 candidates per shape: 80–100% pass the cheap checks and the bot, except savanna `lanes` (half have no acacia left after the start is cleared, so no eggs; the cheap check drops them).

### For the owner on the contact sheet

Open `dev/contact.html` (`pnpm dev`, then `/contact.html`).

- **The four winter places carry all of December–February.** Variety then comes from the snake, rule, goal and board, but there are only 4 places a week. If it feels samey in play, add a winter look to another place (the doc's pools allow it).
- **Christmas boards are sparse** (3–5 solids, half wrapped as presents): the remixes come from early campaign boards. Redo one if it looks bare.
- **Guests in winter** are corn, hognose and the horned viper only (the adder needs its sun patches). The horned viper on the farm (Dec 19, Jan 9) lures birds the farm doesn't have; the bot wins, but check it looks right.
- **Golden days with Plenty** have long targets (Jan 2: 130 → 793 px). The bot wins in 22 s, but the number is big on the card.
- **Boss days** are tuned by the boss's strikes, so the barrens fox can be 4 strikes.
- **Later events:** the golden tree snake's Lunar New Year (Feb 6) is on the mountains, where it has no trees to glide from, so it moves at its forest-floor speed. Move it to the rainforest or give it its own ability before the February freeze. A day the bot can't win on any layout is still frozen (`ok: false` in the JSON, red on the sheet); redo it.
- **Redo** keeps place, snake, rule and goal and draws new layouts. It checks the 60-day layout limit against earlier days only.
