"""Register a derived map scan to the Warren scan with SIFT + RANSAC (affine, then local refinement report).
python sift_reg.py <scan.jp2> <out.json> [scale_guess_ratio] [--ref cw0353500.jp2]
Output: affine A (2x3) mapping DERIVED px -> WARREN px, inlier count, inlier residual RMS in Warren px (x ~1.0 m/px), and the inlier pairs."""
import sys, os, json, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
cv2.setNumThreads(3)
from common import *
def load(path, f):
    im = Image.open(path).convert('L'); im = im.resize((im.size[0] // f, im.size[1] // f), Image.LANCZOS) if f > 1 else im
    a = np.array(im); a = cv2.createCLAHE(2.0, (8, 8)).apply(a); return a
def run(scan, out, fs=4, fr=4, ref='cw0353500.jp2', ratio=0.8, nfeat=30000):
    A = load(os.path.join(TMP, 'scans', scan), fs); R = load(os.path.join(TMP, 'scans', ref), fr)
    sift = cv2.SIFT_create(nfeatures=nfeat, contrastThreshold=0.02)
    ka, da = sift.detectAndCompute(A, None); kr, dr = sift.detectAndCompute(R, None)
    bf = cv2.BFMatcher(); m = bf.knnMatch(da, dr, k=2); good = [a for a, b in m if a.distance < ratio * b.distance]
    pa = np.float32([ka[g.queryIdx].pt for g in good]) * fs; pr = np.float32([kr[g.trainIdx].pt for g in good]) * fr
    M, inl = cv2.estimateAffine2D(pa, pr, ransacReprojThreshold=12 * 1.0, maxIters=20000, confidence=0.999)
    inl = inl.ravel().astype(bool)
    res = np.linalg.norm((pa[inl] @ M[:, :2].T + M[:, 2]) - pr[inl], axis=1)
    json.dump(dict(scan=scan, ref=ref, A=M.tolist(), n_matches=len(good), n_inliers=int(inl.sum()), rms_px=float(np.sqrt(np.mean(res ** 2))), median_px=float(np.median(res)),
                   pairs=dict(a=pa[inl].round(1).tolist(), r=pr[inl].round(1).tolist())), open(out, 'w'))
    print(scan, 'matches', len(good), 'inliers', int(inl.sum()), 'rms', round(float(np.sqrt(np.mean(res ** 2))), 2), 'median', round(float(np.median(res)), 2)); print(np.round(M, 4))
if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4, int(sys.argv[4]) if len(sys.argv) > 4 else 4)
