"""Stage 09: modern surfaces and objects that are in no inventory layer, found in the photograph itself, and the manual site list.

The removal mask of the modern layer is built from mapped features (OpenStreetMap, county outlines, TIGER, the monument list) and a pixel classifier. Pass 6 of the
verification found whole sites in none of them (a quarry and crushing plant, substation pads, parking lots, a construction site, red-tile roofs). This stage looks for them directly:

  1. neutral-grey surfaces (concrete, asphalt, gravel, crushed stone): pixels with max-min of R,G,B <= 11, |R-G| <= 7, luma 40..240 (the measure of the pass-6 test), box density > 0.45 over 15 px,
     connected components of at least MIN_NEUTRAL px that are not water (mean NDVI above WATER_NDVI) and not a pale bare field (luma std < 4), not inside an 1863 boulder field, not already masked.
     Each component is grown by the bare, unvegetated ground around it (NDVI < 0.05, within 15 px): buildings, stockpiles and haul roads of the site.
  2. red and orange tile roofs (hue 0-22 or 340-360 deg, saturation > 0.42, NDVI < 0.05), components of at least 20 px.
  3. cleared power-line swaths through woods: the 20 m corridor of each mapped power line where the lidar canopy is absent and the surrounding ground is woods; filled as woods (value 2).
  4. the manual list tools/b1863/unlisted_manual.json: circles seen by eye on the photograph (id, centre, radius, why); each one is recorded in the provenance of the build.
Output: tmp/b1863/build/unlisted.tif (uint8: 1 modern area to re-synthesise, 2 modern clearing in woods to refill with woods), docs/basemap1863/modern/results/unlisted_components.json.
Nothing here decides what stood in 1863: it only finds what is certainly modern (pavement, industrial sites, tile roofs, power lines). The ground under them is UNKNOWN and is synthesised.
"""
import sys, os, json, time, pickle, numpy as np, cv2, rasterio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from rasterio.windows import Window

MIN_NEUTRAL = 250
WATER_NDVI = -0.33
BAND = 2048

def neutral_mask():
    base = rasterio.open(C.BASE_TIF)
    neu = np.zeros((C.H, C.W), np.uint8)
    red = np.zeros((C.H, C.W), np.uint8)
    for r0 in range(0, C.H, BAND):
        n = min(BAND, C.H - r0)
        a = base.read([1, 2, 3, 4], window=Window(0, r0, C.W, n)).astype(np.int32)
        R, G, B, N = a
        mx = a[:3].max(0); mn = a[:3].min(0); L = (299 * R + 587 * G + 114 * B) // 1000
        ndv = (N - R) / np.maximum(N + R, 1)
        # neutral grey (the pass-6 measure) and dark bluish asphalt of pads and lots (chroma up to 26, blue not below red, the NIR of paving: NDVI between -0.15 and 0, water is below -0.2)
        neu[r0:r0 + n] = (((mx - mn) <= 11) & (np.abs(R - G) <= 7) & (L >= 40) & (L <= 240)) | (((mx - mn) <= 26) & (a[2] >= a[0] - 4) & (ndv < 0.0) & (ndv > -0.15) & (L >= 55) & (L <= 170))
        sat = (mx - mn) / np.maximum(mx, 1)
        ndvi = (N - R) / np.maximum(N + R, 1)
        # hue of red-orange: R is the maximum, G between B and R, hue = 60*(G-B)/(mx-mn) in [0, 22] (mod 360)
        hue = np.where(mx == R, (60.0 * (G - B) / np.maximum(mx - mn, 1)) % 360, 99)
        # tile and shingle roofs of a red-brown hue: strongly red at any NIR, or fainter (weathered, salmon) with the low NIR of a roof (bare soil and dry grass have NDVI above 0.02)
        red[r0:r0 + n] = (((hue <= 25) | (hue >= 340)) & (mx == R) & (mx > 90) & (((sat > 0.45)) | ((sat > 0.22) & (ndvi < 0.02) & (R > G + 25) & (R - B > 44))))
    return neu, red

