"""Routine sites (fuel, nursery, food, fun) for a set + beach props. usage build_life.py <set>|beach"""
import sys
import artlib as A

def cs_of(path, rows):
    exp = sum(rows)
    for d in (5, 3, 1):
        cs = A.cut(path, dilate=d)
        if len(cs) == exp:
            return A.order(cs, rows)
    raise SystemExit(f"{path}: {len(cs)} components, expected {exp}")

SET = sys.argv[1]
if SET == "beach":
    c = cs_of("raw/beach.png", [4, 4, 4])
    spec = [("prop-umbrella-1", (56, 72)), ("prop-umbrella-2", (56, 72)), ("prop-umbrella-3", (56, 72)),
            ("prop-lounger", (68, 44)), ("prop-towel-1", (60, 44)), ("prop-towel-2", (60, 44)),
            ("prop-lifeguard", (64, 84)), ("prop-beach-fence", (84, 40)), ("prop-beach-kiosk", (84, 72)),
            ("prop-fuel-sign", (30, 110)), ("prop-surf-rack", (60, 60)), ("prop-buoy", (34, 44))]
    for x, (n, f) in zip(c, spec):
        print(n, A.save(x["img"], n, fit=f))
else:
    c = cs_of(f"raw/{SET}-life.png", [3, 3])
    spec = [("fuel1-0", 160), ("nursery1-0", 160), ("food1-0", 160), ("food1-1", 160), ("food2-0", 160), ("fun1-0", 240)]
    for x, (n, w) in zip(c, spec):
        print(n, A.save(x["img"], f"b-{SET}-{n}", width=w))
