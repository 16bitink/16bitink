"""Cut the building sheets of one set. usage: build_buildings.py gulf|oldtown"""
import sys
import artlib as A

SET = sys.argv[1]
R = lambda n: f"raw/{SET}-{n}.png"
W1 = 160  # 2x2 plot
rows = {}

def grid(name, rows_spec):
    exp = sum(rows_spec)
    for d in (5, 3, 1):
        cs = A.cut(R(name), dilate=d)
        if len(cs) == exp:
            break
    print(name, "components", len(cs), "expected", exp)
    if len(cs) != exp:
        print("  areas", sorted(c["area"] for c in cs))
        return None
    return A.order(cs, rows_spec)

def plots(name, prefix_top, prefix_bot):
    cs = grid(name, [4, 4])
    if not cs: return
    for i in range(4):
        A.save(cs[i]["img"], f"b-{SET}-{prefix_top(i)}", width=W1)
        A.save(cs[4 + i]["img"], f"b-{SET}-{prefix_bot(i)}", width=W1)

def levels(name, kind):
    cs = grid(name, [4, 4])
    if not cs: return
    for i in range(4):
        A.save(cs[i]["img"], f"b-{SET}-{kind}{i+1}-0", width=W1)
        A.save(cs[4 + i]["img"], f"b-{SET}-{kind}{i+1}-1", width=W1)

def four(name, keys, widths):
    cs = grid(name, [2, 2])
    if not cs: return
    for c, k, w in zip(cs, keys, widths):
        A.save(c["img"], f"b-{SET}-{k}", width=w)

if SET == "gulf":
    plots("homes-1-2", lambda i: f"home1-{i}", lambda i: f"home2-{i}")
    plots("homes-3-4", lambda i: f"home3-{i}", lambda i: f"home4-{i}")
    levels("shops", "shops")
    levels("office", "office")
    four("civic", ["market1-0", "school1-0", "hospital1-0", "landmark1-0"], [320] * 4)
    four("big", ["mall1-0", "stadium1-0", "port1-0", "fair1-0"], [480] * 4)
else:
    plots("homes-1-2", lambda i: f"home1-{i}", lambda i: f"home2-{i}")
    plots("homes-3-4", lambda i: f"home3-{i}", lambda i: f"home4-{i}")
    levels("shops", "shops")
    levels("office", "office")
    four("civic", ["market1-0", "school1-0", "hospital1-0", "landmark1-0"], [320] * 4)
