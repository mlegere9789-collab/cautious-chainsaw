"""SIFT registration starting from a coarse affine C (scan px -> Warren px): the scan is pre-warped into the Warren frame
(so scale and rotation agree), features matched there, and the fine affine F composed:  A = F . C.
Also reports the match-residual RMS (Warren px, ~1 m)."""
import sys, os, json, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
cv2.setNumThreads(3)
from common import *
from sift_reg2 import prep
def run(scan, out, C, fr=2, ratio=0.85, thr=14, invert=False, nfeat=60000, hp=20):
    C = np.array(C, float).reshape(2, 3); Cf = np.vstack([C, [0, 0, 1.0]])
    im = np.array(Image.open(os.path.join(TMP, 'scans', scan)).convert('L'))
    Wr, Hr = 8878, 9845
    S = np.diag([1.0 / fr, 1.0 / fr, 1.0]); M = (S @ Cf)[:2]
    w = cv2.warpAffine(im, M, (Wr // fr, Hr // fr), flags=cv2.INTER_AREA, borderValue=int(np.median(im)))
    R = np.array(Image.open(os.path.join(TMP, 'scans', 'cw0353500.jp2')).convert('L').reduce(fr))
    A = prep(w, invert, hp); Rr = prep(R, False, hp)
    sift = cv2.SIFT_create(nfeatures=nfeat, contrastThreshold=0.012)
    ka, da = sift.detectAndCompute(A, None); kr, dr = sift.detectAndCompute(Rr, None)
    m = cv2.BFMatcher().knnMatch(da, dr, k=2); good = [x for x, y in m if x.distance < ratio * y.distance]
    pa = np.float32([ka[g.queryIdx].pt for g in good]); pr = np.float32([kr[g.trainIdx].pt for g in good])
    Fm, inl = cv2.estimateAffine2D(pa, pr, ransacReprojThreshold=thr / fr, maxIters=30000, confidence=0.9999)
    inl = inl.ravel().astype(bool); res = np.linalg.norm((pa[inl] @ Fm[:, :2].T + Fm[:, 2]) - pr[inl], axis=1) * fr
    F = np.diag([fr, fr, 1.0]) @ np.vstack([Fm, [0, 0, 1.0]]) @ np.diag([1.0 / fr, 1.0 / fr, 1.0]); Atot = F @ Cf
    json.dump(dict(scan=scan, ref='cw0353500.jp2', A=Atot[:2].tolist(), coarse=C.tolist(), n_matches=len(good), n_inliers=int(inl.sum()), rms_px=float(np.sqrt(np.mean(res ** 2))), median_px=float(np.median(res)),
                   pairs=dict(a=(pa[inl] * fr).round(1).tolist(), r=(pr[inl] * fr).round(1).tolist())), open(out, 'w'))
    print(scan, 'matches', len(good), 'inliers', int(inl.sum()), 'rms(Warren px)', round(float(np.sqrt(np.mean(res ** 2))), 2)); print(np.round(Atot[:2], 4))
    # also save the registered preview
    return Atot[:2]
