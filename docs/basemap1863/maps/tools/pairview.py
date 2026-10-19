"""Side-by-side of a derived map (pre-warped by its coarse affine into the Warren pixel frame) and the Warren scan, centred on Warren px (cx,cy).
python pairview.py <map.json> cx cy half zoom out.png        (map.json = gcps/<map>.json holding 'scan' and 'coarse' (2x3, scan px -> Warren px))
pair_pick.py then converts display clicks to (scan px, Warren px) pairs."""
import sys, os, json, numpy as np, cv2
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
from common import *
from viewtools import _font
_cache = {}
def get(path):
    if path not in _cache: _cache[path] = Image.open(path).convert('RGB')
    return _cache[path]
def make(mj, cx, cy, half, zoom, out, grid=50):
    d = json.load(open(mj)); C = np.array(d['coarse'], float).reshape(2, 3)
    scan = np.array(get(os.path.join(TMP, 'scans', d['scan'])))
    S = int(2 * half * zoom)
    # dst px (u,v) -> Warren px (cx-half+u/zoom, cy-half+v/zoom) -> scan px via inverse of C
    Cf = np.vstack([C, [0, 0, 1.0]]); Ci = np.linalg.inv(Cf)
    T = np.array([[1 / zoom, 0, cx - half], [0, 1 / zoom, cy - half], [0, 0, 1.0]]); Mfull = Ci @ T   # dst -> scan
    w = cv2.warpAffine(scan, Mfull[:2], (S, S), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP, borderValue=(255, 255, 255))
    r = np.array(get(os.path.join(TMP, 'scans', 'cw0353500.jp2')).crop((int(cx - half), int(cy - half), int(cx + half), int(cy + half))).resize((S, S), Image.LANCZOS))
    L = Image.fromarray(w); Rr = Image.fromarray(r)
    f = _font(11)
    for im in (L, Rr):
        dr = ImageDraw.Draw(im); g = (int(cx - half) // grid + 1) * grid
        while g < cx + half:
            X = (g - (cx - half)) * zoom; dr.line([(X, 0), (X, S)], fill=(255, 0, 0)); dr.text((X + 2, 2), str(g), fill=(255, 0, 0), font=f); g += grid
        g = (int(cy - half) // grid + 1) * grid
        while g < cy + half:
            Y = (g - (cy - half)) * zoom; dr.line([(0, Y), (S, Y)], fill=(0, 0, 255)); dr.text((2, Y + 2), str(g), fill=(0, 0, 255), font=f); g += grid
    M = Image.new('RGB', (2 * S + 6, S), (255, 255, 255)); M.paste(L, (0, 0)); M.paste(Rr, (S + 6, 0)); M.save(out)
    json.dump(dict(cx=cx, cy=cy, half=half, zoom=zoom, S=S, map=os.path.abspath(mj)), open(out + '.json', 'w'))
if __name__ == '__main__':
    make(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6], float(sys.argv[7]) if len(sys.argv) > 7 else 50)
