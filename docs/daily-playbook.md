# Daily levels: the playbook

The rules every game's daily level follows, and what we've learnt making them. InkBrick was first (November 22, 2026); InkSnake is second. Each game's own doc covers how it builds its days ([inkbrick-design.md](inkbrick-design.md#the-daily-level), [inksnake-daily.md](inksnake-daily.md)). This page covers what they share.

**Why dailies:** the owner wants retention: something new to come back to every day ([growth-plan.md](growth-plan.md)). A daily is also the thing players share: a challenge link with a time to beat.

## The rules (all games)

1. **Same level for everyone on the same date.** It's keyed by the player's local calendar date (YYYY-MM-DD) and opens at their own midnight.
2. **Free for everyone, no account needed.** Today's daily never sits behind the paywall. Past days (the archive) are for owners. That's a reason to buy, not a penalty.
3. **No streaks, ever.** We count **days played** (a total that only goes up). A missed day is a gap an owner can fill from the archive: the calendar outlines it. It is never a loss. No "best streak" and no "don't lose your streak" messages.
4. **Every day feels different.** Each day changes at least three of the game's *dials* (place, character, goal, rule, layout…), and the game keeps a memory so a combination doesn't repeat (below).
5. **Every daily has exactly one rule of the day.** It's named and explained in one line before the level starts ("Ice: you slide when you turn"). The rule is the headline of the tomorrow teaser.
6. **The game follows the season and the calendar.** The game's places follow the shared season. Themed events take over their days (below).
7. **Ranked by time.** The website ranks wins by `seconds` (faster beats more players). Goals with a fixed length (survive for N seconds, a set number of shots) are left out of dailies.
8. **Made by a generator, frozen, and reviewed.** Each day is picked from many generated candidates, checked by a bot and frozen to `content/daily/YYYY-MM.json` about 60 days ahead. A later change to the generator never changes a frozen day. The owner can veto any day on the contact sheet (`dev/contact.html`) and redo it (`npm run gen -- --redo <date>`).
9. **Treats only.** Event pickups are treats (candy, cookies, painted eggs, hearts, coins). No bugs, no gore, no dead animals.
10. **Characters are animals,** and names use plain letters A–Z.

## Retention pieces (the same in every game)

| Piece | What it is |
|---|---|
| Today's daily | The game's menu shows it first; the website's home page has a "Today's daily" card |
| `/daily` calendar | One site-wide calendar. A day you played gets a mark with each game's icon, and owners' late plays get an outlined mark. It shows **N days played** in total |
| End card | Win or lose; **standing** ("faster than 72% of today's players"); a **challenge link**; **days played**; and the **tomorrow teaser**: tomorrow's place, character and rule as a silhouette, with a countdown to the player's midnight |
| Event teaser | From 7 days before an event, the end card adds a line: "Christmas Hunt in 6 days: the candy cane corn snake" |
| Day milestones | 3, 7, 14, 30, 50, 100 days played. Dailies from every game count. Each milestone gives a cosmetic and a stamp on the calendar |
| Collection | Something that only grows, made from dailies: InkBrick's looks, InkSnake's snake album, and the event stamps |

## Seasons (shared)

All games use **meteorological seasons, northern hemisphere** (most players are in the US and Europe). The daily is the same level worldwide, so it can't follow each player's own hemisphere.

| Season | Months | Feel |
|---|---|---|
| Winter | December, January, February | Snow, frost, short days (night rules more often), warm lights |
| Spring | March, April, May | Rain, blossom, young animals, floods |
| Summer | June, July, August | Heat, bright sun, the sea, long days |
| Autumn | September, October, November | Harvest, falling leaves, fog, migration |

**Each game maps its places to seasons.** Every place belongs to at least one season. A day's place comes from the season's pool. A place in several seasons gets a **seasonal look** where it has one (snow on the farm in winter, gold leaves in autumn). In winter, every daily is set in a winter place. Variety then comes from the other dials.

## Events (shared)

The same event days apply across every game: one festive calendar for the whole site. An event day replaces the plan for its date with the event's theme:

- **The game's event character** (InkSnake: a real snake species that fits the day).
- **A themed look:** decorations on the place, the event's treats as pickups, and an event rule.
- **A stamp on the calendar**, kept for good.

An event day still uses the normal checks (bot, novelty, difficulty). Events are never harder than a Wednesday.

