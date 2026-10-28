# Add the geometry-built icons in .qa/figma/svg2 to the sprite. Timeline step icons are centred in a 48 box
# so they drop straight into the 3rem marker disc like the earlier time icons.
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, ".qa", "figma", "svg2")
SYMBOLS = {
    "2238-5203": ("icon-download", False),
    "2238-6267": ("icon-contact-phone", False),
    "2238-6271": ("icon-contact-mail", False),
    "2238-6284": ("icon-contact-pin", False),
    "2238-6181": ("icon-step-enquiry", True),
    "2238-6209": ("icon-step-application", True),
    "2238-6191": ("icon-step-interview", True),
    "2238-6222": ("icon-step-offer", True),
    "2238-6200": ("icon-step-accept", True),
}
path = os.path.join(ROOT, "src", "partials", "icons.html")
sprite = open(path, encoding="utf-8").read()
added = []
for node, (symbol_id, centre) in SYMBOLS.items():
    if f'id="{symbol_id}"' in sprite:
        continue
    svg = open(os.path.join(SVG, node + ".svg"), encoding="utf-8").read()
    x, y, w, h = (float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split())
    if centre:
        x, y, w, h = x - (48 - w) / 2, y - (48 - h) / 2, 48, 48
    inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
    inner = "\n".join("    " + line.strip() for line in inner.strip().splitlines())
    added.append(f'  <symbol id="{symbol_id}" viewBox="{x:.2f} {y:.2f} {w:.2f} {h:.2f}" fill="none">\n{inner}\n  </symbol>')
if added:
    head, tail = sprite.rsplit("</svg>", 1)
    open(path, "w", encoding="utf-8").write(head + "\n".join(added) + "\n</svg>" + tail)
print("symbols added:", len(added))
