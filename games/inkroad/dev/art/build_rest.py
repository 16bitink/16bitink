"""Second wave: gulf parks/flat/props2, oldtown everything."""
import numpy as np
from PIL import Image
import artlib as A
import build_tex as T

OUT = A.OUT
def rm(n):
    p = OUT / f"{n}.webp"
    if p.exists(): p.unlink()
rm("tree-rock-0"); rm("flat-island-fallback")

def cs_of(path, rows):
    exp = sum(rows)
    for d in (5, 3, 1):
        cs = A.cut(path, dilate=d)
        if len(cs) == exp:
            return A.order(cs, rows)
    raise SystemExit(f"{path}: {len(cs)} components, expected {exp}")

# ---- gulf car parks (multi / under) and flat pieces
p = cs_of("raw/gulf-parks.png", [2, 2])
A.save(p[2]["img"], "b-gulf-park-multi1-0", width=160)
A.save(p[3]["img"], "b-gulf-park-under1-0", width=160)

def stretch(img, name, size):
    im = A.clean(img).resize(size, Image.LANCZOS)
    im.save(OUT / f"{name}.webp", "WEBP", quality=88, method=6)
f = cs_of("raw/gulf-flat.png", [2, 2])
stretch(f[0]["img"], "flat-carpark-lot", (240, 160))
stretch(f[1]["img"], "flat-carpark-ride", (320, 240))
stretch(f[2]["img"], "flat-island", (256, 256))
stretch(f[3]["img"], "flat-island-small", (128, 128))

# ---- gulf props 2
q = cs_of("raw/gulf-props2.png", [4, 4, 4])
for i in range(4):
    A.save(q[i]["img"], f"tree-rock-{i+1}", width=round(q[i]["img"].width * 0.45))
A.save(q[4]["img"], "tree-round-3", width=round(q[4]["img"].width * 0.55))
A.save(q[5]["img"], "prop-sunshade", fit=(56, 64))
A.save(q[6]["img"], "prop-kiosk", fit=(84, 70))
A.save(q[7]["img"], "prop-crane", fit=(150, 220))
A.save(q[8]["img"], "prop-digger", fit=(92, 64))
A.save(q[9]["img"], "prop-signal", fit=(24, 70))
A.save(q[10]["img"], "prop-warning", fit=(30, 56))
A.save(q[11]["img"].rotate(-90, expand=True), "prop-yacht", fit=(200, 80))

# ---- oldtown buildings
import subprocess, sys
subprocess.run([sys.executable, "build_buildings.py", "oldtown"], check=True)
o = cs_of("raw/oldtown-big.png", [2, 2])
A.save(o[0]["img"], "b-oldtown-port1-0", width=480)
A.save(o[1]["img"], "b-oldtown-stadium1-0", width=480)
A.save(o[2]["img"], "b-oldtown-park-multi1-0", width=160)
A.save(o[3]["img"], "b-oldtown-park-under1-0", width=160)

# ---- oldtown trees: birch oak fir beech / poplar linden willow rowan / 3 shrubs + rock
t = cs_of("raw/oldtown-trees.png", [4, 4, 4])
for i in range(8):
    A.save(t[i]["img"], f"tree-oldtown-{i+1}", width=round(t[i]["img"].width * 0.55))
for i in range(3):
    A.save(t[8 + i]["img"], f"tree-oldtown-shrub-{i+1}", width=round(t[8 + i]["img"].width * 0.42))
A.save(t[11]["img"], "tree-oldtown-rock-1", width=round(t[11]["img"].width * 0.5))

# ---- oldtown textures
N = "raw/tex-oldtown.png"
T.make("tex-oldtown-ground", T.cell(N, 0, 0), contrast=0.6, blur=1.6)
T.make("tex-oldtown-grass", T.cell(N, 1, 0), contrast=0.8, blur=0.8)
T.make("tex-oldtown-cobble", T.cell(N, 2, 0), contrast=0.85)
T.make("tex-oldtown-paving", T.cell(N, 3, 0), contrast=0.85)
T.make("tex-oldtown-water", T.cell(N, 0, 1), contrast=0.8)
T.make("tex-oldtown-deep", T.cell(N, 1, 1), contrast=0.8)
T.make("tex-oldtown-asphalt", T.cell(N, 2, 1), contrast=0.8)
T.make("tex-oldtown-plaza", T.cell(N, 3, 1), contrast=0.85)

def cool(src, dst):
    a = np.asarray(Image.open(OUT / f"{src}.webp").convert("RGB"), np.float32)
    a = a * np.array([0.93, 0.98, 1.05])
    A.save_tex(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), dst)
for s in ("rock", "works", "concrete", "wash", "buslane"):
    cool(f"tex-{s}", f"tex-oldtown-{s}")
