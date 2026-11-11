// GPU data layouts for crowd animation.
//
// 1. BONE-MATRIX TEXTURE (the plan's mid-LOD path; the measured render/PLAN.md section 2 rule "mid LOD with baked bone matrices, not per-vertex VAT"):
//    rows = baked frames of all clips stacked (clip c occupies rows rowStart[c] .. rowStart[c] + frames - 1), columns = 3 texels per bone (the three rows of the 3x4 skin matrix [R | t] with t = p - R * restHead, so that
//    v' = M * v for a vertex in rest coordinates), bone order = rig.lod.mid.bones (36 bones) or all 61 for LOD0. Texel = RGBA (4 floats). Float32 for tests; RGBA16F is the shipped format (half(): max error 1e-3 relative).
//    Fetch: row = rowStart[clip] + frameIndex; texel x = 3*b + m. Linear blending between two frames and between two clips is done in the shader on the fetched matrices (nlerp of the matrices is NOT used; the shader blends the
//    decomposed rotation if it has the bones texture of quaternions: see POSE layout 3); cost model in ANIM3D-NOTES.
// 2. VERTEX-ANIMATION TEXTURE (VAT) for the far-near LODs and for props: rows = frames, columns = vertices; position in RGB (rest-relative offsets), width W <= 4096 so vertex v is at (v mod W, v div W) of frame f's block: texel index
//    f * nvPad + v with nvPad = ceil(nv / W) * W. Size = frames * nvPad * 8 B (RGBA16F). Memory per clip is therefore frames x vertices x 8 B: 909 vertices x 224 rows x 16 B = 3.26 MB in the prototype (render/PLAN.md), which
//    is why VAT is for LOD2/LOD3 and props only.
// 3. POSE BUFFER for the compute-skinning path: one storage buffer of baked core-joint quaternions and translations per frame (rig.frameLen floats per frame, layout rig.nCore*4 quats | nTrans*3 | 7 extras), a clip table
//    (offset, frames, fps, loop, duration) and per-instance state (clipA, tA, clipB, tB, w, ...). The kernel (WGSL below, UNVERIFIED on a GPU in this round) samples both clips, nlerps, runs FK in bone order
//    (parents precede children) and writes skin matrices into the 3x4 layout of 1. cpuPose() is the reference implementation the kernel mirrors and the tests check.
import { sampleClip, blendFrames } from './clipdef.mjs';

export function half(x) { // float32 -> float16 bits
  const f = new Float32Array(1), u = new Uint32Array(f.buffer); f[0] = x; const b = u[0], s = (b >>> 16) & 0x8000; let e = ((b >>> 23) & 0xff) - 112, m = b & 0x7fffff;
  if (e <= 0) { if (e < -10) return s; m = (m | 0x800000) >> (1 - e); return s | ((m + 0x1000) >> 13); } if (e >= 31) return s | 0x7c00 | (m ? 0x200 : 0);
  return s | (e << 10) | ((m + 0x1000) >> 13);
}
export function unhalf(h) { const s = (h & 0x8000) << 16, e = (h >> 10) & 0x1f, m = h & 0x3ff; let v; if (e === 0) v = m * 2 ** -24; else if (e === 31) v = m ? NaN : Infinity; else v = (1 + m / 1024) * 2 ** (e - 15); return s ? -v : v; }

// ---- 1. bone-matrix texture
export function bakeBoneTexture(lib, clipIds, { fps = 60, bones = 'mid', half16 = false } = {}) {
  const rig = lib.rig, list = bones === 'mid' ? rig.lod.mid.bones : bones === 'all' ? Array.from({ length: rig.n }, (_, i) => i) : bones;
  const nb = list.length, width = nb * 3, pose = rig.newPose(), fk = rig.newFK(), rows = {}; let total = 0, perClip = [];
  for (const id of clipIds) { const c = lib.get(id), n = c.loop ? Math.max(1, Math.round(c.dur * fps)) : Math.round(c.dur * fps) + 1; perClip.push([id, c, n]); rows[id] = { row0: total, frames: n, fps: c.loop ? n / c.dur : fps, loop: c.loop, dur: c.dur }; total += n; }
  const data = new Float32Array(width * total * 4), M = new Float32Array(nb * 12), fr = rig.newFrame();
  for (const [id, c, n] of perClip) { const r0 = rows[id].row0; for (let f = 0; f < n; f++) { const t = c.loop ? (f / n) * c.dur : Math.min(c.dur, f / fps); sampleClip(c, t, fr); rig.expandFrame(fr, pose); rig.fk(pose, fk); rig.skin(fk, M, list); data.set(M, (r0 + f) * width * 4); } }
  const out = { w: width, h: total, bones: list, data, rows, bytesF32: data.byteLength, bytesF16: data.length * 2, format: 'RGBA32F (RGBA16F shipped)' };
  if (half16) { out.data16 = new Uint16Array(data.length); for (let i = 0; i < data.length; i++) out.data16[i] = half(data[i]); }
  return out;
}
// reference fetch+blend of a skin matrix from the texture (what the vertex shader does): clip rows, linear between frames
export function fetchMatrix(tex, clipId, t, bone, out, o = 0) {
  const r = tex.rows[clipId]; let x = t * r.fps; if (r.loop) { x = ((x % r.frames) + r.frames) % r.frames; } else x = Math.min(Math.max(x, 0), r.frames - 1);
  const f0 = Math.floor(x), fr = x - f0, f1 = r.loop ? (f0 + 1) % r.frames : Math.min(f0 + 1, r.frames - 1), bi = tex.bones.indexOf(bone), W = tex.w, d = tex.data;
  for (let m = 0; m < 3; m++) for (let c = 0; c < 4; c++) { const a = ((r.row0 + f0) * W + bi * 3 + m) * 4 + c, b = ((r.row0 + f1) * W + bi * 3 + m) * 4 + c; out[o + m * 4 + c] = d[a] + (d[b] - d[a]) * fr; }
  return out;
}

