"""SIFT registration with pre-rotation, pre-scale and shading removal (for hachured/blueprint maps).
run(scan, out, rot90=k (np.rot90 k, applied to scan), pre=scale factor to bring to ~Warren scale, invert=False)
Result A maps ORIGINAL scan px -> Warren px (pre-rotation and pre-scale are composed in)."""
import sys, os, json, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
cv2.setNumThreads(3)
from common import *
def prep(a, invert=False, hp=25):
    a = a.astype(np.float32)
    if invert: a = 255 - a
    a = a - cv2.GaussianBlur(a, (0, 0), hp)
    a = np.clip(128 + a * 2.0, 0, 255).astype(np.uint8); return a
def run(scan, out, rot90=0, pre=1.0, invert=False, fr=3, ratio=0.85, nfeat=40000, thr=15):
    im = Image.open(os.path.join(TMP, 'scans', scan)).convert('L'); W0, H0 = im.size
    a = np.array(im.resize((int(W0 * pre / fr), int(H0 * pre / fr)), Image.LANCZOS)); 
    ar = np.rot90(a, rot90) if rot90 else a
    A = prep(np.ascontiguousarray(ar), invert)
    R = prep(np.array(Image.open(os.path.join(TMP, 'scans', 'cw0353500.jp2')).convert('L').reduce(fr)))
    sift = cv2.SIFT_create(nfeatures=nfeat, contrastThreshold=0.015)
    ka, da = sift.detectAndCompute(A, None); kr, dr = sift.detectAndCompute(R, None)
    m = cv2.BFMatcher().knnMatch(da, dr, k=2); good = [x for x, y in m if x.distance < ratio * y.distance]
    pa = np.float32([ka[g.queryIdx].pt for g in good]); pr = np.float32([kr[g.trainIdx].pt for g in good])
    if len(good) < 6: print(scan, 'too few', len(good)); return None
    M, inl = cv2.estimateAffine2D(pa, pr, ransacReprojThreshold=thr / fr, maxIters=30000, confidence=0.9999)
    inl = inl.ravel().astype(bool); res = np.linalg.norm((pa[inl] @ M[:, :2].T + M[:, 2]) - pr[inl], axis=1) * fr
    # compose back to original px: orig -> (resize by pre/fr) -> rot -> M -> *fr
    h, w = a.shape
    S = np.array([[pre / fr, 0, 0], [0, pre / fr, 0], [0, 0, 1.0]])
    k = rot90 % 4; Rm = np.eye(3)
    # np.rot90(a,k) with k>0 rotates counter-clockwise: dest(x', y') for source (x,y)
    if k == 1: Rm = np.array([[0, 1, 0], [-1, 0, w - 1], [0, 0, 1.0]])
    elif k == 2: Rm = np.array([[-1, 0, w - 1], [0, -1, h - 1], [0, 0, 1.0]])
    elif k == 3: Rm = np.array([[0, -1, h - 1], [1, 0, 0], [0, 0, 1.0]])
    Mm = np.vstack([M, [0, 0, 1.0]]); F = np.diag([fr, fr, 1.0]) @ Mm @ Rm @ S
    json.dump(dict(scan=scan, ref='cw0353500.jp2', A=F[:2].tolist(), n_matches=len(good), n_inliers=int(inl.sum()), rms_px=float(np.sqrt(np.mean(res ** 2))), median_px=float(np.median(res))), open(out, 'w'))
    print(scan, 'matches', len(good), 'inliers', int(inl.sum()), 'rms(Warren px)', round(float(np.sqrt(np.mean(res ** 2))), 2)); print(np.round(F[:2], 4))
    return F[:2]
if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), sys.argv[5] == '1')
