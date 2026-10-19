import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from autoreg import *
MAJOR = ('Baltimore Pike', 'Taneytown Rd', 'Emmitsburg Rd', 'Chambersburg Rd', 'Chambersburg St', 'Hanover Rd', 'Fairfield Rd', 'Mummasburg Rd', 'Old Harrisburg Rd', 'Carlisle St', 'Baltimore St', 'Harrisburg St',
         'Millerstown Rd', 'Wheatfield Rd', 'Table Rock Rd', 'York Rd', 'Hanover St', 'York St', 'Steinwehr Ave', 'Biglerville Rd', 'Granite Schoolhouse Ln', 'Hunterstown Rd', 'Blacksmith Shop Rd', 'Black Horse Tavern Rd', 'Knoxlyn Rd',
         'Low Dutch Rd', 'S Washington St', 'N Washington St', 'W Middle St', 'E Middle St', 'W High St', 'E High St', 'Stratton St', 'S Stratton St', 'N Stratton St')
if __name__ == '__main__':
    s = sys.argv[1]
    tf = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_{s}.json')))
    af = Affine(tf['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    pts = sample_points(t, 5.0, lambda p: (p['name'] or '') in MAJOR)
    ink = ink_map(s)
    print(len(pts), 'pts; initial', score(af.M, pts, cv2.GaussianBlur(ink, (0, 0), 3)))
    af2 = optimise(af, pts, ink, sigmas=(6, 3, 2))
    d = af2.M - af.M; print('delta', np.round(d, 5))
    # shift at a few image points in px
    for (x, y) in [(2500, 2000), (1700, 3400), (3000, 3300), (1300, 2300), (2800, 1500)]:
        e, n = af.px2m(x, y); p2 = af2.M @ np.array([e, n, 1]); print((x, y), '-> shift px', np.round(p2 - np.array([x, y]), 1))
    json.dump({'M': af2.M.tolist(), 'method': 'ink-along-major-roads refinement'}, open(os.path.join(ROOT, 'tmp/b1863/roads', f'tf_auto_{s}.json'), 'w'))
