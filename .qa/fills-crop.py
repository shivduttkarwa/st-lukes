# Reproduce a Figma image-fill exactly from the original fill + the node's imageTransform (no render API needed).
#   python .qa/fills-crop.py check                     compare the method against an existing Figma render
#   python .qa/fills-crop.py export                    write the site assets for the remaining pages
import glob
import json
import math
import os
import sys
import urllib.request
from PIL import Image, ImageChops, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "figma")
ROOT = os.path.dirname(HERE)
IMG = os.path.join(ROOT, "src", "assets", "images")
pages = json.load(open(os.path.join(FIG, "pages.json"), encoding="utf-8"))
fills = json.load(open(os.path.join(FIG, "fills.json"), encoding="utf-8"))["meta"]["images"]
os.makedirs(os.path.join(FIG, "originals"), exist_ok=True)
Image.MAX_IMAGE_PIXELS = None


def find(node, node_id):
    if node.get("id") == node_id:
        return node
    for child in node.get("children", []):
        hit = find(child, node_id)
        if hit:
            return hit
    return None


def node_by_id(node_id):
    sources = [pages]
    sources += [json.load(open(p, encoding="utf-8")) for p in sorted(glob.glob(os.path.join(FIG, "n*.json")))]
    for src in sources:
        for entry in src["nodes"].values():
            hit = find(entry["document"], node_id)
            if hit:
                return hit
    raise KeyError(node_id)


def original(ref):
    path = os.path.join(FIG, "originals", ref + ".img")
    if not os.path.exists(path):
        urllib.request.urlretrieve(fills[ref], path)
    return Image.open(path).convert("RGB")


# The page draws these nodes' gradients as a CSS layer over the photo, under the copy, so the file stays clean
CSS_SHADE = {"1619:7155", "1805:6373"}  # the faith banner's shade and the report banner's white wash


def render_fill(node_id, scale=2.0, clip=None, pick=0):
    """clip = (x, y, w, h) in node px: the part of the node that is visible in its frame.
    pick indexes the visible image paints; -1 is the topmost, which wins where two photos are stacked."""
    node = node_by_id(node_id)
    visible = [p for p in node["fills"] if p.get("visible", True)]
    paint = [p for p in visible if p["type"] == "IMAGE"][pick]
    over = [] if node_id in CSS_SHADE else [p for p in visible[visible.index(paint) + 1:] if p["type"] == "GRADIENT_LINEAR"]
    img = original(paint["imageRef"])
    iw, ih = img.size
    box = node["absoluteBoundingBox"]
    w, h = box["width"], box["height"]
    cx, cy, cw, ch = clip or (0, 0, w, h)
    out_w, out_h = round(cw * scale), round(ch * scale)

    if paint.get("scaleMode") == "FILL" or "imageTransform" not in paint:
        ratio = max(w / iw, h / ih)
        sw, sh = w / ratio, h / ratio
        left, top = (iw - sw) / 2 + cx / ratio, (ih - sh) / 2 + cy / ratio
        flat = img.transform((out_w, out_h), Image.AFFINE, (1 / ratio / scale, 0, left, 0, 1 / ratio / scale, top), Image.BICUBIC)
        return overlay(flat, over, cy / h, ch / h, cx / w, cw / w)

    (a, b, tx), (c, d, ty) = paint["imageTransform"]
    # Figma reports these fills as rotation = pi, but they are horizontal mirrors (scaleY -1 + rotate 180).
    mirrored = abs(abs(node.get("rotation", 0)) - math.pi) < 0.01
    # output px (X, Y) -> node unit (u, v) -> image px
    if mirrored:
        u0, ux = 1 - cx / w, -1 / (w * scale)
    else:
        u0, ux = cx / w, 1 / (w * scale)
    v0, vy = cy / h, 1 / (h * scale)
    coeffs = [
        iw * a * ux, iw * b * vy, iw * (a * u0 + b * v0 + tx),
        ih * c * ux, ih * d * vy, ih * (c * u0 + d * v0 + ty),
    ]
    # Some fills are placed so the photo ends above the node's bottom. Figma clips that away, but our
    # hero keeps the spare strip as parallax travel, so replicate the edge instead of leaving it blank.
    img, coeffs = extend_to_cover(img, coeffs, out_w, out_h)
    return overlay(img.transform((out_w, out_h), Image.AFFINE, tuple(coeffs), Image.BICUBIC), over, cy / h, ch / h, cx / w, cw / w)


