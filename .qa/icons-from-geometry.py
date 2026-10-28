# Rebuild icon SVGs from Figma node geometry (nodes fetched with geometry=paths).
# python .qa/icons-from-geometry.py <nodes.json> <out-dir>
# Stroke outlines come back as fill paths, so every icon is emitted as filled paths on currentColor.
import json
import os
import re
import sys

src, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
data = json.load(open(src, encoding="utf-8"))


def mul(a, b):
    # 2x3 affine product a·b
    return [
        [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1], a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2]],
        [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1], a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2]],
    ]


def visible_paint(node, key):
    return any(p.get("visible", True) and p.get("opacity", 1) > 0 for p in node.get(key, []))


def collect(node, matrix, paths, is_root=False):
    if node.get("visible") is False:
        return
    local = node.get("relativeTransform") or [[1, 0, 0], [0, 1, 0]]
    if is_root:
        local = [[local[0][0], local[0][1], 0], [local[1][0], local[1][1], 0]]  # keep rotation, drop position
    m = mul(matrix, local)
    # the pale disc behind timeline icons is drawn in CSS
    disc = node["type"] == "ELLIPSE" and any(
        p["type"] == "SOLID" and round(p["color"]["b"] * 255) == 255 and round(p["color"]["r"] * 255) == 194 for p in node.get("fills", []))
    if not disc:
        if visible_paint(node, "strokes"):
            for g in node.get("strokeGeometry", []):
                paths.append((g["path"], g.get("windingRule", "NONZERO"), m))
        if visible_paint(node, "fills") and node["type"] not in ("FRAME", "GROUP", "INSTANCE", "COMPONENT"):
            for g in node.get("fillGeometry", []):
                paths.append((g["path"], g.get("windingRule", "NONZERO"), m))
    for child in node.get("children", []):
        collect(child, m, paths)


def bbox(paths):
    xs, ys = [], []
    for d, _, m in paths:
        nums = [float(n) for n in re.findall(r"-?\d*\.?\d+(?:e-?\d+)?", d)]
        for i in range(0, len(nums) - 1, 2):
            x, y = nums[i], nums[i + 1]
            xs.append(m[0][0] * x + m[0][1] * y + m[0][2])
            ys.append(m[1][0] * x + m[1][1] * y + m[1][2])
    return min(xs), min(ys), max(xs), max(ys)


for node_id, entry in data["nodes"].items():
    root = entry["document"]
    paths = []
    collect(root, [[1, 0, 0], [0, 1, 0]], paths, is_root=True)
    if not paths:
        print(node_id, "no geometry")
        continue
    x0, y0, x1, y1 = bbox(paths)
    w, h = x1 - x0, y1 - y0
    body = "\n".join(
        f'  <path fill="currentColor" fill-rule="{"evenodd" if rule == "EVENODD" else "nonzero"}" '
        f'transform="matrix({m[0][0]:.5f} {m[1][0]:.5f} {m[0][1]:.5f} {m[1][1]:.5f} {m[0][2]:.3f} {m[1][2]:.3f})" d="{d}"/>'
        for d, rule, m in paths)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.2f}" height="{h:.2f}" viewBox="{x0:.2f} {y0:.2f} {w:.2f} {h:.2f}" fill="none">\n{body}\n</svg>\n'
    name = node_id.replace(":", "-") + ".svg"
    open(os.path.join(out_dir, name), "w", encoding="utf-8").write(svg)
    print(f"{name:16} {root['name'][:32]:32} {w:.1f} x {h:.1f}  paths={len(paths)}")
