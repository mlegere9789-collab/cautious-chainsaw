"""bar_mosaic.py sheet labels.json first n out.png : montage of native-resolution crops (160 px square, 2.2x) centred on each anchored line symbol, for reading line state."""
import sys, json, cv2, numpy as np, os
sheet, lj, a, n, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
im = cv2.imread(os.path.join(ROOT, 'tmp', 'troopmaps', f'full_{sheet}.png'))
L = [x for x in json.load(open(lj))['labels'] if x['position_basis'] == 'line_symbol_centroid'][a:a+n]
tiles = []
for r in L:
    cx, cy = r['pos_px']; c = im[cy-80:cy+80, cx-80:cx+80].copy(); c = cv2.resize(c, None, fx=2.2, fy=2.2, interpolation=cv2.INTER_CUBIC)
    cv2.putText(c, r['label_id'][-3:] + ' ' + r['text'][:12], (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 2); cv2.putText(c, r['label_id'][-3:] + ' ' + r['text'][:12], (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
    tiles.append(c)
h, w = tiles[0].shape[:2]; cols = 5; rows = (len(tiles)+cols-1)//cols
M = np.full((rows*h, cols*w, 3), 255, np.uint8)
for i, t in enumerate(tiles): r_, c_ = divmod(i, cols); M[r_*h:(r_+1)*h, c_*w:(c_+1)*w] = t
cv2.imwrite(out, M); print(out, M.shape, len(tiles))
