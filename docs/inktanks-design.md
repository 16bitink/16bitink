# InkTanks: design

A single-player tank war campaign of 50 hand-made missions. You're a young tank commander, an animal crew, who works up the military ranks from Private to General.

- **Levels, as in our other games:** 5 chapters × 10 levels, picked on a chapter map. Chapter 1 (levels 1–10) is free, chapters 2–5 (levels 11–50) are paid.
- **Every level is a clear mission** with one main objective shown before you start: blow up the fuel depot, get the truck to the village, hold the bridge for 90 seconds. Missions differ from level to level; 13 mission types are mixed through the campaign.
- **Your tank:** gun, hull and drive, each found as Mk I, II or III. Enemies drop their parts when destroyed.
- **Blueprints:** enemy tanks drop blueprints of the parts they carry. Between missions you spend them in the workshop and upgrade your own tank for good. (The player-facing name is **Blueprints**; this doc and the code keep "intel" as the internal term.)

Working name.

Started Nov 12, 2026. Eighth game on 16bit.ink. Branch `feat/inktanks`, folder `games/inktanks`.

**Nov 14 redesign:** the owner didn't like the PUBG mechanics. Gone: the air drop, picking a landing spot, the storm, and last-tank-alive royales. Each level now starts at a set spot with a set mission, on its own map.

## Why this game

- **It wasn't a third eat-and-grow game.** A single-player agar.io was considered first, but InkFish and InkCrab already use that loop.
- **Tanks plus missions is a loop everyone knows.** Battle City and Wii Play Tanks for the tanks, campaign games like Desert Strike and Commandos for hand-made missions.
- **The parts system** comes from Warzone 2100, where every unit is a body, a propulsion and a weapon (stats checked in its `data/mp/stats` files). Each part trades something away: heavy hulls are slow, tracks are tough but slow, and anti-tank rockets beat tracks but are weak against light, fast drives.
- **The gap:**
  - diep.io has tank upgrades, but it's multiplayer and has no missions.
  - The portal tank games are full of ads and are mostly one arena repeated.
  - A tank campaign with real part loot, varied missions and no ads looks open. Run a fact-check agent before release copy says so.

## Pillars

1. **The tank is the loot.** Every crate can change how you play. Picking up a part is a decision, not a stat bump: swap the Cannon for Rockets and you're suddenly strong against heavies but weak against scouts.
2. **Steal their tech.** Every enemy is carrying technology you want. A Heavy with Rockets on the minimap is a target because of its intel, and what you destroy decides how your tank grows.
3. **No dominant build.** Every part costs something: weight, speed, HP, reload or range. Damage depends on the target's drive, so a counter always exists.
4. **Readable at a glance.** Each gun, hull and drive is recognisable from its silhouette, and a Mk III looks richer than a Mk I. Threats are shown before they land: artillery marks, supply-drop smoke, the aim line of a charging Siege.
5. **Never empty driving.** Each level's map is sized to its mission, 2×2 to 4×4 screens, and packed with enemies, crates, breakable buildings and events along the way. A level takes 3–5 minutes. This is our "no empty walking" rule from earlier games.
6. **Every mission is different.** No two levels in a row share a mission type, and each level adds one twist of its own: a new part, terrain, weather or enemy. This is the InkFish playtest lesson ("levels feel the same").
7. **No lost progress, no grind.** A lost mission is retried on the spot, and intel collected is kept win or lose. Rank and research only go up. Playing each mission once, with some bonus objectives, pays for everything the next chapter needs.

## Art (decided, Nov 12)

Settled by the art test in `games/inktanks/dev/art-test.html` and the density test in `dev/detail-test.html`.

- **Camera: top-down, GTA 2 style.**
  - Tanks, shots and pickups are flat straight-down sprites, rotated in code.
  - Buildings, walls, trees and rocks show their south facade with the InkHeroes castle projection `(gx, gy) → (gx, gy - z)`.
  - Roofs and canopies fade when a tank is under or behind them.
  - Shadows come from a fixed sun direction, added in code.
- **Density C:**
  - The native view is 960×540 at scale 2 on 1920×1080, the same as InkHeroes battles.
  - A heavy hull is about 76 px long, and part frames are 128×128.
  - The owner picked C over B (640×360 ×3): "10× cooler".
- **Parts come from 3D models, then a paint pass:**
  - Model in `dev/pixel/tank_parts.py` and render straight down with soft ambient occlusion.
  - PixelLab `edit_image` paints them with part-specific prompts.
  - Then the paint is cut back onto the model's outlines, with a match above 0.9.
  - Every hull has the same turret-ring mount point.
  - A flat grey stripe area is tinted with the team colour; the player is ink blue.
  - Direct PixelLab whole-tank images look nice but bake the turret in, so they're rejected.
  - **Rolling frames:** the paint pass paints one frame per drive, so after installing parts (or repainting the truck or fortress treads) run `python3 dev/pixel/rollframes.py`. It rebuilds the -f1/-f2 frames by sliding the tread along the drive; `--check` lists any frame set that doesn't roll.
- **Structures use the castle recipe** in [inkheroes-castles.md](inkheroes-castles.md): model, render, pack, paint and cut. Breakable pieces keep their states (whole 2, cracked 1, breached 0).
- **Ground:**
  - A few painted textures that tile without visible seams, plus scattered decals: tufts, craters, tyre ruts, flowers, puddles.
  - Streamed in chunks around the camera.
  - Never one giant image (an 8×8-screen map at C would need about 130 MB), and never 32 px Wang tiles, which looked blocky.
- **Rotation:** the stress test decides between RotSprite (32 steps, pre-computed only for parts in the match) and GPU free rotation.
  - At C the pixels are small, so free rotation may look fine.
  - Precomputing every part costs 100+ MB, which can crash older iPhones.
- **Painterly pixel art**, matching InkHeroes' bar. Never code-drawn final art.

## Rules

### A mission

1. **Briefing:** the commander names the main objective and two bonus objectives, with a picture of the map and the target marked.
2. **Start:** you start at the level's set start point, in the tank you fitted in the workshop. There's no drop and no choosing a spot.
3. **The objective stays on screen:** a short line at the top ("Fuel barrels 1/3"), and an arrow at the screen edge to the next target.
4. **Enemies are placed by the level,** not spawned at random: guards at posts, patrols on routes, waves from marked directions, convoys on roads (see Bots).
5. **Loot along the way:**
   - **Crates** stand where the level puts them, usually off the direct path, as a reward for a detour. They hold Mk I–II parts and repair kits.
   - **Wrecks:** a destroyed tank leaves its best part, to swap in for this level, plus **intel** on all its parts, which you keep (see Intel and the workshop).
6. **Swapping:** drive over a part and its card shows, with the stat change against what you have (green up, red down). Hold swap for 0.5 s and the old part drops where you stand. Swapping a gun resets its reload.
7. **Winning and failing:** the main objective done wins. Your tank destroyed, or a mission fail (the truck lost, the timer out), fails, and you retry on the spot. Intel picked up is kept either way.
8. **Length:** 3–5 minutes.

### Tank stats

These are starting numbers. Balance them with a whole-chapter bot-vs-bot simulation, never by guessing armies (the InkHeroes rule). **Sim-tuned, Nov 12:** HP in play is the table × 2.5 (`HP_SCALE`); at × 1, chapter 1 fights were over in about 30 s.

- A tank's **HP** is hull HP × the drive's HP factor.
- **Speed** is the drive's base speed × the engine factor. The engine factor is the hull's engine power ÷ total weight, clamped to 0.7–1.1, so a heavy gun on a light hull crawls.
- **Damage taken** is max(dmg × counter − armour, dmg × counter × 0.33). Armour splits into kinetic and heat once heat weapons arrive in chapter 3.

| Hull | HP | Armour | Weight | Engine |
|---|---|---|---|---|
| Light | 120 | 3 | 6 | 12 |
| Medium | 200 | 7 | 12 | 16 |
| Heavy | 320 | 12 | 20 | 21 |

| Drive | Base speed (native px/s) | HP factor | Weight | Handling |
|---|---|---|---|---|
| Wheels | 190 | ×1.0 | 2 | Fast turns, skids on sand |
| Half-tracks | 160 | ×1.4 | 4 | Middle in everything |
| Tracks | 130 | ×1.9 | 7 | Turns on the spot, ignores sand and mud |
| Hover (ch3) | 220 | ×0.9 | 3 | Crosses water, drifts |

| Gun | Damage | Fire | Range (px) | Shot | Weight | Notes |
|---|---|---|---|---|---|---|
| Machinegun | 6 | every 0.1 s | 280 | fast tracer | 1 | Shreds light drives |
| Cannon | 40 | every 1.1 s | 360 | shell | 4 | All-rounder, breaks brick |
| Rockets | 2 × 30 | every 2.4 s | 400 | slow rockets, 20 px splash | 3 | Anti-heavy, breaks brick |
| Mortar (ch2) | 45 | every 2.8 s | 200–520 | lobbed over walls, 40 px splash | 5 | Has a minimum range |
| Flamer (ch3) | 5 per tick (heat) | stream | 150 | cone | 2 | Ignores kinetic armour |
| Laser (ch4) | 35 (heat) | every 0.9 s | 480 | instant beam | 3 | No travel time |
| Rail (ch5) | 90 | every 3 s | 640 | pierces walls and tanks | 6 | Charge-up shows an aim line |

**Counters:** damage × this, by the target's drive.