def overlay(base, paints, v0, vh, u0=0.0, uw=1.0):
    """Composite the node's own gradient paints, whose handles are normalised to the whole node box."""
    import numpy as np
    for paint in paints:
        p0, p1, p2 = paint["gradientHandlePositions"][:3]
        stops, alpha = paint["gradientStops"], paint.get("opacity", 1.0)
        W, H = base.size
        u = u0 + uw * (np.arange(W) + 0.5) / W
        v = v0 + vh * (np.arange(H) + 0.5) / H
        U, V = np.meshgrid(u, v)
        # Solve P = p0 + t (p1 - p0) + s (p2 - p0) for t: the gradient runs p0 -> p1, constant along p0 -> p2
        ax, ay = p1["x"] - p0["x"], p1["y"] - p0["y"]
        bx, by = p2["x"] - p0["x"], p2["y"] - p0["y"]
        det = ax * by - ay * bx
        t = np.clip(((U - p0["x"]) * by - (V - p0["y"]) * bx) / det, 0.0, 1.0)
        pos = [s["position"] for s in stops]
        rgba = np.stack([np.interp(t, pos, [s["color"][c] for s in stops]) for c in "rgba"], axis=-1)
        rgba[..., 3] *= alpha
        layer = Image.fromarray((rgba * 255).round().astype("uint8"), "RGBA")
        base = Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")
    return base


def extend_to_cover(img, coeffs, out_w, out_h):
    iw, ih = img.size
    xs, ys = [], []
    for X, Y in ((0, 0), (out_w, 0), (0, out_h), (out_w, out_h)):
        xs.append(coeffs[0] * X + coeffs[1] * Y + coeffs[2])
        ys.append(coeffs[3] * X + coeffs[4] * Y + coeffs[5])
    left, right = max(0, math.ceil(-min(xs))), max(0, math.ceil(max(xs) - iw))
    top, bottom = max(0, math.ceil(-min(ys))), max(0, math.ceil(max(ys) - ih))
    if not (left or right or top or bottom):
        return img, coeffs
    out = Image.new("RGB", (iw + left + right, ih + top + bottom))
    out.paste(img, (left, top))
    if left:
        out.paste(img.crop((0, 0, 1, ih)).resize((left, ih)), (0, top))
    if right:
        out.paste(img.crop((iw - 1, 0, iw, ih)).resize((right, ih)), (iw + left, top))
    if top:
        out.paste(out.crop((0, top, out.width, top + 1)).resize((out.width, top)), (0, 0))
    if bottom:
        out.paste(out.crop((0, ih + top - 1, out.width, ih + top)).resize((out.width, bottom)), (0, ih + top))
    coeffs[2] += left
    coeffs[5] += top
    return out, coeffs


def save(im, name, size=None, quality=80):
    if size:
        im = im.resize(size, Image.LANCZOS)
    path = os.path.join(IMG, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, "WEBP", quality=quality, method=6)
    print(f"{name:40} {im.size} {os.path.getsize(path) // 1024} KB")


HEROES = [
    # Per-page hero photos live on the "03- Design 2" canvas; Design Round 3 reuses one photo on every inner page.
    ("welcome/hero.webp", "1732:11764", 0),
    ("preparatory-program/hero.webp", "2399:6983", 0),
    ("k-6-primary/hero.webp", "1687:8212", 0),
    ("extra-curricular/hero.webp", "1734:13055", 0),
    ("enrolment/hero.webp", "1801:5303", 0),
    ("news/hero.webp", "1805:7271", 0),
    ("policies/hero.webp", "1805:6220", -1),
    ("contact/hero.webp", "1804:5739", -1),
]

