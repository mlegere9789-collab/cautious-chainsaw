"""Forward kinematics and linear-blend skinning in numpy (used for ground fitting and the measurements)."""
import numpy as np
from scipy.spatial.transform import Rotation as R


def fk_world(heads, parents, names, quats, root_off):
    G, P = {}, {}
    for b in names:                       # names are in file order; parents may come later -> resolve recursively
        pass
    order, seen = [], set()

    def add(b):
        if b in seen:
            return
        if parents[b]:
            add(parents[b])
        seen.add(b)
        order.append(b)
    for b in names:
        add(b)
    idx = {b: i for i, b in enumerate(names)}
    for b in order:
        q = R.from_quat(quats[idx[b]])
        p = parents[b]
        if p is None:
            G[b] = q
            P[b] = heads[b] + root_off
        else:
            G[b] = G[p] * q
            P[b] = P[p] + G[p].apply(heads[b] - heads[p])
    return G, P


def lbs(V, J, W, heads, parents, names, quats, root_off):
    G, P = fk_world(heads, parents, names, quats, root_off)
    out = np.zeros_like(V)
    for k in range(4):
        for bi in np.unique(J[:, k]):
            sel = (J[:, k] == bi) & (W[:, k] > 0)
            if not sel.any():
                continue
            b = names[bi]
            out[sel] += W[sel, k:k + 1] * (G[b].apply(V[sel] - heads[b]) + P[b])
    return out