| | Wheels | Half-tracks | Tracks | Hover |
|---|---|---|---|---|
| Machinegun | 1.3 | 0.9 | 0.5 | 1.3 |
| Cannon | 1.0 | 1.0 | 0.9 | 1.0 |
| Rockets | 0.7 | 1.1 | 1.3 | 0.6 |
| Mortar | 0.9 | 1.0 | 0.8 | 1.2 |
| Flamer | 1.1 | 1.0 | 0.9 | 1.3 |
| Laser (ch4) | 1.0 | 0.95 | 0.85 | 1.2 |
| Rail (ch5) | 0.9 | 1.0 | 1.15 | 0.85 |

**Tiers:** five, Mk I to Mk V, each +20% on the part's main stat (Mk V is +80%). Main stats: gun damage, hull HP, drive speed. Art shows the tier through plating, rivets, extras and wear. Mk I–III go from bare to field kit (sandbags, spare links, rust); Mk IV and V (Nov 15) are Mk III's model with factory kit instead: sandbags become riveted armour blocks (IV) or reactive-armour bricks (V), no rust, applique plates, and camouflage paint, two-tone on IV and three-tone on V, so a chapter 3–5 enemy reads as a newer tank at a glance. Mk V adds the advanced kit (quad MG, radar, autoloader, radiator wings, slat armour). Pipeline: `dev/pixel/mk45/build.py` (render, pack, cut, install; run after the Mk I–III installs, then `rollframes.py`); contact sheet of every family Mk I–V: `python3 dev/pixel/parts/tiers_sheet.py`.

**Tier colours** (owner, 2026-11-14), the rarity order every 16bit.ink game uses, with InkHeroes' shades: Mk I grey, Mk II green, Mk III blue, Mk IV violet, Mk V orange. The numeral on part icons, "Mk N" in the workshop, part names on the briefing and swap card, and the ring round a part lying on the ground all take the tier's colour (`MK_COLOUR` in src/logic/parts.ts).

### The Kit slot (from chapter 2)

A fourth slot for gear:
- **Armour plate:** +armour, +weight.
- **Radar:** a wider view, enemies show on the minimap when they fire, and Recon is faster.
- **Cargo rack:** carry 3 repair kits instead of 1.
- **Smoke:** a cover cloud, 20 s cooldown.
- **Mines:** drop up to 3.

### Consumables

- **Repair kit:** +40% HP over 2 s, and you can't fire while it works.
- **Shield:** blocks 3 hits or 6 s.
- **Smoke grenade:** one-off smoke cover.

### Vision and cover

- You see about one screen around you. Bushes and tall crops hide a tank that isn't firing, and roofs hide tanks inside.
- Firing reveals you on enemy minimaps for 2 s.

### Terrain

- Brick walls, fences and sheds break in 2–3 hits. Houses lose walls, not whole.
- Tracks and Heavy hulls flatten fences and small trees by driving through them. Rocks and big trees are solid.
- Water stops ground drives, and bridges are choke points.
- Sand slows Wheels by 30%. Mud slows everything except Tracks by 20%.

## Tactics (approved Nov 14; Phases A and B built Nov 14)

The owner's playtest: "hard and monotonous: you can't plan anything, you can't get any advantage, your only hope is your reaction." The cause is in the engine: bots see through walls, fights are even (same tanks, no flank damage), cover only delays a fight, and the player has no tool but the gun. Research on Wii Play: Tanks!, Battle City, World of Tanks, Enter the Gungeon and Into the Breach points to one fix: give the player information and tools, so a fight is won before it starts.

### 1. Stealth and sight (Phase A)
- **Walls, buildings and rocks block sight,** not only shots. A bot knows where you are only if it sees you, hears you fire nearby (about 300 px), or is called by an alarm.
- **Alert states, shown over each enemy:** calm (patrols its route, turret forward, sees about 340 px in a 140° cone) → **?** suspicious (heard or glimpsed you: turns and checks the spot for 2 s) → **!** alert (fights, calls the alarm). The player can read every enemy at a glance, as Into the Breach shows every threat.
- **Bushes, crops and roofs** hide a tank that isn't firing; only an enemy within 60 px spots it. Firing reveals you for 2 s, so the plan is: pick a firing spot, shoot, slip back into the bush.
- **Ambush bonus:** a hit on a calm or suspicious enemy does ×2 damage. Stealth pays, and every fight can be opened on your terms.

### 2. Cover you can fight from (Phase A)
- **Low cover:** sandbags, fences, crates, hay bales and low walls. A shot passes over low cover in the first 50 px of its flight. Hug the sandbags and you fire out, while their shots hit the bags.
- **Cover has HP and shows it:** whole, cracked, breached (the art already has states 2/1/0). Breaking cover is a clock the player can see.
- **Bots shoot your cover:** when you're behind breakable cover, one enemy shoots the cover down while others flank. High walls and buildings block shots both ways (no peeking).

### 3. Gadgets: a fourth slot from chapter 1 (Phase B)
Replaces the chapter-2 Kit slot idea. Pick one gadget in the briefing. 2 charges a level, crates can give more. Key G or a third touch button.
- **Mines:** arm after 1 s, trigger when an enemy rolls within 28 px: 90 damage, 40 px splash, and a broken track (×0.5 speed for 3 s). Enemies don't see your mines unless they watched you lay one (Wii Play: Tanks!), so you can lure a chaser over one.
- **Oil slick:** a 60 px patch for 8 s; enemies in it slide at ×0.4 speed and can't turn well. Safe for the player, good for Escort and Hold.
- **Smoke:** a 90 px cloud for 6 s that blocks sight both ways. Breaks line of sight to retreat, repair or cross open ground.
- Later chapters add more: a decoy, a call-in, an EMP.

### 4. Readable danger (Phase A)
- **Big shots are telegraphed:** Cannon and Rockets bots show a thin aim line for 0.4 s before they fire (the Rail already does). Machineguns don't. You dodge by reading, not by twitch.

### 5. Flanking (Phase C)
- **Side hits ×1.3, rear hits ×1.6,** by the hit angle against the target's hull. Heavy turrets turn slowly, so getting behind a Heavy is a real plan. A "Rear hit!" popup teaches it.

### 6. Levels built for plans (Phase C)
- The briefing map shows enemy positions and patrol routes (recon), as Door Kickers does.
- Every level has 2–3 approaches: an open road, a covered flank, a bush line. Sandbag lines near objectives.
- Enemy types per level act differently (turret, patrol, mine-layer, rusher), so each level reads as a small puzzle (Wii Play: Tanks!).

### Phases
- **Phase A (engine, biggest lever), done Nov 14:** sight blocked by walls, alert states and icons, the ambush bonus, low cover, cover HP, bots shooting cover, telegraphed big shots. Retune chapter 1 with the lab after (still to do).
- **Phase B, done Nov 14 (sounds added Nov 14, see "Sound" below):** the gadget slot (mines, oil, smoke), their art, a gadget pick in the briefing.
- **Phase C:** flank damage, recon on the briefing map, chapter 1 levels re-laid for 2–3 approaches.

### Sound (Nov 14)
Synthesized with Web Audio like the other games (`src/audio/`), except the gun shots: the user found the synthesized guns strange (Nov 14), so cannon (two takes), machine gun, rocket, mortar, flamer, laser and rail are PixelLab-generated recordings in `src/audio/samples/` (trimmed, −16 LUFS, mono MP3, ~110 KB together; `samples.ts` has the levels). They load after the first gesture; until then the synth recipe plays. Distant shots are low-passed. `sfx.ts` maps every match event to cues (pure, `test/sound.test.ts`); `synth.ts` holds the recipes and level trims; `loops.ts` runs the player's engine (pitch follows speed; tracks clatter, Hover whines), storm wind and the cargo helicopter's rotor; `missionSound.ts` glues one mission. The player's own shots play centred at full level, enemy sounds are placed around the camera (pan, fade out by 0.75 screen widths beyond the view) at 0.7. Structures sound by material (crumble, timber snap, fuel blast). A repair kit sounds when the kit count drops. Every button clicks. The menu's Sound switch mutes all of it. The dev mission page plays sound too (`&mute=1` to silence).

