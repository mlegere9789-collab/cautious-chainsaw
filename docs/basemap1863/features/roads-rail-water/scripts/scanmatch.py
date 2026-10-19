"""Register LOC Bachelder sheet 'a' (cw0325000a, 50%) to the Early-collection scan cw0353500 (50%) by SIFT: gives px_sheet_a -> px_cw0353500.
Both are printed from the Warren topography; the match is map-to-map, not to the ground."""
import cv2, numpy as np, os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *
cv2.setNumThreads(3)
MP = ROOT + '/tmp/b1863/roads/maps/'
A = cv2.imread(MP + 'cw0353500.50.jpg', cv2.IMREAD_GRAYSCALE)     # target (peer GCPs are on cw0353500 full-res = 2x these px)
B = cv2.imread(MP + 'bach1879_a.50.jpg', cv2.IMREAD_GRAYSCALE)    # source (our sheet)
print(A.shape, B.shape)
cl = cv2.createCLAHE(2.5, (8, 8))
sift = cv2.SIFT_create(40000, contrastThreshold=0.02)
def feats(img, mask=None):
    return sift.detectAndCompute(cl.apply(img), mask)
ka, da = feats(A); kb, db = feats(B)
print(len(ka), len(kb))
fl = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=80))
m = fl.knnMatch(db, da, k=2)
good = [x for x, y in m if x.distance < 0.75 * y.distance]
print('good', len(good))
src = np.float32([kb[g.queryIdx].pt for g in good]); dst = np.float32([ka[g.trainIdx].pt for g in good])
M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=4.0)
print('similarity', M.tolist(), 'inliers', int(inl.sum()))
inl = inl.ravel().astype(bool)
np.save(ROOT + '/tmp/b1863/roads/scanmatch_pts.npy', np.hstack([src[inl], dst[inl]]))
json.dump({'M_sim': M.tolist(), 'n_inliers': int(inl.sum()), 'n_good': len(good)}, open(ROOT + '/tmp/b1863/roads/scanmatch.json', 'w'))
# residual distribution of inliers after full affine
M2, inl2 = cv2.estimateAffine2D(src[inl], dst[inl], method=cv2.RANSAC, ransacReprojThreshold=3.0)
pred = (M2 @ np.vstack([src[inl].T, np.ones(inl.sum())])).T
r = np.linalg.norm(pred - dst[inl], axis=1)
print('affine', M2.tolist(), 'inliers', int(inl2.sum()), 'median resid', float(np.median(r)), 'p90', float(np.percentile(r, 90)))
