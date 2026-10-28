# Readable dump of a mobile frame: tree with frame-relative boxes, text runs and type styles.
import json, sys, glob, os
FIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figma")
def load():
    for p in [os.path.join(FIG,"pages.json")] + sorted(glob.glob(os.path.join(FIG,"n*.json"))):
        yield json.load(open(p, encoding="utf-8"))
def find(n, i):
    if n.get("id") == i: return n
    for c in n.get("children", []):
        r = find(c, i)
        if r: return r
def node(i):
    for src in load():
        for e in src["nodes"].values():
            r = find(e["document"], i)
            if r: return r
    raise KeyError(i)

root = node(sys.argv[1])
ox, oy = root["absoluteBoundingBox"]["x"], root["absoluteBoundingBox"]["y"]
maxd = int(sys.argv[2]) if len(sys.argv) > 2 else 99
def hexf(n):
    for f in (n.get("fills") or []):
        if f["type"] == "SOLID" and f.get("visible", True):
            c = f["color"]; return "#%02x%02x%02x" % (round(c["r"]*255), round(c["g"]*255), round(c["b"]*255))
    return ""
def walk(n, d=0):
    b = n.get("absoluteBoundingBox") or {}
    x, y = round(b.get("x", ox)-ox), round(b.get("y", oy)-oy)
    w, h = round(b.get("width", 0)), round(b.get("height", 0))
    s = n.get("style") or {}
    bits = []
    if s: bits.append("%s %s/%s w%s ls%s" % (s.get("fontFamily",""), round(s.get("fontSize",0),1), round(s.get("lineHeightPx",0),1), s.get("fontWeight",""), round(s.get("letterSpacing",0),2)))
    if hexf(n): bits.append(hexf(n))
    if n.get("layoutMode"): bits.append("%s gap%s pad%s,%s,%s,%s" % (n["layoutMode"], n.get("itemSpacing",0), n.get("paddingTop",0), n.get("paddingRight",0), n.get("paddingBottom",0), n.get("paddingLeft",0)))
    if n.get("cornerRadius"): bits.append("r%s" % n["cornerRadius"])
    print("%s%s [%s] %s  @%s,%s %sx%s  %s" % ("  "*d, n.get("name","?")[:34], n.get("type","")[:6], n["id"], x, y, w, h, " | ".join(bits)))
    if n.get("type") == "TEXT":
        print("%s   %r" % ("  "*d, n.get("characters","")[:160]))
    if d < maxd:
        for c in n.get("children", []): walk(c, d+1)
walk(root)
