"""QA montage of anchor -> fragment association (writes PNGs to the scratch dir given as argv[1])."""
import sys, os
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import elev1863_common as C, elev1863_s5_levels as S5
out = sys.argv[1]
g = cv2.imread(C.SCAN_JP2)
frags = S5.load_fragments()
assoc = S5.associate(frags, S5.anchors_all())
only = sys.argv[2] if len(sys.argv) > 2 else None
tiles = []
for a in assoc:
    if only and not a['id'].startswith(only):
        continue
    if len(sys.argv) > 3 and a.get('frag') is None:
        continue
    cx, cy = int(a['x']), int(a['y'])
    if a['kind'] == 'margin':
        side = a['side']
        tx, ty = {'top': (cx, 833), 'bottom': (cx, 9397), 'left': (417, cy), 'right': (8477, cy)}[side]
        cx, cy = tx, ty
        if side == 'top': cy += 70
        if side == 'bottom': cy -= 70
        if side == 'left': cx += 70
        if side == 'right': cx -= 70
    H = 110
    x0, y0 = cx - H, cy - H
    patch = np.zeros((2 * H, 2 * H, 3), np.uint8)
    xa, ya = max(0, x0), max(0, y0)
    sub = g[ya:y0 + 2 * H, xa:x0 + 2 * H]
    patch[ya - y0:ya - y0 + sub.shape[0], xa - x0:xa - x0 + sub.shape[1]] = sub
    for i, c in enumerate(frags):
        p = c['pts']
        if ((p[:, 0] > x0) & (p[:, 0] < x0 + 2 * H) & (p[:, 1] > y0) & (p[:, 1] < y0 + 2 * H)).any():
            col = (0, 0, 255) if i == a.get('frag') else (0, 170, 0)
            cv2.polylines(patch, [(p - [x0, y0]).astype(np.int32).reshape(-1, 1, 2)], False, col, 2 if i == a.get('frag') else 1)
    cv2.circle(patch, (int(a['x'] - x0), int(a['y'] - y0)), 4, (255, 0, 0), -1)
    patch = cv2.resize(patch, None, fx=1.8, fy=1.8)
    cv2.putText(patch, '%s %d%s%s' % (a['id'], a['level_ft'], ' AMB' if a.get('ambiguous') else '', '' if a.get('frag') is not None else ' NONE'), (3, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
    tiles.append(patch)
while len(tiles) % 4:
    tiles.append(np.zeros_like(tiles[0]))
per = 12
for i in range(0, len(tiles), per):
    t = tiles[i:i + per]
    cv2.imwrite(os.path.join(out, 'assoc2_%d.png' % (i // per)), np.vstack([np.hstack(t[j:j + 4]) for j in range(0, len(t), 4)]))
print(len(tiles))
