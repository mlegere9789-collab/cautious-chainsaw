"""Stage 2: whole-sheet skeleton -> chains -> gap-linked chains (scan pixel coordinates).
Writes tmp/bt/elev1863/chains.pkl  (list of dict(pts, gap, nlinks))
Run: PYTHONIOENCODING=utf-8 python tools/bt/elev1863_s2_chains.py
"""
import os
import sys
import time
import pickle
import numpy as np
from skimage.morphology import skeletonize
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C
import elev1863_vec as V

t0 = time.time()
ink = np.load(os.path.join(C.CACHE, 'ink.npy'), mmap_mode='r')
thk = np.load(os.path.join(C.CACHE, 'thickd.npy'), mmap_mode='r')
H, W = ink.shape
# process in 4 horizontal bands with overlap, chains whose points all lie in the band core are kept; chains that touch a band
# seam are re-derived from the overlap (the seam band is processed again in the next band) - simplest correct approach here
# is one pass over the whole sheet.
a = np.empty((H, W), np.uint8)
for y in range(0, H, 1000):
    a[y:y + 1000] = ink[y:y + 1000] * (1 - thk[y:y + 1000])
print('mask', round(time.time() - t0), flush=True)
sk = skeletonize(a > 0).astype(np.uint8)
del a
print('skeleton px', int(sk.sum()), round(time.time() - t0), flush=True)
chains, sk = V.build_chains(sk)
print('chains', len(chains), round(time.time() - t0), flush=True)
lk = V.link_chains(chains)
out = [{'pts': p.astype(np.float32), 'gap': float(g), 'nlinks': int(n)} for p, g, n in lk]
print('linked', len(out), round(time.time() - t0), flush=True)
with open(os.path.join(C.CACHE, 'chains.pkl'), 'wb') as f:
    pickle.dump(out, f)
np.save(os.path.join(C.CACHE, 'skel.npy'), sk)
print('done', round(time.time() - t0))
