"""Retarget CMU ASF/AMC walking data onto the MakeHuman 'default' skeleton (direction-matching swing for limbs,
fractional local-rotation transfer for the spine/neck chain), build a seamless in-place loop, export per-bone quaternions."""
import numpy as np
from scipy.spatial.transform import Rotation as R, Slerp
import cmu, mhlib

SIDES = {'L': 'l', 'R': 'r'}


def swing(a, b):
    """shortest rotation taking direction a onto direction b"""
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    c = float(np.clip(np.dot(a, b), -1, 1))
    ax = np.cross(a, b)
    n = np.linalg.norm(ax)
    if n < 1e-9:
        if c > 0:
            return R.identity()
        p = np.cross(a, [1, 0, 0])
        if np.linalg.norm(p) < 1e-6:
            p = np.cross(a, [0, 1, 0])
        return R.from_rotvec(np.pi * p / np.linalg.norm(p))
    return R.from_rotvec(ax / n * np.arccos(c))


def frac(r, f):
    return R.from_rotvec(r.as_rotvec() * f)


class Retargeter:
    def __init__(self, V_rest, skel, bones_cmu, parent_cmu):
        self.skel = skel
        self.H = mhlib.bone_heads(V_rest, skel)
        self.T = mhlib.bone_tails(V_rest, skel)
        self.bc, self.pc = bones_cmu, parent_cmu
        self.par = {b: v['parent'] for b, v in skel['bones'].items()}
        self.names = list(skel['bones'].keys())
        order, seen = [], set()

        def add(b):
            if b in seen:
                return
            if self.par[b]:
                add(self.par[b])
            seen.add(b)
            order.append(b)
        for b in self.names:
            add(b)
        self.order = order
        h = self.H

        def seg(s):
            c = SIDES[s]
            return [
                ([f'clavicle.{s}', f'shoulder01.{s}'], h[f'clavicle.{s}'], h[f'upperarm01.{s}'], f'{c}clavicle'),
                ([f'upperarm01.{s}', f'upperarm02.{s}'], h[f'upperarm01.{s}'], h[f'lowerarm01.{s}'], f'{c}humerus'),
                ([f'lowerarm01.{s}', f'lowerarm02.{s}'], h[f'lowerarm01.{s}'], h[f'wrist.{s}'], f'{c}radius'),
                ([f'wrist.{s}'], h[f'wrist.{s}'], h[f'finger3-1.{s}'], f'{c}hand'),
                ([f'upperleg01.{s}', f'upperleg02.{s}'], h[f'upperleg01.{s}'], h[f'lowerleg01.{s}'], f'{c}femur'),
                ([f'lowerleg01.{s}', f'lowerleg02.{s}'], h[f'lowerleg01.{s}'], h[f'foot.{s}'], f'{c}tibia'),
                ([f'foot.{s}'], h[f'foot.{s}'], self.T[f'foot.{s}'], f'{c}foot'),
            ]
        self.segs = seg('L') + seg('R')
        self.chain = [('spine05', 'lowerback', .5), ('spine04', 'lowerback', .5), ('spine03', 'upperback', 1.0),
                      ('spine02', 'thorax', .5), ('spine01', 'thorax', .5),
                      ('neck01', 'lowerneck', .5), ('neck02', 'lowerneck', .5), ('neck03', 'upperneck', 1.0),
                      ('head', 'head', 1.0)]
        L_mh = np.linalg.norm(h['upperleg01.L'] - h['foot.L'])
        L_cmu = bones_cmu['lfemur']['len'] + bones_cmu['ltibia']['len']
        self.scale = L_mh / L_cmu
        self.foot_off = {'L': 0.0, 'R': 0.0}
        self.sole_thickness = 0.017
        self.overrides = {}   # bone -> callable(G dict)->R  (global rotation) for hand-posed limbs

    def frame(self, fr, root_pos=None, override=None):
        o = cmu.fk(self.bc, self.pc, fr)
        Dg = {n: R.from_matrix(v[0]) for n, v in o.items()}

        def Dloc(n):
            return Dg[self.pc[n]].inv() * Dg[n] if n != 'root' else Dg['root']
        G = {'root': Dg['root']}
        chain_map = {b: (c, f) for b, c, f in self.chain}
        segmap = {}
        for bones, hd, tl, cname in self.segs:
            for b in bones:
                segmap[b] = (hd, tl, cname)
        segrot = {}
        if root_pos is not None:
            segrot.update(self.leg_ik(o, Dg['root'], root_pos, override))
        for b in self.order:
            p = self.par[b]
            if b == 'root':
                continue
            if b in self.overrides:
                G[b] = self.overrides[b](G)
            elif b in chain_map:
                c, f = chain_map[b]
                G[b] = G[p] * frac(Dloc(c), f)
            elif b in segmap and segmap[b][2] in o:
                hd, tl, cname = segmap[b]
                if cname not in segrot:
                    _, s, e = o[cname]
                    segrot[cname] = swing(tl - hd, e - s)
                G[b] = segrot[cname]
            else:
                G[b] = G[p]
        loc = {}
        for b in self.order:
            p = self.par[b]
            loc[b] = G[b] if p is None else G[p].inv() * G[b]
        return loc, o

    def ankle_target(self, o, Groot, root_pos, s_):
        c = SIDES[s_]
        hip_mh = root_pos + Groot.apply(self.H[f'upperleg01.{s_}'] - self.H['root'])
        return hip_mh + self.scale * (o[c + 'tibia'][2] - o[c + 'femur'][1])

    def leg_ik(self, o, Groot, root_pos, override=None):
        """plant the feet where the (leg-length scaled) mocap ankles are: 2-bone IK per leg with the mocap knee as pole vector"""
        h = self.H
        res = {}
        for s_ in ('L', 'R'):
            c = SIDES[s_]
            hip_mh = root_pos + Groot.apply(h[f'upperleg01.{s_}'] - h['root'])
            C_hip, C_knee, C_ank = o[c + 'femur'][1], o[c + 'femur'][2], o[c + 'tibia'][2]
            target = hip_mh + self.scale * (C_ank - C_hip)
            if override and s_ in override:
                target = override[s_]
            L1 = np.linalg.norm(h[f'lowerleg01.{s_}'] - h[f'upperleg01.{s_}'])
            L2 = np.linalg.norm(h[f'foot.{s_}'] - h[f'lowerleg01.{s_}'])
            v = target - hip_mh
            d = np.linalg.norm(v)
            d = np.clip(d, abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4)
            ax = v / np.linalg.norm(v)
            axc = (C_ank - C_hip) / np.linalg.norm(C_ank - C_hip)
            pv = (C_knee - C_hip) - axc * np.dot(C_knee - C_hip, axc)
            pole = pv / max(np.linalg.norm(pv), 1e-9)
            pole = pole - ax * np.dot(pole, ax)
            pole /= np.linalg.norm(pole)
            a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
            hh = np.sqrt(max(L1 * L1 - a * a, 0))
            knee = hip_mh + ax * a + pole * hh
            ankle = hip_mh + ax * d
            res[c + 'femur'] = swing(h[f'lowerleg01.{s_}'] - h[f'upperleg01.{s_}'], knee - hip_mh)
            res[c + 'tibia'] = swing(h[f'foot.{s_}'] - h[f'lowerleg01.{s_}'], ankle - knee)
            d_c = o[c + 'foot'][2] - o[c + 'foot'][1]
            res[c + 'foot'] = R.from_rotvec([self.foot_off[s_], 0, 0]) * swing(self.T[f'foot.{s_}'] - h[f'foot.{s_}'], d_c)
        return res


