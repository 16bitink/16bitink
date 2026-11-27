# InkRoad art files (src/art/img)

Name = key with `/` as `-`, webp with alpha, 2x. Pixel size is the saved size.
Buildings `b-<set>-<key>`: footprint in cells; the footprint's south edge is the **bottom row** of the image, anchored at the bottom centre; the picture rises above it (and a little beside it, palms and walls overlap the plot width by a few px). Sets: `gulf`, `oldtown`.
Sprites (`tree-`, `prop-`, `v-`): foot at bottom centre, no shadow. Vehicles point right, native aspect (lengths as specced, thickness from the art).
Flat pieces (`flat-`) are drawn in plan on the ground container at exactly the given pixel size (stretched to fit the cell rect).
Textures `tex-*`: 512x512 seamless. Oldtown textures are `tex-oldtown-*`; the gulf set has no `-ground`, oldtown has no sand (use `tex-oldtown-ground`).
Oldtown sprites are `tree-oldtown-1..8` (1 birch, 2 oak, 3 fir, 4 gold beech, 5 poplar, 6 linden, 7 willow, 8 rowan), `tree-oldtown-shrub-1..3`, `tree-oldtown-rock-1`; the oldtown island reuses `flat-island` (sandy, weak) and the common props/vehicles are shared.
Extra sets, same key scheme: `b-islands-*`, `b-hills-*`, `b-rivers-*` (also `park-multi1-0`, `park-under1-0`, `mall1-0`, `stadium1-0`, `port1-0`; no fair). Their landmark is `landmark1-0` (islands glass garden dome, hills aqueduct garden, rivers brick power-station museum). Trees `tree-<set>-1..8`, `tree-<set>-shrub-1..2`, `tree-<set>-rock-1..2`; textures `tex-<set>-sand` (base ground), `-grass`, `-water`, `-rock`, `-plaza`, `-asphalt`, plus `-deep` (islands, rivers), `-shallow` (hills), `-beach` (islands), `-path` (hills). Oldtown island with lawn and flowers: `flat-oldtown-island`, `flat-oldtown-island-small`. Common vehicles/props/flat car parks are shared by all sets.
Routine sites per set: `b-<set>-fuel1-0`, `nursery1-0`, `food1-0`, `food1-1`, `food2-0` (2x2, 160 px) and `fun1-0` (3x2, 240 px: gulf water park, oldtown harbour sauna, islands night-market garden, hills tea garden, rivers ball park). Beach props: `prop-umbrella-1..3`, `prop-towel-1..2` (flat), `prop-lounger`, `prop-lifeguard`, `prop-beach-fence`, `prop-beach-kiosk`, `prop-surf-rack`, `prop-buoy`, `prop-fuel-sign` (blank bars, no text).
Front gardens `b-<set>-garden1-0..3` (gulf, oldtown, rivers, hills; 2x2, 160 px): the south half of a garden lot, one under each plot column. Open north edge (the villa's own front wall and gate stand there), side walls, a front wall with a centred gate on the south edge, a straight path between the two gates. Cut by `build_gardens.py <set>` from `raw/<set>-gardens.png`, scaled so the ground is exactly 2 cells deep and meets the villa above. Islands has no garden lots (falls back to gulf).
Missing on purpose: night `-lit` pictures; `tex-deck` (use `tex-concrete`); hospital has a leaf, not a cross.

| file | px | footprint (cells) | south edge |
|---|---|---|---|
| b-gulf-fair1-0 | 480x279 | 6x5 | bottom row |
| b-gulf-food1-0 | 160x138 | 2x2 | bottom row |
| b-gulf-food1-1 | 160x152 | 2x2 | bottom row |
| b-gulf-food2-0 | 160x128 | 2x2 | bottom row |
| b-gulf-fuel1-0 | 160x144 | 2x2 | bottom row |
| b-gulf-fun1-0 | 240x152 | 3x2 | bottom row |
| b-gulf-garden1-0 | 160x142 | 2x2 | bottom row |
| b-gulf-garden1-1 | 160x154 | 2x2 | bottom row |
| b-gulf-garden1-2 | 160x142 | 2x2 | bottom row |
| b-gulf-garden1-3 | 160x142 | 2x2 | bottom row |
| b-gulf-home1-0 | 160x175 | 2x2 | bottom row |
| b-gulf-home1-1 | 160x177 | 2x2 | bottom row |
| b-gulf-home1-2 | 160x169 | 2x2 | bottom row |
| b-gulf-home1-3 | 160x177 | 2x2 | bottom row |
| b-gulf-home2-0 | 160x172 | 2x2 | bottom row |
| b-gulf-home2-1 | 160x173 | 2x2 | bottom row |
| b-gulf-home2-2 | 160x171 | 2x2 | bottom row |
| b-gulf-home2-3 | 160x172 | 2x2 | bottom row |
| b-gulf-home3-0 | 160x183 | 2x2 | bottom row |
| b-gulf-home3-1 | 160x186 | 2x2 | bottom row |
| b-gulf-home3-2 | 160x182 | 2x2 | bottom row |
| b-gulf-home3-3 | 160x180 | 2x2 | bottom row |
| b-gulf-home4-0 | 160x255 | 2x2 | bottom row |
| b-gulf-home4-1 | 160x253 | 2x2 | bottom row |
| b-gulf-home4-2 | 160x250 | 2x2 | bottom row |
| b-gulf-home4-3 | 160x252 | 2x2 | bottom row |
| b-gulf-hospital1-0 | 320x170 | 4x3 | bottom row |
| b-gulf-landmark1-0 | 320x166 | 4x3 | bottom row |
| b-gulf-mall1-0 | 480x226 | 6x4 | bottom row |
| b-gulf-market1-0 | 320x197 | 4x3 | bottom row |
| b-gulf-nursery1-0 | 160x144 | 2x2 | bottom row |
| b-gulf-office1-0 | 160x130 | 2x2 | bottom row |
| b-gulf-office1-1 | 160x136 | 2x2 | bottom row |
| b-gulf-office2-0 | 160x135 | 2x2 | bottom row |
| b-gulf-office2-1 | 160x137 | 2x2 | bottom row |
| b-gulf-office3-0 | 160x181 | 2x2 | bottom row |
| b-gulf-office3-1 | 160x186 | 2x2 | bottom row |
| b-gulf-office4-0 | 160x214 | 2x2 | bottom row |
| b-gulf-office4-1 | 160x210 | 2x2 | bottom row |
| b-gulf-park-multi1-0 | 160x123 | 2x2 | bottom row |
| b-gulf-park-under1-0 | 160x149 | 2x2 | bottom row |
| b-gulf-port1-0 | 480x180 | 6x3 | bottom row |
| b-gulf-school1-0 | 320x173 | 4x3 | bottom row |
| b-gulf-shops1-0 | 160x151 | 2x2 | bottom row |
| b-gulf-shops1-1 | 160x156 | 2x2 | bottom row |
| b-gulf-shops2-0 | 160x152 | 2x2 | bottom row |
| b-gulf-shops2-1 | 160x161 | 2x2 | bottom row |
| b-gulf-shops3-0 | 160x153 | 2x2 | bottom row |
| b-gulf-shops3-1 | 160x160 | 2x2 | bottom row |
| b-gulf-shops4-0 | 160x171 | 2x2 | bottom row |
| b-gulf-shops4-1 | 160x167 | 2x2 | bottom row |
| b-gulf-stadium1-0 | 480x307 | 6x5 | bottom row |
| b-hills-food1-0 | 160x163 | 2x2 | bottom row |
| b-hills-food1-1 | 160x159 | 2x2 | bottom row |
| b-hills-food2-0 | 160x144 | 2x2 | bottom row |
| b-hills-fuel1-0 | 160x154 | 2x2 | bottom row |
| b-hills-fun1-0 | 240x139 | 3x2 | bottom row |
| b-hills-garden1-0 | 160x166 | 2x2 | bottom row |
| b-hills-garden1-1 | 160x155 | 2x2 | bottom row |
| b-hills-garden1-2 | 160x147 | 2x2 | bottom row |
| b-hills-garden1-3 | 160x167 | 2x2 | bottom row |
| b-hills-home1-0 | 160x174 | 2x2 | bottom row |
| b-hills-home1-1 | 160x173 | 2x2 | bottom row |
| b-hills-home1-2 | 160x161 | 2x2 | bottom row |
| b-hills-home1-3 | 160x163 | 2x2 | bottom row |
| b-hills-home2-0 | 160x184 | 2x2 | bottom row |
| b-hills-home2-1 | 160x173 | 2x2 | bottom row |
| b-hills-home2-2 | 160x173 | 2x2 | bottom row |
| b-hills-home2-3 | 160x162 | 2x2 | bottom row |
| b-hills-home3-0 | 160x192 | 2x2 | bottom row |
| b-hills-home3-1 | 160x204 | 2x2 | bottom row |
| b-hills-home3-2 | 160x202 | 2x2 | bottom row |
| b-hills-home3-3 | 160x203 | 2x2 | bottom row |
| b-hills-home4-0 | 160x246 | 2x2 | bottom row |
| b-hills-home4-1 | 160x247 | 2x2 | bottom row |
| b-hills-home4-2 | 160x252 | 2x2 | bottom row |
| b-hills-home4-3 | 160x248 | 2x2 | bottom row |
| b-hills-hospital1-0 | 320x181 | 4x3 | bottom row |
| b-hills-landmark1-0 | 320x174 | 4x3 | bottom row |
| b-hills-mall1-0 | 480x325 | 6x4 | bottom row |
| b-hills-market1-0 | 320x202 | 4x3 | bottom row |
| b-hills-nursery1-0 | 160x168 | 2x2 | bottom row |
| b-hills-office1-0 | 160x137 | 2x2 | bottom row |
| b-hills-office1-1 | 160x139 | 2x2 | bottom row |
| b-hills-office2-0 | 160x139 | 2x2 | bottom row |
| b-hills-office2-1 | 160x150 | 2x2 | bottom row |
| b-hills-office3-0 | 160x195 | 2x2 | bottom row |
| b-hills-office3-1 | 160x202 | 2x2 | bottom row |
| b-hills-office4-0 | 160x245 | 2x2 | bottom row |
| b-hills-office4-1 | 160x213 | 2x2 | bottom row |
| b-hills-park-multi1-0 | 160x88 | 2x2 | bottom row |
| b-hills-park-under1-0 | 160x122 | 2x2 | bottom row |
| b-hills-port1-0 | 480x268 | 6x3 | bottom row |
| b-hills-school1-0 | 320x185 | 4x3 | bottom row |
| b-hills-shops1-0 | 160x140 | 2x2 | bottom row |
| b-hills-shops1-1 | 160x138 | 2x2 | bottom row |
| b-hills-shops2-0 | 160x153 | 2x2 | bottom row |
| b-hills-shops2-1 | 160x162 | 2x2 | bottom row |
| b-hills-shops3-0 | 160x159 | 2x2 | bottom row |
| b-hills-shops3-1 | 160x153 | 2x2 | bottom row |
| b-hills-shops4-0 | 160x167 | 2x2 | bottom row |
| b-hills-shops4-1 | 160x173 | 2x2 | bottom row |
| b-hills-stadium1-0 | 480x453 | 6x5 | bottom row |
| b-islands-food1-0 | 160x169 | 2x2 | bottom row |
| b-islands-food1-1 | 160x167 | 2x2 | bottom row |
| b-islands-food2-0 | 160x137 | 2x2 | bottom row |
| b-islands-fuel1-0 | 160x156 | 2x2 | bottom row |
| b-islands-fun1-0 | 240x140 | 3x2 | bottom row |
| b-islands-home1-0 | 160x164 | 2x2 | bottom row |
| b-islands-home1-1 | 160x170 | 2x2 | bottom row |
| b-islands-home1-2 | 160x159 | 2x2 | bottom row |
| b-islands-home1-3 | 160x164 | 2x2 | bottom row |
| b-islands-home2-0 | 160x164 | 2x2 | bottom row |
| b-islands-home2-1 | 160x167 | 2x2 | bottom row |
| b-islands-home2-2 | 160x166 | 2x2 | bottom row |
| b-islands-home2-3 | 160x169 | 2x2 | bottom row |
| b-islands-home3-0 | 160x175 | 2x2 | bottom row |
| b-islands-home3-1 | 160x165 | 2x2 | bottom row |
| b-islands-home3-2 | 160x170 | 2x2 | bottom row |
| b-islands-home3-3 | 160x177 | 2x2 | bottom row |
| b-islands-home4-0 | 160x221 | 2x2 | bottom row |
| b-islands-home4-1 | 160x217 | 2x2 | bottom row |
| b-islands-home4-2 | 160x220 | 2x2 | bottom row |
| b-islands-home4-3 | 160x223 | 2x2 | bottom row |
| b-islands-hospital1-0 | 320x180 | 4x3 | bottom row |
| b-islands-landmark1-0 | 320x181 | 4x3 | bottom row |
| b-islands-mall1-0 | 480x299 | 6x4 | bottom row |
| b-islands-market1-0 | 320x187 | 4x3 | bottom row |
| b-islands-nursery1-0 | 160x182 | 2x2 | bottom row |
| b-islands-office1-0 | 160x141 | 2x2 | bottom row |
| b-islands-office1-1 | 160x126 | 2x2 | bottom row |
| b-islands-office2-0 | 160x158 | 2x2 | bottom row |
| b-islands-office2-1 | 160x152 | 2x2 | bottom row |
| b-islands-office3-0 | 160x176 | 2x2 | bottom row |
| b-islands-office3-1 | 160x184 | 2x2 | bottom row |
| b-islands-office4-0 | 160x222 | 2x2 | bottom row |
| b-islands-office4-1 | 160x205 | 2x2 | bottom row |
| b-islands-park-multi1-0 | 160x104 | 2x2 | bottom row |
| b-islands-park-under1-0 | 160x118 | 2x2 | bottom row |
| b-islands-port1-0 | 480x308 | 6x3 | bottom row |
| b-islands-school1-0 | 320x177 | 4x3 | bottom row |
| b-islands-shops1-0 | 160x147 | 2x2 | bottom row |
| b-islands-shops1-1 | 160x143 | 2x2 | bottom row |
| b-islands-shops2-0 | 160x144 | 2x2 | bottom row |
| b-islands-shops2-1 | 160x149 | 2x2 | bottom row |
| b-islands-shops3-0 | 160x142 | 2x2 | bottom row |
| b-islands-shops3-1 | 160x159 | 2x2 | bottom row |
| b-islands-shops4-0 | 160x138 | 2x2 | bottom row |
| b-islands-shops4-1 | 160x158 | 2x2 | bottom row |
| b-islands-stadium1-0 | 480x364 | 6x5 | bottom row |
| b-oldtown-food1-0 | 160x157 | 2x2 | bottom row |
| b-oldtown-food1-1 | 160x165 | 2x2 | bottom row |
| b-oldtown-food2-0 | 160x127 | 2x2 | bottom row |
| b-oldtown-fuel1-0 | 160x164 | 2x2 | bottom row |
| b-oldtown-fun1-0 | 240x146 | 3x2 | bottom row |
| b-oldtown-garden1-0 | 160x145 | 2x2 | bottom row |
| b-oldtown-garden1-1 | 160x145 | 2x2 | bottom row |
| b-oldtown-garden1-2 | 160x146 | 2x2 | bottom row |
| b-oldtown-garden1-3 | 160x146 | 2x2 | bottom row |
| b-oldtown-home1-0 | 160x162 | 2x2 | bottom row |
| b-oldtown-home1-1 | 160x159 | 2x2 | bottom row |
| b-oldtown-home1-2 | 160x155 | 2x2 | bottom row |
| b-oldtown-home1-3 | 160x159 | 2x2 | bottom row |
| b-oldtown-home2-0 | 160x170 | 2x2 | bottom row |
| b-oldtown-home2-1 | 160x172 | 2x2 | bottom row |
| b-oldtown-home2-2 | 160x168 | 2x2 | bottom row |
| b-oldtown-home2-3 | 160x170 | 2x2 | bottom row |
| b-oldtown-home3-0 | 160x184 | 2x2 | bottom row |
| b-oldtown-home3-1 | 160x194 | 2x2 | bottom row |
| b-oldtown-home3-2 | 160x189 | 2x2 | bottom row |
| b-oldtown-home3-3 | 160x188 | 2x2 | bottom row |
| b-oldtown-home4-0 | 160x196 | 2x2 | bottom row |
| b-oldtown-home4-1 | 160x203 | 2x2 | bottom row |
| b-oldtown-home4-2 | 160x205 | 2x2 | bottom row |
| b-oldtown-home4-3 | 160x203 | 2x2 | bottom row |
| b-oldtown-hospital1-0 | 320x178 | 4x3 | bottom row |
| b-oldtown-landmark1-0 | 320x207 | 4x3 | bottom row |
| b-oldtown-market1-0 | 320x169 | 4x3 | bottom row |
| b-oldtown-nursery1-0 | 160x151 | 2x2 | bottom row |
| b-oldtown-office1-0 | 160x121 | 2x2 | bottom row |
| b-oldtown-office1-1 | 160x131 | 2x2 | bottom row |
| b-oldtown-office2-0 | 160x164 | 2x2 | bottom row |
| b-oldtown-office2-1 | 160x163 | 2x2 | bottom row |
| b-oldtown-office3-0 | 160x216 | 2x2 | bottom row |
| b-oldtown-office3-1 | 160x202 | 2x2 | bottom row |
| b-oldtown-office4-0 | 160x274 | 2x2 | bottom row |
| b-oldtown-office4-1 | 160x214 | 2x2 | bottom row |
| b-oldtown-park-multi1-0 | 160x105 | 2x2 | bottom row |
| b-oldtown-park-under1-0 | 160x126 | 2x2 | bottom row |
| b-oldtown-port1-0 | 480x209 | 6x3 | bottom row |
| b-oldtown-school1-0 | 320x166 | 4x3 | bottom row |
| b-oldtown-shops1-0 | 160x114 | 2x2 | bottom row |
| b-oldtown-shops1-1 | 160x117 | 2x2 | bottom row |
| b-oldtown-shops2-0 | 160x152 | 2x2 | bottom row |
| b-oldtown-shops2-1 | 160x157 | 2x2 | bottom row |
| b-oldtown-shops3-0 | 160x157 | 2x2 | bottom row |
| b-oldtown-shops3-1 | 160x160 | 2x2 | bottom row |
| b-oldtown-shops4-0 | 160x168 | 2x2 | bottom row |
| b-oldtown-shops4-1 | 160x169 | 2x2 | bottom row |
| b-oldtown-stadium1-0 | 480x324 | 6x5 | bottom row |
| b-rivers-food1-0 | 160x162 | 2x2 | bottom row |
| b-rivers-food1-1 | 160x173 | 2x2 | bottom row |
| b-rivers-food2-0 | 160x131 | 2x2 | bottom row |
| b-rivers-fuel1-0 | 160x141 | 2x2 | bottom row |
| b-rivers-fun1-0 | 240x139 | 3x2 | bottom row |
| b-rivers-garden1-0 | 160x144 | 2x2 | bottom row |
| b-rivers-garden1-1 | 160x144 | 2x2 | bottom row |
| b-rivers-garden1-2 | 160x144 | 2x2 | bottom row |
| b-rivers-garden1-3 | 160x144 | 2x2 | bottom row |
| b-rivers-home1-0 | 160x165 | 2x2 | bottom row |
| b-rivers-home1-1 | 160x156 | 2x2 | bottom row |
| b-rivers-home1-2 | 160x159 | 2x2 | bottom row |
| b-rivers-home1-3 | 160x161 | 2x2 | bottom row |
| b-rivers-home2-0 | 160x150 | 2x2 | bottom row |
| b-rivers-home2-1 | 160x151 | 2x2 | bottom row |
| b-rivers-home2-2 | 160x154 | 2x2 | bottom row |
| b-rivers-home2-3 | 160x151 | 2x2 | bottom row |
| b-rivers-home3-0 | 160x187 | 2x2 | bottom row |
| b-rivers-home3-1 | 160x194 | 2x2 | bottom row |
| b-rivers-home3-2 | 160x189 | 2x2 | bottom row |
| b-rivers-home3-3 | 160x190 | 2x2 | bottom row |
| b-rivers-home4-0 | 160x210 | 2x2 | bottom row |
| b-rivers-home4-1 | 160x212 | 2x2 | bottom row |
| b-rivers-home4-2 | 160x217 | 2x2 | bottom row |
| b-rivers-home4-3 | 160x209 | 2x2 | bottom row |
| b-rivers-hospital1-0 | 320x172 | 4x3 | bottom row |
| b-rivers-landmark1-0 | 320x193 | 4x3 | bottom row |
| b-rivers-mall1-0 | 480x308 | 6x4 | bottom row |
| b-rivers-market1-0 | 320x177 | 4x3 | bottom row |
| b-rivers-nursery1-0 | 160x156 | 2x2 | bottom row |
| b-rivers-office1-0 | 160x106 | 2x2 | bottom row |
| b-rivers-office1-1 | 160x110 | 2x2 | bottom row |
| b-rivers-office2-0 | 160x130 | 2x2 | bottom row |
| b-rivers-office2-1 | 160x135 | 2x2 | bottom row |
| b-rivers-office3-0 | 160x202 | 2x2 | bottom row |
| b-rivers-office3-1 | 160x186 | 2x2 | bottom row |
| b-rivers-office4-0 | 160x205 | 2x2 | bottom row |
| b-rivers-office4-1 | 160x198 | 2x2 | bottom row |
| b-rivers-park-multi1-0 | 160x122 | 2x2 | bottom row |
| b-rivers-park-under1-0 | 160x125 | 2x2 | bottom row |
| b-rivers-port1-0 | 480x315 | 6x3 | bottom row |
| b-rivers-school1-0 | 320x169 | 4x3 | bottom row |
| b-rivers-shops1-0 | 160x118 | 2x2 | bottom row |
| b-rivers-shops1-1 | 160x140 | 2x2 | bottom row |
| b-rivers-shops2-0 | 160x132 | 2x2 | bottom row |
| b-rivers-shops2-1 | 160x138 | 2x2 | bottom row |
| b-rivers-shops3-0 | 160x149 | 2x2 | bottom row |
| b-rivers-shops3-1 | 160x151 | 2x2 | bottom row |
| b-rivers-shops4-0 | 160x162 | 2x2 | bottom row |
| b-rivers-shops4-1 | 160x155 | 2x2 | bottom row |
| b-rivers-stadium1-0 | 480x382 | 6x5 | bottom row |
| flat-carpark-lot | 240x160 | 3x2 | plan, whole image |
| flat-carpark-ride | 320x240 | 4x3 | plan, whole image |
| flat-island-small | 128x128 | round | plan, centre |
| flat-island | 256x256 | round | plan, centre |
| flat-oldtown-island-small | 128x128 |  | bottom row (foot) |
| flat-oldtown-island | 256x256 |  | bottom row (foot) |
| prop-barrier | 56x23 |  | bottom row (foot) |
| prop-beach-fence | 84x28 |  | bottom row (foot) |
| prop-beach-kiosk | 84x69 |  | bottom row (foot) |
| prop-boat-1 | 120x63 |  | bottom row (foot) |
| prop-boat-2 | 99x64 |  | bottom row (foot) |
| prop-buoy | 23x44 |  | bottom row (foot) |
| prop-bus-stop | 72x62 |  | bottom row (foot) |
| prop-cone | 14x20 |  | bottom row (foot) |
| prop-crane | 150x150 |  | bottom row (foot) |
| prop-digger | 86x64 |  | bottom row (foot) |
| prop-fuel-sign | 30x96 |  | bottom row (foot) |
| prop-jetty | 120x72 |  | bottom row (foot) |
| prop-kiosk | 84x64 |  | bottom row (foot) |
| prop-lamp | 20x86 |  | bottom row (foot) |
| prop-lifeguard | 62x84 |  | bottom row (foot) |
| prop-lounger | 25x44 |  | bottom row (foot) |
| prop-metro | 88x88 |  | bottom row (foot) |
| prop-pier | 54x104 |  | bottom row (foot) |
| prop-signal | 24x56 |  | bottom row (foot) |
| prop-sunshade | 56x61 |  | bottom row (foot) |
| prop-surf-rack | 60x44 |  | bottom row (foot) |
| prop-toll | 28x100 |  | bottom row (foot) |
| prop-towel-1 | 29x44 |  | bottom row (foot) |
| prop-towel-2 | 29x44 |  | bottom row (foot) |
| prop-umbrella-1 | 56x60 |  | bottom row (foot) |
| prop-umbrella-2 | 56x60 |  | bottom row (foot) |
| prop-umbrella-3 | 56x60 |  | bottom row (foot) |
| prop-warning | 29x56 |  | bottom row (foot) |
| prop-yacht | 200x74 |  | bottom row (foot) |
| tex-asphalt | 512x512 | tile |  |
| tex-buslane | 512x512 | tile |  |
| tex-concrete | 512x512 | tile |  |
| tex-deep | 512x512 | tile |  |
| tex-grass | 512x512 | tile |  |
| tex-hills-asphalt | 512x512 | tile |  |
| tex-hills-grass | 512x512 | tile |  |
| tex-hills-path | 512x512 | tile |  |
| tex-hills-plaza | 512x512 | tile |  |
| tex-hills-rock | 512x512 | tile |  |
| tex-hills-sand | 512x512 | tile |  |
| tex-hills-shallow | 512x512 | tile |  |
| tex-hills-water | 512x512 | tile |  |
| tex-islands-asphalt | 512x512 | tile |  |
| tex-islands-beach | 512x512 | tile |  |
| tex-islands-deep | 512x512 | tile |  |
| tex-islands-grass | 512x512 | tile |  |
| tex-islands-plaza | 512x512 | tile |  |
| tex-islands-rock | 512x512 | tile |  |
| tex-islands-sand | 512x512 | tile |  |
| tex-islands-water | 512x512 | tile |  |
| tex-oldtown-asphalt | 512x512 | tile |  |
| tex-oldtown-buslane | 512x512 | tile |  |
| tex-oldtown-cobble | 512x512 | tile |  |
| tex-oldtown-concrete | 512x512 | tile |  |
| tex-oldtown-deep | 512x512 | tile |  |
| tex-oldtown-grass | 512x512 | tile |  |
| tex-oldtown-ground | 512x512 | tile |  |
| tex-oldtown-paving | 512x512 | tile |  |
| tex-oldtown-plaza | 512x512 | tile |  |
| tex-oldtown-rock | 512x512 | tile |  |
| tex-oldtown-wash | 512x512 | tile |  |
| tex-oldtown-water | 512x512 | tile |  |
| tex-oldtown-works | 512x512 | tile |  |
| tex-paving | 512x512 | tile |  |
| tex-plaza | 512x512 | tile |  |
| tex-rivers-asphalt | 512x512 | tile |  |
| tex-rivers-deep | 512x512 | tile |  |
| tex-rivers-grass | 512x512 | tile |  |
| tex-rivers-plaza | 512x512 | tile |  |
| tex-rivers-rock | 512x512 | tile |  |
| tex-rivers-sand | 512x512 | tile |  |
| tex-rivers-water | 512x512 | tile |  |
| tex-rock | 512x512 | tile |  |
| tex-sand | 512x512 | tile |  |
| tex-wash | 512x512 | tile |  |
| tex-water | 512x512 | tile |  |
| tex-works | 512x512 | tile |  |
| tree-hills-1 | 40x151 |  | bottom row (foot) |
| tree-hills-2 | 124x126 |  | bottom row (foot) |
| tree-hills-3 | 145x137 |  | bottom row (foot) |
| tree-hills-4 | 131x139 |  | bottom row (foot) |
| tree-hills-5 | 55x133 |  | bottom row (foot) |
| tree-hills-6 | 131x112 |  | bottom row (foot) |
| tree-hills-7 | 138x116 |  | bottom row (foot) |
| tree-hills-8 | 130x112 |  | bottom row (foot) |
| tree-hills-rock-1 | 82x56 |  | bottom row (foot) |
| tree-hills-rock-2 | 100x65 |  | bottom row (foot) |
| tree-hills-shrub-1 | 75x54 |  | bottom row (foot) |
| tree-hills-shrub-2 | 72x58 |  | bottom row (foot) |
| tree-islands-1 | 126x132 |  | bottom row (foot) |
| tree-islands-2 | 124x132 |  | bottom row (foot) |
| tree-islands-3 | 199x124 |  | bottom row (foot) |
| tree-islands-4 | 135x117 |  | bottom row (foot) |
| tree-islands-5 | 144x135 |  | bottom row (foot) |
| tree-islands-6 | 86x136 |  | bottom row (foot) |
| tree-islands-7 | 185x135 |  | bottom row (foot) |
| tree-islands-8 | 141x128 |  | bottom row (foot) |
| tree-islands-rock-1 | 140x84 |  | bottom row (foot) |
| tree-islands-rock-2 | 104x75 |  | bottom row (foot) |
| tree-islands-shrub-1 | 89x72 |  | bottom row (foot) |
| tree-islands-shrub-2 | 94x78 |  | bottom row (foot) |
| tree-oldtown-1 | 96x140 |  | bottom row (foot) |
| tree-oldtown-2 | 136x135 |  | bottom row (foot) |
| tree-oldtown-3 | 92x143 |  | bottom row (foot) |
| tree-oldtown-4 | 117x131 |  | bottom row (foot) |
| tree-oldtown-5 | 60x138 |  | bottom row (foot) |
| tree-oldtown-6 | 117x119 |  | bottom row (foot) |
| tree-oldtown-7 | 112x108 |  | bottom row (foot) |
| tree-oldtown-8 | 102x118 |  | bottom row (foot) |
| tree-oldtown-rock-1 | 107x52 |  | bottom row (foot) |
| tree-oldtown-shrub-1 | 80x53 |  | bottom row (foot) |
| tree-oldtown-shrub-2 | 79x53 |  | bottom row (foot) |
| tree-oldtown-shrub-3 | 83x55 |  | bottom row (foot) |
| tree-palm-1 | 107x122 |  | bottom row (foot) |
| tree-palm-2 | 94x115 |  | bottom row (foot) |
| tree-palm-3 | 101x114 |  | bottom row (foot) |
| tree-palm-4 | 104x119 |  | bottom row (foot) |
| tree-palm-tall-1 | 95x142 |  | bottom row (foot) |
| tree-palm-tall-2 | 85x143 |  | bottom row (foot) |
| tree-rivers-1 | 136x139 |  | bottom row (foot) |
| tree-rivers-2 | 126x136 |  | bottom row (foot) |
| tree-rivers-3 | 127x130 |  | bottom row (foot) |
| tree-rivers-4 | 133x147 |  | bottom row (foot) |
| tree-rivers-5 | 140x135 |  | bottom row (foot) |
| tree-rivers-6 | 95x128 |  | bottom row (foot) |
| tree-rivers-7 | 106x132 |  | bottom row (foot) |
| tree-rivers-8 | 121x107 |  | bottom row (foot) |
| tree-rivers-rock-1 | 97x60 |  | bottom row (foot) |
| tree-rivers-rock-2 | 86x60 |  | bottom row (foot) |
| tree-rivers-shrub-1 | 79x51 |  | bottom row (foot) |
| tree-rivers-shrub-2 | 75x51 |  | bottom row (foot) |
| tree-rock-1 | 66x74 |  | bottom row (foot) |
| tree-rock-2 | 76x48 |  | bottom row (foot) |
| tree-rock-3 | 71x52 |  | bottom row (foot) |
| tree-rock-4 | 71x55 |  | bottom row (foot) |
| tree-round-1 | 126x108 |  | bottom row (foot) |
| tree-round-2 | 144x95 |  | bottom row (foot) |
| tree-round-3 | 92x100 |  | bottom row (foot) |
| tree-shrub-1 | 66x51 |  | bottom row (foot) |
| tree-shrub-2 | 60x50 |  | bottom row (foot) |
| tree-shrub-3 | 59x45 |  | bottom row (foot) |
| tree-shrub-4 | 62x49 |  | bottom row (foot) |
| v-ambulance | 136x72 |  | bottom row (foot) |
| v-boat | 150x68 |  | bottom row (foot) |
| v-bus | 272x102 |  | bottom row (foot) |
| v-car-1 | 112x58 |  | bottom row (foot) |
| v-car-2 | 112x65 |  | bottom row (foot) |
| v-car-3 | 112x59 |  | bottom row (foot) |
| v-car-4 | 112x54 |  | bottom row (foot) |
| v-car-5 | 112x57 |  | bottom row (foot) |
| v-fire | 200x85 |  | bottom row (foot) |
| v-icecream | 136x72 |  | bottom row (foot) |
| v-jeep | 112x69 |  | bottom row (foot) |
| v-lorry | 260x72 |  | bottom row (foot) |
| v-metro | 272x101 |  | bottom row (foot) |
| v-police | 112x57 |  | bottom row (foot) |
| v-school | 240x94 |  | bottom row (foot) |
| v-taxi | 112x56 |  | bottom row (foot) |
| v-tow | 152x65 |  | bottom row (foot) |
| v-tram | 440x155 |  | bottom row (foot) |
| v-truck | 232x114 |  | bottom row (foot) |
| v-van | 136x67 |  | bottom row (foot) |
