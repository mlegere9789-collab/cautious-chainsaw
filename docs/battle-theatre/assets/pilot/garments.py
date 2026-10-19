"""Procedural 1863 kit for the pilot soldier: body (skin), eyes, hair, shell/loft garments fitted to the morphed body,
accoutrements and an Enfield rifle-musket.  Dimensions come from the 1861 Ordnance Manual (cartridge box, cap pouch, belts,
bayonet scabbard), the 1861 Dress Regulations (sack coat, trousers, forage cap) and published specifications (Enfield);
anything else is flagged 'Modelled' in KIT (PLAN.md Part 1.6)."""
import numpy as np
from dataclasses import dataclass, field
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation as R

IN = 0.0254


# ----------------------------------------------------------------------------- spec (the dress-variation system)
@dataclass
class Spec:
    """Everything that varies between two men of the same regiment.  Sampled from a seed or pinned by hand."""
    skin: str = 'ruddy'
    hair_col: tuple = (70, 48, 30)
    beard: str = 'mustache'            # none | mustache | chinstrap | full
    fade: float = 0.25                 # 0 new issue .. 1 sun/wash-bleached
    dirt: float = 0.35                 # 0 clean .. 1 caked
    patches: tuple = ('knee_L',)       # mismatched-cloth patches: knee_L knee_R seat elbow_L elbow_R
    hat: str = 'forage'                # forage (M1858 'bummer') | kepi | hardee | slouch
    hat_droop: float = 0.5
    hat_dent: float = 0.3
    hat_fade: float = 0.3
    gear: tuple = ('belt', 'cartridge_box', 'cap_pouch', 'bayonet', 'canteen', 'haversack', 'blanket_roll')
    canteen_cover: tuple = (112, 88, 62)
    rifle: str = 'enfield'
    stature_m: float = 1.74
    weight: float = 0.5
    muscle: float = 0.5
    age: float = 0.52
    coat_len: float = 0.5             # 0 short .. 1 long (hem relation)
    missing_buttons: int = 0
    seed: int = 0


def sample_spec(seed, base=None):
    rng = np.random.default_rng(seed)
    s = Spec(seed=seed) if base is None else Spec(**{**base.__dict__, 'seed': seed})
    s.skin = rng.choice(['fair', 'ruddy', 'ruddy', 'tan'])
    s.hair_col = tuple(int(x) for x in rng.choice([(70, 48, 30), (40, 30, 24), (120, 86, 48), (150, 120, 70), (30, 26, 24)], axis=0))
    s.beard = rng.choice(['none', 'mustache', 'mustache', 'chinstrap', 'full'])
    s.fade = float(rng.uniform(0.05, 0.7)); s.dirt = float(rng.uniform(0.15, 0.7))
    pool = ['knee_L', 'knee_R', 'seat', 'elbow_L', 'elbow_R']
    s.patches = tuple(rng.choice(pool, size=rng.integers(0, 3), replace=False))
    s.hat = rng.choice(['forage', 'forage', 'kepi', 'slouch'])
    s.hat_droop = float(rng.uniform(0.2, 0.9)); s.hat_dent = float(rng.uniform(0, 0.8)); s.hat_fade = float(rng.uniform(0.1, 0.7))
    s.stature_m = float(np.clip(rng.normal(1.74, 0.065), 1.57, 1.93))
    s.weight = float(np.clip(rng.normal(0.5, 0.1), 0.25, 0.8)); s.muscle = float(np.clip(rng.normal(0.5, 0.1), 0.3, 0.75))
    s.age = float(np.clip(rng.normal(0.52, 0.025), 0.5, 0.62))
    s.coat_len = float(rng.uniform(0.2, 0.9)); s.missing_buttons = int(rng.integers(0, 2))
    s.canteen_cover = tuple(int(x) for x in rng.choice([(112, 88, 62), (96, 96, 98), (70, 80, 96)], axis=0))
    gear = ['belt', 'cartridge_box', 'cap_pouch', 'bayonet', 'canteen', 'haversack']
    if rng.random() < 0.8: gear.append('blanket_roll')
    s.gear = tuple(gear)
    s.rifle = rng.choice(['enfield', 'enfield', 'springfield'])
    return s


# The pinned pilot: a 20th Maine private, July 1863.  Documented items are listed in PLAN.md Part 4 (Enfield from Gerrish 1882 and the regiment's own account;
# quick-time pace from the Tactics; stature from Gould 1869 Table IX).  Hat, coat shade, pack carriage and face are Modelled/Unknown and labelled so.
PILOT_SPEC = Spec(skin='ruddy', hair_col=(70, 48, 30), beard='mustache', fade=0.30, dirt=0.40, patches=(), hat='forage', hat_droop=0.5, hat_dent=0.3, hat_fade=0.35,
                  rifle='enfield', stature_m=1.740, weight=0.5, muscle=0.5, age=0.52, coat_len=0.5, missing_buttons=0, seed=0)


@dataclass
class Context:
    V: np.ndarray
    quads: np.ndarray
    body_idx: np.ndarray
    heads: dict
    tails: dict
    parents: dict
    bone_names: list
    J: np.ndarray
    W: np.ndarray
    groups: dict
    rng: np.random.Generator
    spec: Spec
    cache: dict = field(default_factory=dict)

    def bi(self, name):
        return self.bone_names.index(name)


# ----------------------------------------------------------------------------- generic helpers
def tri_from_quads(q):
    return np.concatenate([q[:, [0, 1, 2]], q[:, [0, 2, 3]]], 0)


def vnormals(V, F):
    N = np.zeros_like(V)
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def srgb(c):
    c = np.array(c, float) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def part(name, material, V, F, J, W, C=None, N=None):
    if N is None:
        N = vnormals(V, F)
    if C is None:
        C = np.ones((len(V), 3))
    return dict(name=name, material=material, V=np.asarray(V, float), F=np.asarray(F, int), N=N, J=J, W=W, C=C)


def rigid_skin(n, bone_index, bone2=None, w2=None):
    J = np.zeros((n, 4), int)
    W = np.zeros((n, 4))
    J[:, 0] = bone_index
    W[:, 0] = 1.0
    if bone2 is not None:
        J[:, 1] = bone2
        w2 = np.broadcast_to(np.asarray(w2, float), (n,))
        W[:, 1] = w2
        W[:, 0] = 1 - w2
    return J, W


def skin_from_body(ctx, P):
    """take skin weights from the nearest body-surface vertex (like MakeHuman proxy fitting)"""
    if 'tree' not in ctx.cache:
        ctx.cache['tree'] = cKDTree(ctx.V[ctx.body_idx])
    _, i = ctx.cache['tree'].query(P)
    return ctx.J[ctx.body_idx][i].copy(), ctx.W[ctx.body_idx][i].copy()


def box(center, size, rot=None):
    sx, sy, sz = [s / 2 for s in size]
    v = np.array([[x, y, z] for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)])
    f = np.array([[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]])
    if rot is not None:
        v = rot.apply(v)
    return v + np.asarray(center), f


def rbox(center, size, rot=None, r=0.004, n=3):
    """rounded-ish box via subdivided cube pushed to a superellipsoid (soft edges)"""
    sx, sy, sz = [s / 2 for s in size]
    m = 6
    lin = np.linspace(-1, 1, m)
    V, F = [], []
    faces = [(0, 1, 2, 1), (0, 1, 2, -1), (1, 0, 2, 1), (1, 0, 2, -1), (2, 0, 1, 1), (2, 0, 1, -1)]
    for ax, a1, a2, sg in faces:
        base = len(V)
        for u in lin:
            for w in lin:
                p = np.zeros(3)
                p[ax] = sg; p[a1] = u; p[a2] = w
                V.append(p)
        for i in range(m - 1):
            for j in range(m - 1):
                a, b, c, d = base + i * m + j, base + i * m + j + 1, base + (i + 1) * m + j, base + (i + 1) * m + j + 1
                F += ([[a, b, c], [b, d, c]] if sg > 0 else [[a, c, b], [b, c, d]])
    V = np.array(V)
    # soften: p -> sign(p)*|p|^(2/n)-ish normalisation toward rounded box
    p = np.clip(V, -1, 1)
    k = 1.0 - r / max(min(sx, sy, sz), 1e-6)
    inner = np.clip(p / 1.0, -1, 1) * k
    # distance-to-surface rounding: scale corners inward along the diagonal
    nrm = np.linalg.norm(p, axis=1, keepdims=True)
    corner = (np.abs(p) > 0.999).sum(1, keepdims=True)
    V = p * np.where(corner >= 3, 0.93, np.where(corner == 2, 0.97, 1.0))
    V = V * np.array([sx, sy, sz])
    if rot is not None:
        V = rot.apply(V)
    return V + np.asarray(center), np.array(F)


