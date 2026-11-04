"""verify_sample.py <a|loc94> <jsonl> <labels_json> <seed> <n> <outprefix> : random sample of n claims; for each draw the stored label point (red cross) and anchor (green circle, radius aw) on a plain crop of the scan,
so the label text under the cross can be compared by eye with the claim's 'quote'.  Writes <outprefix>_1.jpg, _2.jpg (10 tiles each) and <outprefix>_list.json (claim ids, quote, tile index)."""
import sys, os, json, random, cv2, numpy as np
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
sheet, jl, lab, seed, n, outp = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
im = cv2.imread(os.path.join(ROOT, 'tmp/troopmaps/full_a.png')) if sheet == 'a' else cv2.imread(os.path.join(ROOT, 'tmp/library/troopmaps/commons_LOC99447494_july1_2to330pm.jpg'))
claims = [json.loads(l) for l in open(jl, encoding='utf8')]
random.seed(seed); S = random.sample(claims, n)
Z = 1.6 if sheet == 'a' else 2.2; HW, HH = (170, 110) if sheet == 'a' else (130, 80)
tiles = []; lst = []
for k, c in enumerate(S):
    g = c['geo']; lx, ly = g['label_px']; ax, ay = g['scan_px']
    x0, y0 = max(0, lx - HW), max(0, ly - HH); sub = im[y0:ly + HH, x0:lx + HW].copy()
    t = cv2.resize(sub, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
    cv2.drawMarker(t, (int((lx - x0) * Z), int((ly - y0) * Z)), (0, 0, 255), cv2.MARKER_CROSS, 22, 2)
    if g['basis'] == 'line_symbol_centroid': cv2.circle(t, (int((ax - x0) * Z), int((ay - y0) * Z)), 8, (0, 160, 0), 2)
    T = np.full((int(2 * HH * Z) + 22, int(2 * HW * Z), 3), 255, np.uint8); T[22:22 + min(t.shape[0], T.shape[0] - 22), :t.shape[1]] = t[:T.shape[0] - 22, :T.shape[1]]
    cv2.putText(T, f"{k + 1}: {c['claim_id']} {c['source']['quote'][:34]}", (3, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1); tiles.append(T)
    lst.append(dict(tile=k + 1, claim_id=c['claim_id'], unit_id=c['unit_id'], quote=c['source']['quote'], basis=g['basis']))
for part in (0, 1):
    tt = tiles[part * 10:(part + 1) * 10]
    if not tt: continue
    h, w = tt[0].shape[:2]; M = np.full((5 * h, 2 * w, 3), 255, np.uint8)
    for i, t in enumerate(tt): r, c_ = divmod(i, 2); M[r * h:(r + 1) * h, c_ * w:(c_ + 1) * w] = t
    cv2.imwrite(f'{outp}_{part + 1}.jpg', M, [cv2.IMWRITE_JPEG_QUALITY, 80]); print(f'{outp}_{part + 1}.jpg', M.shape)
json.dump(lst, open(outp + '_list.json', 'w'), indent=1)