HEROES_M = [
    # The 375 square each inner page's phone frame shows (the photo slot of its "Mobile header", 2087:12629); the topmost paint wins.
    # A fill with Figma's exposure / contrast adjustments (its "filters") cannot be rebuilt from the original, so those two
    # are cut from a true render: (file in renders/, box).
    ("welcome/hero-m.webp", ("2087-12629.png", (0, 0, 750, 750))),
    ("preparatory-program/hero-m.webp", ("2125-14514-photo.png", (0, 0, 750, 750))),
    ("k-6-primary/hero-m.webp", "I2571:14026;2087:11954"),
    ("extra-curricular/hero-m.webp", "I2149:6280;2087:11954"),
    ("enrolment/hero-m.webp", "I2149:6940;2087:11954"),
    ("news/hero-m.webp", "I2149:8395;2087:11954"),
    ("policies/hero-m.webp", "I2149:8792;2087:11954"),
    ("contact/hero-m.webp", "I2149:8800;2087:11954"),
]

BANNERS_M = [
    # Inner-page banners whose 375 frame gives the block a photo of its own: the square the frame draws, from that photo
    ("policies/banner-m.webp", "2573:15106", (750, 750)),
    ("preparatory-program/banner-2-m.webp", "2125:14702", (750, 750)),
    ("enrolment/banner-m.webp", "2149:6965", (750, 750)),  # enrolment M 2149:6938: the desktop banner's photo in the frame's own square  # Preparatory M 2125:14512: its own square  # policies M 2149:8690: 20260831_Claremont_1-339, not the desktop's 2-706
]

MOBILE = [
    # Mobile home reuses the desktop photos but crops them to its own frames (canvas 1619:1791).
    ("home/hero-m.webp", "2081:9516", (750, 1028)),  # superseded by HOME_HERO; kept to rebuild the old photo
    # the approach photo is cut by the "approach" set as approach-teaching-m.webp
    ("home/testimonial-1-m.webp", "2081:10676", (750, 824)),  # the first card's own phone framing (2081:10673)
]

EDUCATORS = [
    # The eight educator portraits of the "03- Design 2" strip 2410:7936, in row order; the topmost photo wins where two are stacked.
    "2410:7941", "2410:7944", "2410:7947", "2410:7953", "2410:7959", "2410:7950", "2410:7956", "2410:7962",
]

TESTIMONIALS = [
    # The seven home testimonial portraits of the "03- Design 2" hover preview 2470:7150, in row order; the topmost photo wins where two are stacked.
    "2470:7152", "2470:7151", "2470:7153", "2470:7155", "2470:7154", "2470:7156", "2470:7157",
]

BANNER = (0, 6, 1640, 614)
SQUARE = (513, 6, 614, 614)


def overhang(clip, travel=0.1):
    # The photo layer overhangs its frame by travel above and below for parallax, so export that strip too
    x, y, w, h = clip
    return (x, y - h * travel, w, h + h * travel * 2)


def spare(node_id, clip, travel=0.3):
    # Like overhang, but stops where the photo runs out: the layer's cover crop fills the rest by zooming slightly
    node = node_by_id(node_id)
    h = node["absoluteBoundingBox"]["height"]
    (_, _, _), (_, d, ty) = [p for p in node["fills"] if p.get("visible", True) and p["type"] == "IMAGE"][-1]["imageTransform"]
    x, y, w, ch = clip
    above = min(ch * travel, y + ty / d * h)
    below = min(ch * travel, h + (1 - ty - d) / d * h - y - ch)
    return (x, y - above, w, ch + above + below)


def tall(clip, width):
    return (width, round(width * clip[3] / clip[2]))