def tube(path, radii, nseg=14, cap=True, up=(0, 1, 0)):
    path = np.asarray(path, float)
    n = len(path)
    radii = np.asarray(radii, float)
    if radii.ndim == 0:
        radii = np.full(n, float(radii))
    if radii.ndim == 1:
        radii = np.stack([radii, radii], 1)
    T = np.gradient(path, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1, keepdims=True), 1e-12)
    ref = np.array(up, float)
    Vs = []
    prev_n = None
    for i in range(n):
        t = T[i]
        a = ref if abs(np.dot(t, ref)) < 0.95 else np.array([1, 0, 0.0])
        nn = np.cross(a, t)
        nn /= np.linalg.norm(nn)
        bb = np.cross(t, nn)
        ang = np.linspace(0, 2 * np.pi, nseg, endpoint=False)
        Vs.append(path[i] + radii[i, 0] * np.outer(np.cos(ang), nn) + radii[i, 1] * np.outer(np.sin(ang), bb))
    V = np.concatenate(Vs)
    Fs = []
    for i in range(n - 1):
        for k in range(nseg):
            a, b = i * nseg + k, i * nseg + (k + 1) % nseg
            c, d = (i + 1) * nseg + k, (i + 1) * nseg + (k + 1) % nseg
            Fs += [[a, b, c], [b, d, c]]
    F = np.array(Fs)
    if cap:
        c0 = len(V)
        V = np.concatenate([V, path[:1], path[-1:]])
        extra = []
        for k in range(nseg):
            extra.append([c0, (k + 1) % nseg, k])
            extra.append([c0 + 1, (n - 1) * nseg + k, (n - 1) * nseg + (k + 1) % nseg])
        F = np.concatenate([F, np.array(extra)])
    return V, F


def lathe(profile, nseg=24):
    prof = np.asarray(profile, float)
    ang = np.linspace(0, 2 * np.pi, nseg, endpoint=False)
    V = np.concatenate([np.stack([p[0] * np.cos(ang), np.full(nseg, p[1]), p[0] * np.sin(ang)], 1) for p in prof])
    F = []
    for i in range(len(prof) - 1):
        for k in range(nseg):
            a, b = i * nseg + k, i * nseg + (k + 1) % nseg
            c, d = (i + 1) * nseg + k, (i + 1) * nseg + (k + 1) % nseg
            F += [[a, c, b], [b, c, d]]
    return V, np.array(F)


def merge(items):
    Vs, Fs, off = [], [], 0
    for V, F in items:
        Vs.append(V)
        Fs.append(F + off)
        off += len(V)
    return np.concatenate(Vs), np.concatenate(Fs)



def smooth_mesh(P, F, mask, iters=12, lam=0.6):
    """uniform Laplacian smoothing restricted to `mask` vertices (merges the separate toes of the body mesh into one rounded toe box)"""
    import scipy.sparse as sp_
    n = len(P)
    i = np.concatenate([F[:, 0], F[:, 1], F[:, 2], F[:, 1], F[:, 2], F[:, 0]])
    j = np.concatenate([F[:, 1], F[:, 2], F[:, 0], F[:, 0], F[:, 1], F[:, 2]])
    A = sp_.coo_matrix((np.ones(len(i)), (i, j)), shape=(n, n)).tocsr()
    A.data[:] = 1.0
    deg = np.asarray(A.sum(1)).ravel()
    P = P.copy()
    for _ in range(iters):
        avg = (A @ P) / np.maximum(deg[:, None], 1)
        P[mask] = P[mask] * (1 - lam) + avg[mask] * lam
    return P


def boundary_edges(F):
    from collections import Counter
    c = Counter()
    for f in F:
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            c[(min(a, b), max(a, b))] += 1
    return [e for e, k in c.items() if k == 1]


def extrude_down(V, F, dy, flare=0.0, center=None):
    """copy faces shifted by dy (sole) and stitch the boundary -> thick slab"""
    V2 = V + np.array([0, dy, 0])
    if flare and center is not None:
        d = V2 - center
        d[:, 1] = 0
        V2 = V2 + d * flare
    F2 = F[:, ::-1] + len(V)
    be = boundary_edges(F)
    side = []
    for a, b in be:
        side += [[a, b, b + len(V)], [a, b + len(V), a + len(V)]]
    return np.concatenate([V, V2]), np.concatenate([F, F2, np.array(side)])


def fbm(P, freq, octaves=4, seed=0):
    """cheap value-noise fbm on points (n,3) using hashed lattice"""
    rng = np.random.default_rng(seed)
    perm = rng.random((64, 64, 64))
    out = np.zeros(len(P))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        q = P * freq * (2 ** o) + 11.3 * o
        i = np.floor(q).astype(int)
        f = q - i
        f = f * f * (3 - 2 * f)
        def g(dx, dy, dz): return perm[(i[:, 0] + dx) % 64, (i[:, 1] + dy) % 64, (i[:, 2] + dz) % 64]
        c00 = g(0, 0, 0) * (1 - f[:, 0]) + g(1, 0, 0) * f[:, 0]
        c10 = g(0, 1, 0) * (1 - f[:, 0]) + g(1, 1, 0) * f[:, 0]
        c01 = g(0, 0, 1) * (1 - f[:, 0]) + g(1, 0, 1) * f[:, 0]
        c11 = g(0, 1, 1) * (1 - f[:, 0]) + g(1, 1, 1) * f[:, 0]
        v = (c00 * (1 - f[:, 1]) + c10 * f[:, 1]) * (1 - f[:, 2]) + (c01 * (1 - f[:, 1]) + c11 * f[:, 1]) * f[:, 2]
        out += amp * v
        tot += amp
        amp *= 0.5
    return out / tot


# ----------------------------------------------------------------------------- anatomy
def landmarks(ctx):
    if 'lm' in ctx.cache:
        return ctx.cache['lm']
    V = ctx.V[ctx.body_idx]
    h = ctx.heads
    lm = {}
    near0 = np.abs(V[:, 0]) < 0.012
    hipy = h['upperleg01.L'][1]
    cand = V[near0 & (V[:, 1] < hipy) & (V[:, 1] > 0.5 * V[:, 1].max())]
    lm['crotch_y'] = float(cand[:, 1].min()) if len(cand) else hipy - 0.08
    lm['hip_y'] = float(hipy)
    lm['knee_y'] = float(h['lowerleg01.L'][1])
    lm['ankle_y'] = float(h['foot.L'][1])
    lm['neck_base_y'] = float(h['neck01'][1])
    lm['shoulder_y'] = float(h['clavicle.L'][1])
    lm['head_top'] = float(V[:, 1].max())
    lm['waist_y'] = float(0.595 * V[:, 1].max())         # natural waist/navel, 0.595 of stature (Modelled from anthropometric tables)
    ctx.cache['lm'] = lm
    return lm


def bone_mask(ctx, prefixes, exclude=()):
    ids = [i for i, b in enumerate(ctx.bone_names) if any(b.startswith(p) for p in prefixes) and not any(b.startswith(e) for e in exclude)]
    return np.isin(ctx.J[ctx.body_idx][:, 0], ids)


def arm_mask(ctx):
    return bone_mask(ctx, ['upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal'])


def head_mask(ctx):
    return bone_mask(ctx, ['head', 'jaw', 'eye', 'oris', 'oculi', 'orbic', 'levator', 'risorius', 'temporalis', 'tongue', 'neck03'])


def contour(ctx, y, band=0.02, mask=None, nb=56, extra_pts=None):
    """polar outline (r per angle bin, centre) of body points around height y; angle 0 = +z (front), + toward +x (subject's left)"""
    V = ctx.V[ctx.body_idx]
    m = (np.abs(V[:, 1] - y) < band)
    if mask is not None:
        m &= mask
    P = V[m]
    if len(P) < 8:
        P = V[np.argsort(np.abs(V[:, 1] - y))[:200]]
    c = np.array([0.5 * (P[:, 0].min() + P[:, 0].max()), 0, 0.5 * (P[:, 2].min() + P[:, 2].max())])
    ang = np.arctan2(P[:, 0] - c[0], P[:, 2] - c[2])
    r = np.hypot(P[:, 0] - c[0], P[:, 2] - c[2])
    bins = ((ang + np.pi) / (2 * np.pi) * nb).astype(int) % nb
    out = np.zeros(nb)
    for b in range(nb):
        s = r[bins == b]
        out[b] = s.max() if len(s) else np.nan
    idx = np.arange(nb)
    good = ~np.isnan(out)
    out = np.interp(idx, idx[good], out[good], period=nb)
    for _ in range(2):
        out = np.maximum(out, 0.25 * np.roll(out, 1) + 0.5 * out + 0.25 * np.roll(out, -1))
    return c, out


def contour_point(c, rr, theta, nb=56, off=0.0):
    """position on the contour at angle theta (rad, 0=front) pushed out by off"""
    t = (theta + np.pi) / (2 * np.pi) * nb
    i0 = int(np.floor(t)) % nb
    f = t - np.floor(t)
    r = rr[i0] * (1 - f) + rr[(i0 + 1) % nb] * f + off
    return np.array([c[0] + r * np.sin(theta), 0, c[2] + r * np.cos(theta)])


def ring_loft(rings):
    """rings: list of (n,3) arrays with same n -> V,F (open ends)"""
    n = len(rings[0])
    V = np.concatenate(rings)
    F = []
    for i in range(len(rings) - 1):
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            c, d = (i + 1) * n + k, (i + 1) * n + (k + 1) % n
            F += [[a, c, b], [b, c, d]]
    return V, np.array(F)


