"""Experiment: bytes per 512x512 tile for WebP / AVIF / JPEG at several qualities, on real NAIP tiles at z16 / z15 / z14."""
import io, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from terrain import box_down
import numpy as np
from PIL import Image
blk = np.asarray(Image.open(os.path.join(CACHE, 'naip', 'z16', 'b14_4676_6213.jpg')).convert('RGB'), dtype=np.float32)   # 2048^2 = z14 tile at z16 grid
def lev(k): return box_down(blk, k)           # k=1 -> z16 grid, 2 -> z15, 4 -> z14
def enc(img, fmt, q):
    b = io.BytesIO(); t0 = time.time()
    if fmt == 'webp': img.save(b, 'WEBP', quality=q, method=6)
    elif fmt == 'avif': img.save(b, 'AVIF', quality=q, speed=6)
    elif fmt == 'jpeg': img.save(b, 'JPEG', quality=q, optimize=True, progressive=True, subsampling=2)
    return b.tell(), time.time() - t0
for name, k in (('z16 (0.92 m/px)', 1), ('z15 (1.83 m/px)', 2), ('z14 (3.67 m/px)', 4)):
    a = lev(k); tile = Image.fromarray(np.clip(a[: 512, 512: 1024] if k == 1 else a[:512, :512], 0, 255).astype(np.uint8))
    print(name)
    for fmt, qs in (('webp', (40, 50, 60, 70)), ('avif', (30, 40, 50, 60)), ('jpeg', (50, 60, 70))):
        print('  ', fmt, ' '.join(f'q{q}:{enc(tile, fmt, q)[0] / 1024:.1f}KB' for q in qs), '| enc time at last q %.2fs' % enc(tile, fmt, qs[-1])[1])
