#!/usr/bin/env python3
"""BASE1863 asset stager: turns the committed reconstruction pyramid (docs/basemap1863) into the files the site serves under /tiles1863/<ver>/.

    python tools/t0/base1863/stage_assets.py [--out tmp/b1863/group/stage] [--keep-old]

Why a stager and not a plain copy (findings of the integration, all measured, see tools/t0/BASE1863-README.md):
  1. The pyramid was cut on a regular tile grid with cv2.remap(..., BORDER_REPLICATE) (tools/b1863/s40_tiles.py), so every tile that reaches past the edge of the 17,280 x 13,620 m
     NAIP mosaic holds the edge row/column smeared outwards as vertical and horizontal streaks (the z13 mosaic shows two streaked bands and a streaked right margin).  Those pixels are not
     imagery of anything.  This stager recomputes, for every tile, which pixels lie inside the mosaic (same grid constants as tools/b1863/common.py), writes tiles that are partly outside as
     WebP WITH ALPHA (outside = transparent, so the map shows its neutral ground there), drops tiles that lie wholly outside, and copies the fully-inside tiles byte for byte.
  2. z17 is an enlargement of z16 (native ground sample distance 0.92 m, manifest.native_note) and exists for 97 of 459 tiles of its range: a raster source cannot ask "does this tile exist",
     so it would produce 362 HTTP 404s.  z17 is not shipped; the map over-zooms z16 (identical pixels, interpolated by the GPU).  No new information is lost.
  3. z16 has 28 holes inside its bounding rectangle for the same reason.  A hole tile that contains imagery is filled with the 2x enlargement of its z15 parent quadrant (no new information,
     the same pixels the z15 layer shows); one that holds none becomes a fully transparent tile.  Every tile of the served rectangle therefore exists: no 404, no console error.
  4. The provenance layer ("what was changed") is a palette PNG whose class 0 is opaque black.  It is re-written with transparency for the unchanged classes and outside the mosaic.
Deterministic: same inputs, same bytes.  Heavy work runs below normal priority with at most 4 processes.
"""
import argparse
import hashlib
import io
import json
import math
import os
import shutil
import sys
import time
from multiprocessing import Pool

import warnings
import numpy as np

warnings.filterwarnings('ignore', category=DeprecationWarning)
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DOCS = os.path.join(REPO, 'docs', 'basemap1863')
TILES = os.path.join(DOCS, 'tiles')
PROV = os.path.join(DOCS, 'PROVENANCE-LAYER')
FEAT = os.path.join(DOCS, 'features')

# grid of the reconstruction (tools/b1863/common.py): EPSG:26918, 1 m pixels, origin upper-left
X0, Y0, GW, GH = 299220.0, 4416660.0, 17280, 13620
T = 512
ZMIN, ZMAX = 11, 16
QUAL = {11: 80, 12: 80, 13: 80, 14: 79, 15: 76, 16: 72}
EDGE_Q_BONUS = 8                      # edge tiles are decoded and re-encoded once: higher quality limits the second generation loss
WORLD = 2 * 20037508.342789244
GROUND = '#6b8268'                    # neutral ground (see ground_colour()): the median colour of the z11 tiles of the pyramid
THREADS = min(4, os.cpu_count() or 1)


def lowprio():
    try:
        import psutil
        psutil.Process().nice(psutil.BELOW_NORMAL_PRIORITY_CLASS if os.name == 'nt' else 10)
    except Exception:
        try:
            import ctypes
            ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
        except Exception:
            pass


def merc_bounds(z, x, y):
    n = 2 ** z
    x0 = -WORLD / 2 + x * WORLD / n
    y1 = WORLD / 2 - y * WORLD / n
    return x0, y1 - WORLD / n, x0 + WORLD / n, y1


_tr = None


def transformer():
    global _tr
    if _tr is None:
        from pyproj import Transformer
        _tr = Transformer.from_crs('EPSG:3857', 'EPSG:26918', always_xy=True)
    return _tr


