# Shark size comparison: art still to paint

The engine draws every shark through `contract.ts`. Each species below is a labelled grey placeholder in `roster.ts` until its painting lands.

## How to land a painting

1. Write `art/<id>.ts` exporting a `RawShark` (see `contract.ts`):
   - draw a **full side view, FACING RIGHT**, around the origin, about `len` px long (snout tip to the tip of the upper tail lobe);
   - `gulp` 0..1 opens the jaw (0 shut, 1 wide);
   - `t` is for idle motion only (line boil, a blink) and `beat` is the tail phase. Neither may move the snout tip;
   - `mouth` gives where meals go in, as fractions of the length back from the snout and down from it;
   - `painted: true`.
2. In `roster.ts`, replace the species' `placeholderShark(...)` line with your export. Nothing else changes: `fitShark` measures the drawing once, finds the real snout tip and length, and places it facing left at the exact size.
3. Check it on `?video=sharksize-kit` (every shark at one scale beside you) and on `?video=sharksize-kit&only=<id>`, which shows it big with the contract's guides: a red cross on the snout tip, a red bracket for the length it must fill, a yellow dot at the mouth, and the gulp opening and shutting.

Style: the house look, pen-drawn but painterly, like `foodchain/art/greatWhite.ts` and `whaleShark.ts`. That means layered countershading washes, light along the back, thin interior ink, a firm outline and a real eye with a catchlight. Never doodle. Don't set `ctx.filter` on big sprites (it blanks the canvas). Bake sprites at buckets up to the biggest on-screen size: the whale-shark step shows sharks up to ~1,100 px long, and `seal/art/paint.ts` BUCKETS needed a 7.5 px/unit bucket for #6.

## Sharks (placeholders now)

| id | Species | On screen at | Defining features |
|---|---|---|---|
| `lanternshark` | Dwarf lanternshark, *Etmopterus perryi* | 20 cm (7.9 in), and filling 52% of the frame at step 1 (~1,000 px). Paint for that size. | The smallest shark. A slim, cigar-shaped deep-sea shark: dark brown-black above and below, with a black belly marked by glowing **photophores** (bioluminescent flank and belly marks, glowing faint blue-green). Big green-gold eyes. A short snout. Two small dorsal fins, **each with a spine in front**, the second dorsal larger. No anal fin. A long upper tail lobe. Lives 230–530 m (750–1,740 ft) deep. Its diet has never been published (shown with a tiny shrimp, "probably"). |
| `blacktip` | Blacktip reef shark, *Carcharhinus melanopterus* | 1.5 m (4.9 ft), and **standing on its tail beside you** (tilt π/2) at 1.8 m. Must read upright too. | Tan-grey or brownish above, white below, with a pale band along the flank. **Bold black tips on every fin**, sharpest on the first dorsal and the lower tail lobe, each black tip edged by a pale band. A short, broadly rounded snout. Oval eyes. Hunts reef fish (gulps a reef fish, `gulp` must open). |
| `hammerhead` | Great hammerhead, *Sphyrna mokarran* | 3.7 m (12.1 ft). Also appears in "the bunch" card at ~590 px and as a 6.1 m (20 ft) ghost outline. | The **cephalofoil**: a wide, nearly straight-fronted "hammer" with a notch in the middle. In side view that's a thin blade jutting forward, with the eye at its tip. A **very tall, sickle-shaped first dorsal** (taller than any other shark's here). A tall, curved anal fin, and pelvic fins with curved rear edges. Grey-brown to olive above, white below. Eats stingrays (gulps one). |

**Megalodon** (`megalodon`) needs no painting. The video only ever draws it as a dashed ESTIMATED ghost outline (a generic shark trace), by design. Keep its placeholder.

## Stand-ins (painted, but not quite the species)

- `dogfish`: `hagfish/art/dogfish.ts` is a small deep-sea dogfish standing in for the **spiny dogfish**, *Squalus acanthias*. To make it exact: slate-grey above, pale below, **scattered small white spots** along the flanks, a spine before each of the two dorsals, no anal fin, a pointed snout and big eyes.
- `mako`: the game's mako player sprite (`src/art/fish/species/players.ts`, a pup) drawn through the game's swimmer. It is the right species but a flatter, game look. A painterly adult **shortfin mako** would be: metallic deep blue above and snow white below, a long conical pointed snout, big black eyes, long narrow teeth visible past the lips, a **crescent (lunate) tail**, and a strong keel on the tail stalk.

## Meals (placeholders now, in `meals.ts`)

| Meal | Eaten by | Size on screen | Defining features |
|---|---|---|---|
| Squid | cookiecutter (step 2) | 12 cm, ~270 px | A small open-ocean squid: torpedo mantle, triangular fins at the tail end, 8 arms and 2 longer tentacles, big eyes. Reddish to translucent. |
| Stingray | great hammerhead (step 7) | 0.7 m, ~190 px | Seen from the side (the camera is side-on), so mostly a thin disc. Show the disc's top edge, the raised eyes and spiracles, and a long whip tail with its spine. Sand-brown above. |
| Ray | tiger shark (step 8) | 0.8 m, ~200 px | As above (a stingray or eagle ray). Can be the same drawing, recoloured. |

Placed by the body's centre, facing `facing` (±1), `len` px long. No gore: meals vanish whole into the mouth.
