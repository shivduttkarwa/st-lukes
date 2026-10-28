# Figma REST helper (token read from .qa/.figma-token, which is git-ignored).
#   python .qa/figma.py nodes  <id,id,...> <out.json>
#   python .qa/figma.py fills  <out.json>                      image-fill ref -> URL map for the whole file
#   python .qa/figma.py render <id,id,...> <png|svg> <scale> <out-dir>
import json
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
KEY = "IOcoW0YV5Habv7cMDDqs9b"
TOKEN = open(os.path.join(HERE, ".figma-token"), encoding="utf-8").read().strip()
API = "https://api.figma.com/v1"


def get(url, raw=False, tries=4):
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={} if raw else {"X-Figma-Token": TOKEN})
        try:
            with urllib.request.urlopen(req, timeout=300) as res:
                return res.read()
        except urllib.error.HTTPError as err:
            if err.code == 429 and attempt < tries - 1:
                wait = int(err.headers.get("Retry-After", "20"))
                print(f"rate limited, waiting {wait}s")
                time.sleep(min(wait, 90))
                continue
            print("HTTP", err.code, err.read()[:300])
            raise
    raise RuntimeError("gave up")


cmd = sys.argv[1]
if cmd == "nodes":
    ids, out = sys.argv[2], sys.argv[3]
    data = get(f"{API}/files/{KEY}/nodes?ids={urllib.parse.quote(ids)}")
    open(out, "wb").write(data)
    print("saved", out, len(data) // 1024, "KB")
elif cmd == "fills":
    out = sys.argv[2]
    data = get(f"{API}/files/{KEY}/images")
    open(out, "wb").write(data)
    print("saved", out, len(json.loads(data)["meta"]["images"]), "image fills")
elif cmd == "render":
    ids, fmt, scale, outdir = sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]
    os.makedirs(outdir, exist_ok=True)
    meta = json.loads(get(f"{API}/images/{KEY}?ids={urllib.parse.quote(ids)}&format={fmt}&scale={scale}"))
    for node, url in meta["images"].items():
        name = node.replace(":", "-") + "." + fmt
        if not url:
            print("no render for", node)
            continue
        open(os.path.join(outdir, name), "wb").write(get(url, raw=True))
        print("saved", name)