def calibrate_feet(rt, seg):
    """the mocap subject's flat-foot pitch differs from the MakeHuman foot's rest slope (ankle-to-ball vector); measure both and store the correction.
    Flat-foot frames = ball-of-foot and toe-tip both within 1.5 cm of their lowest value over the segment."""
    for s_ in ('L', 'R'):
        c = SIDES[s_]
        ball_y, toe_y, pitch = [], [], []
        for fr in seg:
            o = cmu.fk(rt.bc, rt.pc, fr)
            a, e = o[c + 'foot'][1], o[c + 'foot'][2]
            t = o[c + 'toes'][2]
            ball_y.append(e[1]); toe_y.append(t[1])
            d = e - a
            pitch.append(np.arctan2(-d[1], np.hypot(d[0], d[2])))
        ball_y, toe_y, pitch = np.array(ball_y), np.array(toe_y), np.array(pitch)
        flat = (ball_y < ball_y.min() + 0.015) & (toe_y < toe_y.min() + 0.015)
        if flat.sum() < 3:
            flat = ball_y < ball_y.min() + 0.02
        p_c = float(pitch[flat].mean())
        dm = rt.T[f'foot.{s_}'] - rt.H[f'foot.{s_}']
        p_m = float(np.arctan2(-dm[1], np.hypot(dm[0], dm[2])))
        rt.foot_off[s_] = p_m - p_c
        rt.foot_flat_frames = getattr(rt, 'foot_flat_frames', {})
        rt.foot_flat_frames[s_] = int(flat.sum())