def main():
    C.lowprio()
    t0 = time.time()
    mask = rasterio.open(C.MASK_TIF).read(1)
    lc = rasterio.open(os.path.join(C.BUILD, 'lc1863.tif')).read(1)
    base = rasterio.open(C.BASE_TIF)
    neu, red = neutral_mask()
    print('neutral px', int(neu.sum()), 'red px', int(red.sum()), time.time() - t0, flush=True)
    masked = cv2.dilate((mask > 0).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    out = np.zeros((C.H, C.W), np.uint8)
    comps = []
    dens = cv2.boxFilter(neu.astype(np.float32), -1, (15, 15))
    cand = ((dens > 0.45) & ~masked & (lc != 6)).astype(np.uint8)
    del dens
    n, lab, st, cen = cv2.connectedComponentsWithStats(cand, connectivity=8)
    kept = rej_w = rej_f = 0
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < MIN_NEUTRAL:
            continue
        pad = 40
        c0 = max(x - pad, 0); r0 = max(y - pad, 0); c1 = min(x + w + pad, C.W); r1 = min(y + h + pad, C.H)
        sub = lab[r0:r1, c0:c1] == i
        arr = base.read([1, 2, 3, 4], window=Window(c0, r0, c1 - c0, r1 - r0)).astype(np.float32)
        R, G, B, N = arr
        nd = (N - R) / np.maximum(N + R, 1); L = arr[:3].mean(0)
        nm = neu[r0:r1, c0:c1].astype(bool) & sub
        if nm.sum() < 30:
            continue
        if nd[nm].mean() < WATER_NDVI:
            rej_w += 1; continue
        if L[nm].std() < 4.0 and L[nm].mean() > 150:
            rej_f += 1; continue
        if L[nm].mean() < 125 and L[nm].std() < 9.0:
            rej_w += 1; continue                # dark and uniform: a pond or a slow stream, not paving (paving carries markings, cars, patches)
        # grow by the unvegetated ground of the site
        bare = (nd < 0.05) & (L > 70) & ~masked[r0:r1, c0:c1] & (lc[r0:r1, c0:c1] != 6) & (nd > WATER_NDVI)
        g = sub.copy()
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        for _ in range(8):
            g = (cv2.dilate(g.astype(np.uint8), k) > 0) & (bare | g)
        g = cv2.morphologyEx(g.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        g = cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        g = (g > 0) & ~masked[r0:r1, c0:c1] & (lc[r0:r1, c0:c1] != 6)
        out[r0:r1, c0:c1][g] = 1
        cx, cy = cen[i]; lon, lat = C.utm2ll(C.X0 + cx, C.Y0 - cy)
        comps.append(dict(kind='neutral_surface', neutral_px=int(a), area_px=int(g.sum()), lon=round(lon, 5), lat=round(lat, 5)))
        kept += 1
    print('neutral components kept', kept, 'water rejected', rej_w, 'pale field rejected', rej_f, time.time() - t0, flush=True)
    # red roofs
    redc = cv2.morphologyEx(red, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    redc = (redc > 0) & ~masked
    # the fainter (weathered, salmon) reds are taken only within 35 m of a mapped modern building (wings and annexes that the county data lack); the strong reds anywhere
    near_b = cv2.dilate((mask == C.M_BLDG).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (71, 71))) > 0
    strong = np.zeros((C.H, C.W), bool)
    for r0 in range(0, C.H, BAND):
        n_ = min(BAND, C.H - r0)
        a_ = base.read([1, 2, 3], window=Window(0, r0, C.W, n_)).astype(np.int32)
        mx_ = a_.max(0); mn_ = a_.min(0)
        strong[r0:r0 + n_] = ((mx_ - mn_) / np.maximum(mx_, 1) > 0.45)
    redc &= (near_b | strong)
    n, lab, st, cen = cv2.connectedComponentsWithStats(redc.astype(np.uint8), connectivity=8)
    nr = 0
    for i in range(1, n):
        if st[i, 4] < 15 or st[i, 4] > 4000:
            continue                  # ploughed fields have the same hue and a low NIR: they are far larger than any roof
        x, y, w, h, a = st[i]
        if max(w, h) > 80:
            continue
        # a roof stands out from the ground around it: mean colour of the component against a ring 3 to 8 px outside it (a ploughed field edge or a bare patch does not)
        r0_ = max(y - 10, 0); c0_ = max(x - 10, 0); r1_ = min(y + h + 10, C.H); c1_ = min(x + w + 10, C.W)
        comp = (lab[r0_:r1_, c0_:c1_] == i).astype(np.uint8)
        ring = (cv2.dilate(comp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))) > 0) & ~(cv2.dilate(comp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0)
        rgbw = base.read([1, 2, 3], window=Window(c0_, r0_, c1_ - c0_, r1_ - r0_)).astype(np.float32)
        if ring.sum() < 20 or np.linalg.norm(rgbw[:, comp > 0].mean(1) - rgbw[:, ring].mean(1)) < 38:
            continue
        r0 = max(y - 12, 0); c0 = max(x - 12, 0); r1 = min(y + h + 12, C.H); c1 = min(x + w + 12, C.W)
        sub = (lab[r0:r1, c0:c1] == i).astype(np.uint8)
        arr = base.read([1, 2, 3, 4], window=Window(c0, r0, c1 - c0, r1 - r0)).astype(np.float32)
        ndl = (arr[3] - arr[0]) / np.maximum(arr[3] + arr[0], 1)
        roofy = (ndl < 0.04) & ~(arr[1] > arr[0] + 4)          # unvegetated, not green: the rest of the roof (shaded plane, ridge, dormer) around the red part
        g = sub > 0
        for _ in range(5):
            g = (cv2.dilate(g.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0) & (roofy | g)
        sub = cv2.dilate(g.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0
        sub &= ~masked[r0:r1, c0:c1] & (lc[r0:r1, c0:c1] != 6)
        out[r0:r1, c0:c1][sub] = 1
        cx, cy = cen[i]; lon, lat = C.utm2ll(C.X0 + cx, C.Y0 - cy)
        comps.append(dict(kind='red_tile_roof', neutral_px=int(a), area_px=int(sub.sum()), lon=round(lon, 5), lat=round(lat, 5)))
        nr += 1
    print('red roof components', nr, time.time() - t0, flush=True)
    # power-line swaths through woods
    recs = pickle.load(open(os.path.join(C.TMPW, 'inventory_utm.pkl'), 'rb'))
    lines = [r['geom'] for r in recs if r['cls'] == 'POWER_LINE' and r['geom'].geom_type in ('LineString', 'MultiLineString')]
    can2 = np.load(os.path.join(C.ROOT, 'tmp', 'b1863', 'landcover', 'canopy_smooth.npy')).astype(np.uint8)
    r_off, c_off = int(C.Y0 - 4416200.0), int(303000.0 - C.X0)
    from shapely.ops import unary_union
    corr = C.rasterize([unary_union(lines).buffer(10.0)]).astype(bool) if lines else np.zeros((C.H, C.W), bool)
    npw = 0
    # work on the 2 m lidar grid, then upsample
    c2 = corr[r_off:r_off + can2.shape[0] * 2, c_off:c_off + can2.shape[1] * 2]
    c2 = np.pad(c2, ((0, can2.shape[0] * 2 - c2.shape[0]), (0, can2.shape[1] * 2 - c2.shape[1])))
    c2 = c2.reshape(can2.shape[0], 2, can2.shape[1], 2).max(axis=(1, 3)).astype(np.uint8)
    ctx_known = ((c2 == 0)).astype(np.float32)
    num = cv2.GaussianBlur(can2.astype(np.float32) * ctx_known, (0, 0), 14); den = cv2.GaussianBlur(ctx_known, (0, 0), 14)
    ctx = num / np.maximum(den, 1e-3)
    sw2 = (c2 > 0) & (can2 == 0) & (ctx > 0.55)
    sw2 = cv2.morphologyEx(sw2.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n2, l2, s2, ce2 = cv2.connectedComponentsWithStats(sw2, connectivity=8)
    keep2 = np.zeros_like(sw2)
    for i in range(1, n2):
        if s2[i, 4] >= 40:                                    # 160 m2
            keep2[l2 == i] = 1; npw += 1
    big = np.repeat(np.repeat(keep2, 2, 0), 2, 1)
    hh = min(big.shape[0], C.H - r_off); ww = min(big.shape[1], C.W - c_off)
    sw = np.zeros((C.H, C.W), bool)
    sw[r_off:r_off + hh, c_off:c_off + ww] = big[:hh, :ww] > 0
    sw &= ~masked & (lc != 6)
    out[sw & (out == 0)] = 2
    print('power swath components', npw, 'px', int(sw.sum()), flush=True)
    # manual list
    man = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'unlisted_manual.json')))
    for e in man['sites']:
        x, y = C.ll2utm(e['lon'], e['lat'])
        cc, rr = int(x - C.X0), int(C.Y0 - y)
        R = int(e['r_m'])
        r0 = max(rr - R, 0); r1 = min(rr + R + 1, C.H); c0 = max(cc - R, 0); c1 = min(cc + R + 1, C.W)
        yy, xx = np.mgrid[r0:r1, c0:c1]
        if e.get('shape') == 'box':
            ang = np.radians(e.get('angle_deg', 0)); dx = xx - cc; dy = yy - rr
            u = dx * np.cos(ang) + dy * np.sin(ang); v = -dx * np.sin(ang) + dy * np.cos(ang)
            inside = (np.abs(u) <= e['half_u_m']) & (np.abs(v) <= e['half_v_m'])
        else:
            inside = (xx - cc) ** 2 + (yy - rr) ** 2 <= R * R
        inside &= (lc[r0:r1, c0:c1] != 6)
        out[r0:r1, c0:c1][inside & (out[r0:r1, c0:c1] == 0)] = 2 if e.get('mode') == 'woods' else 1
        comps.append(dict(kind='manual:' + e['id'], area_px=int(inside.sum()), lon=e['lon'], lat=e['lat'], why=e['why']))
    prof = dict(driver='GTiff', height=C.H, width=C.W, count=1, dtype='uint8', crs=C.CRS, transform=rasterio.Affine(1.0, 0, C.X0, 0, -1.0, C.Y0),
                compress='deflate', tiled=True, blockxsize=512, blockysize=512)
    with rasterio.open(os.path.join(C.BUILD, 'unlisted.tif'), 'w', **prof) as dst:
        dst.write(out, 1)
    res = os.path.join(C.MOD, 'results'); os.makedirs(res, exist_ok=True)
    json.dump(dict(note='modern surfaces found in the photograph itself (stage 09, tools/b1863/s09_unlisted.py): the ground under them is UNKNOWN and is synthesised',
                   px_area=int((out == 1).sum()), px_woods=int((out == 2).sum()), components=comps), open(os.path.join(res, 'unlisted_components.json'), 'w'), indent=0)
    print('unlisted px', int((out == 1).sum()), 'woods px', int((out == 2).sum()), 'elapsed', time.time() - t0)

if __name__ == '__main__':
    main()
