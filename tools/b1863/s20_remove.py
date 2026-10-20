"""Stage 20: remove the THIN modern features (roads, drives, roofs, utilities, small unmapped objects) by PatchMatch inpainting.

Windows of 1024 px (cores) plus a 96 px margin of context are processed in four phases (i mod 2, j mod 2), up to 4 worker processes at
below-normal priority. A window writes only its core. Phase 2 sees the finished fill of phase 1 as context, so fills continue across
window borders. Output: tmp/b1863/build/stage20.u8 (raw uint8 H x W x 3, memmap) and stage20_done.u8 (bool).
DEEP, AREA and WATER targets are left untouched here (stage 30).  Deterministic: seeds derive from the window index.
"""
import sys, os, time, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from multiprocessing import Pool

CORE, MARGIN = 1024, 96
OUT = os.path.join(C.BUILD, 'stage20.u8')
DONE = os.path.join(C.BUILD, 'stage20_done.u8')
TARGET = os.path.join(C.BUILD, 'target.tif')
_g = {}

def _init():
    C.lowprio()
    import rasterio
    _g['base'] = rasterio.open(C.BASE_TIF)
    _g['target'] = rasterio.open(TARGET)
    _g['naip'] = rasterio.open(C.BASE_TIF)
    _g['out'] = np.memmap(OUT, dtype=np.uint8, mode='r+', shape=(C.H, C.W, 3))
    _g['done'] = np.memmap(DONE, dtype=np.uint8, mode='r+', shape=(C.H, C.W))

