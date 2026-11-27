# Dev-story shorts (#145–148): shared brief

Four narrated InkFish shorts told by **Dewy**, a fennec fox in a teal hoodie: the game's creator on screen (he stands for the owner). They tell the true story of building InkFish in one weekend. Pipeline and rules: `docs/shorts-playbook.md`, sections "Rules for the next short" and "Making a short". Where this brief and the playbook differ, this brief wins.

## What's shared

- **Dewy's art and helper:** `devstory/art/dewy/<key>.png`, the mouth sets in `devstory/art/dewy/mouth/`, and `devstory/dewy.ts` (read its header for the API). Keys: `neutral`, `proud`, `tired` (glass of water), `frustrated`, `moved`, `laughing`, `kid-wonder`, `kid-typing`, `hurt`. `?short=dewykit` shows them all. Never draw Dewy in canvas code, and never give him coffee: he doesn't drink it.
- **The game's own art and sound:** reuse InkFish sprites, items (the rubber duck decoy), bosses (the giant squid), birds, boats, the level map, the event banners, and `audioKit.ts` effects. Look at how recent gameplay-style shorts bake the game's art before writing new drawing code.
- **Captions:** `captions.ts`, word by word, timed from `words.ts`. **Credit:** "InkFish · 16bit.ink" (`credit.ts`), as in the other narrated shorts.

## The look: "Dewy's screen" (the same in all four)

Plain gameplay doesn't hold a viewer for 20 s (the owner, 2026-11-27). The picture is **the game being made**, on Dewy's laptop (a MacBook Pro look: thin space-grey aluminium, black bezel with a camera notch; no logo or brand mark):

- **Satisfying build moments:** a pen nib inks a fish stroke by stroke, then a watercolour wash floods in; code types itself beside a live game preview; a level editor pops seaweed, boats and birds into an empty sea.
- **Bugs you can see:** debug boxes, coordinates counting (`duck.y: −12,480`), red warnings, things escaping the game window and even the monitor.
- **Gags in the UI:** a to-do list, a playtest message, a clock racing.
- Game footage only as short glimpses inside the preview window (and one full-screen payoff where the script asks for it).

Everything comes from the shared screen kit (`devstory/screen.ts`, read its header): the painted laptop, the editor panel with typing code, the game-preview window, the pen-draw reveal, debug overlays, a cursor, the clock. Use it; don't draw a second version.

**Layout:** 1080×1920. Top part (y 0–1050): the monitor, full width. Dewy's bust below it, centred: ears' tips around y 1000, face around y 1150–1400, shoulders cut by the frame bottom, about 760 px wide. Captions over the lower edge of the monitor, around y 900–1000, always between y 270 and 1250. Dewy **lip-syncs** (`dewy.ts`: mouth sets per pose, from the word timings and the voice loudness, the rules of `apps/web/scripts/duo/lipsync.py`), and his pose changes where the script's mood changes. A beat may break the layout (ducks flying out of the monitor past his ears, a full-screen swallow), but frame 1 must already show the hook.

## Voice

- ElevenLabs voice **Dewy**, voice id `9D6rPdtdqSwuo8ntjS2C`, model **eleven_v4**. Never another voice.
- One flow, **4 takes** (generations_count 4), the script exactly as written below (tags, "…", "!", CAPS). Never call a generation twice to retry; poll `creative_get_flow_run_status` (wait with `sleep 60` in the background, foreground sleep is blocked).
- Choose the take with the best energy and tightest pauses (`ffmpeg -af silencedetect`). Loudness: measure each take (`ebur128`); no line more than ~4 dB under the take (raise it in `audio.ts` if needed). `voiceprint.py`'s reference table is Mark's, so it doesn't apply: just record Dewy's numbers in your report.
- Loop length is a multiple of 1.5 s, 18–21 s. `atempo` so the voice ends ~0.3 s before the loop point (`tempo = last word end ÷ (loop − 0.3)`, natural at 1.0–1.13). Write `words.ts` from ElevenLabs Scribe (`creative_transcribe_audio`), drop echoed tags, fix the edges with silencedetect. Keep `voice-take.mp3` and `voice.mp3` in the folder.
- Lip-sync: after the final `voice.mp3` (with atempo), run `python3 devstory/envelope.py <short>/voice.mp3 <short>/envelope.json` and pass `speech: { words, envelope }` to `drawDewy` (see `lipsync.ts`). Kid poses never get `speech`.

## Truth

Every story beat is real (git history, Oct 3–5, 2026). Don't add facts. Never say "this weekend" (the videos come out weeks later). No age. Never show or recreate Feeding Frenzy's art, logo or fish: we only say its name; the fish on screen are always InkFish's.

## Each agent

- Own folder, register `?short=<name>` in `main.ts` (re-read the file just before editing: other agents add entries too) and add the record entry to `record.mjs` with the record name below. **Don't record the video.** Take snapshots with `snap.mjs` at frame 1 (t=0.3), every beat, and just before the loop point; check the loop seam, frame 1 with the sound off, and that every noun said is on screen as it's said.
- `npx tsc --noEmit` in `games/inkfish` passes. Don't touch other shorts or game code. Don't commit. No `git checkout`/reset.
- Report: loop length, tempo, chosen take and its loudness/pitch numbers, snapshot paths, anything that doesn't fit the script, and credits spent.

## The four scripts

### devkid: "I Remade My Favorite Childhood Game In One Weekend 🐟" (record name `inkfish-dewy-childhood`)