| Date | Event | Days | Theme |
|---|---|---|---|
| January 1 | New Year's Day | 1 | Fireworks at night, confetti |
| Varies (2027: February 6; 2028: January 26) | Lunar New Year | 1 | Red lanterns, gold, red envelopes |
| February 14 | Valentine's Day | 1 | Hearts, pink and red |
| March 3 | World Wildlife Day | 1 | Animals from every place on one board |
| March 17 | St Patrick's Day | 1 | Green, clovers, gold coins |
| Varies (2027: March 28; 2028: April 16) | Easter | 1 | Painted eggs, spring blossom |
| April 22 | Earth Day | 1 | Flowers bloom where you go |
| June 8 | World Oceans Day | 1 | The sea |
| July 16 | World Snake Day | 1 | Snakes everywhere (InkSnake's biggest day) |
| August 8 | International Cat Day | 1 | Cats (in InkSnake, the Old Tomcat as a friendly guest) |
| October 30–31 | Halloween | 2 | Night, pumpkins, candy, bats |
| Varies (2027: October 29) | Diwali | 1 | Oil lamps that light as you pass |
| December 24–26 | Christmas | 3 | Snow, presents, cookies, candy canes |
| December 31 | New Year's Eve | 1 | Fireworks at midnight |

The table lives in code at `packages/game-sdk/src/calendar.ts`: `seasonOf(date)` and `eventOn(date)`. Dates that move each year (Lunar New Year, Easter, Diwali) come from a table of years in that file. Every game's generator reads it, so all games agree. Add a year's moving dates at least 90 days ahead (a test checks this).

**Event rules:** never a gross treat. Never mock a religion; keep to lights, food and colours. Fact-check every date and every real species before it's frozen.

## Variety: the dials and the memory

Each game lists its **dials**: the things a day can change. A day's plan picks a value on each, then the generator builds candidates and picks the best one.

**The memory (every game):** a feature vector per day (place, character, goal, rule, layout source, enemy set…). A candidate is rejected if it's too close to any of the last 14 days. On top of that, per game:

- The same rule never runs twice within 7 days.
- The same place never runs twice within 3 days (if the season's pool allows).
- The same layout never runs twice within 60 days.

**The weekly rhythm** gives each weekday a personality the player learns:

| Day | Role |
|---|---|
| Monday | Warm-up: short, with an easy rule |
| Tuesday–Thursday | Mixed, a little harder each day |
| Friday | A hard rule |
| Saturday | The odd one: the strangest mix of the week |
| Sunday | Spectacle: a boss or the game's biggest set piece (the day of the new-game email) |

## Difficulty

- Measure with the game's **bot**. Every candidate is played by it. A day is kept only if the bot wins it, and only if its win time falls in the weekday's target band.
- Target: a typical player wins Monday on the first or second try and Friday in about 3–5 tries.
- **Learn weekly:** the daily's play data (`dailyPlays`: wins, seconds, the share who quit) tunes each weekday's bands. Write each change in the game's daily doc with its date.

## The contract (`packages/game-sdk`: `DailyHost`)

The game never talks to the network: the host does. `today()`, `load(date)`, `record(play)`, `history()`, `totalDays()`, `challengeLink(date, seconds)`, `challenge`. See [inkbrick-design.md](inkbrick-design.md#daily-game--website-contract) for the full types. The website serves `/api/daily/[game]?date=`: today's level for everyone (any date within real time zones, UTC−12 to UTC+14), past dates to owners only, and future dates never.

## Adding a daily to a game (checklist)

1. Write the game's daily doc: its dials, its season pools, its rules of the day, its event characters, and its weekly rhythm. Follow this playbook.
2. Engine: the level fields the dials need, each rule, the event looks, and the daily flow in the game (menu entry, end card, tomorrow teaser). Keep the validator in step.
3. Generator: `src/gen` and `npm run gen -- --from <date> --days 60`. It needs a bot check, the novelty memory, the contact sheet, and frozen months in `content/daily/`.
4. Content export: `content/daily.ts` exports `<game>Daily(date)`. Add the package export `./daily`.
5. Website: one line in `apps/web/src/games/daily.server.ts` and the slug in `apps/web/src/data/dailies.ts` (a test keeps the two in step).
6. Freeze the next 60 days, and have the owner review the contact sheet.
7. Every Monday: freeze another week, look at last week's numbers, and tune the bands.

## Learnt so far

- **InkBrick (2026-11-18):** the owner's playtest found the levels felt too alike, because every level asked the same thing. Varying the **goal**, adding **pieces** that behave differently, and giving every day **a rule of its own** fixed it. Limit how often one layout shape appears (no more than 2 "box in the middle" levels per chapter).
- **InkBrick:** goals with a fixed length (Few Stones) don't rank by time, so they're kept out of dailies.
