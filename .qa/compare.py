# Compare a measured page (measure.mjs output) with its Figma frame.
#   python .qa/compare.py <figma-page-id> <measured.json> [tolerance]
# Reports section height/offset differences and, for every Figma text node, how far my text run is from it.
import glob
import json
import os
import re
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
px, py = page["absoluteBoundingBox"]["x"], page["absoluteBoundingBox"]["y"]
mine = json.load(open(measured_path, encoding="utf-8"))


def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip().lower()


def hexcol(c):
    return "#%02x%02x%02x" % tuple(round(c[k] * 255) for k in "rgb")


def rgb_to_hex(s):
    m = re.findall(r"[\d.]+", s)
    return "#%02x%02x%02x" % tuple(int(float(v)) for v in m[:3]) if len(m) >= 3 else s


figma_texts = []


def walk(node, section):
    if node.get("visible") is False:
        return
    if node["type"] == "TEXT":
        lines = [l for l in re.split(r"[\n ]", node.get("characters", "")) if l.strip()]
        if lines:
            b = node["absoluteBoundingBox"]
            st = node.get("style", {})
            # first-run style may differ from the node style (mixed text): use the override of char 0
            ov = node.get("characterStyleOverrides") or []
            first = node.get("styleOverrideTable", {}).get(str(ov[0]), {}) if ov and ov[0] else {}
            # an override can recolour the run, so prefer its fill over the node's base fill
            fill = next((f for f in (first.get("fills") or node.get("fills") or []) if f.get("type") == "SOLID" and f.get("visible", True)), None)
            figma_texts.append({
                "text": norm(lines[0]), "raw": lines[0].strip(), "section": section,
                "x": b["x"] - px, "y": b["y"] - py, "w": b["width"], "h": b["height"],
                "size": first.get("fontSize", st.get("fontSize")), "lh": first.get("lineHeightPx", st.get("lineHeightPx")),
                "family": first.get("fontFamily", st.get("fontFamily")), "weight": first.get("fontWeight", st.get("fontWeight")),
                "align": st.get("textAlignHorizontal", "LEFT"), "valign": "TOP" if st.get("textAutoResize") in ("HEIGHT", "WIDTH_AND_HEIGHT") else st.get("textAlignVertical", "TOP"),
                "color": hexcol(fill["color"]) if fill else None, "paragraphs": len(lines),
                "lead": len(re.match(r"^[\s ]*", node.get("characters", "")).group(0).replace(" ", "")),
            })
        return
    for child in node.get("children", []):
        walk(child, section)


sections = [c for c in page.get("children", []) if c.get("visible") is not False]
for i, s in enumerate(sections):
    start = len(figma_texts)
    walk(s, s["name"])
    for t in figma_texts[start:]:
        t["sec"] = i
        t["sec_y"] = s["absoluteBoundingBox"]["y"] - py

print(f"=== {page['name']}  figma height {round(page['absoluteBoundingBox']['height'])}  mine {mine['height']}")
print("-- sections (figma → mine)")
for i, s in enumerate(sections):
    b = s["absoluteBoundingBox"]
    fy, fh = round(b["y"] - py), round(b["height"])
    if i < len(mine["sections"]):
        m = mine["sections"][i]
        flag = "" if abs(m["height"] - fh) <= tol and abs(m["top"] - fy) <= tol else "   <<<"
        print(f"   {s['name'][:26]:26} y {fy:>5} h {fh:>5}  |  {m['name'][:22]:22} y {m['top']:>7} h {m['height']:>7}   dh {m['height'] - fh:+.1f}{flag}")
    else:
        print(f"   {s['name'][:26]:26} y {fy:>5} h {fh:>5}  |  (no matching section)")

used = set()
section_top = {s["name"] + str(i): 0 for i, s in enumerate(sections)}
rows = []
for ft in sorted(figma_texts, key=lambda t: (t["y"], t["x"])):
    key = ft["text"][:26]
    best, best_d = None, 1e9
    for i, mt in enumerate(mine["texts"]):
        if i in used:
            continue
        t = norm(mt["text"])
        if not (t.startswith(key) or key.startswith(t[:26]) and len(t) >= min(len(key), 12)):
            continue
        d = abs(mt["top"] - ft["y"]) + abs(mt["left"] - ft["x"]) * 0.2
        if d < best_d:
            best, best_d = i, d
    if best is None:
        rows.append((ft, None))
        continue
    used.add(best)
    rows.append((ft, mine["texts"][best]))

print("-- text runs off by more than", tol)
missing, shown = 0, 0
for ft, mt in rows:
    if mt is None:
        missing += 1
        print(f"   MISSING  y{round(ft['y']):>5} x{round(ft['x']):>5}  \"{ft['raw'][:50]}\"")
        continue
    if ft["align"] == "RIGHT":
        dx = mt["right"] - (ft["x"] + ft["w"])
    elif ft["align"] == "CENTER":
        dx = (mt["left"] + mt["right"]) / 2 - (ft["x"] + ft["w"] / 2)
    else:
        dx = mt["left"] - ft["x"]
    fy = ft["y"] + ft["lead"] * (ft["lh"] or 0)
    if ft["valign"] == "BOTTOM" and ft["lh"]:
        fy = ft["y"] + ft["h"] - ft["lh"] * max(1, mt["lines"])
    elif ft["valign"] == "CENTER" and ft["lh"]:
        fy = ft["y"] + (ft["h"] - ft["lh"] * max(1, mt["lines"])) / 2
    # position inside the section, so an earlier section's height error does not smear down the page
    my_sec_top = mine["sections"][ft["sec"]]["top"] if ft["sec"] < len(mine["sections"]) else ft["sec_y"]
    dy = (mt["top"] - my_sec_top) - (fy - ft["sec_y"])
    notes = [f"@y{round(fy - ft['sec_y'])}"]
    if ft["size"] and abs(mt["fontSize"] - ft["size"]) > 0.6:
        notes.append(f"size {mt['fontSize']} vs {round(ft['size'], 1)}")
    if ft["lh"] and abs(mt["lineHeight"] - ft["lh"]) > 0.8:
        notes.append(f"lh {mt['lineHeight']} vs {round(ft['lh'], 1)}")
    if ft["weight"] and str(ft["weight"]) != str(mt["weight"]) and not (ft["weight"] == 250):
        notes.append(f"weight {mt['weight']} vs {ft['weight']}")
    if ft["color"] and rgb_to_hex(mt["color"]) != ft["color"]:
        notes.append(f"colour {rgb_to_hex(mt['color'])} vs {ft['color']}")
    fam = (ft["family"] or "").lower()
    if fam and "argent" not in fam and fam != mt["family"].lower():
        notes.append(f"font {mt['family']} vs {ft['family']}")
    if abs(dx) > tol or abs(dy) > tol or len(notes) > 1:
        shown += 1
        print(f"   dx {dx:+6.1f} dy {dy:+6.1f}  [{ft['section'][:14]:14}] \"{ft['raw'][:44]}\"  {'; '.join(notes)}")
print(f"-- {len(rows)} figma text nodes, {shown} off, {missing} missing")
