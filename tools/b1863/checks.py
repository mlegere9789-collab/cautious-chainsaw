"""The eight verification passes over the finished reconstruction. Each pass writes a JSON with its numbers to docs/basemap1863/PROVENANCE-LAYER/checks/ and prints a short result.
Passes: 1 pixel accounting, 2 modern-surface residual (closed loop detector), 3 drawn-feature registration and ghost roads, 4 seams (windows, quilt boundaries, tile edges),
5 repeated texture, 6 colour and light consistency, 7 source, licence and label audit, 8 hotspot review images at z13, z15, z16.5, z17.5.
Usage: python checks.py 1 2 3 ...  (no argument: all)"""
import sys, os, json, re, time, pickle, glob, hashlib, subprocess, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio
from rasterio.windows import Window

OUT = os.path.join(C.PROV, 'checks')
os.makedirs(OUT, exist_ok=True)
FINAL = os.environ.get('B1863_FINAL', os.path.join(C.BUILD, 'stage35.u8'))

def fin(): return np.memmap(FINAL, dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
def prov(): return np.memmap(os.path.join(C.BUILD, 'prov.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
def save(n, d):
    d['pass'] = n
    json.dump(d, open(os.path.join(OUT, 'pass%d.json' % n), 'w'), indent=1)
    print('pass', n, json.dumps({k: v for k, v in d.items() if not isinstance(v, (list, dict))}))

def pass1():
    """pixel accounting: pixels that differ from the 2013 photograph must carry a provenance class that says they were changed; unchanged classes must be (nearly) identical to the photograph"""
    base = rasterio.open(C.BASE_TIF); F = fin(); P = prov()
    changed_cls = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13}
    keep_cls = {0, 22, 20, 21}
    tot = dict(keep_px=0, keep_changed_px=0, keep_changed_px_big=0, changed_px=0, changed_identical_px=0)
    per = {}
    for r0 in range(0, C.H, 1024):
        n = min(1024, C.H - r0)
        b = np.moveaxis(base.read([1, 2, 3], window=Window(0, r0, C.W, n)), 0, -1).astype(np.int16)
        f = np.array(F[r0:r0 + n]).astype(np.int16); p = np.array(P[r0:r0 + n])
        d = np.abs(b - f).max(2)
        kp = np.isin(p, list(keep_cls))
        tot['keep_px'] += int(kp.sum()); tot['keep_changed_px'] += int(((d > 0) & kp).sum()); tot['keep_changed_px_big'] += int(((d > 6) & kp).sum())
        cp = np.isin(p, list(changed_cls))
        tot['changed_px'] += int(cp.sum()); tot['changed_identical_px'] += int(((d == 0) & cp).sum())
        for c in np.unique(p):
            m = p == c
            e = per.setdefault(int(c), [0, 0, 0.0])
            e[0] += int(m.sum()); e[1] += int((d[m] > 6).sum()); e[2] += float(d[m].sum())
    tot['per_class'] = {str(k): dict(px=v[0], px_changed_gt6=v[1], mean_abs_change=round(v[2] / max(v[0], 1), 2)) for k, v in per.items()}
    tot['unlabelled_change_share'] = round(tot['keep_changed_px_big'] / max(tot['keep_px'], 1), 6)
    tot['reading'] = 'keep_changed_px_big = pixels labelled as kept photograph (classes 0, 22, 20, 21) that differ from the 2013 photograph by more than 6 grey levels; it must be ~0 (the grade is not applied in this build)'
    save(1, tot)

def pass2():
    """closed loop: an RGB detector of modern surfaces (roads, roofs) trained on map-derived weak labels of the ORIGINAL photograph is applied to the original and to the reconstruction;
    reported inside the removal masks, inside drawn 1863 roads/roofs, and on untouched ground"""
    from sklearn.ensemble import HistGradientBoostingClassifier
    sys.path.insert(0, os.path.join(C.MOD, 'scripts'))
    from pixfeat import raster_labels
    recs = pickle.load(open(os.path.join(TMPW, 'inventory_utm.pkl'), 'rb'))
    ds = rasterio.open(C.BASE_TIF); F = fin()
    def rgbfeat(rgb):
        r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
        sat = (mx - mn) / (mx + 1e-3)
        def lstd(a, k):
            m = cv2.blur(a, (k, k)); return np.sqrt(np.maximum(cv2.blur(a * a, (k, k)) - m * m, 0))
        ctx = cv2.blur(lum, (31, 31))
        return np.stack([r, g, b, lum, sat * 100, (r - b) / (r + b + 1e-3) * 100, (g - r) / (g + r + 1e-3) * 100, lstd(lum, 3), lstd(lum, 9), ctx, lum - ctx], -1)
    rng = np.random.default_rng(77)
    X, Y = [], []
    S = 1024
    for _ in range(60):
        c = int(rng.integers(0, C.W - S)); r = int(rng.integers(0, C.H - S))
        a = ds.read(window=Window(c, r, S, S))
        if a[:3].max() == 0: continue
        b = (C.X0 + c, C.Y0 - r - S, C.X0 + c + S, C.Y0 - r)
        lab = raster_labels(recs, b, 1.0, (S, S))
        fe = rgbfeat(np.moveaxis(a[:3], 0, 2))
        for k, cap in ((1, 2500), (2, 2500), (3, 3500)):
            idx = np.flatnonzero(lab.ravel() == k)
            if idx.size == 0: continue
            idx = rng.choice(idx, min(cap, idx.size), replace=False)
            X.append(fe.reshape(-1, fe.shape[-1])[idx]); Y.append(np.full(idx.size, 0 if k == 3 else k))
    X = np.concatenate(X); Y = np.concatenate(Y)
    model = HistGradientBoostingClassifier(max_iter=120, max_depth=8, random_state=1).fit(X, Y)
    P = prov()
    agg = {k: [0, 0.0, 0.0, 0, 0] for k in ('removed_patch', 'removed_synth', 'canopy_removed', 'town_ground', 'drawn_road', 'drawn_structure', 'kept')}
    tg = rasterio.open(os.path.join(C.BUILD, 'target.tif'))
    pts = [(int(rng.integers(0, C.W - 768)), int(rng.integers(0, C.H - 768))) for _ in range(90)]
    for (c, r) in pts:
        a0 = np.moveaxis(ds.read([1, 2, 3], window=Window(c, r, 768, 768)), 0, -1)
        a1 = np.array(F[r:r + 768, c:c + 768])
        if a0.max() == 0: continue
        p = np.array(P[r:r + 768, c:c + 768])
        m0 = 1 - model.predict_proba(rgbfeat(a0).reshape(-1, 11)).reshape(768, 768, 3)[..., 0]
        m1 = 1 - model.predict_proba(rgbfeat(a1).reshape(-1, 11)).reshape(768, 768, 3)[..., 0]
        for name, sel in (('removed_patch', p == 1), ('removed_synth', p == 2), ('canopy_removed', p == 3), ('town_ground', p == 5), ('drawn_road', p == 6), ('drawn_structure', (p == 10) | (p == 13)),
                          ('kept', np.isin(p, (0, 22)) )):
            if sel.sum() == 0: continue
            e = agg[name]; e[0] += int(sel.sum()); e[1] += float(m0[sel].sum()); e[2] += float(m1[sel].sum()); e[3] += int((m0[sel] > 0.5).sum()); e[4] += int((m1[sel] > 0.5).sum())
    res = {k: dict(px=v[0], mean_p_modern_before=round(v[1] / max(v[0], 1), 3), mean_p_modern_after=round(v[2] / max(v[0], 1), 3), share_gt0p5_before=round(v[3] / max(v[0], 1), 3), share_gt0p5_after=round(v[4] / max(v[0], 1), 3)) for k, v in agg.items()}
    save(2, dict(per_class=res, detector='RGB gradient-boosted trees trained on map-derived weak labels of the original photograph (60 blocks); applied to 90 random 768 px windows',
                 reading='removed_* classes should fall from the before value to about the kept (untouched) level; drawn_road and drawn_structure SHOULD read as modern surface (they are roads and roofs, drawn in 1863 form).'))

def pass3():
    """registration of drawn roads/rails to their catalogue lines and ghost-road residue: along each drawn road centre line the final image must be road-coloured; within the old pavement corridor but outside the drawn road ribbon it must not be"""
    items = pickle.load(open(os.path.join(C.BUILD, 'draw_items.pkl'), 'rb'))
    F = fin(); P = prov()
    rows = []
    for r in items['roads']:
        g = r['geom']
        lines = [g] if g.geom_type == 'LineString' else list(g.geoms)
        hit = tot = 0
        for ls in lines:
            for d in np.arange(0, ls.length, 5.0):
                p = ls.interpolate(d); c = int(p.x - C.X0); rr = int(C.Y0 - p.y)
                if 3 <= c < C.W - 3 and 3 <= rr < C.H - 3:
                    tot += 1; hit += int(P[rr, c] in (6, 8, 13, 10))
        rows.append(dict(id=r['id'], samples=tot, share_drawn=round(hit / max(tot, 1), 3)))
    allt = sum(x['samples'] for x in rows); allh = sum(x['samples'] * x['share_drawn'] for x in rows)
    # ghost: removed-road corridor pixels (target thin/deep, road class) outside the drawn ribbon whose colour is still grey/low-saturation and bright (pavement-like)
    mask = rasterio.open(C.MASK_TIF); ghost = dict(px=0, pavement_like_px=0)
    rng = np.random.default_rng(5)
    for _ in range(80):
        c = int(rng.integers(0, C.W - 640)); r = int(rng.integers(0, C.H - 640))
        m = mask.read(1, window=Window(c, r, 640, 640)) == C.M_ROAD
        if m.sum() < 500: continue
        f = np.array(F[r:r + 640, c:c + 640]).astype(np.float32)
        p = np.array(P[r:r + 640, c:c + 640])
        sel = m & (p != 6) & (p != 8) & (p != 10) & (p != 13)
        mx = f.max(2); mn = f.min(2)
        grey = ((mx - mn) < 22) & (f.mean(2) > 110)
        ghost['px'] += int(sel.sum()); ghost['pavement_like_px'] += int((sel & grey).sum())
    b0 = dict(px=0, pavement_like_px=0)
    base = rasterio.open(C.BASE_TIF)
    rng = np.random.default_rng(5)
    for _ in range(80):
        c = int(rng.integers(0, C.W - 640)); r = int(rng.integers(0, C.H - 640))
        m = mask.read(1, window=Window(c, r, 640, 640)) == C.M_ROAD
        if m.sum() < 500: continue
        f = np.moveaxis(base.read([1, 2, 3], window=Window(c, r, 640, 640)), 0, -1).astype(np.float32)
        mx = f.max(2); mn = f.min(2)
        grey = ((mx - mn) < 22) & (f.mean(2) > 110)
        b0['px'] += int(m.sum()); b0['pavement_like_px'] += int((m & grey).sum())
    save(3, dict(roads=rows, share_of_road_samples_drawn=round(allh / max(allt, 1), 3), ghost_after=dict(ghost, share=round(ghost['pavement_like_px'] / max(ghost['px'], 1), 4)),
                 ghost_before=dict(b0, share=round(b0['pavement_like_px'] / max(b0['px'], 1), 4)),
                 reading='share_drawn is the share of catalogue road-line samples that fall on a pixel whose provenance is a drawn 1863 road (or bridge/structure on it); ghost = grey, bright, low-saturation pixels left inside the old road corridor outside the drawn ribbons (before = in the original photograph)'))

def pass4():
    """seams: mean colour step across (a) the 1024 px window cores, (b) quilt region borders, (c) the edges of the written tiles, compared with the step across random lines in the same image"""
    F = fin(); P = prov()
    rng = np.random.default_rng(3)
    def step_rows(img, rows, c0, c1):
        a = img[rows - 1, c0:c1].astype(np.float32); b = img[rows, c0:c1].astype(np.float32)
        return float(np.abs(a - b).mean())
    rnd = []
    for _ in range(300):
        r = int(rng.integers(100, C.H - 100)); c = int(rng.integers(0, C.W - 400))
        rnd.append(step_rows(F, np.array([r]), c, c + 400))
    seam = []
    for k in range(1, C.H // 1024):
        for c in range(0, C.W - 400, 1500):
            seam.append(step_rows(F, np.array([k * 1024]), c, c + 400))
    seamc = []
    for k in range(1, C.W // 1024):
        for r in range(0, C.H - 400, 1500):
            a = F[r:r + 400, k * 1024 - 1].astype(np.float32); b = F[r:r + 400, k * 1024].astype(np.float32)
            seamc.append(float(np.abs(a - b).mean()))
    # region borders: boundary pixels between synthesised (classes 2,3,4,5) and untouched (0) ground
    bs = []
    for _ in range(400):
        r = int(rng.integers(50, C.H - 500)); c = int(rng.integers(50, C.W - 500))
        p = np.array(P[r:r + 400, c:c + 400])
        syn = np.isin(p, (2, 3, 4, 5)).astype(np.uint8)
        if syn.sum() < 2000: continue
        edge = syn - cv2.erode(syn, np.ones((3, 3), np.uint8))
        out = cv2.dilate(syn, np.ones((3, 3), np.uint8)) - syn
        f = np.array(F[r:r + 400, c:c + 400]).astype(np.float32).mean(2)
        e1 = f[edge > 0]; e2 = f[out > 0]
        if len(e1) > 100 and len(e2) > 100:
            bs.append(abs(float(e1.mean() - e2.mean())))
    save(4, dict(random_line_step_mean=round(float(np.mean(rnd)), 3), window_row_seam_step_mean=round(float(np.mean(seam)), 3), window_col_seam_step_mean=round(float(np.mean(seamc)), 3),
                 synth_border_mean_step=round(float(np.mean(bs)), 3) if bs else None, synth_border_windows=len(bs),
                 reading='mean absolute grey-level step across a line; window seams should equal the random-line step; the synthesised border step is the difference of mean brightness just inside vs just outside the filled regions'))

def pass5():
    """repeated texture: 32 px patches from synthesised areas are searched (normalised cross-correlation) in the 640 px neighbourhood; the share with a near-duplicate (NCC > 0.97) is compared with the same measurement on untouched ground"""
    F = fin(); P = prov()
    rng = np.random.default_rng(11)
    def measure(classes, n=250):
        dup = tot = 0
        tries = 0
        while tot < n and tries < 20000:
            tries += 1
            r = int(rng.integers(400, C.H - 400)); c = int(rng.integers(400, C.W - 400))
            if P[r, c] not in classes: continue
            win = np.array(P[r - 16:r + 16, c - 16:c + 16])
            if not np.isin(win, list(classes)).all(): continue
            tpl = np.array(F[r - 16:r + 16, c - 16:c + 16]).mean(2).astype(np.float32)
            if tpl.std() < 2.0: continue
            area = np.array(F[r - 320:r + 320, c - 320:c + 320]).mean(2).astype(np.float32)
            res = cv2.matchTemplate(area, tpl, cv2.TM_CCOEFF_NORMED)
            # exclude the patch itself (and its close neighbours)
            cy, cx = 320 - 16, 320 - 16
            res[max(cy - 20, 0):cy + 21, max(cx - 20, 0):cx + 21] = -1
            tot += 1; dup += int(res.max() > 0.97)
        return dict(patches=tot, near_duplicate_share=round(dup / max(tot, 1), 3))
    save(5, dict(synthesised_open=measure({3}), synthesised_removed=measure({2}), road_drawn=measure({6}), untouched=measure({0, 22}),
                 reading='share of 32 px patches that have a near-duplicate (NCC > 0.97) within 320 px; texture quilted from a bank may repeat; the untouched value is the natural level (flat grass also correlates)'))

def pass6():
    """colour and light: Lab means of synthesised and drawn classes against the real ground around them; shadow direction of the drawn buildings re-measured on the final image"""
    F = fin(); P = prov()
    rng = np.random.default_rng(13)
    rows = {}
    for _ in range(300):
        r = int(rng.integers(50, C.H - 450)); c = int(rng.integers(50, C.W - 450))
        p = np.array(P[r:r + 400, c:c + 400]); f = np.array(F[r:r + 400, c:c + 400])
        lab = cv2.cvtColor(f, cv2.COLOR_RGB2LAB).astype(np.float32)
        ctx = np.isin(p, (0, 22))
        if ctx.sum() < 5000: continue
        cm = lab[ctx].mean(0)
        for name, sel in (('removed_patch', p == 1), ('removed_synth', p == 2), ('canopy_removed', p == 3), ('trees_added', p == 4), ('town_ground', p == 5), ('road', p == 6), ('orchard', p == 11), ('wheat', p == 12), ('structure', (p == 10) | (p == 13))):
            if sel.sum() < 300: continue
            d = lab[sel].mean(0) - cm
            rows.setdefault(name, []).append([float(d[0]), float(d[1]), float(d[2]), float(np.hypot(*(d * [1, 1, 1])))])
    out = {k: dict(n=len(v), dL=round(float(np.mean([x[0] for x in v])), 1), da=round(float(np.mean([x[1] for x in v])), 1), db=round(float(np.mean([x[2] for x in v])), 1), median_dE=round(float(np.median([x[3] for x in v])), 1)) for k, v in rows.items()}
    # shadow direction of drawn structures: luminance at 4 m in 36 directions around drawn roofs
    items = pickle.load(open(os.path.join(C.BUILD, 'draw_items.pkl'), 'rb'))
    pts = []
    for s in items['structures']:
        if s.get('src') == 'curated':
            cpt = s['geom'].centroid; pts.append((int((cpt.x - C.X0)), int(C.Y0 - cpt.y)))
    lum = []
    for dist in (7,):
        row = []
        for th in range(0, 360, 10):
            t = np.deg2rad(th); v = []
            for (c, r) in pts:
                x = int(c + dist * np.cos(t)); y = int(r - dist * np.sin(t))
                if 3 <= x < C.W - 3 and 3 <= y < C.H - 3:
                    v.append(float(np.array(F[y, x]).mean()))
            row.append(float(np.mean(v)) if v else None)
        lum = row
    darkest = int(np.argmin([x if x is not None else 1e9 for x in lum])) * 10 if lum else None
    save(6, dict(lab_difference_to_context=out, drawn_roof_shadow_direction_deg_east_ccw=darkest, expected_deg=130, n_roofs=len(pts),
                 reading='dL, da, db: mean Lab difference between each class and untouched ground in the same 400 px window (smaller is closer); the shadow direction of the base scene is 130 deg east-counterclockwise (north-west)'))

def pass7():
    """source, licence and label audit"""
    res = {}
    banned = ['google', 'maxar', 'bing.com', 'mapbox', 'digitalglobe', 'earth.google', 'maps.google', 'kh.google', 'virtualearth']
    hits = []
    for root in (os.path.join(C.ROOT, 'tools', 'b1863'), C.PROV, os.path.join(C.DOCS, 'BUILD.md')):
        files = [root] if os.path.isfile(root) else [os.path.join(dp, f) for dp, dn, fn in os.walk(root) for f in fn if f.endswith(('.py', '.md', '.json', '.geojson', '.txt'))]
        for f in files:
            if f.endswith('checks.py') or 'pass7.json' in f:
                continue
            try:
                t = open(f, encoding='utf-8', errors='ignore').read().lower()
            except Exception:
                continue
            for b in banned:
                for m in re.finditer(re.escape(b), t):
                    ctx = t[max(0, m.start() - 70):m.end() + 70].replace('\n', ' ')
                    hits.append(dict(file=os.path.relpath(f, C.ROOT), term=b, context=ctx))
    res['banned_term_hits'] = hits
    # banned mentions are allowed only in sentences that say they are NOT used
    res['banned_hits_not_in_a_not_used_statement'] = [h for h in hits if not re.search(r'(not used|never|forbid|no google|do not|not fetched|not scraped|not traced|terms|prohibit|banned|excluded|without|mapbox gl|convention|scheme|tilesize|tile_size)', h['context'])]
    # claims
    claims = []
    for f in [os.path.join(C.DOCS, 'BUILD.md')] + glob.glob(os.path.join(C.PROV, '*.md')):
        if os.path.exists(f):
            t = open(f, encoding='utf-8', errors='ignore').read()
            for m in re.finditer(r'(1:1|100 ?%|100 percent|exact replica|perfect)', t, re.I):
                claims.append(dict(file=os.path.relpath(f, C.ROOT), text=t[max(0, m.start() - 60):m.end() + 60].replace('\n', ' ')))
    res['accuracy_claim_mentions'] = claims
    res['accuracy_claims_not_in_a_negation'] = [c for c in claims if not re.search(r'(not|never|no |cannot|neither)', c['text'], re.I)]
    # manifest hashes
    idx = json.load(open(os.path.join(C.BUILD, 'tiles_index.json')))
    bad = 0; tot = 0; bytes_ = 0
    for r in idx:
        p = os.path.join(C.TILES, str(r['z']), str(r['x']), '%d.webp' % r['y'])
        tot += 1
        if not os.path.exists(p) or hashlib.sha256(open(p, 'rb').read()).hexdigest() != r['sha256']:
            bad += 1
        else:
            bytes_ += os.path.getsize(p)
    res['tiles'] = tot; res['tiles_hash_mismatch'] = bad; res['tiles_MB'] = round(bytes_ / 1e6, 2)
    res['under_40MB'] = bytes_ < 40e6
    # every drawn feature has sources
    fc = json.load(open(os.path.join(C.PROV, 'added_features.geojson')))
    nos = [f['properties']['id'] for f in fc['features'] if not f['properties'].get('sources') or not f['properties'].get('method') or f['properties'].get('confidence') is None]
    res['added_features'] = len(fc['features']); res['added_features_missing_source_method_or_confidence'] = nos[:20]; res['n_missing'] = len(nos)
    res['licence_table_present'] = os.path.exists(os.path.join(C.DOCS, 'BUILD.md')) and 'Licences and attribution' in open(os.path.join(C.DOCS, 'BUILD.md'), encoding='utf-8').read()
    res['labels'] = dict(manifest=('RECONSTRUCTION' in open(os.path.join(C.TILES, 'manifest.json'), encoding='utf-8').read()) if os.path.exists(os.path.join(C.TILES, 'manifest.json')) else None,
                         provenance_geojson=('RECONSTRUCTION' in json.dumps(fc['properties'])))
    # the owner's address must appear nowhere
    leak = []
    for root in (os.path.join(C.ROOT, 'tools', 'b1863'), C.PROV, C.TILES, C.DOCS + os.sep + 'BUILD.md'):
        files = [root] if os.path.isfile(root) else [os.path.join(dp, f) for dp, dn, fn in os.walk(root) for f in fn if f.endswith(('.py', '.md', '.json', '.geojson', '.txt'))]
        for f in files:
            try:
                if 'gmail' in open(f, encoding='utf-8', errors='ignore').read().lower(): leak.append(os.path.relpath(f, C.ROOT))
            except Exception: pass
    res['owner_address_leaks'] = leak
    save(7, res)

TMPW = C.TMPW

def pass8():
    """hotspot review images: five hotspots at z13, z15, z16.5 and z17.5 composed from the WRITTEN tiles (so the reviewed pixels are the shipped pixels)"""
    from PIL import Image
    from s40_tiles import tile_xy
    out = os.path.join(OUT, 'review'); os.makedirs(out, exist_ok=True)
    made = []
    def view(lon, lat, zoom, w=900, h=600, prov_overlay=False):
        zt = int(np.floor(min(zoom, 17)))
        # choose the highest written level <= zt that exists around the point
        for z in range(zt, 10, -1):
            xx, yy = tile_xy(lon, lat, z)
            if os.path.exists(os.path.join(C.TILES, str(z), str(int(xx)), '%d.webp' % int(yy))) and (not prov_overlay or os.path.exists(os.path.join(C.PROV, 'tiles', str(z), str(int(xx)), '%d.png' % int(yy)))):
                zt = z; break
        scale = 2 ** (zoom - zt)                    # display scale of tile pixels
        wx, wy = tile_xy(lon, lat, zt)
        cx, cy = wx * 512, wy * 512
        hw, hh = w / scale / 2, h / scale / 2
        x0, x1 = int(np.floor((cx - hw) / 512)), int(np.floor((cx + hw) / 512)); y0, y1 = int(np.floor((cy - hh) / 512)), int(np.floor((cy + hh) / 512))
        canvas = np.zeros(((y1 - y0 + 1) * 512, (x1 - x0 + 1) * 512, 3), np.uint8)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                p = os.path.join(C.TILES, str(zt), str(x), '%d.webp' % y)
                if os.path.exists(p):
                    tile = np.array(Image.open(p).convert('RGB'))
                    if prov_overlay:
                        pp = os.path.join(C.PROV, 'tiles', str(zt), str(x), '%d.png' % y)
                        if os.path.exists(pp):
                            pi = Image.open(pp); idxs = np.array(pi); pal = np.array(pi.getpalette()[:768], np.uint8).reshape(-1, 3)
                            colr = pal[idxs]
                            keep = np.isin(idxs, (0, 22))
                            tile = np.where(keep[..., None], tile, (tile * 0.55 + colr * 0.45).astype(np.uint8))
                    canvas[(y - y0) * 512:(y - y0 + 1) * 512, (x - x0) * 512:(x - x0 + 1) * 512] = tile
        ox = cx - x0 * 512 - hw; oy = cy - y0 * 512 - hh
        crop = canvas[int(oy):int(oy + 2 * hh) + 1, int(ox):int(ox + 2 * hw) + 1]
        return Image.fromarray(crop).resize((w, h), Image.LANCZOS if scale < 1 else Image.BICUBIC), zt
    for name, (lo, la) in C.HOTSPOTS.items():
        for zoom in (13, 15, 16.5, 17.5):
            im, zt = view(lo, la, zoom)
            fn = os.path.join(out, '%s_z%s.jpg' % (name, str(zoom).replace('.', 'p')))
            im.save(fn, quality=86)
            made.append(dict(file=os.path.relpath(fn, C.ROOT), zoom=zoom, tile_level_used=zt))
        im, zt = view(lo, la, 16.5, prov_overlay=True)
        fn = os.path.join(out, '%s_z16p5_provenance.jpg' % name)
        im.save(fn, quality=84)
        made.append(dict(file=os.path.relpath(fn, C.ROOT), zoom=16.5, tile_level_used=zt, overlay='provenance'))
    save(8, dict(images=made, reading='crops composed from the written tiles; z17.5 and z16.5 are enlargements of the native z16 level (1 m photograph) or of the z17 hotspot tiles'))

if __name__ == '__main__':
    which = [int(a) for a in sys.argv[1:]] or list(range(1, 9))
    for n in which:
        t0 = time.time()
        globals()['pass%d' % n]()
        print('  (%.0f s)' % (time.time() - t0))
