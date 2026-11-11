// WebGL2 backend of the figure pass. It draws through the prototype renderer's two hook points (R.ext.shadow / R.ext.scene, called with the frame block and the common textures already bound) and keeps its own
// textures on units 16..23 (the prototype uses 0..14). The frame's draw list is built by the Crowd on the CPU (crowd.mjs): every command is (program, bone texture, first index, index count, instance byte offset, instances).
import { HEAD, MID_VS, NEAR_VS, FIG_FS, NOFS, IMP_VS, IMP_FS } from './shaders-gl.mjs';
import { VERTEX_STRIDE } from './meshes.mjs';

const U = { bones: 16, pose: 17, inst: 18, varInfo: 19, varPal: 20, pal: 21, imp: 22, impMeta: 23 };
export class CrowdGL {
  constructor(host, crowd) { this.host = host; this.R = host.R; this.gl = host.R.gl; this.crowd = crowd; this.dead = false; this.mem = 0; this.meshVer = -1; this.tex = {}; this.stats = { draws: 0, tris: 0, instances: 0 }; }
  track(name, bytes) { this.mem += bytes; this.R.track('buffers', 'crowd.' + name, bytes); }
  init(S) {
    const gl = this.gl, R = this.R, H = HEAD; this.S = S;
    const P = this.P = {
      mid: R.prog('c-mid', H + MID_VS, H + FIG_FS), midS: R.prog('c-midS', H + MID_VS, NOFS), near: R.prog('c-near', H + NEAR_VS, H + FIG_FS), nearS: R.prog('c-nearS', H + NEAR_VS, NOFS), imp: R.prog('c-imp', H + IMP_VS, H + IMP_FS),
    };
    R.finishProgs();
    for (const p of Object.values(P)) { gl.useProgram(p); const set = (n, u) => { const l = gl.getUniformLocation(p, n); if (l) gl.uniform1i(l, u); };
      set('uBones', U.bones); set('uPoseL0', U.pose); set('uInst', U.inst); set('uVarInfo', U.varInfo); set('uVarPal', U.varPal); set('uPal', U.pal); set('uImp', U.imp); set('uImpMeta', U.impMeta); }
    this.loc = { uTpf: gl.getUniformLocation(P.mid, 'uTpf'), uR: gl.getUniformLocation(P.imp, 'uR'), aoMid: gl.getUniformLocation(P.mid, 'uAo'), aoNear: gl.getUniformLocation(P.near, 'uAo') };
    const T = (unit, w, h, ifmt, fmt, type, data, filter = gl.NEAREST, bytes = 0) => {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, ifmt, w, h);
      if (data) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, fmt, type, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      R.track('textures', 'crowd.t' + unit, bytes || w * h * 4); this.mem += bytes || w * h * 4; return t;
    };
    const pad = (a, w, rows, C) => { const o = new C(w * rows * 4); o.set(a); return o; };
    const nI = this.S.count, rowsI = Math.ceil(nI / 4096), nV = this.S.nVariants, rowsV = Math.ceil(nV / 4096), rowsP = Math.ceil(nV * this.S.nslot / 4096);
    this.tex.inst = T(U.inst, 4096, rowsI, gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT, pad(S.inst, 4096, rowsI, Uint32Array), gl.NEAREST, 4096 * rowsI * 16);
    this.tex.varInfo = T(U.varInfo, 4096, rowsV, gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT, pad(S.varInfo, 4096, rowsV, Uint16Array), gl.NEAREST, 4096 * rowsV * 8);
    this.tex.varPal = T(U.varPal, 4096, rowsP, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, pad(S.varPal, 4096, rowsP, Uint8Array), gl.NEAREST, 4096 * rowsP * 4);
    this.tex.pal = T(U.pal, S.palW, S.palH, gl.RGBA32F, gl.RGBA, gl.FLOAT, S.pal, gl.NEAREST, S.palW * S.palH * 16);
    this.tex.pose = T(U.pose, 61 * 3, S.nearCap, gl.RGBA32F, gl.RGBA, gl.FLOAT, null, gl.NEAREST, 61 * 3 * S.nearCap * 16);
    // bone banks (RGBA16F), written by rows as clips are baked
    for (const k of ['human', 'horse']) { const b = S.banks[k]; this.tex['b_' + k] = T(U.bones, b.width, b.rows, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.NEAREST, b.width * b.rows * 8); }
    // impostor atlas: one layer per class
    { const I = S.imp, t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + U.imp); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, I.w, I.h, Math.max(1, I.layers));
      if (I.layers) gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, I.w, I.h, I.layers, gl.RGBA, gl.UNSIGNED_BYTE, I.data);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.tex.imp = t; R.track('textures', 'crowd.impostors', I.w * I.h * 4 * I.layers); this.mem += I.w * I.h * 4 * I.layers; }
    this.tex.impMeta = T(U.impMeta, Math.max(1, S.imp.layers), 1, gl.RGBA32F, gl.RGBA, gl.FLOAT, S.imp.meta, gl.NEAREST, S.imp.layers * 16);
    // buffers: the shared mesh store (re-created when it grows) and one dynamic instance buffer
    this.vb = gl.createBuffer(); this.ib = gl.createBuffer(); this.instB = gl.createBuffer(); this.instCap = 0; this.vao = gl.createVertexArray(); this.empty = gl.createVertexArray();
    this.syncMeshes(); this.syncBanks(); gl.activeTexture(gl.TEXTURE0); return this;
  }
  syncMeshes() {
    const gl = this.gl, ms = this.crowd.meshes, d = ms.takeDirty(); if (!d.v && !d.i && this.meshVer === ms.version) return;
    if (this.meshVer !== ms.version) {                                       // (re)allocate at the store's capacity and upload everything
      gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.bufferData(gl.ARRAY_BUFFER, ms.vb.byteLength, gl.DYNAMIC_DRAW); gl.bufferSubData(gl.ARRAY_BUFFER, 0, ms.vb, 0, ms.nv * VERTEX_STRIDE);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ms.ib.byteLength, gl.DYNAMIC_DRAW); gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, ms.ib, 0, ms.ni);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VERTEX_STRIDE, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.BYTE, true, VERTEX_STRIDE, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribIPointer(2, 2, gl.UNSIGNED_BYTE, VERTEX_STRIDE, 16); gl.enableVertexAttribArray(3); gl.vertexAttribIPointer(3, 4, gl.UNSIGNED_BYTE, VERTEX_STRIDE, 20); gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, VERTEX_STRIDE, 24);
      for (const l of [5, 6, 7]) { gl.enableVertexAttribArray(l); gl.vertexAttribDivisor(l, 1); }
      this.meshVer = ms.version; this.meshBytes = ms.vb.byteLength + ms.ib.byteLength; this.R.mem.buffers += this.meshBytes - (this.trackedMesh || 0); this.trackedMesh = this.meshBytes;
    } else {
      gl.bindVertexArray(this.vao);
      if (d.v) { gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.bufferSubData(gl.ARRAY_BUFFER, d.v[0] * VERTEX_STRIDE, ms.vb, d.v[0] * VERTEX_STRIDE, (d.v[1] - d.v[0]) * VERTEX_STRIDE); }
      if (d.i) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib); gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, d.i[0] * 4, ms.ib, d.i[0], d.i[1] - d.i[0]); }
    }
    gl.bindVertexArray(null);
  }
  syncBanks() {
    const gl = this.gl;
    for (const k of ['human', 'horse']) { const b = this.S.banks[k], d = b.takeDirty(); if (!d) continue; const w = b.width; gl.activeTexture(gl.TEXTURE0 + U.bones); gl.bindTexture(gl.TEXTURE_2D, this.tex['b_' + k]); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, d[0], w, d[1] - d[0] + 1, gl.RGBA, gl.HALF_FLOAT, b.data, d[0] * w * 4); }
    gl.activeTexture(gl.TEXTURE0);
  }
  // per frame, before the passes: the instance records and the LOD0 pose palettes
  upload(F) {
    const gl = this.gl; this.syncMeshes(); this.syncBanks(); this.F = F;
    if (F.instBytes) { gl.bindBuffer(gl.ARRAY_BUFFER, this.instB); if (F.instBytes > this.instCap) { this.instCap = Math.max(F.instBytes, this.instCap * 2, 1 << 16); gl.bufferData(gl.ARRAY_BUFFER, this.instCap, gl.DYNAMIC_DRAW); this.R.mem.buffers += 0; } gl.bufferSubData(gl.ARRAY_BUFFER, 0, F.inst, 0, F.instBytes); }
    if (F.nPose) { gl.activeTexture(gl.TEXTURE0 + U.pose); gl.bindTexture(gl.TEXTURE_2D, this.tex.pose); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 61 * 3, F.nPose, gl.RGBA, gl.FLOAT, F.pose, 0); gl.activeTexture(gl.TEXTURE0); }
  }
  bindAll() {
    const gl = this.gl, t = this.tex, b = (u, x, tgt = gl.TEXTURE_2D) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(tgt, x); };
    b(U.pose, t.pose); b(U.inst, t.inst); b(U.varInfo, t.varInfo); b(U.varPal, t.varPal); b(U.pal, t.pal); b(U.imp, t.imp, gl.TEXTURE_2D_ARRAY); b(U.impMeta, t.impMeta);
  }
  _run(shadow) {
    const gl = this.gl, F = this.F, P = this.P; if (!F || !F.draws.length) return; this.bindAll(); gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.instB); let cur = null, curBank = null, draws = 0, tris = 0, inst = 0;
    for (const d of F.draws) {
      const prog = d.near ? (shadow ? P.nearS : P.near) : (shadow ? P.midS : P.mid);
      if (prog !== cur) { gl.useProgram(prog); cur = prog; curBank = null; const ao = d.near ? this.loc.aoNear : this.loc.aoMid; if (!shadow && ao) gl.uniform1f(ao, d.near ? 1 : 0); }
      if (!d.near && d.bank !== curBank) { curBank = d.bank; gl.activeTexture(gl.TEXTURE0 + U.bones); gl.bindTexture(gl.TEXTURE_2D, this.tex['b_' + d.bank]); const loc = gl.getUniformLocation(prog, 'uTpf'); gl.uniform1i(loc, this.S.banks[d.bank].tpf); }
      const o = d.off; gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 48, o); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 48, o + 16); gl.vertexAttribIPointer(7, 4, gl.UNSIGNED_INT, 48, o + 32);
      gl.drawElementsInstanced(gl.TRIANGLES, d.count, gl.UNSIGNED_INT, d.first * 4, d.n); draws++; tris += d.count / 3 * d.n; inst += d.n;
    }
    gl.bindVertexArray(null); if (!shadow) { this.stats.draws = draws; this.stats.tris = tris; this.stats.instances = inst; }
  }
  scene(gl) {
    const F = this.F; if (!F) return; gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.disable(gl.BLEND);
    this._run(false);
    if (F.impostors && this.S.imp.layers) { this.bindAll(); gl.useProgram(this.P.imp); gl.uniform4f(this.loc.uR, F.r2, 0, 0, 0); gl.bindVertexArray(this.empty); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, F.nWorld); gl.bindVertexArray(null); this.stats.farInstances = F.nWorld; }
    gl.activeTexture(gl.TEXTURE0);
  }
  shadow(gl) { gl.disable(gl.CULL_FACE); this._run(true); gl.activeTexture(gl.TEXTURE0); }
  destroy() {
    if (this.dead) return; this.dead = true; const gl = this.gl;
    try { for (const t of Object.values(this.tex)) gl.deleteTexture(t); for (const b of [this.vb, this.ib, this.instB]) gl.deleteBuffer(b); gl.deleteVertexArray(this.vao); gl.deleteVertexArray(this.empty); for (const p of Object.values(this.P)) gl.deleteProgram(p); } catch (e) { console.warn('crowd teardown', e); }
  }
}