# ----------------------------------------------------------------------------- colour system (fade / dirt / wear)
def cloth_colour(base_rgb, fade, fade_to):
    b = srgb(base_rgb)
    t = srgb(fade_to)
    return b * (1 - fade) + t * fade


def dirt_wear(ctx, P, base, dirt, seed, hem_y=None, kind='coat'):
    """per-vertex colour with mottling, ground-splash dirt rising from the bottom, knee/elbow/seat wear"""
    lm = landmarks(ctx)
    mott = fbm(P, 9.0, 4, seed) - 0.5
    fine = fbm(P, 60.0, 2, seed + 7) - 0.5
    col = np.tile(base, (len(P), 1)) * (1 + 0.28 * mott[:, None] + 0.08 * fine[:, None])
    dirt_c = srgb((86, 70, 52))
    h = P[:, 1]
    rise = np.clip(1 - h / 0.45, 0, 1) ** 1.5 if kind == 'trousers' else np.clip(1 - (h - (hem_y if hem_y else 0.7)) / 0.25, 0, 1) ** 2 * 0.5
    amount = np.clip(dirt * (rise * 1.2 + 0.25 * (fbm(P, 14.0, 3, seed + 3))) , 0, 0.85)
    for knee in ('L', 'R'):
        kn = ctx.heads[f'lowerleg01.{knee}']
        d = np.linalg.norm(P - kn, axis=1)
        amount += dirt * 0.35 * np.exp(-(d / 0.09) ** 2) * (kind == 'trousers')
    col = col * (1 - amount[:, None]) + dirt_c * amount[:, None]
    return np.clip(col, 0, 1)


# ----------------------------------------------------------------------------- body, eyes, hair
SKIN_TONES = {'fair': (226, 176, 150), 'ruddy': (214, 152, 124), 'tan': (190, 134, 104), 'dark': (120, 80, 58)}


def make_body(ctx):
    V = ctx.V[ctx.body_idx]
    F = tri_from_quads(ctx.quads)
    N = vnormals(V, F)
    J, W = ctx.J[ctx.body_idx], ctx.W[ctx.body_idx]
    base = srgb(SKIN_TONES[ctx.spec.skin])
    C = np.tile(base, (len(V), 1))
    isb = lambda pre: bone_mask(ctx, pre)
    face = head_mask(ctx)
    hand = isb(['wrist', 'finger', 'metacarpal'])
    fore = isb(['lowerarm'])
    neck = isb(['neck'])
    tan = np.ones(len(V))
    tan[face | neck | hand | fore] = 0.86
    C = C * tan[:, None]
    C[face] *= np.array([1.0, 0.88, 0.85])
    mott = fbm(V, 30.0, 3, ctx.spec.seed + 1) - 0.5
    C *= (1 + 0.10 * mott[:, None])
    return part('body', 'skin_body', V, F, J, W, C=C, N=N)


def eyes(ctx):
    out = []
    for s in ('L', 'R'):
        c = ctx.heads[f'eye.{s}']
        r = 0.0115
        prof = [(r * np.sin(a), r * np.cos(a)) for a in np.linspace(0, np.pi, 13)]
        v, f = lathe(prof, 18)
        v = R.from_euler('x', 90, degrees=True).apply(v) + c
        n = (v - c) / r
        col = np.tile(srgb((232, 226, 216)), (len(v), 1))
        col[n[:, 2] > 0.90] = srgb((82, 92, 100))
        col[n[:, 2] > 0.975] = srgb((8, 8, 8))
        J, W = rigid_skin(len(v), ctx.bi(f'eye.{s}'))
        out.append(part(f'eye_{s}', 'skin_eye', v, f, J, W, C=col, N=n))
    return out


def shell(ctx, vmask, d, name, material, colour_fn=None, smooth=0, min_frac=0.7):
    """offset surface of the body faces whose four corners are all in vmask; d scalar or per-vertex.
    smooth>0: Laplacian-smooth the offset surface (loose cloth) but never closer to the body than min_frac*d."""
    V = ctx.V[ctx.body_idx]
    q = ctx.quads
    keep = vmask[q].all(1)
    qq = q[keep]
    used = np.unique(qq)
    remap = -np.ones(len(V), int)
    remap[used] = np.arange(len(used))
    Fq = remap[qq]
    F = tri_from_quads(Fq)
    N0 = ctx.cache.setdefault('N0', vnormals(V, tri_from_quads(ctx.quads)))
    dd = np.broadcast_to(np.asarray(d, float), (len(V),))[used]
    P = V[used] + N0[used] * dd[:, None]
    if smooth:
        P2 = smooth_mesh(P, F, np.ones(len(P), bool), iters=smooth, lam=0.7)
        t = ((P2 - V[used]) * N0[used]).sum(1)
        P2 = P2 + N0[used] * np.maximum(min_frac * dd - t, 0)[:, None]
        P = P2
    J, W = ctx.J[ctx.body_idx][used], ctx.W[ctx.body_idx][used]
    C = colour_fn(P) if colour_fn else None
    out = part(name, material, P, F, J, W, C=C, N=None)
    out['_used'] = used
    return out


def bottom_loop(F, V):
    """ordered vertex loop of the lowest boundary of a triangle mesh"""
    from collections import defaultdict
    be = boundary_edges(F)
    adj = defaultdict(list)
    for a_, b_ in be:
        adj[a_].append(b_); adj[b_].append(a_)
    seen, loops = set(), []
    for start in adj:
        if start in seen:
            continue
        loop, cur, prev = [start], start, None
        seen.add(start)
        while True:
            nxt = [n for n in adj[cur] if n != prev and n not in seen]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur); loop.append(cur)
        loops.append(loop)
    loops = [l for l in loops if len(l) > 12]
    loops.sort(key=lambda l: V[l, 1].mean())
    return loops[0]


def hair_and_beard(ctx):
    sp = ctx.spec
    V = ctx.V[ctx.body_idx]
    lm = landmarks(ctx)
    ey = ctx.heads['eye.L'][1]
    head = head_mask(ctx)
    out = []
    hc = srgb(sp.hair_col)
    # scalp / back-of-head hair (ears left clear is not modelled: shell offset 5-7 mm)
    top = head & ((V[:, 1] > ey + 0.078) | ((V[:, 2] < 0.078) & (V[:, 1] > ey + 0.012)) | ((V[:, 2] < 0.040) & (V[:, 1] > ey - 0.040)))
    top &= ~((np.abs(V[:, 0]) > 0.062) & (V[:, 2] > -0.02) & (V[:, 2] < 0.05) & (V[:, 1] < ey + 0.01))     # ears stay clear
    col = lambda P: np.clip(np.tile(hc, (len(P), 1)) * (0.75 + 0.5 * fbm(P, 220.0, 2, sp.seed + 21)[:, None]), 0, 1)
    out.append(shell(ctx, top, 0.0065, 'hair', 'hair', col))
    if sp.beard != 'none':
        yc = float(V[head, 1].min())                       # chin underside
        ym = ey - 0.065                                    # approx mouth line
        mask = head & (V[:, 2] > 0.0) & (V[:, 1] < ym + 0.012) & (V[:, 1] > yc - 0.005)
        if sp.beard == 'mustache':
            mask = head & (V[:, 2] > 0.045) & (V[:, 1] < ym + 0.03) & (V[:, 1] > ym - 0.0) & (np.abs(V[:, 0]) < 0.03)
        elif sp.beard == 'chinstrap':
            mask = mask & ((np.abs(V[:, 0]) > 0.035) | (V[:, 1] < yc + 0.03)) & (V[:, 1] < ym - 0.005)
        elif sp.beard == 'full':
            mask = head & (V[:, 2] > -0.02) & (V[:, 1] < ym + 0.03) & (V[:, 1] > yc - 0.005)
        if mask.sum() > 8:
            out.append(shell(ctx, mask, 0.0045, 'beard', 'hair', col))
    return out


