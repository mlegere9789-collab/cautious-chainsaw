"""Stage 30: synthesise DEEP / AREA / WATER removal targets, modern canopy outside 1863 tree cover, 1863 tree cover that is open now, and the town ground.
Reads stage20.u8 (+ target, lc1863, chg_remove, chg_add, survivors, canopy1m), writes stage30.u8 and stage30_cls.u8 (what was synthesised: 1 open, 2 woods, 3 orchard ground, 4 town ground).
Windows 1536 px (core) + 256 px margin, four phases (i mod 2, j mod 2) so that concurrent windows never touch each other's pixels, 4 worker processes at below-normal priority.
"""
import sys, os, time, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from multiprocessing import Pool

CORE, MARGIN = 1536, 256
OUT = os.path.join(C.BUILD, 'stage30.u8'); CLS = os.path.join(C.BUILD, 'stage30_cls.u8'); DONE = os.path.join(C.BUILD, 'stage30_done.u8')
_g = {}

def _init():
    C.lowprio()
    import rasterio, quilt as Q
    _g['rd'] = {n: rasterio.open(os.path.join(C.BUILD, n + '.tif')) for n in ('target', 'lc1863', 'chg_remove', 'chg_add', 'survivors')}
    _g['base'] = rasterio.open(C.BASE_TIF)
    _g['can'] = np.load(os.path.join(C.BUILD, 'canopy1m.npy'), mmap_mode='r')
    _g['banks'] = {k: Q.Bank(np.load(os.path.join(C.BUILD, 'bank_%s.npy' % k))) for k in ('field', 'woods', 'yard')}
    _g['banks']['town'] = Q.Bank(np.concatenate([np.load(os.path.join(C.BUILD, 'bank_field.npy')), np.load(os.path.join(C.BUILD, 'bank_yard.npy'))]))
    _g['out'] = np.memmap(OUT, dtype=np.uint8, mode='r+', shape=(C.H, C.W, 3))
    _g['cls'] = np.memmap(CLS, dtype=np.uint8, mode='r+', shape=(C.H, C.W))
    _g['done'] = np.memmap(DONE, dtype=np.uint8, mode='r+', shape=(C.H, C.W))

def work(job):
    import synth as S
    from rasterio.windows import Window
    wi, wj, seed = job
    r0 = wi * CORE; c0 = wj * CORE
    r1 = min(r0 + CORE, C.H); c1 = min(c0 + CORE, C.W)
    R0 = max(r0 - MARGIN, 0); R1 = min(r1 + MARGIN, C.H); C0 = max(c0 - MARGIN, 0); C1 = min(c1 + MARGIN, C.W)
    win = Window(C0, R0, C1 - C0, R1 - R0)
    a = {n: d.read(1, window=win) for n, d in _g['rd'].items()}
    can = np.array(_g['can'][R0:R1, C0:C1])
    # only the core's work: nothing to do when the core holds no change
    core = (slice(r0 - R0, r1 - R0), slice(c0 - C0, c1 - C0))
    need = (np.isin(a['target'][core], (2, 5, 7, 8)) | (a['chg_remove'][core] == 1) | (a['chg_add'][core] > 0) | (a['lc1863'][core] == 7))
    if not need.any():
        return wi, wj, 0, 0.0
    t0 = time.time()
    img = np.array(_g['out'][R0:R1, C0:C1])
    done = np.array(_g['done'][R0:R1, C0:C1]).astype(bool)
    # pixels already synthesised by a neighbouring window (phase 1) are context now: drop their change flags
    for k in ('chg_remove', 'chg_add'):
        a[k] = np.where(done, 0, a[k])
    tg = np.where(done, 0, a['target'])
    lc = np.where(done & (a['lc1863'] == 7), 0, a['lc1863'])      # the town ground of a finished neighbour is known
    nb = _g['base'].read([1, 2, 3, 4], window=win).astype(np.float32)
    ndvi = (nb[3] - nb[0]) / np.maximum(nb[3] + nb[0], 1); chroma = nb[:3].max(0) - nb[:3].min(0)
    veg = (ndvi > 0.2) & (chroma > 20)
    res, cls = S.synthesize(img, tg, lc, a['chg_remove'], a['chg_add'], can, _g['banks'], surv=a['survivors'], seed=seed, veg=veg, org=(R0, C0))
    wr = (cls > 0) & ~done
    cs = _g['out']; cc = _g['cls']; dn = _g['done']
    m = wr[core]
    sub = cs[r0:r1, c0:c1]; sub[m] = res[core][m]
    sc = cc[r0:r1, c0:c1]; sc[m] = cls[core][m]
    dsub = dn[r0:r1, c0:c1]; dsub[m] = 1
    return wi, wj, int(m.sum()), time.time() - t0

def main():
    C.lowprio()
    import shutil
    t0 = time.time()
    if not os.path.exists(OUT):
        shutil.copyfile(os.path.join(C.BUILD, 'stage20.u8'), OUT)
        for p in (CLS, DONE):
            mm = np.memmap(p, dtype=np.uint8, mode='w+', shape=(C.H, C.W)); mm.flush(); del mm
        print('init copy', time.time() - t0, flush=True)
    nr = (C.H + CORE - 1) // CORE; nc = (C.W + CORE - 1) // CORE
    tot = 0
    with Pool(C.THREADS, initializer=_init) as pool:
        for phase in range(4):          # four phases: windows of one phase are two windows apart, so no window reads pixels another is writing (deterministic)
            jobs = [(i, j, 1863 + i * 100 + j) for i in range(nr) for j in range(nc) if (i % 2) * 2 + (j % 2) == phase]
            for wi, wj, n, dt in pool.imap_unordered(work, jobs):
                tot += n
                print('phase', phase, 'win', wi, wj, 'px', n, 'sec %.1f' % dt, 'elapsed %.0f' % (time.time() - t0), flush=True)
    print('total synthesised px', tot, 'elapsed', time.time() - t0)
    json.dump(dict(synth_px=tot, elapsed_s=time.time() - t0, core=CORE, margin=MARGIN), open(os.path.join(C.BUILD, 'stage30_stats.json'), 'w'))

if __name__ == '__main__':
    main()
