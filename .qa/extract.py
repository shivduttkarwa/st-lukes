# Dump a page frame from .qa/figma/pages.json: python .qa/extract.py <page-id> [max-depth]
# Per node: type, name, box relative to its section, fills, and for text the copy (italic runs as <em>) + type style.
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(HERE, "figma", "pages.json"), encoding="utf-8"))
page_id = sys.argv[1]
max_depth = int(sys.argv[2]) if len(sys.argv) > 2 else 6
page = data["nodes"][page_id]["document"]
px, py = page["absoluteBoundingBox"]["x"], page["absoluteBoundingBox"]["y"]


def hexcol(c, opacity=1.0):
    r, g, b = (round(c[k] * 255) for k in "rgb")
    a = round(c.get("a", 1) * opacity, 2)
    return f"#{r:02x}{g:02x}{b:02x}" + ("" if a == 1 else f"@{a}")


def fills(node, key="fills"):
    out = []
    for f in node.get(key, []):
        if f.get("visible") is False:
            continue
        if f["type"] == "SOLID":
            out.append(hexcol(f["color"], f.get("opacity", 1)))
        elif f["type"] == "IMAGE":
            out.append(f"IMG:{f['imageRef'][:10]}:{f.get('scaleMode')}")
        else:
            out.append(f["type"])
    return ",".join(out)


def text_with_runs(node):
    chars = node.get("characters", "")
    overrides = node.get("characterStyleOverrides", [])
    table = node.get("styleOverrideTable", {})
    base_italic = "Italic" in (node.get("style", {}).get("fontPostScriptName") or "")
    out, open_em = [], False
    for i, ch in enumerate(chars):
        sid = str(overrides[i]) if i < len(overrides) else "0"
        st = table.get(sid, {})
        italic = ("Italic" in (st.get("fontPostScriptName") or "")) or st.get("italic", False) if sid != "0" else base_italic
        if italic and not open_em:
            out.append("<em>")
            open_em = True
        if not italic and open_em:
            out.append("</em>")
            open_em = False
        out.append(ch)
    if open_em:
        out.append("</em>")
    return "".join(out).replace("\n", " / ").replace(" ", " // ")


def walk(node, depth, sx, sy):
    if node.get("visible") is False:
        return
    box = node.get("absoluteBoundingBox") or {"x": 0, "y": 0, "width": 0, "height": 0}
    x, y, w, h = round(box["x"] - sx), round(box["y"] - sy), round(box["width"]), round(box["height"])
    pad = "  " * depth
    kind = node["type"]
    line = f"{pad}{kind} [{node['id']}] \"{node['name'][:40]}\" x{x} y{y} {w}x{h}"
    f = fills(node)
    if f:
        line += f" fill={f}"
    s = fills(node, "strokes")
    if s:
        dash = node.get("strokeDashes")
        line += f" stroke={s} w={node.get('strokeWeight')}" + (f" dash={dash}" if dash else "")
    if node.get("opacity", 1) != 1:
        line += f" opacity={round(node['opacity'], 2)}"
    if node.get("rotation"):
        line += f" rot={round(node['rotation'] * 57.2958, 1)}deg"
    if node.get("effects"):
        line += " fx=" + ",".join(e["type"] for e in node["effects"] if e.get("visible", True))
    print(line)
    if kind == "TEXT":
        st = node.get("style", {})
        lh = st.get("lineHeightPercentFontSize")
        print(f"{pad}    font={st.get('fontFamily')} {st.get('fontPostScriptName')} {st.get('fontWeight')} size={st.get('fontSize')} "
              f"lh={round(st.get('lineHeightPx', 0), 1)}px({round(lh) if lh else '-'}%) ls={round(st.get('letterSpacing', 0), 2)} align={st.get('textAlignHorizontal')}")
        print(f"{pad}    text: {text_with_runs(node)}")
        return
    if depth >= max_depth:
        return
    # Collapse icon internals: report vector groups as a single line
    if kind in ("INSTANCE", "GROUP", "FRAME") and w <= 60 and h <= 60:
        return
    for child in node.get("children", []):
        walk(child, depth + 1, sx, sy)


print(f"PAGE {page['name']}  {round(page['absoluteBoundingBox']['width'])}x{round(page['absoluteBoundingBox']['height'])}")
for section in page.get("children", []):
    b = section["absoluteBoundingBox"]
    print(f"\n=== SECTION [{section['id']}] \"{section['name']}\" y{round(b['y'] - py)} h{round(b['height'])} fill={fills(section)}")
    if "footer" in section["name"].lower():
        print("  (shared footer, skipped)")
        continue
    for child in section.get("children", []):
        if "Navbar" in child["name"] or child["name"] == "Subnav":
            continue
        walk(child, 1, b["x"], b["y"])