def build_clip(rt, frames, fps_src=120, fps_out=30, loop_seconds=(0.9, 1.5)):
    """in-place looping clip -> dict(times, rot (T,nb,4 xyzw), root (T,3) offsets, speed m/s ...)"""
    feat = []
    for fr in frames:
        o = cmu.fk(rt.bc, rt.pc, fr)
        root = o['root'][1]
        feat.append(np.concatenate([(o[n][2] - root) for n in ('lfoot', 'rfoot', 'ltibia', 'rtibia', 'lhumerus', 'rhumerus', 'lradius', 'rradius')]))
    feat = np.array(feat)
    n = len(frames)
    best = (1e9, 0, 0)
    for i in range(0, n // 3):
        for j in range(i + int(loop_seconds[0] * fps_src), min(n, i + int(loop_seconds[1] * fps_src))):
            d = np.linalg.norm(feat[i] - feat[j])
            if d < best[0]:
                best = (d, i, j)
    _, i0, i1 = best
    seg = frames[i0:i1]
    T_src = len(seg)
    calibrate_feet(rt, seg)
    dur = T_src / fps_src
    Tout = int(round(dur * fps_out))
    rt_fps = float(fps_out)
    times = np.arange(Tout) / fps_out
    idx = np.clip(np.round(times * fps_src).astype(int), 0, T_src - 1)
    names = rt.names
    rootp0 = np.array(seg[0]['root'][:3]) * cmu.SC
    roots = np.array([np.array(seg[k]['root'][:3]) * cmu.SC - rootp0 for k in idx])
    endp = np.array(seg[-1]['root'][:3]) * cmu.SC - rootp0
    disp = endp + (roots[1] - roots[0])          # one full cycle displacement
    speed = np.hypot(disp[0], disp[2]) / dur
    t = (np.arange(Tout) / Tout)[:, None]
    roots_ip = roots - t * np.array([disp[0], 0, disp[2]])
    roots_ip[:, 0] *= rt.scale
    roots_ip[:, 2] *= rt.scale
    # vertical: hip-midpoint height of the mocap subject scaled to this body -> pelvis height
    hipmid = []
    for k in idx:
        o = cmu.fk(rt.bc, rt.pc, seg[k])
        hipmid.append(0.5 * (o['lfemur'][1] + o['rfemur'][1])[1])
    hipmid = np.array(hipmid)
    H = rt.H
    hip_rest_y = 0.5 * (H['upperleg01.L'][1] + H['upperleg01.R'][1])
    root_rest = H['root']
    # ---- pass A: root poses, free ankle targets, flat-foot contact flags from the mocap
    probes, Grs, free, flat = [], [], {'L': [], 'R': []}, {'L': [], 'R': []}
    cmu_o = [cmu.fk(rt.bc, rt.pc, seg[k]) for k in idx]
    ball_min = {s_: min(o[SIDES[s_] + 'foot'][2][1] for o in cmu_o) for s_ in 'LR'}
    toe_min = {s_: min(o[SIDES[s_] + 'toes'][2][1] for o in cmu_o) for s_ in 'LR'}
    for kk, k in enumerate(idx):
        o = cmu_o[kk]
        Gr = R.from_matrix(o['root'][0])
        probe = np.array([root_rest[0] + roots_ip[kk, 0], root_rest[1], root_rest[2] + roots_ip[kk, 2]])
        hip_now = 0.5 * ((probe + Gr.apply(H['upperleg01.L'] - H['root'])) + (probe + Gr.apply(H['upperleg01.R'] - H['root'])))
        probe[1] += rt.scale * hipmid[kk] + rt.sole_thickness - hip_now[1]
        roots_ip[kk, 1] = probe[1] - root_rest[1]
        probes.append(probe); Grs.append(Gr)
        for s_ in 'LR':
            free[s_].append(rt.ankle_target(o, Gr, probe, s_))
            c = SIDES[s_]
            flat[s_].append(bool(o[c + 'foot'][2][1] < ball_min[s_] + 0.02 and o[c + 'toes'][2][1] < toe_min[s_] + 0.02))
    # ---- foot lock: during flat-foot contact the ankle is pinned in the GROUND frame (no skating) at the sole height
    gvel = -np.array([disp[0], 0, disp[2]]) * rt.scale / dur          # ground velocity in the in-place frame
    sole_t = rt.sole_thickness
    ank_rest_y = 0.5 * (H['foot.L'][1] + H['foot.R'][1])
    lock = {}
    for s_ in 'LR':
        f = np.array(flat[s_])
        # circular runs
        n = len(f)
        if f.all() or not f.any():
            continue
        start = int(np.argmin(f))      # a non-flat frame to begin from
        order_ = [(start + i) % n for i in range(n)]
        runs, cur = [], []
        for i in order_:
            if f[i]:
                cur.append(i)
            elif cur:
                runs.append(cur); cur = []
        if cur:
            runs.append(cur)
        for run in runs:
            # time unwrapped relative to the first frame of the run
            tt = np.array([((i - run[0]) % n) / rt_fps for i in run])
            q = np.array([free[s_][i] - gvel * t_ for i, t_ in zip(run, tt)])
            ql = q.mean(0)
            ql[1] = ank_rest_y + sole_t
            for i, t_ in zip(run, tt):
                lock[(i, s_)] = (1.0, ql + gvel * t_)
            # 2-frame ramps either side
            for r_ in (1, 2):
                wgt = 1.0 - r_ / 3.0
                for i, side in ((run[0] - r_, -1), (run[-1] + r_, 1)):
                    i = i % n
                    if (i, s_) in lock:
                        continue
                    t_ = (((i - run[0]) % n) / rt_fps) if side > 0 else (-r_ / rt_fps)
                    lock[(i, s_)] = (wgt, ql + gvel * t_)
    rots = []
    for kk, k in enumerate(idx):
        ov = {}
        for s_ in 'LR':
            if (kk, s_) in lock:
                w, p_ = lock[(kk, s_)]
                ov[s_] = free[s_][kk] * (1 - w) + p_ * w
        loc, o2 = rt.frame(seg[k], root_pos=probes[kk], override=ov)
        rots.append(np.array([loc[b_].as_quat() for b_ in names]))
    rots = np.array(rots)
    nb = max(2, Tout // 8)
    for m in range(nb):
        w = (m + 1) / (nb + 1) * 0.5
        k = Tout - nb + m
        for bi in range(len(names)):
            a = R.from_quat(rots[k, bi])
            b = R.from_quat(rots[0, bi])
            rots[k, bi] = Slerp([0, 1], R.concatenate([a, b]))([w]).as_quat()[0]
        roots_ip[k] = roots_ip[k] * (1 - w) + roots_ip[0] * w
    return dict(times=times, rot=rots, root=roots_ip, speed=speed * rt.scale, src=(i0, i1), dur=dur, names=names, loopdist=best[0], fps=fps_out)
