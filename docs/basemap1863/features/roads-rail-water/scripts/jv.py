"""jv.py OUT TF name:lng:lat ... : junction views, 3 per row, with TIGER (blue) and NHD (cyan) overlay and 10-px ticks."""
import sys, os, json
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from gcpsheet import *
if __name__ == '__main__':
    out, tf = sys.argv[1], sys.argv[2]
    af = Affine(json.load(open(os.path.join(ROOT, 'tmp/b1863/roads', tf)))['M'])
    t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson')))
    HALF = int(os.environ.get('HALF', 50)); SC = float(os.environ.get('SC', 4.0))
    ps = []
    for a in sys.argv[3:]:
        n, lng, lat = a.split(':'); ps.append(panel('a', af, n, float(lng), float(lat), half=(HALF, HALF), sc=SC, tiger=t, tick=10))
    W, H = ps[0].size; cols = 3; rows = (len(ps) + cols - 1) // cols
    sh = Image.new('RGB', (W * cols, H * rows), (255, 255, 255))
    for i, p in enumerate(ps): sh.paste(p, ((i % cols) * W, (i // cols) * H))
    sh.save(out)
