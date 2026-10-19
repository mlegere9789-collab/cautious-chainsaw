import numpy as np, cv2
X0, Y1 = 303000.0, 4416200.0
def rasterize(polys, R=2.0, W=11500, H=12000, dx=0.0, dy=0.0):
    nx, ny = int(W / R), int(H / R)
    m = np.zeros((ny, nx), np.uint8)
    for g in polys:
        for p in ([g] if g.geom_type == 'Polygon' else [q for q in g.geoms if q.geom_type == 'Polygon']):
            ext = np.array(p.exterior.coords); pts = np.round(np.c_[(ext[:, 0] + dx - X0) / R, (Y1 - ext[:, 1] - dy) / R]).astype(np.int32)
            cv2.fillPoly(m, [pts], 1)
            for h in p.interiors:
                a = np.array(h.coords); pts = np.round(np.c_[(a[:, 0] + dx - X0) / R, (Y1 - a[:, 1] - dy) / R]).astype(np.int32); cv2.fillPoly(m, [pts], 0)
    return m
