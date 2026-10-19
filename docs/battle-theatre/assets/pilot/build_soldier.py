"""Pilot: assemble one 20th Maine private (July 1863) from CC0 MakeHuman base + procedural 1863 Union kit + CMU walk.
usage: python build_soldier.py [--seed N] [--out path.glb] [--no-gear]
Everything not read from a source document is labelled in KIT below (Documented / Modelled / Unknown)."""
import sys, os, json, argparse
import numpy as np
from scipy.spatial.transform import Rotation as R
import mhlib, cmu, retarget, glb as glbmod
import garments, posing

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', '..', '..', '..', 'tmp', 'bt', 'assets', 'src_assets', 'cmu')


def vertex_normals(V, F):
    N = np.zeros_like(V)
    a, b, c = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    n = np.linalg.norm(N, axis=1, keepdims=True)
    return N / np.maximum(n, 1e-12)


def prepare(spec, gear=True, anim=True, verbose=True):
    """build body+kit parts and (optionally) the retargeted looping walk, fitted to the ground."""
    seed = spec.seed
    rng = np.random.default_rng(seed)
    V0, VT, groups, order = mhlib.load_obj()
    skel = mhlib.load_skeleton()
    quads = np.array([[p[0] for p in f] for f in groups['body']])
    body_idx = np.unique(quads.ravel())
    # body shape from MakeHuman macro targets, then uniform scale to the soldier's bare-foot stature
    V = mhlib.morph(V0, height=0.5, weight=spec.weight, muscle=spec.muscle, age=spec.age)
    h = V[body_idx, 1].max() - V[body_idx, 1].min()
    V = (V - np.array([0, V[body_idx, 1].min(), 0])) * (spec.stature_m / h)
    bone_names = list(skel['bones'].keys())
    heads = mhlib.bone_heads(V, skel)
    tails = mhlib.bone_tails(V, skel)
    parents = {b: v['parent'] for b, v in skel['bones'].items()}
    Jall, Wall = mhlib.skin_arrays(len(V), mhlib.load_weights(), bone_names)
    ctx = garments.Context(V=V, quads=quads, body_idx=body_idx, heads=heads, tails=tails, parents=parents, bone_names=bone_names,
                           J=Jall, W=Wall, groups=groups, rng=rng, spec=spec)
    parts = garments.make_all(ctx, gear=gear)
    out = dict(ctx=ctx, parts=parts, V=V, skel=skel, names=bone_names, heads=heads, parents=parents, clip=None)
    if anim:
        bc, pc = cmu.parse_asf(os.path.join(ASSETS, '35.asf'))
        fr = cmu.parse_amc(os.path.join(ASSETS, '35_01.amc'))
        rt = retarget.Retargeter(V, skel, bc, pc)
        so = [p for p in parts if p['name'] == 'soles']
        rt.sole_thickness = float(-so[0]['V'][:, 1].min()) if so else 0.0
        if gear:
            garments.carry_pose(rt, ctx)
        clip = retarget.build_clip(rt, fr)
        clip['name'] = 'walk_quick_time'
        clip['ground_shift_m'] = 0.0
        out['clip'] = clip
        out['rt'] = rt
        if verbose:
            print('clip frames', clip['rot'].shape[0], 'dur', round(clip['dur'], 3), 's  speed', round(clip['speed'], 3), 'm/s  loopdist', round(clip['loopdist'], 4), ' sole thickness', round(rt.sole_thickness, 4))
    return out


def build(spec, outpath='soldier.glb', gear=True, anim=True, verbose=True):
    pr = prepare(spec, gear, anim, verbose)
    parts, clip = pr['parts'], pr['clip']
    only = os.environ.get('BT_ONLY')
    if only:
        keep = tuple(only.split(','))
        parts = [p for p in parts if p['name'].startswith(keep)]
    g = glbmod.GLB()
    prims, names = [], []
    for p in parts:
        mat = g.material(p['material'], color=(1, 1, 1, 1), rough=0.9, metal=0.0)
        prims.append(g.primitive(p['V'], p['N'], p['F'], p['J'], p['W'], C=p.get('C'), mat=mat))
        names.append(p['name'])
    data = g.build(prims, names, pr['names'], pr['heads'], pr['parents'], anim=clip,
                   extras={'seed': spec.seed, 'stature_m': spec.stature_m, 'note': 'pilot, see PLAN.md'})
    with open(outpath, 'wb') as f:
        f.write(data)
    tri = sum(len(p['F']) for p in parts)
    if verbose:
        print('wrote', outpath, len(data) // 1024, 'KiB;', len(parts), 'parts;', tri, 'triangles')
    return {'speed': float(clip['speed']) if clip else 0.0, 'tris': int(tri), 'bytes': len(data), 'parts': [(p['name'], int(len(p['F']))) for p in parts]}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--out', default=os.path.join(HERE, '..', '..', '..', '..', 'tmp', 'bt', 'assets', 'out', 'soldier.glb'))
    ap.add_argument('--no-gear', action='store_true')
    ap.add_argument('--no-anim', action='store_true')
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    spec = garments.PILOT_SPEC if a.seed == 0 else garments.sample_spec(a.seed)
    m = build(spec, a.out, gear=not a.no_gear, anim=not a.no_anim)
    json.dump(m, open(a.out + '.json', 'w'))
