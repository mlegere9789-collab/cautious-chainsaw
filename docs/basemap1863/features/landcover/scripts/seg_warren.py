import numpy as np, cv2, sys, time
from PIL import Image
cv2.setNumThreads(2)
Image.MAX_IMAGE_PIXELS = None
S = 0.5
def prep():
    g = np.array(Image.open('warren_full_gray.png'))
    g = cv2.resize(g, None, fx=S, fy=S, interpolation=cv2.INTER_AREA)
    # local normalisation
    bg = cv2.GaussianBlur(g, (0, 0), 25).astype(np.float32)
    d = bg - g.astype(np.float32)
    ink = (d > 28).astype(np.uint8)
    return g, ink
def lines_mask(ink, L=31):
    out = np.zeros_like(ink)
    for ang in range(0, 180, 15):
        k = np.zeros((L, L), np.uint8)
        c = L // 2
        dx = np.cos(np.deg2rad(ang)); dy = np.sin(np.deg2rad(ang))
        cv2.line(k, (int(round(c - dx * c)), int(round(c - dy * c))), (int(round(c + dx * c)), int(round(c + dy * c))), 1, 1)
        out |= cv2.morphologyEx(ink, cv2.MORPH_OPEN, k)
    return out
if __name__ == '__main__':
    t = time.time()
    g, ink = prep(); print('ink', ink.mean(), time.time() - t)
    ln = lines_mask(ink); print('lines', ln.mean(), time.time() - t)
    ln_d = cv2.dilate(ln, np.ones((3, 3), np.uint8))
    blobs = (ink & (1 - ln_d)).astype(np.uint8)
    # remove tiny specks
    n, lab, st, cen = cv2.connectedComponentsWithStats(blobs, connectivity=8)
    keep = np.zeros(n, bool); keep[1:] = (st[1:, cv2.CC_STAT_AREA] >= 6) & (st[1:, cv2.CC_STAT_AREA] <= 400)
    blobs = keep[lab].astype(np.uint8)
    np.save('seg_ink.npy', ink); np.save('seg_lines.npy', ln); np.save('seg_blobs.npy', blobs)
    dens = cv2.GaussianBlur(blobs.astype(np.float32), (0, 0), 10)
    np.save('seg_dens.npy', dens)
    print('dens stats', np.percentile(dens, [50, 75, 90, 95, 99]), time.time() - t)
