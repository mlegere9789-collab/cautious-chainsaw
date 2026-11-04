"""gcp_montage.py sheet id1,id2,... out.png : 3x-zoomed crops of the Bachelder scan centred on the position predicted from the Warren GCP, 20 px grid labelled in px offset from the prediction."""
import sys, cv2, os
from common_tm import *
sheet, ids, out = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
half = int(sys.argv[4]) if len(sys.argv) > 4 else 100; Z = 3
px, en, g = warren_gcps(); S = SheetTransform(sheet)
im = cv2.imread(os.path.join(TMP, f'full_{sheet}.png')); tiles = []
for x, p in zip(g, S.warren_to_scan(px)):
    if x['id'] not in ids: continue
    cx, cy = int(round(p[0])), int(round(p[1]))
    c = im[cy-half:cy+half, cx-half:cx+half].copy(); c = cv2.resize(c, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
    n = c.shape[0]
    for o in range(-half+20, half, 20):
        v = (o+half)*Z; col = (0,0,255) if o else (255,0,255)
        cv2.line(c, (v,0), (v,10), col, 1); cv2.line(c, (0,v), (10,v), col, 1)
        cv2.putText(c, str(o), (v+2,22), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,0,255), 1); cv2.putText(c, str(o), (12,v+4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,0,255), 1)
    cv2.drawMarker(c, (n//2, n//2), (255,0,255), cv2.MARKER_CROSS, 14, 1)
    cv2.putText(c, f"{x['id']} {x['name'][:28]}", (12, n-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 2); cv2.putText(c, f"{x['id']} {x['name'][:28]}", (12, n-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,255), 1)
    tiles.append(c)
import numpy as np
cols = 2; rows = (len(tiles)+cols-1)//cols; n = tiles[0].shape[0]
M = np.full((rows*n, cols*n, 3), 255, np.uint8)
for i, t in enumerate(tiles): r, c_ = divmod(i, cols); M[r*n:(r+1)*n, c_*n:(c_+1)*n] = t
cv2.imwrite(out, M); print(out, M.shape, [x['id'] for x in g if x['id'] in ids])