def bad_sources(win):
    """pixels that must never serve as a source for a fill: paving and roofs that no mask caught (neutral grey, pale concrete, red tile). Without this the fill of a removed parking lot copied the pale edge of the
    next one, and left beige ghosts of the old layout (pass 6, H13 to H16)"""
    a = _g['naip'].read([1, 2, 3, 4], window=win).astype(np.float32)
    R_, G_, B_, N_ = a
    mx = a[:3].max(0); mn = a[:3].min(0); L = a[:3].mean(0); nd = (N_ - R_) / np.maximum(N_ + R_, 1)
    neutral = ((mx - mn) <= 16) & (np.abs(R_ - G_) <= 10) & (L >= 70) & (nd < 0.10) & (nd > -0.30)
    pale = (L > 175) & ((mx - mn) <= 26) & (nd < 0.12)
    sat = (mx - mn) / np.maximum(mx, 1)
    hue = np.where(mx == R_, (60.0 * (G_ - B_) / np.maximum(mx - mn, 1)) % 360, 99)
    red = ((hue <= 20) | (hue >= 340)) & (sat > 0.45) & (mx > 90)
    return cv2.dilate((neutral | pale | red).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0

def work(job):
    import pminpaint as P
    from rasterio.windows import Window
    wi, wj, seed = job
    r0 = wi * CORE; c0 = wj * CORE
    r1 = min(r0 + CORE, C.H); c1 = min(c0 + CORE, C.W)
    R0 = max(r0 - MARGIN, 0); R1 = min(r1 + MARGIN, C.H); C0 = max(c0 - MARGIN, 0); C1 = min(c1 + MARGIN, C.W)
    tg = _g['target'].read(1, window=Window(C0, R0, C1 - C0, R1 - R0))
    done = np.array(_g['done'][R0:R1, C0:C1]).astype(bool)
    thin = (tg == 1) & ~done
    core_thin = thin[r0 - R0:r1 - R0, c0 - C0:c1 - C0]
    if not core_thin.any():
        return wi, wj, 0, 0.0
    t0 = time.time()
    img = np.array(_g['out'][R0:R1, C0:C1])
    unknown = (tg > 1)                      # deep / area / water: neither target nor source here
    ctx = img.copy()
    if unknown.any():
        ctx = cv2.inpaint(ctx, (unknown & ~done).astype(np.uint8) * 255, 3, cv2.INPAINT_TELEA)
    clean = (tg == 0) | done
    srcmask = (tg == 0) & ~cv2.dilate((tg > 0).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    bs = bad_sources(Window(C0, R0, C1 - C0, R1 - R0))
    srcmask &= ~bs
    # only the not-yet-done thin pixels of this window are targets (those in the margin too: they are context for the core)
    out = P.fill(ctx, thin, srcmask, seed=seed)
    core = out[r0 - R0:r1 - R0, c0 - C0:c1 - C0]
    mem = _g['out']
    sub = mem[r0:r1, c0:c1]
    sub[core_thin] = core[core_thin]
    mem.flush()
    dn = _g['done']
    dsub = dn[r0:r1, c0:c1]
    dsub[core_thin] = 1
    return wi, wj, int(core_thin.sum()), time.time() - t0

SEAM = 10

def seam_band(r0, r1, c0, c1):
    """pixels within SEAM px of a boundary between two cores of the first pass (multiples of CORE in rows or columns)"""
    rr = (np.arange(r0, r1) % CORE)[:, None]; cc = (np.arange(c0, c1) % CORE)[None, :]
    return (rr < SEAM) | (rr >= CORE - SEAM) | (cc < SEAM) | (cc >= CORE - SEAM)

def work_seam(job):
    """second pass: the narrow bands around the window boundaries are filled again with the finished fill on both sides as context, windows shifted by half a core so that every boundary
    lies inside a window (pass 7: the step between neighbouring pixels at the 1024 px boundaries was 50 percent above the median)"""
    import pminpaint as P
    from rasterio.windows import Window
    wi, wj, seed = job
    r0 = max(wi * CORE - CORE // 2, 0); c0 = max(wj * CORE - CORE // 2, 0)
    r1 = min(wi * CORE + CORE // 2, C.H); c1 = min(wj * CORE + CORE // 2, C.W)
    if r1 <= r0 or c1 <= c0:
        return wi, wj, 0, 0.0
    R0 = max(r0 - MARGIN, 0); R1 = min(r1 + MARGIN, C.H); C0 = max(c0 - MARGIN, 0); C1 = min(c1 + MARGIN, C.W)
    tg = _g['target'].read(1, window=Window(C0, R0, C1 - C0, R1 - R0))
    band = seam_band(R0, R1, C0, C1)
    thin = (tg == 1) & band
    core_thin = thin[r0 - R0:r1 - R0, c0 - C0:c1 - C0]
    if not core_thin.any():
        return wi, wj, 0, 0.0
    t0 = time.time()
    img = np.array(_g['out'][R0:R1, C0:C1])
    unknown = (tg > 1)
    ctx = img.copy()
    if unknown.any():
        ctx = cv2.inpaint(ctx, unknown.astype(np.uint8) * 255, 3, cv2.INPAINT_TELEA)
    srcmask = (tg == 0) & ~cv2.dilate((tg > 0).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    srcmask &= ~bad_sources(Window(C0, R0, C1 - C0, R1 - R0))
    out = P.fill(ctx, thin, srcmask, seed=seed)
    core = out[r0 - R0:r1 - R0, c0 - C0:c1 - C0]
    mem = _g['out']
    sub = mem[r0:r1, c0:c1]
    sub[core_thin] = core[core_thin]
    mem.flush()
    return wi, wj, int(core_thin.sum()), time.time() - t0

def main():
    C.lowprio()
    import rasterio
    if not os.path.exists(OUT):
        t0 = time.time()
        mm = np.memmap(OUT, dtype=np.uint8, mode='w+', shape=(C.H, C.W, 3))
        with rasterio.open(C.BASE_TIF) as d:
            for r in range(0, C.H, 1024):
                from rasterio.windows import Window
                a = d.read([1, 2, 3], window=Window(0, r, C.W, min(1024, C.H - r)))
                mm[r:r + a.shape[1]] = np.moveaxis(a, 0, -1)
        mm.flush(); del mm
        dm = np.memmap(DONE, dtype=np.uint8, mode='w+', shape=(C.H, C.W)); dm.flush(); del dm
        print('init copy', time.time() - t0, flush=True)
    nr = (C.H + CORE - 1) // CORE; nc = (C.W + CORE - 1) // CORE
    only = None
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        only = set()
    t0 = time.time()
    tot = 0
    with Pool(C.THREADS, initializer=_init) as pool:
        for phase in range(4):          # four phases: windows of one phase are two windows apart, so no window reads pixels another is writing (deterministic)
            jobs = [(i, j, 1863 + i * 100 + j) for i in range(nr) for j in range(nc) if (i % 2) * 2 + (j % 2) == phase]
            for wi, wj, n, dt in pool.imap_unordered(work, jobs):
                tot += n
                print('phase', phase, 'win', wi, wj, 'px', n, 'sec %.1f' % dt, 'elapsed %.0f' % (time.time() - t0), flush=True)
        seam_tot = 0
        for phase in range(4):          # the second pass: shifted windows, again four phases (a window never touches pixels another window of the same phase writes)
            jobs = [(i, j, 9001 + i * 100 + j) for i in range(nr + 1) for j in range(nc + 1) if (i % 2) * 2 + (j % 2) == phase]
            for wi, wj, n, dt in pool.imap_unordered(work_seam, jobs):
                seam_tot += n
        print('seam pass filled px', seam_tot, flush=True)
    print('total filled px', tot, 'elapsed', time.time() - t0)
    json.dump(dict(filled_px=tot, elapsed_s=time.time() - t0, core=CORE, margin=MARGIN), open(os.path.join(C.BUILD, 'stage20_stats.json'), 'w'))

if __name__ == '__main__':
    main()