def valid_mask(z, x, y):
    """bool [512,512]: pixel centre lies inside the mosaic grid (inside = real imagery, outside = BORDER_REPLICATE smear)."""
    xs, ys, xe, ye = merc_bounds(z, x, y)
    px = (np.arange(T) + 0.5) / T
    mx = xs + px * (xe - xs)
    my = ye - px * (ye - ys)
    MX, MY = np.meshgrid(mx, my)
    E, N = transformer().transform(MX, MY)
    col = E - X0
    row = Y0 - N
    return (col >= 0) & (col < GW) & (row >= 0) & (row < GH)


def tile_range_for_box(z, box):
    """integer tile index range covering lon/lat box (w, s, e, n)."""
    def tx(lon, lat):
        n = 2 ** z
        return (lon + 180.0) / 360.0 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    xa, ya = tx(box[0], box[3])
    xb, yb = tx(box[2], box[1])
    return int(xa), int(xb), int(ya), int(yb)


def data_box_lonlat():
    """lon/lat bounding box of the mosaic rectangle (its four corners and edge midpoints through the inverse transform)."""
    from pyproj import Transformer
    inv = Transformer.from_crs('EPSG:26918', 'EPSG:4326', always_xy=True)
    pts = []
    for fx in np.linspace(0, 1, 9):
        for fy in (0, 1):
            pts.append((X0 + fx * GW, Y0 - fy * GH))
    for fy in np.linspace(0, 1, 9):
        for fx in (0, 1):
            pts.append((X0 + fx * GW, Y0 - fy * GH))
    ll = [inv.transform(a, b) for a, b in pts]
    return (min(p[0] for p in ll), min(p[1] for p in ll), max(p[0] for p in ll), max(p[1] for p in ll))


# --------------------------------------------------------------------------------------------------------------------- jobs
def _read_webp(path):
    from PIL import Image
    return Image.open(path).convert('RGB')


def photo_job(job):
    """job = (z, x, y, src_path or None, out_path, parent_path or None).  Returns dict(z,x,y,kind,bytes,sha256)."""
    from PIL import Image
    z, x, y, src, out, parent_src = job
    lowprio()
    m = valid_mask(z, x, y)
    nvalid = int(m.sum())
    os.makedirs(os.path.dirname(out), exist_ok=True)
    kind = None
    if src is not None and nvalid == T * T:
        shutil.copyfile(src, out)
        kind = 'copy'
    elif src is not None and nvalid > 0:
        im = _read_webp(src)
        a = np.asarray(im)
        rgba = np.dstack([a, (m * 255).astype(np.uint8)])
        buf = io.BytesIO()
        Image.fromarray(rgba, 'RGBA').save(buf, 'WEBP', quality=min(95, QUAL[z] + EDGE_Q_BONUS), method=6, alpha_quality=100)
        open(out, 'wb').write(buf.getvalue())
        kind = 'edge'
    elif src is None and nvalid > 0 and parent_src is not None:
        # a hole of the pyramid that contains imagery: 2x enlargement of the z15 parent's quadrant (no new information; same pixels as the z15 layer)
        import cv2
        par = np.asarray(_read_webp(parent_src))
        qx, qy = x & 1, y & 1
        quad = par[qy * 256:(qy + 1) * 256, qx * 256:(qx + 1) * 256]
        up = cv2.resize(quad, (T, T), interpolation=cv2.INTER_CUBIC)
        rgba = np.dstack([up, (m * 255).astype(np.uint8)])
        buf = io.BytesIO()
        Image.fromarray(rgba, 'RGBA').save(buf, 'WEBP', quality=QUAL[z], method=6, alpha_quality=100)
        open(out, 'wb').write(buf.getvalue())
        kind = 'fill'
    else:
        buf = io.BytesIO()
        Image.fromarray(np.zeros((T, T, 4), np.uint8), 'RGBA').save(buf, 'WEBP', lossless=True)
        open(out, 'wb').write(buf.getvalue())
        kind = 'blank'
    data = open(out, 'rb').read()
    return dict(z=z, x=x, y=y, kind=kind, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), valid=nvalid)