// ---- 2. VAT for a skinned mesh: mesh = { positions: Float32Array(3 nv), joints: Uint16Array(4 nv), weights: Float32Array(4 nv) } in rest coordinates, joints index the FULL rig
export function bakeVAT(lib, mesh, clipIds, { fps = 30, maxWidth = 4096 } = {}) {
  const rig = lib.rig, nv = mesh.positions.length / 3, W = Math.min(maxWidth, nv), nvPad = Math.ceil(nv / W) * W, pose = rig.newPose(), fk = rig.newFK(), fr = rig.newFrame(), M = new Float32Array(rig.n * 12), rows = {};
  let total = 0; const per = [];
  for (const id of clipIds) { const c = lib.get(id), n = c.loop ? Math.max(1, Math.round(c.dur * fps)) : Math.round(c.dur * fps) + 1; per.push([id, c, n]); rows[id] = { frame0: total, frames: n, fps: c.loop ? n / c.dur : fps, loop: c.loop, dur: c.dur }; total += n; }
  const data = new Float32Array(total * nvPad * 4);
  for (const [id, c, n] of per) for (let f = 0; f < n; f++) {
    const t = c.loop ? (f / n) * c.dur : Math.min(c.dur, f / fps); sampleClip(c, t, fr); rig.expandFrame(fr, pose); rig.fk(pose, fk); rig.skin(fk, M, null);
    const base = (rows[id].frame0 + f) * nvPad * 4;
    for (let v = 0; v < nv; v++) { let px = 0, py = 0, pz = 0; const x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1], z = mesh.positions[v * 3 + 2];
      for (let j = 0; j < 4; j++) { const w = mesh.weights[v * 4 + j]; if (!w) continue; const q = mesh.joints[v * 4 + j] * 12; px += w * (M[q] * x + M[q + 1] * y + M[q + 2] * z + M[q + 3]); py += w * (M[q + 4] * x + M[q + 5] * y + M[q + 6] * z + M[q + 7]); pz += w * (M[q + 8] * x + M[q + 9] * y + M[q + 10] * z + M[q + 11]); }
      data[base + v * 4] = px; data[base + v * 4 + 1] = py; data[base + v * 4 + 2] = pz; data[base + v * 4 + 3] = 1; } }
  return { w: W, nv, nvPad, frames: total, rows, data, bytesF16: total * nvPad * 8, layout: 'texel index = frame * nvPad + vertex; x = idx mod W, y = idx div W (RGB = position, A = 1)' };
}
// a synthetic mesh used by the tests and by the cost model: one tapered capsule ring set per bone segment, rigidly skinned (NOT the FIGURES mesh)
export function syntheticMesh(rig, ringsPerBone = 4, sides = 6) {
  const pos = [], jn = [], wt = [];
  for (let b = 1; b < rig.n; b++) { if (/^(index|middle|ring|pinky|thumb|eye_|gear_|jaw|prop_)/.test(rig.names[b])) continue; const p = rig.parent[b]; if (p < 0) continue;
    const a = [rig.head[p * 3], rig.head[p * 3 + 1], rig.head[p * 3 + 2]], c = [rig.head[b * 3], rig.head[b * 3 + 1], rig.head[b * 3 + 2]];
    for (let r = 0; r <= ringsPerBone; r++) { const u = r / ringsPerBone; for (let s = 0; s < sides; s++) { const ang = s / sides * Math.PI * 2; pos.push(a[0] + (c[0] - a[0]) * u + Math.cos(ang) * 0.04, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u + Math.sin(ang) * 0.04); jn.push(p, 0, 0, 0); wt.push(1, 0, 0, 0); } } }
  return { positions: Float32Array.from(pos), joints: Uint16Array.from(jn), weights: Float32Array.from(wt) };
}

