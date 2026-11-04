"""gtmont.py <a|loc94> id1,id2,.. out.jpg [half] [Z] : montage of crops of a July 1 scan centred on the position predicted for each ground-truth point of gt_j1.json
(sheet a = Bachelder 1876 sheet 1 through the chain of record; loc94 = LOC 99447494 through tmp/troopmaps/j1/pred_loc94.json affine or the preliminary transform).
Grid ticks every 20 px labelled as offset (px) from the prediction (centre cross). Read offsets by eye -> hand_gt_<sheet>.json."""
import sys, os, json, cv2, numpy as np
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
from common_tm import *
sheet, ids, out = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
half = int(sys.argv[4]) if len(sys.argv) > 4 else 100; Z = float(sys.argv[5]) if len(sys.argv) > 5 else 3
G = {g['id']: g for g in json.load(open(os.path.join(os.path.dirname(__file__), 'gt_j1.json')))}
if sheet == 'a':
    S = SheetTransform('a'); im = cv2.imread(os.path.join(TMP, 'full_a.png')); pred = lambda en: S.en_to_scan(np.array([en]))[0]
else:
    im = cv2.imread(os.path.join(ROOT, 'tmp/library/troopmaps/commons_LOC99447494_july1_2to330pm.jpg'))
    P = json.load(open(os.path.join(TMP, 'j1', 'pred_loc94.json')))
    Aa = np.array(P['A']); cc = np.array(P['c'])   # en -> px:  px = A @ (en-en0) + c
    en0 = np.array(P['en0']); pred = lambda en: Aa @ (np.array(en) - en0) + cc
tiles = []
for i in ids:
    dx = dy = 0
    if '@' in i: i, o = i.split('@'); dx, dy = map(float, o.split(';'))
    g = G[i]; p = pred([g['E'], g['N']]) + np.array([dx, dy]); cx, cy = int(round(p[0])), int(round(p[1]))
    y0, x0 = max(0, cy-half), max(0, cx-half)
    c = np.full((2*half, 2*half, 3), 255, np.uint8)
    sub = im[y0:cy+half, x0:cx+half]; c[(y0-(cy-half)):(y0-(cy-half))+sub.shape[0], (x0-(cx-half)):(x0-(cx-half))+sub.shape[1]] = sub
    c = cv2.resize(c, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC); n = c.shape[0]
    for o in range(-half+20, half, 20):
        v = int((o+half)*Z); col = (0, 0, 255) if o else (255, 0, 255)
        cv2.line(c, (v, 0), (v, 10), col, 1); cv2.line(c, (0, v), (10, v), col, 1)
        cv2.putText(c, str(o), (v+2, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1); cv2.putText(c, str(o), (12, v+4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
    cv2.drawMarker(c, (n//2, n//2), (255, 0, 255), cv2.MARKER_CROSS, 14, 1)
    cv2.putText(c, f"{i[:26]} pred({cx},{cy})", (12, n-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2); cv2.putText(c, f"{i[:26]} pred({cx},{cy})", (12, n-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
    tiles.append(c); print(i, 'centre_px', cx, cy)
cols = 2; rows = (len(tiles)+cols-1)//cols; n = tiles[0].shape[0]
M = np.full((rows*n, cols*n, 3), 255, np.uint8)
for k, t in enumerate(tiles): r, c_ = divmod(k, cols); M[r*n:(r+1)*n, c_*n:(c_+1)*n] = t
cv2.imwrite(out, M, [cv2.IMWRITE_JPEG_QUALITY, 85]); print(out, M.shape)
