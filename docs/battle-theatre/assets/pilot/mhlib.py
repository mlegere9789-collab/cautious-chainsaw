"""MakeHuman 1.x CC0 base mesh loader + macro morphing (young/old male etc.) -- pilot tooling.
Assets: makehumancommunity/makehuman (assets licensed CC0, see LICENSE.ASSETS.md in that repo).
Units: MakeHuman mesh units are decimetres; everything here converts to metres on load."""
import os, json, numpy as np
MH = os.environ.get('MH_ROOT', os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'tmp', 'bt', 'assets', 'src_assets', 'makehuman', 'makehuman', 'data'))

def load_obj(path=None):
    path = path or os.path.join(MH, '3dobjs', 'base.obj')
    V, VT, groups, order = [], [], {}, []
    g = None
    for l in open(path, encoding='utf8'):
        if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('g '):
            g = l[2:].strip(); groups[g] = []; order.append(g)
        elif l.startswith('f '):
            groups[g].append([tuple(int(i) - 1 for i in p.split('/')) for p in l.split()[1:]])
    return np.array(V, float) * 0.1, np.array(VT, float), groups, order

def read_target(rel):
    p = os.path.join(MH, 'targets', rel + '.target')
    if not os.path.exists(p): return None
    idx, d = [], []
    for l in open(p, encoding='utf8'):
        if l.startswith('#') or not l.strip(): continue
        a = l.split(); idx.append(int(a[0])); d.append([float(a[1]), float(a[2]), float(a[3])])
    return np.array(idx, int), np.array(d, float).reshape(-1, 3) * 0.1

def macro_weights(gender=1.0, age=0.5, muscle=0.5, weight=0.5, height=0.5, proportions=0.5, race=(1.0, 0.0, 0.0)):
    """MakeHuman 1.1 macro-modifier weight formulas. gender 1=male; age 0.5 = 25 y, 1.0 = 90 y; race=(caucasian, african, asian)."""
    male, female = gender, 1 - gender
    if age < 0.5:
        baby = max(0.0, 1 - age * 5.333); old = 0.0
        young = max(0.0, (age - 0.1875) * 3.2) if age >= 0.1875 else 0.0
        child = max(0.0, 1 - baby - young)
    else:
        baby = child = 0.0; old = (age - 0.5) * 2; young = 1 - old
    mx = max(0, (muscle - 0.5) * 2); mn = max(0, (0.5 - muscle) * 2); ma = 1 - mx - mn
    wx = max(0, (weight - 0.5) * 2); wn = max(0, (0.5 - weight) * 2); wa = 1 - wx - wn
    hx = max(0, (height - 0.5) * 2); hn = max(0, (0.5 - height) * 2)
    pi = max(0, (proportions - 0.5) * 2); pu = max(0, (0.5 - proportions) * 2)
    G = {'male': male, 'female': female}; A = {'baby': baby, 'child': child, 'young': young, 'old': old}
    M = {'minmuscle': mn, 'averagemuscle': ma, 'maxmuscle': mx}; W = {'minweight': wn, 'averageweight': wa, 'maxweight': wx}
    H = {'minheight': hn, 'maxheight': hx}; P = {'idealproportions': pi, 'uncommonproportions': pu}
    R = dict(zip(('caucasian', 'african', 'asian'), race))
    out = []
    for g, gw in G.items():
        for a, aw in A.items():
            if gw * aw == 0: continue
            for r, rw in R.items():
                if rw: out.append((rw * gw * aw, f'macrodetails/{r}-{g}-{a}'))
            for m, mw in M.items():
                for w, ww in W.items():
                    base = gw * aw * mw * ww
                    if base == 0: continue
                    out.append((base, f'macrodetails/universal-{g}-{a}-{m}-{w}'))
                    for h, hw in H.items():
                        if hw: out.append((base * hw, f'macrodetails/height/{g}-{a}-{m}-{w}-{h}'))
                    for p, pw in P.items():
                        if pw: out.append((base * pw, f'macrodetails/proportions/{g}-{a}-{m}-{w}-{p}'))
    return [(w, t) for w, t in out if w > 1e-6]

def morph(V0, **kw):
    V = V0.copy()
    for w, t in macro_weights(**kw):
        r = read_target(t)
        if r is None: continue
        idx, d = r
        if len(idx): V[idx] += w * d
    return V

def load_skeleton():
    d = json.load(open(os.path.join(MH, 'rigs', 'default.mhskel')))
    return d

def load_weights():
    d = json.load(open(os.path.join(MH, 'rigs', 'default_weights.mhw')))
    return d['weights']

def joint_pos(V, skel, name):
    return V[skel['joints'][name]].mean(axis=0)

def bone_heads(V, skel):
    return {b: joint_pos(V, skel, v['head']) for b, v in skel['bones'].items()}

def bone_tails(V, skel):
    return {b: joint_pos(V, skel, v['tail']) for b, v in skel['bones'].items()}

def skin_arrays(nverts, weights, bone_names, maxinf=4):
    """-> (J,W) arrays (nverts,maxinf): per-vertex strongest bone influences, renormalised."""
    infl = [[] for _ in range(nverts)]
    bi = {b: i for i, b in enumerate(bone_names)}
    for b, lst in weights.items():
        if b not in bi: continue
        for v, w in lst:
            infl[v].append((w, bi[b]))
    J = np.zeros((nverts, maxinf), int); W = np.zeros((nverts, maxinf))
    for v, l in enumerate(infl):
        l.sort(reverse=True); l = l[:maxinf]
        s = sum(w for w, _ in l) or 1.0
        for k, (w, b) in enumerate(l): J[v, k] = b; W[v, k] = w / s
    return J, W
