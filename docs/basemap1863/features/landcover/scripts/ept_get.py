import json, os, sys, time, io, requests, numpy as np, laspy
from concurrent.futures import ThreadPoolExecutor
base = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/'
UA = 'gettysburg-map-landcover-research/1.0 (polite, rate-limited, cached; historical reconstruction project)'
OUT = os.path.join(os.path.dirname(__file__), '..', 'lidar')
need = json.load(open(os.path.join(OUT, 'need.json')))
MAXD = int(sys.argv[1]); MIND = int(sys.argv[2]) if len(sys.argv) > 2 else 0
bx0, by0 = -8605520.4079217, 4831711.199452233; bx1, by1 = -8589917.359397056, 4848012.405540396
todo = [(k, c) for k, c in need if MIND <= int(k.split('-')[0]) <= MAXD and not os.path.exists(os.path.join(OUT, k + '.npz'))]
todo.sort(key=lambda t: int(t[0].split('-')[0]))
print('todo', len(todo), 'pts', sum(c for _, c in todo), flush=True)
sess = requests.Session(); sess.headers['User-Agent'] = UA
def work(item):
    k, cnt = item
    fn = os.path.join(OUT, k + '.npz')
    for attempt in range(5):
        try:
            r = sess.get(base + f'ept-data/{k}.laz', timeout=120); r.raise_for_status(); break
        except Exception as ex:
            time.sleep(4 * (attempt + 1))
    else: return k, -1
    las = laspy.read(io.BytesIO(r.content))
    x = np.asarray(las.x, np.float64); y = np.asarray(las.y, np.float64); z = np.asarray(las.z, np.float32)
    cl = np.asarray(las.classification, np.uint8); rn = np.asarray(las.return_number, np.uint8); nr = np.asarray(las.number_of_returns, np.uint8)
    keep = (x >= bx0) & (x <= bx1) & (y >= by0) & (y <= by1)
    np.savez_compressed(fn + '.tmp.npz', z=z[keep], c=cl[keep], r=rn[keep], n=nr[keep], xo=(x[keep] - bx0).astype(np.float32), yo=(y[keep] - by0).astype(np.float32))
    os.replace(fn + '.tmp.npz', fn)
    return k, int(keep.sum())
t0 = time.time(); done = 0
with ThreadPoolExecutor(4) as ex:
    for k, n in ex.map(work, todo):
        done += 1
        if done % 100 == 0: print(done, len(todo), round(time.time() - t0), flush=True)
print('finished', done, flush=True)
