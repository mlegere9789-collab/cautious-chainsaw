"""Minimal skinned-glTF 2.0 (.glb) writer for the pilot: multiple skinned primitives sharing one skeleton, one animation."""
import json, struct
import numpy as np


def _pad(b, ch=b'\x00'):
    return b + ch * ((-len(b)) % 4)


class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accs, self.meshes_prims, self.mats = [], [], [], []
        self.nodes, self.skins, self.anims = [], [], []

    def _view(self, data, target=None):
        off = len(self.bin)
        self.bin += _pad(bytes(data))
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
        if target:
            v['target'] = target
        self.views.append(v)
        return len(self.views) - 1

    def _acc(self, arr, ctype, atype, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr)
        vi = self._view(arr.tobytes(), target)
        a = {'bufferView': vi, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': atype}
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = [float(x) for x in arr.min(0)]
            a['max'] = [float(x) for x in arr.max(0)]
        self.accs.append(a)
        return len(self.accs) - 1

    def material(self, name, color=(1, 1, 1, 1), rough=0.9, metal=0.0, extras=None):
        m = {'name': name, 'pbrMetallicRoughness': {'baseColorFactor': list(color), 'roughnessFactor': rough, 'metallicFactor': metal}, 'doubleSided': True}
        if extras:
            m['extras'] = extras
        self.mats.append(m)
        return len(self.mats) - 1

    def primitive(self, V, N, F, J, W, C=None, mat=0, extra_attrs=None):
        at = {'POSITION': self._acc(V.astype('<f4'), 5126, 'VEC3', 34962, True),
              'NORMAL': self._acc(N.astype('<f4'), 5126, 'VEC3', 34962),
              'JOINTS_0': self._acc(J.astype('<u2'), 5123, 'VEC4', 34962),
              'WEIGHTS_0': self._acc(W.astype('<f4'), 5126, 'VEC4', 34962)}
        if C is not None:
            at['COLOR_0'] = self._acc(C.astype('<f4'), 5126, 'VEC3' if C.shape[1] == 3 else 'VEC4', 34962)
        for k, a in (extra_attrs or {}).items():
            at[k] = self._acc(a.astype('<f4').reshape(len(V), -1), 5126, {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}[a.reshape(len(V), -1).shape[1]], 34962)
        idx = self._acc(F.astype('<u4').reshape(-1), 5125, 'SCALAR', 34963)
        # SCALAR accessor needs shape (n,) count; fix count
        self.accs[idx]['count'] = int(F.size)
        return {'attributes': at, 'indices': idx, 'material': mat, 'mode': 4}

    def build(self, mesh_prims, mesh_names, skeleton_names, heads, parents, anim=None, extras=None):
        """mesh_prims: list of primitives (dict) one mesh each.  skeleton: bone names in the order used by JOINTS_0 indices."""
        nb = len(skeleton_names)
        bone_node = {b: i for i, b in enumerate(skeleton_names)}      # node index == bone index (first nb nodes)
        nodes = []
        for b in skeleton_names:
            p = parents[b]
            t = heads[b] - (heads[p] if p else np.zeros(3))
            n = {'name': b, 'translation': [float(x) for x in t], 'rotation': [0, 0, 0, 1]}
            nodes.append(n)
        for b in skeleton_names:
            p = parents[b]
            if p:
                nodes[bone_node[p]].setdefault('children', []).append(bone_node[b])
        ibm = np.zeros((nb, 4, 4), '<f4')
        for i, b in enumerate(skeleton_names):
            m = np.eye(4)
            m[:3, 3] = -heads[b]
            ibm[i] = m.T            # column-major
        ibm_acc = self._acc(ibm.reshape(nb, 16), 5126, 'MAT4')
        root_bone = [b for b in skeleton_names if not parents[b]][0]
        skin = {'joints': list(range(nb)), 'inverseBindMatrices': ibm_acc, 'skeleton': bone_node[root_bone]}
        meshes = []
        mesh_nodes = []
        for prim, nm in zip(mesh_prims, mesh_names):
            meshes.append({'name': nm, 'primitives': [prim]})
            nodes.append({'name': nm, 'mesh': len(meshes) - 1, 'skin': 0})
            mesh_nodes.append(len(nodes) - 1)
        scene_nodes = [bone_node[root_bone]] + mesh_nodes
        animations = []
        if anim is not None:
            times = anim['times'].astype('<f4')
            tacc = self._acc(times.reshape(-1, 1), 5126, 'SCALAR', None, False)
            self.accs[tacc]['min'] = [float(times.min())]
            self.accs[tacc]['max'] = [float(times.max())]
            samplers, channels = [], []
            for bi, b in enumerate(skeleton_names):
                q = anim['rot'][:, bi, :].astype('<f4')
                if np.allclose(q, q[0], atol=1e-6) and np.allclose(q[0], [0, 0, 0, 1], atol=1e-6):
                    continue
                a = self._acc(q, 5126, 'VEC4')
                samplers.append({'input': tacc, 'output': a, 'interpolation': 'LINEAR'})
                channels.append({'sampler': len(samplers) - 1, 'target': {'node': bi, 'path': 'rotation'}})
            tr = (anim['root'] + heads[root_bone]).astype('<f4')
            a = self._acc(tr, 5126, 'VEC3')
            samplers.append({'input': tacc, 'output': a, 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': bone_node[root_bone], 'path': 'translation'}})
            animations.append({'name': anim.get('name', 'walk'), 'samplers': samplers, 'channels': channels})
        gltf = {'asset': {'version': '2.0', 'generator': 'gettysburg battle-theatre asset pilot'},
                'scene': 0, 'scenes': [{'nodes': scene_nodes}], 'nodes': nodes, 'meshes': meshes, 'skins': [skin],
                'materials': self.mats, 'accessors': self.accs, 'bufferViews': self.views,
                'buffers': [{'byteLength': len(self.bin)}]}
        if animations:
            gltf['animations'] = animations
        if extras:
            gltf['asset']['extras'] = extras
        js = _pad(json.dumps(gltf, separators=(',', ':')).encode(), b' ')
        binc = bytes(self.bin)
        total = 12 + 8 + len(js) + 8 + len(binc)
        out = struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(binc), b'BIN\x00') + binc
        return out
