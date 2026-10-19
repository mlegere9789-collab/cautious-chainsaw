"""CMU Graphics Lab mocap (ASF/AMC) parser + forward kinematics (world-aligned rest frames).
Data: mocap.cs.cmu.edu (terms on the site: 'free for all uses', may be included in commercial products but not resold directly)."""
import numpy as np, re
SC = (1.0 / 0.45) * 2.54 / 100.0   # ASF length units (inches/0.45) -> metres, per CMU FAQ

def rx(a): c, s = np.cos(a), np.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def ry(a): c, s = np.cos(a), np.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def rz(a): c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def rot_xyz(ax, ay, az): return rz(az) @ ry(ay) @ rx(ax)     # x applied first (fixed axes), CMU/Acclaim convention

def parse_asf(path):
    txt = open(path, encoding='latin1').read().split('\n')
    bones = {}; hier = []; cur = None; sect = None
    for l in txt:
        l = l.strip()
        if l.startswith(':'): sect = l.split()[0]; continue
        if sect == ':bonedata':
            if l == 'begin': cur = {}
            elif l == 'end': bones[cur['name']] = cur; cur = None
            elif cur is not None and l:
                k, *v = l.split()
                if k == 'name': cur['name'] = v[0]
                elif k == 'direction': cur['dir'] = np.array(v[:3], float)
                elif k == 'length': cur['len'] = float(v[0]) * SC
                elif k == 'axis': cur['axis'] = np.radians(np.array(v[:3], float)); cur['axis_order'] = v[3] if len(v) > 3 else 'XYZ'
                elif k == 'dof': cur['dof'] = [d.lower() for d in v]
        elif sect == ':hierarchy':
            if l in ('begin', 'end') or not l: continue
            a = l.split(); hier.append((a[0], a[1:]))
    parent = {}
    for p, cs in hier:
        for c in cs: parent[c] = p
    return bones, parent

def parse_amc(path):
    frames = []; cur = None
    for l in open(path, encoding='latin1'):
        l = l.strip()
        if not l or l[0] in '#:': continue
        a = l.split()
        if len(a) == 1 and a[0].isdigit():
            cur = {}; frames.append(cur)
        elif cur is not None:
            cur[a[0]] = [float(x) for x in a[1:]]
    return frames

def fk(bones, parent, frame):
    """returns {bone: (G (3x3 global rotation), start (3,), end (3,))} in metres; rest frame world aligned."""
    out = {}
    r = frame['root']; rootpos = np.array(r[:3]) * SC
    Groot = rot_xyz(*np.radians(r[3:6]))
    out['root'] = (Groot, rootpos, rootpos)
    def rec(name):
        for c, p in parent.items():
            if p == name and c in bones:
                b = bones[c]; Gp, _, pend = out[name]
                C = rot_xyz(*b['axis'])
                vals = frame.get(c, [])
                ang = np.zeros(3)
                for d, v in zip(b.get('dof', []), vals):
                    ang['xyz'.index(d[1])] = np.radians(v)
                M = rot_xyz(*ang)
                G = Gp @ C @ M @ C.T
                start = pend
                end = start + G @ (b['dir'] * b['len'])
                out[c] = (G, start, end)
                rec(c)
    rec('root')
    return out
