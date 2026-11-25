"""Vehicles, props and trees of the gulf set (common ones), from raw sheets."""
import artlib as A
from PIL import Image

def order_rows(cs, rows):
    return A.order(cs, rows)

# ---- vehicles (nose right already). Lengths at 2x world size.
cs = order_rows(A.cut("raw/vehicles.png", dilate=3), [5, 5, 5, 5])
names = [("v-car-1", 112), ("v-car-2", 112), ("v-car-3", 112), ("v-car-4", 112), ("v-car-5", 112),
         ("v-taxi", 112), ("v-van", 136), ("v-truck", 232), ("v-tow", 152), ("v-police", 112),
         ("v-bus", 272), ("v-school", 240), ("v-tram", 440), ("v-metro", 272), ("v-boat", 150),
         ("v-lorry", 260), ("v-fire", 200), ("v-icecream", 136), ("v-jeep", 112), ("v-ambulance", 136)]
for c, (n, w) in zip(cs, names):
    print(n, A.save(c["img"], n, width=w))

# ---- trees
t = A.cut("raw/gulf-trees.png", dilate=3)
print("trees", len(t))
t = A.order(t, [4, 4, 4])
K = 0.55
for i in range(4):
    A.save(t[i]["img"], f"tree-palm-{i+1}", width=round(t[i]["img"].width * K))
for i in range(2):
    A.save(t[4 + i]["img"], f"tree-palm-tall-{i+1}", width=round(t[4 + i]["img"].width * K))
for i in range(2):
    A.save(t[6 + i]["img"], f"tree-round-{i+1}", width=round(t[6 + i]["img"].width * K))
for i in range(4):
    A.save(t[8 + i]["img"], f"tree-shrub-{i+1}", width=round(t[8 + i]["img"].width * 0.42))

# ---- props
p = A.order(A.cut("raw/gulf-props.png", dilate=3), [4, 4, 4])
print("props", len(p))
spec = ["prop-lamp:20x88", "prop-cone:16x20", "prop-barrier:56x32", "prop-bus-stop:72x64",
        "prop-metro:104x88", "prop-jetty:128x72", "prop-boat-1:120x64", "prop-boat-2:120x64",
        "prop-toll:28x104", "prop-pier:60x104", "tree-rock-0:60x50", "flat-island-fallback:256x256"]
ROT = {"prop-jetty", "prop-boat-1", "prop-boat-2"}  # drawn nose up; game wants nose right
for c, s in zip(p, spec):
    n, d = s.split(":")
    w, h = map(int, d.split("x"))
    img = c["img"].rotate(-90, expand=True) if n in ROT else c["img"]
    print(n, A.save(img, n, fit=(w, h)))
