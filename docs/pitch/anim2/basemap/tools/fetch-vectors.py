"""Download roads, railroads, streams and water bodies from Census TIGERweb (public domain, TIGER/Line) for the plan's bounding box, as GeoJSON in WGS84.
Cached under tmp/look-dev/basemap/cache/tiger/.  Usage: python fetch-vectors.py"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
BASE = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/'
LAYERS = [('Transportation', 2, 'primary'), ('Transportation', 6, 'secondary'), ('Transportation', 8, 'local'), ('Transportation', 9, 'rail'), ('Hydro', 0, 'streams'), ('Hydro', 1, 'water')]
def bbox_ll():
    plan = json.load(open(os.path.join(BASEMAP, 'plan.json'))); r = plan['z14Range']
    x0, y1 = tile_bounds_merc(14, r['x0'], r['y0'])[0], tile_bounds_merc(14, r['x1'], r['y1'])[1]
    sw = merc_to_lnglat(tile_bounds_merc(14, r['x0'], r['y1'])[0], tile_bounds_merc(14, r['x0'], r['y1'])[1])
    ne = merc_to_lnglat(tile_bounds_merc(14, r['x1'], r['y0'])[2], tile_bounds_merc(14, r['x1'], r['y0'])[3])
    return sw[0], sw[1], ne[0], ne[1]
if __name__ == '__main__':
    w, s, e, n = bbox_ll(); print('bbox', w, s, e, n)
    for svc, lid, name in LAYERS:
        feats = []; off = 0
        while True:
            p = polite_get(f'{BASE}{svc}/MapServer/{lid}/query', dict(where='1=1', geometry=f'{w},{s},{e},{n}', geometryType='esriGeometryEnvelope', inSR=4326, outSR=4326, spatialRel='esriSpatialRelIntersects',
                           outFields='*', returnGeometry='true', f='geojson', resultOffset=off, resultRecordCount=2000), cache_key=f'tiger/{name}_{off}.geojson', min_interval=1.0)
            j = json.load(open(p, encoding='utf8')); fs = j.get('features', []); feats += fs
            if len(fs) < 2000 and not j.get('exceededTransferLimit'): break
            off += len(fs)
        print(name, len(feats), 'features', sorted({k for f in feats[:50] for k in f['properties']})[:40])
        json.dump({'type': 'FeatureCollection', 'features': feats}, open(os.path.join(CACHE, 'tiger', f'{name}.geojson'), 'w'))
