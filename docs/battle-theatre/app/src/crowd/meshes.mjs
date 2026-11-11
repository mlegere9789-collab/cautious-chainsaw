// MESH STORE: finalized figures3d meshes (pos, nrm, mat, joints, weights, flags, idx) packed into ONE growable vertex array and ONE growable index array (absolute indices), so that a draw is
// (firstIndex, indexCount) of the shared buffers, in WebGL2 (no baseVertex in core) and in WebGPU alike.
//   vertex, 28 bytes:  pos f32x3 (12) | normal snorm8x4 (4) | material u8, flag u8, 0, 0 (4) | joints u8x4 (4) | weights unorm8x4 (4)
// The GPU side asks `takeDirty()` for the byte ranges written since the last upload and re-creates its buffer when `version` grows (capacity doubling).
export const VERTEX_STRIDE = 28;
export class MeshStore {
  constructor(vcap = 1 << 20, icap = 1 << 21) { this.vcap = vcap; this.icap = icap; this.vb = new Uint8Array(vcap * VERTEX_STRIDE); this.ib = new Uint32Array(icap); this.nv = 0; this.ni = 0; this.version = 0; this.dirtyV = null; this.dirtyI = null; this.entries = new Map(); this.tris = 0; }
  _grow(needV, needI) {
    let g = false; if (this.nv + needV > this.vcap) { while (this.nv + needV > this.vcap) this.vcap *= 2; const n = new Uint8Array(this.vcap * VERTEX_STRIDE); n.set(this.vb.subarray(0, this.nv * VERTEX_STRIDE)); this.vb = n; g = true; }
    if (this.ni + needI > this.icap) { while (this.ni + needI > this.icap) this.icap *= 2; const n = new Uint32Array(this.icap); n.set(this.ib.subarray(0, this.ni)); this.ib = n; g = true; }
    if (g) { this.version++; this.dirtyV = [0, this.nv]; this.dirtyI = [0, this.ni]; }
  }
  // a finalized mesh ({nv, nt, pos, nrm, mat, joints, weights, flags, idx}); returns { firstIndex, indexCount, firstVertex, nv }
  add(key, m) {
    const hit = this.entries.get(key); if (hit) return hit; this._grow(m.nv, m.idx.length);
    const dv = new DataView(this.vb.buffer), v0 = this.nv;
    for (let i = 0; i < m.nv; i++) {
      const o = (v0 + i) * VERTEX_STRIDE; dv.setFloat32(o, m.pos[i * 3], true); dv.setFloat32(o + 4, m.pos[i * 3 + 1], true); dv.setFloat32(o + 8, m.pos[i * 3 + 2], true);
      for (let k = 0; k < 3; k++) dv.setInt8(o + 12 + k, Math.max(-127, Math.min(127, Math.round(m.nrm[i * 3 + k] * 127)))); dv.setInt8(o + 15, 0);
      this.vb[o + 16] = m.mat[i]; this.vb[o + 17] = m.flags ? m.flags[i] : 0; this.vb[o + 18] = 0; this.vb[o + 19] = 0;
      let ws = 0; for (let k = 0; k < 4; k++) ws += m.weights[i * 4 + k]; ws = ws || 1; let acc = 0, big = 0;
      for (let k = 0; k < 4; k++) { this.vb[o + 20 + k] = m.joints[i * 4 + k]; const q = Math.round(m.weights[i * 4 + k] / ws * 255); this.vb[o + 24 + k] = q; acc += q; if (m.weights[i * 4 + k] > m.weights[i * 4 + big]) big = k; }
      this.vb[o + 24 + big] += 255 - acc;                                    // the weights sum to exactly 255
    }
    const i0 = this.ni; for (let i = 0; i < m.idx.length; i++) this.ib[i0 + i] = m.idx[i] + v0;
    this.nv += m.nv; this.ni += m.idx.length; this.tris += m.idx.length / 3;
    const dV = this.dirtyV, dI = this.dirtyI; this.dirtyV = dV ? [Math.min(dV[0], v0), this.nv] : [v0, this.nv]; this.dirtyI = dI ? [Math.min(dI[0], i0), this.ni] : [i0, this.ni];
    const e = { firstIndex: i0, indexCount: m.idx.length, firstVertex: v0, nv: m.nv, tris: m.idx.length / 3 }; this.entries.set(key, e); return e;
  }
  takeDirty() { const d = { v: this.dirtyV, i: this.dirtyI, version: this.version }; this.dirtyV = this.dirtyI = null; return d; }
  get bytes() { return this.nv * VERTEX_STRIDE + this.ni * 4; }
}
