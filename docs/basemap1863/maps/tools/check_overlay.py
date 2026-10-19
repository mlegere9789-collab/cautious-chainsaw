"""python check_overlay.py <map_id> E N half out.png : [georef map | NAIP | blend] at 1 px = 1 m (scaled)."""
import sys, os, numpy as np, rasterio
from rasterio.windows import Window
from PIL import Image
from common import *
mid, E, N, half, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
def rd(p, bands):
    with rasterio.open(p) as ds:
        T = ds.transform; return ds.read(bands, window=Window(int(E - half - T.c), int(T.f - N - half), 2 * half, 2 * half), boundless=True, fill_value=0).transpose(1, 2, 0)
m = rd(os.path.join(TMP, 'georef', mid + '.tif'), [1, 2, 3]); n = rd(os.path.join(TMP, 'ref', 'naip_1m.tif'), [1, 2, 3]); c = rd(os.path.join(TMP, 'ref', 'ct_1m.tif'), [1, 2, 3])
# blend: DEM contours (black) over map
bl = m.copy(); bl[c[:, :, 0] < 120] = (255, 0, 0)
k = 1000 // (2 * half) if half < 500 else 1
S = lambda a: Image.fromarray(a).resize((a.shape[1] * max(k, 1), a.shape[0] * max(k, 1)), Image.LANCZOS)
M = Image.new('RGB', (S(m).size[0] * 3 + 8, S(m).size[1])); M.paste(S(m), (0, 0)); M.paste(S(n), (S(m).size[0] + 4, 0)); M.paste(S(bl), (2 * S(m).size[0] + 8, 0)); M.save(out)
