import sys, os, time, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C, synth as S, quilt as Q
import rasterio
from rasterio.windows import Window
from PIL import Image
C.lowprio()
where, size, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
if where in C.HOTSPOTS:
    x, y = C.ll2utm(*C.HOTSPOTS[where]); cx, cy = C.utm2px(x, y)
else:
    cx, cy = map(float, where.split(','))
c0 = min(max(int(cx - size // 2), 0), C.W - size); r0 = min(max(int(cy - size // 2), 0), C.H - size)
mm = np.memmap(os.path.join(C.BUILD, 'stage20.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
img = np.array(mm[r0:r0 + size, c0:c0 + size])
def rd(n):
    with rasterio.open(os.path.join(C.BUILD, n + '.tif')) as d:
        return d.read(1, window=Window(c0, r0, size, size))
tg, lc, rem, add, surv = rd('target'), rd('lc1863'), rd('chg_remove'), rd('chg_add'), rd('survivors')
can = np.load(os.path.join(C.BUILD, 'canopy1m.npy'), mmap_mode='r')[r0:r0 + size, c0:c0 + size]
banks = {k: Q.Bank(np.load(os.path.join(C.BUILD, 'bank_%s.npy' % k))) for k in ('field', 'woods')}
t = time.time()
res, cls = S.synthesize(img, tg, lc, rem, add, np.array(can), banks, surv=surv)
print('time', time.time() - t, {int(k): int(v) for k, v in zip(*np.unique(cls, return_counts=True))})
base = np.moveaxis(rasterio.open(C.BASE_TIF).read([1, 2, 3], window=Window(c0, r0, size, size)), 0, -1)
Image.fromarray(np.concatenate([base, res], 1)).save(out)