TALL = (1840, 827)
DESIGN2 = [
    # Round 3 fills these slots with one placeholder photo; "03- Design 2" gives each its own (topmost paint).
    ("home/faith.webp", "1619:7155", spare("1619:7155", (0, 0, 1640, 614)), 2205),
    ("home/faith-m.webp", "2081:10705", None, (750, 750)),  # the 375 frame's own square (2081:9479); no spare: phones do not travel
    ("preparatory-program/banner-2.webp", "1680:6032", spare("1680:6032", BANNER), 1840),
    ("enrolment/banner.webp", "1801:5328", spare("1801:5328", (0, 0, 1640, 614)), 1840),
    ("k-6-primary/team.webp", "2410:8268", (0, 6, 410, 560), (820, 1120)),
    ("k-6-primary/banner-sport.webp", "1734:13208", spare("1734:13208", BANNER), 1840),
    ("k-6-primary/banner-sport-m.webp", "2571:14053", None, (750, 750)),  # the 375 frame's own square (2571:14024)
    ("k-6-primary/banner-music.webp", "1709:10089", spare("1709:10089", BANNER), 1840),
    ("k-6-primary/banner-music-m.webp", "2571:14077", None, (750, 750)),  # the 375 frame's own square
    ("k-6-primary/mosaic-1.webp", "1709:10064", None, (612, 612)),
    ("k-6-primary/mosaic-2.webp", "2410:8774", None, (612, 612)),
    ("k-6-primary/mosaic-3.webp", "1709:10065", None, (610, 608)),
    ("k-6-primary/mosaic-4.webp", "1709:10067", None, (1234, 612)),
    ("k-6-primary/mosaic-5.webp", "2410:8776", None, (612, 612)),
]

APPROACH = [
    # The home approach tabs: "03- Design 2" gives each tab its own photo (state frames 1636:2282, 1638:2555, 1638:2627, 1638:4413);
    # the phone frame crops the first tab's photo to its own 375 x 276 slot
    ("home/approach-teaching.webp", "1636:2289", (1840, 768)),
    ("home/approach-future.webp", "1638:2562", (1840, 768)),
    ("home/approach-wellbeing.webp", "1638:2634", (1840, 768)),
    ("home/approach-community.webp", "1638:4420", (1840, 768)),
    ("home/approach-teaching-m.webp", "2081:9535", (750, 552)),
]

REVIEW = [
    # Oct 2026 review: the report banner takes "03- Design 2"'s photo (Round 3 pasted its one photo there), and the
    # Extra-curricular music block becomes the K-6 photo band, its phone crop from the 375 frame's own photo (2149:6321)
    ("policies/banner.webp", "1805:6373", spare("1805:6373", BANNER), 1840),
    ("extra-curricular/banner-music.webp", "2410:7621", spare("2410:7621", BANNER), 1840),
    ("extra-curricular/banner-music-m.webp", "2149:6321", None, (750, 750)),
    # the stacked banners' phone squares, exact: the phone layer no longer travels (2026-10-16)
    ("home/faith-m.webp", "2081:10705", None, (750, 750)),
    ("k-6-primary/banner-sport-m.webp", "2571:14053", None, (750, 750)),  # the 375 frame's own square (2571:14024)
    ("k-6-primary/banner-music-m.webp", "2571:14077", None, (750, 750)),  # the 375 frame's own square
]
LIBRARY = [
    # Slots the client asked to change: a photo from the canvas library, centre-cropped to the slot.
    ("policies/banner.webp", "b20c13e6c263cd9ef44fccc26d12bd9331b86434", (1840, 1102)),  # 20260910_Claremont_2-706
]

HOME_HERO = [
    # The client's replacement home photo (2399:6393): the 1182 frame plus the 80 of real photo below it,
    # which is all the parallax travel it has; the phone crop is centred on the two children (no 375 frame yet).
    ("home/hero.webp", "2399:6393", (0, 0, 1640, 1262), (1842, 1417)),
    ("home/hero-m.webp", "2399:6393", (700, 0, 862, 1182), (750, 1028)),
]

