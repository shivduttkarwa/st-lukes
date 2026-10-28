# Compare every image-filled Figma node with the visible photo boxes measured on my page.
#   python .qa/compare-img.py <figma-page-id> <measured.json> [tolerance]
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
page_id, measured_path = sys.argv[1], sys.argv[2]
tol = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0

nodes = {}
for name in ("pages.json", "home.json", *sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, "figma", "n*.json")))):  # every fetched node file too
    path = os.path.join(HERE, "figma", name)
    if os.path.exists(path):
        nodes.update(json.load(open(path, encoding="utf-8"))["nodes"])
page = nodes[page_id]["document"]
pb = page["absoluteBoundingBox"]
mine = json.load(open(measured_path, encoding="utf-8"))

figma = []


def clip(b, c):
    l, t = max(b[0], c[0]), max(b[1], c[1])
    r, bt = min(b[0] + b[2], c[0] + c[2]), min(b[1] + b[3], c[1] + c[3])
    return (l, t, r - l, bt - t)


def walk(n, clipbox):
    if n.get("visible") is False:
        return
    b = n.get("absoluteBoundingBox")
    if not b:
        return
    box = (b["x"] - pb["x"], b["y"] - pb["y"], b["width"], b["height"])
    if any(f.get("type") == "IMAGE" and f.get("visible", True) for f in n.get("fills", [])):
        v = clip(box, clipbox)
        if v[2] > 20 and v[3] > 20:
            figma.append((n.get("name", "")[:22], v))
    inner = clip(box, clipbox) if n.get("clipsContent") else clipbox
    for c in n.get("children", []):
        walk(c, inner)


walk(page, (0, 0, pb["width"], pb["height"]))

print("=== %s  images: figma %d  mine %d" % (page["name"], len(figma), len(mine.get("images", []))))
used = set()
bad = 0
for name, (x, y, w, h) in sorted(figma, key=lambda f: (f[1][1], f[1][0])):
    best, best_d = None, 1e9
    for i, im in enumerate(mine.get("images", [])):
        if i in used:
            continue
        d = abs(im["left"] - x) + abs(im["top"] - y) + abs(im["width"] - w) + abs(im["height"] - h)
        if d < best_d:
            best, best_d = i, d
    if best is None or best_d > 400:
        print("   MISSING  x%7.1f y%7.1f w%7.1f h%7.1f  %s" % (x, y, w, h, name))
        bad += 1
        continue
    used.add(best)
    im = mine["images"][best]
    dx, dy, dw, dh = im["left"] - x, im["top"] - y, im["width"] - w, im["height"] - h
    if max(abs(dx), abs(dy), abs(dw), abs(dh)) > tol:
        bad += 1
        print("   dx %+6.1f dy %+6.1f dw %+6.1f dh %+6.1f  figma x%7.1f y%7.1f w%7.1f h%7.1f  %s" % (dx, dy, dw, dh, x, y, w, h, im["src"]))
print("-- %d of %d image boxes off by more than %.1f" % (bad, len(figma), tol))