`[nostalgic] As a kid, I was OBSESSED with Feeding Frenzy. [laughs] You're a tiny fish. You eat smaller fish. You become the BIG fish. [chuckles] That's it! That's the whole game. [sad] Then I grew up… and forgot about it. [excited] So one weekend… I built my OWN! [warmly] And for two days… I was that kid again.`

- Frame 1: young Dewy (`kid-wonder`) at the old beige CRT; on its screen an InkFish fish mid-gulp; his face lit by the glow. (Here the "monitor" is the kit's CRT.)
- "tiny / smaller / BIG fish": three quick InkFish sizes on the CRT, each eating the last. "grew up": the CRT morphs into today's monitor, the kid crossfades to grown-up Dewy (`moved`). "built my OWN": the pen inks a fish on the monitor, the wash floods in, it comes alive and swallows a big fish that fills the frame; Dewy `proud`. "that kid again": Dewy `laughing`, the monitor morphs back to the CRT and young Dewy, so the loop seam is invisible ("…that kid again. / As a kid…"). Young Dewy doesn't lip-sync: the voice is grown-up Dewy remembering.

### devweekend: "I Built This In One Weekend. Here's Every Hour 🐟" (record name `inkfish-dewy-weekend`)

`[proudly] I built THIS in one weekend. [playful] Saturday, four p.m.: a fish! …Kind of. [delighted] Six p.m.: it has a TAIL! [mischievously] Ten p.m.: the final boss gets EIGHT arms. [alarmed] Eleven: SHARKS! [excited] Sunday: a hundred levels, birds, boats, a whole ocean… [deadpan] and no Start button. [laughs] Nobody could START the game.`

- Frame 1: the giant squid boss mid-gulp in the preview window, filling the monitor. The racing clock comes in on the second beat (never in frame 1).
- "four p.m.: a fish! …Kind of": the pen inks a lumpy grey fish that wobbles stiffly. "TAIL!": rig bones appear along its body in the editor, then the tail swings and the wash floods colour in. "EIGHT arms": the squid is inked arm by arm with a counter 1…8. "SHARKS!": a shark fin slices across the code. "a hundred levels, birds, boats, a whole ocean": a level counter races 1→100 while the editor pops boats, birds and seaweed into the sea (satisfying timelapse), and a to-do list ticks itself: fish ✓ tail ✓ squid ✓ sharks ✓ 100 levels ✓ birds ✓ boats ✓.
- "and no Start button": the list ends; there's no "Start button" line; the cursor wanders over the level map and clicks around helplessly; Dewy `frustrated`. "Nobody could START": Dewy `laughing`, a hard cut back to the squid (loop).
- Real times: tail animation 6:42 pm, squid 10:23 pm, shark 10:56 pm, Start button added Sunday 5:43 pm (players couldn't tell the map's level numbers were buttons).

### devducks: "My Rubber Ducks Learned To Fly At 3 AM 🦆" (record name `inkfish-dewy-ducks`)

`[bewildered] It's three a.m.… and my rubber ducks are FLYING. [proudly] They're decoys: sharks chase the duck instead of you. Genius! [nervous] Except… I never told them where the water ENDS. [laughing] So they kept going. Up, up… sharks right behind them! [tired] One line of code later, they stop at the surface… [betrayed] and a seagull steals one. [sad] I kind of miss the flying ones.`

- Frame 1: the game's rubber ducks rising through the sky above the sea in the preview, with debug boxes round them; fish staring up; Dewy `tired` (night-blue light, glass of water).
- "decoys": a shark turns from the player fish to a duck (a debug arrow shows its target switch). "where the water ENDS": a duck pops through the surface and keeps rising; its `y` readout counts up past 0 into the negatives, red warnings stack. "Up, up… sharks right behind them!": the ducks leave the game window, cross the editor and fly **out of the monitor** past Dewy's ears, sharks leaping after them. "One line of code later": the fix types itself (one highlighted line clamping the duck to the surface). "stop at the surface": the duck bobs on the waterline. "seagull steals one": a game bird snatches it. Moods: `tired` → `proud` → `frustrated` → `laughing` → `tired` → `hurt` → `moved`; loop back to the rising ducks.
- Real: the duck decoy lures hunters (src/logic/decoy.ts); the 3:07 am fix (Mon Oct 5) made it stop at the surface, where a bird can carry it off.

### devquit: "The First Person To Play My Game Quit At Level 6 😭" (record name `inkfish-dewy-quit`)

`[sad] The first person to play my game quit at level SIX. [hurt] "Every level feels the same." [sighs] Ouch. [defiant] But starting tiny every level? That's the BEST part. That's Feeding Frenzy! [determined] So I kept it… and made every level different instead. [excited] A fishing fleet! A bait ball! A hunter coming for YOU! [mischievously] So… would YOU quit at level six?`

- Frame 1: Dewy `hurt`, reading his phone; a message bubble "every level feels the same" (the only words in frame 1 besides the caption); on the monitor, level 6 paused.
- "Every level feels the same": the editor shows a grid of level thumbnails that really do look alike. "starting tiny": the player's fish at its starting size in a big empty sea. "made every level different": Dewy types; the thumbnails flip one by one into different scenes, then quick full-monitor cuts of the game's real sea events with their own banners: "Fishing fleet!", "Bait ball!", "A hunter is coming!" (src/logic/seaEvents.ts). Moods: `hurt` → `frustrated` → `proud` → `neutral` → `laughing` → `neutral` (cheeky); loop back to the hurt frame.
- Real: the first detailed playtest (Oct 7) quit at level 6 with that complaint; random sea events were added that evening.