PALETTE = {0: (0, 0, 0), 22: (60, 60, 60), 1: (255, 0, 255), 2: (200, 0, 160), 3: (255, 128, 0), 4: (0, 180, 0), 5: (150, 100, 200), 6: (255, 230, 0), 7: (255, 160, 0),
           8: (0, 200, 255), 9: (160, 120, 60), 10: (255, 60, 60), 11: (120, 255, 120), 12: (255, 200, 0), 13: (230, 60, 120), 14: (0, 255, 200), 20: (120, 120, 255), 21: (0, 120, 255)}
TRANSPARENT_CLASSES = (0, 22)          # PHOTO_KEPT, PHOTO_KEPT_OUTSIDE: nothing to show


def prov_job(job):
    from PIL import Image
    z, x, y, src, out = job
    lowprio()
    m = valid_mask(z, x, y)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if src is None:
        idx = np.zeros((T, T), np.uint8)
    else:
        idx = np.asarray(Image.open(src)).copy()
        idx[~m] = 0
    im = Image.fromarray(idx, 'P')
    pal = np.zeros(768, np.uint8)
    for code, rgb in PALETTE.items():
        pal[code * 3:code * 3 + 3] = rgb
    im.putpalette(pal.tolist())
    alpha = bytes(0 if i in TRANSPARENT_CLASSES or i not in PALETTE else 255 for i in range(256))
    im.info['transparency'] = alpha
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True, transparency=alpha)
    data = buf.getvalue()
    open(out, 'wb').write(data)
    return dict(z=z, x=x, y=y, bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), changed=int(np.isin(idx, [c for c in PALETTE if c not in TRANSPARENT_CLASSES]).sum()))


CLASS_TEXT = {
    1: 'Modern feature removed (road, roof, utility, small object); ground filled from its surroundings',
    2: 'Modern feature or area removed; ground re-synthesised from real photograph blocks',
    3: 'Modern tree canopy removed (outside the 1863 woods, with a margin)',
    4: '1863 woods added where the ground is open now',
    5: 'Town block: modern street and yard trees removed',
    6: '1863 road drawn (from the road catalogue)',
    7: '1863 railroad grade drawn',
    8: '1863 bridge drawn',
    9: '1863 fence drawn',
    10: '1863 building drawn (schematic roof)',
    11: '1863 orchard trees drawn (schematic)',
    12: 'Wheatfield recoloured to ripe wheat (colour estimated)',
    13: '1868-69 building mass drawn (schematic roofs)',
    14: '1863 stream channel drawn where the 2013 photograph shows none (Stevens Run through the borough)',
    20: 'Kept as photographed: the evidence cannot say whether modern or 1863',
    21: '1863 building that still stands: real roof kept',
}
ATTRIBUTION_LONG = ('Reconstruction of Gettysburg, July 1863, not a photograph. Base: USDA NAIP imagery 2013 (public domain), USGS 3DEP; period maps: Library of Congress '
                    '(Warren 1868-69, Bachelder 1876, Hopkins 1858), NPS, Census TIGER, USGS NHD, OpenStreetMap contributors (ODbL: the lists of modern features to remove and the centre lines of the roads and streets that are drawn), Wikipedia contributors (CC BY-SA 4.0: the monument list), Adams County GIS (2023 building outlines, used to decide what to remove).')
ATTRIBUTION = 'Reconstruction, not a photograph. USDA NAIP 2013, USGS, Library of Congress, NPS, OpenStreetMap contributors'


def licence_rows():
    """the rows of section 10 of docs/basemap1863/BUILD.md (the licence and attribution table), as plain text lines"""
    text = open(os.path.join(DOCS, 'BUILD.md'), encoding='utf-8').read()
    i = text.index('## 10. Licences and attribution table')
    rows = []
    for ln in text[i:].split(chr(10)):
        if ln.startswith('|') and not ln.startswith('| Source') and not ln.startswith('|---'):
            cells = [c.strip() for c in ln.strip().strip('|').split('|')]
            if len(cells) == 4:
                rows.append('  - %s | used for: %s | licence: %s | credit: %s' % tuple(cells))
    return rows


