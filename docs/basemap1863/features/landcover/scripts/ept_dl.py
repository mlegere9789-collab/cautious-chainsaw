import json, os, sys, time, io, requests, numpy as np
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
from fetch import get
import laspy
base = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/'
UA = 'gettysburg-map-landcover-research/1.0 (polite, rate-limited, cached; historical reconstruction project)'
MAXD = int(sys.argv[1]) if len(sys.argv) > 1 else 10
e = json.loads(get(base + 'ept.json', min_gap=0.25))
B = e['bounds']; xmin, ymin, zmin, xmax, ymax, zmax = B
T = Transformer.from_crs(32618, 3857, always_xy=True)
# bbox in 3857 (a little padded)
cs = [T.transform(x, y) for x, y in [(302900, 4404100), (314600, 4404100), (302900, 4416300), (314600, 4416300)]]
bx0 = min(c[0] for c in cs); bx1 = max(c[0] for c in cs); by0 = min(c[1] for c in cs); by1 = max(c[1] for c in cs)
print('bbox3857', bx0, by0, bx1, by1)
# hierarchy traversal
hier = {}
def load_h(key):
    t = get(base + f'ept-hierarchy/{key}.json', min_gap=0.25); hier.update(json.loads(t))
load_h('0-0-0-0')
need = []
def node_bounds(d, x, y, z):
    s = (xmax - xmin) / (2 ** d)
    return xmin + x * s, ymin + y * s, xmin + (x + 1) * s, ymin + (y + 1) * s
def walk(d, x, y, z):
    if d > MAXD: return
    k = f'{d}-{x}-{y}-{z}'
    nb = node_bounds(d, x, y, z)
    if nb[2] < bx0 or nb[0] > bx1 or nb[3] < by0 or nb[1] > by1: return
    if k not in hier: return
    cnt = hier[k]
    if cnt == -1:
        load_h(k); cnt = hier.get(k, 0)
    if cnt > 0: need.append((k, cnt))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1): walk(d + 1, 2 * x + dx, 2 * y + dy, 2 * z + dz)
sys.setrecursionlimit(10000)
walk(0, 0, 0, 0)
print('nodes', len(need), 'points', sum(c for _, c in need))
OUT = os.path.join(os.path.dirname(__file__), '..', 'lidar'); os.makedirs(OUT, exist_ok=True)
json.dump(need, open(os.path.join(OUT, 'need.json'), 'w'))
if '--list' in sys.argv: sys.exit()
last = 0
for i, (k, cnt) in enumerate(need):
    fn = os.path.join(OUT, k + '.npz')
    if os.path.exists(fn): continue
    for attempt in range(5):
        try:
            dt = time.time() - last
            if dt < 0.15: time.sleep(0.15 - dt)
            r = requests.get(base + f'ept-data/{k}.laz', headers={'User-Agent': UA}, timeout=120); last = time.time()
            r.raise_for_status(); break
        except Exception as ex:
            print('retry', k, ex, flush=True); time.sleep(5 * (attempt + 1))
    else: continue
    las = laspy.read(io.BytesIO(r.content))
    x = np.asarray(las.x, np.float64); y = np.asarray(las.y, np.float64); z = np.asarray(las.z, np.float32)
    cl = np.asarray(las.classification, np.uint8); rn = np.asarray(las.return_number, np.uint8); nr = np.asarray(las.number_of_returns, np.uint8)
    keep = (x >= bx0) & (x <= bx1) & (y >= by0) & (y <= by1)
    np.savez_compressed(fn, z=z[keep], c=cl[keep], r=rn[keep], n=nr[keep], ox=np.float64(bx0), oy=np.float64(by0), xo=(x[keep] - bx0).astype(np.float32), yo=(y[keep] - by0).astype(np.float32))
    if i % 50 == 0: print(i, len(need), k, len(x), flush=True)
