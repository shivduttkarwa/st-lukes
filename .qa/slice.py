# Trim the empty tail of a tall screenshot and cut it into N strips: python .qa/slice.py <in.png> <prefix> <n>
import sys
from PIL import Image, ImageStat

path, prefix, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(path).convert("RGB")
grey = im.convert("L")
w, h = im.size
bottom = h
for y in range(h - 1, 0, -8):
    if ImageStat.Stat(grey.crop((0, y, w, y + 1))).stddev[0] > 1:
        bottom = min(h, y + 16)
        break
im = im.crop((0, 0, w, bottom))
step = (bottom + n - 1) // n
for i in range(n):
    im.crop((0, i * step, w, min(bottom, (i + 1) * step))).save(f"{prefix}-{i + 1}.png")
print(prefix, "page height", bottom, "strips", n)
