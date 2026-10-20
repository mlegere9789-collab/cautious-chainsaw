"""Stage 39: final per-pixel provenance raster and the final image.

Provenance classes (uint8) written to tmp/b1863/build/prov.u8 (same grid):
  0  PHOTO_KEPT            2013 photograph, unmodified, inside the Warren-sheet coverage (NOT verified as 1863: no source says it differs)
  22 PHOTO_KEPT_OUTSIDE    2013 photograph, unmodified, outside the Warren-sheet coverage (1863 land cover UNKNOWN)
  1  REMOVED_PATCH         modern feature removed, filled by PatchMatch from its surroundings
  2  REMOVED_SYNTH         modern feature removed, area re-synthesised from real photograph blocks (wide objects, golf, sports, developed land, ponds, the National Cemetery)
  3  CANOPY_REMOVED        modern tree canopy outside 1863 tree cover (60-100 m margin), replaced by open ground texture
  4  TREES_ADDED           1863 woods cover open now, filled with real canopy blocks
  5  TOWN_GROUND           town block ground re-synthesised
  6  ROAD_ADDED   7 RAIL_ADDED   8 BRIDGE_ADDED   9 FENCE_ADDED   10 STRUCTURE_ADDED   11 ORCHARD_ADDED   12 CROP_RECOLOURED (Wheatfield)   13 TOWN_MASS_ADDED   14 STREAM_ADDED (Stevens Run through the borough)
  20 AMBIGUOUS_KEPT        canopy or open ground inside the registration margin of an 1863 tree polygon: photograph kept, evidence cannot decide
  21 SURVIVOR_KEPT         building that stood in 1863 and still stands: real roof pixels kept
"""
import sys, os, json, time, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio
from rasterio.windows import Window

NAMES = {0: 'PHOTO_KEPT', 22: 'PHOTO_KEPT_OUTSIDE', 1: 'REMOVED_PATCH', 2: 'REMOVED_SYNTH', 3: 'CANOPY_REMOVED', 4: 'TREES_ADDED', 5: 'TOWN_GROUND', 6: 'ROAD_ADDED', 7: 'RAIL_ADDED',
         8: 'BRIDGE_ADDED', 9: 'FENCE_ADDED', 10: 'STRUCTURE_ADDED', 11: 'ORCHARD_ADDED', 12: 'CROP_RECOLOURED', 13: 'TOWN_MASS_ADDED', 14: 'STREAM_ADDED', 20: 'AMBIGUOUS_KEPT', 21: 'SURVIVOR_KEPT'}

def main():
    C.lowprio()
    t0 = time.time()
    P = np.memmap(os.path.join(C.BUILD, 'prov.u8'), dtype=np.uint8, mode='w+', shape=(C.H, C.W))
    cnt = np.zeros(256, np.int64)
    rds = {n: rasterio.open(os.path.join(C.BUILD, n + '.tif')) for n in ('target', 'lc1863', 'chg_remove', 'chg_add', 'chg_ambiguous', 'survivors')}
    cls = np.memmap(os.path.join(C.BUILD, 'stage30_cls.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
    fp = np.memmap(os.path.join(C.BUILD, 'feat_prov.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W))
    BAND = 1024
    for r0 in range(0, C.H, BAND):
        n = min(BAND, C.H - r0)
        win = Window(0, r0, C.W, n)
        a = {k: d.read(1, window=win) for k, d in rds.items()}
        c = np.array(cls[r0:r0 + n]); f = np.array(fp[r0:r0 + n])
        p = np.where(a['lc1863'] > 0, 0, 22).astype(np.uint8)
        p[a['chg_ambiguous'] == 1] = 20
        p[a['target'] == 1] = 1
        p[np.isin(a['target'], (2, 5, 7, 8))] = 2
        p[(c == 1) & (a['target'] == 0)] = 3
        p[(c == 2) & (a['target'] == 0)] = 4
        p[(c == 4)] = 5
        p[a['survivors'] == 1] = 21
        p[f > 0] = f[f > 0]
        P[r0:r0 + n] = p
        cnt += np.bincount(p.ravel(), minlength=256)
    P.flush()
    st = {NAMES[k]: dict(code=int(k), px=int(cnt[k]), ha=round(float(cnt[k]) / 1e4, 1)) for k in NAMES}
    json.dump(dict(classes=st, total_px=int(cnt.sum()), elapsed_s=round(time.time() - t0, 1)), open(os.path.join(C.BUILD, 'prov_stats.json'), 'w'), indent=1)
    print(json.dumps(st, indent=0))

if __name__ == '__main__':
    main()