# ----------------------------------------------------------------------------- clothing
def sack_coat(ctx):
    """four-button dark-blue flannel sack coat (1861 Dress Regs art.15: 'extending half way down the thigh, made loose, falling collar, four coat buttons').
    Upper body + sleeves = offset shell of the body mesh (so it deforms with the skin weights); skirt = polar loft to the hem."""
    sp = ctx.spec
    lm = landmarks(ctx)
    V = ctx.V[ctx.body_idx]
    h = ctx.heads
    base = cloth_colour((22, 30, 56), sp.fade, (84, 88, 104))
    hem_y = lm['hip_y'] - (lm['hip_y'] - lm['knee_y']) * (0.40 + 0.2 * sp.coat_len)
    arms = arm_mask(ctx)
    headm = head_mask(ctx) | bone_mask(ctx, ['neck'])
    trunk = ~(arms | headm)
    y_join = lm['crotch_y'] + 0.035
    span = lm['shoulder_y'] - hem_y

    def ease(y):
        t = np.clip((y - hem_y) / span, 0, 1)
        return 0.009 + 0.024 * (1 - t) ** 0.8 + 0.012 * np.sin(np.pi * np.clip(t * 1.3, 0, 1))
    # sleeve cut: stop 3 cm above the wrist joint along the forearm axis
    cut = np.zeros(len(V), bool)
    d = np.full(len(V), 0.0)
    d[trunk] = ease(V[trunk, 1])
    for s_ in ('L', 'R'):
        el, wr = h[f'lowerarm01.{s_}'], h[f'wrist.{s_}']
        ax = (wr - el) / np.linalg.norm(wr - el)
        side = np.sign(h[f'upperarm01.{s_}'][0])
        am = arms & (np.sign(V[:, 0]) == side)
        t = (V[:, :] - el) @ ax / np.linalg.norm(wr - el)
        cut |= am & (t > 0.80)
        cut |= am & bone_mask(ctx, ['wrist', 'finger', 'metacarpal'])
        sl = am & ~cut
        d[sl] = 0.014 + 0.010 * np.sin(np.clip(((V[sl, :] - h[f'upperarm01.{s_}']) @ ax) / 0.6, 0, 1) * np.pi) + 0.012 * np.clip((t[sl] - 0.55) / 0.25, 0, 1)
    up = (V[:, 1] > y_join) & (V[:, 1] < lm['neck_base_y'] + 0.01) & ~cut & ~headm & ~bone_mask(ctx, ['wrist', 'finger', 'metacarpal'])
    up &= ~(bone_mask(ctx, ['foot', 'toe', 'lowerleg', 'upperleg']) & (V[:, 1] < lm['hip_y']))
    colfn = lambda P: dirt_wear(ctx, P, base, sp.dirt * 0.8, sp.seed + 40, hem_y=hem_y)
    upper = shell(ctx, up, d, 'coat', 'coat_wool', colfn, smooth=26, min_frac=0.9)
    # skirt: polar rings from just inside the shell's lower edge down to the hem; top ring sits 4 mm OUTSIDE the shell so the junction edge is covered
    nb = 56
    trunk_all = ~(arms | headm)
    y_top = float(np.percentile(upper['V'][:, 1], 3)) + 0.045
    rings = []
    for y in np.linspace(y_top, hem_y, 11):
        c, rr = contour(ctx, y, 0.025, trunk_all, nb)
        t = np.clip((y_top - y) / (y_top - hem_y + 1e-6), 0, 1)
        e = ease(y) + 0.004 + 0.046 * t ** 0.8
        pts = []
        for k in range(nb):
            th = (k + 0.5) / nb * 2 * np.pi - np.pi
            p = contour_point(c, rr, th, nb, e)
            p[1] = y
            pts.append(p)
        rings.append(np.array(pts))
    last = rings[-1]
    cc = last.mean(0)
    rings.append(np.array([cc + (p - cc) * 0.985 + np.array([0, 0.012, 0]) for p in last]))
    Vs_all, Fs_all = ring_loft(rings)
    Js, Ws = skin_from_body(ctx, Vs_all)
    f = np.clip((y_top - Vs_all[:, 1]) / (y_top - hem_y + 1e-6), 0, 1)
    wroot = 0.2 + 0.5 * f
    Wr = np.zeros_like(Ws); Jr = Js.copy(); Jr[:, 0] = ctx.bi('root'); Wr[:, 0] = 1.0
    Js = np.concatenate([Js, Jr], 1); Ws = np.concatenate([Ws * (1 - wroot[:, None]), Wr * wroot[:, None]], 1)
    order = np.argsort(-Ws, axis=1)[:, :4]
    Js = np.take_along_axis(Js, order, 1); Ws = np.take_along_axis(Ws, order, 1); Ws = Ws / Ws.sum(1, keepdims=True)
    skirt = part('coat_skirt', 'coat_wool', Vs_all, Fs_all, Js, Ws, C=dirt_wear(ctx, Vs_all, base, sp.dirt * 0.8, sp.seed + 40, hem_y=hem_y))
    parts = [upper, skirt]
    # collar band (falling collar, 3 cm) and the four brass buttons
    neck_c = np.array([h['neck01'][0], 0, h['neck01'][2]])
    prof = [(1.0, lm['neck_base_y'] - 0.012), (1.04, lm['neck_base_y'] + 0.020), (1.07, lm['neck_base_y'] + 0.050), (1.0, lm['neck_base_y'] + 0.054)]
    Vc, Fc = lathe(prof, 36)
    Vc[:, 0] *= 0.074          # collar ring is an ellipse: 7.4 cm half-width, 8.2 cm front-back (neck + falling collar)
    Vc[:, 2] *= 0.083
    Vc = Vc + np.array([neck_c[0], 0, neck_c[2] + 0.020])
    Jc, Wc = skin_from_body(ctx, Vc)
    parts.append(part('collar', 'coat_wool', Vc, Fc, Jc, Wc, C=np.tile(base * 0.95, (len(Vc), 1))))
    nbut = 4 - sp.missing_buttons
    bitems = []
    ybt = np.linspace(lm['shoulder_y'] - 0.045, hem_y + 0.24, 4)[:nbut]
    for y in ybt:
        c, rr = contour(ctx, y, 0.02, trunk, nb)
        p = contour_point(c, rr, 0.0, nb, ease(y) + 0.0015)
        p[1] = y
        pv, pf = lathe([(0.0, 0.0), (0.0075, 0.0), (0.0075, 0.0025), (0.0, 0.0035)], 12)
        pv = R.from_euler('x', 90, degrees=True).apply(pv) + p
        bitems.append((pv, pf))
    if bitems:
        Vb, Fb = merge(bitems)
        Jb, Wb = skin_from_body(ctx, Vb)
        parts.append(part('buttons', 'metal_brass', Vb, Fb, Jb, Wb, C=np.tile(srgb((184, 140, 58)), (len(Vb), 1))))
    ctx.cache['coat_hem_y'] = hem_y
    ctx.cache['trunk'] = trunk
    ctx.cache['coat_ease'] = ease
    return parts



def shirt_front(ctx):
    """grey/white flannel shirt showing in the open neck of the sack coat (shell over the chest, 3 mm offset)"""
    lm = landmarks(ctx)
    V = ctx.V[ctx.body_idx]
    m = ~(arm_mask(ctx) | head_mask(ctx)) & (V[:, 1] > lm['shoulder_y'] - 0.20) & (V[:, 1] < lm['neck_base_y'] + 0.025) & ~bone_mask(ctx, ['upperleg', 'lowerleg', 'foot'])
    col = lambda P: np.clip(np.tile(srgb((150, 142, 128)), (len(P), 1)) * (0.85 + 0.25 * fbm(P, 60.0, 3, ctx.spec.seed + 33)[:, None]), 0, 1)
    return [shell(ctx, m, 0.004, 'shirt', 'shirt_flannel', col)]


def trousers(ctx):
    """sky-blue kersey trousers 'loose, without plaits, to spread well over the boot' (1861 Dress Regs art.31)"""
    sp = ctx.spec
    lm = landmarks(ctx)
    V = ctx.V[ctx.body_idx]
    base = cloth_colour((124, 150, 184), sp.fade * 0.8, (156, 166, 178))
    hem = lm['ankle_y'] + 0.045
    legmask = bone_mask(ctx, ['upperleg', 'lowerleg', 'pelvis', 'root', 'spine05', 'foot'])
    m = legmask & (V[:, 1] < lm['waist_y'] + 0.02) & (V[:, 1] > hem)
    y = V[:, 1]
    flare = 0.026 * np.clip((lm['knee_y'] - y) / (lm['knee_y'] - hem), 0, 1) ** 1.5
    d = 0.0085 + 0.007 * np.clip((lm['crotch_y'] - y) / 0.2, 0, 1) + flare
    colfn = lambda P: dirt_wear(ctx, P, base, sp.dirt, sp.seed + 50, kind='trousers')
    p = shell(ctx, m, d, 'trousers', 'trousers_kersey', colfn)
    return [p]