CAROUSEL = [
    # K-6 carousel between academic excellence and the dispositions (2410:8619 on the Design 2 K-6 page): the band photo
    # and the three slides the client linked, each a 1640 x 614 frame; phones take the square from its centre
    ("k-6-primary/carousel-1.webp", "2410:8620", (0, 0, 1640, 614), (1840, 689)),
    ("k-6-primary/carousel-2.webp", "2410:8873", (0, 0, 1640, 614), (1840, 689)),
    ("k-6-primary/carousel-3.webp", "2410:8945", (0, 0, 1640, 614), (1840, 689)),
    ("k-6-primary/carousel-4.webp", "2429:11177", (0, 0, 1640, 614), (1840, 689)),
    ("k-6-primary/carousel-1-m.webp", "2571:14042", None, (750, 750)),
    ("k-6-primary/carousel-2-m.webp", "2410:8873", (513, 0, 614, 614), (750, 750)),
    ("k-6-primary/carousel-3-m.webp", "2410:8945", (513, 0, 614, 614), (750, 750)),
    ("k-6-primary/carousel-4-m.webp", "2429:11177", (513, 0, 614, 614), (750, 750)),
]

PREP_CAROUSEL = [
    # Preparatory carousel under the teaching approach (2400:7239 on the Design 2 Preparatory page): the band photo, then the
    # seven 1640 x 614 "Carousel" frames beside the page in reading order; the rects sit 6 above their frames
    ("preparatory-program/carousel-1.webp", "2400:7240", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-2.webp", "2400:7204", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-3.webp", "2399:7126", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-4.webp", "2399:7091", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-5.webp", "2400:7282", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-6.webp", "2400:7263", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-7.webp", "2399:7191", (0, 6, 1640, 614), (1840, 689)),
    ("preparatory-program/carousel-8.webp", "2410:8236", (0, 6, 1640, 614), (1840, 689)),
    # phones: the first slide is the phone frame's own square (2125:14700); the rest have none, so each square keeps its children
    ("preparatory-program/carousel-1-m.webp", "2125:14700", None, (750, 750)),
    ("preparatory-program/carousel-2-m.webp", "2400:7204", (680, 6, 614, 614), (750, 750)),
    ("preparatory-program/carousel-3-m.webp", "2399:7126", (600, 6, 614, 614), (750, 750)),
    ("preparatory-program/carousel-4-m.webp", "2399:7091", (513, 6, 614, 614), (750, 750)),
    ("preparatory-program/carousel-5-m.webp", "2400:7282", (400, 6, 614, 614), (750, 750)),
    ("preparatory-program/carousel-6-m.webp", "2400:7263", (513, 6, 614, 614), (750, 750)),
    ("preparatory-program/carousel-7-m.webp", "2399:7191", (420, 6, 614, 614), (750, 750)),
    ("preparatory-program/carousel-8-m.webp", "2410:8236", (560, 6, 614, 614), (750, 750)),
]

MOSAIC_M = [
    # the K-6 art of teaching on phones: each card's own 375 x 300 photo (2571:14064 in the K-6 375 frame, the rest beside it)
    ("k-6-primary/mosaic-1-m.webp", "2571:14065"),
    ("k-6-primary/mosaic-2-m.webp", "2571:14083"),
    ("k-6-primary/mosaic-3-m.webp", "2571:14095"),
    ("k-6-primary/mosaic-4-m.webp", "2571:14119"),
    ("k-6-primary/mosaic-5-m.webp", "2571:14107"),
]

if sys.argv[1] == "carousel":
    for name, node, clip, size in CAROUSEL:
        save(render_fill(node, 2.0, clip=clip, pick=-1), name, size)
elif sys.argv[1] == "mosaic-m":
    for name, node in MOSAIC_M:
        save(render_fill(node, 2.0, pick=-1), name, (750, 600))
elif sys.argv[1] == "prep-carousel":
    for name, node, clip, size in PREP_CAROUSEL:
        save(render_fill(node, 2.0, clip=clip, pick=-1), name, size)
elif sys.argv[1] == "home-hero":
    for name, node, clip, size in HOME_HERO:
        save(render_fill(node, 2.0, clip=clip), name, size)
elif sys.argv[1] == "library":
    for name, ref, (w, h) in LIBRARY:
        img = original(ref)
        ch = img.width * h / w
        top = (img.height - ch) / 2
        save(img.crop((0, round(top), img.width, round(top + ch))), name, (w, h))
