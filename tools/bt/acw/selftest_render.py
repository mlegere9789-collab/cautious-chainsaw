#!/usr/bin/env python3
"""Decoder self-test (LOCAL VERIFICATION ONLY): assembles a decoded variant_weighted_mesh in the recovered rest pose with its textures and writes a static GLB to a scratch directory
OUTSIDE the app, for a headless render with render_glb.mjs. The meshes used here are base-game-derived (excluded by policy) and the output is never committed or shipped.
  python3 -I tools/bt/acw/selftest_render.py --extract <files dir> --out-dir <scratch dir> --mesh Models_FX1/acw_models/Unitmodels/Union/union_infantry2_lod1.variant_weighted_mesh --tex Models_FX1/acw_models/Unitmodels/Union/Textures/union_inf_diffuse.dds
  node tools/bt/acw/render_glb.mjs <glb> <png> front side back   (needs three r160 from `npm pack three@0.160.0`, path in THREE env, playwright chromium; software GL)"""
import argparse, glob, io, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vwm, bindpose, dds, glbw

ap = argparse.ArgumentParser(); ap.add_argument('--extract', required=True); ap.add_argument('--out-dir', required=True); ap.add_argument('--mesh', required=True); ap.add_argument('--tex', required=True); a = ap.parse_args()
if os.path.abspath(a.out_dir).replace('\\', '/').find('docs/battle-theatre') >= 0: raise SystemExit('refusing to write self-test output into the repository')
paths = [p for p in glob.glob(os.path.join(a.extract, 'Models_FX*/**/*.variant_weighted_mesh'), recursive=True) if '.svn' not in p and 'euro_equipment' not in p]
M = bindpose.solve(paths); W = bindpose.world_frame(M); m = vwm.parse(open(os.path.join(a.extract, a.mesh), 'rb').read())
g = glbw.GLB(); im, _ = dds.read_dds(os.path.join(a.extract, a.tex)); buf = io.BytesIO(); Image.fromarray(im[..., :3]).save(buf, 'png'); ii = g.image(buf.getvalue(), 'image/png'); ti = g.texture(ii, 'image/png')
g.j['materials'].append({'pbrMetallicRoughness': {'baseColorTexture': {'index': ti}, 'metallicFactor': 0, 'roughnessFactor': 0.9}, 'doubleSided': True}); prims = []
for me in m['meshes']:
    P = bindpose.mesh_positions(me, M, W); I = np.array(me['idx'], np.uint32).reshape(-1, 3); fn = np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]]); vn = np.zeros_like(P)
    for k in range(3): np.add.at(vn, I[:, k], fn)
    vn /= np.linalg.norm(vn, axis=1)[:, None] + 1e-12
    prims.append({'attributes': {'POSITION': g.accessor(P.astype(np.float32), 5126, 'VEC3', 34962, True), 'NORMAL': g.accessor(vn.astype(np.float32), 5126, 'VEC3', 34962), 'TEXCOORD_0': g.accessor(np.array([v[0] for v in me['verts']], np.float32), 5126, 'VEC2', 34962)}, 'indices': g.accessor(I.reshape(-1), 5125, 'SCALAR', 34963), 'material': 0})
g.j['meshes'].append({'primitives': prims}); g.j['nodes'].append({'mesh': 0}); g.j['scenes'][0]['nodes'] = [0]
os.makedirs(a.out_dir, exist_ok=True); out = os.path.join(a.out_dir, os.path.basename(a.mesh).split('.')[0] + '.glb'); open(out, 'wb').write(g.pack()); print(out, 'height', float(np.ptp(np.vstack([bindpose.mesh_positions(me, M, W) for me in m['meshes']])[:, 1])))