def about_text(manifest):
    rows = licence_rows()
    return chr(10).join([
        'RECONSTRUCTION OF GETTYSBURG, JULY 1863 - sources, licences and limits',
        '',
        'This base map is a reconstruction, not a photograph. No aerial photograph of Gettysburg in 1863 exists. The picture is a modern public-domain aerial photograph',
        '(USDA NAIP, flown 4 June 2013, 1.0 m per pixel) from which modern features were removed and to which 1863 features were added from period maps and records.',
        'It is not an exact replica, and no claim of 100 percent accuracy is made anywhere. Where a feature of 1863 is not known the neighbouring ground is shown and the',
        'feature is recorded as UNKNOWN rather than invented.',
        '',
        'What "Show what was changed" shows: every pixel that was removed, re-synthesised, drawn or recoloured, in the colours of its legend. Untouched photograph is not tinted.',
        'Every drawn feature has an id, sources (title, sheet or page, link, type), a method, a positional error in metres and a confidence (Documented, Estimated, Contested)',
        'in the provenance layer of the project (docs/basemap1863/PROVENANCE-LAYER/ and docs/basemap1863/BUILD.md in the project files).',
        '',
        'Measured accuracy of the inputs (none of it is a ground survey):',
        '  - 1863 woods, orchards and open-ground outlines: 27 m median, 40 m 90th percentile, 63 m maximum against independent control points',
        '  - 1863 buildings from the Warren/Bachelder plates: 10 m median, 22 m 90th percentile, 35 m maximum (the plates themselves disagree by up to 76 m at their edges)',
        '  - 1858 borough inset: 1.9 m fit, 2.85 m leave-one-out; roads: modern centre lines on the 1863 corridors, period-map registration 15 to 19 m',
        '',
        'What is not known or not done:',
        '  - The photograph is dated 4 June 2013. Crop and meadow state in July 1863 is unknown except for the Wheatfield, whose ripe-wheat colour is an estimate.',
        '  - Outside the Warren sheet (about 163 of the 235 km2 of the box) only modern buildings, roads and utilities were removed; woods and fields stay as photographed and',
        '    no 1863 roads or buildings are drawn there.',
        '  - 1,535 ha (21 percent of the surveyed ground) is kept as photographed because the outlines cannot separate modern canopy from 1863 woods.',
        '  - Terrain is modern: road cuts, the quarry and 20th-century grading are not rolled back. Wide removed areas are soft, re-synthesised ground.',
        '  - The resolution is 1 m per pixel: closer zoom levels enlarge the same pixels. Roofs, fences and orchard trees are schematic. Borough alleys, farm lanes not in',
        '    the catalogue and buildings erected 1859-1863 are not drawn. Monuments farther than 45 m from a road or path may remain in the image.',
        '  - The imagery ends at the edge of the photograph (a slightly rotated rectangle); beyond it the map shows a neutral ground colour.',
        '',
        'Sources, licences and credit:',
        *rows,
        '',
        'Not used: Google Earth, Google Maps, Bing, Maxar, Mapbox imagery or any other commercial imagery. The base map is served from this site; only text glyphs of the labels',
        'come from Mapbox.',
        '',
        'Credit line: ' + ATTRIBUTION_LONG,
        '',
    ])


# --------------------------------------------------------------------------------------------------------------------- overlays (labels) from the feature catalogue
def clean_name(n):
    for sep in (' (', ', with', ', '):
        if sep in n:
            n = n.split(sep)[0]
    return n.strip()


