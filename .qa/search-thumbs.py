# Cut the small photos the menu's search rows show: 192 × 144 WebP, centre-cropped, in src/assets/images/search/.
# The size matters: a hover zoom that takes a photo past half its file's width makes Chrome swap to a sharper copy, and
# 192 keeps that away from the common screen sizes (160 hit 1920 × 1080).
# Rerun after adding a page or story to src/_data/search_index.js:  python .qa/search-thumbs.py
import json
import os
import subprocess

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "assets", "images", "search")
SIZE = (192, 144)
QUALITY = 72

index = subprocess.run(
    ["node", "--input-type=module", "-e", "import f from './src/_data/search_index.js'; console.log(JSON.stringify(f()))"],
    cwd=ROOT, capture_output=True, text=True, encoding="utf-8", check=True,
)
items = json.loads(index.stdout)

os.makedirs(OUT, exist_ok=True)
before = after = 0
for source, thumb in sorted({(item["source"], item["image"]) for item in items}):
    path = os.path.join(ROOT, "src", *source.lstrip("/").split("/"))
    target = os.path.join(ROOT, "src", *thumb.lstrip("/").split("/"))
    photo = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    ImageOps.fit(photo, SIZE, Image.LANCZOS).save(target, "WEBP", quality=QUALITY, method=6)
    before += os.path.getsize(path)
    after += os.path.getsize(target)
    print(f"{os.path.getsize(path) // 1024:>5} KB -> {os.path.getsize(target) / 1024:4.1f} KB  {thumb}")
print(f"total {before // 1024} KB -> {after // 1024} KB")
