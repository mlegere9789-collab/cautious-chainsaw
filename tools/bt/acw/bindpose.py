"""Rest pose of the Napoleon 'man' skeleton recovered FROM THE MESH DATA ALONE (no skeleton file is read or shipped).
Two-influence vertices carry the same model point in two bone frames: p_a = Q p_b + t. Kabsch over all such vertices gives Q,t per bone pair (max residual 3e-7 m across 86 files);
chaining from the pelvis (bone 0) yields every bone's frame in the pelvis frame; the left hand chain (27,29,31,32,33,37,38) is not linked by any vertex, so it is the exact mirror
of the right chain (mirror error 0 on all six shared edges). The pelvis frame is tilted ~16 degrees, so world_frame() levels it (up = feet to head), +Z forward (the face looks to +Z).
This is derived geometry of a base-game asset (the skeleton): it is used for decoder verification only and is never written into the app data."""
import collections
import numpy as np
import vwm

MIRROR = {27: 28, 29: 30, 31: 34, 32: 35, 33: 36, 37: 39, 38: 40}

def kabsch_t(A, B):
    ca, cb = A.mean(0), B.mean(0); U, S, Vt = np.linalg.svd((A - ca).T @ (B - cb)); d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T; t = cb - R @ ca
    return R, t, np.linalg.norm(A @ R.T + t - B, axis=1)

def gather(paths):
    D = collections.defaultdict(list)
    for p in paths:
        m = vwm.parse(open(p, 'rb').read())
        for me in m['meshes']:
            for uv, nr, tg, infl in me['verts']:
                if len(infl) >= 2:
                    for i in range(len(infl)):
                        for j in range(len(infl)):
                            if i != j: D[(infl[i][0], infl[j][0])].append((infl[j][1], infl[i][1]))
    return D

def solve(paths, min_vertices=3):
    D = gather(paths); edges = {}
    for (a, b), L in D.items():
        if len(L) < min_vertices: continue
        B = np.array([x[0] for x in L]); A = np.array([x[1] for x in L]); R, t, err = kabsch_t(B, A)
        if err.max() > 1e-4: raise ValueError('bone pair (%d,%d) is not rigid: %g' % (a, b, err.max()))
        edges[(a, b)] = (R, t)
    M = {0: (np.eye(3), np.zeros(3))}
    def bfs(q):
        while q:
            a = q.pop(0)
            for (x, y), (R, t) in edges.items():
                if x == a and y not in M: Ra, ta = M[a]; M[y] = (Ra @ R, Ra @ t + ta); q.append(y)
    bfs([0]); S = np.diag([1, -1, 1.])
    for l, r in MIRROR.items():
        if l not in M and r in M: M[l] = (S @ M[r][0] @ S, S @ M[r][1]); bfs([l])
    return M

def world_frame(M):
    """3x3 matrix W with p_world = W p_pelvis: Y up (feet to head, leveled), X = -pelvis y, Z = X cross Y (forward)."""
    feet = (M[11][1] + M[12][1]) / 2; up = M[19][1] - feet; up[1] = 0; up /= np.linalg.norm(up)
    x = np.array([0, -1.0, 0]); z = np.cross(x, up); z /= np.linalg.norm(z); x = np.cross(up, z)
    return np.stack([x, up, z])

def mesh_positions(mesh, M, W):
    P = []
    for uv, nr, tg, infl in mesh['verts']:
        b, pos, nl, w = infl[0]; R, t = M[b]; P.append(W @ (R @ np.array(pos) + t))
    return np.array(P)