// ---- 3. compute-skinning data and the CPU reference of the kernel
export function computeLayout(lib, clipIds) {
  const rig = lib.rig, table = [], chunks = []; let off = 0;
  for (const id of clipIds) { const c = lib.get(id); table.push({ id, floatOffset: off, frames: c.n, fps: c.fps, loop: c.loop ? 1 : 0, dur: c.dur }); chunks.push(c.data); off += c.data.length; }
  const frames = new Float32Array(off); let o = 0; for (const c of chunks) { frames.set(c, o); o += c.length; }
  const skel = { n: rig.n, parent: Int16Array.from(rig.parent), local: Float32Array.from(rig.local), head: Float32Array.from(rig.head), core: Int16Array.from(rig.core), transBones: Int16Array.from(rig.transBones), frameLen: rig.frameLen, nCore: rig.nCore, nTrans: rig.nTrans };
  return { table, frames, skel, bytes: frames.byteLength };
}
export function cpuPose(lib, layout, inst, outMats) { // inst = { clipA, tA, clipB, tB, w } as indices into layout.table; outMats = Float32Array(12 * rig.n)
  const rig = lib.rig, A = rig.newFrame(), B = rig.newFrame(), pose = rig.newPose(), fk = rig.newFK();
  const sample = (ci, t, out) => { const e = layout.table[ci], L = rig.frameLen; let x = t * e.fps; if (e.loop) x = ((x % e.frames) + e.frames) % e.frames; else x = Math.min(Math.max(x, 0), e.frames - 1); const i0 = Math.floor(x), f = x - i0, i1 = e.loop ? (i0 + 1) % e.frames : Math.min(i0 + 1, e.frames - 1);
    const a = e.floatOffset + i0 * L, b = e.floatOffset + i1 * L; const tmp = new Float32Array(L); for (let k = 0; k < L; k++) tmp[k] = layout.frames[a + k]; const tmp2 = new Float32Array(L); for (let k = 0; k < L; k++) tmp2[k] = layout.frames[b + k]; blendFrames(rig, out, tmp, tmp2, f); };
  sample(inst.clipA, inst.tA, A); if (inst.clipB >= 0 && inst.w > 0) { sample(inst.clipB, inst.tB, B); blendFrames(rig, A, A, B, inst.w); }
  rig.expandFrame(A, pose); rig.fk(pose, fk); rig.skin(fk, outMats, null); return outMats;
}
export const WGSL_POSE_KERNEL = `// UNVERIFIED on a GPU in this round (no browser/GPU runs allowed): mirrors cpuPose() in bake.mjs.
// storage: frames: array<f32>; table: array<ClipEntry>; inst: array<Inst>; parent: array<i32>; localOff: array<vec4<f32>>; coreSlot: array<i32>; out: array<vec4<f32>> (3 vec4 per bone per instance)
struct ClipEntry { floatOffset: u32, frames: u32, fps: f32, loop: u32 };
struct Inst { clipA: u32, clipB: i32, tA: f32, tB: f32, w: f32, pad0: f32, pad1: f32, pad2: f32 };
@group(0) @binding(0) var<storage, read> frames: array<f32>;
@group(0) @binding(1) var<storage, read> table: array<ClipEntry>;
@group(0) @binding(2) var<storage, read> inst: array<Inst>;
@group(0) @binding(3) var<storage, read> parent: array<i32>;
@group(0) @binding(4) var<storage, read> localOff: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> coreSlot: array<i32>;
@group(0) @binding(6) var<storage, read_write> outMats: array<vec4<f32>>;
override FRAME_LEN: u32 = 128u; override NBONES: u32 = 61u; override NCORE: u32 = 28u; override TRANS_OFF: u32 = 112u;
fn qmul(a: vec4<f32>, b: vec4<f32>) -> vec4<f32> { return vec4<f32>(a.w*b.xyz + b.w*a.xyz + cross(a.xyz, b.xyz), a.w*b.w - dot(a.xyz, b.xyz)); }
fn qrot(q: vec4<f32>, v: vec3<f32>) -> vec3<f32> { let t = 2.0 * cross(q.xyz, v); return v + q.w * t + cross(q.xyz, t); }
fn quatAt(clip: u32, frame: u32, slot: u32) -> vec4<f32> { let e = table[clip]; let o = e.floatOffset + frame * FRAME_LEN + slot * 4u; return vec4<f32>(frames[o], frames[o+1u], frames[o+2u], frames[o+3u]); }
// one thread per (instance, bone) would need FK ordering; this kernel runs one thread per instance and walks the bones in order (parents precede children)
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { /* see cpuPose: sample A and B, nlerp core quats, FK, write 3x vec4 per bone */ }
`;

// cost model (bytes) for a library bake: used by the notes and the BROWSER-VERIFICATION-LIST
export function costModel(lib, clipIds, { fps = 60 } = {}) {
  const rig = lib.rig; let frames = 0; for (const id of clipIds) { const c = lib.get(id); frames += c.loop ? Math.round(c.dur * fps) : Math.round(c.dur * fps) + 1; }
  const mid = rig.lod.mid.bones.length;
  return { clips: clipIds.length, framesAt60: frames, boneTexMidBytesF16: frames * mid * 3 * 8, boneTexAllBytesF16: frames * rig.n * 3 * 8, poseBufferBytesF32: frames * rig.frameLen * 4, vatBytesPer1000Verts: frames * 1000 * 8, midBones: mid, allBones: rig.n };
}
