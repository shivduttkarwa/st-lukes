# Show where a Figma text sits: its box, style and the chain of parent frames.
#   python .qa/find.py <figma-page-id> "<text substring>" [max-hits]
import glob
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
page_id, needle = sys.argv[1], sys.argv[2].lower()
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 3

nodes = {}
for name in ("pages.json", "home.json", *sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, "figma", "n*.json")))):  # every fetched node file too
    path = os.path.join(HERE, "figma", name)
    if os.path.exists(path):
        nodes.update(json.load(open(path, encoding="utf-8"))["nodes"])
page = nodes[page_id]["document"]
px, py = page["absoluteBoundingBox"]["x"], page["absoluteBoundingBox"]["y"]


def box(n):
    b = n.get("absoluteBoundingBox") or {}
    return "x%7.1f y%7.1f w%7.1f h%7.1f" % (b.get("x", 0) - px, b.get("y", 0) - py, b.get("width", 0), b.get("height", 0))


def layout(n):
    if not n.get("layoutMode") or n["layoutMode"] == "NONE":
        return ""
    return " %s gap%s pad[%s %s %s %s] %s/%s" % (
        n["layoutMode"][:1], n.get("itemSpacing", 0), n.get("paddingTop", 0), n.get("paddingRight", 0),
        n.get("paddingBottom", 0), n.get("paddingLeft", 0), n.get("primaryAxisAlignItems", "MIN"), n.get("counterAxisAlignItems", "MIN"))


hits = 0


def walk(n, chain):
    global hits
    if hits >= limit or n.get("visible") is False:
        return
    if n["type"] == "TEXT" and needle in n.get("characters", "").lower().replace("’", "'"):
        hits += 1
        st = n.get("style", {})
        print("TEXT  %s  %s %s/%.1f w%s %s/%s  \"%s\"" % (
            box(n), st.get("fontFamily"), st.get("fontSize"), st.get("lineHeightPx", 0), st.get("fontWeight"),
            st.get("textAlignHorizontal"), st.get("textAlignVertical"), n["characters"][:50].replace("\n", " | ")))
        for depth, p in enumerate(reversed(chain[-6:])):
            print("   ^%d  %s  %-5s %s%s" % (depth + 1, box(p), p["type"][:5], p.get("name", "")[:28], layout(p)))
        print()
    for c in n.get("children", []):
        walk(c, chain + [n])


walk(page, [])