def brogans(ctx):
    """'bootees'/brogans (QM issue, ankle-high, hobnailed sole).  Built as the rounded convex hull of the foot + ankle points (a Minkowski sum with an 8 mm sphere),
    cut open at the ankle, plus a 1.7 cm slab sole extruded from the bottom faces.  Straight-last shape: Modelled, see PLAN.md Part 1 (footwear)."""
    from scipy.spatial import ConvexHull
    sp = ctx.spec
    lm = landmarks(ctx)
    Vb = ctx.V[ctx.body_idx]
    top = lm['ankle_y'] + 0.052
    dirs = []
    for th in np.linspace(0, 2 * np.pi, 10, endpoint=False):
        for ph in (-0.9, -0.35, 0.35, 0.9):
            dirs.append([np.cos(th) * np.cos(ph), np.sin(ph), np.sin(th) * np.cos(ph)])
    dirs = np.array(dirs + [[0, -1, 0], [0, 1, 0]])
    out = []
    col = srgb((44, 30, 22))
    for side, sgn in (('L', 1), ('R', -1)):
        fm = bone_mask(ctx, ['foot', 'toe']) | (bone_mask(ctx, ['lowerleg']) & (Vb[:, 1] < top))
        fm &= (np.sign(Vb[:, 0]) == sgn) & (Vb[:, 1] < top)
        pts = Vb[fm]
        pts = pts[::2]
        cloud = (pts[:, None, :] + 0.0085 * dirs[None, :, :]).reshape(-1, 3)
        cloud[:, 1] = np.maximum(cloud[:, 1], 0.0 - 0.0085)
        hull = ConvexHull(cloud)
        used = np.unique(hull.simplices)
        remap = -np.ones(len(cloud), int)
        remap[used] = np.arange(len(used))
        P = cloud[used]
        F = remap[hull.simplices]
        # orient faces outward
        cen = P.mean(0)
        a_, b_, c_ = P[F[:, 0]], P[F[:, 1]], P[F[:, 2]]
        fn = np.cross(b_ - a_, c_ - a_)
        flip = (fn * ((a_ + b_ + c_) / 3 - cen)).sum(1) < 0
        F[flip] = F[flip][:, ::-1]
        fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
        fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
        cy = P[F].mean(1)[:, 1]
        # open the top: drop faces looking up near the ankle height; separate the bottom for the sole
        topcap = (fn[:, 1] > 0.6) & (cy > top - 0.012)
        bottom = (fn[:, 1] < -0.85) & (cy < 0.012)
        upper_f = F[~topcap & ~bottom]
        used2 = np.unique(upper_f)
        rm2 = -np.ones(len(P), int)
        rm2[used2] = np.arange(len(used2))
        Pu = P[used2]
        Fu = rm2[upper_f]
        Ju, Wu = skin_from_body(ctx, Pu)
        Cu = np.clip(np.tile(col, (len(Pu), 1)) * (0.8 + 0.5 * fbm(Pu, 70.0, 3, sp.seed + 60 + sgn)[:, None]) + srgb((74, 60, 44)) * np.clip(1 - Pu[:, 1] / 0.07, 0, 1)[:, None] * sp.dirt * 0.8, 0, 1)
        out.append(part('brogan_' + side, 'leather_brogan', Pu, Fu, Ju, Wu, C=Cu))
        # sole slab: extrude bottom faces downward
        bf = F[bottom]
        ub = np.unique(bf)
        rb = -np.ones(len(P), int)
        rb[ub] = np.arange(len(ub))
        Pb = P[ub]
        Fb = rb[bf]
        # ensure normals point down for the top copy ordering used by extrude_down (it flips for the lower copy)
        Vs, Fs = extrude_down(Pb, Fb[:, ::-1], -0.017, 0)
        Vs[len(Pb):, :] = Vs[len(Pb):, :]
        Js, Ws = skin_from_body(ctx, Vs)
        out.append(part('sole_' + side, 'leather_sole', Vs, Fs, Js, Ws, C=np.tile(srgb((22, 18, 14)), (len(Vs), 1))))
    return out


def forage_cap(ctx):
    """M1858 'bummer' forage cap, dark blue wool, drooping crown, patent-leather visor; or kepi / slouch hat"""
    sp = ctx.spec
    lm = landmarks(ctx)
    V = ctx.V[ctx.body_idx]
    ey = ctx.heads['eye.L'][1]
    head = head_mask(ctx)
    cx = 0.0
    zc = float(V[head, 2].mean()) - 0.005
    top = lm['head_top']
    base = cloth_colour((28, 36, 64), sp.hat_fade, (92, 94, 110))
    parts = []
    band_y0 = ey + 0.034
    if sp.hat in ('forage', 'kepi'):
        rb = 0.0845
        hb = 0.055 if sp.hat == 'forage' else 0.075
        # band + sloping crown: profile (r, y)
        crown_r = rb * (1.27 if sp.hat == 'forage' else 1.04)
        prof = [(rb, 0.0), (rb + 0.002, hb), (rb + 0.003 + (crown_r - rb) * 0.4, hb + 0.012), (crown_r, hb + 0.022), (crown_r * 0.6, hb + 0.030), (0.0, hb + 0.032)]
        v, f = lathe(prof, 36)
        # elliptical head: stretch x/z
        v[:, 0] *= 0.93
        v[:, 2] *= 1.07
        # droop: crown falls forward/back (rotate about x), dent: pinch
        tilt = 6 + 14 * sp.hat_droop
        v = R.from_euler('x', tilt, degrees=True).apply(v - np.array([0, hb * 0.5, 0])) + np.array([0, hb * 0.5, 0])
        v[:, 1] -= sp.hat_dent * 0.012 * np.clip(1 - (v[:, 0] ** 2 + v[:, 2] ** 2) / 0.01, 0, 1)
        v = v + np.array([cx, band_y0, zc])
        # visor: half annulus at front, tilted down
        ang = np.linspace(-np.pi * 0.42, np.pi * 0.42, 18)
        r_in, r_out = rb * 1.0, rb + 0.060
        vis_v, vis_f = [], []
        for a in ang:
            vis_v.append([r_in * 0.93 * np.sin(a), 0.0, r_in * 1.07 * np.cos(a)])
            vis_v.append([(r_in + (r_out - r_in) * np.cos(a * 1.15) ** 1.2) * 0.95 * np.sin(a), -0.016 * np.cos(a), (r_in + (r_out - r_in) * np.cos(a * 1.15) ** 1.2) * 1.0 * np.cos(a)])
        vis_v = np.array(vis_v)
        for i in range(len(ang) - 1):
            a, b, c, d = 2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 3
            vis_f += [[a, b, c], [b, d, c], [a, c, b], [b, c, d]]
        vis_v = R.from_euler('x', -6, degrees=True).apply(vis_v) + np.array([cx, band_y0 + 0.002, zc])
        J, W = rigid_skin(len(v), ctx.bi('head'))
        parts.append(part('cap', 'cap_wool', v, f, J, W, C=np.tile(base, (len(v), 1)) * (0.85 + 0.3 * fbm(v, 25.0, 3, sp.seed + 70)[:, None])))
        J, W = rigid_skin(len(vis_v), ctx.bi('head'))
        parts.append(part('visor', 'leather_visor', vis_v, np.array(vis_f), J, W, C=np.tile(srgb((18, 16, 15)), (len(vis_v), 1))))
        # brass company letter / badge disc at the crown front
        pv, pf = lathe([(0, 0), (0.011, 0), (0.011, 0.002), (0, 0.003)], 14)
        pv = R.from_euler('x', 90, degrees=True).apply(pv) + np.array([cx, band_y0 + hb * 0.62, zc + rb * 1.08 + 0.003])
        J, W = rigid_skin(len(pv), ctx.bi('head'))
        parts.append(part('cap_badge', 'metal_brass', pv, pf, J, W, C=np.tile(srgb((184, 140, 58)), (len(pv), 1))))
    else:   # slouch hat (felt)
        rb = 0.088
        prof = [(0.165, 0.0), (0.150, 0.006), (0.112, 0.012), (rb + 0.004, 0.018), (rb, 0.055), (rb - 0.006, 0.100), (rb - 0.016, 0.112), (0.0, 0.108)]
        v, f = lathe(prof, 40)
        v[:, 0] *= 0.93
        v[:, 2] *= 1.07
        v[:, 1] += -sp.hat_dent * 0.03 * np.clip(v[:, 1] / 0.1, 0, 1) * np.clip(v[:, 2] / 0.1, 0, 1)
        v = R.from_euler('x', -5, degrees=True).apply(v) + np.array([cx, band_y0 - 0.015, zc])
        J, W = rigid_skin(len(v), ctx.bi('head'))
        col = cloth_colour((52, 48, 44), sp.hat_fade, (110, 100, 86))
        parts.append(part('cap', 'cap_wool', v, f, J, W, C=np.tile(col, (len(v), 1)) * (0.85 + 0.3 * fbm(v, 25.0, 3, sp.seed + 70)[:, None])))
    return parts


def patch_parts(ctx):
    """mismatched-cloth repair patches (knee, seat, elbow): small shells just proud of the trousers/coat surface; colour = a different bolt of cloth"""
    sp = ctx.spec
    if not sp.patches:
        return []
    lm = landmarks(ctx)
    V = ctx.V[ctx.body_idx]
    h = ctx.heads
    out = []
    rng = np.random.default_rng(sp.seed + 5)
    for pn in sp.patches:
        if pn.startswith('knee'):
            side = pn[-1]
            c = h[f'lowerleg01.{side}'] + np.array([0, 0, 0.055])
            r, kind = 0.058, 'trousers'
        elif pn == 'seat':
            c = np.array([0.0, lm['crotch_y'] + 0.02, -0.095])
            r, kind = 0.085, 'trousers'
        else:
            side = pn[-1]
            c = h[f'lowerarm01.{side}'] + np.array([0.035 * (1 if side == 'L' else -1), -0.01, -0.035])
            r, kind = 0.05, 'coat'
        dist = np.linalg.norm(V - c, axis=1)
        if kind == 'trousers':
            m = (dist < r) & bone_mask(ctx, ['upperleg', 'lowerleg', 'pelvis', 'root']) & (V[:, 1] < lm['waist_y'])
            d = 0.0105 + 0.004 * np.clip((lm['crotch_y'] - V[:, 1]) / 0.2, 0, 1) + 0.0045
            col0 = rng.choice([(118, 128, 142), (86, 96, 110), (140, 132, 112), (60, 70, 96)], axis=0)
        else:
            m = (dist < r) & arm_mask(ctx)
            d = np.full(len(V), 0.0215)
            col0 = rng.choice([(54, 58, 74), (40, 44, 60), (96, 86, 70)], axis=0)
        if m.sum() < 8:
            continue
        colfn = lambda P, col0=col0: np.clip(np.tile(srgb(tuple(col0)), (len(P), 1)) * (0.8 + 0.4 * fbm(P, 90.0, 2, 11)[:, None]), 0, 1)
        out.append(shell(ctx, m, d, 'patch_' + pn, 'trousers_kersey' if kind == 'trousers' else 'coat_wool', colfn))
    return out