def build_overlays():
    from pyproj import Transformer
    from shapely.geometry import shape, mapping, MultiLineString, LineString
    from shapely.ops import linemerge, transform, unary_union
    to_utm = Transformer.from_crs('EPSG:4326', 'EPSG:26918', always_xy=True).transform
    to_ll = Transformer.from_crs('EPSG:26918', 'EPSG:4326', always_xy=True).transform

    def simp(g, tol):
        gu = transform(to_utm, g).simplify(tol, preserve_topology=False)
        return transform(to_ll, gu)

    def coords(g):
        r = lambda c: [round(c[0], 6), round(c[1], 6)]
        if g.geom_type == 'LineString':
            return [[r(c) for c in g.coords]]
        return [[r(c) for c in part.coords] for part in g.geoms]

    D = os.path.join(FEAT, 'roads-rail-water')
    roads = json.load(open(os.path.join(D, 'roads.geojson'), encoding='utf-8'))['features']
    # the product's own seven labelled roads come first (rank 0): the remaining catalogue roads are minor labels (rank 1); the town square and unnamed edges carry no label
    major = {'Emmitsburg Road', 'Taneytown Road', 'Baltimore Pike', 'Chambersburg Pike', 'Hanover Road', 'Wheatfield Road', 'Granite Schoolhouse Lane',
             'York Pike', 'Harrisburg Road', 'Carlisle Road', 'Mummasburg Road', 'Hagerstown Road'}
    road_feats = []
    for f in roads:
        p = f['properties']
        nm = clean_name(p['name'])
        if p.get('subtype') == 'town square' or 'unnamed TIGER' in p['name'] or not p.get('present_1863'):
            continue
        g = shape(f['geometry'])
        g = simp(g, 3.0)
        road_feats.append({'type': 'Feature', 'properties': {'id': f['id'], 'name': nm, 'label': True, 'rank': 0 if nm in major else 1, 'confidence': p.get('confidence'),
                                                             'error_m': p.get('positional_error_m')},
                           'geometry': {'type': 'MultiLineString', 'coordinates': coords(g)}})
    water = json.load(open(os.path.join(D, 'waterways.geojson'), encoding='utf-8'))['features']
    streams = {}
    for f in water:
        nm = f['properties']['name']
        if nm == 'unnamed tributary':
            continue
        streams.setdefault(nm, []).append(shape(f['geometry']))
    river_feats = []
    for nm, parts in sorted(streams.items()):
        g = unary_union(parts)
        if g.geom_type == 'MultiLineString':
            g = linemerge(g)
        g = simp(g, 4.0)
        river_feats.append({'type': 'Feature', 'properties': {'id': 'WTR-' + nm.upper().replace(' ', '-'), 'name': nm}, 'geometry': {'type': 'MultiLineString' if g.geom_type == 'MultiLineString' else 'LineString',
                            'coordinates': coords(g) if g.geom_type == 'MultiLineString' else coords(g)[0]}})
    s = json.load(open(os.path.join(FEAT, 'structures', 'structures.geojson'), encoding='utf-8'))['features']
    farm_feats = []
    for want, label in (('STR-ROSE-HOUSE1', 'Rose Farm'), ('STR-TROSTLE-HOUSE1', 'Trostle Farm'), ('STR-CODORI-HOUSE1', 'Codori Farm'), ('STR-BUSHMAN-HOUSE1', 'Bushman Farm')):
        f = next(x for x in s if x['id'] == want)
        c = shape(f['geometry']).centroid
        farm_feats.append({'type': 'Feature', 'properties': {'id': want, 'name': label, 'confidence': f['properties'].get('confidence'), 'error_m': f['properties'].get('positional_error_m')},
                           'geometry': {'type': 'Point', 'coordinates': [round(c.x, 6), round(c.y, 6)]}})
    return {'roads': {'type': 'FeatureCollection', 'features': road_feats}, 'rivers': {'type': 'FeatureCollection', 'features': river_feats},
            'farms': {'type': 'FeatureCollection', 'features': farm_feats}}


def ground_colour():
    from PIL import Image
    px = []
    for x in (584, 585):
        for y in (776, 777):
            im = np.asarray(_read_webp(os.path.join(TILES, '11', str(x), '%d.webp' % y)))
            m = valid_mask(11, x, y)
            px.append(im[m])
    a = np.concatenate(px)
    med = np.median(a, axis=0)
    return '#%02x%02x%02x' % tuple(int(round(v)) for v in med), [float(v) for v in med]


# --------------------------------------------------------------------------------------------------------------------- main
def sha_tree(items):
    h = hashlib.sha256()
    for k in sorted(items):
        h.update(('%s %s\n' % (k, items[k])).encode())
    return h.hexdigest()


