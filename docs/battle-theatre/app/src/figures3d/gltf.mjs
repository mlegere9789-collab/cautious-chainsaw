// glTF 2.0 binary (.glb) export of a skinned figure (or any mesh set) for inspection in any glTF viewer. One mesh, one primitive per material slot, the rig as joint nodes (rest pose = A-pose, identity
// rotations), inverse bind matrices = translate(-head). Browser-safe (no node imports). Materials: baseColorFactor from the 64-row palette; names are the MAT slot names.
import { MAT_NAMES } from './palette.mjs';

const pad4 = n => (n + 3) & ~3;
export function buildGlb({ meshes, rig, palette, name = 'figure', roughness = null }) {
  // merge
  let nv = 0, ni = 0; for (const m of meshes) { nv += m.nv; ni += m.idx.length; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), jnt = new Uint8Array(nv * 4), wgt = new Float32Array(nv * 4), mat = new Uint8Array(nv), idx = new Uint32Array(ni);
  let vo = 0, io = 0; for (const m of meshes) { pos.set(m.pos, vo * 3); nrm.set(m.nrm, vo * 3); uv.set(m.uv, vo * 2); jnt.set(m.joints, vo * 4); wgt.set(m.weights, vo * 4); mat.set(m.mat, vo); for (let i = 0; i < m.idx.length; i++) idx[io + i] = m.idx[i] + vo; vo += m.nv; io += m.idx.length; }
  // group triangles by the material of their first vertex
  const groups = new Map(); for (let t = 0; t < ni; t += 3) { const mm = mat[idx[t]]; if (!groups.has(mm)) groups.set(mm, []); groups.get(mm).push(idx[t], idx[t + 1], idx[t + 2]); }
  const mats = [...groups.keys()].sort((a, b) => a - b);
  // binary buffer layout
  const chunks = []; let off = 0; const views = [], accs = [];
  const addView = (arr, target) => { const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength), o = pad4(off); chunks.push({ o, bytes }); off = o + bytes.length; views.push({ buffer: 0, byteOffset: o, byteLength: bytes.length, ...(target ? { target } : {}) }); return views.length - 1; };
  const acc = (view, comp, count, type, extra = {}) => { accs.push({ bufferView: view, componentType: comp, count, type, ...extra }); return accs.length - 1; };
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], pos[i * 3 + k]); hi[k] = Math.max(hi[k], pos[i * 3 + k]); }
  const aPos = acc(addView(pos, 34962), 5126, nv, 'VEC3', { min: lo, max: hi }), aNrm = acc(addView(nrm, 34962), 5126, nv, 'VEC3'), aUv = acc(addView(uv, 34962), 5126, nv, 'VEC2'), aJ = acc(addView(jnt, 34962), 5121, nv, 'VEC4'), aW = acc(addView(wgt, 34962), 5126, nv, 'VEC4');
  const prims = [], materials = [];
  for (const mm of mats) { const arr = Uint32Array.from(groups.get(mm)), a = acc(addView(arr, 34963), 5125, arr.length, 'SCALAR'); const c = palette ? palette[mm] || [128, 128, 128] : [128, 128, 128];
    materials.push({ name: MAT_NAMES[mm] ?? 'mat' + mm, pbrMetallicRoughness: { baseColorFactor: [srgb(c[0]), srgb(c[1]), srgb(c[2]), 1], metallicFactor: 0, roughnessFactor: roughness ? roughness[mm] ?? 0.8 : 0.8 }, doubleSided: true });
    prims.push({ attributes: { POSITION: aPos, NORMAL: aNrm, TEXCOORD_0: aUv, JOINTS_0: aJ, WEIGHTS_0: aW }, indices: a, material: materials.length - 1, mode: 4 }); }
  // skeleton
  const nodes = [], bones = rig.bones, ibm = new Float32Array(bones.length * 16);
  bones.forEach((b, i) => { nodes.push({ name: b.name, translation: b.local, children: [] }); const m = ibm.subarray(i * 16, i * 16 + 16); m[0] = m[5] = m[10] = m[15] = 1; m[12] = -b.head[0]; m[13] = -b.head[1]; m[14] = -b.head[2]; });
  bones.forEach((b, i) => { if (b.parent !== null) nodes[b.parent].children.push(i); }); for (const n of nodes) if (!n.children.length) delete n.children;
  const aIbm = acc(addView(ibm), 5126, bones.length, 'MAT4');
  nodes.push({ name: name + '_mesh', mesh: 0, skin: 0 }); const meshNode = nodes.length - 1; nodes.push({ name, children: [0, meshNode] });
  const json = { asset: { version: '2.0', generator: 'battle-theatre figures3d (procedural)' }, scene: 0, scenes: [{ nodes: [nodes.length - 1] }], nodes, meshes: [{ name, primitives: prims }], skins: [{ name: name + '_skin', inverseBindMatrices: aIbm, joints: bones.map((_, i) => i), skeleton: 0 }], materials, accessors: accs, bufferViews: views, buffers: [{ byteLength: pad4(off) }] };
  let js = JSON.stringify(json); js += ' '.repeat(pad4(js.length) - js.length); const jb = new TextEncoder().encode(js), total = 12 + 8 + jb.length + 8 + pad4(off), glb = new Uint8Array(total), dv = new DataView(glb.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, jb.length, true); dv.setUint32(16, 0x4e4f534a, true); glb.set(jb, 20);
  const bo = 20 + jb.length; dv.setUint32(bo, pad4(off), true); dv.setUint32(bo + 4, 0x004e4942, true); for (const c of chunks) glb.set(c.bytes, bo + 8 + c.o);
  return glb;
}
const srgb = v => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
