"""Experiment: does a service-side 3x decimation (z15 grid) match a local area-average of a native-ish grid (z17)?  Decides the download plan."""
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from common import *
NAIP = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage'
lng, lat = -77.2364, 39.81343
tx, ty = lnglat_to_tile(lng, lat, 15)
tx, ty = int(tx), int(ty)                                    # one z15 tile (512 px at 1.83 m = 940 m): too big; use a quarter: 256x256 at z15 grid
def grab(z, size, bounds, tag):
    p = polite_get(NAIP, dict(bbox='%.4f,%.4f,%.4f,%.4f' % bounds, bboxSR=3857, imageSR=3857, size=f'{size},{size}', format='png', pixelType='U8',
                              interpolation='RSP_BilinearInterpolation', renderingRule='{"rasterFunction":"None"}', f='image'), cache_key=f'exp/{tag}.png', min_interval=0.5)
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.float64)
b = tile_bounds_merc(15, tx, ty)
q = (b[2] - b[0]) / 2                                        # a quarter tile window, 470 m
bw = (b[0], b[3] - q, b[0] + q, b[3])
a17 = grab(17, 1024, bw, 'z17_1024')                         # 0.459 m/px
a16 = grab(16, 512, bw, 'z16_512')                           # 0.917 m/px
a15 = grab(15, 256, bw, 'z15_256')                           # 1.834 m/px
def box(a, k): h, w, c = a.shape; return a.reshape(h // k, k, w // k, k, c).mean(axis=(1, 3))
def rmse(x, y): return float(np.sqrt(((x - y) ** 2).mean()))
for name, srv, ref in (('z16 server vs z17 box2', a16, box(a17, 2)), ('z15 server vs z17 box4', a15, box(a17, 4)), ('z15 server vs z16 box2', a15, box(a16, 2))):
    print(f'{name}: RMSE {rmse(srv, ref):.2f} (0-255 scale); std of the image {srv.std():.1f}')
# gradient energy (sharpness) of the server's decimation vs the local box average
def sharp(a): g = a.mean(axis=2); return float(np.abs(np.diff(g, axis=1)).mean() + np.abs(np.diff(g, axis=0)).mean())
print('mean abs gradient: z15 server', round(sharp(a15), 2), '| z15 from z17 box4', round(sharp(box(a17, 4)), 2), '| z16 server', round(sharp(a16), 2), '| z16 from z17 box2', round(sharp(box(a17, 2)), 2))