def main():
    for st in (sys.stdout, sys.stderr):
        try:
            st.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join('tmp', 'b1863', 'group', 'stage'))
    a = ap.parse_args()
    lowprio()
    t0 = time.time()
    out_root = os.path.abspath(os.path.join(REPO, a.out))
    work = os.path.join(out_root, '_work')
    shutil.rmtree(out_root, ignore_errors=True)
    os.makedirs(work)
    manifest = json.load(open(os.path.join(TILES, 'manifest.json'), encoding='utf-8'))
    box = data_box_lonlat()
    have = {}
    for key in manifest['tiles']:
        z, x, y = (int(v) for v in key.split('/'))
        if z <= ZMAX:
            have[(z, x, y)] = os.path.join(TILES, str(z), str(x), '%d.webp' % y)
    # every tile of the served rectangle of each zoom
    jobs = []
    want = {}
    for z in range(ZMIN, ZMAX + 1):
        xa, xb, ya, yb = tile_range_for_box(z, box)
        for x in range(xa, xb + 1):
            for y in range(ya, yb + 1):
                # z16: only the rectangle of the tiles that exist plus holes inside it (outside it the z15 layer carries the picture)
                want[(z, x, y)] = True
    # z16 detail rectangle = bounding rectangle of the shipped z16 pyramid
    z16 = [(x, y) for (z, x, y) in have if z == 16]
    r16 = (min(x for x, _ in z16), max(x for x, _ in z16), min(y for _, y in z16), max(y for _, y in z16))
    want = {k: v for k, v in want.items() if k[0] < 16 or (r16[0] <= k[1] <= r16[1] and r16[2] <= k[2] <= r16[3])}
    ver_tmp = os.path.join(work, 'photo')
    for (z, x, y) in sorted(want):
        src = have.get((z, x, y))
        parent = have.get((z - 1, x // 2, y // 2)) if z == 16 else None
        jobs.append((z, x, y, src, os.path.join(ver_tmp, str(z), str(x), '%d.webp' % y), parent))
    with Pool(THREADS) as pool:
        res = pool.map(photo_job, jobs, chunksize=8)
    res = [r for r in res]
    # tiles of z11..z15 whose pixels are all outside the mosaic and that were not in the pyramid are blank: they are kept only if inside the served rectangle (the rectangle of the box)
    kinds = {}
    for r in res:
        kinds[r['kind']] = kinds.get(r['kind'], 0) + 1
    print('photo tiles: %s (%.0f s)' % (kinds, time.time() - t0), flush=True)
    # a blank tile outside the data is useless below z16 when the rectangle of that zoom is the rectangle of the box: keep them (they prevent 404s inside the bounds the source declares)
    pjobs = []
    pv_have = {}
    for dp, dn, fn in os.walk(os.path.join(PROV, 'tiles')):
        for f in fn:
            if f.endswith('.png'):
                parts = os.path.normpath(dp).split(os.sep)
                z, x = int(parts[-2]), int(parts[-1])
                if z <= ZMAX:
                    pv_have[(z, x, int(f.split('.')[0]))] = os.path.join(dp, f)
    pv_dir = os.path.join(work, 'changed')
    for (z, x, y) in sorted(want):
        if z < 13:
            continue
        pjobs.append((z, x, y, pv_have.get((z, x, y)), os.path.join(pv_dir, str(z), str(x), '%d.png' % y)))
    with Pool(THREADS) as pool:
        pres = pool.map(prov_job, pjobs, chunksize=8)
    print('changed-layer tiles: %d, %.2f MB (%.0f s)' % (len(pres), sum(r['bytes'] for r in pres) / 1e6, time.time() - t0), flush=True)

    # drop blank photo tiles that no source range can ask for?  They can: keep them all (each is ~60 bytes of WebP).
    items = {}
    for r in res:
        items['%d/%d/%d.webp' % (r['z'], r['x'], r['y'])] = r['sha256']
    for r in pres:
        items['changed/%d/%d/%d.png' % (r['z'], r['x'], r['y'])] = r['sha256']
    overlays = build_overlays()
    ov_text = json.dumps(overlays, separators=(',', ':'), ensure_ascii=False)
    items['overlays.json'] = hashlib.sha256(ov_text.encode('utf-8')).hexdigest()
    about = about_text(manifest)
    items['ABOUT.txt'] = hashlib.sha256(about.encode('utf-8')).hexdigest()
    gcol, gmed = ground_colour()
    ver = 'v1-' + sha_tree(items)[:8]
    final = os.path.join(out_root, 'tiles1863', ver)
    os.makedirs(final)
    for src_dir, name in ((ver_tmp, None), (pv_dir, 'changed')):
        for dp, dn, fn in os.walk(src_dir):
            for f in fn:
                rel = os.path.relpath(os.path.join(dp, f), src_dir)
                dst = os.path.join(final, name, rel) if name else os.path.join(final, rel)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.move(os.path.join(dp, f), dst)
    open(os.path.join(final, 'overlays.json'), 'w', encoding='utf-8', newline='\n').write(ov_text)
    open(os.path.join(final, 'ABOUT.txt'), 'w', encoding='utf-8', newline='\n').write(about)
    shutil.rmtree(work, ignore_errors=True)

    # geography of the served sources
    def rect_of(z, keys):
        xs = [k[1] for k in keys]
        ys = [k[2] for k in keys]
        xa, xb, ya, yb = min(xs), max(xs), min(ys), max(ys)
        n = 2 ** z
        w = xa / n * 360 - 180
        e = (xb + 1) / n * 360 - 180
        north = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ya / n))))
        south = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (yb + 1) / n))))
        return [round(w, 5), round(south, 5), round(e, 5), round(north, 5)]

    inset = 0.0002
    def shrink(b):
        return [round(b[0] + inset, 5), round(b[1] + inset, 5), round(b[2] - inset, 5), round(b[3] - inset, 5)]

    wide_keys = [k for k in want if k[0] <= 15]
    detail_keys = [k for k in want if k[0] == 16]
    by_z = {}
    tot = 0
    for r in res:
        d = by_z.setdefault(r['z'], {'tiles': 0, 'bytes': 0, 'copy': 0, 'edge': 0, 'fill': 0, 'blank': 0})
        d['tiles'] += 1
        d['bytes'] += r['bytes']
        d[r['kind']] += 1
        tot += r['bytes']
    index = {
        'version': ver,
        'scheme': 'xyz', 'tile_size': 512, 'format': 'webp (RGBA where the tile reaches past the imagery)',
        'zooms': [ZMIN, ZMAX], 'wide': {'minzoom': ZMIN, 'maxzoom': 15, 'bounds': shrink(rect_of(15, [k for k in want if k[0] == 15]))},
        'detail': {'minzoom': 16, 'maxzoom': 16, 'bounds': shrink(rect_of(16, detail_keys))},
        'changed': {'minzoom': 13, 'maxzoom': 16, 'tiles': len(pres), 'bytes': sum(r['bytes'] for r in pres)},
        'imagery_box_lonlat': [round(v, 5) for v in box],
        'ground': {'colour': gcol, 'median_rgb': gmed, 'what': 'median RGB of the valid pixels of the four z11 tiles'},
        'photo': {'tiles': len(res), 'bytes': tot, 'by_zoom': by_z},
        'source_manifest': 'docs/basemap1863/tiles/manifest.json (git_commit_at_build %s)' % manifest['build'].get('git_commit_at_build'),
        'not_shipped': ['z17 (enlargement of z16, 97 of 459 tiles)'],
        'attribution': ATTRIBUTION,
        'classes': [{'code': c, 'rgb': list(PALETTE[c]), 'text': CLASS_TEXT[c]} for c in sorted(CLASS_TEXT)],
        'tree_hash': sha_tree(items),
    }
    open(os.path.join(final, 'index.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(index, indent=1))
    print('version %s: photo %d tiles %.2f MB, changed %d tiles %.2f MB, overlays %d bytes, ground %s (%.0f s)' % (
        ver, len(res), tot / 1e6, len(pres), sum(r['bytes'] for r in pres) / 1e6, len(ov_text), gcol, time.time() - t0))
    print(json.dumps({k: index[k] for k in ('wide', 'detail', 'changed')}))
    open(os.path.join(out_root, 'VERSION'), 'w').write(ver)


if __name__ == '__main__':
    main()
