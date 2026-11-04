"""Crossing check: for a road at the edge of the loaded ground, mark the gazetteer crossing on the Warren scan and save a zoomed crop (to read the drawn road centre by eye).
usage: crosscheck.py name lng lat out [half_px=260] [scale=1.6]"""
import os, sys
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**40)
sys.path.insert(0, os.path.dirname(__file__))
import rc, cv2
name, lng, lat, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
half = int(sys.argv[5]) if len(sys.argv) > 5 else 260; sc = float(sys.argv[6]) if len(sys.argv) > 6 else 1.6
W = rc.WARREN(); x, y = W.ll2px(lng, lat); x, y = int(round(x)), int(round(y))
im = cv2.imread(os.path.join(rc.SCANS, 'cw0353500.jp2'), cv2.IMREAD_COLOR)
c = im[y - half:y + half, x - half:x + half].copy(); c = cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
cx, cy = int(half * sc), int(half * sc)
cv2.drawMarker(c, (cx, cy), (0, 0, 255), cv2.MARKER_CROSS, 30, 2)
# 10 m ticks along the horizontal axis through the marker (Warren scale about 1 m/px)
for d in range(-half, half + 1, 50):
    X = int(cx + d * sc); cv2.line(c, (X, cy + 24), (X, cy + 34), (255, 0, 0), 1); cv2.putText(c, str(d), (X - 10, cy + 48), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 0, 0), 1)
cv2.imwrite(out, c); print(name, 'warren px', x, y, c.shape)