elif sys.argv[1] == "banners":
    for name, node, clip, size in DESIGN2:
        if "banner" in name or "faith" in name:
            save(render_fill(node, 2.0, clip=clip, pick=-1), name, tall(clip, size) if isinstance(size, int) else size)
    for name, ref, (w, h) in LIBRARY:
        img = original(ref)
        ch = img.width * h / w
        top = (img.height - ch) / 2
        save(img.crop((0, round(top), img.width, round(top + ch))), name, (w, h))
elif sys.argv[1] == "design2":
    for name, node, clip, size in DESIGN2:
        save(render_fill(node, 2.0, clip=clip, pick=-1), name, tall(clip, size) if isinstance(size, int) else size)
elif sys.argv[1] == "review":
    for name, node, clip, size in REVIEW:
        save(render_fill(node, 2.0, clip=clip, pick=-1), name, tall(clip, size) if isinstance(size, int) else size)
elif sys.argv[1] == "approach":
    for name, node, size in APPROACH:
        save(render_fill(node, 2.0, pick=-1), name, size)
elif sys.argv[1] == "mobile":
    for name, node, size in MOBILE:
        save(render_fill(node, 2.0), name, size)
elif sys.argv[1] == "banners-m":
    for name, node, size in BANNERS_M:
        save(render_fill(node, 2.0, pick=-1), name, size)  # the topmost photo: the enrolment square keeps an old one underneath
elif sys.argv[1] == "testimonials":
    for i, node in enumerate(TESTIMONIALS, 1):
        save(render_fill(node, 2.0, pick=-1), f"home/testimonial-{i}.webp", (740, 740))
elif sys.argv[1] == "educators":
    for i, node in enumerate(EDUCATORS, 1):
        save(render_fill(node, 2.0, pick=-1), f"welcome/educator-{i}.webp", (714, 712))
elif sys.argv[1] == "heroes-m":
    for name, node in HEROES_M:
        if isinstance(node, tuple):
            save(Image.open(os.path.join(FIG, "renders", node[0])).convert("RGB").crop(node[1]), name, (750, 750))
        else:
            save(render_fill(node, 2.0, pick=-1), name, (750, 750))
elif sys.argv[1] == "heroes":
    for name, node, pick in HEROES:
        save(render_fill(node, 2.0, pick=pick), name, (1840, 1090))
elif sys.argv[1] == "check":
    mine = render_fill("2238:5120", 2.0)
    ref = Image.open(os.path.join(FIG, "img", "2238-5120.png")).convert("RGB")
    print("mine", mine.size, "figma", ref.size)
    a, b = mine.resize((540, 155)), ref.resize((540, 155))
    diff = ImageStat.Stat(ImageChops.difference(a, b)).mean
    print("mean abs diff per channel:", [round(x, 2) for x in diff])
    sheet = Image.new("RGB", (540, 320), (30, 30, 30))
    sheet.paste(a, (0, 0))
    sheet.paste(b, (0, 165))
    sheet.save(os.path.join(FIG, "fill-check.jpg"), quality=85)
elif sys.argv[1] == "news-m":
    # the phone listing's landscape card (news M 2149:8421, its photo frame 2149:8418: 375 x 216, the fill mirrored)
    save(render_fill("2149:8418", 2.0), "news/card-m.webp", (750, 432))
else:
    # Banners: the rect is 2159 x 620 placed 6 above a 1640 x 614 frame
    save(render_fill("2238:5199", 2.0, clip=(0, 6, 1640, 614)), "policies/banner.webp", (1840, 689))
    save(render_fill("2238:6228", 2.0), "enrolment/banner.webp", (1840, 689))
    save(render_fill("2238:5449", 2.0), "news/article.webp")
    save(render_fill("2238:5391", 2.0), "news/card.webp")
    save(render_fill("I2238:5331;1734:12728", 2.0), "welcome/staff.webp")
    save(render_fill("2238:5341", 2.0), "welcome/educator.webp")
