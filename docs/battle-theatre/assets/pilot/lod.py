"""Triangle-count ladder for the pilot soldier by uniform vertex clustering (a crude LOD generator, counts only; quality of such LODs is NOT claimed)."""
import sys, os, json
import numpy as np
import build_soldier, garments


def cluster(V, F, g):
    key = np.floor(V / g).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    F2 = inv[F]
    ok = (F2[:, 0] != F2[:, 1]) & (F2[:, 1] != F2[:, 2]) & (F2[:, 0] != F2[:, 2])
    F2 = F2[ok]
    # drop duplicate triangles
    s = np.sort(F2, axis=1)
    _, ui = np.unique(s, axis=0, return_index=True)
    return len(np.unique(inv)), len(ui)


if __name__ == '__main__':
    pr = build_soldier.prepare(garments.PILOT_SPEC, True, False, False)
    V, F, off = [], [], 0
    for p in pr['parts']:
        V.append(p['V']); F.append(p['F'] + off); off += len(p['V'])
    V = np.concatenate(V); F = np.concatenate(F)
    out = {'full_vertices': int(len(V)), 'full_triangles': int(len(F)), 'ladder': {}}
    for g in (0.006, 0.010, 0.016, 0.025, 0.040, 0.065):
        nv, nt = cluster(V, F, g)
        out['ladder'][f'{g*100:.1f}cm'] = {'vertices': nv, 'triangles': nt}
    print(json.dumps(out, indent=1))
    if len(sys.argv) > 1:
        json.dump(out, open(sys.argv[1], 'w'), indent=1)
