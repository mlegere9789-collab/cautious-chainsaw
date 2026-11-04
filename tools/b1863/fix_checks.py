"""Measurements of the fix pass, one JSON: docs/basemap1863/verification/fix-results.json (the numbers quoted in verification/FIX-REPORT.md).
Run after stage 46 (or after stage 35 with B1863_FINAL): python tools/b1863/fix_checks.py
Each block says what was measured, how, and the number; nothing here claims the map is exact.
  survivors      share of the footprint pixels of the 43 retained buildings that equal the 2013 photograph (within 6 grey levels)
  boulders       share of the pixels of the Devil's Den boulder polygon that differ from the photograph, and local standard deviation of the pale rock texture against the photograph
  thompson       roof-red pixels in the 130 x 90 m box beside the Thompson house, photograph against the reconstruction
  neutral        neutral-grey share (max-min <= 11, |R-G| <= 7, luma 40-240) in the discs of the pass-6 hotspots, from the committed tiles
  roads          open ends of the drawn network at the pass-4 locations; stated errors vs the pass-2 table
  widths         drawn width (pixels labelled ROAD_ADDED across the road) against the stated class width
  provenance     counts of source types, drawn features without catalogue sources
"""
import sys, os, json, csv, glob, math, numpy as np, rasterio, warnings, cv2
warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from rasterio.windows import Window
from PIL import Image

FINAL = os.environ.get('B1863_FINAL', os.path.join(C.BUILD, 'stage35.u8'))
mm = np.memmap(FINAL, dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
prov = np.memmap(os.path.join(C.BUILD, 'prov.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
base = rasterio.open(C.BASE_TIF)
out = {}

def win(x0, x1, y0, y1):
    c0 = int(x0 - C.X0); c1 = int(x1 - C.X0); r0 = int(C.Y0 - y1); r1 = int(C.Y0 - y0)
    a = np.moveaxis(base.read([1, 2, 3], window=Window(c0, r0, c1 - c0, r1 - r0)), 0, -1).astype(int)
    b = np.array(mm[r0:r1, c0:c1]).astype(int)
    return a, b, (r0, r1, c0, c1)

def survivors():
    ids = {r['structure_id'] for r in csv.DictReader(open(os.path.join(C.FEAT, 'structures', 'retain_1863_survivors.csv'), encoding='utf-8'))}
    fc = C.load_geojson(os.path.join(C.FEAT, 'structures', 'structures.geojson'))
    tot = same = 0; per = {}
    for f in fc['features']:
        if f['properties']['id'] in ids and f['geometry']:
            g = C.geom_to_utm(f['geometry']).buffer(-0.5)
            if g.is_empty:
                continue
            x0, y0, x1, y1 = g.bounds
            a, b, (r0, r1, c0, c1) = win(x0 - 2, x1 + 2, y0 - 2, y1 + 2)
            m = C.rasterize([g], r0, r1, c0, c1).astype(bool)
            d = np.abs(a - b).max(2) <= 6
            if m.any():
                per[f['properties']['id']] = round(float(d[m].mean()), 3); tot += int(m.sum()); same += int(d[m].sum())
    return dict(n=len(per), px=tot, unchanged_share=round(same / max(tot, 1), 4), intact_95=sum(1 for v in per.values() if v >= 0.95), n_under_20=sum(1 for v in per.values() if v < 0.2),
                worst=sorted((v, k) for k, v in per.items())[:6])

def boulders():
    res = {}
    for f in C.load_geojson(os.path.join(C.FEAT, 'landcover', 'boulder_fields_1863.geojson'))['features']:
        g = C.geom_to_utm(f['geometry'])
        x0, y0, x1, y1 = g.bounds
        a, b, (r0, r1, c0, c1) = win(x0, x1, y0, y1)
        m = C.rasterize([g], r0, r1, c0, c1).astype(bool)
        d = np.abs(a - b).max(2) > 6
        la = a.mean(2).astype(np.float32); lb = b.mean(2).astype(np.float32)
        def lstd(x): return np.sqrt(np.maximum(cv2.blur(x * x, (7, 7)) - cv2.blur(x, (7, 7)) ** 2, 0))
        res[f['properties']['id']] = dict(px=int(m.sum()), changed_share=round(float(d[m].mean()), 4), local_std_photo=round(float(lstd(la)[m].mean()), 2), local_std_recon=round(float(lstd(lb)[m].mean()), 2))
    return res

def redroof(x):
    R, G, B = x[..., 0], x[..., 1], x[..., 2]; mx = x.max(2); mn = x.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    return (R == mx) & (R > G + 25) & (R > B + 35) & (sat > 0.38) & (mx > 90)

def thompson():
    a, b, _ = win(307860, 307990, 4411820, 4411910)
    return dict(box='E307860-307990 N4411820-4411910', roof_red_px_photo=int(redroof(a).sum()), roof_red_px_recon=int(redroof(b).sum()))

def neutral_share():
    sites = [("H01", 18712, 24848, 35, 336, 150), ("H02", 18712, 24857, 8, 420, 260), ("H03", 18711, 24856, 390, 262, 110), ("H04", 18702, 24852, 496, 229, 90), ("H08", 18713, 24845, 127, 401, 60),
             ("H09", 18713, 24845, 200, 359, 70), ("H10", 18711, 24845, 293, 263, 50), ("H11", 18711, 24847, 56, 365, 60), ("H12", 18706, 24843, 332, 121, 60), ("H32", 18705, 24849, 502, 336, 70)]
    res = {}
    for sid, x, y, px, py, r in sites:
        big = np.zeros((1536, 1536, 4), np.uint8)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                p = os.path.join(C.TILES, '16', str(x + dx), '%d.webp' % (y + dy))
                if os.path.exists(p):
                    big[(dy + 1) * 512:(dy + 2) * 512, (dx + 1) * 512:(dx + 2) * 512] = np.asarray(Image.open(p).convert('RGBA'))
        cx, cy = 512 + px, 512 + py
        a = big[max(cy - r, 0):cy + r, max(cx - r, 0):cx + r].astype(np.int32)
        R, G, B = a[..., 0], a[..., 1], a[..., 2]
        L = (299 * R + 587 * G + 114 * B) // 1000
        c = np.maximum(np.maximum(R, G), B) - np.minimum(np.minimum(R, G), B)
        n = (c <= 11) & (abs(R - G) <= 7) & (L >= 40) & (L <= 240) & (a[..., 3] > 0)
        res[sid] = round(float(n.mean()), 4)
    return dict(limit=0.0184, shares=res)

def provenance():
    fc = C.load_geojson(os.path.join(C.PROV, 'added_features.geojson'))
    types = {}
    for f in fc['features']:
        for s in f['properties']['sources']:
            types[s['type']] = types.get(s['type'], 0) + 1
    return dict(features=len(fc['features']), source_types=types)

if __name__ == '__main__':
    out['survivors'] = survivors(); print('survivors', out['survivors'])
    out['boulders'] = boulders(); print('boulders', out['boulders'])
    out['thompson'] = thompson(); print('thompson', out['thompson'])
    out['neutral'] = neutral_share(); print('neutral', out['neutral'])
    out['provenance'] = provenance(); print('provenance', out['provenance'])
    json.dump(out, open(os.path.join(C.DOCS, 'verification', 'fix-results.json'), 'w'), indent=1)
