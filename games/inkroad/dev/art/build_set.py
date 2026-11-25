"""Generic builder for extra sets. usage: build_set.py <set>  (needs raw/<set>-{homes-1-2,homes-3-4,shops,office,civic,big,trees}.png and raw/tex-<set>.png)"""
import sys, subprocess
import numpy as np
from PIL import Image
import artlib as A
import build_tex as T

SET = sys.argv[1]
subprocess.run([sys.executable, "build_buildings.py", SET], check=True)

def cs_of(path, rows):
    exp = sum(rows)
    for d in (5, 3, 1):
        cs = A.cut(path, dilate=d)
        if len(cs) == exp:
            return A.order(cs, rows)
    raise SystemExit(f"{path}: {len(cs)} components, expected {exp}")

o = cs_of(f"raw/{SET}-big.png", [3, 2])
for c, k, w in zip(o, ["mall1-0", "stadium1-0", "port1-0", "park-multi1-0", "park-under1-0"], [480, 480, 480, 160, 160]):
    A.save(c["img"], f"b-{SET}-{k}", width=w)

t = cs_of(f"raw/{SET}-trees.png", [4, 4, 4])
n = int(sys.argv[2]) if len(sys.argv) > 2 else 8   # number of trees on rows 1-2
for i in range(8):
    A.save(t[i]["img"], f"tree-{SET}-{i+1}", width=round(t[i]["img"].width * 0.55))
for i in range(2):
    A.save(t[8 + i]["img"], f"tree-{SET}-shrub-{i+1}", width=round(t[8 + i]["img"].width * 0.42))
for i in range(2):
    A.save(t[10 + i]["img"], f"tree-{SET}-rock-{i+1}", width=round(t[10 + i]["img"].width * 0.5))

N = f"raw/tex-{SET}.png"
spec = eval(sys.argv[3]) if len(sys.argv) > 3 else {}
for name, (c, r, kw) in spec.items():
    T.make(f"tex-{SET}-{name}", T.cell(N, c, r), **kw)
