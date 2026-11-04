"""win_j1.py <a|loc94> <red|blue|both|plain> <w> <h> <scale> name:cx,cy [name:cx,cy ...] : write reading windows (same ink-layer rendering as layer.py for sheet a; 'plain' = unmodified crop) to
docs/battle-theatre/terrain/troopmaps/crops_j1/<sheet>_<name>.jpg (JPEG q60) and record the recipe in crops_j1.json (scan = origin + px/scale). Tick grid every 100 scan px."""
import sys, os, json, cv2, numpy as np
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
sheet, mode, w, h, sc = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5])
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')); OUT = os.path.join(ROOT, 'docs/battle-theatre/terrain/troopmaps/crops_j1'); os.makedirs(OUT, exist_ok=True)
rp = os.path.join(os.path.dirname(__file__), 'crops_j1.json'); rec = json.load(open(rp)) if os.path.exists(rp) else {}
im = cv2.imread(os.path.join(ROOT, 'tmp/troopmaps/full_a.png')) if sheet == 'a' else cv2.imread(os.path.join(ROOT, 'tmp/library/troopmaps/commons_LOC99447494_july1_2to330pm.jpg'))
H, W = im.shape[:2]
for spec in sys.argv[6:]:
    name, xy = spec.split(':'); cx, cy = map(int, xy.split(','))
    x0 = max(0, cx - w // 2); y0 = max(0, cy - h // 2); x1 = min(W, x0 + w); y1 = min(H, y0 + h)
    c = im[y0:y1, x0:x1].astype(int); b, g, r = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    if mode == 'plain': o = im[y0:y1, x0:x1].copy()
    else:
        red = np.clip((r - np.maximum(g, b) - 40) * 3, 0, 255); blue = np.clip((b - r - 8) * 6, 0, 255)
        o = np.full(c.shape, 255, np.uint8)
        if mode in ('red', 'both'): o[:, :, 0] = np.minimum(o[:, :, 0], 255 - red); o[:, :, 1] = np.minimum(o[:, :, 1], 255 - red)
        if mode in ('blue', 'both'): o[:, :, 2] = np.minimum(o[:, :, 2], 255 - blue); o[:, :, 1] = np.minimum(o[:, :, 1], 255 - blue)
        gray = cv2.cvtColor(c.astype(np.uint8), cv2.COLOR_BGR2GRAY); ink = (gray < 90) & (red < 40) & (blue < 40); o[ink] = np.minimum(o[ink], 200)
    if sc != 1: o = cv2.resize(o, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
    for gx in range((x0 // 100 + 1) * 100, x1, 100):
        X = int((gx - x0) * sc); cv2.line(o, (X, 0), (X, 8), (0, 0, 0), 1); cv2.putText(o, str(gx), (X + 2, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    for gy in range((y0 // 100 + 1) * 100, y1, 100):
        Y = int((gy - y0) * sc); cv2.line(o, (0, Y), (8, Y), (0, 0, 0), 1); cv2.putText(o, str(gy), (10, Y + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    fn = f'{sheet}_{name}.jpg'; cv2.imwrite(os.path.join(OUT, fn), o, [cv2.IMWRITE_JPEG_QUALITY, 60])
    rec[f'{sheet}_{name}'] = dict(sheet=sheet, mode=mode, origin=[x0, y0], size=[x1 - x0, y1 - y0], scale=sc, file='docs/battle-theatre/terrain/troopmaps/crops_j1/' + fn); print(fn, x0, y0, x1, y1)
json.dump(rec, open(rp, 'w'), indent=0)
