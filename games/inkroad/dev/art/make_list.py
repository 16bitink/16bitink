import re
from PIL import Image
import artlib as A

FP = {"home": "2x2", "shops": "2x2", "office": "2x2", "market": "4x3", "fuel": "2x2", "nursery": "2x2", "food": "2x2", "fun": "3x2", "school": "4x3", "hospital": "4x3",
      "landmark": "4x3", "mall": "6x4", "stadium": "6x5", "port": "6x3", "fair": "6x5",
      "park-multi": "2x2", "park-under": "2x2"}
L = ["# InkRoad art files (src/art/img)", "",
     "Name = key with `/` as `-`, webp with alpha, 2x. Pixel size is the saved size.",
     "Buildings `b-<set>-<key>`: footprint in cells; the footprint's south edge is the **bottom row** of the image, anchored at the bottom centre; the picture rises above it (and a little beside it, palms and walls overlap the plot width by a few px). Sets: `gulf`, `oldtown`.",
     "Sprites (`tree-`, `prop-`, `v-`): foot at bottom centre, no shadow. Vehicles point right, native aspect (lengths as specced, thickness from the art).",
     "Flat pieces (`flat-`) are drawn in plan on the ground container at exactly the given pixel size (stretched to fit the cell rect).",
     "Textures `tex-*`: 512x512 seamless. Oldtown textures are `tex-oldtown-*`; the gulf set has no `-ground`, oldtown has no sand (use `tex-oldtown-ground`).",
     "Oldtown sprites are `tree-oldtown-1..8` (1 birch, 2 oak, 3 fir, 4 gold beech, 5 poplar, 6 linden, 7 willow, 8 rowan), `tree-oldtown-shrub-1..3`, `tree-oldtown-rock-1`; the oldtown island reuses `flat-island` (sandy, weak) and the common props/vehicles are shared.",
     "Extra sets, same key scheme: `b-islands-*`, `b-hills-*`, `b-rivers-*` (also `park-multi1-0`, `park-under1-0`, `mall1-0`, `stadium1-0`, `port1-0`; no fair). Their landmark is `landmark1-0` (islands glass garden dome, hills aqueduct garden, rivers brick power-station museum). Trees `tree-<set>-1..8`, `tree-<set>-shrub-1..2`, `tree-<set>-rock-1..2`; textures `tex-<set>-sand` (base ground), `-grass`, `-water`, `-rock`, `-plaza`, `-asphalt`, plus `-deep` (islands, rivers), `-shallow` (hills), `-beach` (islands), `-path` (hills). Oldtown island with lawn and flowers: `flat-oldtown-island`, `flat-oldtown-island-small`. Common vehicles/props/flat car parks are shared by all sets.",
     "Routine sites per set: `b-<set>-fuel1-0`, `nursery1-0`, `food1-0`, `food1-1`, `food2-0` (2x2, 160 px) and `fun1-0` (3x2, 240 px: gulf water park, oldtown harbour sauna, islands night-market garden, hills tea garden, rivers ball park). Beach props: `prop-umbrella-1..3`, `prop-towel-1..2` (flat), `prop-lounger`, `prop-lifeguard`, `prop-beach-fence`, `prop-beach-kiosk`, `prop-surf-rack`, `prop-buoy`, `prop-fuel-sign` (blank bars, no text).",
     "Missing on purpose: night `-lit` pictures; `tex-deck` (use `tex-concrete`); hospital has a leaf, not a cross.", "",
     "| file | px | footprint (cells) | south edge |", "|---|---|---|---|"]
for p in sorted(A.OUT.glob("*.webp")):
    n = p.stem
    w, h = Image.open(p).size
    fp, se = "", ""
    m = re.match(r"b-(gulf|oldtown|islands|hills|rivers)-(.+?)(\d)-(\d)$", n)
    if m:
        k = m.group(2).rstrip("-")
        fp = FP.get(k, "?"); se = "bottom row"
    elif n.startswith("flat-carpark-lot"): fp, se = "3x2", "plan, whole image"
    elif n.startswith("flat-carpark-ride"): fp, se = "4x3", "plan, whole image"
    elif n.startswith("flat-island"): fp, se = "round", "plan, centre"
    elif n.startswith("tex-"): fp, se = "tile", ""
    else: se = "bottom row (foot)"
    L.append(f"| {n} | {w}x{h} | {fp} | {se} |")
(A.OUT / "LIST.md").write_text("\n".join(L) + "\n")
