# Stitch walk.mjs slices into contact sheets, <cols> across and two rows each. Usage: python .qa/sheets.py <outDir> <cols>
import sys, os
from PIL import Image
out, cols = sys.argv[1], int(sys.argv[2])
slices_root = os.path.join(out, "slices")
for tag in sorted(os.listdir(slices_root)):
    d = os.path.join(slices_root, tag)
    files = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    if not files: continue
    ims = [Image.open(os.path.join(d, f)) for f in files]
    w, h = ims[0].size
    per = cols * 2  # 2 rows per sheet
    for s in range(0, len(ims), per):
        group = ims[s:s+per]
        rows = (len(group) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * w + (cols - 1) * 8, rows * h + (rows - 1) * 8), (255, 0, 255))
        for i, im in enumerate(group):
            sheet.paste(im, ((i % cols) * (w + 8), (i // cols) * (h + 8)))
        sheet.save(os.path.join(out, f"{tag}-{s // per + 1}.png"))
        print(f"{tag}-{s // per + 1}.png {sheet.size[0]}x{sheet.size[1]} ({len(group)} slices)")
