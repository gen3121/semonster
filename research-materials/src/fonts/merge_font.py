"""Merge Fontsource unicode-range slices (woff2) into one TTF per weight."""
import sys, glob, os, re
from fontTools.ttLib import TTFont
from fontTools.merge import Merger

src, weight, out = sys.argv[1], sys.argv[2], sys.argv[3]
files = sorted(glob.glob(os.path.join(src, f"biz-udpgothic-*-{weight}-normal.woff2")),
               key=lambda p: int(re.search(r"biz-udpgothic-(\d+)-", p).group(1)) if re.search(r"biz-udpgothic-(\d+)-", p) else 10**6)
# keep numbered slices first, then named (latin etc.)
print(len(files), "slices", flush=True)
tmp = out + ".slices"
os.makedirs(tmp, exist_ok=True)
paths = []
for i, f in enumerate(files):
    t = TTFont(f)
    t.flavor = None
    p = os.path.join(tmp, f"s{i:03d}.ttf")
    t.save(p)
    paths.append(p)
m = Merger()
font = m.merge(paths)
font.save(out)
print("saved", out, os.path.getsize(out))
