"""Visual check of a registration: warp scan into the Warren pixel frame (affine A in reg json or coarse in gcps) and make a red/cyan blend with Warren.
python regcheck.py <reg.json|gcps.json> out.png [crop x0,y0,x1,y1 in Warren px] [fr=3]"""
import sys, os, json, numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
from common import *
j = json.load(open(sys.argv[1])); A = np.array(j.get('A') or j['coarse'], float).reshape(2, 3)
fr = int(sys.argv[4]) if len(sys.argv) > 4 else 3
box = [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 and sys.argv[3] != '-' else [0, 0, 8878, 9845]
x0, y0, x1, y1 = box
sc = np.array(Image.open(os.path.join(TMP, 'scans', j['scan'])).convert('L'))
M = np.array([[1 / fr, 0, -x0 / fr], [0, 1 / fr, -y0 / fr], [0, 0, 1.0]]) @ np.vstack([A, [0, 0, 1.0]])
w = cv2.warpAffine(sc, M[:2], ((x1 - x0) // fr, (y1 - y0) // fr), flags=cv2.INTER_AREA, borderValue=255)
r = np.array(Image.open(os.path.join(TMP, 'scans', 'cw0353500.jp2')).convert('L').crop((x0, y0, x1, y1)).reduce(fr))
w = cv2.normalize(cv2.GaussianBlur(w, (0, 0), 0.6), None, 0, 255, cv2.NORM_MINMAX); 
out = np.stack([r, w, w], 2); Image.fromarray(out).save(sys.argv[2])