# ----------------------------------------------------------------------------- accoutrements (1861 Ordnance Manual dimensions)
def waist_frame(ctx):
    lm = landmarks(ctx)
    yw = lm['waist_y'] - 0.01
    trunk = ctx.cache['trunk']
    c, rr = contour(ctx, yw, 0.022, trunk, 56)
    ease = ctx.cache['coat_ease'](yw)
    return yw, c, rr, ease


def belt_and_plate(ctx):
    yw, c, rr, ease = waist_frame(ctx)
    nb = 56
    w = 1.9 * IN
    rings = []
    for dy, off in ((w / 2, 0.0), (w / 2, 0.004), (-w / 2, 0.004), (-w / 2, 0.0)):
        pts = []
        for k in range(nb):
            th = (k + 0.5) / nb * 2 * np.pi - np.pi
            p = contour_point(c, rr, th, nb, ease + 0.003 + off)
            p[1] = yw + dy
            pts.append(p)
        rings.append(np.array(pts))
    V, F = ring_loft(rings)
    J, W = rigid_skin(len(V), ctx.bi('spine05'))
    out = [part('belt', 'leather_black', V, F, J, W, C=np.tile(srgb((22, 20, 19)), (len(V), 1)) * (0.8 + 0.4 * fbm(V, 80.0, 2, 5)[:, None]))]
    # US oval brass plate 3.5 x 2.25 in at centre front
    p = contour_point(c, rr, 0.0, nb, ease + 0.0075)
    p[1] = yw
    prof = [(0, 0.0), (1.0, 0.0), (1.0, 0.003), (0.8, 0.0045), (0.0, 0.0055)]
    pv, pf = lathe([(r * 0.5, y) for r, y in prof], 24)
    pv[:, 0] *= (3.5 * IN) / 1.0 * 0.5 * 2 / 1.0 * 1.0 * 0.5 * 1.0
    pv = pv.copy()
    # build oval: scale x to 3.5in/2 and z to 2.25in/2 (lathe radius 0.5 -> scale)
    pv2, pf2 = lathe([(r, y) for r, y in prof], 24)
    pv2[:, 0] *= 1.75 * IN
    pv2[:, 2] *= 1.125 * IN
    pv2 = R.from_euler('x', 90, degrees=True).apply(pv2)
    pv2[:, 2] *= 1.0
    # after rotation the lathe axis (y) points +z (front); oval long axis is x (width) -> good
    pv2 = pv2 + p
    J, W = rigid_skin(len(pv2), ctx.bi('spine05'))
    out.append(part('belt_plate', 'metal_brass', pv2, pf2, J, W, C=np.tile(srgb((190, 146, 62)), (len(pv2), 1))))
    return out


def hang_box(ctx, theta_deg, y_top, size, name, material, colour, bone='spine05', extra=0.0, tilt=0.0):
    """a rounded box hung on the waist belt at polar angle theta (0=front, +=left): size=(tangent length, normal thickness, height)"""
    yw, c, rr, ease = waist_frame(ctx)
    th = np.radians(theta_deg)
    nb = 56
    p = contour_point(c, rr, th, nb, ease + 0.006 + size[1] / 2 + extra)
    p[1] = y_top - size[2] / 2
    rot = R.from_euler('y', np.degrees(th), degrees=True)       # local z -> outward normal at angle th
    tl = R.from_euler('x', tilt, degrees=True)
    v, f = rbox(np.zeros(3), (size[0], size[2], size[1]), None, 0.004)     # x tangent, y height, z normal
    v = (rot * tl).apply(v) + p
    J, W = rigid_skin(len(v), ctx.bi(bone))
    return v, f, J, W


def cartridge_box(ctx):
    """.58 infantry box: interior 6.8 x 1.4 x 5.2 in (1861 Ordnance Manual p.230), black bridle leather, brass 'US' oval 3.5x2.2 in on the flap"""
    lm = landmarks(ctx)
    yw = lm['waist_y'] - 0.01
    L, T, H = 6.8 * IN + 0.012, 1.4 * IN + 0.010, 5.2 * IN + 0.012
    v, f, J, W = hang_box(ctx, -78, yw + 0.015, (L, T, H), 'cartridge_box', 'leather_black', None)
    out = [part('cartridge_box', 'leather_black', v, f, J, W, C=np.tile(srgb((24, 21, 20)), (len(v), 1)) * (0.8 + 0.4 * fbm(v, 70.0, 2, 8)[:, None]))]
    # flap (slightly proud, covers the box top 2/3)
    v2, f2, J2, W2 = hang_box(ctx, -78, yw + 0.017, (L + 0.004, T + 0.007, H * 0.62), 'flap', 'leather_black', None, extra=0.0035)
    out.append(part('cartridge_flap', 'leather_black', v2, f2, J2, W2, C=np.tile(srgb((28, 25, 24)), (len(v2), 1))))
    # brass US plate on flap
    yw_, c, rr, ease = waist_frame(ctx)
    th = np.radians(-78)
    p = contour_point(c, rr, th, 56, ease + 0.006 + T / 2 + 0.0035 + (T + 0.007) / 2 + 0.002)
    p[1] = yw + 0.017 - H * 0.30
    pv, pf = lathe([(0, 0), (1.0, 0.0), (1.0, 0.0025), (0.85, 0.0035), (0, 0.0042)], 20)
    pv[:, 0] *= 1.75 * IN
    pv[:, 2] *= 1.1 * IN
    pv = R.from_euler('x', 90, degrees=True).apply(pv)
    pv = R.from_euler('y', np.degrees(th), degrees=True).apply(pv) + p
    J3, W3 = rigid_skin(len(pv), ctx.bi('spine05'))
    out.append(part('cartridge_plate', 'metal_brass', pv, pf, J3, W3, C=np.tile(srgb((184, 140, 58)), (len(pv), 1))))
    return out


def cap_pouch(ctx):
    """3 x 1.25 x 3 in (1861 Ordnance Manual), front right of the belt"""
    lm = landmarks(ctx)
    yw = lm['waist_y'] - 0.01
    v, f, J, W = hang_box(ctx, -33, yw + 0.012, (3 * IN, 1.25 * IN, 3 * IN), 'cap_pouch', 'leather_black', None)
    return [part('cap_pouch', 'leather_black', v, f, J, W, C=np.tile(srgb((24, 21, 20)), (len(v), 1)))]


def bayonet_scabbard(ctx):
    """19.5 in black bridle-leather scabbard (model 1855/1853 bayonets) with brass ferrule/tip, frog on the waist belt, left hip"""
    yw, c, rr, ease = waist_frame(ctx)
    th = np.radians(62)
    p0 = contour_point(c, rr, th, 56, ease + 0.012)
    p0[1] = yw - 0.01
    L = 19.5 * IN
    d = np.array([0.10, -1.0, -0.05])
    d /= np.linalg.norm(d)
    path = np.array([p0 + d * t for t in np.linspace(0, L, 8)])
    r = np.linspace(0.016, 0.012, 8)
    v, f = tube(path, r, nseg=10)
    # skin: top rigid to pelvis, lower part blended toward the left thigh (hangs from the frog, swings with the leg)
    wt = np.clip((p0[1] - v[:, 1]) / L, 0, 1) * 0.55
    J = np.zeros((len(v), 4), int)
    W = np.zeros((len(v), 4))
    J[:, 0] = ctx.bi('spine05')
    J[:, 1] = ctx.bi('upperleg02.L')
    W[:, 0] = 1 - wt
    W[:, 1] = wt
    out = [part('scabbard', 'leather_black', v, f, J, W, C=np.tile(srgb((26, 23, 22)), (len(v), 1)))]
    tip_path = np.array([p0 + d * t for t in np.linspace(L - 0.04, L + 0.012, 3)])
    v2, f2 = tube(tip_path, [0.0125, 0.012, 0.007], nseg=10)
    wt2 = np.clip((p0[1] - v2[:, 1]) / L, 0, 1) * 0.55
    J2 = np.zeros((len(v2), 4), int); W2 = np.zeros((len(v2), 4))
    J2[:, 0] = ctx.bi('spine05'); J2[:, 1] = ctx.bi('upperleg02.L'); W2[:, 0] = 1 - wt2; W2[:, 1] = wt2
    out.append(part('scabbard_tip', 'metal_brass', v2, f2, J2, W2, C=np.tile(srgb((184, 140, 58)), (len(v2), 1))))
    # leather frog loop on the belt
    return out


