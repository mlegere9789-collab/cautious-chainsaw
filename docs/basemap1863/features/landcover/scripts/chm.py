import numpy as np, glob, os, sys, time
from pyproj import Transformer
from scipy import ndimage as ndi
T = Transformer.from_crs(3857, 32618, always_xy=True)
bx0, by0 = -8605520.4079217, 4831711.199452233
X0, Y1 = 303000.0, 4416200.0; W, H = 11500, 12000; R = 2.0
nx, ny = int(W / R), int(H / R)
top = np.full((ny, nx), -9999, np.float32); gnd = np.full((ny, nx), 9999, np.float32)
cnt = np.zeros((ny, nx), np.int32); multi = np.zeros((ny, nx), np.int32); vcnt = np.zeros((ny, nx), np.int32)
MAXD = int(sys.argv[1]) if len(sys.argv) > 1 else 99
OUTN = sys.argv[2] if len(sys.argv) > 2 else 'chm_raw.npz'
files = sorted(glob.glob('lidar/*.npz')); files = [f for f in files if not f.endswith('.tmp.npz') and int(os.path.basename(f).split('-')[0]) <= MAXD]
t0 = time.time()
for i, f in enumerate(files):
    d = np.load(f)
    x = d['xo'].astype(np.float64) + bx0; y = d['yo'].astype(np.float64) + by0
    E, N = T.transform(x, y); z = d['z']; c = d['c']; r = d['r']; n = d['n']
    ix = ((E - X0) / R).astype(np.int32); iy = ((Y1 - N) / R).astype(np.int32)
    ok = (ix >= 0) & (ix < nx) & (iy >= 0) & (iy < ny) & (c != 7) & (c != 18) & (c != 9)
    ix, iy, z, c, r, n = ix[ok], iy[ok], z[ok], c[ok], r[ok], n[ok]
    lin = iy * nx + ix
    g = (c == 2) | (c == 20)
    np.minimum.at(gnd.ravel(), lin[g], z[g])
    nonG = ~g
    np.maximum.at(top.ravel(), lin[nonG], z[nonG])
    np.add.at(cnt.ravel(), lin[nonG], 1)
    mm = nonG & (n > 1)
    np.add.at(multi.ravel(), lin[mm], 1)
    if i % 200 == 0: print(i, len(files), round(time.time() - t0), flush=True)
np.savez_compressed(OUTN, top=top, gnd=gnd, cnt=cnt, multi=multi)
print('saved')
