"""Stage 35: draw the 1863 features on the stage-30 image. Windows of 1024 px with a 64 px margin, writes cores only.
Outputs (memmaps in tmp/b1863/build): stage35.u8 (image), feat_prov.u8 (provenance code of what was drawn), feat_conf.u8 (1 Documented, 2 Estimated, 3 Contested).
Order: wheat recolour, orchards, railway, roads, bridges, fences, borough masses, structures."""
import sys, os, time, json, pickle, shutil, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from multiprocessing import Pool

CORE, MARGIN = 1024, 64
IN = os.path.join(C.BUILD, 'stage30.u8'); OUT = os.path.join(C.BUILD, 'stage35.u8')
PROV = os.path.join(C.BUILD, 'feat_prov.u8'); CONF = os.path.join(C.BUILD, 'feat_conf.u8')
_g = {}

def _init():
    C.lowprio()
    import rasterio
    _g['items'] = pickle.load(open(os.path.join(C.BUILD, 'draw_items.pkl'), 'rb'))
    _g['rd'] = {n: rasterio.open(os.path.join(C.BUILD, n + '.tif')) for n in ('target', 'lc1863', 'chg_add')}
    _g['can'] = np.load(os.path.join(C.BUILD, 'canopy1m.npy'), mmap_mode='r')
    _g['src'] = np.memmap(IN, dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
    _g['cls'] = np.memmap(os.path.join(C.BUILD, 'stage30_cls.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
    _g['out'] = np.memmap(OUT, dtype=np.uint8, mode='r+', shape=(C.H, C.W, 3))
    _g['prov'] = np.memmap(PROV, dtype=np.uint8, mode='r+', shape=(C.H, C.W))
    _g['conf'] = np.memmap(CONF, dtype=np.uint8, mode='r+', shape=(C.H, C.W))

def work(job):
    import render as R, features as F
    from rasterio.windows import Window
    from shapely.geometry import box as sbox
    wi, wj = job
    r0 = wi * CORE; c0 = wj * CORE
    r1 = min(r0 + CORE, C.H); c1 = min(c0 + CORE, C.W)
    R0 = max(r0 - MARGIN, 0); R1 = min(r1 + MARGIN, C.H); C0 = max(c0 - MARGIN, 0); C1 = min(c1 + MARGIN, C.W)
    win = R.Win(R0, R1, C0, C1)
    items = _g['items']
    bb = sbox(*win.bbox).buffer(40)
    has = any(it['geom'].intersects(bb) for k in ('roads', 'rails', 'fences', 'masses', 'structures') for it in items[k]) or any(it['pt'].intersects(bb) for it in items['bridges'])
    rd = {n: d.read(1, window=Window(C0, R0, C1 - C0, R1 - R0)) for n, d in _g['rd'].items()}
    wheat = rd['lc1863'] == 4
    orch_reg = (rd['chg_add'] == 2)      # only where no modern canopy lies within 25 m of the eroded orchard polygon: a surviving or replanted orchard is never doubled
    if not (has or wheat.any() or orch_reg.any()):
        return wi, wj, 0, 0.0
    t0 = time.time()
    img = np.array(_g['src'][R0:R1, C0:C1]).astype(np.float32)
    can = np.array(_g['can'][R0:R1, C0:C1])
    prov = np.zeros((win.h, win.w), np.uint8); conf = np.zeros((win.h, win.w), np.uint8)
    # tone guard: filled pixels may not be brighter or darker than the real ground around them (removes pale halos where a bright donor or object edge leaked into a fill)
    fillm = (rd['target'] > 0) | (np.array(_g['cls'][R0:R1, C0:C1]) > 0)
    F.tone_guard(img, fillm)
    steps = [(lambda: F.recolour_wheat(win, img, wheat, can, prov, conf), F.P_WHEAT),
             (lambda: F.draw_orchards(win, img, orch_reg, items['orchards'], prov, conf), F.P_ORCHARD),
             (lambda: F.draw_rails(win, img, items, prov, conf), F.P_RAIL),
             (lambda: F.draw_roads(win, img, items, prov, conf), F.P_ROAD),
             (lambda: F.draw_bridges(win, img, items, prov, conf), F.P_BRIDGE),
             (lambda: F.draw_fences(win, img, items, prov, conf), F.P_FENCE),
             (lambda: F.draw_masses(win, img, items, prov, conf), F.P_MASS),
             (lambda: F.draw_structures(win, img, items, prov, conf), F.P_STRUCT)]
    for fn, code in steps:
        before = img.copy()
        fn()
        # every pixel that a drawing step touched (cast shadows, verge shading, feathered edges) carries that step's class, so no change goes unlabelled
        touched = np.abs(img - before).max(2) > 1.5
        sel = touched & (prov == 0)
        prov[sel] = code; conf[sel] = 2
    core = (slice(r0 - R0, r1 - R0), slice(c0 - C0, c1 - C0))
    _g['out'][r0:r1, c0:c1] = np.clip(img[core] + 0.5, 0, 255).astype(np.uint8)
    _g['prov'][r0:r1, c0:c1] = prov[core]
    _g['conf'][r0:r1, c0:c1] = conf[core]
    return wi, wj, int((prov[core] > 0).sum()), time.time() - t0

def main():
    C.lowprio()
    t0 = time.time()
    shutil.copyfile(IN, OUT)
    for p in (PROV, CONF):
        mm = np.memmap(p, dtype=np.uint8, mode='w+', shape=(C.H, C.W)); mm.flush(); del mm
    nr = (C.H + CORE - 1) // CORE; nc = (C.W + CORE - 1) // CORE
    jobs = [(i, j) for i in range(nr) for j in range(nc)]
    tot = 0
    only = None
    if len(sys.argv) > 2:
        only = (int(sys.argv[1]), int(sys.argv[2]))
        jobs = [only]
    with Pool(C.THREADS, initializer=_init) as pool:
        for wi, wj, n, dt in pool.imap_unordered(work, jobs):
            tot += n
            print('win', wi, wj, 'drawn px', n, 'sec %.1f' % dt, 'elapsed %.0f' % (time.time() - t0), flush=True)
    print('total drawn px', tot, 'elapsed', time.time() - t0)

if __name__ == '__main__':
    main()