def canteen_and_strap(ctx):
    """M1858 smooth-side canteen, ~7.75 in diameter, brown wool cover (dealer-catalogue dimensions: Modelled), strap over the RIGHT shoulder to the LEFT hip"""
    sp = ctx.spec
    lm = landmarks(ctx)
    yw, c, rr, ease = waist_frame(ctx)
    th = np.radians(88)
    p = contour_point(c, rr, th, 56, ease + 0.04)
    p[1] = yw - 0.17
    r = 7.75 * IN / 2
    prof = [(0.0, -0.034), (r * 0.55, -0.033), (r * 0.93, -0.026), (r, -0.012), (r, 0.012), (r * 0.93, 0.026), (r * 0.55, 0.033), (0.0, 0.034)]
    v, f = lathe(prof, 28)
    # lathe axis y -> canteen face normal; rotate so axis = local z (outward), canteen stands on edge
    v = R.from_euler('x', 90, degrees=True).apply(v)
    v = R.from_euler('y', np.degrees(th), degrees=True).apply(v) + p
    wt = np.full(len(v), 0.3)
    J = np.zeros((len(v), 4), int); W = np.zeros((len(v), 4))
    J[:, 0] = ctx.bi('spine05'); J[:, 1] = ctx.bi('upperleg02.L'); W[:, 0] = 0.75; W[:, 1] = 0.25
    col = srgb(sp.canteen_cover)
    C = np.tile(col, (len(v), 1)) * (0.8 + 0.4 * fbm(v, 90.0, 2, sp.seed + 80)[:, None])
    C = C * (1 - 0.35 * sp.dirt) + srgb((80, 66, 50)) * 0.35 * sp.dirt
    out = [part('canteen', 'wool_canteen', v, f, J, W, C=C)]
    # spout/stopper
    sp_p = p + R.from_euler('y', np.degrees(th), degrees=True).apply(np.array([0, r + 0.004, 0.0]))
    pv, pf = lathe([(0.011, 0), (0.011, 0.012), (0.008, 0.016), (0, 0.016)], 12)
    pv = pv + sp_p
    out.append(part('canteen_spout', 'metal_tin', pv, pf, J[:len(pv)] if len(pv) <= len(J) else np.tile(J[:1], (len(pv), 1)), W[:len(pv)] if len(pv) <= len(W) else np.tile(W[:1], (len(pv), 1)), C=np.tile(srgb((150, 150, 148)), (len(pv), 1))))
    strap = diag_strap(ctx, 'R', 'L', width=1.5 * IN, name='canteen_strap', col=(110, 98, 70), hang_p=p + np.array([0, r * 0.95, 0]))
    out += strap
    return out


def diag_strap(ctx, from_side, to_side, width, name, col, hang_p, y_top=None):
    """strap over the `from_side` shoulder, crossing chest (front) and back diagonally to the `to_side` hip. returns parts."""
    lm = landmarks(ctx)
    trunk = ctx.cache['trunk']
    nb = 56
    sgn_from = -1 if from_side == 'R' else 1
    sgn_to = -sgn_from
    pts = []
    th_sh = np.radians(sgn_from * 62)
    th_hip_f = np.radians(sgn_to * 80)
    # front run: shoulder -> hip, y from shoulder to hip level (cutting across the chest)
    path = []
    ys = np.linspace(lm['shoulder_y'] + 0.03, hang_p[1] + 0.06, 18)
    for k, y in enumerate(ys):
        t = k / (len(ys) - 1)
        th = th_sh * (1 - t) + th_hip_f * t
        cc, rr = contour(ctx, y, 0.022, trunk, nb)
        path.append(contour_point(cc, rr, th, nb, ctx.cache['coat_ease'](y) + 0.016))
        path[-1][1] = y
    # over the shoulder: front -> back through the top
    sh_c = np.array([sgn_from * 0.125, lm['shoulder_y'] + 0.03, ctx.heads['clavicle.L'][2] - 0.005])
    over = [path[0] * (1 - t) + (np.array([sh_c[0], lm['shoulder_y'] + 0.050, sh_c[2]])) * t for t in (0.0, 0.5)]
    # back run
    back = []
    th_sh_b = np.radians(sgn_from * 118)
    th_hip_b = np.radians(sgn_to * 100)
    for k, y in enumerate(ys):
        t = k / (len(ys) - 1)
        th = th_sh_b * (1 - t) + th_hip_b * t
        cc, rr = contour(ctx, y, 0.022, trunk, nb)
        back.append(contour_point(cc, rr, th, nb, ctx.cache['coat_ease'](y) + 0.016))
        back[-1][1] = y
    full = [back[-1]] + back[::-1][1:] + [np.array([sh_c[0], lm['shoulder_y'] + 0.050, sh_c[2]])] + path
    full = np.array(full)
    # ribbon along full (width across the surface normal ~ horizontal-outward); build as flat tube with elliptical section
    # smooth
    k = np.array([.2, .6, .2])
    sm = np.stack([np.convolve(np.pad(full[:, i], 2, mode='edge'), np.ones(3) / 3, mode='valid')[:len(full)] for i in range(3)], 1)
    sm[0] = full[0]; sm[-1] = full[-1]
    v, f = tube(sm, np.stack([np.full(len(sm), width / 2), np.full(len(sm), 0.0025)], 1), nseg=8, cap=True)
    J, W = skin_from_body(ctx, v)
    return [part(name, 'canvas_strap', v, f, J, W, C=np.tile(srgb(col), (len(v), 1)) * (0.8 + 0.4 * fbm(v, 90.0, 2, 3)[:, None]))]


def haversack(ctx):
    """tarred (painted black) canvas haversack ~ 12x12 in, hung at the right hip on a strap over the LEFT shoulder (Modelled dimensions)"""
    sp = ctx.spec
    lm = landmarks(ctx)
    yw, c, rr, ease = waist_frame(ctx)
    th = np.radians(-112)
    p = contour_point(c, rr, th, 56, ease + 0.020)
    p[1] = yw + 0.01 - 0.15
    v, f, J, W = hang_box(ctx, -112, yw + 0.012, (11 * IN, 1.2 * IN, 11.5 * IN), 'haversack', 'canvas_black', None, extra=0.012, tilt=0)
    out = [part('haversack', 'canvas_black', v, f, J, W, C=np.tile(srgb((34, 33, 30)), (len(v), 1)) * (0.8 + 0.4 * fbm(v, 60.0, 3, sp.seed + 90)[:, None]) )]
    out += diag_strap(ctx, 'L', 'R', 1.0 * IN, 'haversack_strap', (36, 34, 30), p + np.array([0, 0.15, 0]))
    return out


def blanket_roll(ctx):
    """grey US blanket rolled horse-collar fashion over the LEFT shoulder, ends tied at the right hip (Modelled - 20th Maine pack carriage on 2 July is Contested)"""
    sp = ctx.spec
    lm = landmarks(ctx)
    trunk = ctx.cache['trunk']
    nb = 56
    ys = np.linspace(lm['shoulder_y'] + 0.045, lm['waist_y'] - 0.08, 20)
    front = []
    for k, y in enumerate(ys):
        t = k / (len(ys) - 1)
        th = np.radians(48 * (1 - t) - 70 * t)
        cc, rr = contour(ctx, y, 0.022, trunk, nb)
        pt = contour_point(cc, rr, th, nb, ctx.cache['coat_ease'](y) + 0.034)
        pt[1] = y
        front.append(pt)
    back = []
    for k, y in enumerate(ys):
        t = k / (len(ys) - 1)
        th = np.radians(130 * (1 - t) - 125 * t)
        cc, rr = contour(ctx, y, 0.022, trunk, nb)
        pt = contour_point(cc, rr, th, nb, ctx.cache['coat_ease'](y) + 0.034)
        pt[1] = y
        back.append(pt)
    top = np.array([0.125, lm['shoulder_y'] + 0.062, ctx.heads['clavicle.L'][2] - 0.005])
    full = np.array(back[::-1] + [top] + front)
    sm = full.copy()
    for _ in range(5):
        pad = np.pad(sm, ((1, 1), (0, 0)), mode='edge')
        sm = 0.25 * pad[:-2] + 0.5 * pad[1:-1] + 0.25 * pad[2:]
    sm[0] = full[0]; sm[-1] = full[-1]
    rad = np.full(len(sm), 0.038)
    rad[:2] *= np.array([0.8, 0.95]); rad[-2:] *= np.array([0.95, 0.8])
    v, f = tube(sm, rad, nseg=20, cap=True)
    J, W = skin_from_body(ctx, v)
    wool = srgb((110, 106, 98))
    C = np.tile(wool, (len(v), 1)) * (0.8 + 0.4 * fbm(v, 70.0, 3, sp.seed + 100)[:, None])
    # dark stripes (US blanket) and the gum-blanket outer layer on the lower half
    out = [part('blanket_roll', 'wool_blanket', v, f, J, W, C=C)]
    return out


