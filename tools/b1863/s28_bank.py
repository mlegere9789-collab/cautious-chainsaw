"""Stage 28: texture banks of REAL photograph blocks (24 x 24 px) cut from the removal-cleaned NAIP mosaic (stage 20 output).

field bank  : open ground (1863 class open, not town), no target, no modern canopy within the block, vegetated (NDVI), low edge content, no dark pixels
woods bank  : inside lidar canopy that lies inside an 1863 woods polygon (so it is canopy that stood there then and now), dense and dark
Blocks never include pixels that were filled by an algorithm: a block is rejected when any pixel within it, dilated by 6 px, was a removal target.
Saves tmp/b1863/build/bank_field.npy, bank_woods.npy (uint8 N,24,24,3) and bank_stats.json.
"""
import sys, os, json, time, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
import rasterio
from rasterio.windows import Window

B = 24
STRIDE = 12
BAND = 2048

def canopy_1m(r0, r1):
    """lidar canopy (2 m cells) as 1 m rows r0:r1; zero where the lidar grid does not reach; second return = coverage flag"""
    can = np.load(os.path.join(C.ROOT, 'tmp', 'b1863', 'landcover', 'canopy_smooth.npy'))
    return can

def main():
    C.lowprio()
    t0 = time.time()
    img = np.memmap(os.path.join(C.BUILD, 'stage20.u8'), dtype=np.uint8, mode='r', shape=(C.H, C.W, 3))
    can2 = np.load(os.path.join(C.ROOT, 'tmp', 'b1863', 'landcover', 'canopy_smooth.npy'))
    r_off, c_off = 460, 3780
    canfull = np.zeros((C.H, C.W), np.uint8)
    big = np.repeat(np.repeat(can2, 2, 0), 2, 1)
    canfull[r_off:r_off + big.shape[0], c_off:c_off + big.shape[1]] = big[:C.H - r_off, :C.W - c_off]
    lidar_ok = np.zeros((C.H, C.W), np.uint8); lidar_ok[r_off:r_off + big.shape[0], c_off:c_off + big.shape[1]] = 1
    np.save(os.path.join(C.BUILD, 'canopy1m.npy'), canfull)
    rng = np.random.default_rng(1863)
    ds_b = rasterio.open(C.BASE_TIF); ds_t = rasterio.open(os.path.join(C.BUILD, 'target.tif')); ds_l = rasterio.open(os.path.join(C.BUILD, 'lc1863.tif'))
    field, woods = [], []
    stats = dict(candidates=0, field_ok=0, woods_ok=0)
    kB = (B, B)
    for r0 in range(0, C.H - B, BAND):
        r1 = min(r0 + BAND + B, C.H)
        rows = r1 - r0
        a = np.array(img[r0:r1]).astype(np.float32)
        nir = ds_b.read(4, window=Window(0, r0, C.W, rows)).astype(np.float32)
        tg = ds_t.read(1, window=Window(0, r0, C.W, rows)) > 0
        lc = ds_l.read(1, window=Window(0, r0, C.W, rows))
        can = canfull[r0:r1]
        lum = a.mean(2)
        ndvi = (nir - a[..., 0]) / np.maximum(nir + a[..., 0], 1)
        grad = np.abs(cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3)) + np.abs(cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3))
        tgd = cv2.dilate(tg.astype(np.uint8), np.ones((13, 13), np.uint8))
        def bm(x): return cv2.boxFilter(x.astype(np.float32), -1, kB, normalize=True, anchor=(0, 0), borderType=cv2.BORDER_REFLECT)
        m_t = bm(tgd); m_c = bm(can); m_lum = bm(lum); m_gr = bm(grad); m_nd = bm(ndvi); m_lc1 = bm(lc == 1); m_lc2 = bm(lc == 2); m_lc7 = bm(lc == 7); m_ok = bm(lidar_ok[r0:r1])
        dmin = -cv2.erode(-lum, np.ones(kB, np.uint8), anchor=(0, 0))      # max, not needed
        lmin = cv2.erode(lum, np.ones(kB, np.uint8), anchor=(0, 0))
        m_sat = bm(a.max(2) - a.min(2))
        sy = np.arange(0, rows - B, STRIDE); sx = np.arange(0, C.W - B, STRIDE)
        YY, XX = np.meshgrid(sy, sx, indexing='ij')
        stats['candidates'] += YY.size
        f_ok = (m_t[YY, XX] < 0.001) & (m_c[YY, XX] < 0.001) & (m_lc1[YY, XX] > 0.99) & (m_ok[YY, XX] > 0.99) & (m_nd[YY, XX] > 0.2) & (m_gr[YY, XX] < 40) & (lmin[YY, XX] > 60) & (m_lc7[YY, XX] < 0.001) & (m_lum[YY, XX] > 85) & (m_sat[YY, XX] > 14)
        w_ok = (m_t[YY, XX] < 0.001) & (m_c[YY, XX] > 0.98) & (m_lc2[YY, XX] > 0.99) & (m_ok[YY, XX] > 0.99) & (m_lum[YY, XX] < 100) & (m_nd[YY, XX] > 0.3)
        for nm, ok, store, cap in (('field', f_ok, field, 6000), ('woods', w_ok, woods, 3000)):
            ii = np.nonzero(ok.ravel())[0]
            stats[nm + '_ok'] += int(len(ii))
            if len(ii) > cap:
                ii = rng.choice(ii, cap, replace=False)
            for i in ii:
                y = int(YY.ravel()[i]); x = int(XX.ravel()[i])
                store.append(a[y:y + B, x:x + B].astype(np.uint8).copy())
        print('band', r0, 'field', len(field), 'woods', len(woods), 'elapsed %.0f' % (time.time() - t0), flush=True)
    for nm, store in (('field', field), ('woods', woods)):
        arr = np.stack(store)
        if len(arr) > 90000:
            arr = arr[rng.choice(len(arr), 90000, replace=False)]
        np.save(os.path.join(C.BUILD, 'bank_%s.npy' % nm), arr)
        stats[nm + '_blocks'] = int(len(arr))
        f = arr.astype(np.float32)
        stats[nm + '_mean_rgb'] = [round(float(v), 1) for v in f.mean((0, 1, 2))]
    json.dump(stats, open(os.path.join(C.BUILD, 'bank_stats.json'), 'w'), indent=1)
    print(stats)

if __name__ == '__main__':
    main()