### Music (Nov 15)
Seven instrumental tracks, PixelLab `create_music` then `make_music_loop` (the loop takes carry loop points; InkHeroes used ElevenLabs Music, not available this session): **theme** (menu, map, briefing, workshop, results; brass and snare march, 37 s loop), one per chapter for missions (**meadowlands** light marching, **dustflats** twangy desert, **mirefen** bassoon and marimba, **frostridge** celesta and tremolo strings, **deepwood** heavy brass and timpani; 42-57 s loops) and **victory** (20 s fanfare, plays once on the ending screen). Mono 64 kbps MP3, 2.4 MB together in `src/audio/music/`. `dev/music/cut_tracks.py` cuts a take (raw takes in `dev/music/raw/`, git-ignored) to 0.5 s before the loop start to 0.5 s after the loop end, bakes a 0.12 s equal-power crossfade into the seam so the loop end flows into the loop start (every seam step within a normal sample step), and writes `src/audio/tracks.ts` from `dev/music/points.py`. Dust Flats' first song was refused by the music service (matched a catalog recording), so its second take is used. `src/audio/music.ts` (`MusicPlayer`) decodes lazily, loops on Web Audio, crossfades 1.2 s and keeps two tracks decoded; `musicPlan.ts` has the pure rules (`trackFor(screen, chapter)`, levels: 0.5 on screens, 0.34 in a mission, 0.18 paused; test `test/music.test.ts`). `SoundBoard.setMusic` waits for the first gesture and isn't fetched while muted; `setMusicLevel` ducks it. `App.music()` picks the track on every screen; `MissionRun` lowers it while paused. The one Sound switch mutes music and effects together (no separate music switch yet; InkHeroes' `soundSettings.ts` would be the model).

### As built (Nov 14)
Code: `src/logic/bots/perception.ts` (sight, hiding, the shot line), `bots/awareness.ts` (alert states, hearing), `bots/brain.ts` and `bots/control.ts` (cover shooting, the telegraph, mine avoidance), `bots/playerBot.ts` (the sim's stand-in), `match/gadgets.ts` and `match/gadgetUse.ts`, `match/combat.ts` (ambush, low cover); the view in `src/render/alertView.ts`, `render/gadgetView.ts`, the aim line in `render/fx.ts`, the HUD and briefing picker. Tests: `test/tactics.test.ts`, `test/gadgets.test.ts`.
- **Sight:** walls, buildings, rocks, gates and smoke block it; low cover, bushes, fences and small trees don't. The player's view is the screen, so this only limits bots.
- **Alert states** as the doc says, with these numbers: calm sees its role's sight (guard 340, patrol 380, turret 400 px) in a 140° cone round the turret; a calm guard or turret sweeps its turret ±40° round its post's heading, so a gap opens now and then. A glimpse (or a shot heard within 300 px) makes it **?**: it stops and turns to the spot. Still in sight **0.6 s** after the glimpse: **!** (spotted). Not seen again for **2 s**: calm. An alert bot sees all round to 440 px and calms back to ? after **8 s** without seeing anyone, then checks where it last saw you. Hit, or called by the alarm: alert at once. Waves, hunters and boss turrets are always alert. Only alert bots raise the alarm.
- **Hiding:** bushes, crops, roofs and smoke hide a tank that hasn't fired for 2 s; an enemy within **60 px** (was 100) still spots it.
- **Ambush ×2** on any player hit (shell, splash, mine) on a calm or suspicious enemy; the hit alerts it, so a Machinegun burst gets ×2 once. The HUD pops "Ambush ×2".
- **Low cover:** a `low` structure flag. Sandbags (H and V, 120 HP, any gun breaks them), hay bales (60 HP), crates (40 HP, flattenable) and fences. A shot passes over low cover for its first 50 px of flight (about 70 px from the tank's centre); high cover blocks both ways. Levels 1 and 4 have sandbag lines near their objectives.
- **Bots shoot cover:** one bot per target (COVER_SHOOTERS = 1) shoots breakable cover in the way, aimed where it last saw you, for up to 6 s; the others flank. A bot that loses you behind a wall drives to where it last saw you; it never shoots at where it can't see.
- **Telegraph:** Cannon and Rockets bots lock their turret and show a thin red aim line for **0.4 s**, then fire along it (it doesn't track you during the hold). This cuts their fire rate a little (a tuning pass follows). Machineguns and the player don't telegraph.
- **Gadgets:** 2 charges a level (Mk I; tiers below), up to 2 more from crates (12% of rolled crates that aren't kits hold a gadget), one use per 0.6 s, key G or the big phone button. The pick is saved (`SaveData.gadget`, default mines). Mines: arm 1 s, 28 px trigger for enemies only, 90 damage (raw, not through armour), 40 px splash at half to other enemies, broken track ×0.5 for 3 s; only bots that saw it laid steer round it. Oil: 60 px, 8 s, enemies at ×0.4 speed and ×0.35 turning; the player is safe in it. Smoke: 90 px, 6 s, blocks sight both ways and hides a tank inside.

- **Gadget tiers (Nov 14):** every gadget has Mk I–V in the tier colours, opened at the same ranks as part tiers (Sergeant II, Lieutenant III, Major IV, Brigadier V). They're paid for with the gadget's own blueprints (3 / 6 / 10 / 15), earned by using it: 1 for every use (Nov 15: hits alone left most players at Mk I), 1 per enemy a mine or a burning slick hits (2 if it dies), 1 per enemy that slides into your slick, 1 per enemy that had you in sight when you pop smoke (up to 3), and 1 for a crate charge picked up while full. Kept win or lose. Workshop tab "Gadgets"; the briefing picker shows each gadget's Mk and its rule at that Mk. Numbers in `src/logic/gadgetTiers.ts`:
  - **Mines:** 90 damage +15 a Mk; one more charge at Mk II and Mk IV (2, 3, 3, 4, 4). Mk III: 36 px trigger (was 28), broken track 5 s. Mk V: each press scatters 3 smaller mines across your track, each at 60% damage.
  - **Oil:** 60 → 88 px, 8 → 12 s. Mk III: an enemy firing from inside it gets +0.3 rad spread. Mk V: a shot of yours over it sets it alight (a faint orange rim shows it can be lit): it burns 4 s, 16 damage every 0.5 s to enemies in it, then it's gone. Flame art: PixelLab effect "InkTanks burning oil flame" (`world/fx/flame.png`).
  - **Smoke:** 90 → 125 px, 6 → 10 s. Mk III: you repair 3% of max HP a second inside your own cloud. Mk V: every enemy hunting you loses track when it pops (forgets where it saw you; alert ones go back to ?).
- **Found gadgets:** half of rolled gadget crates hold a set kind. Your own kind is a charge; another kind is a one-use "found" gadget that takes the button (gold-lit, count 1) until used, then the button is yours again. One found at a time: a second stays on the ground. Found gadgets use your workshop Mk for that kind. Levels can fix a crate to a gadget (`content: { gadget: 'smoke' }`) for a planned moment.

## Bots

The same parts and rules as the player. They're the hardest code, so they're built and measured first.

- **Roles, set by the level:**
  - **Guard:** stays near its post and fights what comes in range.
  - **Patrol:** drives a route, and turns to fight when it sees you.
  - **Wave:** arrives from a marked direction and heads for the objective (the hold zone, the truck).
  - **Convoy:** follows a road to an exit; it only shoots back.
  - **Hunter:** comes after you wherever you are.
  - **Runner:** flees to an exit (Chase missions).
  - **Turret:** doesn't move.
- **Alarm:** a guard that's hit or sees you calls the guards near it. Sneaking past or picking off one at a time is a real choice. *(Engine, Nov 14: patrols and turrets raise it too, called guards and patrols within 420 px answer, and a called bot that then sees you calls again.)*
- **Fighting:** when a target is in range, bots fight with the parts they carry, kite if they outrange you, and back off to repair at low HP. *(Engine, Nov 14: enemies carry no repair kit unless the level gives one, so most fight to the end; with a kit each, chapter 1 fights doubled in length.)*
- **Difficulty per chapter:** aim error, reaction time, how well they kite (retreat while firing) and focus fire.
- **Movement:** a coarse navigation grid plus flow fields to the role's goal. Local steering avoids rocks and other tanks.
- **Stuck tanks (engine fix, Nov 15).** The stand-in sat out level 22's clock and, on a fast drive, burned to death wedged in level 42's trees. Causes and fixes: (1) a bump could shove a tank's centre over water, and then no move was allowed out: now a bump never shoves a tank further off its ground (it slides along the bank instead), and a wedged tank may drive out (`unwedges`: centre back on its ground, more of it on its ground, or heading for ground close ahead; never riding along in the water). The player and our side get this on every level, enemies from level 21 as before (`WEDGE_FIX_FROM`); the map-edge clamp is on for our side everywhere. (2) A burning tree's blaze is *dear* in the nav grids (`SOFT_COST`), not closed: a fire across the trail used to cut the field, and a bot with no field drove straight at its goal into the trees. (3) Fences: Wheels and Half-tracks can't crush them, so they steer by a grid where fences are dear (built only on lands with fences); Tracks and Heavies keep the open grid. (4) From a closed or cut-off cell (a wall's margin, after a bump) a bot heads for the best nearby cell it can drive straight to (`rejoin`), not the field's pick through the wall; the field never steps diagonally past a closed corner. (5) Stuck twice in one spot, a bot backs out swinging its tail, then goes off to the side (Wheels and Half-tracks used to turn with the nose still pressed in). (6) The stand-in: a part is "underneath" when it's the nearest in reach (or the one it drove for), it stops once a pickup is in reach, gives up on one after 15 s of driving for it, and a swapped-out part drops on dry land. (7) Escort: a follower truck a felled tree holds up behind the lead is the one the stand-in goes back for. Measured (`lab --all`, 8 seeds × 50 levels): passes 358 → 381 of 400, "time" ends 20 → 3; level 22 5/8 → 8/8, 42 (cannon4/medium4/halftracks4) 2/8 → 8/8, 19 5/8 → 8/8, 25 6/8 → 8/8, 26 2/8 → 6/8, 41 6/8 → 8/8; campaign (3 seeds) attempts 160 → 153, time ends 4 → 1. Left: level 26's middle causeway is closed at its mouth by the sandbags at (1760, 740) for any ground drive (a level layout fault, not touched), and rarely a tank rides the bank into a pocket the grid thinks is closed (level 22 seed 21). Tests: `test/stuck.test.ts`.
- **Crews are animals** (badgers, boars, weasels, crows, otters…). They show in the kill feed and on the result screen, never as people. Names use plain A–Z letters.

## Story frame

After the old world, its tank depots lie scattered across the land, and rival animal clans fight over them in the Scrap Wars:
- **Boars:** heavy, slow tanks.
- **Weasels:** fast scouts.
- **Crows:** they loot everything.

You're a young badger commander in the Ink Brigade. Each chapter has a main rival clan, and in some levels the clans fight each other as well as you. Each clan's tanks have their own stripe colour and favourite parts, so you can see whose tech is in front of you.

The commander who briefs you is an old animal officer, named in the chapter 1 content pass. Names use plain A–Z letters.

## Levels and the chapter map

- **The chapter map:** each chapter is one painted land, shown as the level select, like InkCrab's beach map. The 10 levels are spots on it with a path between them, and the medals earned show on each spot.
- **As built (Nov 15):** one painted overview per chapter, `src/art/pixel/ui/maps/ch1–5.png` (PixelLab `create_image_pro`, 688 × 384, upscaled ×2 pixelated, so the map world is 1376 × 768). The road is painted, so there's no drawn trail line; the ten spots in `src/content/chapterMaps.ts` were placed on it by eye (inside `SPOT_BOX`, at least ~100 px apart, clear of the top panel and the chips on a 844 × 390 phone). The camera fits `SPOT_BOX` but never shows past the painting. Chapter 1's painting loads with the boot, the others when first shown. Chapter 5's road past the Hive cells was inpainted. To repaint a chapter: generate a new 688 × 384 picture, then move its spots onto the new road.
- **Each level plays on its own map,** a slice of that land sized to the mission (2×2 to 4×4 screens), built from the chapter's ground set and structures.
- **Levels unlock in order.** Any open level can be replayed for missed medals.
- **Level numbers run on:** chapter 2's first level is Level 11 in the HUD, the map, cards and docs.

## Missions

Every level has a short briefing, one **main objective** and two **bonus objectives**.
- **Medals:** each objective done earns a medal (up to 3 per level). Medals only add up, and a replay keeps the medals you already have.
- **Passing:** you pass by completing the main objective. A failed mission restarts on the spot.

| Type | Main objective | What makes it play differently |
|---|---|---|
| **Assault** | Destroy every enemy tank in the area | Guards and patrols around a camp; the alarm decides how many you fight at once |
| **Raid** | Destroy marked targets: fuel barrels, a radar mast, pipeline valves | Targets are breakable structures; some levels add a timer |
| **Escort** | Get a supply truck to a point | The truck follows a road; enemies hunt it, not only you |
| **Hold** | Hold a zone for N seconds | Waves arrive from marked directions |
| **Ace** | Destroy a named enemy ace | Aces carry rare tech (prototype parts) found nowhere else |
| **Rescue** | Break the cages and bring the captured crews home | Freed crews follow you on foot at once, keeping further back (160 px) while enemies are close; they can be hit (enemies don't aim at them: losing one fails). A standing cage shows its otter inside |
| **Ambush** | Stop a convoy before it leaves the map | Pick where to cut it off; it doesn't wait for you |
| **Salvage** | Take a crashed prototype to the pick-up | Carrying it slows you and every enemy comes for it |
| **Breakout** | Reach the exit before the timer | A gauntlet: artillery marks, hazards, a race against time |
| **Recon** | Get close to 3 marked spots without being seen | Bushes, reeds and roofs hide you; being seen calls reinforcements, not a fail |
| **Capture** | Take 3 flags and hold them all at once | Enemies try to retake them, so you keep moving |
| **Chase** | Catch a fleeing courier before it reaches its base | A faster enemy; cut corners, use shortcuts |
| **Fortress** | Destroy the chapter's boss | Level 10 of every chapter. A huge multi-part tank with breakable turrets; its hull is shielded while any stand. Phase 2 (owner, 2026-11-14: "once you destroy all towers the boss is useless"): the bare hull is enraged and charges you down a telegraphed red lane (1.3 s warning, 70 ramming damage); a charge into a wall dazes it for 3 s and it takes ×1.5 damage. The fight becomes baiting charges into walls |

**Levels mean something end to end** (owner, Nov 14). A finish line is never a bare circle: something in the world acts when you get there.
- **Salvage:** a cargo helicopter flies in from the nearest map edge once you pick the cargo up, lands on the pad and waits. Drive the cargo under it: it loads (1.5 s), lifts and flies off, and the mission passes when it's away (`objectives/heli.ts`, `render/heliView.ts`, PixelLab body and rotor in `world/fx/heli-*.png`).
- **Rescue:** a pick-up truck waits at home; the crews climb aboard and it drives off the map with them.
- **Escort and Breakout:** they end at our base: white cement walls and square cement gun towers with one of our turrets on the roof (Warzone 2100's hardpoints were the owner's reference; our side looks modern, the stone fort reads as ancient). A tower (`LevelDef.allies`, `{ kind: 'tower', at, gun, wake }`) holds fire until you come within `wake` px (650), then shoots enemies in sight with good aim and no warning line. Enemies don't target it and shots fly past it; its base blocks driving only. Cement pieces: `dev/pixel/concrete/build.py` (one wall piece is 64 px: lay runs 63 px apart).
- New mission types get the same treatment when they're built: a flag is a real flagpole, a recon spot a camp you photograph, a chase ends at the courier's base gate.

Bonus objectives are written per level and shown in the briefing. Examples: destroy 5 tanks, win without a repair kit, finish under 3 minutes, never set off the alarm, keep the truck above half HP, destroy a Heavy with Rockets.

### The ending (Nov 15)

Winning level 50 turns the results' next button into a glowing gold **Victory!**, which opens the ending (`src/ui/ending.ts`, numbers in `src/logic/ending.ts`). It has two steps. First, a fanfare and the victory painting fill the screen (`art/pixel/ui/victory.png`, PixelLab, styled after the commander's portrait): the badger salutes from a tank in the Deepwood clearing beside the wrecked Harvester, with Brigade flags and fireworks. "Victory! The war is won" sits over it, with a Continue button. Second, over the dimmed painting: the commander's last words (Tusk, Wisp and Quill take their crews home, the clans lay down their guns), the General's shoulder boards, the war in numbers (missions, medals, blueprints collected, parts unlocked, XP), each chapter's medals, and how many medals are still out there to replay for (never a must). Once the war is won, the map's top-left corner has a gold Victory button that opens the ending again. Dev: `index.html?screen=ending&save=won`.

## Intel and the workshop

This is the owner's "pick up technology from the enemies and upgrade your own tank".

**In the mission:**
- A destroyed enemy drops **intel** for each part it carries, worth 2 for Mk I, 3 for Mk II, 5 for Mk III, 7 for Mk IV and 9 for Mk V (Mk I–III sim-tuned: at 1/2/4 the no-grind check passed on 2 of 4 seeds). Aces drop much more, plus their prototype.
- Intel is counted per **part family**: Machinegun, Cannon, Rockets, Light hull, Medium hull, Heavy hull, Wheels, Half-tracks, Tracks, and later Mortar, Hover and the others.
- **Recon (chapter 2+):** staying within range of an enemy for 3 s without being seen gives 1 intel on its parts. With the Radar kit it takes 1.5 s.
- **Target choice:** you read an enemy's tech from its tank: each part and Mk has its own art (no icons over enemies, owner Nov 15). You pick targets by the tech you want: a Heavy with Rockets is worth hunting if you're short on rocket intel.
- **Tags (Nov 15):** `render/tagView.ts` (rules in `tagLogic.ts`, tested). Only aces and bosses are tagged: a gold name plate over the tank, aces also the generated winged-star emblem (`art/pixel/ui/ace-emblem.png`). Hidden, fogged and off-screen tanks get none. Allies (wingmen, chapter 5's freed clan crews) wear their name in Brigade blue. Freed clan crews also wear our blue stripe, not their clan's: level 49's red-striped Boar ally beside red Boar enemies was confusing (owner, Nov 15). Red, gold, grey or orange always means an enemy. Part icons under every enemy were built and then removed: the owner found them too much information. Target choice by tech comes from the parts you see on the tank itself (Mk IV–V have their own art).
- **Intel is kept whatever happens**, win or lose. Loot parts are only for the mission; intel is what you keep.
- **Chapter gear grades (owner, Nov 15):** enemies drop only what they carry, and each chapter's enemies carry gear a tier above the best the workshop could give you before it, so their wrecks are worth looting when you arrive with last chapter's tank (and not once you've upgraded to the chapter's top, which is fine). Chapter 1 Mk I–II, chapter 2 Mk II–III, chapter 3 Mk III–IV, chapters 4–5 Mk IV–V (aces may carry one more). Rolled crates follow the same grade (`crateMk` weights Mk I–V in each chapter's kit). The raise kept each enemy's HP by lowering its `hpMult` (Mk raises HP); their guns hit harder, so escort trucks, the barge and rescue crews got more HP (levels 14, 19, 23, 32, 34, 45, 48), and levels 11, 22, 28, 29, 32 and 43 a further HP cut, measured with `lab --campaign`. In that run (4 seeds) the stand-in fits 57 parts from the ground in chapters 2–5, against 5 before, and passes every level.
- **A level's prize (Nov 15):** a level can name a family you take from the enemy for good (`prize`). Level 21's Hover is the Weasels' spare at their dock: the HUD points to it until fitted, the stand-in takes it first, and fitting it unlocks Hover in the workshop (win or lose), with a line on the results. Before, level 21 fitted a Hover on you (`issue`, still in the engine, now unused).

**Between missions, in the workshop:**
- **Unlock a family** (3 intel): you can now fit it in your starting tank. Before that, a family exists for you only as loot inside missions.
- **Raise its Mk** for your starting tank. Mk II costs 8 and needs Sergeant; Mk III costs 20 and needs Lieutenant; Mk IV costs 35 and needs Major; Mk V costs 55 and needs Brigadier.
- **Research lines**, like Warzone 2100's research, 3 steps per line at 5, 10 and 15 intel, each step +8%:
  - guns: Damage, Reload
  - hulls: Armour, HP
  - drives: Speed, Grip (turning, and sand and mud penalties)
  - Research applies to that family whether it's in your starting tank or swapped in from loot.
- **Fitting your starting tank** is free and can change every mission.
- **The workshop screen:** your tank in the middle, a tab per slot, and a card per family showing "Cannon blueprints: [icon] 9" with the blueprint icon (the blue sheet the enemies drop) on every amount and cost, never a bare number. A one-line explanation sits under the title. Buttons are bright when you can pay, dimmed with "need 3 more" when short of that part's blueprints, and locked with the rank name ("needs Sergeant") when the rank gates them. Blueprints are per part: Cannon blueprints only buy Cannon upgrades. A badge on every Workshop button (map, briefing, results) counts the upgrades you can afford now. Something new to look forward to, never a streak.

**Balance:**
- Bots in later chapters field higher Mk tiers and their own research levels, so the counter race holds and research never trivialises a chapter.
- **No-grind check:** the whole-chapter bot sim plays each mission once and completes about half the bonus objectives. It must afford a sensible setup for the next chapter: a Mk II gun with 2 research steps, and its counter family unlocked.

### Account saves (Nov 15)

A signed-in player's save follows them between devices (`src/logic/accountSave.ts`, merge in `src/logic/saveMerge.ts`), as in the other games. On boot the game pulls the account's copy (waiting 4 s at most, alongside the paid levels), merges it with this device's save, stores the result locally, and pushes it back when the account is missing something. Every local save pushes to the account 1.5 s later (a run of workshop buys goes as one), and at once before buying, exiting or unmounting. Offline or failing, it only warns and plays on the local save; a failed boot pull is retried before the next push, so a push never overwrites a copy it never saw. Unreadable account data (garbage, another version) is ignored and overwritten with the local save; it never wipes local progress.

Merge rules (`mergeSave`): medals OR per medal; XP max; unlocked families union; Mk per family, gadget Mk and research steps max; lifetime blueprints (`intelTotal`) max per family; ace prototypes union, best Mk per family; seen-blueprints tip OR. Spendable blueprints (`intel`, `gadgetIntel`), the fitted tank, the picked gadget and the wingmen picks come from the copy further along: more passed levels, then more XP, then more lifetime blueprints, this device on a tie. The fitted tank is then refitted to what the merged progress owns. Sound stays this device's. Dev: `index.html?save=new&account=mid` plays signed in with that save in an in-memory account (`account=empty` for none; `window.__account` shows what was pushed).

## Military ranks

You start as a Private. **Rank XP:**
- main objective: 100
- each bonus objective: 50
- each tank destroyed: 10
- first win of a mission: 25

Rank only goes up. It never gates a mission or a chapter; it gates perks. The thresholds are set so that playing each mission once reaches each rank by the mission shown. Thresholds (Nov 15, from `lab --campaign`, all 50 levels with progress carried): Corporal 480, Sergeant 1100, Staff Sergeant 2000, Lieutenant 3200, Captain 4500, Major 5900, Colonel 8900, Brigadier 11300, General 12500. In 4 campaign seeds every rank lands on the level the table names (Brigadier at 45 on 3 of 4). Before, the stand-in was a General by level 42 and had Mk V by 34, which made loot useless from chapter 2 on.

| Rank | Reached about | Unlocks |
|---|---|---|
| Private | Start | The workshop, 1 repair kit |
| Corporal | Level 3 | Carry 2 repair kits |
| Sergeant | Level 6 | Mk II in the workshop |
| Staff Sergeant | Level 10 | **Call-in:** one supply drop per level (R): a repair kit and your gun's family a Mk up, where you aim |
| Lieutenant | Level 15 | Mk III parts and gadgets in the workshop (the Kit slot was replaced by gadgets, Tactics §3) |
| Captain | Chapter 2 end | **A wingman:** Thistle, a badger crew on your tank a Mk lower (not on Recon) |
| Major | Chapter 3 | Mk IV in the workshop; **call-in:** one artillery strike per level (F) |
| Colonel | Chapter 4 | A second wingman, Rowan |
| Brigadier | Chapter 5, mid-chapter | Mk V in the workshop; ace prototypes you've fitted can go on your tank in the workshop |
| General | The final fortress | The top rank's gold-braided boards (nothing else unlocks; the ending comes from winning level 50, not the rank) |

The rank badge shows on the commander's portrait, in the HUD and on the result screen, with a short promotion ceremony when you rise.

### Rank perks (Nov 15)
Built in `src/logic/match/wingmen.ts`, `match/callIns.ts`, `logic/workshop.ts` (prototypes); tests in `test/perks.test.ts`. The promotion screen's lines (`RANK_UNLOCKS`, `src/ui/results.ts`) say only what these do.
- **Wingmen (Captain 1, Colonel 2):** Thistle and Rowan, badger crews of the Ink Brigade (clan ink, team 0), on your starting tank one Mk lower per part (Mk I at least, never a prototype), no research, no kits. They start beside you (60 px back, 60 px to each side), follow within 240 px and fight what they see, with chapter 1's aim and reaction whatever the chapter (a young crew: they help, they don't win your fights). They follow your lead: no opening shot on an enemy that hasn't spotted anyone until you've fired in the last 4 s or they're hit, so sneaking still works. Their kills are theirs (bonus "Destroy N" doesn't count them) but pay you the usual 10 rank XP each (the report's `squadKills`): without that the stand-in lost ~500 XP and stopped reaching General. They take no kits, parts, gadgets, supply drops, prizes or the salvage prototype; blueprints they drive over are yours, as from any of our tanks. A wingman's death fails nothing. They sit out **Recon** (24, 39, 43): scouting unseen. Everywhere else they count as ours (a Capture flag turns for them too, as for chapter 5's freed crews).
- **Supply drop (Staff Sergeant), key R or the crate button:** once a level. It lands along your aim at the cursor's distance (a thumbstick: 110 px ahead), at most 480 px away, inside the map and on a drivable cell, after a 2 s green landing ring (the crate drops out of the sky for the last 0.9 s; art: the world's `supplyDrop` structure). Only you open it: a repair kit and a part of your fitted gun's family one Mk above it (Mk V already: a second kit).
- **Artillery strike (Major), key F or the bomb button:** once a level, along your aim at the cursor's distance (a thumbstick: the nearest enemy within 0.35 rad of the aim, else 300 px), at most 480 px. A 2.5 s red ring with the bomber's shadow and the falling bomb (`bombView.ts`), then a 100 px blast: 45% of each tank's max HP, armour or not (12% to a boss and its turrets), you and your wingmen included; 300 damage to structures in it (breaks brick). Kills are yours (XP, the kill count), with no victim record (it wasn't your gun). The HUD shows each call-in's icon, gold while coming down, grey once used; events `callIn` (called / landed) have sounds in `sfx.ts`.
- **Ace prototypes (Brigadier):** an ace's wreck leaves its best part as a prototype at its own Mk, Mk III at least (it was always Mk III, which made chapter 4–5 aces' Mk V parts drop as Mk III). One you fit in the field is kept in your progress (`Progress.protos`, the best Mk per family, win or lose; old saves load with none). The workshop lists it on its family's card in its Mk's rarity colour, with Fit once you're a Brigadier ("needs Brigadier" before), even for a family you never unlocked. The results line names it when it's kept.
- **The Wingmen tab (owner, Nov 15):** the workshop has a Wingmen tab (`src/logic/wingmanFit.ts`, `ui/workshop.ts`): a card per wingman (Thistle from Captain, Rowan from Colonel; "needs Captain" / "needs Colonel" before) with its tank picture and a gun / hull / drive picker from the families you've unlocked. Every part fits one Mk below your own workshop Mk for that family (Mk I at least), shown in its rarity colour. "Match my tank" clears the pick. Saved as `Progress.wingmen` (one family pick or null per wingman; old saves load with none). No pick, or a pick with a family no longer unlocked (or a malformed save entry), mirrors your starting tank one Mk lower as before; it never fails. The app and the sim pass the result to the Match as `PlayerSetup.wingmanLoadouts`. The briefing shows the wingmen's small tank pictures with a Wingmen button that opens the tab and returns to the briefing. The stand-in sim never picks, so it keeps the mirror.
- **Kit slot (Lieutenant):** dropped; gadgets (Tactics §3) took its place. Lieutenant opens Mk III parts and gadgets.
- **The stand-in** (`bots/playerBot.ts`) calls its supply drop below 45% HP (70% with no kit left), and strikes a target in sight 170–480 px away when the ring would hold none of ours and scores 3 (each enemy in it 1, a boss or ace +2, a guard, turret or one standing still +1; 2 after the first minute).
- **Measured** (`lab --campaign`, seeds 1–3, before → after): passed 150/150 → 150/150; attempts 166 → 160; first-try passes 142 → 144; total played time 18 398 s → 16 968 s (−8%; chapter 2 −14%, 3 −9%, 4 −4%, 5 −7%). Biggest single-level drops (first tries, mean of 3): 30 The Ironclad 147 → 95 s, 38 Signal Run (a chase) 39 → 20 s, 40 The Rail-Gun Train 78 → 54 s. Ranks still land where the table says (Captain 19–20, Major 23–25, Colonel 34–36, Brigadier 45–46); General at 49–50 on 2 seeds, 120 XP short on the third (it was exactly on the line before). In `lab --level` (5 seeds, typical tanks) the capture levels drop most with two wingmen, as three tanks turn flags: 35 Ridge Line 177 → 60 s, 46 Three Clans 102 → 58 s; wingmen on the chapter's own aim made 22 Stilt Village and 25 Break the Dams more chaotic, so they aim like chapter 1. Level 22 also stalls (600 s, stuck on a stilt-village cell) in 2 of 12 seeds with no perks at all: an old stand-in nav fault, not a perk one. `lab --level N` now runs with the level's typical perks (`TYPICAL_PERKS`); `--no-perks` turns them off.

**Shoulder boards** (owner, 2026-11-14): every rank has its own board, assembled by `dev/pixel/straps.py` from generated pieces so every count is exact. Enlisted ranks wear gold bars across a plain olive board (Private none, Corporal 1, Sergeant 3, Staff Sergeant a wide bar and 2 narrow); junior officers one lengthwise gold stripe with small stars (Lieutenant 2, Captain 4); senior officers two stripes with big stars (Major 1, Colonel 3); Brigadier and General a gold-braided board with big silver stars (1 and 3). The board shows flat beside the rank name on the menu, map, workshop and results, and standing up, big, at a promotion (src/ui/rankArt.ts).

## The 50 levels

- 5 chapters × 10 levels: chapter 1 (levels 1–10) is free, chapters 2–5 (levels 11–50) are paid, as in our other new games.
- No two levels in a row share a mission type, including across chapters. Each type turns up 3–5 times in the campaign, every time with a different twist.
- Each chapter brings new parts, new terrain and a main rival clan. Chapters 2–5 are drafts: design each in full before building it.

### Chapter 1: Meadowlands (free)

A farm valley. Rival: the Boars. Families in chapter 1: Machinegun, Cannon, Rockets; Light, Medium, Heavy; Wheels, Half-tracks, Tracks, with enemies on Mk I–II. Your first tank is a Light hull on Wheels with a Machinegun. Cannon, Medium and Half-tracks are unlocked by the intel from levels 1–2.

| Level | Name | Mission | Main objective | Teaches |
|---|---|---|---|---|
| 1 | First Tracks | Assault | Destroy the 4 Boar scouts on the farm | Drive, aim, shoot, swap a part, intel |
| 2 | Barn Raid | Raid | Blow up the Boars' 3 fuel barrel stacks | Breakable targets, the workshop after |
| 3 | Milk Run | Escort | Get the supply truck to the village | Protecting, roofs, close fights |
| 4 | Hold the Bridge | Hold | Hold the river bridge for 90 s | Waves, water, choke points |
| 5 | Weasel Ace | Ace | Destroy Sly, a Weasel ace on Mk II Wheels, in the woods | Counters (Machinegun beats Wheels), rare intel |
| 6 | The Old Mill | Rescue | Free 3 otter crews and bring them to the truck | Being followed, Sergeant rank |
| 7 | Cut the Convoy | Ambush | Stop 3 Boar trucks before they leave the valley road | Interception, picking your spot |
| 8 | Wreck in the Rails | Salvage | Get the crashed prototype from the rail yard to the pick-up | Being hunted, cover |
| 9 | Through the Pass | Breakout | Reach the fort gate in 3 minutes through the guarded pass | Artillery marks, pace |
| 10 | The Old Fort | Fortress | Destroy the Boar land fortress | The chapter boss, Staff Sergeant |

### Chapters 2–5: biomes, terrain rules and new guns (owner, Nov 14)

Each paid chapter is its own biome with a terrain rule that changes how you drive and fight, a new gun to unlock (and one new drive), a rival clan, and a boss. The biomes are the owner's: desert, swamp, snow, forest. Levels are data (served to owners from `content/paid.ts`), so every rule below lives in the engine and the levels only use it.

| Chapter | Biome | Terrain rule | Weather | New part | Rival | Boss |
|---|---|---|---|---|---|---|
| 2 Dust Flats | Desert, canyons, an oil town | Sand: Wheels ×0.7 speed and slide on turns; dunes block sight but not shots over their crest | Sandstorms: every ~40 s a storm rolls over for ~12 s; sight drops to ~180 px for everyone | Mortar: lobbed over walls, 200–520 px, a minimum range | Crows | The Sand Crawler |
| 3 Mirefen | Swamp, stilt villages | Deep water stops every drive but Hover; mud ×0.8 (Tracks ignore it); reeds hide like bushes | Fog banks: patches that hide tanks inside | Hover drive (crosses water, drifts), Flamer: heat, ignores kinetic armour, sets reeds alight | Weasels | The Ironclad |
| 4 Frostridge | Snow, a frozen lake | Ice: low grip, tanks keep sliding; deep snow ×0.75 for Wheels; thin ice breaks under Heavy hulls | Blizzards: sight ~200 px and a drift wind | Laser: instant beam, heat | All three clans | The Rail-Gun Train |
| 5 Deepwood | An old forest and the Hive's logging works | Dense trees block sight and shots; Tracks and Heavies flatten young trees; trails are the fast lanes | Forest fire in some levels: fire spreads tree to tree | Rail: pierces walls, trees and tanks; charge-up shows an aim line | The Iron Hive | The Harvester |

Every chapter keeps the "levels mean something" rule: our depots and forts are white cement with gun towers, cargo goes by helicopter, crews by truck, and each new mission type gets its own set piece (a capture flag is a flagpole that raises our flag, a recon target a camp you photograph, a chase ends at the courier's base gate).

Build order per chapter (docs/agent-orchestration.md): engine and terrain rule, art (ground, structures, the new part's art in Mk I–III, the boss) through the world pipeline, then levels from a kit with the lab, then review and the paid content list.

### Chapter 2: Dust Flats (paid, draft)

Desert, canyons and an oil town. Rival: the Crows. New: Mortar. Twist: sandstorms cut vision, sand slows and slides Wheels.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 11 | Sand in the Tracks | Assault | Clear the Crow camp on the oil town's edge | Mortars lob over walls |
| 12 | Eyes on the Canyon | Recon | Scout 3 Crow camps unseen | The Radar kit |
| 13 | Pipeline | Raid | Blow 4 pipeline valves in 3 minutes | Timer |
| 14 | Water Truck | Escort | Get the water truck across the flats | A sandstorm mid-route |
| 15 | The Wells | Capture | Hold all 3 wells at once | Crows retake them |
| 16 | Dune Runner | Chase | Catch the Weasel courier before the canyon | Dunes slow Wheels; pick a drive |
| 17 | Rook's Mesa | Ace | Destroy Rook, a Crow ace with a Mk III Mortar | Getting under a mortar's minimum range |
| 18 | Oil Town Siege | Hold | Defend the town square through 4 waves | Mortar waves |
| 19 | Crow Prison | Rescue | Free the Ink scouts from the Crow prison | The alarm |
| 20 | The Sand Crawler | Fortress | Destroy the sand crawler | Boss |

#### As built: the chapter 2 engine (Nov 14)

The engine pass for Dust Flats is done; levels 11 and 14 are built as the worked examples for 12, 13 and 15–20. How to write a chapter 2 level, with measured numbers: [inktanks-level-kit.md](inktanks-level-kit.md), "Chapter 2: Dust Flats".
- **Mortar** (`match/lob.ts`): the design's numbers (45 every 2.8 s, 200–520 px, 40 px blast). A lob flies over walls, cover and tanks and the whole blast hurts, structures too. The landing spot is a red ring that fills as the shell falls; your own Mortar shows a reticle where it will land (the mouse sets the range, a thumbstick ranges on the enemy it points at). Mortar bots keep about 375 px off, never fire under 200 px, and with no one in sight shell where they last saw you or where a friend sees you (spotters). A stand-in with a Mortar passes 11 and 14 only 2–3 times in 10, because enemies close under its minimum range; it's a support gun, and levels are tuned for the Cannon.
- **Sand:** Wheels ×0.7 and they slide on turns (grip 0.35 on sand; Half-tracks 0.75, Tracks 1; Grip research raises it).
- **Sandstorms:** `LevelDef.weather` (`match/weather.ts`): every bot's sight is capped to the storm's (180 px), the player's view is cut by a drifting sand veil (`render/stormView.ts`), the HUD warns 5 s ahead.
- **Dune crests** (`dune`, `duneV`): block sight, not shots or driving.
- **Set pieces:** capture flags are flagpoles that run our flag up (theirs when retaken); the pole changes flag only when a side has taken it all the way, as the objective counts it, and the bar under it is one tug of war that fills with our colour like the ring's arc (owner, Nov 14: it used to switch at half); recon spots are camps photographed with a viewfinder and a flash; a chase can name its base `gate`, which opens as the courier comes.
- **Bosses:** `BossDef` carries `body` (art), `clan`, `radius` and `armour`, so level 20's Sand Crawler is data; level 10 is unchanged.
- **Content plumbing:** desert kinds in `src/content/ch2/kinds.ts` (one placeholder art table, `CH2_ART_NAME`), a chapter 2 map (painted since Nov 15, the map screen switches chapters), levels in `content/ch2/levels/` served by `content/paid.ts`, the lab runs them (`--level 11`, `--all --ch 2`). Chapter 2 bots aim a little better (`CH2_BOTS`). The campaign's chapter names and rivals now match this doc (Dust Flats against the Crows, Mirefen the Weasels, Frostridge all three, Deepwood the Iron Hive). `READY_CHAPTERS` stays 1 until all of 11–20 are built.
- **Still placeholder art:** the Mortar turret (wears the Cannon's), its icon and blueprint, the desert structures (chapter 1 art), dunes and wells (boxes), the flagpole and flags (code-drawn), the drifting sand (generated), the Crow base gate's open state (shows breached), the Sand Crawler (wears the fortress).

### Chapter 3: Mirefen (paid, draft)

Swamp and stilt villages. Rival: the Weasels. New: Hover, Flamer. Twist: water everywhere, so Hover routes and mud.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 21 | Hover Trials | Breakout | Take the Weasels' Hover at their dock, then cross the marsh before the tide comes in | Hover (taken, unlocked for good) |
| 22 | Stilt Village | Assault | Clear the stilt village | Flamers in close quarters |
| 23 | The Barge | Escort | Get the supply barge up the river | Enemies on both banks |
| 24 | Reed Watch | Recon | Mark 3 Weasel positions | Reeds hide you |
| 25 | Break the Dams | Raid | Break 3 dams | Floods change the routes |
| 26 | Mud Islands | Capture | Hold 3 islands at once | Hover against mud |
| 27 | Grim | Ace | Destroy Grim, a Hover ace with a Flamer | A fast close-range duel |
| 28 | Sunken Prototype | Salvage | Raise the prototype and get it out | Slow in water |
| 29 | Last Lock | Ambush | Sink the barge convoy before the lock | Timing on water |
| 30 | The Ironclad | Fortress | Destroy the paddle-wheel ironclad | Boss |

#### As built: the chapter 3 engine (Nov 14)

The engine pass for Mirefen is done; levels 21 and 23 are built as the worked examples for 22 and 24–30. How to write a chapter 3 level, with measured numbers: [inktanks-level-kit.md](inktanks-level-kit.md), "Chapter 3: Mirefen".
- **Heat armour:** every hull has heat armour below its kinetic (Light 0, Medium 1, Heavy 2; kinetic unchanged at 3 / 7 / 12). Heat guns meet heat armour, the rest kinetic; chapters 1–2 numbers are unchanged.
- **Flamer** (`match/flame.ts`): the design's 5 heat a tick, a tick every 0.1 s, a 150 px cone (0.7 rad); 3 s of fuel then 1 s to refill. Each tick burns every tank in the cone that no wall shields, scorches wood, and lights reeds; burning reeds spread to clumps within 85 px, hurt tanks on them and burn out after 5 s. About a Cannon I's killing speed at a third of its range, better against light hulls and Hover. Flamer bots close to about 85 px. The jet and burning reeds are the PixelLab strips in `manifest.effects` (`render/flameView.ts`).
- **Hover:** the design's 220 / ×0.9 / 3; floats over deep water, ignores mud and shallows, drifts everywhere (grip 0.45). Hover bots steer by their own nav grid (water open), built only when a Hover tank needs it. Level 21 makes you take it: the Weasels' spare Hover sits in a crate by their dock (the level's `prize`), and fitting it unlocks Hover for good.
- **Swamp ground:** `swampWater` (deep, like water), `shallows` (like mud), `marsh` (like grass); reeds hide like bushes; boardwalks and jetties are decks over a bridge strip.
- **Fog banks:** `weather: { kind: 'fog', banks }`, static or drifting to and fro; inside one you're hidden, and no sight line crosses one (`match/fog.ts`, drawn by `render/fogView.ts` from `manifest.overlays.fog`).
- **Dams and tides:** `LevelDef.floods`: when a structure (a sluice dam) breaks, or at a time (a tide), ground patches are repainted (flood or drain), both nav grids follow, ground tanks in new deep water are washed ashore and the view repaints (`match/flood.ts`).
- **Water vehicles:** escort `vessel: 'barge'` (our supply barge up a river road), enemy `vessel: 'barge'` (level 29's convoy), and `BossDef.afloat` (level 30's Ironclad: deep water only, so the bank stops its charge like a wall). The Ironclad's art mounts match the fortress's, so level 10's turret offsets fit it.
- **Content plumbing:** swamp kinds in `src/content/ch3/kinds.ts` (real art; `CH3_ART_NAME`), the chapter 3 map (painted since Nov 15), levels in `content/ch3/levels/` served by `content/paid.ts`, the lab runs them (`--level 21`, `--all --ch 3`), chapter 3 bots aim a little better again (`CH3_BOTS`). Capture flags fly the Weasel flag on Weasel levels.
- **Engine fixes kept out of chapters 1–2:** a tank pushed half over water used to stick for good; from level 21 it drives out (`WEDGE_FIX_FROM`), since level 14 was tuned with storm raiders stuck at the map edge. A ground bot whose goal is out on deep water heads for the nearest bank.
- **Still placeholder art:** none known. (Since Nov 14 the barge draws with its own art and a wake, the Ironclad churns a wake under its paddle wheels, bp-flamer and bp-hover are in, and level 29's lock has its gates: `lockGate`, indestructible, across the channel the river leaves by.)

### Chapter 4: Frostridge (paid, draft)

Snow and a frozen lake. Rival: all three clans, pushed north. New: Laser. Twist: ice skids every drive, blizzards.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 31 | Thin Ice | Breakout | Cross the frozen lake | Ice cracks under Heavies |
| 32 | Snowed In | Rescue | Dig out 3 stranded crews | Break snowdrifts |
| 33 | Laser Lab | Raid | Destroy the lab's 3 generators | Laser loot |
| 34 | Blizzard Pass | Escort | Get the truck through the pass | Blizzard vision |
| 35 | Ridge Line | Capture | Hold 3 ridges at once | High ground |
| 36 | Ermine | Ace | Destroy Ermine, a Laser ace | Instant beams, dodge by cover |
| 37 | Avalanche | Hold | Hold the pass for 2 minutes | Shoot the cliffs to bury waves |
| 38 | Signal Run | Chase | Catch the signal courier on the ice | Skidding at speed |
| 39 | Tracking the Train | Recon | Mark the rail-gun train's 3 depots | Sets up level 40 |
| 40 | The Rail-Gun Train | Fortress | Destroy the rail-gun train | Boss |

#### As built: the chapter 4 engine (Nov 14)

The engine pass for Frostridge is done; levels 31 and 34 are built as the worked examples for 32, 33 and 35–40. How to write a chapter 4 level, with measured numbers: [inktanks-level-kit.md](inktanks-level-kit.md), "Chapter 4: Frostridge".
- **Ice:** every drive slides on `ice` (grip: Wheels 0.15, Half-tracks 0.22, Tracks 0.3; Hover keeps its drift) and gets up to speed, brakes and turns weakly there (×0.45 acceleration and braking, ×0.75 turning). Deep `snow` slows Wheels ×0.75 and Half-tracks ×0.9; the packed-snow tracks and frozen dirt drive like dirt.
- **Thin ice** (`match/ice.ts`): a Heavy hull cracks it at once (a warning pop and a crack decal) and goes through after 1.4 s on it. The rule (decided Nov 14): not lost, but 45% of its HP gone and hauled back to firm ground, and the hole stays open water for good. So a Heavy player can blunder once and live, and the hole changes the routes. Heavy hulls steer by their own nav grid with thin ice closed (built only on lands with thin ice); a fall from a recent enemy hit is that enemy's kill.
- **Laser** (`match/beam.ts`): the design's 35 heat every 0.9 s, 480 px, an instant beam stopped by the first tank or wall on its line (low cover passed close up, as shots); heat against heat armour. Counters: Wheels 1.0, Half-tracks 0.95, Tracks 0.85, Hover 1.2. Laser bots keep about 375 px off and show a 0.4 s aim line before every beam (the only warning an instant gun can give). Mk I–V through parts, save, workshop and blueprints like any family. About a Cannon I's killing speed with no travel time, better against Heavies.
- **Blizzards:** `weather: { kind: 'blizzard', every, last, sight, wind }` (defaults 45 s, 14 s, 200 px, 30 px/s): sight capped as in a sandstorm, and the wind pushes every moving tank (a parked one holds) and every shell in flight a little sideways (`match/wind.ts`). White veil and the painted driving snow in two layers; HUD warning as for sandstorms.
- **Set pieces:** snowdrift rescues (the rescue objective on drifts tagged 'drift': "dig out the crews"); avalanches (`LevelDef.avalanches`: a cornice that, shot down, drops dormant snowdrifts across a pass, burying whoever is under them, `match/avalanche.ts`); high ground (`LevelDef.heights`: from a ridge top you see and shoot 1.2× as far, `match/heights.ts`).
- **The Rail-Gun Train:** `BossDef.rail` (with `length`): the boss moves only along its road, its rail line, end to end and back; shots and bumps meet a capsule as long as the train; in phase 2 it charges down its line at a player by the track, and the buffers at the line's end daze it. Turrets can wear any art (`art: 'fortressRail'`). The train's art (384 frame) mounts on its centre line at body-frame dx 76, 21, −24 and −78.
- **All three clans:** `LevelDef.mixedClans: true` lets a chapter 4 level (31–40 only) mix Boars, Weasels and Crows; everywhere else the one-faction rule holds.
- **Content plumbing:** snow kinds in `src/content/ch4/kinds.ts` (real art; `CH4_ART_NAME`), the chapter 4 map (painted since Nov 15), levels in `content/ch4/levels/` served by `content/paid.ts`, the lab runs them (`--level 31`, `--all --ch 4`), chapter 4 bots aim a little better again (`CH4_BOTS`). Chapters 1–3 measure the same as before (the lab's `--all` lines are unchanged but level 29's, whose lock was rebuilt round the gate art: 7/10 before and after).
- **Still placeholder art:** the cornice (drawn as a snowdrift). The thin ice's hole repaints as the plain `water` ground.

### Chapter 5: Deepwood (paid, draft)

An old forest where the Iron Hive, the clans' old masters, is logging the land bare. Rival: the Iron Hive. New: Rail. Twist: dense trees block sight and shots, Tracks and Heavies flatten young trees, and in some levels a forest fire spreads. (Was Ashfall, a volcanic land; the owner's biomes are desert, swamp, snow and forest.)

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 41 | Into the Pines | Assault | Clear the Hive's logging camp | Rail guns shoot through trees |
| 42 | Wildfire | Breakout | Get out before the fire closes the trail | The fire spreads tree to tree |
| 43 | Hive Scouts | Recon | Photograph 3 Hive works | Collapsing timber cover |
| 44 | Timber Bridges | Raid | Blow 3 log bridges before the column crosses | Timer |
| 45 | The Last Convoy | Escort | Get the Ink Brigade's convoy to the forest fort | Trees felled across the road |
| 46 | Three Clans | Capture | Raise our flag on 3 clearings | The clans fight each other too |
| 47 | Old Rivals | Ace | Destroy Sly, Rook and Grim together | Every counter at once |
| 48 | Hive Cells | Rescue | Free the clan prisoners | The clans join you |
| 49 | The Long Night | Hold | Hold the Brigade camp for 3 minutes | Every enemy type |
| 50 | The Harvester | Fortress | Destroy the Hive's logging fortress | The final boss, General |

#### As built: the chapter 5 engine (Nov 14)

The engine pass for Deepwood is done; levels 41 and 45 are built as the worked examples for 42–44 and 46–50. How to write a chapter 5 level, with measured numbers: [inktanks-level-kit.md](inktanks-level-kit.md), "Chapter 5: Deepwood".
- **The Iron Hive** (`clan: 'hive'`): the clans' old masters, hornet crews, stripe colour 0xe0661f (blackened iron, hot orange), capture flags fly `flagHive`. Chapter 5 bots are the sharpest (`CH5_BOTS`: aim error 0.19, decide every 0.38 s, hold fire 24%). `mixedClans` is allowed on 31–50, and **`clanWar`** (41–50, with mixedClans) puts each clan on its own side, so they fight each other too (level 46).
- **Forest ground:** `forestFloor` (Wheels ×0.85, Half-tracks ×0.93, Tracks and Hover ×1, nav cost 3), `forestTrail`/`forestTrailH` (the fast lanes), `clearing` (like dirt). Appended to GROUNDS; chapters 1–4 unchanged.
- **Trees (the rule, decided Nov 14):** an old tree's trunk blocks driving; its **canopy** (a circle round the trunk, 28 px oldTree, 25 oldFir) blocks sight and shots, and the shot hits the tree (420 HP). The canopy sits just inside where a tank touching the trunk stands, so no tank is ever under one. Young trees are **thickets**: Tracks and Heavies flatten them (chapter 1's flattening rule, unchanged), every other drive goes round (the nav grid closes them), and their small canopy blocks sight and shots. Undergrowth hides like a bush; fallen logs are low cover that any gun saws through. Cheap: a canopy test is a point–segment distance.
- **Rail** (`match/railgun.ts`): the design's 90 every 3 s, 640 px, weight 6, kinetic. A pull starts a 0.8 s charge, the aim locked and drawn as an aim line (the warning, for every Rail); then the slug goes through every tank on its line (full damage each) and every wall, tree and log (half), stopping only at natural rock. Counters: Wheels 0.9, Half-tracks 1.0, Tracks 1.15, Hover 0.85. Rail bots keep about 450 px off and, alert, fire through the trees at where they last saw you or where a friend sees you; the stand-in steps off a charge line it's on. Mk I–V through parts, save, workshop and blueprints. Rail I kills about as fast as Cannon I, through cover; the stand-in fares badly with Rail I (fighting at sight range), well with Rail III: a player's choice, levels are tuned for the Cannon.
- **Forest fire** (`LevelDef.fire`, `match/forestFire.ts`): trees and undergrowth burn. A level's fire starts at its places at `at` s and runs tree to tree (a tree burns 14 s, lights everything burnable within 120 px after 3 s, hurts tanks under its canopy, makes the nav grids round itself dear while it burns (bots go round, through only when it's the only way; Nov 15), then is a charred snag that blocks nothing). Flamers light trees too; their fires die out after 3 trees. Bounded: every tree burns once, a chain stops after `hops` (60). `effects.treeFire` on the canopy.
- **Log bridges** (`match/spans.ts`): logBridge/V are spans: driven over, low cover; blown, the bridge strip under them turns to water for good. A raid with `column: true` fails if the convoy-role column reaches its road's end first (level 44).
- **Convoys and felled trees:** escort `trucks` (a convoy, lose any and it fails) and `clear` (a tag on felled trees across the road: the trucks stop until you saw through; the stand-in shoots the next one ahead) (level 45).
- **Several aces** (level 47): the ace objective needs every ace. **Friends** (`LevelDef.friends`, level 48 "the clans join you"): clan tanks on your side that follow you and fight; with `join` they drive out when a cage or pen breaks.
- **The Harvester:** `BossDef.body: 'harvester'` (320 px frame, drawn at the bosses' 0.7 scale; turret offsets cannons (30, ∓34), rail (−28, 0), mg (59, 0)); a `rail` turret wears `fortressRail`.
- **Engine fixes kept out of chapters 1–4:** from level 41 tanks are kept on the map after collisions (`EDGE_CLAMP_FROM`). Chapters 1–4 measure the same as before (the lab's `--all` lines, 10 seeds, are identical for every level 1–40).
- **Content plumbing:** forest kinds in `src/content/ch5/kinds.ts` (real art; `CH5_ART_NAME`, now `ALL_KINDS`), the chapter 5 map (painted since Nov 15), levels in `content/ch5/levels/` served by `content/paid.ts`, the lab runs them (`--level 41`, `--all --ch 5`; typical tank `cannon3/medium3/halftracks2`).
- **Still placeholder art:** the Rail's slug trail is code-drawn (no effect strip); the fallen log's sawn state reuses the art's state 0 for every break (shot or sawn).

## Controls

- **Desktop:** WASD or arrows drive in the direction pressed (diagonals too). The hull turns that way and rolls once it lines up, as the left stick does. The mouse aims the turret, clicking or holding fires, E swaps and Q uses a repair kit.
- **Backing up (Nov 20):** a direction more than ~137° off the nose backs the tank up instead of turning it round, and the tail steers towards it. Once backing, the tank keeps backing while the direction points anywhere behind its sides, so steering the tail doesn't flip it into a turn. Reverse is 0.6× top speed. Only a human's input does this. Enemy bots keep their old rule, and the lab's stand-in player (`playerBot`) still turns round as it was tuned to (`logic/match/movement.ts`, `test/reverse.test.ts`).
- **Sound:** a toggle on the menu, on the map (top right) and on the pause card. M toggles it in a mission. It is saved.
- **Phone:**
  - The left thumbstick drives, steering towards where you point.
  - The right thumbstick aims, and fires while held past the dead zone.
  - The swap button only shows on a part. The repair button sits by the right stick.
  - **Zoomed in (Nov 20):** an art px is a whole number of device px and at least 0.9 CSS px (`src/app/stageSize.ts`), instead of the laptop's ~540-px-tall view. On a phone on its side that shows about 360–430 art px of field, 1.5× closer than before.
  - **Sizes:** [mobile-playbook.md](mobile-playbook.md) in `src/ui/phoneCss.ts`, loaded last and for phones only. Ark Pixel is 24 px for main lines and buttons and 18 px for captions, every target is 44 px or more, and key caps are hidden. The map's title panel is hidden (the chips show the chapter), and the workshop's tabs show only the slot.
- **HUD:** pickups read "+5 [blueprint icon] blueprints (Cannon, Wheels)", and the first time a player ever picks blueprints up a tip says to spend them in the Workshop (saved, so once per player). The results list blueprints per family with part icons and highlight "Upgrade ready: Cannon Mk II". The objective line top centre with an edge arrow to the next target, the minimap top right, HP and part icons bottom centre, and the timer top right when a level has one.

## Performance budget

- 60 FPS on a mid-range phone with 30 tanks, shots and particles on screen. The stress test proves this before content starts.
- Memory under about 250 MB on iPhone Safari: ground streamed in chunks, part rotations only for parts in the match.
- Download: the first load under about 5 MB, with later chapters' art loaded when they open.

## Build phases

Phase 1 (engine, art test, density test, stress test) is done, with the battle-royale rules. The redesign reworks it:

1. **Engine rework (one Opus agent), done Nov 14:** levels as data, roles, alarm, all 13 objectives, the lab (`npm run lab`), and chapter 1's 10 levels as first drafts. Content agents work from `docs/inktanks-level-kit.md`.
   - Remove the drop map, the storm, Royale, and land regions that grow per mission.
   - Add level layouts in `src/content`: map size and slice of the chapter land, start point, enemy placements with roles and routes, crates, targets, objective and bonuses.
   - Rework bots from loot/rotate/fight/flee to the level roles (guard, patrol, wave, convoy, hunter, runner, turret) and the alarm.
   - Keep and adapt Raid, Escort, Hold, Ace, Salvage and Fortress. Add Assault, Rescue, Ambush, Breakout, Recon, Capture and Chase, all pure logic with tests.
   - The headless sim plays every level with a player bot and reports pass rate, time and medals, for tuning; the no-grind check runs over the whole chapter.
2. **Art for chapter 1 (in parallel):** every chapter 1 part at Mk I–III with clan stripe masks; the Meadowlands ground set and structures (houses, barns, walls, fences, trees, rocks, bridge, crates, fuel barrels, the radar mast, cages, the truck, the rail yard, flags); the fortress boss; the chapter map.
3. **Screens:** chapter map, mission briefing, workshop, rank and promotion, results with medals and intel.
4. **Chapter 1 content:** the 10 levels, tuned from the sim. Then the owner's playtest.
5. **Release:** game-sdk integration, the site page, itch build, promo shorts.
6. **Chapters 2–5**, one at a time, each designed in full first.