# ----------------------------------------------------------------------------- the rifle (Enfield P1853: 55 in overall, 39 in barrel, .577; Wikipedia / College Hill Arsenal)
def rifle_geometry(model='enfield'):
    """returns list of (name, material, V, F, colour) in rifle space: +z forward along the barrel axis (muzzle at +z), butt at z=0, y up (lock side -x)"""
    total = 55 * IN if model == 'enfield' else 56 * IN
    barrel_len = 39 * IN if model == 'enfield' else 40 * IN
    out = []
    # barrel (tapered, 3 bands, nose cap)
    z0 = total - barrel_len - 0.02
    path = np.array([[0, 0.0, z] for z in np.linspace(z0, total - 0.004, 24)])
    r = np.linspace(0.0175, 0.0135, 24)
    v, f = tube(path, r, nseg=14)
    out.append(('barrel', 'steel_barrel', v, f, srgb((96, 100, 108))))
    # stock: butt, wrist, fore-end
    pts = [(0.0, 0.0), (0.02, 0.0)]
    sec = []
    zs = np.linspace(0.0, total - 0.075, 40)
    ph = []
    for z in zs:
        # profile (height, width) along the stock
        if z < 0.20:      # butt: tall, tapering to the wrist
            hgt = 0.13 - 0.08 * (z / 0.20) ** 0.9
            wid = 0.028 + 0.004 * (1 - z / 0.20)
            cy = -0.035 * (1 - z / 0.20) * 0.8 - 0.0
        elif z < 0.38:    # wrist & lock
            hgt = 0.050 + 0.012 * np.sin((z - 0.20) / 0.18 * np.pi)
            wid = 0.033
            cy = -0.012
        else:             # fore-end
            hgt = 0.034 - 0.006 * (z - 0.38) / (total - 0.075 - 0.38)
            wid = 0.032 - 0.006 * (z - 0.38) / (total - 0.075 - 0.38)
            cy = -0.018
        ph.append((z, cy, hgt, wid))
    path = np.array([[0, p[1], p[0]] for p in ph])
    rad = np.array([[p[2] / 2, p[3] / 2] for p in ph])
    v, f = tube(path, rad, nseg=12)
    out.append(('stock', 'wood_walnut', v, f, srgb((104, 62, 34))))
    # barrel bands (iron) x3 and nose cap
    for zf in (0.60, 0.80, 0.97) if model == 'enfield' else (0.58, 0.78, 0.96):
        z = zf * total * 0.9 + 0.05
        bv, bf = tube(np.array([[0, -0.003, z - 0.011], [0, -0.003, z + 0.011]]), [0.0215, 0.0215], nseg=14)
        out.append(('band', 'steel_barrel', bv, bf, srgb((88, 92, 98))))
    nv, nf = tube(np.array([[0, -0.002, total - 0.06], [0, -0.002, total - 0.012]]), [0.019, 0.017], nseg=14)
    out.append(('nosecap', 'metal_brass' if model == 'enfield' else 'steel_barrel', nv, nf, srgb((176, 134, 56)) if model == 'enfield' else srgb((88, 92, 98))))
    # lock plate + hammer (left-hand side of the rifle is -x in rifle space? lock on the right side when butt down: use +x)
    lv, lf = rbox((0.017, -0.006, 0.36), (0.006, 0.034, 0.13), None, 0.003)
    out.append(('lock', 'steel_barrel', lv, lf, srgb((84, 88, 94))))
    hv, hf = rbox((0.017, 0.016, 0.318), (0.010, 0.040, 0.014), R.from_euler('x', -25, degrees=True), 0.003)
    out.append(('hammer', 'steel_barrel', hv, hf, srgb((70, 72, 78))))
    # trigger guard (brass) and butt plate (brass)
    tg, tgf = tube(np.array([[0, -0.052, 0.285], [0, -0.075, 0.30], [0, -0.078, 0.34], [0, -0.060, 0.385]]), [0.004, 0.004, 0.004, 0.004], nseg=8)
    out.append(('trigger_guard', 'metal_brass', tg, tgf, srgb((176, 134, 56))))
    bp, bpf = rbox((0, -0.04, 0.003), (0.034, 0.118, 0.006), R.from_euler('x', 6, degrees=True), 0.002)
    out.append(('butt_plate', 'metal_brass', bp, bpf, srgb((176, 134, 56))))
    # ramrod (steel) under the barrel
    rv, rf = tube(np.array([[0, -0.027, 0.42], [0, -0.027, total - 0.03]]), [0.0042, 0.0042], nseg=8)
    out.append(('ramrod', 'steel_barrel', rv, rf, srgb((100, 104, 112))))
    return out


def rifle_parts(ctx, rot, pos, bone):
    """place the rifle: rot (scipy Rotation, rifle->body space), pos (butt position); skinned rigidly to the right hand bone"""
    out = []
    for name, mat, v, f, col in rifle_geometry(ctx.spec.rifle):
        vv = rot.apply(v) + pos
        J, W = rigid_skin(len(vv), ctx.bi(bone))
        out.append(part('rifle_' + name, mat, vv, f, J, W, C=np.tile(col, (len(vv), 1)) * (0.85 + 0.3 * fbm(vv, 55.0, 2, 4)[:, None])))
    return out


# ----------------------------------------------------------------------------- assembly
def make_all(ctx, gear=True):
    parts = [make_body(ctx)] + eyes(ctx) + hair_and_beard(ctx)
    if not gear:
        return parts
    parts += shirt_front(ctx)
    parts += sack_coat(ctx)
    parts += trousers(ctx)
    parts += patch_parts(ctx)
    br = brogans(ctx)
    parts += [p for p in br if p['name'].startswith('brogan')]
    sole_parts = [p for p in br if p['name'].startswith('sole')]
    V_, F_ = merge([(p['V'], p['F']) for p in sole_parts])
    parts.append(part('soles', 'leather_sole', V_, F_, np.concatenate([p['J'] for p in sole_parts]), np.concatenate([p['W'] for p in sole_parts]), C=np.concatenate([p['C'] for p in sole_parts])))
    parts += forage_cap(ctx)
    sp = ctx.spec
    g = set(sp.gear)
    if 'belt' in g:
        parts += belt_and_plate(ctx)
    if 'cartridge_box' in g:
        parts += cartridge_box(ctx)
    if 'cap_pouch' in g:
        parts += cap_pouch(ctx)
    if 'bayonet' in g:
        parts += bayonet_scabbard(ctx)
    if 'canteen' in g:
        parts += canteen_and_strap(ctx)
    if 'haversack' in g:
        parts += haversack(ctx)
    if 'blanket_roll' in g:
        parts += blanket_roll(ctx)
    parts += rifle_in_hand(ctx)
    return parts


def right_arm_pose(ctx):
    """'right shoulder shift' (Hardee, Rifle and Light Infantry Tactics: piece carried on the right shoulder, right hand at the butt, barrel to the rear).
    Returns (global rotations of upper arm, forearm, hand relative to the spine frame, rifle axis, butt position) -- all in the REST body frame."""
    from retarget import swing
    h = ctx.heads
    sh, el0, wr0 = h['upperarm01.R'], h['lowerarm01.R'], h['wrist.R']
    L_up = np.linalg.norm(el0 - sh)
    L_fo = np.linalg.norm(wr0 - el0)
    d_up = np.array([-0.16, -0.93, 0.28]); d_up /= np.linalg.norm(d_up)
    d_fo = np.array([0.20, -0.10, 0.97]); d_fo /= np.linalg.norm(d_fo)
    ur = swing(el0 - sh, d_up)
    fr = swing(wr0 - el0, d_fo)
    d_hand = d_fo + np.array([0.0, 0.18, 0.0]); d_hand /= np.linalg.norm(d_hand)
    hr = swing(h['finger3-1.R'] - wr0, d_hand)
    p_el = sh + d_up * L_up
    p_wr = p_el + d_fo * L_fo
    ax = np.array([-0.04, 0.60, -0.80]); ax /= np.linalg.norm(ax)      # butt -> muzzle: up and BACK across the shoulder
    pos = p_wr + np.array([0.012, -0.095, 0.075])
    return dict(ur=ur, fr=fr, hr=hr, p_wr=p_wr, ax=ax, pos=pos)


def rifle_in_hand(ctx):
    P = right_arm_pose(ctx)
    z = P['ax']
    x = np.cross([0, 1, 0], z); x /= np.linalg.norm(x)
    y = np.cross(z, x)
    rot = R.from_matrix(np.stack([x, y, z], 1))
    wr0 = ctx.heads['wrist.R']
    out = []
    for name, mat, v, f, col in rifle_geometry(ctx.spec.rifle):
        posed = rot.apply(v) + P['pos']
        rest = wr0 + P['hr'].inv().apply(posed - P['p_wr'])          # un-pose into bind space so skinning lands it in the carry pose
        J, W = rigid_skin(len(rest), ctx.bi('wrist.R'))
        out.append(part('rifle_' + name, mat, rest, f, J, W, C=np.tile(col, (len(rest), 1)) * (0.85 + 0.3 * fbm(rest, 55.0, 2, 4)[:, None])))
    return out


def carry_pose(rt, ctx):
    """hold the right arm in the carry pose for the whole cycle (relative to the spine, so it follows torso motion); left arm and legs keep the mocap swing"""
    P = right_arm_pose(ctx)
    for b in ('upperarm01.R', 'upperarm02.R'):
        rt.overrides[b] = (lambda G, r=P['ur']: G['spine01'] * r)
    for b in ('lowerarm01.R', 'lowerarm02.R'):
        rt.overrides[b] = (lambda G, r=P['fr']: G['spine01'] * r)
    rt.overrides['wrist.R'] = (lambda G, r=P['hr']: G['spine01'] * r)
