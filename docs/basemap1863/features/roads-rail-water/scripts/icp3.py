import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from icp2 import *
if __name__ == '__main__':
    s = sys.argv[1]; niter = int(sys.argv[2]); src = sys.argv[3]
    tf = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', src))); af = Affine(tf['M'])
    n = json.load(open(os.path.join(CACHE, 'nhd_6.geojson')))
    samples = line_samples(n, lambda p: (p.get('gnis_name') or '') in ('Rock Creek', 'Willoughby Run', 'Marsh Creek', 'Plum Run', 'White Run', 'Stevens Run', 'Littles Run') and p.get('fcode') == 46006, step_m=20.0)
    # line_samples uses properties['name']; patch name
    ink = ink_map(s); inkb = cv2.GaussianBlur(ink, (0, 0), 1.2)
    print(len(samples), 'stream samples')
    for it in range(niter):
        meas = measure2(af, samples, inkb, half=30, widths=(5, 6, 7, 8, 10, 12, 14), thresh=3.0)
        off = np.array([m[6] for m in meas])
        print(it, 'n', len(meas), 'median off', round(float(np.median(off)), 2), 'MAD', round(float(np.median(np.abs(off - np.median(off)))), 2), 'frac<=3', round(float(np.mean(np.abs(off) <= 3)), 3))
        af, r, w = solve(af, meas, huber=4.0)
    json.dump({'M': af.M.tolist(), 'method': 'stream ICP'}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_icp3_{s}.json'), 'w'))
    print(np.round(af.M, 6))
