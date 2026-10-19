"""Builds the prototype's terrain from the cached USGS 3DEP bare-earth DEM (float32 blocks, z15 grid) and the NAIP aerial tiles of docs/pitch/anim2/basemap.
Outputs (next to this script's ../data): height.bin (uint16 LE, N*N, row 0 = north, value = (h - hmin) / (hmax - hmin) * 65535), aerial.jpg, terrain.json.
Run: python -I build-terrain.py   (python 3.11, numpy, Pillow with AVIF). Public-domain sources only (USGS 3DEP, USDA NAIP via USGS)."""
import json, math, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'docs', 'pitch', 'anim2', 'basemap', 'tools'))
from common import world_px, merc_to_lnglat, TILE   # noqa
from dem import DemMosaic                              # noqa
OUT = os.path.join(HERE, '..', 'data'); os.makedirs(OUT, exist_ok=True)
LNG0, LNG1, LAT0, LAT1 = -77.2720, -77.2000, 39.7830, 39.8380      # west, east, south, north
Z = 15
x0, y1 = world_px(LNG0, LAT0, Z); x1, y0 = world_px(LNG1, LAT1, Z)   # pixel box, y down
X0, Y0, X1, Y1 = int(math.floor(x0)), int(math.floor(y0)), int(math.ceil(x1)), int(math.ceil(y1))
W, H = X1 - X0, Y1 - Y0
lat_c = 0.5 * (LAT0 + LAT1)
mpp_ground = 40075016.686 / (TILE * 2 ** Z) * math.cos(math.radians(lat_c))     # ground metres per z15 pixel
print('px box', X0, Y0, W, H, 'ground m/px', round(mpp_ground, 4), 'extent m', round(W * mpp_ground), round(H * mpp_ground))
dem = DemMosaic(Z, 14).window(X0, Y0, W, H)
print('dem', dem.shape, float(dem.min()), float(dem.max()), 'nan', int(np.isnan(dem).sum()))
# heightfield N x N over the square of side S metres (use the larger side) -> resample by bilinear
N = 1536
ys = np.linspace(0, H - 1, N); xs = np.linspace(0, W - 1, N)
gx, gy = np.meshgrid(xs, ys)
def bil(a, gx, gy):
    x0_ = np.clip(np.floor(gx).astype(int), 0, a.shape[1] - 2); y0_ = np.clip(np.floor(gy).astype(int), 0, a.shape[0] - 2)
    fx = gx - x0_; fy = gy - y0_
    return (a[y0_, x0_] * (1 - fx) * (1 - fy) + a[y0_, x0_ + 1] * fx * (1 - fy) + a[y0_ + 1, x0_] * (1 - fx) * fy + a[y0_ + 1, x0_ + 1] * fx * fy)
# box-average first (anti-alias) by 2x2 when downsampling about 2x
hs = bil(dem, gx, gy)
hmin, hmax = float(np.floor(hs.min())), float(np.ceil(hs.max()))
u16 = np.round((hs - hmin) / (hmax - hmin) * 65535).astype('<u2')
u16.tofile(os.path.join(OUT, 'height.bin'))
# aerial: stitch z15 tiles 520px with 4 px gutter
man = json.load(open(os.path.join(ROOT, 'docs', 'pitch', 'anim2', 'basemap', 'assets', 'manifest.json')))
lv = man['layers']['aerial']['levels']['15']
mos = Image.new('RGB', (W, H))
tx0, tx1, ty0, ty1 = X0 // 512, (X1 - 1) // 512, Y0 // 512, (Y1 - 1) // 512
miss = 0
for ty in range(ty0, ty1 + 1):
    for tx in range(tx0, tx1 + 1):
        p = os.path.join(ROOT, 'docs', 'pitch', 'anim2', 'basemap', 'assets', 'aerial', '15', f'{tx}_{ty}.avif')
        if not os.path.exists(p): miss += 1; continue
        im = Image.open(p).convert('RGB').crop((4, 4, 516, 516))
        mos.paste(im, (tx * 512 - X0, ty * 512 - Y0))
print('aerial tiles missing', miss)
aer = mos.resize((2048, 2048), Image.LANCZOS)
aer.save(os.path.join(OUT, 'aerial.jpg'), quality=82, optimize=True)
# metres per heightfield sample
meta = dict(N=N, hmin=hmin, hmax=hmax, widthM=W * mpp_ground, heightM=H * mpp_ground, lng0=LNG0, lng1=LNG1, lat0=LAT0, lat1=LAT1, z15box=[X0, Y0, W, H],
            groundMPerZ15Px=mpp_ground, sampleM=[W * mpp_ground / (N - 1), H * mpp_ground / (N - 1)],
            sources='USGS 3DEP bare-earth DEM (public domain), USDA NAIP aerial 2022 via USGS (public domain): modern ground, not the 1863 landscape')
json.dump(meta, open(os.path.join(OUT, 'terrain.json'), 'w'), indent=1)
print(meta)
