"""pv.py OUT x0 y0 w h [scale] [tick]: crop of sheet a with gridlines; overlays: OSM tracks (magenta), TIGER (blue thin), registered by FieldTF."""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from overlay import *
import regtf
if __name__ == '__main__':
    out = sys.argv[1]; x0, y0, w, h = map(int, sys.argv[2:6]); sc = float(sys.argv[6]) if len(sys.argv) > 6 else 2.0; tick = int(sys.argv[7]) if len(sys.argv) > 7 else 20
    ov = os.environ.get('OV', 'tiger,osm')
    af = regtf.FieldTF()
    im = crop('a', x0, y0, w, h, sc, tick=tick)
    if 'tiger' in ov:
        t = json.load(open(os.path.join(CACHE, 'tiger_roads_bbox.geojson'))); draw_vec(im, af, x0, y0, sc, t, (0, 80, 255), 1)
    if 'osm' in ov:
        o = json.load(open(os.path.join(ROOT, 'tmp/b1863/roads/osm_tracks.json'))); draw_vec(im, af, x0, y0, sc, o, (255, 0, 255), 1)
    im.save(out)
