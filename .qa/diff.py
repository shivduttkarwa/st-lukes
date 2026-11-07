# Compare two walk.mjs runs slice by slice; reports slices where over 0.05% of pixels differ. Usage: python .qa/diff.py <beforeDir> <afterDir>
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
for tag in sorted(os.listdir(os.path.join(a, "slices"))):
    da, db = os.path.join(a, "slices", tag), os.path.join(b, "slices", tag)
    if not os.path.isdir(db): print(tag, "missing in after"); continue
    fa, fb = sorted(os.listdir(da)), sorted(os.listdir(db))
    if len(fa) != len(fb): print(f"{tag}: slice count {len(fa)} -> {len(fb)}")
    worst = []
    for f in fa:
        if f not in fb: continue
        ia, ib = Image.open(os.path.join(da, f)).convert("RGB"), Image.open(os.path.join(db, f)).convert("RGB")
        if ia.size != ib.size: worst.append((f, "size")); continue
        d = ImageChops.difference(ia, ib).convert("L").point(lambda v: 255 if v > 24 else 0)
        n = sum(1 for v in d.get_flattened_data() if v)
        pct = 100 * n / (d.size[0] * d.size[1])
        if pct > 0.05: worst.append((f, f"{pct:.2f}%"))
    print(f"{tag}: {len(fa)} slices, differing: {worst if worst else 'none'}")
