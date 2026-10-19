"""AOI constants shared by the scripts."""
import os, math
from pyproj import Transformer
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
LL = (-77.34375, 39.75788, -77.14600, 39.87602)   # the Battle Studio data box, docs/pitch/anim2/basemap/README.md section 5
T = Transformer.from_crs(4326, 26918, always_xy=True)
Ti = Transformer.from_crs(26918, 4326, always_xy=True)


def utm_bounds(ll=LL, snap=60.0):
    xs, ys = [], []
    for x in (ll[0], ll[2]):
        for y in (ll[1], ll[3]):
            X, Y = T.transform(x, y); xs.append(X); ys.append(Y)
    return (math.floor(min(xs) / snap) * snap, math.floor(min(ys) / snap) * snap, math.ceil(max(xs) / snap) * snap, math.ceil(max(ys) / snap) * snap)
